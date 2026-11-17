// Supabase Edge Function: send-receipt
// Emails a payment receipt to the customer's registered email via Gmail SMTP.
//
// Setup (once):
//   supabase secrets set GMAIL_USER=yourbusiness@gmail.com GMAIL_APP_PASSWORD=xxxxxxxxxxxxxxxx
//   supabase functions deploy send-receipt
// GMAIL_APP_PASSWORD is a 16-character Google "App password" (Google Account >
// Security > 2-Step Verification > App passwords), not the normal Gmail password.
//
// Body: { payment_id: number }. The caller must be an admin or the customer who
// owns the reservation. The recipient is always the customer's account email,
// so this cannot be used to send mail to arbitrary addresses.

import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import nodemailer from 'npm:nodemailer@6.9.16';

const BUSINESS_NAME = "Natalie's Catering";
const BUSINESS_ADDRESS = '616, 617 Marinig, Cabuyao City, Laguna';
const BUSINESS_PHONE = '0917-888-0001';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  gcash: 'GCash',
  credit_card: 'Credit Card',
};
const TYPE_LABELS: Record<string, string> = {
  downpayment: 'Downpayment (50%)',
  full_payment: 'Full Payment',
  final_balance: 'Final Balance',
};
const STATUS_LABELS: Record<string, string> = {
  verified: 'PAID — VERIFIED',
  pending_verification: 'PENDING VERIFICATION',
  rejected: 'REJECTED',
};

// Receipt totals as of one payment. Same logic as src/lib/receiptMath.ts (keep in sync).
interface ReceiptPaymentLike {
  id: number;
  amount: number | string;
  status: string;
  paid_at?: string | null;
}
function madeBefore(a: ReceiptPaymentLike, b: ReceiptPaymentLike): boolean {
  const ta = a.paid_at ? new Date(a.paid_at).getTime() : NaN;
  const tb = b.paid_at ? new Date(b.paid_at).getTime() : NaN;
  if (!isNaN(ta) && !isNaN(tb) && ta !== tb) return ta < tb;
  return a.id < b.id;
}
function receiptSummary(payment: ReceiptPaymentLike, all: ReceiptPaymentLike[], contractTotal: number) {
  const total = Math.max(0, Number(contractTotal) || 0);
  const paidBefore = all
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function peso(n: number): string {
  return '₱' + Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function longDate(value?: string | null, withTime = false): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
}

function time12(t?: string | null): string {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const gmailUser = Deno.env.get('GMAIL_USER');
  const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD');
  if (!gmailUser || !gmailPass) {
    return json({ error: 'Email is not set up. Set GMAIL_USER and GMAIL_APP_PASSWORD secrets.' }, 500);
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });

  // Who is asking?
  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: authData, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !authData?.user) return json({ error: 'Not signed in.' }, 401);
  const callerId = authData.user.id;

  let paymentId: number;
  try {
    paymentId = Number((await req.json())?.payment_id);
  } catch {
    return json({ error: 'Invalid request body.' }, 400);
  }
  if (!Number.isInteger(paymentId) || paymentId <= 0) return json({ error: 'payment_id is required.' }, 400);

  const { data: payment, error: payErr } = await admin
    .from('payments')
    .select('*, reservation:reservations(*, package:packages(name), theme:event_themes(name), customer:profiles(name, phone))')
    .eq('id', paymentId)
    .single();
  if (payErr || !payment) return json({ error: 'Payment not found.' }, 404);

  const reservation = payment.reservation;
  if (!reservation) return json({ error: 'Reservation not found for this payment.' }, 404);

  const { data: callerProfile } = await admin.from('profiles').select('role').eq('id', callerId).single();
  const isAdmin = callerProfile?.role === 'admin' || callerProfile?.role === 'super_admin';
  if (!isAdmin && reservation.customer_id !== callerId) {
    return json({ error: 'You can only email receipts for your own reservations.' }, 403);
  }

  const { data: customerUser, error: userErr } = await admin.auth.admin.getUserById(reservation.customer_id);
  const to = customerUser?.user?.email;
  if (userErr || !to) return json({ error: 'The customer has no email address on file.' }, 422);

  const { data: allPayments } = await admin
    .from('payments')
    .select('id, amount, status, paid_at')
    .eq('reservation_id', reservation.id);
  // Totals as of THIS payment, so a resent older receipt doesn't include later payments.
  const summary = receiptSummary(payment, allPayments || [], Number(reservation.total_amount || 0));
  const counted = summary.thisCounted;
  const notCounted = payment.status === 'rejected' ? 'rejected, not counted' : 'pending verification, not counted yet';
  const receiptTitle = counted ? 'Official Receipt' : 'Payment Receipt';

  const receiptNo = `RCPT-${String(payment.id).padStart(6, '0')}`;
  const customerName = reservation.customer?.name || 'Customer';
  const statusLabel = STATUS_LABELS[payment.status] || payment.status;
  const statusColor = payment.status === 'verified' ? '#047857' : payment.status === 'rejected' ? '#b91c1c' : '#b45309';

  const row = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:6px 0;color:#6b6457">${label}</td><td style="padding:6px 0;text-align:right;${bold ? 'font-weight:700;color:#17140f' : 'color:#17140f'}">${value}</td></tr>`;

  const html = `<!doctype html><html><body style="margin:0;background:#faf8f4;font-family:Arial,Helvetica,sans-serif;color:#17140f">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px">
    <div style="background:#17140f;color:#faf8f4;padding:20px 24px;border-radius:12px 12px 0 0">
      <div style="font-family:Georgia,serif;font-size:22px;font-weight:bold">${esc(BUSINESS_NAME)}</div>
      <div style="font-size:12px;opacity:.75;margin-top:4px">${esc(BUSINESS_ADDRESS)} · ${esc(BUSINESS_PHONE)}</div>
    </div>
    <div style="background:#fff;border:1px solid #e8e2d6;border-top:0;padding:24px;border-radius:0 0 12px 12px">
      <p style="margin:0 0 4px;font-size:12px;color:#6b6457;text-transform:uppercase;letter-spacing:1px">${receiptTitle}</p>
      <p style="margin:0 0 16px;font-size:18px;font-weight:bold">${receiptNo}</p>
      <p style="display:inline-block;margin:0 0 20px;padding:4px 10px;border:2px solid ${statusColor};color:${statusColor};font-size:12px;font-weight:bold;border-radius:6px">${esc(statusLabel)}</p>
      <p style="margin:0 0 16px">Hi ${esc(customerName)}, thank you for your payment. Here is your receipt.</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${row('Booking Code', esc(reservation.booking_code), true)}
        ${row('Event Date', `${esc(longDate(reservation.event_date))} at ${esc(time12(reservation.event_time))}`)}
        ${row('Venue', esc(reservation.venue_address))}
        ${row('Package', esc(reservation.package?.name || '—'))}
        ${row('Theme', esc(reservation.theme?.name || '—'))}
        ${row('Guests', `${esc(reservation.guest_count)} pax`)}
      </table>
      <hr style="border:0;border-top:1px solid #e8e2d6;margin:16px 0">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${row('Payment Type', esc(TYPE_LABELS[payment.payment_type] || payment.payment_type))}
        ${row('Method', esc(METHOD_LABELS[payment.payment_method] || payment.payment_method))}
        ${row('Reference No.', esc(payment.reference_number || '—'))}
        ${row('Date Paid', esc(longDate(payment.paid_at, true)))}
        ${payment.verified_at ? row('Date Verified', esc(longDate(payment.verified_at, true))) : ''}
        ${row(counted ? 'Amount Received' : 'Amount Submitted', peso(summary.thisAmount), true)}
      </table>
      <hr style="border:0;border-top:1px solid #e8e2d6;margin:16px 0">
      <p style="margin:0 0 6px;font-size:11px;color:#6b6457;text-transform:uppercase;letter-spacing:1px">Booking balance as of this payment</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${row('Total Contract Value', peso(summary.contractTotal))}
        ${row('Less: Paid Before This Payment', '− ' + peso(summary.paidBefore))}
        ${row(counted ? 'Less: This Payment' : `This Payment (${notCounted})`, counted ? '− ' + peso(summary.thisAmount) : peso(0))}
        ${row(summary.balanceAfter === 0 && summary.contractTotal > 0 ? 'Remaining Balance (Fully Paid)' : 'Remaining Balance', peso(summary.balanceAfter), true)}
        ${summary.overpaid > 0 ? row('Overpayment (to be refunded or credited)', peso(summary.overpaid)) : ''}
      </table>
      <p style="margin:8px 0 0;font-size:11px;color:#8a8273">Amounts are as of ${esc(longDate(payment.paid_at))}. Payments made after this date have their own receipts.</p>
      <p style="margin:20px 0 0;font-size:12px;color:#6b6457">This is a system-generated receipt. For questions, reply to this email or call ${esc(BUSINESS_PHONE)}.</p>
    </div>
  </div></body></html>`;

  const text = [
    `${BUSINESS_NAME} — ${receiptTitle} ${receiptNo} (${statusLabel})`,
    `Booking: ${reservation.booking_code}`,
    `Event: ${longDate(reservation.event_date)} at ${time12(reservation.event_time)}, ${reservation.venue_address}`,
    `Amount paid: ${peso(Number(payment.amount))} via ${METHOD_LABELS[payment.payment_method] || payment.payment_method}`,
    `Reference: ${payment.reference_number || '—'}`,
    `As of this payment — Contract total: ${peso(summary.contractTotal)} · Paid before: ${peso(summary.paidBefore)} · ` +
      `This payment: ${peso(summary.thisAmount)}${counted ? '' : ` (${notCounted})`} · Remaining balance: ${peso(summary.balanceAfter)}`,
  ].join('\n');

  try {
    // Port 465 (SSL): Supabase Edge Functions block outbound 25 and 587.
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    });
    const info = await transporter.sendMail({
      from: `"${BUSINESS_NAME}" <${gmailUser}>`,
      to,
      replyTo: gmailUser,
      subject: `Your receipt ${receiptNo} for ${reservation.booking_code} — ${BUSINESS_NAME}`,
      text,
      html,
    });
    // Gmail can accept the connection but refuse the recipient; nodemailer only
    // throws when *every* recipient is refused, so check explicitly.
    const rejected = (info.rejected || []).map(String);
    console.log('Receipt email', { to, messageId: info.messageId, accepted: info.accepted, rejected, response: info.response });
    if (rejected.length > 0 || (info.accepted || []).length === 0) {
      return json({ error: `Gmail refused the address ${to}. Check the customer's email.` }, 502);
    }
    return json({
      sent: true,
      to,
      messageId: info.messageId,
      // Gmail files mail you send to your own address under Sent, not Inbox.
      selfSend: to.toLowerCase() === gmailUser.toLowerCase(),
    });
  } catch (err) {
    console.error('Gmail send failed:', err);
    return json({ error: 'Could not send the email. Check the Gmail app password.' }, 502);
  }
});
