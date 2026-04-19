import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-canvas text-ink">
      <div aria-hidden className="pointer-events-none absolute -left-20 -top-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-highlight/15 blur-3xl" />

      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 md:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-canvas shadow-sm">CR</div>
          <div>
            <p className="text-sm tracking-[0.2em] text-ink/60">COMPLYRA</p>
            <p className="text-sm font-semibold">Intelligent compliance system</p>
          </div>
        </div>
        <Link href="/auth/login" className="rounded-full border border-ink/20 px-4 py-2 text-sm font-medium transition hover:border-ink/60 hover:bg-white/70">
          Connect Data
        </Link>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-8 px-6 pb-12 md:px-10 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="space-y-6">
          <div className="rounded-[2rem] border border-ink/10 bg-white/70 p-6 shadow-[0_20px_60px_-40px_rgba(16,23,42,0.5)] backdrop-blur-md md:p-8">
            <p className="inline-flex rounded-full border border-ink/15 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink/70">
              Premium Minimal v2
            </p>
            <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Your finance control tower for faster, cleaner spend decisions.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink/75 md:text-lg">
              Smart platform that ensures financial rules are followed. Upload transactions, map policy controls, and ask plain-English questions with actionable AI guidance.
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-3">
              {[
                { label: "Policy Confidence", value: "92%", hint: "No. of transactions within policy" },
                { label: "Pending Approvals", value: "18", hint: "5 flagged as urgent" },
                { label: "Forecast Gap", value: "-$12.4K", hint: "Projected variance this month" },
              ].map((metric) => (
                <article key={metric.label} className="rounded-2xl border border-ink/10 bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.08em] text-ink/55">{metric.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">{metric.value}</p>
                  <p className="mt-1 text-xs text-ink/60">{metric.hint}</p>
                </article>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/auth/login" className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-canvas transition hover:translate-y-[-1px] hover:bg-ink/90">
                Start Onboarding
              </Link>
              <Link href="/auth/login" className="rounded-full border border-ink/25 bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:border-ink/65">
                Open Demo Workspace
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[1.75rem] border border-ink/10 bg-white/75 p-6 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Spend Pattern</h2>
                <span className="text-xs font-medium text-ink/60">Last 6 months</span>
              </div>
              <div className="mt-5 grid h-44 grid-cols-6 items-end gap-3">
                {[44, 52, 61, 48, 72, 66].map((height, index) => (
                  <div key={height} className="space-y-2">
                    <div
                      className="w-full rounded-t-xl bg-gradient-to-t from-accent to-highlight animate-rise"
                      style={{ height: `${height}%`, animationDelay: `${index * 90}ms` }}
                    />
                    <p className="text-center text-xs text-ink/55">M{index + 1}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-ink/10 bg-white/75 p-6 backdrop-blur-md">
              <h2 className="text-lg font-semibold">Automation Flow</h2>
              <ul className="mt-4 space-y-3">
                {[
                  "Import statements",
                  "Detect anomalies",
                  "Tag policy risk",
                  "Generate report",
                ].map((step, i) => (
                  <li key={step} className="flex items-center gap-3 text-sm">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-ink/20 bg-canvas font-semibold">
                      {i + 1}
                    </span>
                    <span className="text-ink/80">{step}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </section>

        <aside className="space-y-4 rounded-[2rem] border border-ink/10 bg-white/75 p-5 shadow-[0_20px_60px_-42px_rgba(16,23,42,0.45)] backdrop-blur-md md:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Spend Assistant</h2>
            <span className="rounded-full border border-ink/15 px-2 py-1 text-xs text-ink/60">Live</span>
          </div>

          <div className="space-y-3">
            <div className="max-w-[90%] rounded-2xl border border-ink/10 bg-canvas px-4 py-3 text-sm text-ink/80">
              Highlight anything unusual this week.
            </div>
            <div className="ml-auto max-w-[90%] rounded-2xl bg-ink px-4 py-3 text-sm text-canvas">
              3 anomalies found: travel spikes, duplicate software invoices, and one policy-threshold breach above $2,500.
            </div>
            <div className="max-w-[90%] rounded-2xl border border-ink/10 bg-canvas px-4 py-3 text-sm text-ink/80">
              Show a breakdown by department.
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-ink/25 bg-white p-4">
            <p className="text-sm font-semibold">Suggested prompts</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "Which vendors grew most?",
                "List high-severity findings",
                "Forecast next 30 days",
              ].map((prompt) => (
                <button
                  key={prompt}
                  className="rounded-full border border-ink/20 px-3 py-1.5 text-xs text-ink/75 transition hover:border-ink/55"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-canvas p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Status</p>
            <p className="mt-2 text-2xl font-semibold">Data synced 8m ago</p>
            <p className="mt-1 text-sm text-ink/65">Next auto refresh in 12 minutes.</p>
          </div>
        </aside>
      </main>
    </div>
  );
}
