"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type OnboardingResponse = {
  ok?: boolean;
  message?: string;
  error?: string;
};

export default function OnboardingPage() {
  const [workspaceName, setWorkspaceName] = useState("Complyra Demo Org");
  const [departmentsText, setDepartmentsText] = useState("Marketing, Operations, Product, Finance");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState("");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setStatus("");
    setError("");

    const departments = departmentsText
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceName, departments }),
      });

      const payload = (await response.json()) as OnboardingResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to initialize workspace.");
      }

      setStatus(payload.message ?? "Workspace configured.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unexpected onboarding error.");
    } finally {
      setLoading(false);
    }
  };

  const onUpload = async () => {
    if (!file) {
      setError("Please choose a CSV or XLSX file first.");
      return;
    }

    setUploading(true);
    setError("");
    setUploadStatus("");

    const form = new FormData();
    form.append("file", file);

    try {
      const response = await fetch("/api/onboarding/upload", {
        method: "POST",
        body: form,
      });

      const payload = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to parse and upload file.");
      }

      setUploadStatus(payload.message ?? "File parsed and stored.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unexpected upload error.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pb-12 pt-8 md:px-10">
      <div className="rounded-[2rem] border border-ink/10 bg-white/85 p-6 shadow-[0_18px_50px_-38px_rgba(17,24,39,0.45)] backdrop-blur-md md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink/55">Onboarding</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Set up your workspace</h1>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">
          This step mirrors the inspiration flow: initialize your org and departments first, then move into dashboard intelligence views.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium">Transactions file (CSV/XLSX)</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm"
            />
            <div className="pt-1">
              <button
                type="button"
                onClick={onUpload}
                disabled={!file || uploading}
                className="rounded-full border border-ink/25 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink/60 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? "Parsing file..." : "Parse and Store File"}
              </button>
            </div>
            {uploadStatus && <p className="text-sm text-emerald-700">{uploadStatus}</p>}
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Workspace name</span>
            <input
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              className="w-full rounded-xl border border-ink/20 bg-white px-3 py-2.5 text-sm outline-none ring-accent/35 transition focus:ring-4"
              placeholder="Your organization"
              required
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Departments (comma separated)</span>
            <textarea
              value={departmentsText}
              onChange={(event) => setDepartmentsText(event.target.value)}
              className="min-h-24 w-full rounded-xl border border-ink/20 bg-white px-3 py-2.5 text-sm outline-none ring-accent/35 transition focus:ring-4"
              placeholder="Marketing, Product, Finance"
            />
          </label>

          {error && <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          {status && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{status}</p>}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-canvas transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Initializing..." : "Initialize Workspace"}
            </button>
            <Link
              href="/dashboard"
              className="rounded-full border border-ink/25 bg-white px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-ink/60"
            >
              Continue to Dashboard
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
