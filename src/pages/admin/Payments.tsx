import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Image as ImageIcon, Printer } from 'lucide-react';
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
import { PAYMENT_METHOD_LABELS, PAYMENT_TYPE_LABELS } from '@/lib/paymentLabels';
import { Payment } from '@/types/database';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { SearchInput } from '@/components/ui/SearchInput';
import { useToast } from '@/components/ui/Toast';

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
  };

  const pendingCount = payments.filter(p => p.status === 'pending_verification').length;

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

      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingCount})
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

        <Card>
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

      {/* Payments Table */}
      <Card>
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
                  <th className="px-6 py-3.5">Submitted Date</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-sm text-text-muted">
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
                              className="gap-1 text-xs"
                            >
                              <Eye className="h-3.5 w-3.5" /> Proof
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
                                  <span className="hidden xl:inline">Verify</span>
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
                                  <span className="hidden xl:inline">Reject</span>
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
                  <Badge variant={selectedProof.status}>{selectedProof.status.replace('_', ' ')}</Badge>
                </p>
              </div>
              <div>
                <span className="text-text-muted">Submitted:</span>
                <p className="font-bold text-ink">{formatDate(selectedProof.paid_at)}</p>
              </div>
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
            ? 'Are you sure you want to verify this payment? It will be credited to the reservation.'
            : 'Are you sure you want to reject this payment? The customer will be notified to submit again.'
        }
        confirmLabel={paymentAction?.status === 'verified' ? 'Verify' : 'Reject'}
      />
    </div>
  );
}

export default Payments;
