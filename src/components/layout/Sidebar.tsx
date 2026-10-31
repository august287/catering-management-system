import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UtensilsCrossed,
  CalendarDays,
  Users,
  CreditCard,
  Bell,
  BarChart3,
  BookOpen,
  CalendarPlus,
  CalendarRange,
  CalendarSearch,
  Clock,
  LogOut,
  Utensils,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCateringData } from '@/hooks/useCateringData';
import { cn } from '@/lib/utils';
import { LogoutModal } from '@/components/ui/Modal';

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { role, profile, logout } = useAuth();
  const { notifications, reservations, payments } = useCateringData();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Badge calculations
  const pendingReservationsCount = reservations.filter(r => r.status === 'pending').length;
  const pendingPaymentsCount = payments.filter(p => p.status === 'pending_verification').length;
  const unreadNotificationsCount = notifications.filter(
    n => !n.is_read && (role === 'admin' ? (n.user_id === profile?.id || n.user_id === '00000000-0000-0000-0000-000000000001') : (profile?.id ? n.user_id === profile.id : false))
  ).length;
  const notifBadge = unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined;

  // Escape closes the mobile drawer
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const adminNav: NavItem[] = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/menu', label: 'Menu Management', icon: UtensilsCrossed },
    {
      to: '/admin/reservations',
      label: 'Reservations',
      icon: CalendarDays,
      badge: pendingReservationsCount > 0 ? pendingReservationsCount : undefined,
    },
    { to: '/admin/calendar', label: 'Event Calendar', icon: CalendarRange },
    { to: '/admin/customers', label: 'Customers', icon: Users },
    {
      to: '/admin/payments',
      label: 'Payments',
      icon: CreditCard,
      badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : undefined,
    },
    { to: '/admin/reports', label: 'Reports & Analytics', icon: BarChart3 },
    { to: '/admin/notifications', label: 'Notifications', icon: Bell, badge: notifBadge },
  ];

  const customerNav: NavItem[] = [
    { to: '/customer/menu', label: 'Browse Menu', icon: BookOpen },
    { to: '/customer/availability', label: 'Check Availability', icon: CalendarSearch },
    { to: '/customer/book', label: 'Book Reservation', icon: CalendarPlus },
    { to: '/customer/reservations', label: 'My Reservations', icon: Clock },
    { to: '/customer/payments', label: 'Payments', icon: CreditCard },
    { to: '/customer/notifications', label: 'Notifications', icon: Bell, badge: notifBadge },
  ];

  const navItems = role === 'admin' ? adminNav : customerNav;

  const handleLogoutConfirm = async () => {
    await logout();
    setShowLogoutModal(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 xl:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        id="app-sidebar"
        aria-label="Main navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-ink text-cream transition-[transform,visibility] duration-200 ease-in-out xl:static xl:z-auto xl:w-64 xl:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full invisible xl:visible'
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-ink-muted/40 px-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold text-ink font-bold shadow-sm">
            <Utensils className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-serif text-lg font-bold tracking-tight text-white leading-tight truncate">
              Natalie's Catering
            </p>
            <p className="text-[10px] uppercase tracking-wider text-gold-light/70 font-semibold">
              Catering System
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 rounded-lg p-2 text-cream/70 hover:bg-ink-soft hover:text-white xl:hidden"
            aria-label="Close navigation menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Role Pill Indicator */}
        <div className="px-6 py-3 border-b border-ink-muted/20">
          <div className="flex items-center gap-2 rounded-md bg-ink-soft px-3 py-1.5 text-xs text-gold-light">
            {role === 'admin' ? (
              <ShieldCheck className="h-3.5 w-3.5 text-gold" />
            ) : (
              <User className="h-3.5 w-3.5 text-gold" />
            )}
            <span className="capitalize font-semibold tracking-wide">
              {role === 'admin' ? 'Administrator Portal' : 'Customer Portal'}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-ink-soft text-gold border-l-4 border-gold shadow-sm font-semibold'
                      : 'text-cream/75 hover:bg-ink-soft/60 hover:text-white'
                  )
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold px-1.5 text-[11px] font-bold text-white"
                    aria-label={`${item.badge} pending`}
                  >
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User Info & Teardown */}
        <div className="border-t border-ink-muted/30 p-4">
          <div className="flex items-center justify-between rounded-lg bg-ink-soft/80 p-2.5">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/20 text-gold font-bold text-xs border border-gold/40">
                {profile?.name?.slice(0, 2).toUpperCase() || 'NC'}
              </div>
              <div className="truncate">
                <p className="truncate text-xs font-semibold text-white">{profile?.name || 'User'}</p>
                <p className="truncate text-[11px] text-cream/60 capitalize">{role}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              title="Sign out"
              aria-label="Sign out"
              className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-cream/70 hover:bg-ink hover:text-red-400 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      <LogoutModal
        open={showLogoutModal}
        onOpenChange={setShowLogoutModal}
        onConfirm={handleLogoutConfirm}
      />
    </>
  );
}

export default Sidebar;