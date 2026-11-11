import { apiAccessError } from "@/lib/api-access";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { CATEGORIES, merchantKey } from "@/lib/categorization";
import { mutateStore } from "@/lib/storage";
export async function PATCH(request: Request) {
  const accessError = await apiAccessError("PATCH");
  if (accessError) return accessError;
  const session = await requireSession();
  const body = await request.json();
  if (
    typeof body.id !== "string" ||
    typeof body.remark !== "string" ||
    body.remark.trim().length < 5 ||
    body.remark.length > 1000 ||
    !CATEGORIES.includes(body.category) ||
    body.category === "Other"
  )
    return NextResponse.json(
      {
        error:
          "Add a 5–1,000 character explanation and choose a specific category.",
      },
      { status: 400 },
    );
  const result = await mutateStore((store) => {
    const transaction = store.transactions.find((item) => item.id === body.id);
    if (!transaction) return false;
    const previousCategory = transaction.category;
    Object.assign(transaction, {
      remark: body.remark.trim(),
      category: body.category,
      categorySource: "user",
      confidence: 1,
      needsReview: false,
      reviewedAt: new Date().toISOString(),
    });
    if (body.rememberMerchant === true)
      store.merchantRules = {
        ...store.merchantRules,
        [merchantKey(transaction.merchant)]: body.category,
      };
    store.auditTrail.unshift({
      id: randomUUID(),
      action: "transaction_reviewed",
      actor: session.email,
      details: `Transaction ${transaction.id}: ${previousCategory} → ${body.category}; user confirmed payment purpose.`,
      createdAt: new Date().toISOString(),
      resource: transaction.id,
      severity: "info",
    });
    store.auditTrail = store.auditTrail.slice(0, 300);
    return true;
  });
  return NextResponse.json(
    result ? { ok: true } : { error: "Transaction not found." },
    { status: result ? 200 : 404 },
  );
}
