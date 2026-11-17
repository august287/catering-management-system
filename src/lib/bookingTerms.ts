/**
 * Booking pricing extras, payment schedule and contract terms.
 * One place for the numbers the customer sees on the running invoice, the
 * contract, and the admin payment checks, so they always agree.
 */
import type { Payment, PaymentType, Reservation } from '@/types/database';

// --- Hours of service -------------------------------------------------------

/** Hours of buffet service included in every package. */
export const INCLUDED_SERVICE_HOURS = 4;
/** Longest service a booking can request. */
export const MAX_SERVICE_HOURS = 10;
/** Charge for each hour beyond the included hours. */
export const EXTRA_HOUR_RATE = 1500;

export const SERVICE_HOUR_OPTIONS = Array.from(
  { length: MAX_SERVICE_HOURS - INCLUDED_SERVICE_HOURS + 1 },
  (_, i) => INCLUDED_SERVICE_HOURS + i
);

export function extraHoursCost(hours: number): number {
  return Math.max(0, hours - INCLUDED_SERVICE_HOURS) * EXTRA_HOUR_RATE;
}

/** "16:00" + 5 hours → "21:00" (wraps past midnight). */
export function serviceEndTime(start: string, hours: number): string {
  const [h, m] = start.split(':').map(n => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return start;
  const total = (h * 60 + m + hours * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// --- Servers (waitstaff) ----------------------------------------------------

/** One server is included for every this many guests. */
export const GUESTS_PER_SERVER = 15;
/** Most servers a single event can book. */
export const MAX_SERVERS = 30;
/** Charge per additional server for the whole event. */
export const EXTRA_SERVER_RATE = 800;

/** Servers included in the package for this many guests. */
export function includedServers(guests: number): number {
  return guests > 0 ? Math.ceil(guests / GUESTS_PER_SERVER) : 0;
}

export function extraServersCost(servers: number, guests: number): number {
  return Math.max(0, servers - includedServers(guests)) * EXTRA_SERVER_RATE;
}

// --- Payment schedule -------------------------------------------------------

export const DOWNPAYMENT_RATE = 0.5;
/** Down payment must be paid within this many days of booking. */
export const DOWNPAYMENT_DUE_DAYS = 3;
/** Remaining balance must be settled this many days before the event. */
export const BALANCE_DUE_DAYS_BEFORE_EVENT = 3;
/** Cancelling this many days or more before the event refunds the down payment less a fee. */
export const FREE_CANCEL_DAYS = 14;
export const CANCELLATION_FEE_RATE = 0.2;

function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey.slice(0, 10)}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

/** Today's local date as YYYY-MM-DD. */
export function todayKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export interface PaymentScheduleItem {
  key: 'downpayment' | 'balance';
  label: string;
  amount: number;
  dueDate: string;
}

/** Due dates for a booking made on bookedOn (YYYY-MM-DD) for an event on eventDate. */
export function buildPaymentSchedule(total: number, bookedOn: string, eventDate: string): PaymentScheduleItem[] {
  const dp = Math.round(total * DOWNPAYMENT_RATE * 100) / 100;
  const balanceDue = addDays(eventDate, -BALANCE_DUE_DAYS_BEFORE_EVENT);
  // Never let the down payment fall due after the balance.
  const dpDue = [addDays(bookedOn, DOWNPAYMENT_DUE_DAYS), balanceDue].sort()[0];
  return [
    { key: 'downpayment', label: `${DOWNPAYMENT_RATE * 100}% Down Payment`, amount: dp, dueDate: dpDue },
    { key: 'balance', label: 'Remaining Balance', amount: Math.round((total - dp) * 100) / 100, dueDate: balanceDue },
  ];
}

export type ScheduleState = 'paid' | 'pending' | 'due' | 'overdue';

export interface ReservationPaymentStatus {
  verified: number;
  pending: number;
  outstanding: number;
  hasDownpayment: boolean;
  schedule: (PaymentScheduleItem & { state: ScheduleState })[];
  /** Earliest unpaid item that is past due, if any. */
  overdue: PaymentScheduleItem | null;
}

/** Where a reservation stands against its payment schedule. */
export function reservationPaymentStatus(
  res: Reservation,
  payments: Payment[],
  now: Date = new Date()
): ReservationPaymentStatus {
  const own = payments.filter(p => p.reservation_id === res.id);
  const verified = own.filter(p => p.status === 'verified').reduce((s, p) => s + p.amount, 0);
  const pending = own.filter(p => p.status === 'pending_verification').reduce((s, p) => s + p.amount, 0);
  const hasDownpayment = own.some(
    p => p.status !== 'rejected' && (p.payment_type === 'downpayment' || p.payment_type === 'full_payment')
  );
  const today = todayKey(now);
  const plan = buildPaymentSchedule(res.total_amount, (res.created_at || today).slice(0, 10), res.event_date);
  let covered = 0;
  const schedule = plan.map(item => {
    covered += item.amount;
    const state: ScheduleState =
      verified + 0.005 >= covered
        ? 'paid'
        : verified + pending + 0.005 >= covered
        ? 'pending'
        : item.dueDate < today
        ? 'overdue'
        : 'due';
    return { ...item, state };
  });
  return {
    verified,
    pending,
    outstanding: Math.max(0, res.total_amount - verified - pending),
    hasDownpayment,
    schedule,
    overdue: schedule.find(s => s.state === 'overdue') || null,
  };
}

/**
 * Why a payment of this type can't be submitted for the booking right now, or
 * null when it can. Shared by the customer form and the save step.
 */
export function paymentTypeError(type: PaymentType, status: ReservationPaymentStatus): string | null {
  if (status.outstanding <= 0) return 'This reservation is already fully covered by verified or pending payments.';
  if (type === 'downpayment' && status.hasDownpayment) {
    return 'A down payment was already submitted for this booking. Choose "Remaining Balance" to pay the rest.';
  }
  if (type === 'final_balance' && !status.hasDownpayment) {
    return 'Pay the 50% down payment first, or choose "Full Payment" to pay everything at once.';
  }
  if (type === 'full_payment' && status.hasDownpayment) {
    return 'A down payment is already on file. Choose "Remaining Balance" to pay the rest.';
  }
  return null;
}

// --- Admin verification checks ---------------------------------------------

export interface VerificationCheck {
  label: string;
  ok: boolean;
  detail: string;
}

/** Amount the customer should have paid for this payment type, given earlier verified payments. */
export function expectedPaymentAmount(type: PaymentType, res: Reservation, verifiedBefore: number): number {
  const remaining = Math.max(0, res.total_amount - verifiedBefore);
  const amt = type === 'downpayment' ? Math.min(res.total_amount * DOWNPAYMENT_RATE, remaining) : remaining;
  return Math.round(amt * 100) / 100;
}

export function paymentVerificationChecks(
  payment: Payment,
  res: Reservation | undefined,
  allPayments: Payment[],
  peso: (n: number) => string,
  now: Date = new Date()
): VerificationCheck[] {
  if (!res) {
    return [{ label: 'Booking found', ok: false, detail: 'The reservation for this payment could not be found.' }];
  }
  const others = allPayments.filter(p => p.reservation_id === res.id && p.id !== payment.id);
  const verifiedBefore = others.filter(p => p.status === 'verified').reduce((s, p) => s + p.amount, 0);
  const expected = expectedPaymentAmount(payment.payment_type, res, verifiedBefore);
  const amountOk = Math.abs(payment.amount - expected) < 0.01;
  const hasPriorDp = others.some(
    p => p.status === 'verified' && (p.payment_type === 'downpayment' || p.payment_type === 'full_payment')
  );
  const orderOk =
    payment.payment_type === 'final_balance' ? hasPriorDp : !hasPriorDp;
  const dupRef =
    !!payment.reference_number &&
    allPayments.some(
      p =>
        p.id !== payment.id &&
        p.status !== 'rejected' &&
        p.reference_number?.trim().toLowerCase() === payment.reference_number!.trim().toLowerCase()
    );
  const bookingOpen = res.status !== 'cancelled' && res.status !== 'completed';
  const eventAhead = res.event_date >= todayKey(now);
  const needsProof = payment.payment_method !== 'cash';

  return [
    {
      label: 'Booking is active',
      ok: bookingOpen,
      detail: bookingOpen ? `${res.booking_code} is ${res.status.replace('_', ' ')}.` : `${res.booking_code} is ${res.status}.`,
    },
    {
      label: 'Event date not passed',
      ok: eventAhead,
      detail: eventAhead ? `Event on ${res.event_date}.` : `The event date ${res.event_date} has already passed.`,
    },
    {
      label: 'Amount matches the schedule',
      ok: amountOk,
      detail: amountOk
        ? `${peso(payment.amount)} is the expected amount.`
        : `Expected ${peso(expected)} for this payment type, received ${peso(payment.amount)}.`,
    },
    {
      label: 'Correct payment order',
      ok: orderOk,
      detail:
        payment.payment_type === 'final_balance'
          ? orderOk
            ? 'A down payment is already verified.'
            : 'No verified down payment yet. Verify the down payment first.'
          : orderOk
          ? 'No earlier down payment on file.'
          : 'A down payment is already verified for this booking.',
    },
    {
      label: 'Unique reference number',
      ok: !dupRef,
      detail: dupRef ? 'Another payment uses this reference number.' : payment.reference_number || 'Cash payment',
    },
    {
      label: 'Proof of payment attached',
      ok: !needsProof || !!payment.proof_image_url,
      detail: !needsProof ? 'Not required for cash.' : payment.proof_image_url ? 'Screenshot attached.' : 'No proof uploaded.',
    },
  ];
}

// --- Terms & conditions -----------------------------------------------------

export const TERMS_VERSION = '2026-11';

export interface TermsSection {
  title: string;
  points: string[];
}

export function termsSections(peso: (n: number) => string): TermsSection[] {
  return [
    {
      title: 'Booking & reservation',
      points: [
        'Bookings must be made at least 7 days before the event. We cater one event per day.',
        'Your booking stays "Pending" until the down payment is verified. Only then is the date reserved for you.',
        `If the down payment is not paid within ${DOWNPAYMENT_DUE_DAYS} days of booking, the date may be released to other customers.`,
      ],
    },
    {
      title: 'Payment terms',
      points: [
        `${DOWNPAYMENT_RATE * 100}% down payment is due within ${DOWNPAYMENT_DUE_DAYS} days of booking.`,
        `The remaining balance is due ${BALANCE_DUE_DAYS_BEFORE_EVENT} days before the event date. You may also pay in full at any time.`,
        'Pay by GCash / InstaPay QR, or in cash on site. Upload the reference number and a screenshot for GCash payments.',
        'Every payment is verified by our staff. You will get a notification and an emailed receipt once it is verified.',
      ],
    },
    {
      title: 'Guests, hours & staff',
      points: [
        'The price is per guest (pax). Guest count can be changed up to 7 days before the event, and the contract total is updated.',
        `Every package includes ${INCLUDED_SERVICE_HOURS} hours of buffet service. Extra hours cost ${peso(EXTRA_HOUR_RATE)} per hour.`,
        `One server is included for every ${GUESTS_PER_SERVER} guests. Extra servers cost ${peso(EXTRA_SERVER_RATE)} each for the event.`,
        'Leftover food handling follows food-safety rules; packed leftovers are at the customer\'s own risk.',
      ],
    },
    {
      title: 'Cancellation & changes',
      points: [
        `Cancelling ${FREE_CANCEL_DAYS} days or more before the event: the down payment is refunded less a ${CANCELLATION_FEE_RATE * 100}% processing fee.`,
        `Cancelling less than ${FREE_CANCEL_DAYS} days before the event: the down payment is non-refundable.`,
        'Moving the event to another available date is free once, if requested at least 7 days before the event.',
      ],
    },
    {
      title: 'Rentals & venue',
      points: [
        'Rented equipment must be returned in the same condition. Lost or damaged items are charged at replacement cost.',
        'The customer provides venue access, a clean set-up area, and electricity for food warmers and sound equipment.',
      ],
    },
  ];
}
