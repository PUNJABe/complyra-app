"use client";

import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

type ToastType = "success" | "warning" | "error";

export function Toast({
  message,
  type,
  visible,
}: {
  message: string;
  type: ToastType;
  visible: boolean;
}) {
  if (!visible || !message) return null;

  const styles =
    type === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
      : type === "warning"
        ? "border-amber-300 bg-amber-50 text-amber-700"
        : "border-rose-300 bg-rose-50 text-rose-700";

  const Icon = type === "success" ? CheckCircle2 : type === "warning" ? AlertTriangle : XCircle;

  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border px-4 py-2 text-sm shadow-lg transition ${styles}`}>
      <Icon size={16} />
      <span>{message}</span>
    </div>
  );
}
