import { NextRequest, NextResponse } from "next/server";
import { parseStatementFile, analyzeTransactions } from "@/lib/statement-parser";
import { generateAIPolicy } from "@/lib/policy-generator";
import { replaceTransactions, setWorkspaceMode } from "@/lib/storage";
import type { StoredTransaction } from "@/lib/storage";
import type { WorkspaceMode } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const modeValue = formData.get("mode");
    const mode = modeValue === "personal" || modeValue === "business" ? (modeValue as WorkspaceMode) : null;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }
    
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".csv") && !fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      return NextResponse.json(
        { error: "Only CSV, XLSX, or XLS files are supported at this time" },
        { status: 400 }
      );
    }
    
    // Parse the file
    const transactions = await parseStatementFile(file);
    
    if (transactions.length === 0) {
      return NextResponse.json(
        { error: "No transactions found in file. Ensure CSV has date, merchant, amount columns." },
        { status: 400 }
      );
    }
    
    // Analyze transactions
    const analysis = analyzeTransactions(transactions);

    const storedTransactions: StoredTransaction[] = transactions.map((transaction, index) => ({
      id: `${Date.now()}-${index}`,
      date: transaction.date,
      merchant: transaction.merchant,
      amount: transaction.amount,
      employee: "Imported Statement",
      department: mode === "personal" ? "Personal" : "Unassigned",
      category: transaction.category ?? "General",
    }));

    await replaceTransactions(storedTransactions);

    if (mode) {
      await setWorkspaceMode(mode);
    }
    
    // Generate AI policy suggestions
    const suggestedBudgets = await generateAIPolicy(
      analysis.categoryBreakdown,
      analysis.totalTransactions
    );
    
    return NextResponse.json({
      success: true,
      analysis: {
        totalTransactions: analysis.totalTransactions,
        dateRange: analysis.dateRange,
        averageTransaction: Math.round(analysis.averageTransactionValue),
        categoryBreakdown: Object.entries(analysis.categoryBreakdown)
          .map(([cat, amount]) => ({
            category: cat,
            total: Math.round(amount),
            percentage: Math.round((amount / Object.values(analysis.categoryBreakdown).reduce((a, b) => a + b, 0)) * 100),
          }))
          .sort((a, b) => b.total - a.total),
      },
      suggestedBudgets: suggestedBudgets.map((b) => ({
        category: b.category,
        suggestedMonthly: b.monthlyLimit,
        baseAverage: Math.round(b.baseAmount),
      })),
    });
  } catch (error) {
    console.error("Statement parsing error:", error);
    return NextResponse.json(
      { error: "Failed to parse statement. Please check file format." },
      { status: 500 }
    );
  }
}
