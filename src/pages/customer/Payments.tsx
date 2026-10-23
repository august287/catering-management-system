import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  Image as ImageIcon,
  Printer,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { ConfirmationModal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useCateringData } from '@/hooks/useCateringData';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { PaymentReceiptDialog } from '@/components/PaymentReceipt';
import { formatCurrency, formatDate, isValidPaymentReference, PAYMENT_REFERENCE_MIN_LENGTH, PAYMENT_REFERENCE_MAX_LENGTH } from '@/lib/utils';
import { PAYMENT_METHOD_LABELS, PAYMENT_TYPE_LABELS } from '@/lib/paymentLabels';
import { PaymentType, PaymentMethod, Payment } from '@/types/database';

export function Payments() {
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { reservations, payments, themes, packages, submitPayment } = useCateringData();

  // Find customer's reservations with useMemo to avoid recreating arrays on every render
  const allCustomerReservations = useMemo(
    () => reservations.filter(r => r.customer_id === profile?.id),
    [reservations, profile?.id]
  );

  const payableReservations = useMemo(
    () => allCustomerReservations.filter(r => r.status !== 'cancelled' && r.status !== 'completed'),
    [allCustomerReservations]
  );

  const reservationBalances = useMemo(() => {
    const balances = new Map<number, { verified: number; pending: number; outstanding: number }>();
    payableReservations.forEach(res => {
      const resPayments = payments.filter(p => p.reservation_id === res.id);
      const verified = resPayments
        .filter(p => p.status === 'verified')
        .reduce((sum, p) => sum + p.amount, 0);
      const pending = resPayments
        .filter(p => p.status === 'pending_verification')
        .reduce((sum, p) => sum + p.amount, 0);
      balances.set(res.id, {
        verified,
        pending,
        outstanding: Math.max(0, res.total_amount - verified - pending),
      });
    });
    return balances;
  }, [payableReservations, payments]);

  const queryResId = Number(searchParams.get('reservationId') || 0);
  const isQueryPayable = payableReservations.some(r => r.id === queryResId);
  const isQueryBlocked = queryResId > 0 && !isQueryPayable;
  const preselectedResId = isQueryPayable ? queryResId : payableReservations[0]?.id || 0;

  const [reservationId, setReservationId] = useState<number>(preselectedResId);
  const [amountInput, setAmountInput] = useState<string>('');
  const [amountUserEdited, setAmountUserEdited] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>('downpayment');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('gcash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [proofPreview, setProofPreview] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const amount = amountInput.trim() === '' ? 0 : Number(amountInput);

  const selectedReservation = payableReservations.find(r => r.id === Number(reservationId));
  const selectedReservationPayments = payments.filter(
    p => p.reservation_id === Number(reservationId)
  );
  const verifiedPaid = selectedReservationPayments
    .filter(p => p.status === 'verified')
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingPaid = selectedReservationPayments
    .filter(p => p.status === 'pending_verification')
    .reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = selectedReservation
    ? Math.max(0, selectedReservation.total_amount - verifiedPaid)
    : 0;
  const outstandingBalance = Math.max(0, remainingBalance - pendingPaid);
  const requiresProof = paymentMethod !== 'cash';

  // Sync default selection if reservations load after mount
  useEffect(() => {
    if (!reservationId && payableReservations.length > 0) {
      setReservationId(payableReservations[0].id);
    }
  }, [reservationId, payableReservations]);

  // Reset userEdited flag when target booking or payment type changes
  useEffect(() => {
    setAmountUserEdited(false);
  }, [reservationId, paymentType]);

  // Update default suggested amount when reservation or payment type changes
  useEffect(() => {
    if (amountUserEdited || !selectedReservation) return;
    if (paymentType === 'downpayment') {
      setAmountInput(
        Math.min(selectedReservation.total_amount * 0.5, outstandingBalance).toFixed(2)
      );
    } else if (paymentType === 'full_payment') {
      setAmountInput(outstandingBalance.toFixed(2));
    } else {
      // BUG-08: remaining balance is total minus verified and pending payments
      setAmountInput(outstandingBalance.toFixed(2));
    }
  }, [
    reservationId,
    paymentType,
    payableReservations,
    payments,
    amountUserEdited,
    selectedReservation,
    remainingBalance,
    outstandingBalance,
  ]);

  // Handle local file preview with BUG-10 validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setErrorMessage('');
    if (!file) {
      setSelectedFile(null);
      setProofPreview('');
      return;
    }

    // BUG-10: 5 MB file size limit per storage schema
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 5 MB limit. Please select a smaller receipt image.');
      e.target.value = '';
      setSelectedFile(null);
      setProofPreview('');
      return;
    }

    // BUG-10: Allowed MIME types per storage schema
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage('Invalid file type. Only JPG, PNG, and WebP images are allowed.');
      e.target.value = '';
      setSelectedFile(null);
      setProofPreview('');
      return;
    }

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setProofPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    const reservation = payableReservations.find(r => r.id === Number(reservationId));
    if (!reservation) {
      setErrorMessage('Please choose a valid active reservation to pay for.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setErrorMessage('Please specify a valid payment amount.');
      return;
    }

    const roundedAmount = Math.round(amount * 100) / 100;
    if (outstandingBalance <= 0) {
      setErrorMessage(
        'This reservation is already fully covered by verified or pending payments.'
      );
      return;
    }
    if (roundedAmount > outstandingBalance + 0.005) {
      setErrorMessage(
        `Payment amount cannot exceed the outstanding balance of ${formatCurrency(outstandingBalance)}.`
      );
      return;
    }

    const reference = referenceNumber.trim();
    if (paymentMethod !== 'cash' && !reference) {
      setErrorMessage('Please provide the transaction reference number (e.g. GCash Ref No).');
      return;
    }
    if (reference && !isValidPaymentReference(reference)) {
      setErrorMessage(
        'Enter a valid reference number: 6–80 characters using letters, numbers, hyphens, underscores, or periods only.'
      );
      return;
    }
    if (
      reference &&
      payments.some(
        p => p.reference_number?.trim().toLowerCase() === reference.toLowerCase()
      )
    ) {
      setErrorMessage(
        'This transaction reference number has already been submitted. Please double-check your receipt.'
      );
      return;
    }

    if (requiresProof && !selectedFile) {
      setErrorMessage('Please attach a screenshot or photo as proof of payment.');
      return;
    }

    setShowConfirm(true);
  };

  const confirmPayment = async () => {
    setShowConfirm(false);
    setSubmitting(true);
    try {
      await submitPayment({
        reservation_id: Number(reservationId),
        amount: Math.round(Number(amount) * 100) / 100,
        payment_type: paymentType,
        payment_method: paymentMethod,
        reference_number: referenceNumber.trim() || undefined,
        proof_image_url: proofPreview || undefined,
        proof_file: selectedFile,
      });

      setSuccessMessage(
        'Payment submitted successfully! Our accounting team will verify your payment shortly.'
      );
      setReferenceNumber('');
      setProofPreview('');
      setSelectedFile(null);
      setAmountUserEdited(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Find customer's payment history
  const customerReservationIds = allCustomerReservations.map(r => r.id);
  const myPayments = payments.filter(p => customerReservationIds.includes(p.reservation_id));

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems: paginatedPayments,
  } = usePagination(myPayments);

  const receiptReservation = receiptPayment
    ? reservations.find(r => r.id === receiptPayment.reservation_id) || null
    : null;
  const receiptPackage = receiptReservation
    ? packages.find(p => p.id === receiptReservation.package_id)
    : undefined;
  const receiptTheme = receiptReservation
    ? themes.find(t => t.id === receiptReservation.theme_id)
    : undefined;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl font-bold text-ink">Payments</h2>
        <p className="text-sm text-text-muted">
          Submit payments, upload proof of payment, and track verification statuses.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Payment Submission Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Submit a Payment</CardTitle>
            <p className="text-xs text-text-muted">
              Pay via GCash, bank transfer, card, or cash, then upload your proof of payment for
              verification.
            </p>
          </CardHeader>
          <CardContent>
            {successMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            {isQueryBlocked && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>The requested reservation is either cancelled or completed and cannot accept additional payments.</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Select Reservation
                </label>
                {payableReservations.length === 0 ? (
                  <p className="text-xs text-red-600">No active bookings found to submit payment for.</p>
                ) : (
                  <Select
                    value={reservationId}
                    onChange={e => {
                      setReservationId(Number(e.target.value));
                      setAmountUserEdited(false);
                    }}
                    required
                  >
                    {payableReservations.map(res => {
                      const balance = reservationBalances.get(res.id);
                      const amountLabel =
                        paymentType === 'downpayment'
                          ? `Contract Total: ${formatCurrency(res.total_amount)}`
                          : `Remaining Balance: ${formatCurrency(balance?.outstanding ?? res.total_amount)}`;
                      return (
                        <option key={res.id} value={res.id}>
                          {res.booking_code} · {formatDate(res.event_date)} · {amountLabel}
                        </option>
                      );
                    })}
                  </Select>
                )}
                {selectedReservation && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-muted">
                    <span>
                      Contract Total:{' '}
                      <strong className="text-text">
                        {formatCurrency(selectedReservation.total_amount)}
                      </strong>
                    </span>
                    <span>
                      Verified Paid:{' '}
                      <strong className="text-emerald-700">{formatCurrency(verifiedPaid)}</strong>
                    </span>
                    {pendingPaid > 0 && (
                      <span>
                        Pending Verification:{' '}
                        <strong className="text-amber-700">{formatCurrency(pendingPaid)}</strong>
                      </span>
                    )}
                    <span>
                      Remaining Balance:{' '}
                      <strong className="text-gold-dark">{formatCurrency(outstandingBalance)}</strong>
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                    Payment Type
                  </label>
                  <Select
                    value={paymentType}
                    onChange={e => {
                      setPaymentType(e.target.value as PaymentType);
                      setAmountUserEdited(false);
                    }}
                  >
                    <option value="downpayment">{PAYMENT_TYPE_LABELS.downpayment}</option>
                    <option value="final_balance">{PAYMENT_TYPE_LABELS.final_balance}</option>
                    <option value="full_payment">{PAYMENT_TYPE_LABELS.full_payment}</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                    Payment Method
                  </label>
                  <Select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  >
                    <option value="gcash">GCash (0917-888-0001)</option>
                    <option value="bank_transfer">BDO / BPI Bank Transfer</option>
                    <option value="credit_card">Credit / Debit Card</option>
                    <option value="cash">Cash on Site</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                    Amount to Pay (PHP)
                  </label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    required
                    placeholder="e.g. 5000.00"
                    value={amountInput}
                    onChange={e => {
                      const raw = e.target.value.replace(/,/g, '');
                      if (/^\d*\.?\d{0,2}$/.test(raw)) {
                        setAmountInput(raw);
                        setAmountUserEdited(true);
                      }
                    }}
                  />
                  <p className="mt-1 text-[11px] text-text-muted">
                    You may type any amount up to the outstanding balance:{' '}
                    <span className="font-semibold text-text">
                      {formatCurrency(outstandingBalance)}
                    </span>
                    {pendingPaid > 0 && (
                      <> · {formatCurrency(pendingPaid)} awaiting verification</>
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                    Transaction Reference No.
                  </label>
                  <Input
                    required={paymentMethod !== 'cash'}
                    minLength={PAYMENT_REFERENCE_MIN_LENGTH}
                    maxLength={PAYMENT_REFERENCE_MAX_LENGTH}
                    pattern="[A-Za-z0-9][A-Za-z0-9._-]{5,79}"
                    placeholder={
                      paymentMethod === 'cash'
                        ? 'Optional for cash payments'
                        : 'e.g. GCASH-19284091 or BDO-REF-4921'
                    }
                    value={referenceNumber}
                    onChange={e => setReferenceNumber(e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-text-muted">
                    {paymentMethod === 'cash'
                      ? 'Optional for cash on site. '
                      : 'Required for GCash, bank, and card payments. '}
                    6–80 characters using letters, numbers, hyphens, underscores, or periods only.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Upload Proof of Payment{' '}
                  <span className="font-normal lowercase text-text-muted">
                    {requiresProof ? '(required)' : '(optional)'}
                  </span>
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4 rounded-lg border-2 border-dashed border-border p-4 bg-cream/40">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                    className="border-0 bg-transparent file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-gold file:text-white hover:file:bg-gold-dark cursor-pointer text-xs"
                  />
                  {proofPreview && (
                    <div className="flex items-center gap-2">
                      <img
                        src={proofPreview}
                        alt="Preview"
                        className="h-12 w-12 rounded object-cover border border-border"
                      />
                      <span className="text-[11px] text-emerald-700 font-semibold">Image Ready</span>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-text-muted">
                  {requiresProof
                    ? 'Required for GCash, bank transfer, and card payments. Upload a screenshot or photo of the transaction. JPG, PNG or WebP · max 5 MB.'
                    : 'Optional for cash payments. Upload a photo if available. JPG, PNG or WebP · max 5 MB.'}
                </p>
              </div>

              <Button
                type="submit"
                variant="gold"
                disabled={
                  submitting || payableReservations.length === 0 || outstandingBalance <= 0
                }
                className="w-full h-11 text-sm mt-2"
              >
                {submitting ? 'Submitting Payment...' : 'Submit Payment for Verification'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Payment Account Details Box */}
        <div className="space-y-4">
          <Card className="bg-ink text-white">
            <CardHeader className="pb-3 border-b border-ink-muted/50">
              <CardTitle className="text-white flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gold" />
                Catering Payment Accounts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs pt-4">
              <div className="rounded-lg bg-ink-soft p-3 border border-ink-muted/60">
                <span className="text-gold-light font-bold block uppercase text-[10px]">
                  GCash Express
                </span>
                <p className="font-mono text-base font-bold text-white mt-0.5">0917-888-0001</p>
                <p className="text-cream/70 text-[11px]">Account Name: Natalie's Catering Corp</p>
              </div>

              <div className="rounded-lg bg-ink-soft p-3 border border-ink-muted/60">
                <span className="text-gold-light font-bold block uppercase text-[10px]">
                  BDO Unibank (Checking)
                </span>
                <p className="font-mono text-base font-bold text-white mt-0.5">0049-1234-5678</p>
                <p className="text-cream/70 text-[11px]">Account Name: Natalie's Catering Services</p>
              </div>

              <div className="rounded-lg bg-ink-soft p-3 border border-ink-muted/60">
                <span className="text-gold-light font-bold block uppercase text-[10px]">
                  BPI Savings
                </span>
                <p className="font-mono text-base font-bold text-white mt-0.5">3890-4829-11</p>
                <p className="text-cream/70 text-[11px]">Account Name: Natalie's Catering Services</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Customer Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>My Payment History</CardTitle>
          <p className="text-xs text-text-muted">
            All submitted transaction records and their verification statuses
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-cream-dark/60 border-b border-border text-xs uppercase font-semibold text-text-muted">
                <tr>
                  <th className="px-6 py-3.5">Reference #</th>
                  <th className="px-6 py-3.5">Booking Code</th>
                  <th className="px-6 py-3.5">Payment Method</th>
                  <th className="px-6 py-3.5">Payment Type</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Date Submitted</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {myPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-10 text-center text-sm text-text-muted">
                      No payment history recorded yet.
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map(pay => {
                    const res = reservations.find(r => r.id === pay.reservation_id);
                    return (
                      <tr key={pay.id} className="hover:bg-cream/40">
                        <td className="px-6 py-4 font-mono font-bold text-ink text-xs">
                          {pay.reference_number || 'N/A'}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-text">
                          {res?.booking_code || 'RES-?'}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-text-muted">
                          {PAYMENT_METHOD_LABELS[pay.payment_method]}
                        </td>
                        <td className="px-6 py-4 text-xs text-text-muted">
                          {PAYMENT_TYPE_LABELS[pay.payment_type]}
                        </td>
                        <td className="px-6 py-4 font-bold text-ink text-xs">
                          {formatCurrency(pay.amount)}
                        </td>
                        <td className="px-6 py-4 text-xs text-text-muted">
                          {formatDate(pay.paid_at)}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={pay.status}>{pay.status.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setReceiptPayment(pay)}
                            className="gap-1 text-xs"
                            title="View and print receipt"
                          >
                            <Printer className="h-3.5 w-3.5" /> Receipt
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            pageSize={pageSize}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      <PaymentReceiptDialog
        open={receiptPayment !== null}
        onOpenChange={open => !open && setReceiptPayment(null)}
        payment={receiptPayment}
        reservation={receiptReservation}
        customerName={profile?.name || 'Customer'}
        customerPhone={profile?.phone}
        packageName={receiptPackage?.name}
        themeName={receiptTheme?.name}
        reservationPayments={
          receiptPayment
            ? payments.filter(p => p.reservation_id === receiptPayment.reservation_id)
            : []
        }
      />

      <ConfirmationModal
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={confirmPayment}
        variant="info"
        title="Submit Payment Details"
        description={`Are you sure you want to submit a payment of ${formatCurrency(amount)} with reference number ${referenceNumber}?`}
        confirmLabel="Submit Payment"
        loading={submitting}
      />
    </div>
  );
  }

export default Payments;