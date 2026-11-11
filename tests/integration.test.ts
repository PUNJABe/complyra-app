import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test(
  "verified accounts, private statements, access rules, recovery and reminders",
  { timeout: 300000 },
  async () => {
    const root = path.resolve(".complyra");
    const directory = path.resolve(root, `test-${randomUUID()}`);
    assert.ok(directory.startsWith(root + path.sep));
    await mkdir(directory, { recursive: true });
    const port = 3456;
    const base = `http://127.0.0.1:${port}`;
    const encryptionKey = randomBytes(32).toString("hex");
    const secret = randomBytes(32).toString("hex");
    const child = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "dev",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      {
        env: {
          ...process.env,
          NODE_ENV: "development",
          APP_ORIGIN: base,
          COMPLYRA_STORAGE_MODE: "json",
          COMPLYRA_BUILD_DIR: ".next-test",
          COMPLYRA_DATA_DIR: directory,
          DATA_ENCRYPTION_KEY: encryptionKey,
          MAIL_MODE: "outbox",
          ADMIN_EMAILS: "admin@example.test",
          AUTH_ALLOWLIST: "",
          AUTH_BLOCKLIST: "",
          AUTH_ALLOWLIST_ONLY: "false",
          CRON_SECRET: secret,
          OPENAI_API_KEY: "",
          NEXT_TELEMETRY_DISABLED: "1",
        },
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    child.stdout.on("data", (chunk) => {
      output = (output + chunk).slice(-12000);
    });
    child.stderr.on("data", (chunk) => {
      output = (output + chunk).slice(-12000);
    });
    const oldEnv = {
      dir: process.env.COMPLYRA_DATA_DIR,
      key: process.env.DATA_ENCRYPTION_KEY,
      mode: process.env.COMPLYRA_STORAGE_MODE,
    };
    process.env.COMPLYRA_DATA_DIR = directory;
    process.env.DATA_ENCRYPTION_KEY = encryptionKey;
    process.env.COMPLYRA_STORAGE_MODE = "json";
    try {
      let ready = false;
      for (let attempt = 0; attempt < 100; attempt++) {
        if (child.exitCode !== null)
          throw new Error(`Test server stopped: ${output}`);
        try {
          const response = await fetch(base, {
            signal: AbortSignal.timeout(3000),
          });
          if (response.ok) {
            ready = true;
            break;
          }
        } catch {
          /* Startup */
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      assert.ok(ready, `Server did not start: ${output}`);
      async function call(
        url: string,
        method = "GET",
        body?: unknown,
        cookie?: string,
        origin: string | null = base,
      ) {
        const headers: Record<string, string> = {};
        if (origin) headers.Origin = origin;
        if (cookie) headers.Cookie = cookie;
        if (body !== undefined) headers["Content-Type"] = "application/json";
        return fetch(base + url, {
          method,
          headers,
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          redirect: "manual",
          signal: AbortSignal.timeout(90000),
        });
      }
      async function mailToken(email: string, subject: string) {
        const names = (await readdir(path.join(directory, "mail-outbox")))
          .sort()
          .reverse();
        for (const name of names) {
          const mail = JSON.parse(
            await readFile(path.join(directory, "mail-outbox", name), "utf8"),
          );
          if (mail.to === email && mail.subject === subject)
            return /#token=([a-f0-9]{64})/.exec(mail.text)![1];
        }
        throw new Error("Expected verification/reset email was not written.");
      }
      async function register(email: string) {
        const response = await call("/api/auth/register", "POST", {
          email,
          name: "Test account",
          password: "A long unique password 2026!",
          acceptPolicies: true,
          role: "admin",
        });
        assert.equal(
          response.status,
          200,
          "registration should issue a verification email",
        );
        return mailToken(email, "Verify your Complyra email");
      }
      async function login(
        email: string,
        password = "A long unique password 2026!",
      ) {
        const response = await call("/api/auth/login", "POST", {
          email,
          password,
          role: "admin",
          provider: "mock",
        });
        assert.equal(response.status, 200, "verified account should sign in");
        const cookie = response.headers.get("set-cookie")!.split(";")[0];
        assert.match(cookie, /^complyra_session=[a-f0-9]{64}$/);
        assert.match(response.headers.get("set-cookie")!, /HttpOnly/i);
        return cookie;
      }

      const home = await call("/");
      assert.equal(home.status, 200);
      const html = await home.text();
      assert.match(html, /Make sense of/);
      assert.match(home.headers.get("content-security-policy")!, /nonce-/);
      const nonce = /'nonce-([^']+)'/.exec(home.headers.get("content-security-policy")!)![1];
      const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map(match => match[0]);
      assert.ok(scripts.length > 0);
      assert.ok(scripts.every(tag => tag.includes(`nonce="${nonce}"`)), "Next.js scripts must carry the request CSP nonce");
      assert.equal((await call("/api/transactions")).status, 401);
      assert.equal((await call("/dashboard")).status, 307);
      assert.equal(
        (
          await call(
            "/api/transactions",
            "GET",
            undefined,
            `complyra_session=${Buffer.from(JSON.stringify({ role: "admin", email: "admin@example.test" })).toString("base64url")}`,
          )
        ).status,
        401,
      );
      assert.equal(
        (
          await call(
            "/api/auth/register",
            "POST",
            {},
            undefined,
            "https://attacker.test",
          )
        ).status,
        403,
      );
      assert.equal(
        (await call("/api/auth/login", "POST", {}, undefined, null)).status,
        403,
      );

      const adminToken = await register("admin@example.test");
      assert.equal(
        (
          await call("/api/auth/login", "POST", {
            email: "admin@example.test",
            password: "A long unique password 2026!",
          })
        ).status,
        401,
        "unverified registration cannot sign in",
      );
      const verification = await Promise.all([
        call("/api/auth/verify", "POST", { token: adminToken }),
        call("/api/auth/verify", "POST", { token: adminToken }),
      ]);
      assert.deepEqual(
        verification.map((r) => r.status).sort(),
        [200, 400],
        "verification token is single-use under concurrency",
      );
      const admin = await login("admin@example.test");
      assert.equal(
        (await call("/api/admin", "GET", undefined, admin)).status,
        200,
      );
      assert.deepEqual(
        (await (await call("/api/overview", "GET", undefined, admin)).json())
          .charts.line.points,
        [],
        "empty accounts must not see seeded analytics",
      );

      const token = await register("person@example.test");
      assert.equal(
        (await call("/api/auth/verify", "POST", { token })).status,
        200,
      );
      let person = await login("person@example.test");
      const session = await (
        await call("/api/auth/session", "GET", undefined, person)
      ).json();
      assert.equal(
        session.session.role,
        "employee",
        "client-selected roles and mock provider cannot elevate access",
      );
      const userId = session.session.userId;
      assert.equal(
        (await call("/api/admin", "GET", undefined, person)).status,
        403,
      );
      assert.equal(
        (await call("/admin", "GET", undefined, person)).status,
        307,
      );
      assert.equal(
        (await call("/api/integrations/process", "POST", {}, person)).status,
        403,
      );
      assert.equal(
        (
          await call(
            "/api/account",
            "PATCH",
            { name: "forbidden" },
            person,
            "https://attacker.test",
          )
        ).status,
        403,
      );

      const csv =
        "date,merchant,amount,direction\n2026-10-01,Swiggy,240,debit\n2026-10-02,UPI Mystery Person,400,debit\n2026-10-03,Uber Swiggy,500,debit\n2026-10-04,Salary,10000,credit\n2026-10-05,Swiggy,240,debit\n2026-10-05,Swiggy,240,debit\n";
      const form = new FormData();
      form.set("file", new File([csv], "statement.csv", { type: "text/csv" }));
      const upload = await fetch(base + "/api/onboarding/upload", {
        method: "POST",
        headers: { Origin: base, Cookie: person },
        body: form,
      });
      assert.equal(upload.status, 200, "statement should import");
      const records = await (
        await call("/api/transactions", "GET", undefined, person)
      ).json();
      assert.equal(records.transactions.length, 6);
      assert.equal(records.summary.income, 10000);
      assert.equal(records.summary.expenses, 1620);
      assert.equal(records.summary.totalAmount, 1620);
      assert.ok(
        records.summary.needsReview >= 4,
        "unknown, conflicting and duplicate payments require review",
      );
      assert.equal(
        (
          await (
            await call("/api/transactions", "GET", undefined, admin)
          ).json()
        ).transactions.length,
        0,
        "a different account cannot see statement records",
      );
      const unknown = records.transactions.find(
        (t: { merchant: string }) => t.merchant === "UPI Mystery Person",
      );
      assert.equal(
        (
          await call(
            "/api/transactions/remark",
            "PATCH",
            {
              id: unknown.id,
              remark: "Client meeting taxi reimbursement",
              category: "Travel",
              rememberMerchant: true,
            },
            admin,
          )
        ).status,
        404,
        "transaction IDs cannot cross account boundaries",
      );
      assert.equal(
        (
          await call(
            "/api/transactions/remark",
            "PATCH",
            {
              id: unknown.id,
              remark: "Client meeting taxi reimbursement",
              category: "Travel",
              rememberMerchant: true,
            },
            person,
          )
        ).status,
        200,
      );
      const reviewed = (
        await (await call("/api/transactions", "GET", undefined, person)).json()
      ).transactions.find((t: { id: string }) => t.id === unknown.id);
      assert.equal(reviewed.needsReview, false);
      assert.equal(reviewed.category, "Travel");
      assert.equal(reviewed.categorySource, "user");
      const status = await (
        await call("/api/reminders", "GET", undefined, person)
      ).json();
      assert.equal(status.overdue, false);
      assert.equal(new Date(status.dueAt).getTime() - new Date(status.lastStatementAt).getTime(), 86400000);
      const assistant = await (
        await call(
          "/api/chat",
          "POST",
          { prompt: "Which transactions need a remark?" },
          person,
        )
      ).json();
      assert.equal(assistant.provider, "local");
      assert.match(assistant.answer, /review/);

      assert.equal(
        (
          await call(
            "/api/account",
            "PATCH",
            { name: "Updated name", reminderEmail: true },
            person,
          )
        ).status,
        200,
      );
      const exported = await (
        await call("/api/account?export=true", "GET", undefined, person)
      ).json();
      assert.equal(exported.profile.name, "Updated name");
      assert.equal(exported.profile.aiEnabled, false);
      assert.equal(exported.profile.passwordHash, undefined);
      assert.equal(exported.workspace.transactions.length, 6);

      const { mutateKV, readKV } = await import("../src/lib/secure-kv");
      await mutateKV<{ lastStatementAt?: string }, void>(
        `workspace:${userId}`,
        {},
        (store) => {
          store.lastStatementAt = new Date(
            Date.now() - 25 * 3600000,
          ).toISOString();
        },
      );
      assert.equal(
        (await (await call("/api/reminders", "GET", undefined, person)).json())
          .overdue,
        true,
      );
      assert.equal((await call("/api/cron/reminders", "POST", {})).status, 401);
      const deliver = () =>
        fetch(base + "/api/cron/reminders", {
          method: "POST",
          headers: { Authorization: `Bearer ${secret}` },
        });
      assert.equal((await (await deliver()).json()).sent, 1);
      assert.equal(
        (await (await deliver()).json()).sent,
        0,
        "email reminders should not repeat within 24 hours",
      );

      assert.equal(
        (
          await call(
            "/api/admin",
            "PATCH",
            {
              access: {
                allowlist: ["@example.test"],
                blocklist: ["person@example.test"],
                allowlistOnly: true,
              },
            },
            admin,
          )
        ).status,
        200,
      );
      assert.equal(
        (await call("/api/transactions", "GET", undefined, person)).status,
        401,
        "blocklist revokes active sessions",
      );
      assert.equal(
        (
          await call(
            "/api/admin",
            "PATCH",
            {
              access: {
                allowlist: [],
                blocklist: ["admin@example.test"],
                allowlistOnly: false,
              },
            },
            admin,
          )
        ).status,
        400,
        "admin self-lockout is rejected",
      );
      await call(
        "/api/admin",
        "PATCH",
        {
          access: {
            allowlist: ["@example.test"],
            blocklist: [],
            allowlistOnly: true,
          },
        },
        admin,
      );
      person = await login("person@example.test");
      await call("/api/admin", "PATCH", { userId, role: "viewer" }, admin);
      person = await login("person@example.test");
      assert.equal(
        (await call("/api/transactions", "GET", undefined, person)).status,
        200,
      );
      assert.equal(
        (await call("/api/transactions/remark", "PATCH", {}, person)).status,
        403,
      );
      assert.equal((await call("/api/account", "PATCH", { aiEnabled: false }, person)).status, 200, "read-only users retain their own privacy controls");
      await call("/api/admin", "PATCH", { userId, role: "employee" }, admin);
      person = await login("person@example.test");
      assert.equal(
        (
          await call("/api/auth/reset", "POST", {
            email: "person@example.test",
          })
        ).status,
        200,
      );
      const resetToken = await mailToken(
        "person@example.test",
        "Reset your Complyra password",
      );
      assert.equal(
        (
          await call("/api/auth/reset", "POST", {
            token: resetToken,
            password: "A different long password 2026!",
          })
        ).status,
        200,
      );
      assert.equal(
        (await call("/api/transactions", "GET", undefined, person)).status,
        401,
        "password reset revokes existing sessions",
      );
      assert.equal(
        (
          await call("/api/auth/reset", "POST", {
            token: resetToken,
            password: "A different long password 2026!",
          })
        ).status,
        400,
      );
      person = await login(
        "person@example.test",
        "A different long password 2026!",
      );
      assert.equal(
        (
          await call(
            "/api/account",
            "DELETE",
            { password: "incorrect", confirmation: "DELETE" },
            person,
          )
        ).status,
        400,
      );
      assert.equal(
        (
          await call(
            "/api/account",
            "DELETE",
            {
              password: "A different long password 2026!",
              confirmation: "DELETE",
            },
            person,
          )
        ).status,
        200,
      );
      assert.equal(
        (await call("/api/transactions", "GET", undefined, person)).status,
        401,
      );
      const erased = await readKV<{
        transactions: unknown[];
        deletedAt?: string;
      }>(`workspace:${userId}`, { transactions: [] });
      assert.equal(erased.transactions.length, 0);
      assert.ok(erased.deletedAt);
      const rawFiles = (await readdir(directory)).filter((name) =>
        name.endsWith(".json"),
      );
      for (const file of rawFiles)
        assert.equal(
          (await readFile(path.join(directory, file), "utf8")).includes(
            "passwordHash",
          ),
          false,
          "stored records should be encrypted",
        );
      assert.equal(
        (await call("/api/auth/logout", "POST", {}, admin)).status,
        200,
      );
      assert.equal(
        (await call("/api/admin", "GET", undefined, admin)).status,
        401,
      );
    } finally {
      child.kill();
      await new Promise((resolve) => {
        if (child.exitCode !== null) resolve(null);
        else {
          child.once("exit", resolve);
          setTimeout(resolve, 5000);
        }
      });
      for (const [key, value] of Object.entries({
        COMPLYRA_DATA_DIR: oldEnv.dir,
        DATA_ENCRYPTION_KEY: oldEnv.key,
        COMPLYRA_STORAGE_MODE: oldEnv.mode,
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
  },
);
