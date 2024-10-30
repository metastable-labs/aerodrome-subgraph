import { formatUnits } from "viem";

export const ZERO_BI = 0n;
export const ONE_BI = 1n;

export function formatWithDecimals(amount: bigint, decimals: number): string {
  if (!amount) return "0";
  return formatUnits(amount, decimals);
}

export function calculateRatio(
  baseAmount: bigint,
  baseDecimals: number,
  quoteAmount: bigint,
  quoteDecimals: number
): string {
  if (!quoteAmount) return "0";
  
  // Normalize both amounts to 18 decimals for comparison
  const normalizedBase = baseAmount * BigInt(10 ** (18 - baseDecimals));
  const normalizedQuote = quoteAmount * BigInt(10 ** (18 - quoteDecimals));
  
  if (normalizedQuote === ZERO_BI) return "0";
  
  // Calculate ratio and format to 18 decimals
  return formatUnits(normalizedBase * BigInt(1e18) / normalizedQuote, 18);
}