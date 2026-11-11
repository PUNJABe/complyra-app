import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { mutateKV, readKV, writeKV } from "../src/lib/secure-kv";

test("encrypted storage serializes updates and rejects tampering and account swaps", async () => {
  const root = path.resolve(".complyra");
  const directory = path.resolve(root, `test-${randomUUID()}`);
  assert.ok(directory.startsWith(root + path.sep));
  const previous = {
    directory: process.env.COMPLYRA_DATA_DIR,
    key: process.env.DATA_ENCRYPTION_KEY,
    mode: process.env.COMPLYRA_STORAGE_MODE,
  };
  process.env.COMPLYRA_DATA_DIR = directory;
  process.env.DATA_ENCRYPTION_KEY = randomBytes(32).toString("hex");
  process.env.COMPLYRA_STORAGE_MODE = "json";
  await mkdir(directory, { recursive: true });
  const file = (key: string) =>
    path.join(
      directory,
      `${createHash("sha256").update(key).digest("hex")}.json`,
    );
  try {
    await Promise.all(
      Array.from({ length: 20 }, () =>
        mutateKV("account-a", { count: 0 }, (value) => {
          value.count++;
        }),
      ),
    );
    assert.equal((await readKV("account-a", { count: 0 })).count, 20);
    await writeKV("account-a", { note: "synthetic-private-record" });
    const raw = await readFile(file("account-a"), "utf8");
    assert.equal(raw.includes("synthetic-private-record"), false);
    await writeFile(file("account-b"), raw);
    await assert.rejects(
      () => readKV("account-b", {}),
      "encrypted records are bound to their account key",
    );
    const tampered = JSON.parse(raw);
    const bytes = Buffer.from(tampered.data, "base64");
    bytes[0] ^= 1;
    tampered.data = bytes.toString("base64");
    await writeFile(file("account-a"), JSON.stringify(tampered));
    await assert.rejects(
      () => readKV("account-a", {}),
      "ciphertext modifications must fail authentication",
    );
  } finally {
    for (const [key, value] of Object.entries({
      COMPLYRA_DATA_DIR: previous.directory,
      DATA_ENCRYPTION_KEY: previous.key,
      COMPLYRA_STORAGE_MODE: previous.mode,
    })) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    assert.ok(
      directory.startsWith(root + path.sep) &&
        path.basename(directory).startsWith("test-"),
    );
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});
