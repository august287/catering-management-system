// Receipt totals as of one payment, so an old receipt never shows later payments.
// No imports, so the test runner can load this file.
// Keep in sync with receiptSummary() in supabase/functions/send-receipt/index.ts.

export interface ReceiptPaymentLike {
  id: number;
  amount: number | string;
  status: string;
  paid_at?: string | null;
}

export interface ReceiptSummary {
  contractTotal: number;
  /** Verified payments made before this one. */
  paidBefore: number;
  /** The amount on this receipt. */
  thisAmount: number;
  /** True if this payment counts toward the booking (it is verified). */
  thisCounted: boolean;
  /** paidBefore + this payment (if verified). */
  paidToDate: number;
  /** What is still owed after this payment. Never negative. */
  balanceAfter: number;
  /** Amount paid above the contract total, if any. */
  overpaid: number;
}

/** True if `a` was made before `b` (earlier paid date; same date → lower id). */
function madeBefore(a: ReceiptPaymentLike, b: ReceiptPaymentLike): boolean {
  const ta = a.paid_at ? new Date(a.paid_at).getTime() : NaN;
  const tb = b.paid_at ? new Date(b.paid_at).getTime() : NaN;
  if (!isNaN(ta) && !isNaN(tb) && ta !== tb) return ta < tb;
  return a.id < b.id;
}

export function receiptSummary(
  payment: ReceiptPaymentLike,
  reservationPayments: ReceiptPaymentLike[],
  contractTotal: number
): ReceiptSummary {
  const total = Math.max(0, Number(contractTotal) || 0);
  const paidBefore = reservationPayments
    .filter(p => p.id !== payment.id && p.status === 'verified' && madeBefore(p, payment))
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const thisAmount = Number(payment.amount) || 0;
  const thisCounted = payment.status === 'verified';
  const paidToDate = paidBefore + (thisCounted ? thisAmount : 0);
  return {
    contractTotal: total,
    paidBefore,
    thisAmount,
    thisCounted,
    paidToDate,
    balanceAfter: Math.max(0, total - paidToDate),
    overpaid: Math.max(0, paidToDate - total),
  };
}
