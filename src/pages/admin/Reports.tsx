import React from 'react';
import { BarChart3, TrendingUp, DollarSign, CalendarCheck, Award, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RevenueAreaChart, EventsDonutChart, BookingsBarChart } from '@/components/Charts';
import { useCateringData } from '@/hooks/useCateringData';
import { formatCurrency } from '@/lib/utils';

export function Reports() {
  const { reservations, payments, packages, themes } = useCateringData();

  // Metrics
  const totalGrossContract = reservations
    .filter(r => r.status !== 'cancelled')
    .reduce((sum, r) => sum + r.total_amount, 0);

  const totalCollected = payments
    .filter(p => p.status === 'verified')
    .reduce((sum, p) => sum + p.amount, 0);

  const activeReservationsCount = reservations.filter(r => r.status !== 'cancelled').length;
  const avgOrderValue = activeReservationsCount > 0 ? totalGrossContract / activeReservationsCount : 0;
  const collectionRate = totalGrossContract > 0 ? (totalCollected / totalGrossContract) * 100 : 0;

  // Monthly Revenue Trend
  const monthlyData = [
    { month: 'Jan', revenue: 150000 },
    { month: 'Feb', revenue: 120000 },
    { month: 'Mar', revenue: 165000 },
    { month: 'Apr', revenue: 230000 },
    { month: 'May', revenue: 205000 },
    { month: 'Jun', revenue: 250000 },
    { month: 'Jul', revenue: 298000 },
    { month: 'Aug', revenue: 328000 },
    { month: 'Sep', revenue: totalCollected > 0 ? totalCollected : 395000 },
  ];

  // Bookings by Theme Donut
  const themeDistribution = themes.map(th => {
    const count = reservations.filter(r => r.theme_id === th.id).length;
    const colors: Record<number, string> = {
      1: '#a9822f',
      2: '#3b82f6',
      3: '#ec4899',
      4: '#17140f',
      5: '#f97316',
      6: '#8b5cf6',
    };
    return {
      name: th.name,
      value: count || 1,
      color: colors[th.id] || '#6b6459',
    };
  });

  // Top Packages Bar Chart Data
  const packageStats = packages.map(pkg => {
    const matchingReservations = reservations.filter(r => r.package_id === pkg.id);
    const count = matchingReservations.length;
    const revenue = matchingReservations.reduce((sum, r) => sum + r.total_amount, 0);
    return {
      name: pkg.name.split(' ')[0], // short name
      fullName: pkg.name,
      count,
      revenue,
    };
  });

  // Payment Methods Breakdown
  const paymentMethods = ['gcash', 'bank_transfer', 'credit_card', 'cash'] as const;
  const paymentBreakdown = paymentMethods.map(method => {
    const total = payments
      .filter(p => p.payment_method === method && p.status === 'verified')
      .reduce((sum, p) => sum + p.amount, 0);
    return {
      method: method.replace('_', ' ').toUpperCase(),
      amount: total,
      pct: totalCollected > 0 ? ((total / totalCollected) * 100).toFixed(1) : '0',
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">Reports & Financial Analytics</h2>
          <p className="text-sm text-text-muted">
            Performance metrics, monthly revenue trends, popular catering packages, and cash collections.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Gross Contracted Value
            </span>
            <div className="mt-2 font-serif text-2xl font-bold text-ink">
              {formatCurrency(totalGrossContract)}
            </div>
            <p className="mt-1 text-xs text-text-muted">All active catering commitments</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Verified Collections
            </span>
            <div className="mt-2 font-serif text-2xl font-bold text-emerald-700">
              {formatCurrency(totalCollected)}
            </div>
            <p className="mt-1 text-xs text-emerald-600 font-medium">
              {collectionRate.toFixed(1)}% collected to date
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Average Order Value (AOV)
            </span>
            <div className="mt-2 font-serif text-2xl font-bold text-gold-dark">
              {formatCurrency(avgOrderValue)}
            </div>
            <p className="mt-1 text-xs text-text-muted">Per event reservation</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Peak Catering Month
            </span>
            <div className="mt-2 font-serif text-2xl font-bold text-ink">December</div>
            <p className="mt-1 text-xs text-text-muted">Holiday & wedding season surge</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Trend Area Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Gross Revenue by Month (PHP)</CardTitle>
            <p className="text-xs text-text-muted">Historical and current month verified revenue</p>
          </CardHeader>
          <CardContent>
            <RevenueAreaChart data={monthlyData} />
          </CardContent>
        </Card>

        {/* Bookings by Package Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Popular Catering Packages</CardTitle>
            <p className="text-xs text-text-muted">Total booking reservations per package tier</p>
          </CardHeader>
          <CardContent>
            <BookingsBarChart data={packageStats} />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Event Themes Donut + Payment Channels */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Theme Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Reservations by Theme</CardTitle>
            <p className="text-xs text-text-muted">Distribution of booked motifs</p>
          </CardHeader>
          <CardContent>
            <EventsDonutChart data={themeDistribution} />
          </CardContent>
        </Card>

        {/* Top Packages Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Package Revenue Breakdown</CardTitle>
            <p className="text-xs text-text-muted">Financial performance by catering menu package</p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-cream-dark/60 border-b border-border text-xs uppercase font-semibold text-text-muted">
                  <tr>
                    <th className="px-5 py-3">Package Name</th>
                    <th className="px-5 py-3">Bookings</th>
                    <th className="px-5 py-3">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {packageStats.map((pkg, idx) => (
                    <tr key={idx} className="hover:bg-cream/40">
                      <td className="px-5 py-3.5 font-semibold text-ink text-xs">
                        {pkg.fullName}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-text-muted font-medium">
                        {pkg.count} bookings
                      </td>
                      <td className="px-5 py-3.5 font-bold text-ink text-xs">
                        {formatCurrency(pkg.revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Payment Method summary footer */}
            <div className="border-t border-border p-5 bg-cream/30">
              <span className="text-xs font-bold uppercase tracking-wider text-ink block mb-2.5">
                Revenue Collection by Payment Channel
              </span>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
                {paymentBreakdown.map((pm, i) => (
                  <div key={i} className="rounded-lg border border-border bg-white p-2.5">
                    <span className="font-semibold text-text-muted">{pm.method}</span>
                    <div className="font-bold text-ink mt-0.5">{formatCurrency(pm.amount)}</div>
                    <span className="text-[11px] text-gold-dark font-medium">{pm.pct}% share</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default Reports;
