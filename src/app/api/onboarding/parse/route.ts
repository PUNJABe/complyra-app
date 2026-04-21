import { NextRequest, NextResponse } from "next/server";
import { parseStatementFile, analyzeTransactions } from "@/lib/statement-parser";
import { generateAIPolicy } from "@/lib/policy-generator";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }
    
    // Validate file type
    const validTypes = ["text/csv", "text/plain", "application/vnd.ms-excel"];
    if (!validTypes.includes(file.type) && !file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "Only CSV files are supported at this time" },
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
    
    // Generate AI policy suggestions
    const suggestedBudgets = generateAIPolicy(
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
