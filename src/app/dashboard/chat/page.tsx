"use client";

import { FormEvent, useState } from "react";

import { DonutChartCard, LineChartCard, StackedBarCard } from "@/components/app/charts";
import type { ChatResponse } from "@/lib/types";

type ThreadMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export default function DashboardChatPage() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ThreadMessage[]>([
    {
      id: "seed-1",
      role: "assistant",
      content: "Ask me about anomalies, vendor growth, department spend, or forecasts.",
    },
  ]);
  const [chart, setChart] = useState<ChatResponse["visualization"]>(undefined);
  const [reasoning, setReasoning] = useState<ChatResponse["reasoning"]>(undefined);
  const [loading, setLoading] = useState(false);

  const prompts = [
    "Why did travel spend increase in March?",
    "Which team is least compliant and why?",
    "Predict next month overspend risk",
  ];

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = prompt.trim();
    if (!trimmed) return;

    const userMessage: ThreadMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setPrompt("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });

      const payload = (await response.json()) as ChatResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Chat request failed.");

      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: payload.answer },
      ]);
      setChart(payload.visualization);
      setReasoning(payload.reasoning);
    } catch (requestError) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: requestError instanceof Error ? requestError.message : "Unexpected chat error.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
      <section className="rounded-2xl border border-ink/10 bg-white/82 p-4 md:p-5">
        <h2 className="text-lg font-semibold">Spend Assistant</h2>
        <p className="mt-1 text-sm text-ink/65">Ask Anything with reasoning: insight, recommendation, and next action.</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {prompts.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPrompt(item)}
              className="rounded-full border border-ink/20 bg-white px-3 py-1.5 text-xs text-ink/75 transition hover:border-ink/45"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="mt-4 h-[460px] space-y-3 overflow-y-auto rounded-xl border border-ink/10 bg-canvas/70 p-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                message.role === "user"
                  ? "ml-auto bg-ink text-canvas"
                  : "border border-ink/12 bg-white text-ink/85"
              }`}
            >
              {message.content}
            </div>
          ))}
          {loading && <p className="text-sm text-ink/60">Thinking...</p>}
        </div>

        <form className="mt-3 flex gap-2" onSubmit={send}>
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Show top vendors by growth"
            className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2.5 text-sm outline-none ring-accent/35 transition focus:ring-4"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-canvas transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Send
          </button>
        </form>
      </section>

      <aside className="rounded-2xl border border-ink/10 bg-white/82 p-4 md:p-5">
        <h3 className="text-base font-semibold">Visualization</h3>
        {!chart ? (
          <p className="mt-3 text-sm text-ink/65">Ask a question like &quot;department breakdown&quot; or &quot;forecast&quot; to render a live panel.</p>
        ) : (
          <div className="mt-4">
            {chart.kind === "line" && <LineChartCard data={chart} />}
            {chart.kind === "donut" && <DonutChartCard data={chart} />}
            {chart.kind === "stacked" && <StackedBarCard data={chart} />}
          </div>
        )}

        {reasoning && (
          <div className="mt-4 space-y-2 rounded-xl border border-ink/12 bg-canvas/70 p-3 text-sm">
            <p><span className="font-semibold">Insight:</span> {reasoning.insight}</p>
            <p><span className="font-semibold">Recommendation:</span> {reasoning.recommendation}</p>
            <p><span className="font-semibold">Action:</span> {reasoning.action}</p>
          </div>
        )}
      </aside>
    </div>
  );
}
