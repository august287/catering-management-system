import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Calendar, MapPin, Users, CreditCard, Eye, Plus, CheckCircle, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog } from '@/components/ui/Dialog';
import { useAuth } from '@/hooks/useAuth';
import { useCateringData } from '@/hooks/useCateringData';
import { formatCurrency, formatDate, formatTime } from '@/lib/utils';
import { Reservation } from '@/types/database';

export function MyReservations() {
  const { profile } = useAuth();
  const location = useLocation();
  const { reservations, themes, packages, payments } = useCateringData();

  const [selectedRes, setSelectedRes] = useState<Reservation | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // New booking highlight if redirected from booking wizard
  const newBookingCode = (location.state as any)?.newBookingCode;

  // Filter reservations belonging to this customer
  const myReservations = reservations.filter(
    r => r.customer_id === profile?.id || (!profile && r.customer_id === '00000000-0000-0000-0000-000000000002')
  );

  const handleOpenDetails = (res: Reservation) => {
    setSelectedRes(res);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">My Event Reservations</h2>
          <p className="text-sm text-text-muted">
            Track your catering schedule, contract status, and payment records.
          </p>
        </div>
        <Link to="/customer/book">
          <Button variant="gold" size="sm" className="gap-1.5 text-xs">
            <Plus className="h-4 w-4" /> Book New Event
          </Button>
        </Link>
      </div>

      {newBookingCode && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 shadow-sm">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <p className="font-bold text-emerald-800">
              Booking Submitted Successfully! (Code: {newBookingCode})
            </p>
            <p className="text-emerald-700">
              Our catering management team is reviewing your schedule. You can now submit your 50%
              downpayment below.
            </p>
          </div>
        </div>
      )}

      {myReservations.length === 0 ? (
        <Card className="p-12 text-center">
          <Clock className="h-12 w-12 mx-auto text-text-faint mb-3 opacity-60" />
          <h3 className="font-serif text-lg font-bold text-ink">No Reservations Found</h3>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            You haven't made any catering reservations yet. Browse our signature themes and packages to get started!
          </p>
          <div className="mt-6">
            <Link to="/customer/book">
              <Button variant="gold" size="sm">
                Book an Event Now
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {myReservations.map(res => {
            const theme = themes.find(t => t.id === res.theme_id);
            const pkg = packages.find(p => p.id === res.package_id);

            const resPayments = payments.filter(p => p.reservation_id === res.id);
            const paidAmount = resPayments
              .filter(p => p.status === 'verified')
              .reduce((sum, p) => sum + p.amount, 0);

            const balanceRemaining = Math.max(0, res.total_amount - paidAmount);

            return (
              <Card
                key={res.id}
                className={`flex flex-col justify-between transition-all hover:shadow-card ${
                  res.booking_code === newBookingCode ? 'ring-2 ring-gold' : ''
                }`}
              >
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold text-ink">
                        {res.booking_code}
                      </span>
                      <h4 className="font-serif text-lg font-bold text-ink mt-0.5">
                        {theme?.name || 'Catering Event'}
                      </h4>
                    </div>
                    <Badge variant={res.status}>{res.status.replace('_', ' ')}</Badge>
                  </div>

                  <div className="space-y-1 text-xs text-text-muted">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-gold" />
                      <span className="font-medium text-text">
                        {formatDate(res.event_date)} at {formatTime(res.event_time)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-gold" />
                      <span className="truncate">{res.venue_address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-gold" />
                      <span>
                        {pkg?.name} · <strong className="text-text">{res.guest_count} guests</strong>
                      </span>
                    </div>
                  </div>

                  {/* Financial Status */}
                  <div className="rounded-lg bg-cream-dark/50 p-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Total Contract:</span>
                      <span className="font-bold text-ink">{formatCurrency(res.total_amount)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-emerald-700">Verified Paid:</span>
                      <span className="font-semibold text-emerald-700">
                        {formatCurrency(paidAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-border font-bold">
                      <span className="text-text">Remaining Balance:</span>
                      <span className="text-gold-dark">{formatCurrency(balanceRemaining)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-border p-4 bg-cream/30">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDetails(res)}
                    className="flex-1 text-xs gap-1"
                  >
                    <Eye className="h-3.5 w-3.5" /> Details
                  </Button>

                  {balanceRemaining > 0 && res.status !== 'cancelled' && (
                    <Link to={`/customer/payments?reservationId=${res.id}`} className="flex-1">
                      <Button variant="gold" size="sm" className="w-full text-xs gap-1">
                        <CreditCard className="h-3.5 w-3.5" /> Submit Payment
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reservation Details Modal */}
      {selectedRes && (() => {
        const selTheme = themes.find(t => t.id === selectedRes.theme_id);
        const selPkg = packages.find(p => p.id === selectedRes.package_id);
        const selPayments = payments.filter(p => p.reservation_id === selectedRes.id);
        const verifiedPaid = selPayments
          .filter(p => p.status === 'verified')
          .reduce((sum, p) => sum + p.amount, 0);
        const remBalance = Math.max(0, selectedRes.total_amount - verifiedPaid);

        return (
          <Dialog
            open={detailOpen}
            onOpenChange={setDetailOpen}
            title={`Booking Details: ${selectedRes.booking_code}`}
            description={`Created on ${formatDate(selectedRes.created_at)}`}
            className="max-w-xl"
          >
            <div className="space-y-4 text-xs">
              <div className="rounded-lg border border-border p-3 space-y-2 bg-cream/40">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-text-muted">Status:</span>
                  <Badge variant={selectedRes.status}>{selectedRes.status.replace('_', ' ')}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-text-muted">Event Schedule:</span>
                  <span className="font-bold text-ink">
                    {formatDate(selectedRes.event_date)} at {formatTime(selectedRes.event_time)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-text-muted">Guest Count:</span>
                  <span className="font-bold text-ink">{selectedRes.guest_count} persons</span>
                </div>
                {selTheme && (
                  <div className="flex justify-between">
                    <span className="font-semibold text-text-muted">Styling Motif:</span>
                    <span className="font-bold text-gold-dark">{selTheme.name}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border">
                  <span className="font-semibold text-text-muted block">Venue Address:</span>
                  <p className="mt-0.5 font-medium text-text">{selectedRes.venue_address}</p>
                </div>
                {selectedRes.special_requests && (
                  <div className="pt-2 border-t border-border">
                    <span className="font-semibold text-text-muted block">Special Requests:</span>
                    <p className="mt-0.5 text-text italic">"{selectedRes.special_requests}"</p>
                  </div>
                )}
              </div>

              {selPkg && (
                <div className="rounded-lg border border-border p-3 space-y-1.5 bg-white">
                  <div className="flex justify-between items-center border-b border-border pb-1.5">
                    <span className="font-bold text-ink uppercase text-[11px]">Catering Package</span>
                    <span className="font-bold text-gold-dark">{formatCurrency(selPkg.price_per_pax)} / pax</span>
                  </div>
                  <p className="font-semibold text-ink">{selPkg.name}</p>
                  <p className="text-text-muted leading-relaxed text-[11px]">{selPkg.description}</p>
                </div>
              )}

              {selectedRes.rentals && selectedRes.rentals.length > 0 && (
                <div className="rounded-lg border border-border p-3 space-y-1.5 bg-white">
                  <span className="font-bold text-ink uppercase text-[11px] block border-b border-border pb-1.5">
                    Banquet Equipment Rentals
                  </span>
                  <div className="space-y-1 pt-1">
                    {selectedRes.rentals.map((r, i) => (
                      <div key={i} className="flex justify-between text-[11px]">
                        <span className="text-text">
                          {r.rental_item?.name || `Equipment #${r.rental_item_id}`} × {r.quantity}
                        </span>
                        <span className="font-semibold text-ink">{formatCurrency(r.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-ink p-4 text-white space-y-2">
                <div className="flex justify-between text-xs text-cream/70">
                  <span>Total Contract Value:</span>
                  <span className="font-bold text-base text-white">
                    {formatCurrency(selectedRes.total_amount)}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-cream/70">
                  <span>Verified Payments:</span>
                  <span className="font-semibold text-emerald-400">
                    {formatCurrency(verifiedPaid)}
                  </span>
                </div>
                <div className="flex justify-between text-xs font-bold pt-2 border-t border-ink-muted">
                  <span className="text-gold-light">Outstanding Balance:</span>
                  <span className="text-gold">{formatCurrency(remBalance)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {remBalance > 0 && selectedRes.status !== 'cancelled' && (
                  <Link to={`/customer/payments?reservationId=${selectedRes.id}`}>
                    <Button variant="gold" size="sm" className="text-xs">
                      Submit Payment
                    </Button>
                  </Link>
                )}
                <Button variant="default" onClick={() => setDetailOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </Dialog>
        );
      })()}
    </div>
  );
}

export default MyReservations;
