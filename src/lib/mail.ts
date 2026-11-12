import nodemailer from "nodemailer";
import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
export function appOrigin() {
  const origin =
    process.env.APP_ORIGIN ||
    (process.env.NODE_ENV !== "production" ? "http://localhost:3000" : "");
  if (
    !origin ||
    (process.env.NODE_ENV === "production" && !origin.startsWith("https://"))
  )
    throw new Error("APP_ORIGIN must be your public HTTPS origin.");
  return new URL(origin).origin;
}
export function appUrl() {
  const url = process.env.APP_URL || appOrigin();
  const parsed = new URL(url);
  if (
    (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") ||
    parsed.search ||
    parsed.hash
  )
    throw new Error("APP_URL must be an HTTPS URL without a query or fragment.");
  return url.replace(/\/+$/, "");
}
export async function sendMail(to: string, subject: string, text: string) {
  const replyTo = process.env.PRIVACY_CONTACT_EMAIL;
  if (
    process.env.MAIL_MODE === "outbox" &&
    process.env.NODE_ENV !== "production"
  ) {
    const directory = path.join(
      process.env.COMPLYRA_DATA_DIR ||
        path.join(process.cwd(), ".complyra", "secure"),
      "mail-outbox",
    );
    await mkdir(directory, { recursive: true });
    await writeFile(
      path.join(directory, `${Date.now()}-${randomUUID()}.json`),
      JSON.stringify({ to, subject, text }, null, 2),
      { mode: 0o600 },
    );
    return;
  }
  if (process.env.RESEND_API_KEY) {
    if (!process.env.MAIL_FROM)
      throw new Error("MAIL_FROM is required for Resend email delivery.");
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM,
        ...(replyTo ? { reply_to: replyTo } : {}),
        to,
        subject,
        text,
      }),
    });
    if (!response.ok)
      throw new Error(`Resend email delivery failed (${response.status}).`);
    return;
  }
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASSWORD ||
    !process.env.MAIL_FROM
  )
    throw new Error("Email delivery is not configured.");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_PORT !== "587",
    requireTLS: true,
    connectionTimeout: 10000,
    socketTimeout: 15000,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });
  await transport.sendMail({
    from: process.env.MAIL_FROM,
    ...(replyTo ? { replyTo } : {}),
    to,
    subject,
    text,
  });
}
