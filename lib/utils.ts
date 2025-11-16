import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format price as cents (Polymarket style)
 * Per Polymarket docs: Prices are displayed as cents (0-100 range)
 * Example: 0.985 → "98.5¢"
 */
export function formatPriceAsCents(price: number, decimals: number = 1): string {
  const cents = price * 100;
  return `${cents.toFixed(decimals)}¢`;
}

/**
 * Format price for Polymarket display
 * Shows as cents if < $1, otherwise as dollars
 */
export function formatPolymarketPrice(price: number): string {
  if (price < 1) {
    return formatPriceAsCents(price);
  }
  return formatCurrency(price);
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function calculateImpliedOdds(price: number): number {
  return price * 100;
}

export function calculatePotentialProfit(shares: number, price: number): number {
  const cost = shares * price;
  const payout = shares * 1.0;
  return payout - cost;
}

export function calculateCost(shares: number, price: number): number {
  return shares * price;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
