import React from 'react';
import { Bell, CheckCheck, Check, Calendar, CreditCard } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/hooks/useAuth';
import { useCateringData } from '@/hooks/useCateringData';
import { formatDate } from '@/lib/utils';

export function Notifications() {
  const { profile } = useAuth();
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useCateringData();

  // Filter notifications belonging to this customer
  const currentUserId = profile?.id || '00000000-0000-0000-0000-000000000002';
  const myNotifications = notifications.filter(n => n.user_id === currentUserId);
  const unreadCount = myNotifications.filter(n => !n.is_read).length;

  const getNotifIcon = (title: string) => {
    if (title.toLowerCase().includes('payment') || title.toLowerCase().includes('downpayment')) {
      return <CreditCard className="h-5 w-5 text-emerald-600" />;
    }
    return <Calendar className="h-5 w-5 text-gold" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">My Notifications</h2>
          <p className="text-sm text-text-muted">
            Status updates regarding your event schedules, confirmations, and verified payments.
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllNotificationsAsRead(currentUserId)}
            className="gap-1.5 text-xs self-start"
          >
            <CheckCheck className="h-4 w-4 text-gold" /> Mark All as Read
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {myNotifications.length === 0 ? (
              <div className="py-12 text-center text-sm text-text-muted">
                <Bell className="h-8 w-8 mx-auto text-text-faint mb-2 opacity-50" />
                You have no notifications at this time.
              </div>
            ) : (
              myNotifications.map(notif => (
                <div
                  key={notif.id}
                  className={`flex items-start justify-between gap-4 p-5 transition-colors ${
                    notif.is_read ? 'bg-white' : 'bg-cream-dark/30 font-medium'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cream border border-border">
                      {getNotifIcon(notif.title)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif font-bold text-ink text-sm">{notif.title}</h4>
                        {!notif.is_read && <Badge variant="gold">New</Badge>}
                      </div>
                      <p className="mt-1 text-xs text-text leading-relaxed">{notif.message}</p>
                      <span className="mt-2 block text-[11px] text-text-faint">
                        {formatDate(notif.created_at)}
                      </span>
                    </div>
                  </div>

                  {!notif.is_read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markNotificationAsRead(notif.id)}
                      className="text-xs gap-1 shrink-0 text-text-muted hover:text-gold"
                    >
                      <Check className="h-3.5 w-3.5" /> Mark read
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Notifications;
