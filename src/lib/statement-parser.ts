import * as XLSX from "xlsx";
import { classifyTransaction } from "@/lib/categorization";
import { CATEGORIES } from "@/lib/transaction-categories";

export interface ParsedTransaction {
  merchant: string;
  amount: number;
  date: string;
  category?: string;
  description?: string;
  direction?: "debit" | "credit";
}
export interface StatementAnalysis {
  transactions: ParsedTransaction[];
  categoryBreakdown: Record<string, number>;
  totalTransactions: number;
  dateRange: { earliest: string; latest: string };
  averageTransactionValue: number;
}
function amount(value: unknown): number {
  if (value == null || value === "" || value === "-") return 0;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Invalid transaction amount.");
    return Math.abs(value);
  }
  if (typeof value !== "string") throw new Error("Invalid transaction amount.");
  const cleaned = value
    .replace(/(?:INR|Rs\.?|₹|,|\s)/gi, "")
    .replace(/(?:CR|DR)$/i, "");
  if (!cleaned || cleaned === "-") return 0;
  if (!/^[+-]?(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(cleaned))
    throw new Error(
      "Invalid amount. Use INR numbers with at most two decimal places.",
    );
  return Math.abs(Number(cleaned));
}
function dateValue(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.valueOf()))
    return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed)
      return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d))
        .toISOString()
        .slice(0, 10);
  }
  if (typeof value === "string") {
    const text = value.trim();
    const indian = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
    if (indian) {
      const [, day, month, year] = indian;
      const date = new Date(
        Date.UTC(Number(year), Number(month) - 1, Number(day)),
      );
      if (
        date.getUTCDate() !== Number(day) ||
        date.getUTCMonth() !== Number(month) - 1
      )
        throw new Error("Invalid transaction date.");
      return date.toISOString().slice(0, 10);
    }
    const date = new Date(text);
    if (!Number.isNaN(date.valueOf())) {
      const iso = date.toISOString().slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(text) && text !== iso)
        throw new Error("Invalid transaction date.");
      return iso;
    }
  }
  throw new Error(
    "Every transaction must have a valid date. Use YYYY-MM-DD or DD/MM/YYYY.",
  );
}
function first(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys)
    if (row[key] !== undefined && row[key] !== null && row[key] !== "")
      return row[key];
  return undefined;
}
function text(row: Record<string, unknown>, keys: string[]) {
  const value = first(row, keys);
  return typeof value === "string" ? value.trim() : undefined;
}
function convertRows(sheet: XLSX.WorkSheet): ParsedTransaction[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  if (rows.length > 2000)
    throw new Error("Maximum 2,000 transactions per statement.");
  const result: ParsedTransaction[] = [];
  for (const original of rows) {
    const row = Object.fromEntries(
      Object.entries(original).map(([key, value]) => [
        key.toLowerCase().replace(/[^a-z0-9]/g, ""),
        value,
      ]),
    );
    const merchant = (
      text(row, [
        "merchant",
        "vendor",
        "description",
        "payee",
        "narration",
        "particulars",
        "remarks",
        "details",
        "beneficiary",
      ]) || "Unknown Merchant"
    ).slice(0, 500);
    const debit = amount(
      first(row, ["debit", "debitamount", "withdrawalamt", "withdrawal", "dr"]),
    );
    const credit = amount(
      first(row, ["credit", "creditamount", "depositamt", "deposit", "cr"]),
    );
    const rawAmount = first(row, [
      "amount",
      "value",
      "total",
      "signedamount",
      "txnamount",
    ]);
    const resolved = amount(rawAmount) || debit || credit;
    if (!resolved) continue;
    if (resolved > 1e12) throw new Error("Invalid transaction amount.");
    if (debit && credit)
      throw new Error(
        "A transaction cannot have both debit and credit amounts.",
      );
    const currency = text(row, ["currency", "currencycode"]);
    if (currency && currency.toUpperCase() !== "INR")
      throw new Error(
        "Only INR statements are supported. Currency conversion is not applied.",
      );
    const supplied = text(row, ["category"]);
    const inferred = classifyTransaction({
      id: "",
      merchant,
      amount: resolved,
      date: "",
      employee: "",
      department: "",
      category: "Other",
    });
    const category =
      CATEGORIES.find(
        (item) => item.toLowerCase() === supplied?.toLowerCase(),
      ) || inferred.category;
    const isCredit =
      Boolean(credit && !debit) ||
      /^(cr|credit|income)$/i.test(
        text(row, ["direction", "type", "drcr"]) || "",
      ) ||
      /CR\s*$/i.test(String(rawAmount ?? "")) ||
      (row.signedamount !== undefined && Number(row.signedamount) > 0);
    result.push({
      merchant,
      amount: resolved,
      date: dateValue(
        first(row, [
          "date",
          "transactiondate",
          "txndate",
          "postingdate",
          "valuedate",
          "transdate",
        ]),
      ),
      category,
      direction: isCredit ? "credit" : "debit",
      description: text(row, [
        "description",
        "narration",
        "particulars",
        "remarks",
      ]),
    });
  }
  return result;
}
export function parseCSV(csvText: string): ParsedTransaction[] {
  const workbook = XLSX.read(csvText, {
    type: "string",
    sheetRows: 2002,
    raw: true,
  });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return sheet ? convertRows(sheet) : [];
}
export function analyzeTransactions(
  transactions: ParsedTransaction[],
): StatementAnalysis {
  const expenses = transactions.filter((item) => item.direction !== "credit");
  const categoryBreakdown: Record<string, number> = Object.create(null);
  for (const transaction of expenses)
    categoryBreakdown[transaction.category || "Other"] =
      (categoryBreakdown[transaction.category || "Other"] || 0) +
      transaction.amount;
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  return {
    transactions,
    categoryBreakdown,
    totalTransactions: transactions.length,
    dateRange: {
      earliest: sorted[0]?.date || "",
      latest: sorted.at(-1)?.date || "",
    },
    averageTransactionValue:
      expenses.reduce((sum, item) => sum + item.amount, 0) /
      Math.max(expenses.length, 1),
  };
}
function validateWorkbookSize(buffer: Buffer) {
  if (buffer.length < 4) throw new Error("Empty or invalid workbook.");
  if (buffer.readUInt16LE(0) !== 0x4b50) return;
  let total = 0,
    entries = 0;
  for (let offset = 0; offset + 46 <= buffer.length; offset++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) continue;
    const uncompressed = buffer.readUInt32LE(offset + 24);
    total += uncompressed;
    entries++;
    if (
      total > 32 * 1024 * 1024 ||
      uncompressed > 20 * 1024 * 1024 ||
      entries > 1000
    )
      throw new Error(
        "Workbook expands beyond the supported size. Export a smaller CSV statement.",
      );
    offset +=
      45 +
      buffer.readUInt16LE(offset + 28) +
      buffer.readUInt16LE(offset + 30) +
      buffer.readUInt16LE(offset + 32);
  }
}
export async function parseStatementFile(
  file: File,
): Promise<ParsedTransaction[]> {
  if (file.size > 5 * 1024 * 1024)
    throw new Error("Maximum statement size is 5 MB.");
  if (/\.csv$/i.test(file.name)) return parseCSV(await file.text());
  if (!/\.(xlsx|xls)$/i.test(file.name))
    throw new Error("Only CSV, XLSX and XLS statements are supported.");
  const buffer = Buffer.from(await file.arrayBuffer());
  validateWorkbookSize(buffer);
  const workbook = XLSX.read(buffer, { type: "buffer", sheetRows: 2002 });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return sheet ? convertRows(sheet) : [];
}
