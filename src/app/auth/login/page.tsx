"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Provider = "mock" | "supabase";

type LoginResponse = {
  ok?: boolean;
  error?: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [provider, setProvider] = useState<Provider>("mock");
  const [email, setEmail] = useState("demo@complyra.local");
  const [password, setPassword] = useState("complyra123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, provider }),
      });

      const payload = (await response.json()) as LoginResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "Login failed.");
      }

      router.push("/onboarding");
      router.refresh();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unexpected login error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-6 py-12 md:px-10">
      <div className="grid w-full gap-6 rounded-[2rem] border border-ink/10 bg-white/86 p-6 shadow-[0_24px_60px_-44px_rgba(17,24,39,0.45)] backdrop-blur-md md:grid-cols-[1.05fr_0.95fr] md:p-8">
        <section className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">Complyra Access</p>
          <h1 className="text-3xl font-semibold tracking-tight">Sign in to your workspace</h1>
          <p className="text-sm leading-relaxed text-ink/70">
            Intelligent compliance system access. Start with mock credentials for local development, then switch to Supabase provider for real authentication.
          </p>

          <div className="rounded-2xl border border-ink/10 bg-canvas/65 p-4 text-sm">
            <p className="font-semibold text-ink/80">Mock login defaults</p>
            <p className="mt-1 text-ink/65">Email: demo@complyra.local</p>
            <p className="text-ink/65">Password: complyra123</p>
          </div>
        </section>

        <form className="space-y-4" onSubmit={onSubmit}>
          <div className="inline-flex rounded-full border border-ink/15 bg-canvas/70 p-1 text-sm">
            <button
              type="button"
              onClick={() => setProvider("mock")}
              className={`rounded-full px-3 py-1.5 transition ${provider === "mock" ? "bg-ink text-canvas" : "text-ink/70"}`}
            >
              Mock Provider
            </button>
            <button
              type="button"
              onClick={() => setProvider("supabase")}
              className={`rounded-full px-3 py-1.5 transition ${provider === "supabase" ? "bg-ink text-canvas" : "text-ink/70"}`}
            >
              Supabase Provider
            </button>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2.5 text-sm outline-none ring-accent/35 transition focus:ring-4"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2.5 text-sm outline-none ring-accent/35 transition focus:ring-4"
            />
          </label>

          {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-canvas transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
