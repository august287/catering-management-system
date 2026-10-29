import React, { useState } from 'react';
import { Eye, Calendar, MapPin, Users, Utensils } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { useCateringData } from '@/hooks/useCateringData';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { Reservation, ReservationStatus } from '@/types/database';
import { SearchInput } from '@/components/ui/SearchInput';
import { ConfirmationModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export function Reservations() {
  const { reservations, updateReservationStatus, profiles, themes, packages, rentals, payments } =
    useCateringData();

  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [statusSaving, setStatusSaving] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ReservationStatus | null>(null);
  const { toast } = useToast();

  const filteredReservations = reservations.filter(res => {
    const cust = profiles.find(p => p.id === res.customer_id);
    const matchStatus = activeTab === 'all' || res.status === activeTab;
    const matchSearch =
      res.booking_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.venue_address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cust && cust.name.toLowerCase().includes(searchQuery.toLowerCase()));
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
    paginatedItems: paginatedReservations,
  } = usePagination(filteredReservations, `${activeTab}|${searchQuery}`);

  const handleOpenDetails = (res: Reservation) => {
    setSelectedRes(res);
    setStatusError('');
    setDetailModalOpen(true);
  };

  const applyStatusChange = async (newStatus: ReservationStatus) => {
    if (!selectedRes) return;
    setStatusError('');
    setStatusSaving(true);
    try {
      await updateReservationStatus(selectedRes.id, newStatus);
    } catch (err: any) {
      setStatusError(err?.message || 'Could not update the reservation. Please try again.');
      return;
    } finally {
      setStatusSaving(false);
    }
    setSelectedRes({ ...selectedRes, status: newStatus });
    toast({
      title: 'Reservation updated',
      description: `${selectedRes.booking_code} is now ${STATUS_LABELS[newStatus]}.`,
    });
  };

  // Cancelling or completing a booking is hard to undo, so ask first.
  const handleStatusChange = (newStatus: ReservationStatus) => {
    if (newStatus === 'cancelled' || newStatus === 'completed') {
      setPendingStatus(newStatus);
      return;
    }
    applyStatusChange(newStatus);
  };

  const hasFilters = activeTab !== 'all' || searchQuery !== '';
  const clearFilters = () => {
    setActiveTab('all');
    setSearchQuery('');
  };

  // Find payments for the selected reservation
  const selectedPayments = selectedRes
    ? payments.filter(p => p.reservation_id === selectedRes.id)
    : [];

  const totalPaid = selectedPayments
    .filter(p => p.status === 'verified')
    .reduce((s, p) => s + p.amount, 0);

  const selectedTheme = selectedRes ? themes.find(t => t.id === selectedRes.theme_id) : null;
  const selectedPackage = selectedRes ? packages.find(p => p.id === selectedRes.package_id) : null;
  const selectedCust = selectedRes ? profiles.find(p => p.id === selectedRes.customer_id) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">Reservations & Bookings</h2>
          <p className="text-sm text-text-muted">
            Track, review, and confirm catering event schedules and service requests.
          </p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All ({reservations.length})</TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({reservations.filter(r => r.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="confirmed">
              Confirmed ({reservations.filter(r => r.status === 'confirmed').length})
            </TabsTrigger>
            <TabsTrigger value="in_progress">
              In Progress ({reservations.filter(r => r.status === 'in_progress').length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({reservations.filter(r => r.status === 'completed').length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled ({reservations.filter(r => r.status === 'cancelled').length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <CardContent className="p-4">
            <SearchInput
              wrapperClassName="max-w-md"
              placeholder="Search by booking code, customer name, or venue..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="text-xs"
            />
          </CardContent>
        </Card>
      </div>

      {/* Reservations Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-cream-dark/60 border-b border-border text-xs uppercase font-semibold text-text-muted">
                <tr>
                  <th className="px-6 py-3.5">Code</th>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Event Date & Time</th>
                  <th className="px-6 py-3.5">Package & Guests</th>
                  <th className="px-6 py-3.5">Total Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {                  filteredReservations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-text-muted">
                      <p>No reservations match your filters.</p>
                      {hasFilters && (
                        <Button variant="outline" size="sm" onClick={clearFilters} className="mt-3 text-xs">
                          Clear filters
                        </Button>
                      )}
                    </td>
                  </tr>
                ) : (
                  paginatedReservations.map(res => {
                    const cust = profiles.find(p => p.id === res.customer_id);
                    const pkg = packages.find(p => p.id === res.package_id);
                    return (
                      <tr key={res.id} className="hover:bg-cream/40 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-xs text-ink">
                          {res.booking_code}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-text">{cust?.name || 'Customer'}</div>
                          <div className="text-xs text-text-muted">{cust?.phone || 'No phone'}</div>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <div className="font-medium text-text">{formatDate(res.event_date)}</div>
                          <div className="text-text-muted">{formatTime(res.event_time)}</div>
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <div className="font-medium text-text">{pkg?.name || 'Custom Package'}</div>
                          <div className="text-text-muted">{res.guest_count} attendees</div>
                        </td>
                        <td className="px-6 py-4 font-bold text-ink text-xs">
                          {formatCurrency(res.total_amount)}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={res.status}>{res.status.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDetails(res)}
                            className="gap-1 text-xs"
                            aria-label={`View details for ${res.booking_code}`}
                          >
                            <Eye className="h-3.5 w-3.5" /> Details
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

      {/* Detail & Status Modal */}
      {selectedRes && (
        <Dialog
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          title={`Reservation ${selectedRes.booking_code}`}
          description={`Submitted on ${formatDate(selectedRes.created_at)}`}
          className="max-w-2xl"
        >
          <div className="space-y-5">
            {/* Status Selector Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-cream p-4 border border-border">
              <div>
                <span className="text-xs font-semibold text-text-muted uppercase">Current Status:</span>
                <div className="mt-1">
                  <Badge variant={selectedRes.status}>{selectedRes.status.replace('_', ' ')}</Badge>
                </div>
              </div>

              <div className="flex w-full items-center gap-2 sm:w-auto">
                <label htmlFor="res-status" className="text-xs font-semibold text-text-muted">
                  Update:
                </label>
                <div className="flex-1 sm:flex-none">
                <Select
                  id="res-status"
                  value={selectedRes.status}
                  onChange={e => handleStatusChange(e.target.value as ReservationStatus)}
                  disabled={statusSaving}
                  className="h-9 text-xs py-1"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
                </div>
                {statusSaving && <span className="text-xs text-text-muted" role="status">Saving…</span>}
              </div>
            </div>

            {statusError && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {statusError}
              </div>
            )}

            {/* Event Summary Grid */}
            <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-2">
              <div className="rounded-lg border border-border p-3 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-text-muted uppercase">
                  <Users className="h-3.5 w-3.5 text-gold" /> Customer Information
                </div>
                <p className="font-semibold text-ink text-sm">{selectedCust?.name || 'Customer'}</p>
                <p className="text-text-muted">Phone: {selectedCust?.phone || 'N/A'}</p>
                <p className="text-text-muted break-all">ID: {selectedRes.customer_id}</p>
              </div>

              <div className="rounded-lg border border-border p-3 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-text-muted uppercase">
                  <Calendar className="h-3.5 w-3.5 text-gold" /> Schedule & Guests
                </div>
                <p className="font-semibold text-ink text-sm">
                  {formatDate(selectedRes.event_date)} at {formatTime(selectedRes.event_time)}
                </p>
                <p className="text-text-muted">Expected Guests: {selectedRes.guest_count} pax</p>
                <p className="text-text-muted">Theme: {selectedTheme?.name || 'Standard'}</p>
              </div>
            </div>

            {/* Venue Address */}
            <div className="rounded-lg border border-border p-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-text-muted uppercase mb-1">
                <MapPin className="h-3.5 w-3.5 text-gold" /> Venue Location
              </div>
              <p className="font-medium text-text">{selectedRes.venue_address}</p>
            </div>

            {/* Package & Rental Breakdown */}
            <div className="rounded-lg border border-border p-4 text-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2">
                <span className="font-bold text-ink uppercase flex items-center gap-1">
                  <Utensils className="h-3.5 w-3.5 text-gold" /> Catering Package
                </span>
                <span className="font-bold text-ink">
                  {formatCurrency(selectedPackage?.price_per_pax || 0)} / head
                </span>
              </div>
              <p className="font-semibold text-text">{selectedPackage?.name}</p>
              <p className="text-text-muted leading-relaxed">{selectedPackage?.description}</p>

              {/* Special Requests */}
              {selectedRes.special_requests && (
                <div className="pt-2 border-t border-border">
                  <span className="font-bold text-text-muted uppercase">Special Notes / Dietary:</span>
                  <p className="mt-0.5 text-text italic">"{selectedRes.special_requests}"</p>
                </div>
              )}
            </div>

            {/* Financial Status */}
            <div className="rounded-lg bg-ink p-4 text-white">
              <div className="flex items-center justify-between text-xs text-cream/70 mb-1">
                <span>Total Contract Amount:</span>
                <span className="font-bold text-base text-white">
                  {formatCurrency(selectedRes.total_amount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-cream/70">
                <span>Verified Payments Received:</span>
                <span className="font-semibold text-emerald-400">
                  {formatCurrency(totalPaid)}
                </span>
              </div>
              <div className="mt-2 pt-2 border-t border-ink-muted flex items-center justify-between text-xs font-bold">
                <span className="text-gold-light">Outstanding Balance:</span>
                <span className="text-gold">
                  {formatCurrency(Math.max(0, selectedRes.total_amount - totalPaid))}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="default" onClick={() => setDetailModalOpen(false)} className="w-full sm:w-auto">
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      <ConfirmationModal
        open={pendingStatus !== null}
        onOpenChange={open => !open && setPendingStatus(null)}
        onConfirm={() => {
          if (pendingStatus) applyStatusChange(pendingStatus);
          setPendingStatus(null);
        }}
        variant={pendingStatus === 'cancelled' ? 'danger' : 'warning'}
        title={pendingStatus === 'cancelled' ? 'Cancel this reservation?' : 'Mark as completed?'}
        description={
          pendingStatus === 'cancelled'
            ? `${selectedRes?.booking_code ?? 'This booking'} will be cancelled and the customer will no longer be able to submit payments for it.`
            : `${selectedRes?.booking_code ?? 'This booking'} will be closed. The customer will no longer be able to submit payments for it.`
        }
        confirmLabel={pendingStatus === 'cancelled' ? 'Yes, cancel booking' : 'Mark completed'}
        cancelLabel="Keep current status"
      />
    </div>
  );
}

export default Reservations;
