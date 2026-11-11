import { readUserStore } from "@/lib/storage";
import { appUrl, sendMail } from "@/lib/mail";
import { mutateKV } from "@/lib/secure-kv";
import { accessAllowed, securityState } from "@/lib/auth";
export function statementStatus(
  lastStatementAt: string | null | undefined,
  registeredAt: string,
) {
  const dueAt = new Date(
    new Date(lastStatementAt || registeredAt).getTime() + 86400000,
  ).toISOString();
  return {
    lastStatementAt: lastStatementAt || null,
    dueAt,
    overdue: Date.now() >= new Date(dueAt).getTime(),
  };
}
export async function deliverStatementReminders() {
  const state = await securityState();
  let sent = 0,
    failed = 0;
  for (const user of state.users) {
    if (
      user.disabled ||
      !user.reminderEmail ||
      !accessAllowed(user.email, state)
    )
      continue;
    const store = await readUserStore(user.id);
    if (!statementStatus(store.lastStatementAt, user.createdAt).overdue)
      continue;
    const key = `reminder:${user.id}`;
    const fallback = { sentAt: 0, leaseUntil: 0 };
    const claimed = await mutateKV(key, fallback, (item) => {
      if (item.leaseUntil > Date.now() || Date.now() - item.sentAt < 86400000)
        return false;
      item.leaseUntil = Date.now() + 5 * 60000;
      return true;
    });
    if (!claimed) continue;
    try {
      await sendMail(
        user.email,
        "Your Complyra statement needs an update",
        `Your statement is due for its 24-hour update. Upload your latest statement at ${appUrl()}/dashboard/upload. You can turn off email reminders in Settings.`,
      );
      await mutateKV(key, fallback, (item) => {
        item.sentAt = Date.now();
        item.leaseUntil = 0;
      });
      sent++;
    } catch {
      await mutateKV(key, fallback, (item) => {
        item.leaseUntil = 0;
      });
      failed++;
    }
  }
  return { sent, failed };
}
