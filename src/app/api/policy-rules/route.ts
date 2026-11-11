import { apiAccessError } from "@/lib/api-access";
import { NextResponse } from "next/server";

import type { PolicyRule } from "@/lib/types";
import {
  addPolicyRule,
  getPolicyRules,
  reorderPolicyRules,
} from "@/lib/storage";

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
  const accessError = await apiAccessError("GET");
  if (accessError) return accessError;
  return NextResponse.json({ rules: await getPolicyRules() });
}

export async function POST(request: Request) {
  const accessError = await apiAccessError("POST");
  if (accessError) return accessError;
  const body = (await request.json()) as CreateRuleBody;

  const name = body.name?.trim();
  const condition = body.condition?.trim();
  const action = body.action?.trim();

  if (!name || !condition || !action) {
    return NextResponse.json(
      { error: "name, condition, and action are required." },
      { status: 400 },
    );
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
  const accessError = await apiAccessError("PUT");
  if (accessError) return accessError;
  const body = (await request.json()) as ReorderBody;

  if (!body.orderedIds?.length) {
    return NextResponse.json(
      { error: "orderedIds is required." },
      { status: 400 },
    );
  }

  await reorderPolicyRules(body.orderedIds);
  return NextResponse.json({ ok: true });
}
