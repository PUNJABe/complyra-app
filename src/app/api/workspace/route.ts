import { NextResponse } from "next/server";

import type { WorkspaceMode } from "@/lib/types";
import {
  addClientProfile,
  getWorkspaceContext,
  setActiveClient,
  setWorkspaceMode,
} from "@/lib/storage";

type WorkspaceUpdateBody = {
  mode?: WorkspaceMode;
  activeClientId?: string;
  addClient?: {
    name?: string;
    gstin?: string;
    pan?: string;
    sector?: string;
  };
};

export async function GET() {
  return NextResponse.json(await getWorkspaceContext());
}

export async function POST(request: Request) {
  const body = (await request.json()) as WorkspaceUpdateBody;

  if (body.mode) {
    await setWorkspaceMode(body.mode);
  }

  if (body.activeClientId) {
    const ok = await setActiveClient(body.activeClientId);
    if (!ok) {
      return NextResponse.json({ error: "Invalid client id." }, { status: 400 });
    }
  }

  if (body.addClient?.name?.trim()) {
    await addClientProfile({
      name: body.addClient.name.trim(),
      gstin: body.addClient.gstin?.trim() || undefined,
      pan: body.addClient.pan?.trim() || undefined,
      sector: body.addClient.sector?.trim() || undefined,
    });
  }

  return NextResponse.json(await getWorkspaceContext());
}
