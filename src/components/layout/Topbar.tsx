import React from 'react';
import { Menu, Bell, User } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCateringData } from '@/hooks/useCateringData';
import { Link } from 'react-router-dom';

interface TopbarProps {
  title?: string;
  onToggleSidebar: () => void;
}

export function Topbar({ title = "Natalie's Catering", onToggleSidebar }: TopbarProps) {
  const { profile, role } = useAuth();
  const { notifications } = useCateringData();

  const unreadCount = notifications.filter(
    n => !n.is_read && (role === 'admin' ? n.user_id === '00000000-0000-0000-0000-000000000001' : n.user_id === profile?.id)
  ).length;

  const notifLink = role === 'admin' ? '/admin/notifications' : '/customer/notifications';

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-white/95 px-4 backdrop-blur sm:px-6">
      {/* Left: Mobile hamburger & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-text-muted hover:bg-cream-dark hover:text-text lg:hidden transition-colors"
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="font-serif text-xl font-bold tracking-tight text-ink sm:text-2xl">
          {title}
        </h1>
      </div>

      {/* Right: Actions and User Chip */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Notification Bell */}
        <Link
          to={notifLink}
          className="relative rounded-lg p-2 text-text-muted hover:bg-cream-dark hover:text-ink transition-colors"
          title="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
        </Link>

        {/* User Chip */}
        <div className="flex items-center gap-2.5 rounded-full border border-border bg-cream/70 py-1 pl-1 pr-3 shadow-xs">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-gold font-semibold text-xs">
            {profile?.name ? profile.name.slice(0, 2).toUpperCase() : <User className="h-4 w-4" />}
          </div>
          <div className="hidden text-left text-xs sm:block">
            <span className="block font-medium text-ink leading-tight">{profile?.name || 'User'}</span>
            <span className="block text-[10px] text-text-muted capitalize">{role}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
