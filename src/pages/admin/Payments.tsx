import React, { useState } from 'react';
import { CheckCircle, XCircle, Eye, Search, CreditCard, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Dialog } from '@/components/ui/Dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ConfirmationModal } from '@/components/ui/Modal';
import { useCateringData } from '@/hooks/useCateringData';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Payment } from '@/types/database';

export function Payments() {
  const { payments, verifyPayment, reservations, profiles } = useCateringData();
  const [activeTab, setActiveTab] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProof, setSelectedProof] = useState<Payment | null>(null);
  const [proofModalOpen, setProofModalOpen] = useState(false);

  const [paymentAction, setPaymentAction] = useState<{ id: number; status: 'verified' | 'rejected' } | null>(null);

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

  const handleOpenProof = (pay: Payment) => {
    setSelectedProof(pay);
    setProofModalOpen(true);
  };

  const handleVerify = async (id: number, status: 'verified' | 'rejected') => {
    await verifyPayment(id, status);
    if (selectedProof?.id === id) {
      setSelectedProof(prev => (prev ? { ...prev, status } : null));
    }
  };

  const pendingCount = payments.filter(p => p.status === 'pending_verification').length;

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

      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 w-full max-w-lg">
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
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
              <Input
                placeholder="Search by reference number or booking code..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
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
                  <th className="px-6 py-3.5">Type</th>
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
                      No payments found under this tab.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map(pay => {
                    const res = reservations.find(r => r.id === pay.reservation_id);
                    return (
                      <tr key={pay.id} className="hover:bg-cream/40 transition-colors">
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
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
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
                                  className="h-8 px-2 text-xs"
                                  title="Approve & Verify"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => setPaymentAction({ id: pay.id, status: 'rejected' })}
                                  className="h-8 px-2 text-xs"
                                  title="Reject Payment"
                                >
                                  <XCircle className="h-4 w-4" />
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
        </CardContent>
      </Card>

      {/* Proof of Payment Modal */}
      {selectedProof && (
        <Dialog
          open={proofModalOpen}
          onOpenChange={setProofModalOpen}
          title={`Payment Proof: ${selectedProof.reference_number || 'N/A'}`}
          description={`Amount: ${formatCurrency(selectedProof.amount)} via ${selectedProof.payment_method.toUpperCase()}`}
          className="max-w-xl"
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-border p-2 bg-cream/40 flex items-center justify-center overflow-hidden">
              {selectedProof.proof_image_url ? (
                <img
                  src={selectedProof.proof_image_url}
                  alt="Proof of Payment"
                  className="max-h-[350px] w-auto rounded object-contain"
                />
              ) : (
                <div className="py-12 text-center text-text-muted">
                  <ImageIcon className="h-10 w-10 mx-auto text-text-faint mb-2" />
                  No digital receipt uploaded.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-cream p-3 rounded-lg border border-border">
              <div>
                <span className="text-text-muted">Method:</span>
                <p className="font-bold text-ink uppercase">{selectedProof.payment_method}</p>
              </div>
              <div>
                <span className="text-text-muted">Payment Type:</span>
                <p className="font-bold text-ink capitalize">{selectedProof.payment_type.replace('_', ' ')}</p>
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
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleVerify(selectedProof.id, 'rejected');
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
                    handleVerify(selectedProof.id, 'verified');
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
