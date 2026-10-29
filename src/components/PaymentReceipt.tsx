import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { PAYMENT_METHOD_LABELS, PAYMENT_TYPE_LABELS } from '@/lib/paymentLabels';
import { Payment, Reservation } from '@/types/database';

const BUSINESS_NAME = "Natalie's Catering";
const BUSINESS_ADDRESS = '616, 617 Marinig, Cabuyao City, Laguna';
const BUSINESS_PHONE = '0917-888-0001';

function getReceiptNumber(payment: Payment): string {
  return `RCPT-${String(payment.id).padStart(6, '0')}`;
}

function getReceiptName(payment: Payment, customerName?: string | null): string {
  const customer = (customerName || 'Customer')
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return `${getReceiptNumber(payment)} - ${customer || 'Customer'}`;
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ReceiptDocument({
  payment,
  reservation,
  customerName,
  customerPhone,
  packageName,
  themeName,
  reservationPayments,
}: {
  payment: Payment;
  reservation?: Reservation | null;
  customerName: string;
  customerPhone?: string | null;
  packageName?: string | null;
  themeName?: string | null;
  reservationPayments?: Payment[];
}) {
  const verifiedTotal = (reservationPayments && reservationPayments.length > 0
    ? reservationPayments
    : payment.status === 'verified'
      ? [payment]
      : []
  )
    .filter(p => p.status === 'verified')
    .reduce((sum, p) => sum + p.amount, 0);

  const contractTotal = reservation?.total_amount ?? 0;
  const outstandingBalance = Math.max(0, contractTotal - verifiedTotal);
  const isVerified = payment.status === 'verified';

  const receiptNumber = getReceiptNumber(payment);
  const receiptName = getReceiptName(payment, customerName);
  const issuedAt = isVerified ? payment.verified_at || payment.paid_at : payment.paid_at;

  const status = {
    verified: {
      label: 'PAID — VERIFIED',
      className: 'border-emerald-600 text-emerald-700',
      note: 'This payment has been verified and credited to the reservation.',
    },
    pending_verification: {
      label: 'PENDING VERIFICATION',
      className: 'border-amber-500 text-amber-700',
      note: 'This payment is awaiting verification and is not yet credited to the reservation.',
    },
    rejected: {
      label: 'REJECTED — NOT CREDITED',
      className: 'border-red-500 text-red-700',
      note: 'This payment was rejected and is not credited to the reservation.',
    },
  }[payment.status];

  return (
    <div className="mx-auto w-full max-w-[760px] bg-white text-ink">
      <div className="flex flex-col gap-4 border-b-2 border-gold pb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex items-center gap-3">
          <img
            src="/images/natalielogo.jpg"
            alt={BUSINESS_NAME}
            className="h-14 w-14 rounded-md border border-border object-cover"
          />
          <div>
            <h1 className="font-serif text-2xl font-bold leading-tight text-ink">
              {BUSINESS_NAME}
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold-dark">
              Catering & Event Services
            </p>
            <p className="mt-1 text-[10px] text-text-muted">{BUSINESS_ADDRESS}</p>
            <p className="text-[10px] text-text-muted">Tel: {BUSINESS_PHONE}</p>
          </div>
        </div>

        <div className="sm:text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            {isVerified ? 'Official Receipt No.' : 'Acknowledgement No.'}
          </p>
          <p className="font-mono text-base font-bold text-ink">{receiptNumber}</p>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
            Date Issued
          </p>
          <p className="text-xs font-semibold text-ink">{formatDateTime(issuedAt)}</p>
          <span
            className={`mt-2 inline-block rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${status.className}`}
          >
            {status.label}
          </span>
        </div>
      </div>

      <h2 className="mt-5 text-center font-serif text-lg font-bold uppercase tracking-[0.25em] text-ink">
        {isVerified ? 'Official Receipt' : 'Payment Receipt'}
      </h2>
      <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-[0.15em] text-text-muted">
        {receiptName}
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded border border-border p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">
            Received from
          </p>
          <p className="mt-1 text-sm font-bold text-ink">{customerName || 'Customer'}</p>
          {customerPhone && <p className="text-xs text-text-muted">{customerPhone}</p>}
        </div>

        <div className="rounded border border-border p-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">
            Event Booking
          </p>
          <p className="mt-1 font-mono text-sm font-bold text-ink">
            {reservation?.booking_code || '—'}
          </p>
          {reservation && (
            <p className="text-xs text-text-muted">
              {formatDate(reservation.event_date)} at {formatTime(reservation.event_time)}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 rounded border border-border p-3 text-xs sm:grid-cols-2">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Venue</p>
          <p className="mt-0.5 font-medium text-text">{reservation?.venue_address || '—'}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Package</p>
            <p className="mt-0.5 font-medium text-text">{packageName || 'Catering Package'}</p>
          </div>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Theme</p>
            <p className="mt-0.5 font-medium text-text">{themeName || '—'}</p>
          </div>
          {reservation && (
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Guests</p>
              <p className="mt-0.5 font-medium text-text">{reservation.guest_count} pax</p>
            </div>
          )}
          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-text-muted">Method</p>
            <p className="mt-0.5 font-medium text-text">
              {PAYMENT_METHOD_LABELS[payment.payment_method]}
            </p>
          </div>
        </div>
      </div>

      <table className="mt-5 w-full border-collapse text-xs">
        <thead>
          <tr className="bg-cream-dark/60 text-left text-[9px] uppercase tracking-wider text-text-muted">
            <th className="border border-border px-3 py-2">Description</th>
            <th className="border border-border px-3 py-2">Reference No.</th>
            <th className="border border-border px-3 py-2">Payment Date</th>
            <th className="border border-border px-3 py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border border-border px-3 py-3">
              <p className="font-semibold text-ink">
                {PAYMENT_TYPE_LABELS[payment.payment_type]}
              </p>
              <p className="text-[10px] text-text-muted">Booking {reservation?.booking_code || '—'}</p>
            </td>
            <td className="border border-border px-3 py-3 font-mono">
              {payment.reference_number || '—'}
            </td>
            <td className="border border-border px-3 py-3">{formatDate(payment.paid_at)}</td>
            <td className="border border-border px-3 py-3 text-right font-bold text-ink">
              {formatCurrency(payment.amount)}
            </td>
          </tr>
        </tbody>
      </table>

      <div className="mt-4 ml-auto w-full max-w-xs space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-text-muted">Total Contract Value</span>
          <span className="font-semibold text-ink">{formatCurrency(contractTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Total Verified Payments</span>
          <span className="font-semibold text-emerald-700">{formatCurrency(verifiedTotal)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">Outstanding Balance</span>
          <span className="font-semibold text-ink">{formatCurrency(outstandingBalance)}</span>
        </div>
        <div className="flex items-center justify-between border-t-2 border-ink pt-2">
          <span className="font-bold uppercase tracking-wider text-ink">
            {isVerified ? 'Amount Received' : 'Amount Submitted'}
          </span>
          <span className="text-base font-bold text-gold-dark">
            {formatCurrency(payment.amount)}
          </span>
        </div>
      </div>

      <p
        className={`mt-4 rounded border px-3 py-2 text-[10px] leading-relaxed ${
          isVerified
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-amber-200 bg-amber-50 text-amber-800'
        }`}
      >
        {status.note}
      </p>

      <div className="mt-10 grid grid-cols-2 gap-6 sm:gap-16">
        <div className="text-center">
          <div className="h-10" />
          <div className="border-t border-ink pt-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Authorized Representative
          </div>
        </div>
        <div className="text-center">
          <div className="h-10" />
          <div className="border-t border-ink pt-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            Customer Signature
          </div>
        </div>
      </div>

      <p className="mt-8 border-t border-border pt-2 text-center text-[9px] leading-relaxed text-text-faint">
        This is a system-generated receipt from the {BUSINESS_NAME} Management System and is valid
        without a manual signature. Printed on {formatDateTime(new Date().toISOString())}.
      </p>
    </div>
  );
}

export interface PaymentReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: Payment | null;
  reservation?: Reservation | null;
  customerName: string;
  customerPhone?: string | null;
  packageName?: string | null;
  themeName?: string | null;
  reservationPayments?: Payment[];
}

export function PaymentReceiptDialog({
  open,
  onOpenChange,
  payment,
  reservation,
  customerName,
  customerPhone,
  packageName,
  themeName,
  reservationPayments,
}: PaymentReceiptDialogProps) {
  useEffect(() => {
    if (!open || !payment) return;
    document.body.classList.add('receipt-print-mode');
    const previousTitle = document.title;
    document.title = getReceiptName(payment, customerName);
    return () => {
      document.body.classList.remove('receipt-print-mode');
      document.title = previousTitle;
    };
  }, [open, payment, customerName]);

  if (!payment) return null;

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title={getReceiptName(payment, customerName)}
        description="Preview the receipt, then print it or save it as a PDF."
        className="max-w-3xl"
      >
        <div className="mb-4 flex flex-col-reverse gap-2 no-print sm:flex-row sm:items-center sm:justify-end">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button variant="gold" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" /> Print / Save as PDF
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-white p-3 sm:p-5">
          <ReceiptDocument
            payment={payment}
            reservation={reservation}
            customerName={customerName}
            customerPhone={customerPhone}
            packageName={packageName}
            themeName={themeName}
            reservationPayments={reservationPayments}
          />
        </div>
      </Dialog>

      {open &&
        createPortal(
          <div id="printable-receipt" className="hidden bg-white text-ink">
            <ReceiptDocument
              payment={payment}
              reservation={reservation}
              customerName={customerName}
              customerPhone={customerPhone}
              packageName={packageName}
              themeName={themeName}
              reservationPayments={reservationPayments}
            />
          </div>,
          document.body
        )}
    </>
  );
}

export default PaymentReceiptDialog;
