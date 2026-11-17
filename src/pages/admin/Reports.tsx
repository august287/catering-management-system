import React from 'react';
import { ArrowDownRight, ArrowUpRight, Lightbulb, Minus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { EventsDonutChart, ComparisonBarChart } from '@/components/Charts';
import { useCateringData } from '@/hooks/useCateringData';
import { formatCurrency } from '@/lib/utils';
import { PAYMENT_METHOD_LABELS } from '@/lib/paymentLabels';
import type { PaymentMethod } from '@/types/database';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fullMonthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Percent change from prev to cur; null when there is no earlier value to compare to. */
function pctChange(cur: number, prev: number): number | null {
  if (prev === 0) return cur === 0 ? 0 : null;
  return ((cur - prev) / prev) * 100;
}

function Delta({ value, label }: { value: number | null; label: string }) {
  if (value === null) {
    return <span className="text-xs font-medium text-text-muted">New activity · no {label} data</span>;
  }
  const up = value > 0.05;
  const down = value < -0.05;
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : Minus;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
        up ? 'text-emerald-700' : down ? 'text-red-700' : 'text-text-muted'
      }`}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {up ? '+' : ''}
      {value.toFixed(1)}% vs {label}
    </span>
  );
}

/** Plain-language reading of a chart or metric. */
function Interpretation({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 flex gap-2 rounded-lg border border-gold/30 bg-gold-light/20 p-3 text-xs leading-relaxed text-text">
      <Lightbulb className="mt-px h-4 w-4 shrink-0 text-gold-dark" aria-hidden="true" />
      <p>
        <span className="font-bold text-ink">Interpretation: </span>
        {children}
      </p>
    </div>
  );
}

function KpiCard({
  title,
  value,
  delta,
  deltaLabel,
  note,
}: {
  title: string;
  value: string;
  /** Omit for metrics that have no earlier period to compare with. */
  delta?: number | null;
  deltaLabel?: string;
  note: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">{title}</span>
        <div className="mt-2 font-serif text-2xl font-bold text-ink">{value}</div>
        {delta !== undefined && (
          <div className="mt-1">
            <Delta value={delta} label={deltaLabel || 'last period'} />
          </div>
        )}
        <p className="mt-2 border-t border-border pt-2 text-[11px] leading-relaxed text-text-muted">{note}</p>
      </CardContent>
    </Card>
  );
}

export function Reports() {
  const { reservations, payments, packages, themes } = useCateringData();

  const now = new Date();
  const thisYear = now.getFullYear();
  const lastYear = thisYear - 1;
  const thisMonth = now.getMonth();
  const prevMonthDate = new Date(thisYear, thisMonth - 1, 1);

  const active = reservations.filter(r => r.status !== 'cancelled');
  const verified = payments.filter(p => p.status === 'verified');
  const inMonth = (iso: string, y: number, m: number) => {
    const d = new Date(iso);
    return d.getFullYear() === y && d.getMonth() === m;
  };

  // --- Period-over-period KPIs (this month vs last month) ---
  const revenueIn = (y: number, m: number) =>
    verified.filter(p => inMonth(p.paid_at, y, m)).reduce((s, p) => s + p.amount, 0);
  const bookingsIn = (y: number, m: number) => active.filter(r => inMonth(r.created_at, y, m));

  const revNow = revenueIn(thisYear, thisMonth);
  const revPrev = revenueIn(prevMonthDate.getFullYear(), prevMonthDate.getMonth());
  const bookNow = bookingsIn(thisYear, thisMonth);
  const bookPrev = bookingsIn(prevMonthDate.getFullYear(), prevMonthDate.getMonth());
  const aov = (list: typeof active) => (list.length ? list.reduce((s, r) => s + r.total_amount, 0) / list.length : 0);
  const aovNow = aov(bookNow);
  const aovPrev = aov(bookPrev);

  const totalContract = active.reduce((s, r) => s + r.total_amount, 0);
  const totalCollected = verified.reduce((s, p) => s + p.amount, 0);
  const collectionRate = totalContract > 0 ? (totalCollected / totalContract) * 100 : 0;
  const outstanding = Math.max(0, totalContract - totalCollected);

  const prevMonthName = fullMonthNames[prevMonthDate.getMonth()];
  const thisMonthName = fullMonthNames[thisMonth];

  // --- Chart 1: revenue this year vs last year ---
  const yearCompare = MONTHS.map((month, i) => ({
    month,
    thisYear: revenueIn(thisYear, i),
    lastYear: revenueIn(lastYear, i),
  }));
  const ytdThis = yearCompare.slice(0, thisMonth + 1).reduce((s, m) => s + m.thisYear, 0);
  const ytdLast = yearCompare.slice(0, thisMonth + 1).reduce((s, m) => s + m.lastYear, 0);
  const ytdChange = pctChange(ytdThis, ytdLast);
  const peak = yearCompare.reduce((max, m) => (m.thisYear > max.thisYear ? m : max), yearCompare[0]);
  const peakIdx = MONTHS.indexOf(peak.month);

  // --- Chart 2: contracted (by event month) vs collected (by payment month), this year ---
  const bookedVsCollected = MONTHS.map((month, i) => ({
    month,
    contracted: active
      .filter(r => {
        const d = new Date(`${r.event_date}T00:00:00`);
        return d.getFullYear() === thisYear && d.getMonth() === i;
      })
      .reduce((s, r) => s + r.total_amount, 0),
    collected: revenueIn(thisYear, i),
  }));
  const contractedYear = bookedVsCollected.reduce((s, m) => s + m.contracted, 0);
  const collectedYear = bookedVsCollected.reduce((s, m) => s + m.collected, 0);
  const biggestGap = bookedVsCollected.reduce(
    (max, m) => (m.contracted - m.collected > max.contracted - max.collected ? m : max),
    bookedVsCollected[0]
  );

  // --- Chart 3: package share of bookings vs share of revenue ---
  const totalBookings = active.length;
  const packageStats = packages.map(pkg => {
    const list = active.filter(r => r.package_id === pkg.id);
    const revenue = list.reduce((s, r) => s + r.total_amount, 0);
    return {
      name: pkg.name,
      count: list.length,
      revenue,
      bookingShare: totalBookings ? (list.length / totalBookings) * 100 : 0,
      revenueShare: totalContract ? (revenue / totalContract) * 100 : 0,
    };
  });
  const topByBookings = [...packageStats].sort((a, b) => b.count - a.count)[0];
  const topByRevenue = [...packageStats].sort((a, b) => b.revenue - a.revenue)[0];
  const overEarner = [...packageStats]
    .filter(p => p.count > 0)
    .sort((a, b) => b.revenueShare - b.bookingShare - (a.revenueShare - a.bookingShare))[0];

  // --- Themes ---
  const themeColors = ['#a9822f', '#3b6fb6', '#c2185b', '#17140f', '#e07a1f', '#7b5cc4'];
  const themeDistribution = themes.map((th, i) => ({
    name: th.name,
    value: reservations.filter(r => r.theme_id === th.id).length,
    color: themeColors[i % themeColors.length],
  }));
  const topTheme = [...themeDistribution].sort((a, b) => b.value - a.value)[0];
  const themeTotal = themeDistribution.reduce((s, t) => s + t.value, 0);

  // --- Payment channels (only those actually used or offered) ---
  const methods = (['gcash', 'cash', 'bank_transfer', 'credit_card'] as PaymentMethod[]).filter(
    m => m === 'gcash' || m === 'cash' || verified.some(p => p.payment_method === m)
  );
  const channelStats = methods.map(m => {
    const amount = verified.filter(p => p.payment_method === m).reduce((s, p) => s + p.amount, 0);
    return { method: m, amount, pct: totalCollected ? (amount / totalCollected) * 100 : 0 };
  });
  const topChannel = [...channelStats].sort((a, b) => b.amount - a.amount)[0];

  const changeWord = (v: number | null) =>
    v === null ? 'started from zero' : v > 0.05 ? `grew ${v.toFixed(1)}%` : v < -0.05 ? `fell ${Math.abs(v).toFixed(1)}%` : 'held steady';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-ink">Reports & Financial Analytics</h2>
        <p className="text-sm text-text-muted">
          Every metric is compared with an earlier period, and each chart comes with a plain-language interpretation.
        </p>
      </div>

      {/* KPIs with comparisons */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title={`Revenue · ${thisMonthName}`}
          value={formatCurrency(revNow)}
          delta={pctChange(revNow, revPrev)}
          deltaLabel={prevMonthName}
          note={`Verified collections this month ${changeWord(pctChange(revNow, revPrev))} compared with ${prevMonthName} (${formatCurrency(revPrev)}).`}
        />
        <KpiCard
          title={`New Bookings · ${thisMonthName}`}
          value={String(bookNow.length)}
          delta={pctChange(bookNow.length, bookPrev.length)}
          deltaLabel={prevMonthName}
          note={`${bookNow.length} bookings placed this month vs ${bookPrev.length} in ${prevMonthName}.`}
        />
        <KpiCard
          title="Average Booking Value"
          value={formatCurrency(aovNow)}
          delta={pctChange(aovNow, aovPrev)}
          deltaLabel={prevMonthName}
          note={
            aovNow >= aovPrev
              ? 'Customers are booking the same or larger events (more pax, add-ons) than last month.'
              : 'Bookings this month are smaller on average; consider promoting add-ons or higher tiers.'
          }
        />
        <KpiCard
          title="Collection Rate"
          value={`${collectionRate.toFixed(1)}%`}
          note={`${formatCurrency(totalCollected)} collected of ${formatCurrency(totalContract)} contracted; ${formatCurrency(outstanding)} still to collect.`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Revenue: {thisYear} vs {lastYear}</CardTitle>
            <p className="text-xs text-text-muted">Verified payments per month, same month compared year over year</p>
          </CardHeader>
          <CardContent>
            <ComparisonBarChart
              data={yearCompare}
              xKey="month"
              series={[
                { key: 'thisYear', name: String(thisYear) },
                { key: 'lastYear', name: String(lastYear) },
              ]}
            />
            <Interpretation>
              Year-to-date revenue is {formatCurrency(ytdThis)} vs {formatCurrency(ytdLast)} in the same months of{' '}
              {lastYear}, so it {changeWord(ytdChange)}.{' '}
              {peak.thisYear > 0
                ? `${fullMonthNames[peakIdx]} is the strongest month so far this year (${formatCurrency(peak.thisYear)}).`
                : 'No verified revenue has been recorded this year yet.'}
            </Interpretation>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Contracted vs Collected ({thisYear})</CardTitle>
            <p className="text-xs text-text-muted">Value of events per month compared with cash actually verified</p>
          </CardHeader>
          <CardContent>
            <ComparisonBarChart
              data={bookedVsCollected}
              xKey="month"
              series={[
                { key: 'contracted', name: 'Contracted (event month)' },
                { key: 'collected', name: 'Collected (payment month)' },
              ]}
            />
            <Interpretation>
              {formatCurrency(contractedYear)} of events are scheduled this year and {formatCurrency(collectedYear)} has
              been collected ({contractedYear ? ((collectedYear / contractedYear) * 100).toFixed(1) : '0.0'}%).{' '}
              {biggestGap.contracted - biggestGap.collected > 0
                ? `${fullMonthNames[MONTHS.indexOf(biggestGap.month)]} has the biggest gap (${formatCurrency(
                    biggestGap.contracted - biggestGap.collected
                  )}); follow up on balances for those events.`
                : 'Collections are keeping pace with contracted events.'}
            </Interpretation>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Package Comparison: Share of Bookings vs Share of Revenue</CardTitle>
            <p className="text-xs text-text-muted">Both as % of all active bookings, so packages compare on the same scale</p>
          </CardHeader>
          <CardContent>
            <ComparisonBarChart
              data={packageStats}
              xKey="name"
              format="percent"
              height={300}
              series={[
                { key: 'bookingShare', name: '% of bookings' },
                { key: 'revenueShare', name: '% of revenue' },
              ]}
            />
            <Interpretation>
              {totalBookings === 0
                ? 'No bookings yet to compare.'
                : `${topByBookings.name} is booked most often (${topByBookings.count} bookings, ${topByBookings.bookingShare.toFixed(
                    1
                  )}%), while ${topByRevenue.name} earns the most (${formatCurrency(topByRevenue.revenue)}, ${topByRevenue.revenueShare.toFixed(
                    1
                  )}% of revenue).${
                    overEarner && overEarner.revenueShare > overEarner.bookingShare + 1
                      ? ` ${overEarner.name} brings in more revenue than its share of bookings, so each booking is worth more.`
                      : ''
                  }`}
            </Interpretation>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border uppercase text-text-muted">
                  <tr>
                    <th className="py-2 font-semibold">Package</th>
                    <th className="py-2 text-right font-semibold">Bookings</th>
                    <th className="py-2 text-right font-semibold">% Bookings</th>
                    <th className="py-2 text-right font-semibold">Revenue</th>
                    <th className="py-2 text-right font-semibold">% Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {packageStats.map(p => (
                    <tr key={p.name}>
                      <td className="py-2 font-semibold text-ink">{p.name}</td>
                      <td className="py-2 text-right">{p.count}</td>
                      <td className="py-2 text-right">{p.bookingShare.toFixed(1)}%</td>
                      <td className="py-2 text-right font-semibold text-ink">{formatCurrency(p.revenue)}</td>
                      <td className="py-2 text-right">{p.revenueShare.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Reservations by Theme</CardTitle>
            <p className="text-xs text-text-muted">Distribution of booked motifs</p>
          </CardHeader>
          <CardContent>
            <EventsDonutChart data={themeDistribution} />
            <Interpretation>
              {themeTotal === 0
                ? 'No theme bookings yet.'
                : `${topTheme.name} leads with ${topTheme.value} of ${themeTotal} bookings (${(
                    (topTheme.value / themeTotal) *
                    100
                  ).toFixed(0)}%). Keep its styling and packages well stocked.`}
            </Interpretation>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Collections by Payment Channel</CardTitle>
          <p className="text-xs text-text-muted">Share of verified collections per channel</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {channelStats.map(c => (
              <div key={c.method} className="text-xs">
                <div className="mb-1 flex justify-between gap-2">
                  <span className="font-semibold text-ink">{PAYMENT_METHOD_LABELS[c.method]}</span>
                  <span className="text-text">
                    {formatCurrency(c.amount)} · <strong>{c.pct.toFixed(1)}%</strong>
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-cream-dark">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <Interpretation>
            {totalCollected === 0
              ? 'No verified collections yet.'
              : `${PAYMENT_METHOD_LABELS[topChannel.method]} is the largest channel at ${topChannel.pct.toFixed(1)}% of collections${
                  topChannel.pct >= 50 ? ', so most customers pay this way' : ''
                }. Keep its verification queue short.`}
          </Interpretation>
        </CardContent>
      </Card>
    </div>
  );
}

export default Reports;
