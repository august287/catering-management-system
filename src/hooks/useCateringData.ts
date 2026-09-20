import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockData';
import {
  EventTheme,
  MenuCategory,
  MenuItem,
  Package,
  RentalItem,
  Reservation,
  Payment,
  Notification,
  Profile,
  ReservationStatus,
  PaymentStatus,
} from '@/types/database';

export function useCateringData() {
  const supabaseActive = isSupabaseConfigured();
  const [themes, setThemes] = useState<EventTheme[]>(mockStore.getThemes());
  const [categories, setCategories] = useState<MenuCategory[]>(mockStore.getCategories());
  const [menuItems, setMenuItems] = useState<MenuItem[]>(mockStore.getMenuItems());
  const [packages, setPackages] = useState<Package[]>(mockStore.getPackages());
  const [rentals, setRentals] = useState<RentalItem[]>(mockStore.getRentals());
  const [reservations, setReservations] = useState<Reservation[]>(mockStore.getReservations());
  const [payments, setPayments] = useState<Payment[]>(mockStore.getPayments());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>(mockStore.getProfiles());
  const [loading, setLoading] = useState<boolean>(false);

  // Load from Supabase if configured, otherwise rely on mockStore
  const refreshData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setThemes(mockStore.getThemes());
      setCategories(mockStore.getCategories());
      setMenuItems(mockStore.getMenuItems());
      setPackages(mockStore.getPackages());
      setRentals(mockStore.getRentals());
      setReservations(mockStore.getReservations());
      setPayments(mockStore.getPayments());
      setNotifications(mockStore.getNotifications());
      setProfiles(mockStore.getProfiles());
      return;
    }

    setLoading(true);
    try {
      const [
        { data: th },
        { data: cat },
        { data: mi },
        { data: pkg },
        { data: rent },
        { data: res },
        { data: pay },
        { data: notif },
        { data: prof },
      ] = await Promise.all([
        supabase.from('event_themes').select('*').order('id'),
        supabase.from('menu_categories').select('*').order('display_order'),
        supabase.from('menu_items').select('*').order('id'),
        supabase.from('packages').select('*').order('id'),
        supabase.from('rental_items').select('*').order('id'),
        supabase.from('reservations').select('*, customer:profiles(*), theme:event_themes(*), package:packages(*), rentals:reservation_rentals(*, rental_item:rental_items(*))').order('id', { ascending: false }),
        supabase.from('payments').select('*, reservation:reservations(*)').order('id', { ascending: false }),
        supabase.from('notifications').select('*').order('id', { ascending: false }),
        supabase.from('profiles').select('*'),
      ]);

      if (th && th.length > 0) setThemes(th);
      if (cat && cat.length > 0) setCategories(cat);
      if (mi && mi.length > 0) setMenuItems(mi);
      if (pkg && pkg.length > 0) setPackages(pkg);
      if (rent && rent.length > 0) setRentals(rent);
      if (res) setReservations(res as any);
      if (pay) setPayments(pay as any);
      if (notif) setNotifications(notif);
      if (prof && prof.length > 0) setProfiles(prof);
    } catch (err) {
      console.warn('Supabase fetch error, falling back to local data:', err);
      setThemes(mockStore.getThemes());
      setCategories(mockStore.getCategories());
      setMenuItems(mockStore.getMenuItems());
      setPackages(mockStore.getPackages());
      setRentals(mockStore.getRentals());
      setReservations(mockStore.getReservations());
      setPayments(mockStore.getPayments());
      setNotifications(mockStore.getNotifications());
      setProfiles(mockStore.getProfiles());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();

    // Real-time notification sync when Supabase is configured
    if (supabaseActive) {
      const channelId = 'notif-' + Math.random().toString(36).substring(2, 9);
      const channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          (payload) => {
            const newNotif = payload.new as Notification;
            setNotifications(prev => [newNotif, ...prev]);
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications' },
          (payload) => {
            const updated = payload.new as Notification;
            setNotifications(prev =>
              prev.map(n => (n.id === updated.id ? updated : n))
            );
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [refreshData, supabaseActive]);

  // --- Menu Item Actions ---
  const addMenuItem = async (item: Omit<MenuItem, 'id'>) => {
    const newItem: MenuItem = { ...item, id: Date.now() };
    const updated = [newItem, ...menuItems];
    setMenuItems(updated);
    mockStore.saveMenuItems(updated);
    if (isSupabaseConfigured()) {
      await supabase.from('menu_items').insert(item);
    }
    return newItem;
  };

  const updateMenuItem = async (id: number, updates: Partial<MenuItem>) => {
    const updated = menuItems.map(m => (m.id === id ? { ...m, ...updates } : m));
    setMenuItems(updated);
    mockStore.saveMenuItems(updated);
    if (isSupabaseConfigured()) {
      await supabase.from('menu_items').update(updates).eq('id', id);
    }
  };

  const deleteMenuItem = async (id: number) => {
    const updated = menuItems.filter(m => m.id !== id);
    setMenuItems(updated);
    mockStore.saveMenuItems(updated);
    if (isSupabaseConfigured()) {
      await supabase.from('menu_items').delete().eq('id', id);
    }
  };

  // --- Package Actions ---
  const addPackage = async (pkg: Omit<Package, 'id'>) => {
    const newPkg: Package = { ...pkg, id: Date.now() };
    const updated = [newPkg, ...packages];
    setPackages(updated);
    mockStore.savePackages(updated);
    if (isSupabaseConfigured()) {
      await supabase.from('packages').insert(pkg);
    }
    return newPkg;
  };

  const updatePackage = async (id: number, updates: Partial<Package>) => {
    const updated = packages.map(p => (p.id === id ? { ...p, ...updates } : p));
    setPackages(updated);
    mockStore.savePackages(updated);
    if (isSupabaseConfigured()) {
      await supabase.from('packages').update(updates).eq('id', id);
    }
  };

  const deletePackage = async (id: number) => {
    const updated = packages.filter(p => p.id !== id);
    setPackages(updated);
    mockStore.savePackages(updated);
    if (isSupabaseConfigured()) {
      await supabase.from('packages').delete().eq('id', id);
    }
  };

  // --- Theme Actions ---
  const addTheme = async (theme: Omit<EventTheme, 'id'>) => {
    const newTh: EventTheme = { ...theme, id: Date.now() };
    const updated = [...themes, newTh];
    setThemes(updated);
    mockStore.saveThemes(updated);
    if (isSupabaseConfigured()) {
      await supabase.from('event_themes').insert(theme);
    }
    return newTh;
  };

  const updateTheme = async (id: number, updates: Partial<EventTheme>) => {
    const updated = themes.map(t => (t.id === id ? { ...t, ...updates } : t));
    setThemes(updated);
    mockStore.saveThemes(updated);
    if (isSupabaseConfigured()) {
      await supabase.from('event_themes').update(updates).eq('id', id);
    }
  };

  // --- Rental Item Actions ---
  const addRentalItem = async (rental: Omit<RentalItem, 'id'>) => {
    const newRent: RentalItem = { ...rental, id: Date.now() };
    const updated = [...rentals, newRent];
    setRentals(updated);
    mockStore.saveRentals(updated);
    if (isSupabaseConfigured()) {
      await supabase.from('rental_items').insert(rental);
    }
    return newRent;
  };

  const updateRentalItem = async (id: number, updates: Partial<RentalItem>) => {
    const updated = rentals.map(r => (r.id === id ? { ...r, ...updates } : r));
    setRentals(updated);
    mockStore.saveRentals(updated);
    if (isSupabaseConfigured()) {
      await supabase.from('rental_items').update(updates).eq('id', id);
    }
  };

  // --- Reservation Actions ---
  const createReservation = async (data: {
    customer_id: string;
    theme_id?: number | null;
    package_id?: number | null;
    event_date: string;
    event_time: string;
    venue_address: string;
    guest_count: number;
    special_requests?: string;
    total_amount: number;
    rentals?: { rental_item_id: number; quantity: number; subtotal: number }[];
  }) => {
    const currentYear = new Date().getFullYear();
    const maxNum = reservations.reduce((max, r) => {
      const match = r.booking_code.match(/RES-\d{4}-(\d+)/);
      const num = match ? parseInt(match[1], 10) : 0;
      return Math.max(max, num);
    }, 0);
    const booking_code = `RES-${currentYear}-${String(maxNum + 1).padStart(4, '0')}`;
    const newResId = Date.now();

    const newRes: Reservation = {
      id: newResId,
      booking_code,
      customer_id: data.customer_id,
      theme_id: data.theme_id || null,
      package_id: data.package_id || null,
      event_date: data.event_date,
      event_time: data.event_time,
      venue_address: data.venue_address,
      guest_count: data.guest_count,
      special_requests: data.special_requests || '',
      total_amount: data.total_amount,
      status: 'pending',
      created_at: new Date().toISOString(),
      theme: themes.find(t => t.id === data.theme_id),
      package: packages.find(p => p.id === data.package_id),
      customer: profiles.find(p => p.id === data.customer_id),
      rentals: (data.rentals || []).map((r, i) => ({
        id: Date.now() + i,
        reservation_id: newResId,
        rental_item_id: r.rental_item_id,
        quantity: r.quantity,
        subtotal: r.subtotal,
        rental_item: rentals.find(item => item.id === r.rental_item_id),
      })),
    };

    const updated = [newRes, ...reservations];
    setReservations(updated);
    mockStore.saveReservations(updated);

    // Create a notification for admin
    const adminNotif: Notification = {
      id: Date.now(),
      user_id: '00000000-0000-0000-0000-000000000001',
      title: 'New Booking Created',
      message: `Reservation ${booking_code} placed for ${data.guest_count} pax.`,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    const notifs = [adminNotif, ...notifications];
    setNotifications(notifs);
    mockStore.saveNotifications(notifs);

    if (isSupabaseConfigured()) {
      const { data: insertedRes } = await supabase
        .from('reservations')
        .insert({
          booking_code,
          customer_id: data.customer_id,
          theme_id: data.theme_id,
          package_id: data.package_id,
          event_date: data.event_date,
          event_time: data.event_time,
          venue_address: data.venue_address,
          guest_count: data.guest_count,
          special_requests: data.special_requests,
          total_amount: data.total_amount,
          status: 'pending',
        })
        .select()
        .single();

      if (insertedRes && data.rentals && data.rentals.length > 0) {
        await supabase.from('reservation_rentals').insert(
          data.rentals.map(r => ({
            reservation_id: insertedRes.id,
            rental_item_id: r.rental_item_id,
            quantity: r.quantity,
            subtotal: r.subtotal,
          }))
        );
      }
    }

    return newRes;
  };

  const updateReservationStatus = async (id: number, status: ReservationStatus) => {
    const updated = reservations.map(r => (r.id === id ? { ...r, status } : r));
    setReservations(updated);
    mockStore.saveReservations(updated);

    const targetRes = reservations.find(r => r.id === id);
    if (targetRes) {
      // Customer notification
      const custNotif: Notification = {
        id: Date.now(),
        user_id: targetRes.customer_id,
        title: `Reservation ${status.toUpperCase()}`,
        message: `Your booking ${targetRes.booking_code} status has been updated to "${status.replace('_', ' ')}".`,
        is_read: false,
        created_at: new Date().toISOString(),
      };
      const notifs = [custNotif, ...notifications];
      setNotifications(notifs);
      mockStore.saveNotifications(notifs);
    }

    if (isSupabaseConfigured()) {
      await supabase.from('reservations').update({ status }).eq('id', id);
    }
  };

  // --- Payment Actions ---
  const submitPayment = async (data: {
    reservation_id: number;
    amount: number;
    payment_type: 'downpayment' | 'full_payment' | 'final_balance';
    payment_method: 'cash' | 'bank_transfer' | 'gcash' | 'credit_card';
    reference_number?: string;
    proof_image_url?: string;
  }) => {
    const newPayment: Payment = {
      id: Date.now(),
      reservation_id: data.reservation_id,
      amount: data.amount,
      payment_type: data.payment_type,
      payment_method: data.payment_method,
      reference_number: data.reference_number || 'REF-' + Date.now(),
      proof_image_url: data.proof_image_url || '/images/receipt_sample.svg',
      status: 'pending_verification',
      paid_at: new Date().toISOString(),
      verified_at: null,
      reservation: reservations.find(r => r.id === data.reservation_id),
    };

    const updated = [newPayment, ...payments];
    setPayments(updated);
    mockStore.savePayments(updated);

    // Notify admin
    const adminNotif: Notification = {
      id: Date.now(),
      user_id: '00000000-0000-0000-0000-000000000001',
      title: 'Payment Awaiting Verification',
      message: `₱${data.amount.toLocaleString()} received via ${data.payment_method.toUpperCase()} for Ref ${data.reference_number}.`,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    const notifs = [adminNotif, ...notifications];
    setNotifications(notifs);
    mockStore.saveNotifications(notifs);

    if (isSupabaseConfigured()) {
      await supabase.from('payments').insert({
        reservation_id: data.reservation_id,
        amount: data.amount,
        payment_type: data.payment_type,
        payment_method: data.payment_method,
        reference_number: data.reference_number,
        proof_image_url: data.proof_image_url,
        status: 'pending_verification',
      });
    }

    return newPayment;
  };

  const verifyPayment = async (id: number, status: PaymentStatus) => {
    const updated = payments.map(p =>
      p.id === id
        ? {
            ...p,
            status,
            verified_at: status === 'verified' ? new Date().toISOString() : null,
          }
        : p
    );
    setPayments(updated);
    mockStore.savePayments(updated);

    const payment = payments.find(p => p.id === id);
    if (payment) {
      const targetRes =
        payment.reservation || reservations.find(r => r.id === payment.reservation_id);

      if (targetRes) {
        // When payment is verified for a pending reservation, confirm the booking
        if (
          status === 'verified' &&
          targetRes.status === 'pending' &&
          (payment.payment_type === 'downpayment' || payment.payment_type === 'full_payment')
        ) {
          const updatedRes = reservations.map(r =>
            r.id === targetRes.id ? { ...r, status: 'confirmed' as ReservationStatus } : r
          );
          setReservations(updatedRes);
          mockStore.saveReservations(updatedRes);

          if (isSupabaseConfigured()) {
            await supabase.from('reservations').update({ status: 'confirmed' }).eq('id', targetRes.id);
          }
        }

        const custNotif: Notification = {
          id: Date.now(),
          user_id: targetRes.customer_id,
          title: status === 'verified' ? 'Payment Verified & Booking Confirmed!' : 'Payment Issue Flagged',
          message:
            status === 'verified'
              ? `Your payment of ₱${payment.amount.toLocaleString()} for ${targetRes.booking_code} has been approved.`
              : `Your payment of ₱${payment.amount.toLocaleString()} for ${targetRes.booking_code} could not be verified. Please check reference details.`,
          is_read: false,
          created_at: new Date().toISOString(),
        };
        const notifs = [custNotif, ...notifications];
        setNotifications(notifs);
        mockStore.saveNotifications(notifs);
      }
    }

    if (isSupabaseConfigured()) {
      await supabase
        .from('payments')
        .update({
          status,
          verified_at: status === 'verified' ? new Date().toISOString() : null,
        })
        .eq('id', id);
    }
  };

  // --- Notification Actions ---
  const markNotificationAsRead = async (id: number) => {
    const updated = notifications.map(n => (n.id === id ? { ...n, is_read: true } : n));
    setNotifications(updated);
    mockStore.saveNotifications(updated);
    if (isSupabaseConfigured()) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    }
  };

  const markAllNotificationsAsRead = async (userId: string) => {
    const updated = notifications.map(n =>
      n.user_id === userId || userId === 'all' ? { ...n, is_read: true } : n
    );
    setNotifications(updated);
    mockStore.saveNotifications(updated);
    if (isSupabaseConfigured()) {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
    }
  };

  return {
    themes,
    categories,
    menuItems,
    packages,
    rentals,
    reservations,
    payments,
    notifications,
    profiles,
    loading,
    refreshData,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    addPackage,
    updatePackage,
    deletePackage,
    addTheme,
    updateTheme,
    addRentalItem,
    updateRentalItem,
    createReservation,
    updateReservationStatus,
    submitPayment,
    verifyPayment,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  };
}

export default useCateringData;
