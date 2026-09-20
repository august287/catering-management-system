import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CreditCard, Upload, CheckCircle2, Clock, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { ConfirmationModal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useCateringData } from '@/hooks/useCateringData';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PaymentType, PaymentMethod } from '@/types/database';

export function Payments() {
  const [searchParams] = useSearchParams();
  const { profile } = useAuth();
  const { reservations, payments, submitPayment } = useCateringData();

  // Find customer's reservations
  const myReservations = reservations.filter(
    r => r.customer_id === profile?.id || (!profile && r.customer_id === '00000000-0000-0000-0000-000000000002')
  );

  const preselectedResId = searchParams.get('reservationId')
    ? Number(searchParams.get('reservationId'))
    : myReservations[0]?.id || 0;

  const [reservationId, setReservationId] = useState<number>(preselectedResId);
  const [amount, setAmount] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<PaymentType>('downpayment');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('gcash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [proofPreview, setProofPreview] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  // Update default suggested amount when reservation or payment type changes
  useEffect(() => {
    const res = myReservations.find(r => r.id === Number(reservationId));
    if (res) {
      if (paymentType === 'downpayment') {
        setAmount(res.total_amount * 0.5);
      } else if (paymentType === 'full_payment') {
        setAmount(res.total_amount);
      } else {
        setAmount(res.total_amount * 0.5);
      }
    }
  }, [reservationId, paymentType, myReservations]);

  // Handle local file preview
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (!reservationId) {
      setErrorMessage('Please choose a reservation to pay for.');
      return;
    }
    if (!amount || amount <= 0) {
      setErrorMessage('Please specify a valid payment amount.');
      return;
    }
    if (!referenceNumber.trim()) {
      setErrorMessage('Please provide the transaction reference number (e.g. GCash Ref No).');
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
        amount: Number(amount),
        payment_type: paymentType,
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        proof_image_url: proofPreview || '/images/receipt_sample.svg',
      });

      setSuccessMessage(
        'Payment submitted successfully! Our accounting team will verify your receipt shortly.'
      );
      setReferenceNumber('');
      setProofPreview('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Find customer's payment history
  const customerReservationIds = myReservations.map(r => r.id);
  const myPayments = payments.filter(p => customerReservationIds.includes(p.reservation_id));

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-2xl font-bold text-ink">Payment Submissions</h2>
        <p className="text-sm text-text-muted">
          Submit proof of downpayments, view balance settlements, and track verification statuses.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Payment Submission Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Submit Payment Receipt</CardTitle>
            <p className="text-xs text-text-muted">
              Pay via GCash, Bank Transfer, or Credit Card and upload proof for instant logging.
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Select Event Reservation
                </label>
                {myReservations.length === 0 ? (
                  <p className="text-xs text-red-600">No active bookings found to submit payment for.</p>
                ) : (
                  <Select
                    value={reservationId}
                    onChange={e => setReservationId(Number(e.target.value))}
                    required
                  >
                    {myReservations.map(res => (
                      <option key={res.id} value={res.id}>
                        {res.booking_code} · {formatDate(res.event_date)} (Total: {formatCurrency(res.total_amount)})
                      </option>
                    ))}
                  </Select>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                    Payment Stage
                  </label>
                  <Select
                    value={paymentType}
                    onChange={e => setPaymentType(e.target.value as PaymentType)}
                  >
                    <option value="downpayment">50% Initial Downpayment</option>
                    <option value="final_balance">Remaining Final Balance</option>
                    <option value="full_payment">100% Full Payment</option>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                    Payment Channel
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
                    Amount to Remit (PHP)
                  </label>
                  <Input
                    type="number"
                    required
                    min={1}
                    value={amount}
                    onChange={e => setAmount(Number(e.target.value))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                    Transaction Reference No.
                  </label>
                  <Input
                    required
                    placeholder="e.g. GCASH-19284091 or BDO-REF-4921"
                    value={referenceNumber}
                    onChange={e => setReferenceNumber(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Attach Proof of Payment (Screenshot / Receipt)
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4 rounded-lg border-2 border-dashed border-border p-4 bg-cream/40">
                  <Input
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
              </div>

              <Button
                type="submit"
                variant="gold"
                disabled={submitting || myReservations.length === 0}
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
                Catering Bank Accounts
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
                  <th className="px-6 py-3.5">Type</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Date Submitted</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {myPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-text-muted">
                      No payment history recorded yet.
                    </td>
                  </tr>
                ) : (
                  myPayments.map(pay => {
                    const res = reservations.find(r => r.id === pay.reservation_id);
                    return (
                      <tr key={pay.id} className="hover:bg-cream/40">
                        <td className="px-6 py-4 font-mono font-bold text-ink text-xs">
                          {pay.reference_number || 'N/A'}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-text">
                          {res?.booking_code || 'RES-?'}
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold uppercase text-text-muted">
                          {pay.payment_method.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4 text-xs capitalize text-text-muted">
                          {pay.payment_type.replace('_', ' ')}
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
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

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