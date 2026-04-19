import { NextResponse } from "next/server";

import { enqueueIntegrationDelivery, processDeliveryJob } from "@/lib/integration-delivery";

type AlertBody = {
  channel?: "slack" | "whatsapp";
  message?: string;
  recipient?: string;
  title?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as AlertBody;

  if (!body.channel || !body.message?.trim()) {
    return NextResponse.json({ error: "Channel and message are required." }, { status: 400 });
  }

  const message = body.message.trim();
  const title = body.title?.trim() || "Policy violation";

  try {
    const job = await enqueueIntegrationDelivery({
      channel: body.channel,
      title,
      message,
      recipient: body.recipient,
    });

    const processed = await processDeliveryJob(job);

    if (processed.status === "sent") {
      return NextResponse.json({
        ok: true,
        dispatchedTo: body.channel,
        message: `Alert sent via ${body.channel}.`,
        timestamp: new Date().toISOString(),
        job: processed,
      });
    }

    if (processed.status === "retrying") {
      return NextResponse.json({
        ok: false,
        queued: true,
        message: `Delivery failed on attempt ${processed.attempts}. Retrying at ${processed.nextAttemptAt}.`,
        job: processed,
      }, { status: 202 });
    }

    return NextResponse.json({
      ok: false,
      queued: false,
      message: "Delivery moved to dead-letter queue after max retries.",
      job: processed,
    }, { status: 500 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to dispatch integration alert." },
      { status: 500 }
    );
  }
}
