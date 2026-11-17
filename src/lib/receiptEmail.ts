import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Name of the deployed Edge Function holding supabase/functions/send-receipt/index.ts.
// It was deployed from the Supabase dashboard, which named it "swift-api".
export const RECEIPT_FUNCTION_NAME = 'swift-api';

/**
 * Email a payment receipt to the customer's registered address (Gmail SMTP via
 * the `send-receipt` Supabase Edge Function). Returns the address it was sent to.
 */
export interface ReceiptEmailResult {
  to: string;
  /** The recipient is the business Gmail itself (Gmail shows it under Sent, not Inbox). */
  selfSend: boolean;
  /** Address looks like a placeholder/test domain that can't receive mail. */
  likelyUndeliverable: boolean;
}

// Seed/test domains that accept no real mail (e.g. the demo customer@test.ph).
const PLACEHOLDER_EMAIL = /@(?:[^@]*\.)?(test\.ph|test|example\.(com|org|net)|example|invalid|localhost)$/i;

/** One-line explanation for the admin toast. */
export function receiptEmailNotice(r: ReceiptEmailResult): string {
  if (r.likelyUndeliverable) {
    return `Gmail accepted it for ${r.to}, but that looks like a test address that can't receive mail. It will bounce. Update the customer's email to a real one.`;
  }
  if (r.selfSend) {
    return `Sent to ${r.to}, the business Gmail itself. Gmail files this under "Sent", not Inbox.`;
  }
  return `Gmail accepted it for ${r.to}. If the customer can't find it, ask them to check Spam or Promotions.`;
}

export async function emailReceipt(paymentId: number): Promise<ReceiptEmailResult> {
  if (!isSupabaseConfigured()) {
    throw new Error('Email receipts need the live Supabase backend; they are not sent in offline demo mode.');
  }
  const { data, error } = await supabase.functions.invoke(RECEIPT_FUNCTION_NAME, {
    body: { payment_id: paymentId },
  });
  if (error) {
    // The function's own JSON error message is more useful than the generic one.
    let message = error.message;
    try {
      const body = await (error as { context?: Response }).context?.json();
      if (body?.error) message = body.error;
    } catch {
      /* keep generic message */
    }
    throw new Error(message || 'Could not send the receipt email.');
  }
  if (!data?.sent) throw new Error(data?.error || 'Could not send the receipt email.');
  const to = String(data.to || '');
  return { to, selfSend: !!data.selfSend, likelyUndeliverable: PLACEHOLDER_EMAIL.test(to) };
}
