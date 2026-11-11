import { apiAccessError } from "@/lib/api-access";
import { NextResponse } from "next/server";
import { requireSession, securityState } from "@/lib/auth";
import { statementStatus } from "@/lib/reminders";
import { readStore } from "@/lib/storage";
export async function GET() {
  const accessError = await apiAccessError("GET");
  if (accessError) return accessError;
  const session = await requireSession();
  const user = (await securityState()).users.find(
    (user) => user.id === session.userId,
  )!;
  const store = await readStore();
  return NextResponse.json({
    ...statementStatus(store.lastStatementAt, user.createdAt),
    needsReview: store.transactions.filter((item) => item.needsReview).length,
  });
}
