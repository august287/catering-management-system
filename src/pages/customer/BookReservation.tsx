import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  Utensils,
  Plus,
  Minus,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { ConfirmationModal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';
import { useCateringData } from '@/hooks/useCateringData';
import { formatCurrency } from '@/lib/utils';

export function BookReservation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { themes, packages, rentals, createReservation } = useCateringData();

  // Pre-fill from URL params if available
  const initialThemeId = searchParams.get('themeId') ? Number(searchParams.get('themeId')) : themes[0]?.id || 1;
  const initialPkgId = searchParams.get('packageId') ? Number(searchParams.get('packageId')) : packages[0]?.id || 1;

  const [step, setStep] = useState<number>(1);
  const [themeId, setThemeId] = useState<number>(initialThemeId);
  const [packageId, setPackageId] = useState<number>(initialPkgId);
  const [guestCount, setGuestCount] = useState<number>(100);

  // Rental quantities: { [rental_item_id]: quantity }
  const [selectedRentals, setSelectedRentals] = useState<Record<number, number>>({});

  // Today's date formatted as YYYY-MM-DD in local time
  const getTodayDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const today = getTodayDateString();

  // Event details
  const [eventDate, setEventDate] = useState<string>('');
  const [eventTime, setEventTime] = useState<string>('16:00');
  const [venueAddress, setVenueAddress] = useState<string>('');
  const [specialRequests, setSpecialRequests] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const selectedTheme = themes.find(t => t.id === themeId);
  const selectedPackage = packages.find(p => p.id === packageId);

  // Financial Calculations
  const packageTotal = (selectedPackage?.price_per_pax || 0) * guestCount;

  const rentalsTotal = Object.entries(selectedRentals).reduce((sum, [idStr, qty]) => {
    const item = rentals.find(r => r.id === Number(idStr));
    return sum + (item ? item.rate_per_unit * qty : 0);
  }, 0);

  const grandTotal = packageTotal + rentalsTotal;
  const requiredDownpayment = grandTotal * 0.5;

  // Rental quantity helpers
  const updateRentalQty = (rentalId: number, delta: number) => {
    setSelectedRentals(prev => {
      const current = prev[rentalId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[rentalId];
        return copy;
      }
      return { ...prev, [rentalId]: next };
    });
  };

  const handleNext = () => {
    setErrorMessage('');
    if (step === 1) {
      if (!packageId) {
        setErrorMessage('Please select a catering package.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      if (!eventDate) {
        setErrorMessage('Please pick an event date.');
        return;
      }
      if (eventDate <= today) {
        setErrorMessage('Event date must be a future date. You cannot book for today or a past date.');
        return;
      }
      if (!venueAddress.trim()) {
        setErrorMessage('Please specify the event venue address.');
        return;
      }
      if (selectedPackage && guestCount < selectedPackage.min_pax) {
        setErrorMessage(`This package requires a minimum of ${selectedPackage.min_pax} guests.`);
        return;
      }
      setStep(4);
    }
  };

  const handleSubmitBooking = async () => {
    if (!profile) {
      setErrorMessage('You must be logged in to complete a booking.');
      return;
    }

    setSubmitting(true);
    try {
      const rentalsList = Object.entries(selectedRentals).map(([idStr, qty]) => {
        const item = rentals.find(r => r.id === Number(idStr));
        return {
          rental_item_id: Number(idStr),
          quantity: qty,
          subtotal: (item ? item.rate_per_unit : 0) * qty,
        };
      });

      const res = await createReservation({
        customer_id: profile.id,
        theme_id: themeId,
        package_id: packageId,
        event_date: eventDate,
        event_time: eventTime,
        venue_address: venueAddress,
        guest_count: guestCount,
        special_requests: specialRequests,
        total_amount: grandTotal,
        rentals: rentalsList,
      });

      navigate('/customer/reservations', {
        state: { newBookingCode: res.booking_code },
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Booking submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wizard Step Progress */}
      <div className="rounded-xl border border-border bg-white p-4 shadow-card">
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {[
            { num: 1, label: 'Theme & Package' },
            { num: 2, label: 'Rentals & Add-ons' },
            { num: 3, label: 'Event Details' },
            { num: 4, label: 'Review & Submit' },
          ].map(s => (
            <div
              key={s.num}
              className={`flex flex-col items-center py-1 transition-colors ${
                step >= s.num ? 'text-ink font-bold' : 'text-text-muted font-medium'
              }`}
            >
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs mb-1.5 transition-all ${
                  step === s.num
                    ? 'bg-gold text-white font-bold ring-2 ring-gold/40'
                    : step > s.num
                    ? 'bg-ink text-cream'
                    : 'bg-cream-dark text-text-muted'
                }`}
              >
                {step > s.num ? <Check className="h-3.5 w-3.5" /> : s.num}
              </div>
              <span className="truncate max-w-[120px]">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium">
          {errorMessage}
        </div>
      )}

      {/* Step 1: Theme & Package Selection */}
      {step === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Choose Event Motif & Catering Package</CardTitle>
              <p className="text-xs text-text-muted">Select your desired styling and menu package.</p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Theme Grid */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                  Select Event Theme
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {themes.map(t => (
                    <div
                      key={t.id}
                      onClick={() => setThemeId(t.id)}
                      className={`cursor-pointer rounded-lg border p-3 transition-all ${
                        themeId === t.id
                          ? 'border-gold bg-gold-light/40 shadow-sm ring-1 ring-gold'
                          : 'border-border bg-white hover:border-text-muted'
                      }`}
                    >
                      <h4 className="font-serif text-sm font-bold text-ink">{t.name}</h4>
                      <p className="mt-1 text-[11px] text-text-muted line-clamp-1">{t.tagline}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Package Selection Cards */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                  Select Catering Package Tier
                </label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {packages.map(pkg => (
                    <div
                      key={pkg.id}
                      onClick={() => setPackageId(pkg.id)}
                      className={`cursor-pointer rounded-xl border p-5 transition-all flex flex-col justify-between ${
                        packageId === pkg.id
                          ? 'border-gold bg-gold-light/30 shadow-md ring-2 ring-gold'
                          : 'border-border bg-white hover:border-gold/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between">
                          <h4 className="font-serif text-base font-bold text-ink">{pkg.name}</h4>
                          <Badge variant="gold">Min {pkg.min_pax} pax</Badge>
                        </div>
                        <div className="mt-2 font-serif text-2xl font-bold text-gold-dark">
                          {formatCurrency(pkg.price_per_pax)}
                          <span className="text-xs font-sans font-normal text-text-muted"> / head</span>
                        </div>
                        <p className="mt-3 text-xs text-text-muted leading-relaxed">
                          {pkg.description}
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-end">
                        <span
                          className={`text-xs font-bold ${
                            packageId === pkg.id ? 'text-gold-dark' : 'text-text-muted'
                          }`}
                        >
                          {packageId === pkg.id ? '✓ Selected Package' : 'Click to select'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Rentals & Equipment Add-ons */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Add Banquet Furniture & Equipment Rentals</CardTitle>
            <p className="text-xs text-text-muted">
              Enhance your venue with gold Tiffany chairs, chafing warmers, sound systems, and linens.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {rentals.map(rental => {
                const qty = selectedRentals[rental.id] || 0;
                return (
                  <div
                    key={rental.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-white p-4 shadow-xs"
                  >
                    <div>
                      <h4 className="font-serif font-bold text-ink text-sm">{rental.name}</h4>
                      <p className="text-xs text-text-muted">
                        {formatCurrency(rental.rate_per_unit)} / piece
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateRentalQty(rental.id, -1)}
                        disabled={qty === 0}
                        className="flex h-7 w-7 items-center justify-center rounded border border-border bg-cream hover:bg-cream-dark disabled:opacity-30"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-ink">{qty}</span>
                      <button
                        type="button"
                        onClick={() => updateRentalQty(rental.id, 1)}
                        className="flex h-7 w-7 items-center justify-center rounded border border-border bg-cream hover:bg-cream-dark"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {rentalsTotal > 0 && (
              <div className="mt-4 rounded-lg bg-cream-dark/60 p-3 text-right text-xs font-semibold">
                Rentals Subtotal: <span className="font-bold text-ink">{formatCurrency(rentalsTotal)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Event Details */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Event Schedule & Venue Information</CardTitle>
            <p className="text-xs text-text-muted">
              Enter the date, call time, venue address, and guest headcount.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Event Date
                </label>
                <Input
                  type="date"
                  required
                  min={today}
                  value={eventDate}
                  onChange={e => setEventDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Call Time / Serving Time
                </label>
                <Input
                  type="time"
                  required
                  value={eventTime}
                  onChange={e => setEventTime(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Guest Count (Pax)
                </label>
                <Input
                  type="number"
                  required
                  min={selectedPackage?.min_pax || 30}
                  value={guestCount}
                  onChange={e => setGuestCount(Number(e.target.value))}
                />
                <span className="text-[11px] text-text-muted">
                  Minimum {selectedPackage?.min_pax || 30} pax for {selectedPackage?.name}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                Exact Venue Address
              </label>
              <Input
                required
                placeholder="e.g. Fernwood Gardens, QC / Clubhouse / Residence..."
                value={venueAddress}
                onChange={e => setVenueAddress(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                Special Requests / Dietary Notes (Optional)
              </label>
              <Textarea
                rows={3}
                placeholder="Allergies, preferred backdrop color palette, timeline notes..."
                value={specialRequests}
                onChange={e => setSpecialRequests(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review & Live Quote Summary */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Review Booking Summary & Contract</CardTitle>
            <p className="text-xs text-text-muted">
              Verify your booking details before submitting for management confirmation.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-lg border border-border p-4 space-y-2 bg-cream/40">
                <span className="font-bold uppercase text-text-muted block">Event Information</span>
                <p className="font-semibold text-ink text-sm">{selectedTheme?.name}</p>
                <p className="text-text">
                  Date: <span className="font-semibold">{eventDate}</span> at {eventTime}
                </p>
                <p className="text-text">
                  Venue: <span className="font-semibold">{venueAddress}</span>
                </p>
                <p className="text-text">
                  Expected Guests: <span className="font-semibold">{guestCount} pax</span>
                </p>
                {specialRequests && (
                  <p className="text-text-muted italic pt-1 border-t border-border">
                    "{specialRequests}"
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-border p-4 space-y-2 bg-cream/40">
                <span className="font-bold uppercase text-text-muted block">Package Selected</span>
                <p className="font-semibold text-ink text-sm">{selectedPackage?.name}</p>
                <p className="text-text">
                  Rate: {formatCurrency(selectedPackage?.price_per_pax)} × {guestCount} guests
                </p>
                <p className="font-bold text-ink">
                  Package Cost: {formatCurrency(packageTotal)}
                </p>
                {rentalsTotal > 0 && (
                  <p className="text-text">
                    Rentals Total: {formatCurrency(rentalsTotal)}
                  </p>
                )}
              </div>
            </div>

            {/* Financial Contract Box */}
            <div className="rounded-xl bg-ink p-6 text-white space-y-3">
              <div className="flex items-center justify-between text-sm text-cream/70">
                <span>Catering Package Subtotal ({guestCount} pax):</span>
                <span>{formatCurrency(packageTotal)}</span>
              </div>
              {rentalsTotal > 0 && (
                <div className="flex items-center justify-between text-sm text-cream/70">
                  <span>Equipment Rentals Subtotal:</span>
                  <span>{formatCurrency(rentalsTotal)}</span>
                </div>
              )}
              <div className="border-t border-ink-muted/60 pt-3 flex items-center justify-between text-base font-bold">
                <span>Total Contract Amount:</span>
                <span className="font-serif text-2xl text-white">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
              <div className="border-t border-ink-muted/60 pt-3 flex items-center justify-between text-sm font-semibold text-gold-light">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-gold" />
                  <span>Required 50% Downpayment to Confirm:</span>
                </div>
                <span className="font-serif text-lg text-gold font-bold">
                  {formatCurrency(requiredDownpayment)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-2">
        {step > 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep(step - 1)}
            className="gap-1.5 text-xs"
          >
            <ChevronLeft className="h-4 w-4" /> Previous Step
          </Button>
        ) : (
          <div />
        )}

        {step < 4 ? (
          <Button type="button" variant="gold" onClick={handleNext} className="gap-1.5 text-xs">
            Next Step <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="gold"
            onClick={() => setShowConfirm(true)}
            disabled={submitting}
            className="gap-1.5 text-sm h-11 px-6 shadow-md"
          >
            {submitting ? 'Submitting Reservation...' : 'Confirm & Submit Reservation'}
          </Button>
        )}
      </div>

      <ConfirmationModal
        open={showConfirm}
        onOpenChange={setShowConfirm}
        onConfirm={() => {
          setShowConfirm(false);
          handleSubmitBooking();
        }}
        variant="success"
        title="Submit Booking Request"
        description={`Are you sure you want to finalize this booking for ${formatCurrency(grandTotal)}? You will need to process the 50% downpayment to secure the date.`}
        confirmLabel="Confirm Booking"
        loading={submitting}
      />
    </div>
  );
}

export default BookReservation;
