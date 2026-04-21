"use client";

import { useRef, useState } from "react";
import { Lock, UploadCloud, FileText, FileSpreadsheet, ShieldCheck } from "lucide-react";
import { Toast } from "@/components/app/toast";

export default function UploadDataPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 2200);
  };

  const simulateProgress = () => {
    setProgress(0);
    const timer = window.setInterval(() => {
      setProgress((value) => {
        if (value >= 100) {
          window.clearInterval(timer);
          showToast("File uploaded successfully");
          return 100;
        }
        return value + 10;
      });
    }, 120);
  };

  const onFileSelected = (candidate: File | undefined) => {
    if (!candidate) return;
    const ext = candidate.name.toLowerCase();
    if (!ext.endsWith(".xlsx") && !ext.endsWith(".pdf")) {
      showToast("Unsupported file type. Please upload .xlsx or .pdf");
      return;
    }
    setFile(candidate);
    simulateProgress();

    if (ext.endsWith(".xlsx")) {
      const formData = new FormData();
      formData.append("file", candidate);

      void fetch("/api/onboarding/upload", {
        method: "POST",
        body: formData,
      })
        .then(async (response) => {
          if (!response.ok) {
            const payload = (await response.json().catch(() => ({}))) as { error?: string };
            throw new Error(payload.error ?? "Upload failed.");
          }
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Upload failed.";
          showToast(message);
        });
      return;
    }

    void fetch("/api/audit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "upload_pdf_selected",
        details: `PDF ${candidate.name} selected for secure staging upload.`,
        resource: "upload",
      }),
    }).catch(() => {
      // Intentionally ignore audit post failures to keep upload UX smooth.
    });

    const formData = new FormData();
    formData.append("file", candidate);

    void fetch("/api/onboarding/upload", {
      method: "POST",
      body: formData,
    }).catch(() => {
      showToast("Upload failed.");
      });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-ink/10 bg-canvas/60 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1E3A8A]">Upload Center</p>
        <h2 className="mt-2 text-2xl font-semibold">Upload Data</h2>
        <p className="mt-1 text-sm text-ink/70">Drag and drop Excel or PDF files to start instant policy and compliance analysis.</p>
      </section>

      <section
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          onFileSelected(event.dataTransfer.files?.[0]);
        }}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition ${
          dragging ? "border-[#10B981] bg-emerald-50" : "border-ink/20 bg-white/85"
        }`}
      >
        <UploadCloud size={34} className="mx-auto text-[#1E3A8A]" />
        <p className="mt-3 text-base font-semibold">Drop your file here</p>
        <p className="mt-1 text-sm text-ink/65">or click below to browse files</p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-4 rounded-full bg-[#1E3A8A] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#1E40AF]"
        >
          Choose File
        </button>

        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.pdf"
          className="hidden"
          onChange={(event) => onFileSelected(event.target.files?.[0])}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-ink/10 bg-white/85 p-4">
          <div className="flex items-center gap-2 text-[#1E3A8A]"><FileSpreadsheet size={16} /><span className="text-sm font-semibold">Excel (.xlsx)</span></div>
          <p className="mt-2 text-xs text-ink/65">Upload structured expense sheets for fast ingestion and policy mapping.</p>
        </article>
        <article className="rounded-2xl border border-ink/10 bg-white/85 p-4">
          <div className="flex items-center gap-2 text-[#1E3A8A]"><FileText size={16} /><span className="text-sm font-semibold">PDF</span></div>
          <p className="mt-2 text-xs text-ink/65">Upload invoices, statements, and backup documents for validation.</p>
        </article>
        <article className="rounded-2xl border border-ink/10 bg-white/85 p-4">
          <div className="flex items-center gap-2 text-[#10B981]"><ShieldCheck size={16} /><span className="text-sm font-semibold">Trust Signals</span></div>
          <p className="mt-2 text-xs text-ink/65">Encrypted in transit. Auto-deleted after 30 days unless retained by policy.</p>
        </article>
      </section>

      {file && (
        <section className="rounded-2xl border border-ink/10 bg-white/85 p-5">
          <p className="text-sm font-semibold">File Preview</p>
          <div className="mt-3 rounded-xl border border-ink/10 bg-canvas/60 p-3 text-sm text-ink/75">
            <p>Name: {file.name}</p>
            <p>Size: {(file.size / 1024).toFixed(1)} KB</p>
            <p>Type: {file.type || "Unknown"}</p>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-ink/60">
              <span>Upload progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-canvas">
              <div className="h-2 rounded-full bg-[#10B981] transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-ink/10 bg-white/85 p-4 text-sm text-ink/70">
        <div className="flex items-center gap-2 font-semibold text-ink/80"><Lock size={16} /> Security</div>
        <p className="mt-2">Your data is encrypted and processed in a secure session. No third-party sharing by default.</p>
      </section>

      <Toast message={toastMessage} type={toastMessage.includes("successfully") ? "success" : "warning"} visible={Boolean(toastMessage)} />
    </div>
  );
}
