import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ReservationCalendar } from '@/components/ReservationCalendar';
import { formatDate, getMinimumBookingDate } from '@/lib/utils';

export function Availability() {
  const navigate = useNavigate();
  const minEventDate = getMinimumBookingDate();
  const [picked, setPicked] = useState('');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-ink">Check Availability</h2>
        <p className="text-sm text-text-muted">
          See which dates are still open. We cater one event per day, and bookings need at least 7 days notice.
        </p>
      </div>

      <ReservationCalendar
        mode="select"
        value={picked}
        onSelect={setPicked}
        onSelectedDateTaken={() => setPicked('')}
        minBookableKey={minEventDate}
        initialMonthKey={minEventDate}
      />

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text" aria-live="polite">
          {picked ? (
            <>
              <span className="font-semibold text-emerald-700">{formatDate(picked)}</span> is available.
            </>
          ) : (
            'Pick a green date to start a booking.'
          )}
        </p>
        <Button
          variant="gold"
          disabled={!picked}
          onClick={() => navigate(`/customer/book?date=${picked}`)}
          className="gap-1.5"
        >
          <CalendarPlus className="h-4 w-4" /> Book this date
        </Button>
      </div>
    </div>
  );
}

export default Availability;
