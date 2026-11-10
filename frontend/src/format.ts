import type { DecimalString } from "./types";

/** "RM 12.50" */
export function formatCurrency(value: DecimalString | number): string {
  return `RM ${parseFloat(String(value)).toFixed(2)}`;
}

/** "12.50" (no currency prefix) */
export function formatAmount(value: DecimalString | number): string {
  return Number(value).toFixed(2);
}

export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** "9 Nov 2026" in the en-MY locale. */
export function formatDisplayDate(value: string): string {
  return new Date(value).toLocaleDateString("en-MY", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;