import { NextResponse } from "next/server";

import { answerForPrompt } from "@/lib/mock-data";

type ChatRequestBody = {
  prompt?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ChatRequestBody;
  const prompt = body.prompt?.trim();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  const response = answerForPrompt(prompt);
  return NextResponse.json(response);
}
