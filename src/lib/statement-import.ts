import { randomUUID } from "node:crypto";
import { parseStatementFile } from "@/lib/statement-parser";
import { replaceTransactions } from "@/lib/storage";
export async function importStatement(file: File) {
  if (!/\.(csv|xlsx|xls)$/i.test(file.name))
    throw new Error(
      "Upload a CSV, XLSX, or XLS statement. PDF import is not supported.",
    );
  const parsed = await parseStatementFile(file);
  if (!parsed.length)
    throw new Error(
      "No valid transactions found. Include date, merchant or narration, and amount or debit/credit columns.",
    );
  return replaceTransactions(
    parsed.map((item) => ({
      id: randomUUID(),
      date: item.date,
      merchant: item.merchant.slice(0, 500),
      amount: item.amount,
      category: item.category ?? "Other",
      direction: item.direction,
      employee: "Imported Statement",
      department: "Unassigned",
    })),
  );
}
