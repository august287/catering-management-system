import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Name of the deployed Edge Function holding supabase/functions/send-receipt/index.ts.
// It was deployed from the Supabase dashboard, which named it "swift-api".
export const RECEIPT_FUNCTION_NAME = 'swift-api';

/**
 * Email a payment receipt to the customer's registered address (Gmail SMTP via
 * the `send-receipt` Supabase Edge Function). Returns the address it was sent to.
 */
export async function emailReceipt(paymentId: number): Promise<string> {
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
  return data.to as string;
}
