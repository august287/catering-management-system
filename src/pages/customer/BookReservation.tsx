import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { ConfirmationModal } from '@/components/ui/Modal';
import { Dialog } from '@/components/ui/Dialog';
import { ReservationCalendar } from '@/components/ReservationCalendar';
import { getThemeImage } from '@/lib/themeImages';
import { isPlaceholderMenuImage } from '@/lib/mockData';
import {
  CourseKey,
  MenuSelection,
  describeAllowance,
  firstIncompleteCourse,
  getPackageMenuRules,
  groupMenuByCourse,
  groupSelectionForDisplay,
  menuSelectionError,
  offeredCourses,
  requiredCount,
  toMenuSelectionItems,
} from '@/lib/menuCourses';
import { RunningInvoice, InvoiceLine } from '@/components/RunningInvoice';
import { TermsContent, TermsDialog, TermsLink } from '@/components/TermsAndConditions';
import {
  EXTRA_HOUR_RATE,
  EXTRA_SERVER_RATE,
  GUESTS_PER_SERVER,
  INCLUDED_SERVICE_HOURS,
  MAX_SERVERS,
  SERVICE_HOUR_OPTIONS,
  buildPaymentSchedule,
  extraHoursCost,
  extraServersCost,
  includedServers,
  serviceEndTime,
  todayKey,
} from '@/lib/bookingTerms';
import { fetchAvailability } from '@/hooks/useDateAvailability';
import { DOUBLE_BOOKING_MESSAGE, isDateFullyBooked } from '@/lib/availability';
import { useAuth } from '@/hooks/useAuth';
import { useCateringData } from '@/hooks/useCateringData';
import {
  formatCurrency,
  getMinimumBookingDate,
  isAtLeastOneWeekAhead,
  isValidGuestCount,
  MIN_GUEST_COUNT,
  MAX_GUEST_COUNT,
  formatDate,
  formatTime,
} from '@/lib/utils';

const STEPS = [
  { num: 1, label: 'Theme & Package' },
  { num: 2, label: 'Customize Menu' },
  { num: 3, label: 'Rentals & Add-ons' },
  { num: 4, label: 'Event Details' },
  { num: 5, label: 'Review & Submit' },
];
const MENU_STEP = 2;
const DETAILS_STEP = 4;
const REVIEW_STEP = STEPS.length;

export function BookReservation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { themes, packages, rentals, menuItems, categories, createReservation } = useCateringData();

  // Pre-fill from URL params if available
  const initialThemeId = searchParams.get('themeId') ? Number(searchParams.get('themeId')) : themes[0]?.id || 1;
  const initialPkgId = searchParams.get('packageId') ? Number(searchParams.get('packageId')) : packages[0]?.id || 1;

  const [step, setStep] = useState<number>(1);
  const [themeId, setThemeId] = useState<number>(initialThemeId);
  const [packageId, setPackageId] = useState<number>(initialPkgId);
  // Kept as text so the field can be cleared while typing (a number state forced a stuck "0").
  // A pax estimate from the dashboard arrives as ?pax=150.
  const [guestInput, setGuestInput] = useState<string>(() => {
    const pax = (searchParams.get('pax') || '').replace(/\D/g, '').slice(0, 4);
    return pax || String(MIN_GUEST_COUNT);
  });
  const guestCount = guestInput === '' ? 0 : parseInt(guestInput, 10);
  const [guestTouched, setGuestTouched] = useState(false);
  const [paxPopup, setPaxPopup] = useState<string | null>(null);
  const guestInputRef = useRef<HTMLInputElement>(null);

  // Rental quantities: { [rental_item_id]: quantity }
  const [selectedRentals, setSelectedRentals] = useState<Record<number, number>>({});

  // Chosen dishes per course: { main: [9, 10, 14], ... }
  const [menuSelection, setMenuSelection] = useState<MenuSelection>({});

  // Bookings must be placed at least one week before the event date.
  const minEventDate = getMinimumBookingDate();

  // Event details
  // A date picked on the availability page arrives as ?date=YYYY-MM-DD.
  const [eventDate, setEventDate] = useState<string>(() => {
    const d = searchParams.get('date') || '';
    return /^\d{4}-\d{2}-\d{2}$/.test(d) && isAtLeastOneWeekAhead(d) ? d : '';
  });
  const [eventTime, setEventTime] = useState<string>('16:00');
  const [venueAddress, setVenueAddress] = useState<string>('');
  const [specialRequests, setSpecialRequests] = useState<string>('');
  const [serviceHours, setServiceHours] = useState<number>(INCLUDED_SERVICE_HOURS);
  // Servers on top of the ones the package includes for the guest count.
  const [extraServers, setExtraServers] = useState<number>(0);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  // Errors render above the form; on phones the user is usually at the bottom
  // pressing "Next", so bring the message into view.
  useEffect(() => {
    if (errorMessage) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [errorMessage]);

  // The picked date was booked by someone else while this page was open.
  const handleDateTaken = useCallback((key: string) => {
    setEventDate(prev => (prev === key ? '' : prev));
    setErrorMessage(DOUBLE_BOOKING_MESSAGE);
  }, []);

  const goToStep = (n: number) => {
    setErrorMessage('');
    setStep(n);
  };

  const selectedTheme = themes.find(t => t.id === themeId);
  const selectedPackage = packages.find(p => p.id === packageId);

  // Menu customization: what this package allows, and the dishes per course.
  const menuRules = useMemo(() => getPackageMenuRules(selectedPackage), [selectedPackage]);
  const menuCourses = useMemo(() => offeredCourses(menuRules), [menuRules]);
  const courseGroups = useMemo(() => groupMenuByCourse(menuItems, categories), [menuItems, categories]);
  const menuError = menuSelectionError(menuRules, menuSelection, courseGroups);
  const chosenMenu = useMemo(
    () => toMenuSelectionItems(menuRules, menuSelection, menuItems),
    [menuRules, menuSelection, menuItems]
  );

  // Switching package: keep picks that still fit the new allowance, drop the rest.
  useEffect(() => {
    setMenuSelection(prev => {
      const next: MenuSelection = {};
      for (const c of menuCourses) {
        const kept = (prev[c.key] || []).slice(0, c.count);
        if (kept.length) next[c.key] = kept;
      }
      return next;
    });
  }, [menuCourses]);

  // Progress across all courses, for the summary bar.
  const menuNeededTotal = menuCourses.reduce(
    (sum, c) => sum + requiredCount(menuRules, c.key, courseGroups[c.key].length),
    0
  );
  const menuPickedTotal = menuCourses.reduce((sum, c) => sum + (menuSelection[c.key] || []).length, 0);

  // Course to point out after "Next" with an unfinished menu.
  const [menuHighlight, setMenuHighlight] = useState<CourseKey | null>(null);

  const scrollToCourse = (course: CourseKey) => {
    const el = document.getElementById(`course-section-${course}`);
    if (!el) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    // Some browsers skip or cancel smooth scrolling; make sure the course ends up in view.
    window.setTimeout(() => {
      const top = el.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight * 0.6) el.scrollIntoView({ block: 'start' });
    }, 700);
  };

  // Show the first unfinished course instead of an error banner at the top of the page.
  const pointToIncompleteCourse = () => {
    const course = firstIncompleteCourse(menuRules, menuSelection, courseGroups);
    if (!course) return;
    setMenuHighlight(course);
    window.setTimeout(() => scrollToCourse(course), 50);
  };

  const clearCourse = (course: CourseKey) => {
    setMenuSelection(prev => {
      const next = { ...prev };
      delete next[course];
      return next;
    });
  };

  const toggleDish = (course: CourseKey, itemId: number, need: number) => {
    setErrorMessage('');
    setMenuSelection(prev => {
      const current = prev[course] || [];
      if (current.includes(itemId)) return { ...prev, [course]: current.filter(id => id !== itemId) };
      // Choose-one courses work like a radio button: picking another swaps it.
      if (need === 1) return { ...prev, [course]: [itemId] };
      if (current.length >= need) return prev;
      return { ...prev, [course]: [...current, itemId] };
    });
  };
  const minGuestCount = Math.min(
    MAX_GUEST_COUNT,
    Math.max(MIN_GUEST_COUNT, selectedPackage?.min_pax || MIN_GUEST_COUNT)
  );

  const guestCountError =
    guestInput === ''
      ? 'Please enter the number of guests.'
      : guestCount > MAX_GUEST_COUNT
      ? `Guest count cannot exceed ${MAX_GUEST_COUNT} pax.`
      : guestCount < minGuestCount
      ? `${selectedPackage?.name || 'This package'} requires at least ${minGuestCount} pax.`
      : '';

  const handleGuestChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 4);
    setGuestInput(digits);
    setGuestTouched(true);
    if (digits !== '' && parseInt(digits, 10) > MAX_GUEST_COUNT) {
      setPaxPopup(
        `We can cater a maximum of ${MAX_GUEST_COUNT} guests per event. You entered ${parseInt(digits, 10)} pax. Please lower the guest count.`
      );
    }
  };

  // Financial Calculations
  const packageTotal = (selectedPackage?.price_per_pax || 0) * guestCount;

  const rentalsTotal = Object.entries(selectedRentals).reduce((sum, [idStr, qty]) => {
    const item = rentals.find(r => r.id === Number(idStr));
    return sum + (item ? item.rate_per_unit * qty : 0);
  }, 0);

  const baseServers = includedServers(guestCount);
  const maxExtraServers = Math.max(0, MAX_SERVERS - baseServers);
  const safeExtraServers = Math.min(extraServers, maxExtraServers);
  const serverCount = baseServers + safeExtraServers;
  const hoursCost = extraHoursCost(serviceHours);
  const serversCost = extraServersCost(serverCount, guestCount);

  const grandTotal = packageTotal + rentalsTotal + hoursCost + serversCost;
  const requiredDownpayment = Math.round(grandTotal * 0.5 * 100) / 100;
  const paymentSchedule = eventDate
    ? buildPaymentSchedule(grandTotal, todayKey(), eventDate)
    : [];

  // Lines for the running invoice, rebuilt on every change.
  // Guests change in steps of 5 from the invoice (type an exact number in step 1).
  const PAX_STEP = 5;
  const stepGuests = (delta: number) => {
    const base = guestCount || minGuestCount;
    const next = Math.min(MAX_GUEST_COUNT, Math.max(minGuestCount, base + delta));
    setGuestInput(String(next));
    setGuestTouched(true);
  };

  const invoiceLines: InvoiceLine[] = [
    {
      id: 'package',
      label: selectedPackage?.name || 'Catering package',
      detail: `${formatCurrency(selectedPackage?.price_per_pax || 0)} × ${guestCount || 0} pax`,
      amount: packageTotal,
      stepper: {
        value: guestCount || 0,
        unit: 'pax',
        step: PAX_STEP,
        onIncrement: () => stepGuests(PAX_STEP),
        onDecrement: () => stepGuests(-PAX_STEP),
        canIncrement: guestCount < MAX_GUEST_COUNT,
        canDecrement: guestCount > minGuestCount,
      },
    },
    ...Object.entries(selectedRentals).map(([idStr, qty]): InvoiceLine => {
      const id = Number(idStr);
      const item = rentals.find(r => r.id === id);
      const stock = item?.stock_quantity ?? qty;
      return {
        id: `rental-${id}`,
        label: item?.name || 'Rental',
        detail: `${formatCurrency(item?.rate_per_unit || 0)} × ${qty}`,
        amount: (item?.rate_per_unit || 0) * qty,
        stepper: {
          value: qty,
          unit: 'pcs',
          onIncrement: () => updateRentalQty(id, 1),
          onDecrement: () => updateRentalQty(id, -1),
          canIncrement: qty < stock,
          canDecrement: qty > 0,
        },
        onRemove: () => updateRentalQty(id, -qty),
      };
    }),
    {
      id: 'hours',
      label: 'Hours of service',
      detail:
        hoursCost > 0
          ? `${serviceHours - INCLUDED_SERVICE_HOURS} extra × ${formatCurrency(EXTRA_HOUR_RATE)}`
          : `${INCLUDED_SERVICE_HOURS} hrs included`,
      amount: hoursCost,
      included: hoursCost === 0,
      stepper: {
        value: serviceHours,
        unit: 'hrs',
        onIncrement: () => setServiceHours(h => Math.min(SERVICE_HOUR_OPTIONS[SERVICE_HOUR_OPTIONS.length - 1], h + 1)),
        onDecrement: () => setServiceHours(h => Math.max(INCLUDED_SERVICE_HOURS, h - 1)),
        canIncrement: serviceHours < SERVICE_HOUR_OPTIONS[SERVICE_HOUR_OPTIONS.length - 1],
        canDecrement: serviceHours > INCLUDED_SERVICE_HOURS,
      },
    },
    {
      id: 'servers',
      label: 'Servers (waitstaff)',
      detail:
        serversCost > 0
          ? `${baseServers} included + ${safeExtraServers} extra × ${formatCurrency(EXTRA_SERVER_RATE)}`
          : `1 per ${GUESTS_PER_SERVER} guests included`,
      amount: serversCost,
      included: serversCost === 0,
      stepper: {
        value: serverCount,
        unit: 'staff',
        onIncrement: () => setExtraServers(Math.min(maxExtraServers, safeExtraServers + 1)),
        onDecrement: () => setExtraServers(Math.max(0, safeExtraServers - 1)),
        canIncrement: safeExtraServers < maxExtraServers,
        canDecrement: safeExtraServers > 0,
      },
    },
  ];

  // Rentals were already chosen in step 3; let customers jump back to add more.
  const invoiceFooter =
    step > 3 ? (
      <button
        type="button"
        onClick={() => goToStep(3)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-gold-dark hover:underline"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add rentals & add-ons
      </button>
    ) : undefined;

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

  // Typed quantity: digits only, capped at available stock.
  const setRentalQty = (rentalId: number, raw: string, stock: number) => {
    const digits = raw.replace(/\D/g, '');
    const next = digits === '' ? 0 : Math.min(stock, parseInt(digits, 10));
    setSelectedRentals(prev => {
      const copy = { ...prev };
      if (next <= 0) delete copy[rentalId];
      else copy[rentalId] = next;
      return copy;
    });
  };

  const handleNext = async () => {
    setErrorMessage('');
    if (step === 1) {
      if (!packageId) {
        setErrorMessage('Please select a catering package.');
        return;
      }
      if (guestCountError || !isValidGuestCount(guestCount)) {
        setGuestTouched(true);
        setPaxPopup(
          guestCountError ||
            `Guest count must be between ${MIN_GUEST_COUNT} and ${MAX_GUEST_COUNT} pax.`
        );
        return;
      }
      setStep(MENU_STEP);
    } else if (step === MENU_STEP) {
      if (menuError) {
        pointToIncompleteCourse();
        return;
      }
      setMenuHighlight(null);
      setStep(3);
    } else if (step === 3) {
      setStep(DETAILS_STEP);
    } else if (step === DETAILS_STEP) {
      if (!eventDate) {
        setErrorMessage('Please pick an event date.');
        return;
      }
      if (!isAtLeastOneWeekAhead(eventDate)) {
        setErrorMessage(
          'Reservations must be booked at least 1 week (7 days) before the event date. Please choose a later date.'
        );
        return;
      }
      if (!venueAddress.trim()) {
        setErrorMessage('Please specify the event venue address.');
        return;
      }
      try {
        const latest = await fetchAvailability(eventDate, eventDate);
        if (isDateFullyBooked(latest, eventDate)) {
          setEventDate('');
          setErrorMessage(DOUBLE_BOOKING_MESSAGE);
          return;
        }
      } catch {
        // Offline check failed; the save step re-checks and the database blocks overlaps.
      }
      if (guestCountError || !isValidGuestCount(guestCount)) {
        setStep(1);
        setGuestTouched(true);
        setPaxPopup(
          guestCountError ||
            `Guest count must be between ${MIN_GUEST_COUNT} and ${MAX_GUEST_COUNT} pax.`
        );
        return;
      }
      setStep(REVIEW_STEP);
    }
  };

  const handleSubmitBooking = async () => {
    if (!profile) {
      setErrorMessage('You must be logged in to complete a booking.');
      return;
    }

    if (menuError) {
      setStep(MENU_STEP);
      pointToIncompleteCourse();
      return;
    }

    if (!isAtLeastOneWeekAhead(eventDate)) {
      setStep(DETAILS_STEP);
      setErrorMessage(
        'Reservations must be booked at least 1 week (7 days) before the event date. Please choose a later date.'
      );
      return;
    }

    if (!termsAccepted) {
      setErrorMessage('Please read and agree to the Terms & Conditions before submitting.');
      return;
    }

    if (guestCountError || !isValidGuestCount(guestCount)) {
      setStep(1);
      setGuestTouched(true);
      setPaxPopup(
        guestCountError ||
          `Guest count must be between ${MIN_GUEST_COUNT} and ${MAX_GUEST_COUNT} pax.`
      );
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
        menu_selection: chosenMenu,
        service_hours: serviceHours,
        server_count: serverCount,
        terms_accepted: termsAccepted,
      });

      navigate('/customer/reservations', {
        state: { newBookingCode: res.booking_code },
      });
    } catch (err: any) {
      const message = err.message || 'Booking submission failed. Please try again.';
      if (message === DOUBLE_BOOKING_MESSAGE) {
        setEventDate('');
        setStep(DETAILS_STEP);
      }
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Wizard Step Progress */}
      <nav aria-label="Booking progress" className="rounded-xl border border-border bg-white p-4 shadow-card">
        <p className="mb-3 text-center text-xs font-semibold text-text-muted sm:hidden">
          Step {step} of {STEPS.length}: <span className="text-ink">{STEPS[step - 1].label}</span>
        </p>
        <ol className="grid grid-cols-5 gap-1 text-center text-xs sm:gap-2">
          {STEPS.map(s => {
            const isDone = step > s.num;
            const isCurrent = step === s.num;
            return (
              <li key={s.num}>
                <button
                  type="button"
                  onClick={() => isDone && goToStep(s.num)}
                  disabled={!isDone}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-label={`Step ${s.num}: ${s.label}${isDone ? ' (completed, go back)' : isCurrent ? ' (current)' : ''}`}
                  className={`flex w-full flex-col items-center rounded-lg py-1 transition-colors disabled:cursor-default ${
                    step >= s.num ? 'text-ink font-bold' : 'text-text-muted font-medium'
                  } ${isDone ? 'hover:bg-cream' : ''}`}
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-all sm:mb-1.5 ${
                      isCurrent
                        ? 'bg-gold text-white font-bold ring-2 ring-gold/40'
                        : isDone
                        ? 'bg-ink text-cream'
                        : 'bg-cream-dark text-text-muted'
                    }`}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : s.num}
                  </span>
                  <span className="hidden sm:block">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {errorMessage && (
        <div
          ref={errorRef}
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 font-medium scroll-mt-4"
        >
          <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      {/* Running invoice: sidebar on desktop, above the step on phones/tablets. */}
      <aside className="lg:order-2 lg:sticky lg:top-4">
        <details className="group lg:hidden rounded-xl border border-border bg-white shadow-card" >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm">
            <span className="font-semibold text-ink">Running Invoice</span>
            <span className="flex items-center gap-2">
              <span className="font-num font-extrabold tabular-nums text-ink">{formatCurrency(grandTotal)}</span>
              <ChevronRight className="h-4 w-4 text-text-muted transition-transform group-open:rotate-90" aria-hidden="true" />
            </span>
          </summary>
          <RunningInvoice lines={invoiceLines} total={grandTotal} heading={`${guestCount || 0} pax`} footerAction={invoiceFooter} className="rounded-none border-0 border-t shadow-none" />
        </details>
        <RunningInvoice
          lines={invoiceLines}
          total={grandTotal}
          heading={`${selectedTheme?.name || 'Event'} · ${guestCount || 0} pax`}
          footerAction={invoiceFooter}
          className="hidden lg:block"
        />
      </aside>

      <div className="min-w-0 space-y-6 lg:order-1">
      {/* Step 1: Theme & Package Selection */}
      {step === 1 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Choose Event Motif, Guests & Catering Package</CardTitle>
              <p className="text-xs text-text-muted">
                Enter your number of guests first. Every package price is calculated for you automatically.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Guest count drives every price on this page. */}
              <div className="rounded-xl border border-gold/40 bg-gold-light/20 p-4">
                <label htmlFor="guest-count" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Number of Guests (Pax)
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                  <div className="sm:w-48">
                    <Input id="guest-count"
                      ref={guestInputRef}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      required
                      value={guestInput}
                      onChange={e => handleGuestChange(e.target.value)}
                      onBlur={() => setGuestTouched(true)}
                      placeholder={`${minGuestCount}–${MAX_GUEST_COUNT}`}
                      aria-invalid={guestTouched && !!guestCountError}
                      aria-describedby="guest-count-help"
                      className={`text-base font-bold ${
                        guestTouched && guestCountError
                          ? 'border-red-500 ring-2 ring-red-500/40 focus-visible:border-red-500 focus-visible:ring-red-500'
                          : ''
                      }`}
                    />
                  </div>
                  <div className="text-xs text-text-muted sm:pt-2">
                    <span
                      id="guest-count-help"
                      className={guestTouched && guestCountError ? 'font-semibold text-red-600' : ''}
                    >
                      {guestTouched && guestCountError
                        ? guestCountError
                        : `Between ${minGuestCount} and ${MAX_GUEST_COUNT} pax${selectedPackage ? ` for ${selectedPackage.name}` : ''}.`}
                    </span>
                    {!guestCountError && (
                      <span className="mt-0.5 block font-semibold text-ink">
                        {baseServers} servers included · {selectedPackage?.name}: {formatCurrency(packageTotal)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Theme Grid */}
              <div>
                <p id="theme-label" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                  Select Event Theme
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="group" aria-labelledby="theme-label">
                  {themes.map(t => (
                    <button
                      type="button"
                      key={t.id}
                      onClick={() => setThemeId(t.id)}
                      aria-pressed={themeId === t.id}
                      className={`cursor-pointer overflow-hidden rounded-lg border p-3 text-left transition-all ${
                        themeId === t.id
                          ? 'border-gold bg-gold-light/40 shadow-sm ring-1 ring-gold'
                          : 'border-border bg-white hover:border-text-muted'
                      }`}
                    >
                      <img
                        src={getThemeImage(t)}
                        alt=""
                        className="-mx-3 -mt-3 mb-2.5 h-20 w-[calc(100%+1.5rem)] max-w-none object-cover"
                        loading="lazy"
                      />
                      <h4 className="font-serif text-sm font-bold text-ink">{t.name}</h4>
                      <p className="mt-1 text-[11px] text-text-muted line-clamp-1">{t.tagline}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Package Selection Cards */}
              <div>
                <p id="package-label" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-3">
                  Select Catering Package Tier
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" role="group" aria-labelledby="package-label">
                  {packages.map(pkg => (
                    <button
                      type="button"
                      key={pkg.id}
                      onClick={() => setPackageId(pkg.id)}
                      aria-pressed={packageId === pkg.id}
                      className={`cursor-pointer rounded-xl border p-4 text-left transition-all flex flex-col justify-between sm:p-5 ${
                        packageId === pkg.id
                          ? 'border-gold bg-gold-light/30 shadow-md ring-2 ring-gold'
                          : 'border-border bg-white hover:border-gold/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-serif text-base font-bold text-ink">{pkg.name}</h4>
                          <Badge variant="gold">
                            {`${Math.min(MAX_GUEST_COUNT, Math.max(MIN_GUEST_COUNT, pkg.min_pax))}–${MAX_GUEST_COUNT} pax`}
                          </Badge>
                        </div>
                        <div className="mt-2 font-serif text-2xl font-bold text-gold-dark">
                          {formatCurrency(pkg.price_per_pax)}
                          <span className="text-xs font-sans font-normal text-text-muted"> / head</span>
                        </div>
                        {guestCount > 0 && (
                          <p className="mt-1 text-xs text-text-muted">
                            × {guestCount} pax ={' '}
                            <span className="font-bold text-ink">{formatCurrency(pkg.price_per_pax * guestCount)}</span>
                          </p>
                        )}
                        <p className="mt-3 text-sm text-text-muted leading-relaxed">
                          {pkg.description}
                        </p>
                        {describeAllowance(getPackageMenuRules(pkg)) && (
                          <p className="mt-2 text-xs font-semibold text-gold-dark">
                            You choose: {describeAllowance(getPackageMenuRules(pkg))}
                          </p>
                        )}
                      </div>
                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-end">
                        <span
                          className={`text-xs font-bold ${
                            packageId === pkg.id ? 'text-gold-dark' : 'text-text-muted'
                          }`}
                        >
                          {packageId === pkg.id ? '✓ Selected Package' : 'Tap to select'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Customize Menu */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: Customize Your Menu</CardTitle>
            <p className="text-xs text-text-muted">
              Choose your dishes for <span className="font-semibold text-ink">{selectedPackage?.name}</span>. Tap a dish to
              add or remove it.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {menuCourses.length === 0 && (
              <p className="rounded-lg border border-border bg-cream/40 p-4 text-sm text-text-muted">
                This package has a fixed menu, so there's nothing to choose. Continue to the next step.
              </p>
            )}

            {/* Progress summary: stays visible while scrolling; chips jump to a course. */}
            {menuCourses.length > 0 && (
              <div className="sticky -top-4 z-20 -mx-4 border-b border-border bg-white px-4 py-3 shadow-sm sm:-top-6 sm:-mx-6 sm:px-6 lg:-top-8">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-ink" aria-live="polite">
                    {menuPickedTotal} of {menuNeededTotal} dishes chosen
                  </span>
                  {menuPickedTotal === menuNeededTotal ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" /> Menu complete
                    </span>
                  ) : (
                    <span className="text-text-muted">{menuNeededTotal - menuPickedTotal} left</span>
                  )}
                </div>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream-dark"
                  role="progressbar"
                  aria-label="Menu progress"
                  aria-valuemin={0}
                  aria-valuemax={menuNeededTotal}
                  aria-valuenow={menuPickedTotal}
                >
                  <div
                    className="h-full rounded-full bg-gold transition-all duration-300"
                    style={{ width: `${menuNeededTotal ? (menuPickedTotal / menuNeededTotal) * 100 : 100}%` }}
                  />
                </div>
                <nav
                  aria-label="Jump to course"
                  className="mt-2.5 flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                  {menuCourses.map(c => {
                    const need = requiredCount(menuRules, c.key, courseGroups[c.key].length);
                    const got = (menuSelection[c.key] || []).length;
                    const done = got === need;
                    return (
                      <button
                        key={c.key}
                        type="button"
                        onClick={() => scrollToCourse(c.key)}
                        className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                          done
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                            : 'border-border bg-white text-text-muted hover:border-gold'
                        }`}
                      >
                        {done && <Check className="h-3 w-3" aria-hidden="true" />}
                        {c.label} {got}/{need}
                      </button>
                    );
                  })}
                </nav>
              </div>
            )}

            {menuCourses.length > 0 && (
              <p className="text-xs text-text-muted">
                Tap a dish to add it, and tap it again to remove it. For courses where you pick one, tapping another dish
                swaps it.
              </p>
            )}

            {menuCourses.map(course => {
              const options = courseGroups[course.key];
              const picked = menuSelection[course.key] || [];
              const need = requiredCount(menuRules, course.key, options.length);
              const full = picked.length >= need;
              const done = picked.length === need;
              const highlighted = menuHighlight === course.key && !done;
              const pickedNames = options.filter(i => picked.includes(i.id)).map(i => i.name);
              return (
                <section
                  key={course.key}
                  id={`course-section-${course.key}`}
                  aria-labelledby={`course-${course.key}`}
                  className={`scroll-mt-36 rounded-xl border p-3 transition-colors sm:p-4 ${
                    highlighted ? 'border-red-300 bg-red-50/40 ring-2 ring-red-200' : 'border-transparent'
                  }`}
                >
                  <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                    <h3 id={`course-${course.key}`} className="font-serif text-base font-bold text-ink">
                      {course.label}
                      <span className="ml-2 align-middle text-xs font-sans font-semibold text-text-muted">
                        Choose {need}
                      </span>
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant={done ? 'completed' : 'default'}>
                        {done && <Check className="mr-1 h-3 w-3" aria-hidden="true" />}
                        {picked.length}/{need}
                      </Badge>
                      {picked.length > 0 && (
                        <button
                          type="button"
                          onClick={() => clearCourse(course.key)}
                          className="text-xs font-semibold text-text-muted underline-offset-2 hover:text-ink hover:underline"
                          aria-label={`Clear ${course.label} choices`}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* What's chosen so far (no need to scan the cards). */}
                  <p className="mb-3 min-h-[1rem] text-xs text-text-muted" aria-live="polite">
                    {pickedNames.length > 0 ? (
                      <>
                        <span className="font-semibold text-text">Chosen:</span> {pickedNames.join(', ')}
                      </>
                    ) : (
                      'Nothing chosen yet.'
                    )}
                  </p>

                  {highlighted && (
                    <p role="alert" className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-red-700">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      Choose {need - picked.length} more {need - picked.length === 1 ? course.one : course.many} to continue.
                    </p>
                  )}

                  {full && need > 1 && (
                    <p className="mb-3 text-[11px] text-text-faint">
                      All {need} chosen. Tap a chosen dish to remove it if you want to swap.
                    </p>
                  )}

                  {options.length === 0 ? (
                    <p className="text-xs text-text-muted">No dishes are available for this course right now.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2" role="group" aria-label={`${course.label} choices`}>
                      {options.map(item => {
                        const isPicked = picked.includes(item.id);
                        const disabled = !isPicked && full && need > 1;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleDish(course.key, item.id, need)}
                            aria-pressed={isPicked}
                            disabled={disabled}
                            title={disabled ? `You've chosen ${need}. Remove one to pick this.` : undefined}
                            className={`flex items-center gap-3 rounded-lg border p-2.5 text-left transition-all ${
                              isPicked
                                ? 'border-gold bg-gold-light/40 ring-1 ring-gold'
                                : 'border-border bg-white hover:border-gold/60'
                            } disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:border-border`}
                          >
                            {/* Only real food photos help people recognise a dish; skip the stand-in event photos. */}
                            {!isPlaceholderMenuImage(item.image_url) && (
                              <img
                                src={item.image_url!}
                                alt=""
                                className="h-14 w-14 shrink-0 rounded-md object-cover"
                                loading="lazy"
                              />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-ink">{item.name}</span>
                              {item.description && (
                                <span className="mt-0.5 block text-xs leading-relaxed text-text-muted line-clamp-2">
                                  {item.description}
                                </span>
                              )}
                            </span>
                            <span
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                isPicked ? 'border-gold bg-gold text-white' : 'border-border bg-white'
                              }`}
                              aria-hidden="true"
                            >
                              {isPicked && <Check className="h-3 w-3" />}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              );
            })}

            {(menuRules.included || []).length > 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Also included</p>
                <ul className="mt-2 space-y-1">
                  {(menuRules.included || []).map(inc => (
                    <li key={inc} className="flex items-center gap-2 text-sm text-emerald-900">
                      <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {inc}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Rentals & Equipment Add-ons */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: Add Banquet Furniture & Equipment Rentals</CardTitle>
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
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white p-4 shadow-xs"
                  >
                    {rental.image_url && (
                      <img
                        src={rental.image_url}
                        alt=""
                        loading="lazy"
                        className="h-16 w-16 shrink-0 rounded-md object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-serif font-bold text-ink text-sm">{rental.name}</h4>
                      <p className="text-xs text-text-muted">
                        {formatCurrency(rental.rate_per_unit)} / piece
                      </p>
                      <p className="text-[11px] text-text-faint">{rental.stock_quantity} available</p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => updateRentalQty(rental.id, -1)}
                        disabled={qty === 0}
                        aria-label={`Remove one ${rental.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-cream hover:bg-cream-dark disabled:opacity-30 sm:h-8 sm:w-8"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={qty === 0 ? '' : String(qty)}
                        placeholder="0"
                        onChange={e => setRentalQty(rental.id, e.target.value, rental.stock_quantity)}
                        onFocus={e => e.target.select()}
                        aria-label={`Quantity of ${rental.name} (max ${rental.stock_quantity})`}
                        className="h-9 w-14 rounded-md border border-border bg-white text-center text-sm font-bold text-ink placeholder:text-text-faint focus-visible:border-gold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold sm:h-8"
                      />
                      <button
                        type="button"
                        onClick={() => updateRentalQty(rental.id, 1)}
                        disabled={qty >= rental.stock_quantity}
                        aria-label={`Add one ${rental.name}`}
                        className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-cream hover:bg-cream-dark disabled:opacity-30 sm:h-8 sm:w-8"
                      >
                        <Plus className="h-3.5 w-3.5" />
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

      {/* Step 4: Event Details */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 4: Event Schedule & Venue Information</CardTitle>
            <p className="text-xs text-text-muted">
              Enter the date, serving time, hours of service, servers, and venue address.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                <span id="event-date-label" className="block text-xs font-bold uppercase tracking-wider text-text-muted">
                  Event Date
                </span>
                <span className="text-xs font-semibold text-ink" aria-live="polite">
                  {eventDate ? `Selected: ${formatDate(eventDate)}` : 'No date selected'}
                </span>
              </div>
              <ReservationCalendar
                mode="select"
                value={eventDate}
                onSelect={key => {
                  setEventDate(key);
                  setErrorMessage('');
                }}
                onSelectedDateTaken={handleDateTaken}
                minBookableKey={minEventDate}
                initialMonthKey={eventDate || minEventDate}
              />
              <span className="mt-1.5 block text-[11px] text-text-muted">
                Availability updates live. Dates must be at least 1 week (7 days) from today, and we cater one event per day.
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <div>
                <label htmlFor="event-time" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Call Time / Serving Time
                </label>
                <Input id="event-time"
                  type="time"
                  required
                  value={eventTime}
                  onChange={e => setEventTime(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="service-hours" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                  Hours of Service
                </label>
                <select
                  id="service-hours"
                  value={serviceHours}
                  onChange={e => setServiceHours(Number(e.target.value))}
                  className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm text-ink focus-visible:border-gold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
                >
                  {SERVICE_HOUR_OPTIONS.map(h => (
                    <option key={h} value={h}>
                      {h} hours
                      {h === INCLUDED_SERVICE_HOURS
                        ? ' (included)'
                        : ` (+${formatCurrency(extraHoursCost(h))})`}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] text-text-muted">
                  Service from {formatTime(eventTime)} to {formatTime(serviceEndTime(eventTime, serviceHours))}.{' '}
                  {INCLUDED_SERVICE_HOURS} hrs included; extra hours {formatCurrency(EXTRA_HOUR_RATE)}/hr.
                </span>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-cream/40 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span id="servers-label" className="block text-xs font-bold uppercase tracking-wider text-text-muted">
                    Number of Servers (Waitstaff)
                  </span>
                  <p className="mt-1 text-[11px] text-text-muted">
                    {baseServers} servers included for {guestCount} guests (1 per {GUESTS_PER_SERVER}). Extra servers{' '}
                    {formatCurrency(EXTRA_SERVER_RATE)} each.
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5" role="group" aria-labelledby="servers-label">
                  <button
                    type="button"
                    onClick={() => setExtraServers(Math.max(0, safeExtraServers - 1))}
                    disabled={safeExtraServers === 0}
                    aria-label="Remove one extra server"
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-white hover:bg-cream-dark disabled:opacity-30"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-12 text-center font-serif text-lg font-bold text-ink" aria-live="polite">
                    {serverCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExtraServers(Math.min(maxExtraServers, safeExtraServers + 1))}
                    disabled={safeExtraServers >= maxExtraServers}
                    aria-label="Add one extra server"
                    className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-white hover:bg-cream-dark disabled:opacity-30"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              {safeExtraServers > 0 && (
                <p className="mt-2 text-right text-xs font-semibold text-ink">
                  +{safeExtraServers} extra = {formatCurrency(serversCost)}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="venue-address" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                Exact Venue Address
              </label>
              <Input id="venue-address"
                required
                placeholder="e.g. Fernwood Gardens, QC / Clubhouse / Residence..."
                value={venueAddress}
                onChange={e => setVenueAddress(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="special-requests" className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                Special Requests / Dietary Notes (Optional)
              </label>
              <Textarea id="special-requests"
                rows={3}
                placeholder="Allergies, preferred backdrop color palette, timeline notes..."
                value={specialRequests}
                onChange={e => setSpecialRequests(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Review & Live Quote Summary */}
      {step === 5 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 5: Review Booking Summary & Contract</CardTitle>
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
                  Date: <span className="font-semibold">{formatDate(eventDate)}</span> at {formatTime(eventTime)}
                </p>
                <p className="text-text">
                  Venue: <span className="font-semibold">{venueAddress}</span>
                </p>
                <p className="text-text">
                  Expected Guests: <span className="font-semibold">{guestCount} pax</span>
                </p>
                <p className="text-text">
                  Hours of Service:{' '}
                  <span className="font-semibold">
                    {serviceHours} hrs ({formatTime(eventTime)} – {formatTime(serviceEndTime(eventTime, serviceHours))})
                  </span>
                </p>
                <p className="text-text">
                  Servers: <span className="font-semibold">{serverCount} waitstaff</span>
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

            {/* Chosen menu */}
            {(chosenMenu.length > 0 || (menuRules.included || []).length > 0) && (
              <div className="rounded-lg border border-border p-4 bg-cream/40 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold uppercase text-text-muted">Your Menu</span>
                  <button
                    type="button"
                    onClick={() => goToStep(MENU_STEP)}
                    className="text-xs font-semibold text-gold hover:underline"
                  >
                    Change
                  </button>
                </div>
                <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                  {groupSelectionForDisplay(chosenMenu).map(g => (
                    <div key={g.label}>
                      <dt className="font-semibold text-ink">{g.label}</dt>
                      <dd className="text-sm text-text">{g.names.join(', ')}</dd>
                    </div>
                  ))}
                  {(menuRules.included || []).length > 0 && (
                    <div>
                      <dt className="font-semibold text-ink">Included</dt>
                      <dd className="text-sm text-text">{(menuRules.included || []).join(', ')}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {/* Financial Contract Box */}
            <div className="rounded-xl bg-ink p-4 text-white space-y-3 sm:p-6">
              {invoiceLines.map(line => (
                <div key={line.id || line.label} className="flex items-start justify-between gap-4 text-sm text-cream/70">
                  <span>
                    {line.label}
                    {line.detail && <span className="block font-num text-[11px] tabular-nums text-cream/50">{line.detail}</span>}
                  </span>
                  <span className="font-num font-semibold tabular-nums">{line.included ? 'Included' : formatCurrency(line.amount)}</span>
                </div>
              ))}
              <div className="border-t border-ink-muted/60 pt-3 flex flex-wrap items-center justify-between gap-x-4 text-base font-bold">
                <span>Total Contract Amount:</span>
                <span className="font-num text-2xl font-extrabold tabular-nums text-white">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
              <div className="border-t border-ink-muted/60 pt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm font-semibold text-gold-light">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-gold" />
                  <span>Required 50% Downpayment to Confirm:</span>
                </div>
                <span className="font-num text-lg font-extrabold tabular-nums text-gold">
                  {formatCurrency(requiredDownpayment)}
                </span>
              </div>
            </div>

            {/* Payment schedule */}
            {paymentSchedule.length > 0 && (
              <div className="rounded-lg border border-border p-4 text-xs">
                <span className="font-bold uppercase text-text-muted">Payment Schedule</span>
                <table className="mt-2 w-full text-left">
                  <thead className="text-[11px] uppercase text-text-muted">
                    <tr>
                      <th className="py-1 font-semibold">Payment</th>
                      <th className="py-1 font-semibold">Due date</th>
                      <th className="py-1 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paymentSchedule.map(item => (
                      <tr key={item.key}>
                        <td className="py-2 font-semibold text-ink">{item.label}</td>
                        <td className="py-2 text-text">On or before {formatDate(item.dueDate)}</td>
                        <td className="py-2 text-right font-bold text-ink">{formatCurrency(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[11px] text-text-muted">
                  Your date is reserved only after the down payment is verified. You may also pay the full amount at once.
                </p>
              </div>
            )}

            {/* Terms & conditions: shown in full, must be accepted */}
            <div className="rounded-lg border border-border">
              <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                <span className="text-xs font-bold uppercase text-text-muted">Terms & Conditions</span>
                <TermsLink onClick={() => setTermsOpen(true)} label="Open full view" />
              </div>
              <div className="max-h-64 overflow-y-auto px-4 py-3">
                <TermsContent />
              </div>
              <label
                className={`flex cursor-pointer items-start gap-3 border-t px-4 py-3 text-sm ${
                  termsAccepted ? 'border-emerald-200 bg-emerald-50' : 'border-border bg-cream/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={e => {
                    setTermsAccepted(e.target.checked);
                    setErrorMessage('');
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#a9822f]"
                />
                <span className="text-text">
                  I have read and agree to the Terms & Conditions, the payment schedule, and the total contract amount of{' '}
                  <strong className="text-ink">{formatCurrency(grandTotal)}</strong>.
                </span>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:items-center sm:justify-between">
        {step > 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => goToStep(step - 1)}
            className="gap-1.5 text-xs"
          >
            <ChevronLeft className="h-4 w-4" /> Previous Step
          </Button>
        ) : (
          <div className="hidden sm:block" />
        )}

        {step < REVIEW_STEP ? (
          <Button type="button" variant="gold" onClick={handleNext} className="h-11 gap-1.5 text-sm sm:h-10 sm:text-xs">
            Next Step <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            variant="gold"
            onClick={() => {
              if (!termsAccepted) {
                setErrorMessage('Please read and agree to the Terms & Conditions before submitting.');
                return;
              }
              setShowConfirm(true);
            }}
            disabled={submitting}
            className="gap-1.5 text-sm h-11 px-6 shadow-md"
          >
            {submitting ? 'Submitting Reservation...' : 'Confirm & Submit Reservation'}
          </Button>
        )}
      </div>
      </div>
      </div>

      <TermsDialog open={termsOpen} onOpenChange={setTermsOpen} onAgree={() => setTermsAccepted(true)} />

      <Dialog
        open={paxPopup !== null}
        onOpenChange={open => {
          if (!open) {
            setPaxPopup(null);
            window.setTimeout(() => guestInputRef.current?.focus(), 0);
          }
        }}
        className="max-w-md"
      >
        <div className="flex flex-col items-center text-center" role="alertdialog" aria-labelledby="pax-popup-title">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <Users className="h-7 w-7 text-red-600" aria-hidden="true" />
          </div>
          <h3 id="pax-popup-title" className="mt-4 font-serif text-lg font-bold text-ink">
            Invalid Guest Count
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">{paxPopup}</p>
          <p className="mt-1 text-xs font-semibold text-ink">
            Allowed: {minGuestCount}–{MAX_GUEST_COUNT} pax
          </p>
          <Button
            variant="gold"
            className="mt-6 w-full"
            onClick={() => {
              setPaxPopup(null);
              window.setTimeout(() => guestInputRef.current?.focus(), 0);
            }}
          >
            OK, I'll fix it
          </Button>
        </div>
      </Dialog>

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
