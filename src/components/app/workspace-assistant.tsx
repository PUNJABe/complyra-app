"use client";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, MessageSquareText, Send, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
type Status = {
  lastStatementAt: string | null;
  dueAt: string;
  overdue: boolean;
  needsReview: number;
};
export function WorkspaceAssistant() {
  const [status, setStatus] = useState<Status | null>(null);
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const response = await apiFetch("/api/reminders", { cache: "no-store" });
        if (response.ok && alive) setStatus(await response.json());
      } catch {
        /* Retry on the next refresh. */
      }
    };
    void load();
    const interval = setInterval(load, 60000);
    window.addEventListener("statement-updated", load);
    return () => {
      alive = false;
      clearInterval(interval);
      window.removeEventListener("statement-updated", load);
    };
  }, []);
  useEffect(() => {
    let lastActivity = Date.now();
    const activity = () => {
      lastActivity = Date.now();
    };
    window.addEventListener("pointerdown", activity);
    window.addEventListener("keydown", activity);
    const timer = setInterval(async () => {
      if (Date.now() - lastActivity > 60000) return;
      try {
        const response = await apiFetch("/api/auth/session");
        const data = await response.json();
        if (data.authenticated === false) {
          router.replace("/auth/login");
          router.refresh();
        }
      } catch {
        /* Network status is shown by the next user action. */
      }
    }, 60000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
    };
  }, [router]);
  async function ask(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim() || busy) return;
    const question = prompt.trim();
    setPrompt("");
    setBusy(true);
    setError("");
    const next = [...messages, { role: "user" as const, content: question }];
    setMessages(next);
    try {
      const response = await apiFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: question,
          messages: messages.slice(-6),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Assistant unavailable.");
      setMessages([...next, { role: "assistant", content: data.answer }]);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Assistant unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles size={17} className="text-emerald-700" /> Your finance
        assistant
      </div>
      <section
        className={`rounded-2xl border p-4 ${status?.overdue ? "border-amber-500/30 bg-amber-500/5" : "border-ink/10 bg-canvas"}`}
      >
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold">
          <Clock3 size={15} /> Statement update
        </div>
        {status ? (
          <>
            <p className="text-xs leading-6 text-ink/65">
              {status.overdue
                ? "Your 24-hour statement update is due."
                : status.lastStatementAt
                  ? "Your latest statement is up to date."
                  : "Add your first statement within 24 hours."}
            </p>
            <p className="mt-1 text-[10px] text-ink/50">
              Due {new Date(status.dueAt).toLocaleString()}
            </p>
            <Link
              href="/dashboard/upload"
              className="mt-3 inline-block text-xs font-semibold text-emerald-700 underline"
            >
              Upload latest statement →
            </Link>
          </>
        ) : (
          <p className="text-xs text-ink/50">Checking your statement status…</p>
        )}
      </section>
      {Boolean(status?.needsReview) && (
        <Link
          href="/dashboard/transactions"
          className="rounded-2xl border border-amber-500/30 p-4 text-xs leading-6"
        >
          <strong>{status?.needsReview} payments need your context.</strong>
          <br />
          Add a remark and confirm their categories →
        </Link>
      )}
      <section className="min-h-0 flex-1">
        <p className="flex items-center gap-2 text-xs font-semibold">
          <MessageSquareText size={15} /> Ask about your finances
        </p>
        <p className="mt-2 text-[10px] leading-5 text-ink/50">
          Statement-based assistance. Enable external AI in Settings for
          additional help. Check suggestions before acting.
        </p>
        <div
          className="mt-4 max-h-[420px] space-y-3 overflow-y-auto"
          aria-live="polite"
        >
          {messages.slice(-10).map((message, index) => (
            <div
              key={index}
              className={`whitespace-pre-wrap rounded-xl p-3 text-xs leading-6 ${message.role === "user" ? "bg-emerald-500/10" : "border border-ink/10 bg-canvas"}`}
            >
              {message.content}
            </div>
          ))}
          {!messages.length && (
            <button
              type="button"
              className="rounded-xl border border-ink/10 p-3 text-left text-xs leading-6 text-ink/60"
              onClick={() => setPrompt("Which transactions need a remark?")}
            >
              Which transactions need a remark?
            </button>
          )}
          {busy && (
            <p className="text-xs text-ink/50">Looking at your records…</p>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-xs text-rose-600">
            {error}
          </p>
        )}
        <form className="mt-4 flex gap-2" onSubmit={ask}>
          <label className="sr-only" htmlFor="assistant-prompt">
            Your question
          </label>
          <input
            id="assistant-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={2000}
            placeholder="Ask a question…"
            className="min-w-0 flex-1 rounded-xl border border-ink/20 bg-canvas p-3 text-xs"
          />
          <button
            disabled={busy || !prompt.trim()}
            aria-label="Send question"
            className="rounded-xl bg-emerald-900 px-3 text-white disabled:opacity-50"
          >
            <Send size={15} />
          </button>
        </form>
        <Link
          className="mt-3 inline-block text-[10px] text-ink/50 underline"
          href="/dashboard/chat"
        >
          Open full conversation
        </Link>
      </section>
    </div>
  );
}
