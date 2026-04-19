import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { appendTransactions, type StoredTransaction } from "@/lib/storage";

function parseNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const clean = value.replace(/[$,\s]/g, "");
    const parsed = Number.parseFloat(clean);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function parseDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const date = XLSX.SSF.parse_date_code(value);
    if (date) {
      const iso = new Date(Date.UTC(date.y, date.m - 1, date.d));
      return iso.toISOString().slice(0, 10);
    }
  }

  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.valueOf())) {
      return date.toISOString().slice(0, 10);
    }
  }

  return new Date().toISOString().slice(0, 10);
}

function toTransactions(rows: Record<string, unknown>[]): StoredTransaction[] {
  return rows
    .map((row, index) => {
      const merchant =
        (row.merchant as string) ??
        (row.vendor as string) ??
        (row.description as string) ??
        "Unknown Merchant";
      const amountRaw =
        row.amount ?? row.signedAmount ?? row.value ?? row.total ?? 0;

      const amount = Math.abs(parseNumber(amountRaw));
      if (!amount) return null;

      return {
        id: `${Date.now()}-${index}`,
        date: parseDate(row.date ?? row.postingDate ?? row.transactionDate),
        merchant,
        amount,
        employee:
          (row.employee as string) ??
          (row.employee_name as string) ??
          (row.name as string) ??
          "Unknown Employee",
        department: (row.department as string) ?? "Unassigned",
        category: (row.category as string) ?? (row.type as string) ?? "General",
      } satisfies StoredTransaction;
    })
    .filter((record): record is StoredTransaction => record !== null);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }

  const fileName = file.name.toLowerCase();
  const isSupported = fileName.endsWith(".csv") || fileName.endsWith(".xlsx") || fileName.endsWith(".xls");

  if (!isSupported) {
    return NextResponse.json(
      { error: "Unsupported file. Upload CSV or XLSX." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheet = workbook.SheetNames[0];

  if (!firstSheet) {
    return NextResponse.json({ error: "No sheets found in file." }, { status: 400 });
  }

  const sheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  const normalizedRows = rows.map((row) => {
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key.trim().toLowerCase()] = value;
    }
    return normalized;
  });

  const transactions = toTransactions(normalizedRows);

  if (!transactions.length) {
    return NextResponse.json(
      { error: "No valid transaction rows found. Include amount and merchant columns." },
      { status: 400 }
    );
  }

  const totalStored = await appendTransactions(transactions);

  return NextResponse.json({
    ok: true,
    importedRows: transactions.length,
    totalStored,
    message: `Imported ${transactions.length} rows from ${file.name}.`,
  });
}
