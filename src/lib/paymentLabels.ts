import { PaymentMethod, PaymentStatus, PaymentType } from '@/types/database';

// Short status names, matching the tab labels on the Payments pages.
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending_verification: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  downpayment: 'Down Payment (50%)',
  full_payment: 'Full Payment',
  final_balance: 'Remaining Balance',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash on Site',
  bank_transfer: 'Bank Transfer',
  gcash: 'GCash',
  credit_card: 'Credit / Debit Card',
};
