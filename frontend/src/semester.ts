import type { PtptnDisbursement } from "./types";

/** A semester is assumed to run 3 months from the disbursement date. */
export function semesterEndDate(disbursementDateStr: string): Date {
  const d = new Date(`${disbursementDateStr}T00:00:00`);
  d.setMonth(d.getMonth() + 3);
  return d;
}

export function daysRemainingLabel(endDate: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? `${diffDays} day${diffDays === 1 ? "" : "s"}` : "Semester ended";
}

export function shortfallFor(disbursement: PtptnDisbursement): number {
  const shortfall =
    parseFloat(disbursement.total_semester_tuition) - parseFloat(disbursement.amount);
  return shortfall > 0 ? shortfall : 0;
}

/** The disbursement with the most recent disbursement_date, or undefined if there are none. */
export function latestDisbursement(records: PtptnDisbursement[]): PtptnDisbursement | undefined {
  return [...records].sort((a, b) => (a.disbursement_date < b.disbursement_date ? 1 : -1))[0];
}