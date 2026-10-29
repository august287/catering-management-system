import React from 'react';
import { Menu, Bell, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCateringData } from '@/hooks/useCateringData';
import { Link } from 'react-router-dom';

interface TopbarProps {
  title?: string;
  sidebarOpen?: boolean;
  onToggleSidebar: () => void;
}

export function Topbar({ title = "Natalie's Catering", sidebarOpen = false, onToggleSidebar }: TopbarProps) {
  const { profile, role } = useAuth();
  const { notifications } = useCateringData();

  const unreadCount = notifications.filter(
    n => !n.is_read && (role === 'admin' ? (n.user_id === profile?.id || n.user_id === '00000000-0000-0000-0000-000000000001') : (profile?.id ? n.user_id === profile.id : false))
  ).length;

  const notifLink = role === 'admin' ? '/admin/notifications' : '/customer/notifications';
  const portalLabel = role === 'admin' ? 'Admin Portal' : 'Customer Portal';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full shrink-0 items-center justify-between gap-3 border-b border-border bg-white/95 px-4 backdrop-blur sm:px-6">
      {/* Left: Mobile hamburger & breadcrumb-style location */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="-ml-2 rounded-lg p-2 text-text-muted hover:bg-cream-dark hover:text-text lg:hidden transition-colors"
          aria-label="Open navigation menu"
          aria-controls="app-sidebar"
          aria-expanded={sidebarOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="hidden text-[11px] font-semibold uppercase tracking-wider text-text-faint sm:block">
            {portalLabel}
          </p>
          <h1 className="truncate font-serif text-lg font-bold leading-tight tracking-tight text-ink sm:text-xl">
            {title}
          </h1>
        </div>
      </div>

      {/* Right: Actions and User Chip */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        {/* Notification Bell */}
        <Link
          to={notifLink}
          className="relative rounded-lg p-2 text-text-muted hover:bg-cream-dark hover:text-ink transition-colors"
          title="Notifications"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-white"
              aria-hidden="true"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User Chip */}
        <div className="flex items-center gap-2.5 rounded-full border border-border bg-cream/70 py-1 pl-1 pr-1 shadow-xs sm:pr-3">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-gold font-semibold text-xs"
            aria-hidden="true"
          >
            {profile?.name ? profile.name.slice(0, 2).toUpperCase() : <User className="h-4 w-4" />}
          </div>
          <div className="hidden max-w-[10rem] text-left text-xs sm:block">
            <span className="block truncate font-medium text-ink leading-tight">{profile?.name || 'User'}</span>
            <span className="block text-[10px] text-text-muted capitalize">{role}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
