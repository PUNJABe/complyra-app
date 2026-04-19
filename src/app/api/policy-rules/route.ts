import { NextResponse } from "next/server";

import type { PolicyRule } from "@/lib/types";
import { addPolicyRule, getPolicyRules, reorderPolicyRules } from "@/lib/storage";

type CreateRuleBody = {
  name?: string;
  condition?: string;
  action?: string;
  source?: "manual" | "copilot";
};

type ReorderBody = {
  orderedIds?: string[];
};

export async function GET() {
  return NextResponse.json({ rules: await getPolicyRules() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as CreateRuleBody;

  const name = body.name?.trim();
  const condition = body.condition?.trim();
  const action = body.action?.trim();

  if (!name || !condition || !action) {
    return NextResponse.json({ error: "name, condition, and action are required." }, { status: 400 });
  }

  const rule: PolicyRule = {
    id: `rule-${Date.now()}`,
    name,
    condition,
    action,
    source: body.source ?? "manual",
  };

  await addPolicyRule(rule);
  return NextResponse.json({ ok: true, rule });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as ReorderBody;

  if (!body.orderedIds?.length) {
    return NextResponse.json({ error: "orderedIds is required." }, { status: 400 });
  }

  await reorderPolicyRules(body.orderedIds);
  return NextResponse.json({ ok: true });
}
