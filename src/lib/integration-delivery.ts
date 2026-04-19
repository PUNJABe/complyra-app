import {
  addDeadLetterLog,
  addIntegrationJob,
  addIntegrationReceipt,
  appendIntegrationAlert,
  getIntegrationJobs,
  updateIntegrationJob,
} from "@/lib/storage";
import type {
  DeadLetterLog,
  IntegrationAlert,
  IntegrationDeliveryJob,
  IntegrationDeliveryReceipt,
} from "@/lib/types";

type Channel = "slack" | "whatsapp";

type DispatchResult = {
  success: boolean;
  statusCode?: number;
  providerMessageId?: string;
  responseSnippet?: string;
  error?: string;
};

const BASE_BACKOFF_SECONDS = 30;
const MAX_BACKOFF_SECONDS = 30 * 60;

function nextBackoffSeconds(attempt: number) {
  const seconds = BASE_BACKOFF_SECONDS * 2 ** Math.max(0, attempt - 1);
  return Math.min(seconds, MAX_BACKOFF_SECONDS);
}

async function sendSlack(message: string): Promise<DispatchResult> {
  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) {
    return { success: false, error: "SLACK_WEBHOOK_URL is not configured." };
  }

  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    return {
      success: false,
      statusCode: response.status,
      responseSnippet: responseText.slice(0, 240),
      error: `Slack webhook failed with status ${response.status}`,
    };
  }

  return {
    success: true,
    statusCode: response.status,
    responseSnippet: responseText.slice(0, 240),
  };
}

async function sendWhatsApp(message: string, recipient?: string): Promise<DispatchResult> {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const to = recipient || process.env.WHATSAPP_TO_NUMBER;

  if (!token || !phoneNumberId || !to) {
    return {
      success: false,
      error: "WhatsApp Cloud API env vars are incomplete. Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_TO_NUMBER.",
    };
  }

  const response = await fetch(`https://graph.facebook.com/v22.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: message },
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    return {
      success: false,
      statusCode: response.status,
      responseSnippet: responseText.slice(0, 240),
      error: `WhatsApp send failed with status ${response.status}`,
    };
  }

  let providerMessageId: string | undefined;
  try {
    const parsed = JSON.parse(responseText) as { messages?: Array<{ id?: string }> };
    providerMessageId = parsed.messages?.[0]?.id;
  } catch {
    providerMessageId = undefined;
  }

  return {
    success: true,
    statusCode: response.status,
    providerMessageId,
    responseSnippet: responseText.slice(0, 240),
  };
}

async function dispatch(channel: Channel, message: string, recipient?: string) {
  if (channel === "slack") {
    return sendSlack(message);
  }

  return sendWhatsApp(message, recipient);
}

export async function enqueueIntegrationDelivery(input: {
  channel: Channel;
  title: string;
  message: string;
  recipient?: string;
  maxAttempts?: number;
}) {
  const now = new Date().toISOString();
  const job: IntegrationDeliveryJob = {
    id: `job-${Date.now()}`,
    channel: input.channel,
    title: input.title,
    message: input.message,
    recipient: input.recipient,
    status: "queued",
    attempts: 0,
    maxAttempts: input.maxAttempts ?? 5,
    nextAttemptAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await addIntegrationJob(job);
  return job;
}

export async function processDeliveryJob(job: IntegrationDeliveryJob) {
  const nowDate = new Date();
  const nextAttempt = new Date(job.nextAttemptAt);
  if (nextAttempt > nowDate) {
    return job;
  }

  const attempt = job.attempts + 1;
  const result = await dispatch(job.channel, job.message, job.recipient);

  const receipt: IntegrationDeliveryReceipt = {
    id: `receipt-${Date.now()}-${attempt}`,
    jobId: job.id,
    attempt,
    channel: job.channel,
    success: result.success,
    statusCode: result.statusCode,
    providerMessageId: result.providerMessageId,
    error: result.error,
    responseSnippet: result.responseSnippet,
    createdAt: new Date().toISOString(),
  };

  await addIntegrationReceipt(receipt);

  if (result.success) {
    const sentJob: IntegrationDeliveryJob = {
      ...job,
      attempts: attempt,
      status: "sent",
      providerMessageId: result.providerMessageId,
      lastError: undefined,
      updatedAt: new Date().toISOString(),
      nextAttemptAt: new Date(8640000000000000).toISOString(),
    };

    await updateIntegrationJob(sentJob);

    const alert: IntegrationAlert = {
      id: `alert-${Date.now()}`,
      channel: sentJob.channel,
      title: sentJob.title,
      message: sentJob.message,
      timestamp: new Date().toISOString(),
    };

    await appendIntegrationAlert(alert);
    return sentJob;
  }

  const exhausted = attempt >= job.maxAttempts;

  if (exhausted) {
    const deadJob: IntegrationDeliveryJob = {
      ...job,
      attempts: attempt,
      status: "dead-letter",
      lastError: result.error ?? "Delivery failed without explicit error.",
      updatedAt: new Date().toISOString(),
      nextAttemptAt: new Date(8640000000000000).toISOString(),
    };

    await updateIntegrationJob(deadJob);

    const deadLetter: DeadLetterLog = {
      id: `dl-${Date.now()}`,
      jobId: deadJob.id,
      channel: deadJob.channel,
      message: deadJob.message,
      reason: deadJob.lastError ?? "Delivery attempts exhausted.",
      attempts: deadJob.attempts,
      createdAt: new Date().toISOString(),
    };

    await addDeadLetterLog(deadLetter);
    return deadJob;
  }

  const backoffSeconds = nextBackoffSeconds(attempt);
  const retryAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();

  const retryJob: IntegrationDeliveryJob = {
    ...job,
    attempts: attempt,
    status: "retrying",
    lastError: result.error ?? "Delivery failed.",
    nextAttemptAt: retryAt,
    updatedAt: new Date().toISOString(),
  };

  await updateIntegrationJob(retryJob);
  return retryJob;
}

export async function processDueDeliveryJobs() {
  const jobs = await getIntegrationJobs();
  const dueJobs = jobs.filter((job) => job.status === "queued" || job.status === "retrying");

  const processed: IntegrationDeliveryJob[] = [];
  for (const job of dueJobs) {
    const updated = await processDeliveryJob(job);
    processed.push(updated);
  }

  return processed;
}
