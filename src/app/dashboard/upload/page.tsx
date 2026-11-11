"use client";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { FileUp, CircleCheck } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
export default function UploadDataPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [count, setCount] = useState<number | null>(null);
  async function upload(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setBusy(true);
    setError("");
    setCount(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await apiFetch("/api/onboarding/upload", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed.");
      setCount(data.importedRows);
      window.dispatchEvent(new Event("statement-updated"));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-5">
      <p className="text-xs tracking-widest text-emerald-700">
        KEEP YOUR RECORDS CURRENT
      </p>
      <h2 className="text-3xl font-medium tracking-tight">
        Start with your statement.
      </h2>
      <p className="text-sm leading-7 text-ink/60">
        Upload an INR-denominated CSV, Excel, or text-based PDF statement. We
        will categorize recognized payments and ask for your context on the
        ones that need a closer look.
      </p>
      <form
        onSubmit={upload}
        className="space-y-5 rounded-2xl border border-dashed border-emerald-600/40 bg-emerald-500/5 p-7"
      >
        <FileUp size={35} className="text-emerald-700" />
        <label className="block text-sm font-medium">
          Choose a statement
          <input
            type="file"
            accept=".csv,.xlsx,.xls,.pdf"
            required
            disabled={busy}
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              setCount(null);
            }}
            className="mt-3 block w-full rounded-lg border border-ink/15 bg-canvas p-3 text-xs"
          />
        </label>
        <p className="text-xs leading-6 text-ink/60">
          Maximum 5 MB and 2,000 transactions. Include date, merchant or
          narration, and amount (or separate debit and credit) columns. Dates:
          YYYY-MM-DD or DD/MM/YYYY. Amount-only statements are treated as
          expenses unless a credit direction is supplied. PDF must contain
          selectable text; scanned image PDFs need OCR and cannot be imported.
        </p>
        <p className="text-xs leading-6 text-amber-700">
          Importing replaces your active statement. Export your records first if
          you need to keep them. Source files are processed in memory; extracted
          records are saved.
        </p>
        <button
          disabled={busy || !file}
          className="rounded-xl bg-emerald-900 px-5 py-3 text-sm text-white disabled:opacity-50"
        >
          {busy ? "Importing and reviewing..." : "Import statement"}
        </button>
      </form>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-500/10 p-4 text-sm text-rose-600"
        >
          {error}
        </p>
      )}
      {count !== null && (
        <div role="status" className="rounded-xl bg-emerald-500/10 p-5 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <CircleCheck size={18} />
            {count} transactions imported.
          </p>
          <Link
            className="mt-3 inline-block underline"
            href="/dashboard/transactions"
          >
            Review transactions and add remarks →
          </Link>
        </div>
      )}
      <a
        className="inline-block text-xs underline"
        href="/api/account?export=true"
      >
        Export current workspace
      </a>
    </div>
  );
}
