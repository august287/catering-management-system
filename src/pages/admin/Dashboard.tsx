import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock, TrendingUp, Users, AlertCircle, ArrowRight, Eye } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { RevenueAreaChart, EventsDonutChart } from '@/components/Charts';
import { useCateringData } from '@/hooks/useCateringData';
import { formatCurrency, formatDate } from '@/lib/utils';

export function Dashboard() {
  const { reservations, payments, profiles, themes } = useCateringData();

  // Metrics
  const totalReservations = reservations.length;
  const activeBookings = reservations.filter(
    r => r.status === 'confirmed' || r.status === 'in_progress'
  ).length;
  const pendingReservations = reservations.filter(r => r.status === 'pending').length;

  const totalRevenue = payments
    .filter(p => p.status === 'verified')
    .reduce((sum, p) => sum + p.amount, 0);

  const customerProfiles = profiles.filter(p => p.role === 'customer');
  const pendingPayments = payments.filter(p => p.status === 'pending_verification');

  // Revenue chart series (realistic monthly breakdown)
  const revenueSeries = [
    { month: 'Jan', revenue: 150000 },
    { month: 'Feb', revenue: 120000 },
    { month: 'Mar', revenue: 165000 },
    { month: 'Apr', revenue: 230000 },
    { month: 'May', revenue: 205000 },
    { month: 'Jun', revenue: 250000 },
    { month: 'Jul', revenue: 298000 },
    { month: 'Aug', revenue: 328000 },
    { month: 'Sep', revenue: totalRevenue > 0 ? totalRevenue : 395000 },
  ];

  // Events by theme donut distribution
  const themeDistribution = themes.map(th => {
    const count = reservations.filter(r => r.theme_id === th.id).length;
    const colors: Record<number, string> = {
      1: '#a9822f', // Gold (Wedding)
      2: '#3b82f6', // Blue (Birthday)
      3: '#ec4899', // Pink (Debut)
      4: '#17140f', // Ink (Corporate)
      5: '#f97316', // Orange (Fiesta)
      6: '#8b5cf6', // Violet (Christening)
    };
    return {
      name: th.name,
      value: count || 1,
      color: colors[th.id] || '#6b6459',
    };
  });

  const recentReservations = reservations.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Pending payments alert banner */}
      {pendingPayments.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-amber-900 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-200/80">
              <AlertCircle className="h-5 w-5 text-amber-800" />
            </div>
            <div>
              <p className="font-semibold text-sm">
                {pendingPayments.length} Payment Verification{pendingPayments.length > 1 ? 's' : ''} Pending
              </p>
              <p className="text-xs text-amber-700">
                Customers have uploaded proof of payment receipts awaiting administrative confirmation.
              </p>
            </div>
          </div>
          <Link to="/admin/payments">
            <Button variant="gold" size="sm" className="gap-1 text-xs">
              Review Payments <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Reservations"
          value={totalReservations}
          meta="+12% this month"
          icon={CalendarDays}
          tone="gold"
        />
        <StatCard
          label="Active Bookings"
          value={activeBookings}
          meta={`${activeBookings} active, ${pendingReservations} pending`}
          icon={Clock}
          tone="blue"
        />
        <StatCard
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          meta="+14.2% vs last quarter"
          icon={TrendingUp}
          tone="green"
        />
        <StatCard
          label="Registered Customers"
          value={customerProfiles.length}
          meta="High repeat booking rate"
          icon={Users}
          tone="violet"
        />
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revenue Trend Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Monthly Revenue Trend</CardTitle>
              <p className="text-xs text-text-muted mt-0.5">
                Gross verified catering revenue (PHP) over time
              </p>
            </div>
            <span className="rounded-md bg-gold-light/60 px-2.5 py-1 text-xs font-bold text-gold-dark">
              2026 Fiscal
            </span>
          </CardHeader>
          <CardContent>
            <RevenueAreaChart data={revenueSeries} />
          </CardContent>
        </Card>

        {/* Events by Theme Donut Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Bookings by Event Theme</CardTitle>
            <p className="text-xs text-text-muted mt-0.5">Distribution across catering packages</p>
          </CardHeader>
          <CardContent>
            <EventsDonutChart data={themeDistribution} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Reservations Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle>Recent Booking Requests</CardTitle>
            <p className="text-xs text-text-muted mt-0.5">
              Latest client reservation submissions and their current statuses
            </p>
          </div>
          <Link to="/admin/reservations">
            <Button variant="outline" size="sm" className="text-xs">
              View All Reservations
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-cream-dark/50 border-b border-border text-xs uppercase tracking-wider text-text-muted font-semibold">
                <tr>
                  <th className="px-6 py-3.5">Booking Code</th>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Date & Venue</th>
                  <th className="px-6 py-3.5">Guests</th>
                  <th className="px-6 py-3.5">Total Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentReservations.map(res => {
                  const cust = profiles.find(p => p.id === res.customer_id);
                  return (
                    <tr key={res.id} className="hover:bg-cream/40 transition-colors">
                      <td className="px-6 py-4 font-mono font-semibold text-ink text-xs">
                        {res.booking_code}
                      </td>
                      <td className="px-6 py-4 font-medium text-text">
                        {cust?.name || 'Customer'}
                      </td>
                      <td className="px-6 py-4 text-xs text-text-muted">
                        <div className="font-medium text-text">{formatDate(res.event_date)}</div>
                        <div className="truncate max-w-[180px]">{res.venue_address}</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-text">
                        {res.guest_count} pax
                      </td>
                      <td className="px-6 py-4 font-semibold text-ink text-xs">
                        {formatCurrency(res.total_amount)}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={res.status}>{res.status.replace('_', ' ')}</Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link to="/admin/reservations">
                          <button className="rounded p-1.5 text-text-muted hover:bg-cream-dark hover:text-gold transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;
