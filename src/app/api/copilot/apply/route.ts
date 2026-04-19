import { NextResponse } from "next/server";

import { getCopilotPayload } from "@/lib/analytics";
import { addPolicyRule } from "@/lib/storage";
import type { PolicyRule } from "@/lib/types";

type ApplyBody = {
  recommendationId?: string;
};

function recommendationToRule(rec: { id: string; recommendation: string; action: string }): PolicyRule {
  const lower = rec.recommendation.toLowerCase();

  let condition = "If risk score exceeds team baseline";
  if (lower.includes("travel")) condition = "If category is travel and amount > Rs 15,000";
  if (lower.includes("meal") || lower.includes("mobility")) {
    condition = "If category is meals or mobility and monthly spend grows > 15%";
  }
  if (lower.includes("duplicate")) {
    condition = "If same merchant and amount repeat within 24h";
  }

  return {
    id: `rule-${Date.now()}`,
    name: `Copilot: ${rec.id}`,
    condition,
    action: rec.action,
    source: "copilot",
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as ApplyBody;

  if (!body.recommendationId) {
    return NextResponse.json({ error: "recommendationId is required." }, { status: 400 });
  }

  const payload = await getCopilotPayload();
  const rec = payload.recommendations.find((item) => item.id === body.recommendationId);

  if (!rec) {
    return NextResponse.json({ error: "Recommendation not found." }, { status: 404 });
  }

  const rule = recommendationToRule(rec);
  await addPolicyRule(rule);

  return NextResponse.json({
    ok: true,
    message: `Applied recommendation and created policy rule: ${rule.name}`,
    rule,
  });
}
