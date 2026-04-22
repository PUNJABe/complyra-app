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

function rowsToTransactions(rows: Record<string, unknown>[]): ParsedTransaction[] {
  return rows
    .map((row) => {
      const merchant =
        (row.merchant as string) ??
        (row.vendor as string) ??
        (row.description as string) ??
        (row.payee as string) ??
        "Unknown Merchant";
      const amount = parseAmount(
        row.amount ?? row.value ?? row.total ?? row.signedamount ?? row.debit ?? row.credit
      );

      if (!amount) return null;

      return {
        date: parseSheetDate(row.date ?? row.postingdate ?? row.transactiondate),
        merchant,
        amount,
        category: (row.category as string) ?? categorizeTransaction(merchant),
        description: (row.description as string) ?? undefined,
      } satisfies ParsedTransaction;
    })
    .filter((item): item is ParsedTransaction => item !== null);
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
        normalized[key.trim().toLowerCase()] = value;
      }
      return normalized;
    });

    return rowsToTransactions(normalizedRows);
  }

  const text = await file.text();
  return parseCSV(text);
}
