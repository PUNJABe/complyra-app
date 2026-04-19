"use client";

/**
 * Checks if a string is a formatted money value (contains $ or ₹)
 */
export function isMoneyValue(value: string): boolean {
  if (!value) return false;
  return /[\$₹]/.test(value);
}

/**
 * Extracts numeric value from formatted money strings like "-$9,840" or "-₹9,840"
 * Returns 0 if the string is not a money value
 */
export function extractMoneyValue(formattedString: string): number {
  if (!formattedString || !isMoneyValue(formattedString)) return 0;
  
  // Remove currency symbols and commas, handle negative signs
  const cleaned = formattedString
    .replace(/[\$₹]/g, "")
    .replace(/,/g, "")
    .trim();
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}
