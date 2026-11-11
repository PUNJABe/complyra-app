import * as XLSX from "xlsx";
import { PDFParse } from "pdf-parse";
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
function convertTransactionRows(
  rows: Array<Record<string, unknown>>,
): ParsedTransaction[] {
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
function convertRows(sheet: XLSX.WorkSheet): ParsedTransaction[] {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });
  return convertTransactionRows(rows);
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
function parsePdfText(textContent: string): ParsedTransaction[] {
  const lines = textContent
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/\s*(?:--\s*)?(?:page\s+)?\d+\s+of\s+\d+(?:\s*--)?\s*$/i, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
  const header = lines
    .filter((line) => /debit|withdrawal|credit|deposit|balance/i.test(line))
    .join(" ")
    .toLowerCase();
  const hasBalanceColumn = /\bbalance\b/.test(header);
  const hasDebitCreditColumns =
    /(debit|withdrawal)/.test(header) && /(credit|deposit)/.test(header);
  const requiresValueDate = /\bval(?:ue)?\s*dt\b/.test(header);
  const rows: Array<Record<string, unknown>> = [];
  const dateToken =
    /\b(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/g;
  const startDate =
    /^\s*(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/;
  const amountPattern =
    /(?<![\d/])(?:₹\s*|Rs\.?\s*)?(-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?)(?:\s*(CR|DR))?(?![\d/])/gi;
  const groupedLines: string[] = [];
  const pageHeader =
    /^(?:page\s+no\.?|statement of account|statement from\b|date\s+narration|account (?:branch|no|number|type)|address\b|city\b|state\b|phone no\b|email id\b|customer id\b|nomination\b|joint holders\b|branch code\b|rtgs\/neft)/i;
  let skippingPageHeader = false;
  for (const line of lines) {
    if (/^(?:page\s+no\.?|statement of account)\b/i.test(line)) {
      skippingPageHeader = true;
      continue;
    }
    if (/^date\s+narration\b/i.test(line)) {
      skippingPageHeader = false;
      continue;
    }
    const startsWithDate = startDate.test(line);
    if (startsWithDate) skippingPageHeader = false;
    if (skippingPageHeader || pageHeader.test(line)) continue;
    const currentIndex = groupedLines.length - 1;
    const current = groupedLines[currentIndex];
    const dateContinuation =
      startsWithDate &&
      requiresValueDate &&
      current &&
      [...current.matchAll(dateToken)].length === 1 &&
      /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s+(?:₹\s*)?[\d,.-]+(?:\s+(?:₹\s*)?[\d,.-]+)*$/.test(
        line,
      );
    if (startsWithDate && !dateContinuation) {
      groupedLines.push(line);
    } else if (groupedLines.length) {
      groupedLines[groupedLines.length - 1] += `\n${line}`;
    }
  }
  let previousBalance: number | null = null;

  for (const line of groupedLines) {
    const dates = [...line.matchAll(dateToken)];
    const firstDate = dates[0];
    if (!firstDate) continue;
    if (requiresValueDate && !dates[1]) continue;
    const date = firstDate[1];
    const parsedDate = parsePdfDate(date);
    if (!parsedDate) continue;
    const valueDate = dates[1];
    const contentStart = firstDate.index! + firstDate[0].length;
    let description = line
      .slice(contentStart, valueDate?.index ?? line.length)
      .replace(/\b\d{10,}\s*$/, "")
      .trim();
    const amountsStart = valueDate
      ? valueDate.index! + valueDate[0].length
      : contentStart;
    const lineEnd = line.indexOf("\n", amountsStart);
    const content = line.slice(
      amountsStart,
      lineEnd === -1 ? line.length : lineEnd,
    );
    const matches = [...content.matchAll(amountPattern)];
    if (!matches.length) continue;

    const numericMatches = matches
      .map((match) => ({
        match,
        value: Number(match[1].replace(/,/g, "")),
        direction: match[2]?.toUpperCase(),
        raw: match[1],
      }))
      .filter(
        (item) =>
          Number.isFinite(item.value) &&
          Math.abs(item.value) <= 1e12 &&
          (/[.,]/.test(item.raw) || item.raw.length < 10),
      );
    if (!numericMatches.length) continue;

    let transactionAmounts: typeof numericMatches;
    const hasTwoAmountColumns =
      hasDebitCreditColumns && numericMatches.length >= 3;
    const closingBalance =
      hasBalanceColumn && numericMatches.length >= 2
        ? numericMatches[hasTwoAmountColumns ? 2 : 1]?.value
        : undefined;
    if (hasBalanceColumn && numericMatches.length >= 2) {
      transactionAmounts = numericMatches.slice(0, hasTwoAmountColumns ? 2 : 1);
    } else if (hasDebitCreditColumns && numericMatches.length >= 2) {
      transactionAmounts = numericMatches.slice(-2);
    } else {
      transactionAmounts = numericMatches.slice(-1);
    }

    const selected = transactionAmounts.find((item) => item.value !== 0);
    if (!selected) continue;
    if (!valueDate) {
      const firstAmountIndex = transactionAmounts[0]?.match.index;
      if (firstAmountIndex !== undefined)
        description = line
          .slice(contentStart, contentStart + firstAmountIndex)
          .replace(/\b\d{10,}\s*$/, "")
          .trim();
    }
    if (
      !description ||
      /^(opening|closing)\s+balance/i.test(description)
    )
      continue;
    const directionFromColumns =
      transactionAmounts.length > 1 &&
      selected === transactionAmounts[1] &&
      transactionAmounts[0].value === 0;
    const directionFromBalance =
      closingBalance !== undefined &&
      previousBalance !== null &&
      Math.abs(closingBalance - previousBalance) >= 0.005
        ? closingBalance > previousBalance
        : undefined;
    const isCredit =
      selected.value < 0 ||
      selected.direction === "CR" ||
      directionFromColumns ||
      directionFromBalance === true ||
      (directionFromBalance === undefined &&
        /\b(credit|deposit|salary|refund|received|payment from|transfer from)\b/i.test(
          line.slice(contentStart),
        ));
    rows.push({
      date: parsedDate,
      merchant: description,
      debit: isCredit ? "" : Math.abs(selected.value),
      credit: isCredit ? Math.abs(selected.value) : "",
    });
    if (closingBalance !== undefined) previousBalance = closingBalance;
  }

  if (!rows.length) {
    throw new Error(
      "No readable statement transactions were found. Use a text-based PDF with dates, descriptions, and debit/credit amounts; scanned PDFs need OCR.",
    );
  }
  return convertTransactionRows(rows);
}

function parsePdfDate(value: string) {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  const local = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(value);
  const shortYear = local && local[3].length === 2 ? Number(local[3]) : null;
  const year = iso
    ? Number(iso[1])
    : local
      ? shortYear === null
        ? Number(local[3])
        : shortYear <= 69
          ? 2000 + shortYear
          : 1900 + shortYear
      : NaN;
  const month = iso ? Number(iso[2]) : local ? Number(local[2]) : NaN;
  const day = iso ? Number(iso[3]) : local ? Number(local[1]) : NaN;
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  )
    return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return date.toISOString().slice(0, 10);
}

async function parsePDF(buffer: Buffer): Promise<ParsedTransaction[]> {
  if (buffer.subarray(0, 5).toString("ascii") !== "%PDF-")
    throw new Error("This file is not a valid PDF.");

  const parser = new PDFParse({ data: new Uint8Array(buffer), verbosity: 0 });
  try {
    const textResult = await parser.getText();
    let textParseError: Error | null = null;
    try {
      return parsePdfText(textResult.text);
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !/No readable statement transactions were found/.test(error.message)
      )
        throw error;
      textParseError = error;
    }

    const tables = await parser.getTable();
    for (const table of [
      ...tables.mergedTables,
      ...tables.pages.flatMap((page) => page.tables),
    ]) {
      for (let headerIndex = 0; headerIndex < Math.min(table.length, 5); headerIndex++) {
        const header = table[headerIndex]
          .join(" ")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "");
        if (
          !header.includes("date") ||
          !/(amount|debit|credit|withdrawal|deposit)/.test(header)
        )
          continue;
        const parsed = convertRows(
          XLSX.utils.aoa_to_sheet(table.slice(headerIndex)),
        );
        if (parsed.length) return parsed;
      }
    }
    throw textParseError;
  } catch (error) {
    if (error instanceof Error && /password/i.test(error.message))
      throw new Error("Password-protected PDFs are not supported.");
    throw error;
  } finally {
    await parser.destroy();
  }
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
  if (/\.pdf$/i.test(file.name))
    return parsePDF(Buffer.from(await file.arrayBuffer()));
  if (!/\.(xlsx|xls)$/i.test(file.name))
    throw new Error("Only CSV, XLSX and XLS statements are supported.");
  const buffer = Buffer.from(await file.arrayBuffer());
  validateWorkbookSize(buffer);
  const workbook = XLSX.read(buffer, { type: "buffer", sheetRows: 2002 });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return sheet ? convertRows(sheet) : [];
}
