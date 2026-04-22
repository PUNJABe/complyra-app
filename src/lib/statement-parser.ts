import * as XLSX from "xlsx";

/**
 * Statement Parser
 * Parses bank statements, credit card statements, and expense records
 * Extracts transactions with merchant, category, amount, and date
 */

export interface ParsedTransaction {
  merchant: string;
  amount: number;
  date: string;
  category?: string;
  description?: string;
}

export interface StatementAnalysis {
  transactions: ParsedTransaction[];
  categoryBreakdown: Record<string, number>;
  totalTransactions: number;
  dateRange: {
    earliest: string;
    latest: string;
  };
  averageTransactionValue: number;
}

// Merchant → Category mapping
const MERCHANT_CATEGORY_MAP: Record<string, string> = {
  // Food
  swiggy: "Food",
  zomato: "Food",
  dunkindonuts: "Food",
  starbucks: "Food",
  mcdonalds: "Food",
  subway: "Food",
  pizzahut: "Food",
  "kfc": "Food",
  restaurant: "Food",
  cafe: "Food",
  
  // Travel
  uber: "Travel",
  ola: "Travel",
  airbnb: "Travel",
  booking: "Travel",
  makemytrip: "Travel",
  indigo: "Travel",
  spicejet: "Travel",
  vistara: "Travel",
  airline: "Travel",
  taxi: "Travel",
  
  // Subscriptions
  netflix: "Subscriptions",
  prime: "Subscriptions",
  spotify: "Subscriptions",
  adobe: "Subscriptions",
  microsoft: "Subscriptions",
  slack: "Subscriptions",
  figma: "Subscriptions",
  subscription: "Subscriptions",
  
  // Utilities
  electricity: "Utilities",
  water: "Utilities",
  broadband: "Utilities",
  internet: "Utilities",
  mobile: "Utilities",
  phone: "Utilities",
  
  // Shopping
  amazon: "Shopping",
  flipkart: "Shopping",
  myntra: "Shopping",
  ajio: "Shopping",
  uniqlo: "Shopping",
  "h&m": "Shopping",
  "zara": "Shopping",
  mall: "Shopping",
  shopping: "Shopping",
  
  // Fuel
  petrol: "Fuel",
  diesel: "Fuel",
  shell: "Fuel",
  bp: "Fuel",
  "indian oil": "Fuel",
  gas: "Fuel",
  
  // Rent/Housing (detected from description patterns)
  rent: "Rent",
  landlord: "Rent",
  
  // Savings/Transfers (to skip or categorize separately)
  transfer: "Transfer",
  deposit: "Transfer",
};

/**
 * Categorize a transaction based on merchant name
 */
function categorizeTransaction(merchant: string): string {
  const normalized = merchant.toLowerCase().trim();
  
  // Exact match first
  if (MERCHANT_CATEGORY_MAP[normalized]) {
    return MERCHANT_CATEGORY_MAP[normalized];
  }
  
  // Partial match
  for (const [key, category] of Object.entries(MERCHANT_CATEGORY_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return category;
    }
  }
  
  // Default to "Other"
  return "Other";
}

function parseAmount(value: unknown): number {
  if (typeof value === "number") return Math.abs(value);
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/[₹$,\s]/g, ""));
    return Number.isFinite(parsed) ? Math.abs(parsed) : 0;
  }
  return 0;
}

function parseSheetDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString().slice(0, 10);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)).toISOString().slice(0, 10);
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

function normalizeHeaderKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getFirstStringValue(row: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return undefined;
}

function getFirstValue(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}

function rowsToTransactions(rows: Record<string, unknown>[]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  for (const row of rows) {
    const merchant =
      getFirstStringValue(row, [
        "merchant",
        "vendor",
        "description",
        "payee",
        "narration",
        "particulars",
        "remarks",
        "details",
        "beneficiary",
      ]) ?? "Unknown Merchant";

    const debitAmount = parseAmount(
      getFirstValue(row, ["debit", "withdrawalamt", "withdrawal", "dr"])
    );
    const creditAmount = parseAmount(
      getFirstValue(row, ["credit", "depositamt", "deposit", "cr"])
    );

    const amount = parseAmount(
      getFirstValue(row, ["amount", "value", "total", "signedamount", "txnamount"])
    );

    const resolvedAmount = amount || debitAmount || creditAmount;

    if (!resolvedAmount) continue;

    transactions.push({
      date: parseSheetDate(
        getFirstValue(row, [
          "date",
          "transactiondate",
          "txndate",
          "postingdate",
          "valuedate",
          "transdate",
        ])
      ),
      merchant,
      amount: resolvedAmount,
      category: getFirstStringValue(row, ["category"]) ?? categorizeTransaction(merchant),
      description: getFirstStringValue(row, ["description", "narration", "particulars", "remarks"]),
    });
  }

  return transactions;
}

/**
 * Parse CSV data (expects columns: date, merchant, amount)
 */
export function parseCSV(csvText: string): ParsedTransaction[] {
  const lines = csvText.trim().split("\n");
  const transactions: ParsedTransaction[] = [];
  
  // Skip header if it looks like one
  const startIndex = lines[0].toLowerCase().includes("date") ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 3) continue;
    
    const [date, merchant, amountStr] = parts;
    const amount = parseFloat(amountStr.replace(/[₹$,]/g, ""));
    
    if (!isNaN(amount) && merchant && date) {
      transactions.push({
        date,
        merchant,
        amount: Math.abs(amount),
        category: categorizeTransaction(merchant),
      });
    }
  }
  
  return transactions;
}

/**
 * Analyze parsed transactions for insights
 */
export function analyzeTransactions(
  transactions: ParsedTransaction[]
): StatementAnalysis {
  const categoryBreakdown: Record<string, number> = {};
  let totalAmount = 0;
  
  for (const tx of transactions) {
    const cat = tx.category || "Other";
    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + tx.amount;
    totalAmount += tx.amount;
  }
  
  // Sort transactions by date
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  return {
    transactions,
    categoryBreakdown,
    totalTransactions: transactions.length,
    dateRange: {
      earliest: sorted[0]?.date || "",
      latest: sorted[sorted.length - 1]?.date || "",
    },
    averageTransactionValue: totalAmount / transactions.length,
  };
}

/**
 * Parse file based on type
 */
export async function parseStatementFile(
  file: File
): Promise<ParsedTransaction[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) return [];

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });

    const normalizedRows = rows.map((row) => {
      const normalized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        normalized[normalizeHeaderKey(key)] = value;
      }
      return normalized;
    });

    return rowsToTransactions(normalizedRows);
  }

  const text = await file.text();
  try {
    const workbook = XLSX.read(text, { type: "string" });
    const sheetName = workbook.SheetNames[0];

    if (sheetName) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: false,
      });

      const normalizedRows = rows.map((row) => {
        const normalized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(row)) {
          normalized[normalizeHeaderKey(key)] = value;
        }
        return normalized;
      });

      const parsed = rowsToTransactions(normalizedRows);
      if (parsed.length > 0) return parsed;
    }
  } catch {
    // Fall back to legacy CSV parser below.
  }

  return parseCSV(text);
}
