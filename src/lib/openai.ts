type OpenAIChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAITextOptions = {
  system: string;
  user: string;
  fallback: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

type OpenAIJsonOptions<T> = {
  system: string;
  user: string;
  fallback: T;
  model?: string;
  temperature?: number;
  maxTokens?: number;
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY?.trim() ?? "";
const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

export function hasOpenAIKey() {
  return Boolean(OPENAI_API_KEY);
}

async function requestChatCompletion(messages: OpenAIChatMessage[], options: { model?: string; temperature?: number; maxTokens?: number; jsonMode?: boolean }) {
  if (!OPENAI_API_KEY) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model ?? OPENAI_MODEL,
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 700,
      ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(errorBody?.error?.message ?? `OpenAI request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  return content;
}

export async function generateOpenAIText(options: OpenAITextOptions) {
  try {
    const content = await requestChatCompletion(
      [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
      {
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      }
    );

    return content ?? options.fallback;
  } catch {
    return options.fallback;
  }
}

export async function generateOpenAIJSON<T>(options: OpenAIJsonOptions<T>) {
  try {
    const content = await requestChatCompletion(
      [
        { role: "system", content: options.system },
        { role: "user", content: options.user },
      ],
      {
        model: options.model,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        jsonMode: true,
      }
    );

    return content ? (JSON.parse(content) as T) : options.fallback;
  } catch {
    return options.fallback;
  }
}