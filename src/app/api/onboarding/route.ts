import { NextResponse } from "next/server";

import { addClientProfile, saveWorkspace, setActiveClient, setWorkspaceMode } from "@/lib/storage";
import type { WorkspaceMode } from "@/lib/types";

type OnboardingBody = {
  workspaceName?: string;
  departments?: string[];
  mode?: WorkspaceMode;
  initialClient?: {
    name?: string;
    gstin?: string;
    pan?: string;
    sector?: string;
  };
};

export async function POST(request: Request) {
  const body = (await request.json()) as OnboardingBody;
  const workspaceName = body.workspaceName?.trim();

  if (!workspaceName) {
    return NextResponse.json({ error: "Workspace name is required." }, { status: 400 });
  }

  const departments = body.departments?.filter(Boolean) ?? [];
  await saveWorkspace(workspaceName, departments);

  if (body.mode) {
    await setWorkspaceMode(body.mode);
  }

  let initialClientId: string | undefined;
  if (body.initialClient?.name?.trim()) {
    const client = await addClientProfile({
      name: body.initialClient.name.trim(),
      gstin: body.initialClient.gstin?.trim() || undefined,
      pan: body.initialClient.pan?.trim() || undefined,
      sector: body.initialClient.sector?.trim() || undefined,
    });
    initialClientId = client.id;
    await setActiveClient(client.id);
  }

  return NextResponse.json({
    ok: true,
    workspaceName,
    departments,
    mode: body.mode ?? "business",
    initialClientId,
    message: "Workspace initialized with mock backend.",
  });
}
