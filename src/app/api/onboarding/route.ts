import { NextResponse } from "next/server";

import { saveWorkspace } from "@/lib/storage";

type OnboardingBody = {
  workspaceName?: string;
  departments?: string[];
};

export async function POST(request: Request) {
  const body = (await request.json()) as OnboardingBody;
  const workspaceName = body.workspaceName?.trim();

  if (!workspaceName) {
    return NextResponse.json({ error: "Workspace name is required." }, { status: 400 });
  }

  const departments = body.departments?.filter(Boolean) ?? [];
  await saveWorkspace(workspaceName, departments);

  return NextResponse.json({
    ok: true,
    workspaceName,
    departments,
    message: "Workspace initialized with mock backend.",
  });
}
