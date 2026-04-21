/**
 * Policy Generator
 * Generates budget policies based on transaction analysis
 */

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
export function generateAIPolicy(
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
): Array<{ category: string; suggested: number; reason: string }> {
  const estimated = generateAIPolicy(categoryBreakdown, 30);
  
  return estimated.map((budget) => ({
    category: budget.category,
    suggested: budget.monthlyLimit,
    reason: `Based on your average spending of ₹${Math.round(budget.baseAmount)}/month`,
  }));
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
