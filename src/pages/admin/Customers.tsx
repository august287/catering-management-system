import React, { useState } from 'react';
import { Search, Users, Calendar, Phone, Mail, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { useCateringData } from '@/hooks/useCateringData';
import { usePagination } from '@/hooks/usePagination';
import { Pagination } from '@/components/ui/Pagination';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Profile, Reservation } from '@/types/database';

export function Customers() {
  const { profiles, reservations, payments } = useCateringData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Profile | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);

  // Filter only customers, newest members first
  const customers = profiles
    .filter(p => p.role === 'customer')
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (bTime !== aTime) return bTime - aTime;
      return a.name.localeCompare(b.name);
    });

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      c.id.toLowerCase().includes(q)
    );
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
    paginatedItems: paginatedCustomers,
  } = usePagination(filteredCustomers, searchQuery);

  const handleOpenHistory = (cust: Profile) => {
    setSelectedCustomer(cust);
    setHistoryModalOpen(true);
  };

  const getCustomerStats = (customerId: string) => {
    const custReservations = reservations.filter(r => r.customer_id === customerId);
    const totalSpent = custReservations.reduce((sum, r) => sum + r.total_amount, 0);
    return {
      bookingCount: custReservations.length,
      totalSpent,
      reservations: custReservations,
    };
  };

  const selectedStats = selectedCustomer ? getCustomerStats(selectedCustomer.id) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">Customer Directory</h2>
          <p className="text-sm text-text-muted">
            Manage client profiles, contact information, and event booking histories. Newest
            customers are shown first.
          </p>
        </div>
      </div>

      {/* Search Input */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
            <Input
              placeholder="Search by name, phone, or account ID..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-cream-dark/60 border-b border-border text-xs uppercase font-semibold text-text-muted">
                <tr>
                  <th className="px-6 py-3.5">Customer Name</th>
                  <th className="px-6 py-3.5">Contact Phone</th>
                  <th className="px-6 py-3.5">Total Bookings</th>
                  <th className="px-6 py-3.5">Lifetime Catering Value</th>
                  <th className="px-6 py-3.5">Member Since</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-text-muted">
                      No customers match the search criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedCustomers.map(cust => {
                    const stats = getCustomerStats(cust.id);
                    return (
                      <tr key={cust.id} className="hover:bg-cream/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-light text-gold-dark font-bold text-xs border border-gold/30">
                              {cust.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-ink">{cust.name}</div>
                              <div className="text-[11px] text-text-muted">ID: {cust.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-medium text-text">
                          {cust.phone || '—'}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <span className="inline-flex items-center gap-1 font-semibold text-text">
                            <Calendar className="h-3.5 w-3.5 text-gold" />
                            {stats.bookingCount} reservation{stats.bookingCount !== 1 ? 's' : ''}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-ink text-xs">
                          {formatCurrency(stats.totalSpent)}
                        </td>
                        <td className="px-6 py-4 text-xs text-text-muted">
                          {formatDate(cust.created_at || '2026-01-01')}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenHistory(cust)}
                            className="gap-1 text-xs"
                          >
                            <Eye className="h-3.5 w-3.5" /> Bookings
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

      {/* Customer Booking History Modal */}
      {selectedCustomer && selectedStats && (
        <Dialog
          open={historyModalOpen}
          onOpenChange={setHistoryModalOpen}
          title={`${selectedCustomer.name}'s Booking History`}
          description={`Contact: ${selectedCustomer.phone || 'No phone'} · Total Value: ${formatCurrency(selectedStats.totalSpent)}`}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            {selectedStats.reservations.length === 0 ? (
              <p className="text-center text-sm text-text-muted py-8">
                This customer has not made any reservations yet.
              </p>
            ) : (
              <div className="space-y-3">
                {selectedStats.reservations.map(res => (
                  <div
                    key={res.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-cream/40 p-3.5 text-xs hover:bg-cream transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-ink">{res.booking_code}</span>
                        <Badge variant={res.status}>{res.status.replace('_', ' ')}</Badge>
                      </div>
                      <p className="mt-1 text-text-muted">
                        Event Date: <span className="font-medium text-text">{formatDate(res.event_date)}</span> · Venue: {res.venue_address}
                      </p>
                      <p className="text-text-muted">
                        Guests: {res.guest_count} pax
                      </p>
                    </div>
                    <div className="text-right sm:self-center">
                      <div className="font-bold text-ink text-sm">
                        {formatCurrency(res.total_amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="default" onClick={() => setHistoryModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

export default Customers;
