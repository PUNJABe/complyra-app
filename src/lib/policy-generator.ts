/**
 * Policy Generator
 * Generates budget policies based on transaction analysis
 */

import { generateOpenAIJSON } from "@/lib/openai";

export interface BudgetPolicy {
  category: string;
  monthlyLimit: number;
  baseAmount: number; // Average from transactions
  confidence: number; // 0-1 how confident we are in this
}

export interface CompliancePolicy {
  id?: string;
  userId?: string;
  mode: "ai_auto" | "manual" | "hybrid";
  budgets: BudgetPolicy[];
  totalMonthlyBudget: number;
  savingsTarget: number;
  createdAt?: string;
  status: "draft" | "approved" | "active";
}

/**
 * Generate AI policy from transaction analysis
 */
function fallbackPolicy(
  categoryBreakdown: Record<string, number>,
  totalTransactions: number
): BudgetPolicy[] {
  // Estimate monthly average (assuming data represents recent activity)
  const estimatedMonths = Math.max(1, Math.ceil(totalTransactions / 30));
  
  const budgets: BudgetPolicy[] = [];
  
  // Standard categories with priority
  const standardCategories = [
    "Food",
    "Travel",
    "Subscriptions",
    "Utilities",
    "Shopping",
    "Fuel",
    "Rent",
    "Other",
  ];
  
  for (const category of standardCategories) {
    const amount = categoryBreakdown[category] || 0;
    
    if (amount > 0) {
      // Monthly average
      const monthlyAvg = amount / estimatedMonths;
      
      // Suggested limit = average + 10% buffer for flexibility
      const suggestedLimit = Math.round(monthlyAvg * 1.1);
      
      budgets.push({
        category,
        monthlyLimit: suggestedLimit,
        baseAmount: monthlyAvg,
        confidence: amount > 0 ? 0.85 : 0, // High confidence if we have data
      });
    }
  }
  
  // Add any unknown categories
  for (const [cat, amount] of Object.entries(categoryBreakdown)) {
    if (!standardCategories.includes(cat) && amount > 0) {
      const monthlyAvg = amount / estimatedMonths;
      budgets.push({
        category: cat,
        monthlyLimit: Math.round(monthlyAvg * 1.1),
        baseAmount: monthlyAvg,
        confidence: 0.7,
      });
    }
  }
  
  return budgets.sort((a, b) => b.monthlyLimit - a.monthlyLimit);
}

function formatBreakdown(categoryBreakdown: Record<string, number>) {
  const entries = Object.entries(categoryBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => `${category}: ₹${Math.round(amount).toLocaleString("en-IN")}`);

  return entries.length ? entries.join("; ") : "No spend categories found.";
}

export async function generateAIPolicy(
  categoryBreakdown: Record<string, number>,
  totalTransactions: number
): Promise<BudgetPolicy[]> {
  const fallback = fallbackPolicy(categoryBreakdown, totalTransactions);

  const aiBudgets = await generateOpenAIJSON<{ budgets: BudgetPolicy[] }>({
    system:
      "You generate concise budget policy suggestions from transaction category totals. Return only valid JSON.",
    user:
      `Create budget suggestions for these categories. Use the spend mix to set monthly limits with a modest buffer. ` +
      `Return JSON with this exact shape: {\"budgets\":[{\"category\":string,\"monthlyLimit\":number,\"baseAmount\":number,\"confidence\":number}]}. ` +
      `Categories: ${formatBreakdown(categoryBreakdown)}. Total transactions: ${totalTransactions}. ` +
      `Keep the list to the categories present in the data and sort by monthlyLimit descending.`,
    fallback: { budgets: fallback },
    temperature: 0.2,
    maxTokens: 700,
  });

  const budgets = aiBudgets.budgets
    .filter((budget) => budget.category && Number.isFinite(budget.monthlyLimit) && Number.isFinite(budget.baseAmount))
    .map((budget) => ({
      category: budget.category,
      monthlyLimit: Math.max(0, Math.round(budget.monthlyLimit)),
      baseAmount: Math.max(0, Math.round(budget.baseAmount)),
      confidence: typeof budget.confidence === "number" ? Math.min(1, Math.max(0, budget.confidence)) : 0.8,
    }))
    .sort((a, b) => b.monthlyLimit - a.monthlyLimit);

  return budgets.length ? budgets : fallback;
}

/**
 * Create a complete policy object
 */
export function createPolicy(
  budgets: BudgetPolicy[],
  mode: "ai_auto" | "manual" | "hybrid" = "ai_auto",
  savingsTarget: number = 0
): CompliancePolicy {
  const totalMonthlyBudget = budgets.reduce(
    (sum, b) => sum + b.monthlyLimit,
    0
  );
  
  return {
    mode,
    budgets,
    totalMonthlyBudget,
    savingsTarget,
    status: "draft",
    createdAt: new Date().toISOString(),
  };
}

/**
 * Generate suggested budgets with explanations
 */
export function generateWithExplanations(
  categoryBreakdown: Record<string, number>
): Promise<Array<{ category: string; suggested: number; reason: string }>> {
  return generateAIPolicy(categoryBreakdown, 30).then((estimated) =>
    estimated.map((budget) => ({
      category: budget.category,
      suggested: budget.monthlyLimit,
      reason: `Based on your average spending of ₹${Math.round(budget.baseAmount)}/month`,
    }))
  );
}

/**
 * Calculate monthly total and savings projection
 */
export function calculateTotals(
  policy: CompliancePolicy,
  monthlyIncome: number
) {
  const totalSpend = policy.totalMonthlyBudget;
  const remaining = monthlyIncome - totalSpend;
  
  return {
    income: monthlyIncome,
    totalSpend,
    remaining,
    savingsTarget: policy.savingsTarget,
    achievable: remaining >= policy.savingsTarget,
  };
}
