"use client";

import Link from "next/link";
import { useState } from "react";
import { Lock, Zap, Settings, ChevronRight, Upload } from "lucide-react";
import type { WorkspaceMode } from "@/lib/types";

interface AnalysisResult {
  totalTransactions: number;
  dateRange: { earliest: string; latest: string };
  averageTransaction: number;
  categoryBreakdown: Array<{ category: string; total: number; percentage: number }>;
  suggestedBudgets: Array<{ category: string; suggestedMonthly: number; baseAverage: number }>;
}

export default function OnboardingPage() {
  const [mode, setMode] = useState<WorkspaceMode>("personal");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"upload" | "options" | "review">("upload");

  const onUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please choose a file first.");
      return;
    }

    setUploading(true);
    setError("");

    const form = new FormData();
    form.append("file", file);
    form.append("mode", mode);

    try {
      const response = await fetch("/api/onboarding/parse", {
        method: "POST",
        body: form,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to parse statement");
      }

      setAnalysis({
        ...result.analysis,
        suggestedBudgets: result.suggestedBudgets ?? [],
      });
      setStep("options");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-6 pb-12 pt-8 md:px-10">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">Complyra Onboarding</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {step === "upload" && "Upload your statement"}
          {step === "options" && "Choose your setup mode"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">
          {step === "upload" &&
            "Start by uploading a recent bank or expense statement. Complyra will analyze it and suggest personalized policies."}
          {step === "options" && "We analyzed your spending. How would you like to create your compliance policy?"}
        </p>
      </div>

      {/* Upload Step */}
      {step === "upload" && (
        <div className="rounded-2xl border border-ink/10 bg-white/85 p-8 shadow-[0_18px_50px_-38px_rgba(17,24,39,0.45)] backdrop-blur-md">
          <form onSubmit={onUpload} className="space-y-6">
            {/* Who are you? */}
            <div className="rounded-2xl border border-ink/12 bg-canvas/65 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55">Who are you setting up for?</p>
              <div className="mt-3 inline-flex rounded-full border border-ink/15 bg-white p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setMode("personal")}
                  className={`rounded-full px-4 py-2 font-medium transition ${
                    mode === "personal" ? "bg-ink text-canvas" : "text-ink/70 hover:text-ink"
                  }`}
                >
                  Personal
                </button>
                <button
                  type="button"
                  onClick={() => setMode("business")}
                  className={`rounded-full px-4 py-2 font-medium transition ${
                    mode === "business" ? "bg-ink text-canvas" : "text-ink/70 hover:text-ink"
                  }`}
                >
                  Business
                </button>
              </div>
            </div>

            {/* Upload Zone */}
            <label className="relative rounded-2xl border-2 border-dashed border-ink/20 bg-ink/2 p-8 text-center hover:border-ink/40 transition cursor-pointer">
              <Upload className="mx-auto h-10 w-10 text-ink/40 mb-3" />
              <p className="font-semibold text-ink">Drag and drop your statement</p>
              <p className="text-sm text-ink/60 mt-1">or click to select file</p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              {file && (
                <p className="mt-3 text-sm font-medium text-accent">
                  ✓ {file.name}
                </p>
              )}
            </label>

            {/* Supported formats */}
            <div className="rounded-xl border border-ink/10 bg-canvas/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55 mb-2">Supported formats:</p>
              <div className="flex flex-wrap gap-2">
                {["Bank CSV", "Credit Card CSV", "Expense Excel", "PDF Records"].map((fmt) => (
                  <div key={fmt} className="rounded-full bg-white px-3 py-1 text-xs text-ink/70">
                    {fmt}
                  </div>
                ))}
              </div>
            </div>

            {/* Trust message */}
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 flex gap-2">
              <Lock className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
              <p className="text-xs text-accent/80">
                Your statement is <span className="font-semibold">encrypted and analyzed privately</span>. We never store raw statements.
              </p>
            </div>

            {error && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
            )}

            <button
              type="submit"
              disabled={!file || uploading}
              className="w-full rounded-full bg-ink px-6 py-3 text-sm font-semibold text-canvas transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploading ? "Analyzing statement..." : "Analyze Statement"}
            </button>

            <Link
              href="/dashboard"
              className="block text-center text-sm text-ink/60 hover:text-ink transition"
            >
              Skip for now →
            </Link>
          </form>
        </div>
      )}

      {/* Options Step */}
      {step === "options" && analysis && (
        <div className="space-y-6">
          {/* Analysis Summary */}
          <div className="rounded-2xl border border-ink/10 bg-white/85 p-6 shadow-[0_18px_50px_-38px_rgba(17,24,39,0.45)] backdrop-blur-md">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55 mb-4">Analysis results</p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-xl bg-canvas/60 p-4">
                <p className="text-xs text-ink/60 font-medium">Transactions</p>
                <p className="text-2xl font-bold text-ink mt-1">{analysis.totalTransactions}</p>
              </div>
              <div className="rounded-xl bg-canvas/60 p-4">
                <p className="text-xs text-ink/60 font-medium">Avg Amount</p>
                <p className="text-2xl font-bold text-ink mt-1">₹{analysis.averageTransaction.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-canvas/60 p-4">
                <p className="text-xs text-ink/60 font-medium">Categories</p>
                <p className="text-2xl font-bold text-ink mt-1">{analysis.categoryBreakdown.length}</p>
              </div>
              <div className="rounded-xl bg-canvas/60 p-4">
                <p className="text-xs text-ink/60 font-medium">Date Range</p>
                <p className="text-xs font-mono text-ink mt-2">
                  {new Date(analysis.dateRange.earliest).toLocaleDateString()} to{" "}
                  {new Date(analysis.dateRange.latest).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Category breakdown */}
            <div className="mt-6 pt-6 border-t border-ink/10">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink/55 mb-3">Spending by category</p>
              <div className="space-y-2">
                {analysis.categoryBreakdown.slice(0, 5).map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between text-sm">
                    <span className="text-ink/80">{cat.category}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-ink/10 rounded-full overflow-hidden">
                        <div className="h-full bg-accent/70" style={{ width: `${cat.percentage}%` }} />
                      </div>
                      <span className="text-ink/60 font-mono text-xs w-12 text-right">₹{cat.total.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Three Options */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* Option A: AI Auto */}
            <button
              onClick={() => {
                localStorage.setItem("onboarding_analysis", JSON.stringify(analysis));
                localStorage.setItem("policy_mode", "ai_auto");
                window.location.href = "/onboarding/ai-policy";
              }}
              className="group rounded-2xl border-2 border-accent/30 bg-white/85 p-6 text-left transition hover:border-accent hover:shadow-[0_18px_50px_-38px_rgba(16,185,129,0.15)]"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="rounded-lg bg-accent/10 p-3">
                  <Zap className="h-5 w-5 text-accent" />
                </div>
                <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                  Recommended
                </span>
              </div>
              <h3 className="font-semibold text-ink group-hover:text-ink">AI Generate Policy</h3>
              <p className="text-sm text-ink/60 mt-2">
                Complyra creates a smart policy based on your spending patterns in 30 seconds
              </p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent group-hover:gap-2 transition">
                Get started <ChevronRight className="h-4 w-4" />
              </div>
            </button>

            {/* Option B: Manual */}
            <button
              onClick={() => {
                localStorage.setItem("onboarding_analysis", JSON.stringify(analysis));
                localStorage.setItem("policy_mode", "manual");
                window.location.href = "/onboarding/manual-budget";
              }}
              className="group rounded-2xl border-2 border-ink/15 bg-white/85 p-6 text-left transition hover:border-ink/40 hover:shadow-[0_18px_50px_-38px_rgba(30,58,138,0.15)]"
            >
              <div className="rounded-lg bg-ink/10 p-3 mb-4">
                <Settings className="h-5 w-5 text-ink/70" />
              </div>
              <h3 className="font-semibold text-ink">Set Budget Manually</h3>
              <p className="text-sm text-ink/60 mt-2">
                Define your own monthly category budgets and savings targets from scratch
              </p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-ink/60 group-hover:gap-2 group-hover:text-ink transition">
                Get started <ChevronRight className="h-4 w-4" />
              </div>
            </button>

            {/* Option C: Hybrid */}
            <button
              onClick={() => {
                localStorage.setItem("onboarding_analysis", JSON.stringify(analysis));
                localStorage.setItem("policy_mode", "hybrid");
                window.location.href = "/onboarding/hybrid-mode";
              }}
              className="group rounded-2xl border-2 border-ink/15 bg-white/85 p-6 text-left transition hover:border-ink/40 hover:shadow-[0_18px_50px_-38px_rgba(30,58,138,0.15)]"
            >
              <div className="rounded-lg bg-ink/10 p-3 mb-4">
                <Settings className="h-5 w-5 text-ink/70" />
              </div>
              <h3 className="font-semibold text-ink">Hybrid Smart Setup</h3>
              <p className="text-sm text-ink/60 mt-2">
                Generate policy first, then review and customize every category and limit
              </p>
              <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-ink/60 group-hover:gap-2 group-hover:text-ink transition">
                Get started <ChevronRight className="h-4 w-4" />
              </div>
            </button>
          </div>

          <button
            onClick={() => setStep("upload")}
            className="w-full text-center text-sm text-ink/60 hover:text-ink transition py-2"
          >
            ← Upload different statement
          </button>
        </div>
      )}
    </div>
  );
}
