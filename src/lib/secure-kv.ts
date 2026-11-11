import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  randomUUID,
} from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import oracledb from "oracledb";
import pg from "pg";

const queues = new Map<string, Promise<unknown>>();
const directory = () =>
  process.env.COMPLYRA_DATA_DIR ||
  path.join(process.cwd(), ".complyra", "secure");
export const oracleEnabled = () =>
  process.env.COMPLYRA_STORAGE_MODE === "oracle";
export const postgresEnabled = () =>
  process.env.COMPLYRA_STORAGE_MODE === "postgres";

function assertProductionStorage() {
  if (
    process.env.NODE_ENV === "production" &&
    !oracleEnabled() &&
    !postgresEnabled()
  )
    throw new Error("Production requires PostgreSQL or Oracle storage.");
}

function encryptionKey() {
  const value = process.env.DATA_ENCRYPTION_KEY;
  if (!value && process.env.NODE_ENV === "production")
    throw new Error("DATA_ENCRYPTION_KEY is required.");
  if (value && !/^[a-fA-F0-9]{64}$/.test(value))
    throw new Error("DATA_ENCRYPTION_KEY must be 32 random bytes in hex.");
  return value ? Buffer.from(value, "hex") : null;
}

function seal(value: unknown, key: string) {
  const secret = encryptionKey();
  const plain = JSON.stringify(value);
  if (!secret) return plain; // Explicitly development only.
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", secret, iv);
  cipher.setAAD(Buffer.from(key));
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  return JSON.stringify({
    v: 1,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: ciphertext.toString("base64"),
  });
}

function open<T>(raw: string, key: string): T {
  const value = JSON.parse(raw);
  if (value?.v !== 1 || !value?.tag) {
    if (process.env.NODE_ENV === "production")
      throw new Error("Unencrypted record rejected.");
    return value as T;
  }
  const secret = encryptionKey();
  if (!secret) throw new Error("Encryption key missing.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    secret,
    Buffer.from(value.iv, "base64"),
  );
  decipher.setAAD(Buffer.from(key));
  decipher.setAuthTag(Buffer.from(value.tag, "base64"));
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(value.data, "base64")),
      decipher.final(),
    ]).toString("utf8"),
  ) as T;
}

let poolPromise: Promise<oracledb.Pool> | undefined;
export function oraclePool() {
  if (!poolPromise) {
    const {
      ORACLE_USER: user,
      ORACLE_PASSWORD: password,
      ORACLE_CONNECT_STRING: connectString,
    } = process.env;
    if (!user || !password || !connectString)
      throw new Error("Oracle credentials and connect string are required.");
    if (
      process.env.NODE_ENV === "production" &&
      !/tcps\s*:|protocol\s*=\s*tcps\b/i.test(connectString) &&
      !process.env.ORACLE_WALLET_LOCATION
    ) {
      throw new Error(
        "Use a TCPS connection string or an mTLS wallet in production.",
      );
    }
    poolPromise = oracledb
      .createPool({
        user,
        password,
        connectString,
        poolMin: 0,
        poolMax: 4,
        poolTimeout: 60,
        queueTimeout: 10000,
        connectTimeout: 10,
        sslServerDNMatch: true,
        ...(process.env.ORACLE_WALLET_LOCATION
          ? {
              configDir: process.env.ORACLE_WALLET_LOCATION,
              walletLocation: process.env.ORACLE_WALLET_LOCATION,
              walletPassword: process.env.ORACLE_WALLET_PASSWORD,
            }
          : {}),
      })
      .catch((error) => {
        poolPromise = undefined;
        throw error;
      });
  }
  return poolPromise;
}

let postgresPool: pg.Pool | undefined;
export function postgresConnectionPool() {
  if (!postgresPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString)
      throw new Error("DATABASE_URL is required for PostgreSQL storage.");
    postgresPool = new pg.Pool({
      connectionString,
      max: 4,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 60000,
      ssl: { rejectUnauthorized: true },
    });
    postgresPool.on("error", (error) => {
      console.error("Unexpected idle PostgreSQL client error.", error);
    });
  }
  return postgresPool;
}

function filePath(key: string) {
  return path.join(
    directory(),
    `${createHash("sha256").update(key).digest("hex")}.json`,
  );
}

export async function readKV<T>(key: string, fallback: T): Promise<T> {
  assertProductionStorage();
  if (oracleEnabled()) {
    const connection = await (await oraclePool()).getConnection();
    try {
      const result = await connection.execute<{ PAYLOAD: string }>(
        "SELECT payload FROM complyra_kv WHERE record_key = :key",
        { key },
        {
          outFormat: oracledb.OUT_FORMAT_OBJECT,
          fetchInfo: { PAYLOAD: { type: oracledb.STRING } },
        },
      );
      return result.rows?.[0]
        ? open<T>(result.rows[0].PAYLOAD, key)
        : structuredClone(fallback);
    } finally {
      await connection.close();
    }
  }
  if (postgresEnabled()) {
    const result = await postgresConnectionPool().query<{ payload: string }>(
      "SELECT payload FROM complyra_kv WHERE record_key = $1",
      [key],
    );
    return result.rows[0]
      ? open<T>(result.rows[0].payload, key)
      : structuredClone(fallback);
  }
  try {
    return open<T>(await readFile(filePath(key), "utf8"), key);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return structuredClone(fallback);
    throw error;
  }
}

// Oracle serializes read-modify-write operations using a row lock, including across instances.
// The local adapter serializes within one development process and atomically replaces files.
export async function mutateKV<T, R>(
  key: string,
  fallback: T,
  change: (value: T) => R | Promise<R>,
): Promise<R> {
  assertProductionStorage();
  const previous = queues.get(key) ?? Promise.resolve();
  const task = previous
    .catch(() => {})
    .then(async () => {
      if (oracleEnabled()) {
        const connection = await (await oraclePool()).getConnection();
        try {
          try {
            await connection.execute(
              "INSERT INTO complyra_kv (record_key, payload) VALUES (:key, :payload)",
              {
                key,
                payload: { val: seal(fallback, key), type: oracledb.CLOB },
              },
            );
          } catch (error) {
            if ((error as { errorNum?: number }).errorNum !== 1) throw error;
          }
          const result = await connection.execute<{ PAYLOAD: string }>(
            "SELECT payload FROM complyra_kv WHERE record_key = :key FOR UPDATE",
            { key },
            {
              outFormat: oracledb.OUT_FORMAT_OBJECT,
              fetchInfo: { PAYLOAD: { type: oracledb.STRING } },
            },
          );
          if (!result.rows?.[0])
            throw new Error("Unable to lock database record.");
          const data = open<T>(result.rows[0].PAYLOAD, key);
          const output = await change(data);
          await connection.execute(
            "UPDATE complyra_kv SET payload = :payload, updated_at = SYSTIMESTAMP WHERE record_key = :key",
            { key, payload: { val: seal(data, key), type: oracledb.CLOB } },
          );
          await connection.commit();
          return output;
        } catch (error) {
          await connection.rollback();
          throw error;
        } finally {
          await connection.close();
        }
      }
      if (postgresEnabled()) {
        const client = await postgresConnectionPool().connect();
        try {
          await client.query("BEGIN");
          await client.query(
            "INSERT INTO complyra_kv (record_key, payload) VALUES ($1, $2) ON CONFLICT (record_key) DO NOTHING",
            [key, seal(fallback, key)],
          );
          const result = await client.query<{ payload: string }>(
            "SELECT payload FROM complyra_kv WHERE record_key = $1 FOR UPDATE",
            [key],
          );
          const row = result.rows[0];
          if (!row) throw new Error("Unable to lock database record.");
          const data = open<T>(row.payload, key);
          const output = await change(data);
          await client.query(
            "UPDATE complyra_kv SET payload = $2, updated_at = NOW() WHERE record_key = $1",
            [key, seal(data, key)],
          );
          await client.query("COMMIT");
          return output;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      }
      const data = await readKV(key, fallback);
      const output = await change(data);
      await mkdir(directory(), { recursive: true });
      const temporary = `${filePath(key)}.${randomUUID()}.tmp`;
      await writeFile(temporary, seal(data, key), {
        encoding: "utf8",
        mode: 0o600,
      });
      await rename(temporary, filePath(key));
      return output;
    });
  queues.set(key, task);
  try {
    return await task;
  } finally {
    if (queues.get(key) === task) queues.delete(key);
  }
}

export async function writeKV<T extends object>(key: string, value: T) {
  await mutateKV<T, void>(key, value, (current) => {
    for (const prop of Object.keys(current))
      delete (current as Record<string, unknown>)[prop];
    Object.assign(current, value);
  });
}
