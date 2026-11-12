import assert from "node:assert/strict";
import { test } from "node:test";
import { sendMail } from "../src/lib/mail";

test("Resend messages use the published contact as reply-to", async () => {
  const originalFetch = globalThis.fetch;
  const env = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    MAIL_FROM: process.env.MAIL_FROM,
    PRIVACY_CONTACT_EMAIL: process.env.PRIVACY_CONTACT_EMAIL,
    MAIL_MODE: process.env.MAIL_MODE,
  };
  process.env.RESEND_API_KEY = "re_test";
  process.env.MAIL_FROM = "Complyra <no-reply@complyra.site>";
  process.env.PRIVACY_CONTACT_EMAIL = "complyra.co@gmail.com";
  delete process.env.MAIL_MODE;

  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://api.resend.com/emails");
    assert.deepEqual(JSON.parse(String(init?.body)), {
      from: "Complyra <no-reply@complyra.site>",
      reply_to: "complyra.co@gmail.com",
      to: "member@example.test",
      subject: "Test email",
      text: "Test message",
    });
    return new Response(null, { status: 200 });
  };

  try {
    await sendMail(
      "member@example.test",
      "Test email",
      "Test message",
    );
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
