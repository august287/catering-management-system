import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Image as ImageIcon, Printer, BellRing, AlertTriangle, CircleCheck, CircleX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ConfirmationModal } from '@/components/ui/Modal';
import { useCateringData } from '@/hooks/useCateringData';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { PaymentReceiptDialog } from '@/components/PaymentReceipt';
import { formatCurrency, formatDate } from '@/lib/utils';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_TYPE_LABELS } from '@/lib/paymentLabels';
import { Payment } from '@/types/database';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { SearchInput } from '@/components/ui/SearchInput';
import { useToast } from '@/components/ui/Toast';
import { emailReceipt } from '@/lib/receiptEmail';
import { paymentVerificationChecks, reservationPaymentStatus } from '@/lib/bookingTerms';

export function Payments() {
  const { payments, verifyPayment, reservations, profiles, themes, packages } = useCateringData();
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProof, setSelectedProof] = useState<Payment | null>(null);
  const [displayProofUrl, setDisplayProofUrl] = useState<string>('');
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  const [paymentAction, setPaymentAction] = useState<{ id: number; status: 'verified' | 'rejected' } | null>(null);
  const [actionError, setActionError] = useState('');
  const { toast } = useToast();

  // BUG-10: Resolve storage paths to signed URLs for secure admin inspection
  useEffect(() => {
    let isMounted = true;
    if (!selectedProof?.proof_image_url) {
      setDisplayProofUrl('');
      return;
    }
    const url = selectedProof.proof_image_url;
    if (url.startsWith('http') || url.startsWith('/') || url.startsWith('data:')) {
      setDisplayProofUrl(url);
    } else {
      if (isSupabaseConfigured()) {
        supabase.storage
          .from('payment-proofs')
          .createSignedUrl(url, 3600)
          .then(({ data }) => {
            if (isMounted) {
              if (data?.signedUrl) {
                setDisplayProofUrl(data.signedUrl);
              } else {
                const { data: pubData } = supabase.storage.from('payment-proofs').getPublicUrl(url);
                setDisplayProofUrl(pubData?.publicUrl || '/images/receipt_sample.svg');
              }
            }
          });
      } else {
        setDisplayProofUrl('/images/receipt_sample.svg');
      }
    }
    return () => {
      isMounted = false;
    };
  }, [selectedProof]);

  const filteredPayments = payments.filter(pay => {
    const res = reservations.find(r => r.id === pay.reservation_id);
    const matchStatus =
      activeTab === 'all' ||
      (activeTab === 'pending' && pay.status === 'pending_verification') ||
      (activeTab === 'verified' && pay.status === 'verified') ||
      (activeTab === 'rejected' && pay.status === 'rejected');

    const matchSearch =
      (pay.reference_number && pay.reference_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (res && res.booking_code.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchStatus && matchSearch;
  });

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
  } = usePagination(filteredPayments, `${activeTab}|${searchQuery}`);

  const handleOpenProof = (pay: Payment) => {
    setSelectedProof(pay);
    setProofModalOpen(true);
  };

  const handleVerify = async (id: number, status: 'verified' | 'rejected') => {
    setActionError('');
    try {
      await verifyPayment(id, status);
    } catch (err: any) {
      setActionError(err?.message || 'Could not update the payment. Please try again.');
      toast({ tone: 'error', title: 'Payment not updated', description: 'See the message at the top of the page.' });
      return;
    }
    toast({
      title: status === 'verified' ? 'Payment verified' : 'Payment rejected',
      description:
        status === 'verified'
          ? 'The amount has been credited to the reservation.'
          : 'The customer will be asked to submit again.',
    });
    if (selectedProof?.id === id) {
      setSelectedProof(prev => (prev ? { ...prev, status } : null));
    }
    // Send the official receipt to the customer's Gmail once the payment is verified.
    if (status === 'verified' && isSupabaseConfigured()) {
      emailReceipt(id)
        .then(to => toast({ title: 'Receipt emailed', description: `Sent to ${to}.` }))
        .catch(err =>
          toast({
            tone: 'error',
            title: 'Receipt email not sent',
            description: err?.message || 'You can resend it from the receipt preview.',
          })
        );
    }
  };

  const pendingCount = payments.filter(p => p.status === 'pending_verification').length;
  const pendingDp = payments.filter(p => p.status === 'pending_verification' && p.payment_type === 'downpayment').length;
  const pendingFull = payments.filter(p => p.status === 'pending_verification' && p.payment_type === 'full_payment').length;
  const pendingBal = pendingCount - pendingDp - pendingFull;

  // Payment schedule across active bookings, most urgent first.
  const scheduleRows = reservations
    .filter(r => r.status !== 'cancelled' && r.status !== 'completed')
    .map(r => ({ res: r, st: reservationPaymentStatus(r, payments) }))
    .sort((a, b) => {
      const rank = (x: typeof a) => (x.st.overdue ? 0 : x.st.outstanding > 0 ? 1 : 2);
      return rank(a) - rank(b) || a.res.event_date.localeCompare(b.res.event_date);
    });
  const overdueCount = scheduleRows.filter(r => r.st.overdue).length;

  const proofReservation = selectedProof ? reservations.find(r => r.id === selectedProof.reservation_id) : undefined;
  const proofChecks = selectedProof
    ? paymentVerificationChecks(selectedProof, proofReservation, payments, formatCurrency)
    : [];
  const actionPayment = paymentAction ? payments.find(p => p.id === paymentAction.id) : undefined;
  const actionFailedChecks = actionPayment
    ? paymentVerificationChecks(
        actionPayment,
        reservations.find(r => r.id === actionPayment.reservation_id),
        payments,
        formatCurrency
      ).filter(c => !c.ok)
    : [];

  const receiptReservation = receiptPayment
    ? reservations.find(r => r.id === receiptPayment.reservation_id) || null
    : null;
  const receiptCustomer =
    receiptReservation?.customer ||
    profiles.find(p => p.id === receiptReservation?.customer_id);
  const receiptPackage = receiptReservation
    ? receiptReservation.package || packages.find(p => p.id === receiptReservation.package_id)
    : undefined;
  const receiptTheme = receiptReservation
    ? receiptReservation.theme || themes.find(t => t.id === receiptReservation.theme_id)
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">Payment Verifications</h2>
          <p className="text-sm text-text-muted">
            Inspect customer payment receipts, verify GCash and bank transfers, and confirm reservations.
          </p>
        </div>
      </div>

      {actionError && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      {(pendingCount > 0 || overdueCount > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-sm text-amber-900 hover:border-amber-300"
            >
              <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
              <span>
                <strong className="block">{pendingCount} payment{pendingCount === 1 ? '' : 's'} need verification</strong>
                <span className="text-xs">
                  {pendingDp} down payment{pendingDp === 1 ? '' : 's'} · {pendingFull} full payment
                  {pendingFull === 1 ? '' : 's'} · {pendingBal} balance payment{pendingBal === 1 ? '' : 's'}
                </span>
              </span>
            </button>
          )}
          {overdueCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('schedule')}
              className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-left text-sm text-red-900 hover:border-red-300"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
              <span>
                <strong className="block">{overdueCount} booking{overdueCount === 1 ? ' has' : 's have'} overdue payments</strong>
                <span className="text-xs">Open the payment schedule to follow up.</span>
              </span>
            </button>
          )}
        </div>
      )}

      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingCount})
            </TabsTrigger>
            <TabsTrigger value="schedule">
              Payment Schedule{overdueCount > 0 ? ` (${overdueCount} overdue)` : ''}
            </TabsTrigger>
            <TabsTrigger value="verified">
              Verified ({payments.filter(p => p.status === 'verified').length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Rejected ({payments.filter(p => p.status === 'rejected').length})
            </TabsTrigger>
            <TabsTrigger value="all">All ({payments.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card className={activeTab === 'schedule' ? 'hidden' : undefined}>
          <CardContent className="p-4">
            <SearchInput
              wrapperClassName="max-w-md"
              placeholder="Search by reference number or booking code..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="text-xs"
            />
          </CardContent>
        </Card>
      </div>

      {/* Payment schedule per active booking */}
      {activeTab === 'schedule' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-cream-dark/60 border-b border-border text-xs uppercase font-semibold text-text-muted">
                  <tr>
                    <th className="px-5 py-3.5">Booking</th>
                    <th className="px-5 py-3.5">Contract</th>
                    <th className="px-5 py-3.5">Down Payment (50%)</th>
                    <th className="px-5 py-3.5">Remaining Balance</th>
                    <th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {scheduleRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-sm text-text-muted">
                        No active bookings.
                      </td>
                    </tr>
                  ) : (
                    scheduleRows.map(({ res, st }) => {
                      const customer = res.customer || profiles.find(p => p.id === res.customer_id);
                      return (
                        <tr key={res.id} className={st.overdue ? 'bg-red-50/50' : 'hover:bg-cream/40'}>
                          <td className="px-5 py-3.5 text-xs">
                            <div className="font-mono font-bold text-ink">{res.booking_code}</div>
                            <div className="text-text-muted">
                              {customer?.name || 'Customer'} · event {formatDate(res.event_date)}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs">
                            <div className="font-bold text-ink">{formatCurrency(res.total_amount)}</div>
                            <div className="text-emerald-700">{formatCurrency(st.verified)} verified</div>
                          </td>
                          {st.schedule.map(item => (
                            <td key={item.key} className="px-5 py-3.5 text-xs">
                              <div className="font-semibold text-ink">{formatCurrency(item.amount)}</div>
                              <div className="text-text-muted">Due {formatDate(item.dueDate)}</div>
                              <span
                                className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                  item.state === 'paid'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : item.state === 'pending'
                                    ? 'bg-amber-100 text-amber-800'
                                    : item.state === 'overdue'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-cream-dark text-text-muted'
                                }`}
                              >
                                {item.state === 'pending' ? 'To verify' : item.state}
                              </span>
                            </td>
                          ))}
                          <td className="px-5 py-3.5">
                            <Badge variant={res.status}>{res.status.replace('_', ' ')}</Badge>
                            {res.status === 'pending' && st.schedule[0].state !== 'paid' && (
                              <div className="mt-1 text-[11px] text-text-muted">Not confirmed until DP is verified</div>
                            )}
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
      )}

      {/* Payments Table */}
      <Card className={activeTab === 'schedule' ? 'hidden' : undefined}>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-cream-dark/60 border-b border-border text-xs uppercase font-semibold text-text-muted">
                <tr>
                  <th className="px-6 py-3.5">Reference & Booking</th>
                  <th className="px-6 py-3.5">Method & Type</th>
                  <th className="px-6 py-3.5">Amount & Date</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-text-muted">
                      <p>
                        {searchQuery ? 'No payments match your search.' : 'No payments found under this tab.'}
                      </p>
                      {(searchQuery || activeTab !== 'all') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchQuery('');
                            setActiveTab('all');
                          }}
                          className="mt-3 text-xs"
                        >
                          Show all payments
                        </Button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedPayments.map(pay => {
                    const res = reservations.find(r => r.id === pay.reservation_id);
                    return (
                      <tr key={pay.id} className="hover:bg-cream/40 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs">
                          <div
                            className="max-w-[13rem] truncate font-bold text-ink"
                            title={pay.reference_number || undefined}
                          >
                            {pay.reference_number || 'N/A'}
                          </div>
                          <div className="text-text-muted">{res?.booking_code || 'RES-?'}</div>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <div className="font-semibold text-text">{PAYMENT_METHOD_LABELS[pay.payment_method]}</div>
                          <span
                            className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                              pay.payment_type === 'downpayment'
                                ? 'bg-blue-50 text-blue-800'
                                : pay.payment_type === 'full_payment'
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-cream-dark text-text-muted'
                            }`}
                          >
                            {PAYMENT_TYPE_LABELS[pay.payment_type]}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <div className="font-bold text-ink">{formatCurrency(pay.amount)}</div>
                          <div className="text-text-muted">{formatDate(pay.paid_at)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={pay.status}>{PAYMENT_STATUS_LABELS[pay.status]}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setReceiptPayment(pay)}
                              className="h-8 px-2 text-xs"
                              title="View & Print Receipt"
                              aria-label={`View and print receipt ${pay.reference_number || ''}`}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenProof(pay)}
                              className="h-8 gap-1 px-2 text-xs"
                              title="View payment proof"
                              aria-label={`View payment proof ${pay.reference_number || ''}`}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="hidden 2xl:inline">Proof</span>
                            </Button>

                            {pay.status === 'pending_verification' && (
                              <>
                                <Button
                                  variant="gold"
                                  size="sm"
                                  onClick={() => setPaymentAction({ id: pay.id, status: 'verified' })}
                                  className="h-8 gap-1 px-2 text-xs"
                                  title="Approve & Verify"
                                  aria-label="Verify payment"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  <span className="hidden 2xl:inline">Verify</span>
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setPaymentAction({ id: pay.id, status: 'rejected' })}
                                  className="h-8 gap-1 px-2 text-xs"
                                  title="Reject Payment"
                                  aria-label="Reject payment"
                                >
                                  <XCircle className="h-4 w-4" />
                                  <span className="hidden 2xl:inline">Reject</span>
                                </Button>
                              </>
                            )}
                          </div>
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

      {/* Proof of Payment Modal */}
      {selectedProof && (
        <Dialog
          open={proofModalOpen}
          onOpenChange={setProofModalOpen}
          title={`Payment Proof: ${selectedProof.reference_number || 'N/A'}`}
          description={`Amount: ${formatCurrency(selectedProof.amount)} via ${PAYMENT_METHOD_LABELS[selectedProof.payment_method]}`}
          className="max-w-xl"
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-2 bg-cream/40 flex items-center justify-center overflow-hidden">
              {selectedProof.proof_image_url ? (
                <img
                  src={displayProofUrl || selectedProof.proof_image_url}
                  alt="Proof of Payment"
                  className="max-h-[50vh] sm:max-h-[350px] w-auto max-w-full rounded object-contain"
                  onError={e => {
                    (e.target as HTMLImageElement).src = '/images/receipt_sample.svg';
                  }}
                />
              ) : (
                <div className="py-12 text-center text-text-muted">
                  <ImageIcon className="h-10 w-10 mx-auto text-text-faint mb-2" />
                  No proof of payment uploaded.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-cream p-3 rounded-lg border border-border">
              <div>
                <span className="text-text-muted">Method:</span>
                <p className="font-bold text-ink">{PAYMENT_METHOD_LABELS[selectedProof.payment_method]}</p>
              </div>
              <div>
                <span className="text-text-muted">Payment Type:</span>
                  <p className="font-bold text-ink">{PAYMENT_TYPE_LABELS[selectedProof.payment_type]}</p>
              </div>
              <div>
                <span className="text-text-muted">Status:</span>
                <p className="font-bold">
                  <Badge variant={selectedProof.status}>{PAYMENT_STATUS_LABELS[selectedProof.status]}</Badge>
                </p>
              </div>
              <div>
                <span className="text-text-muted">Submitted:</span>
                <p className="font-bold text-ink">{formatDate(selectedProof.paid_at)}</p>
              </div>
            </div>

            {/* Verification checklist against the booking and payment schedule */}
            <div className="rounded-lg border border-border p-3 text-xs">
              <p className="mb-2 font-bold uppercase tracking-wider text-text-muted">
                Verification checks
                {proofReservation && (
                  <span className="ml-1 font-normal normal-case">
                    · {proofReservation.booking_code} · contract {formatCurrency(proofReservation.total_amount)}
                  </span>
                )}
              </p>
              <ul className="space-y-1.5">
                {proofChecks.map(check => (
                  <li key={check.label} className="flex items-start gap-2">
                    {check.ok ? (
                      <CircleCheck className="mt-px h-4 w-4 shrink-0 text-emerald-600" aria-label="Passed" />
                    ) : (
                      <CircleX className="mt-px h-4 w-4 shrink-0 text-red-600" aria-label="Failed" />
                    )}
                    <span>
                      <span className={`font-semibold ${check.ok ? 'text-ink' : 'text-red-700'}`}>{check.label}</span>
                      <span className="text-text-muted"> — {check.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {selectedProof.status === 'pending_verification' && (
              <div className="flex flex-col-reverse gap-2 pt-3 border-t border-border sm:flex-row sm:items-center sm:justify-end">
                <Button
                  variant="destructive"
                  onClick={() => {
                    setPaymentAction({ id: selectedProof.id, status: 'rejected' });
                    setProofModalOpen(false);
                  }}
                  className="gap-1.5 text-xs"
                >
                  <XCircle className="h-4 w-4" /> Reject Payment
                </Button>
                <Button
                  variant="gold"
                  onClick={() => {
                    setPaymentAction({ id: selectedProof.id, status: 'verified' });
                    setProofModalOpen(false);
                  }}
                  className="gap-1.5 text-xs"
                >
                  <CheckCircle className="h-4 w-4" /> Approve & Verify
                </Button>
              </div>
            )}
          </div>
        </Dialog>
      )}

      <PaymentReceiptDialog
        open={receiptPayment !== null}
        onOpenChange={open => !open && setReceiptPayment(null)}
        payment={receiptPayment}
        reservation={receiptReservation}
        customerName={receiptCustomer?.name || 'Customer'}
        customerPhone={receiptCustomer?.phone}
        packageName={receiptPackage?.name}
        themeName={receiptTheme?.name}
        reservationPayments={
          receiptPayment
            ? payments.filter(p => p.reservation_id === receiptPayment.reservation_id)
            : []
        }
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        open={paymentAction !== null}
        onOpenChange={(open) => !open && setPaymentAction(null)}
        onConfirm={() => {
          if (paymentAction) {
            handleVerify(paymentAction.id, paymentAction.status);
            setPaymentAction(null);
          }
        }}
        variant={paymentAction?.status === 'verified' ? 'success' : 'danger'}
        title={paymentAction?.status === 'verified' ? 'Verify Payment' : 'Reject Payment'}
        description={
          paymentAction?.status === 'verified'
            ? actionFailedChecks.length > 0
              ? `Warning: ${actionFailedChecks.map(c => c.detail).join(' ')} Verify anyway? It will be credited to the reservation.`
              : `All checks passed. Verify this ${
                  actionPayment ? PAYMENT_TYPE_LABELS[actionPayment.payment_type].toLowerCase() : 'payment'
                }? It will be credited to the reservation${
                  actionPayment?.payment_type !== 'final_balance' ? ' and the booking will be confirmed' : ''
                }, and the customer will be notified.`
            : 'Are you sure you want to reject this payment? The customer will be notified to submit again.'
        }
        confirmLabel={paymentAction?.status === 'verified' ? 'Verify' : 'Reject'}
      />
    </div>
  );
}

export default Payments;
