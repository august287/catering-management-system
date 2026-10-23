import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockData';
import {
  isAtLeastOneWeekAhead,
  isValidGuestCount,
  isValidPaymentReference,
  MIN_GUEST_COUNT,
  MAX_GUEST_COUNT,
} from '@/lib/utils';
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

  // Lightweight notifications-only refresh used by the Realtime fallbacks
  // (reconnect catch-up, tab focus, and periodic safety-net polling).
  const refreshNotifications = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('id', { ascending: false });
      if (!error && data) setNotifications(data as Notification[]);
    } catch (err) {
      console.warn('Failed to refresh notifications:', err);
    }
  }, []);

  useEffect(() => {
    refreshData();

    // Real-time notification sync when Supabase is configured.
    if (supabaseActive) {
      const channelId = 'notif-' + Math.random().toString(36).substring(2, 9);
      const channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          (payload) => {
            const newNotif = payload.new as Notification;
            // Dedup: the inserting client already added this row optimistically.
            setNotifications(prev =>
              prev.some(n => n.id === newNotif.id) ? prev : [newNotif, ...prev]
            );
          }
        )
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'notifications' },
          (payload) => {
            const updated = payload.new as Notification;
            setNotifications(prev =>
              prev.map(n => (n.id === updated.id ? { ...n, ...updated } : n))
            );
          }
        )
        .on(
          'postgres_changes',
          { event: 'DELETE', schema: 'public', table: 'notifications' },
          (payload) => {
            const deletedId = (payload.old as { id?: number })?.id;
            if (deletedId !== undefined) {
              setNotifications(prev => prev.filter(n => n.id !== deletedId));
            }
          }
        )
        .subscribe((status) => {
          // Catch up on any events missed while the socket was down/reconnecting.
          if (status === 'SUBSCRIBED') refreshNotifications();
        });

      // If the tab regains focus, pull the latest notifications (also covers the
      // case where the browser suspended the websocket in the background).
      const onFocus = () => {
        if (document.visibilityState === 'visible') refreshNotifications();
      };
      document.addEventListener('visibilitychange', onFocus);
      window.addEventListener('focus', onFocus);

      // Safety net: if Realtime is disabled/blocked on the project, polling keeps
      // notifications flowing (lightweight, notifications table only).
      const pollId = window.setInterval(refreshNotifications, 30000);

      return () => {
        window.clearInterval(pollId);
        document.removeEventListener('visibilitychange', onFocus);
        window.removeEventListener('focus', onFocus);
        supabase.removeChannel(channel);
      };
    }
  }, [refreshData, refreshNotifications, supabaseActive]);

  // --- Menu Item Actions ---
  const addMenuItem = async (item: Omit<MenuItem, 'id'>) => {
    const newItem: MenuItem = { ...item, id: Date.now() };
    const updated = [newItem, ...menuItems];
    setMenuItems(updated);
    mockStore.saveMenuItems(updated);
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('menu_items').insert(item).select().single();
      if (error) {
        setMenuItems(prev => {
          const next = prev.filter(m => m.id !== newItem.id);
          mockStore.saveMenuItems(next);
          return next;
        });
        throw new Error(error.message);
      }
      if (data) {
        const reconciled = data as MenuItem;
        setMenuItems(prev => {
          const next = prev.map(m => (m.id === newItem.id ? reconciled : m));
          mockStore.saveMenuItems(next);
          return next;
        });
        newItem.id = reconciled.id;
        return reconciled;
      }
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
      const { data, error } = await supabase.from('packages').insert(pkg).select().single();
      if (error) {
        setPackages(prev => {
          const next = prev.filter(p => p.id !== newPkg.id);
          mockStore.savePackages(next);
          return next;
        });
        throw new Error(error.message);
      }
      if (data) {
        const reconciled = data as Package;
        setPackages(prev => {
          const next = prev.map(p => (p.id === newPkg.id ? reconciled : p));
          mockStore.savePackages(next);
          return next;
        });
        newPkg.id = reconciled.id;
        return reconciled;
      }
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
      const { data, error } = await supabase.from('event_themes').insert(theme).select().single();
      if (error) {
        setThemes(prev => {
          const next = prev.filter(t => t.id !== newTh.id);
          mockStore.saveThemes(next);
          return next;
        });
        throw new Error(error.message);
      }
      if (data) {
        const reconciled = data as EventTheme;
        setThemes(prev => {
          const next = prev.map(t => (t.id === newTh.id ? reconciled : t));
          mockStore.saveThemes(next);
          return next;
        });
        newTh.id = reconciled.id;
        return reconciled;
      }
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
      const { data, error } = await supabase.from('rental_items').insert(rental).select().single();
      if (error) {
        setRentals(prev => {
          const next = prev.filter(r => r.id !== newRent.id);
          mockStore.saveRentals(next);
          return next;
        });
        throw new Error(error.message);
      }
      if (data) {
        const reconciled = data as RentalItem;
        setRentals(prev => {
          const next = prev.map(r => (r.id === newRent.id ? reconciled : r));
          mockStore.saveRentals(next);
          return next;
        });
        newRent.id = reconciled.id;
        return reconciled;
      }
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
    if (!isAtLeastOneWeekAhead(data.event_date)) {
      throw new Error(
        'Reservations must be booked at least 1 week (7 days) before the event date.'
      );
    }

    if (!isValidGuestCount(data.guest_count)) {
      throw new Error(`Guest count must be between ${MIN_GUEST_COUNT} and ${MAX_GUEST_COUNT} pax.`);
    }

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
    const adminId = profiles.find(p => p.role === 'admin')?.id || '00000000-0000-0000-0000-000000000001';
    const adminNotif: Notification = {
      id: Date.now(),
      user_id: adminId,
      title: 'New Booking Created',
      message: `Reservation ${booking_code} placed for ${data.guest_count} pax.`,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    const notifs = [adminNotif, ...notifications];
    setNotifications(notifs);
    mockStore.saveNotifications(notifs);

    if (isSupabaseConfigured()) {
      // Let the `set_booking_code` trigger generate a guaranteed-unique code, and
      // let the serial sequence generate `id`. A client-computed code can collide
      // with other customers' rows that RLS hides (see BUG-01 / migration 004).
      const { data: insertedRes, error: insertErr } = await supabase
        .from('reservations')
        .insert({
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

      if (insertErr || !insertedRes) {
        setReservations(prev => {
          const next = prev.filter(r => r.id !== newResId);
          mockStore.saveReservations(next);
          return next;
        });
        setNotifications(prev => {
          const next = prev.filter(n => n.id !== adminNotif.id);
          mockStore.saveNotifications(next);
          return next;
        });
        throw new Error(insertErr?.message || 'Failed to create reservation.');
      }

      setReservations(prev => {
        const next = prev.map(r =>
          r.id === newResId
            ? { ...r, id: insertedRes.id, booking_code: insertedRes.booking_code }
            : r
        );
        mockStore.saveReservations(next);
        return next;
      });
      newRes.id = insertedRes.id;
      newRes.booking_code = insertedRes.booking_code;

      if (data.rentals && data.rentals.length > 0) {
        await supabase.from('reservation_rentals').insert(
          data.rentals.map(r => ({
            reservation_id: insertedRes.id,
            rental_item_id: r.rental_item_id,
            quantity: r.quantity,
            subtotal: r.subtotal,
          }))
        );
      }

      // Insert WITHOUT `.select()`: the acting customer cannot SELECT a row
      // addressed to the admin under RLS. Requesting representation makes
      // PostgREST fail/rollback, so the admin would never receive the alert.
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: adminNotif.user_id,
        title: adminNotif.title,
        message: `Reservation ${insertedRes.booking_code} placed for ${data.guest_count} pax.`,
      });
      if (notifError) {
        console.error('Failed to notify admin of new booking:', notifError.message);
      } else {
        await refreshNotifications();
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

      if (isSupabaseConfigured()) {
        // Insert without `.select()` so the actor doesn't need SELECT rights on a
        // row addressed to another user (RLS would otherwise reject the return).
        const { error: notifError } = await supabase.from('notifications').insert({
          user_id: custNotif.user_id,
          title: custNotif.title,
          message: custNotif.message,
        });
        if (notifError) {
          console.error('Failed to notify customer of status change:', notifError.message);
        } else {
          await refreshNotifications();
        }
      }
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
    proof_file?: File | null;
  }) => {
    const targetReservation = reservations.find(r => r.id === data.reservation_id);
    if (!targetReservation) {
      throw new Error('Selected reservation does not exist.');
    }
    if (targetReservation.status === 'cancelled' || targetReservation.status === 'completed') {
      throw new Error(`Cannot submit payment for a ${targetReservation.status} reservation.`);
    }

    const referenceNumber = data.reference_number?.trim();
    const roundedAmount = Math.round(data.amount * 100) / 100;

    if (!Number.isFinite(roundedAmount) || roundedAmount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }
    if (data.payment_method !== 'cash' && !referenceNumber) {
      throw new Error('A transaction reference number is required for this payment method.');
    }
    if (referenceNumber && !isValidPaymentReference(referenceNumber)) {
      throw new Error(
        'Enter a valid reference number: 6–80 characters using letters, numbers, hyphens, underscores, or periods only.'
      );
    }
    if (data.payment_method !== 'cash' && !data.proof_file && !data.proof_image_url?.trim()) {
      throw new Error('A proof of payment image is required for this payment method.');
    }
    if (
      referenceNumber &&
      payments.some(
        p => p.reference_number?.trim().toLowerCase() === referenceNumber.toLowerCase()
      )
    ) {
      throw new Error('This transaction reference number has already been submitted.');
    }

    const reservationPayments = payments.filter(p => p.reservation_id === data.reservation_id);
    const verifiedPaid = reservationPayments
      .filter(p => p.status === 'verified')
      .reduce((sum, p) => sum + p.amount, 0);
    const pendingPaid = reservationPayments
      .filter(p => p.status === 'pending_verification')
      .reduce((sum, p) => sum + p.amount, 0);
    const outstandingBalance = Math.max(
      0,
      targetReservation.total_amount - verifiedPaid - pendingPaid
    );

    if (outstandingBalance <= 0) {
      throw new Error(
        'This reservation is already fully covered by verified or pending payments.'
      );
    }
    if (roundedAmount > outstandingBalance + 0.005) {
      throw new Error(
        `Payment amount cannot exceed the outstanding balance of ₱${outstandingBalance.toLocaleString(
          'en-PH',
          { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        )}.`
      );
    }

    const finalReference =
      referenceNumber || (data.payment_method === 'cash' ? `CASH-${Date.now()}` : null);

    let finalProofUrl: string | null = data.proof_image_url || null;

    if (isSupabaseConfigured() && data.proof_file) {
      const fileExt = data.proof_file.name.split('.').pop()?.toLowerCase() || 'png';
      const authUser = (await supabase.auth.getUser())?.data?.user;
      const targetUserId = authUser?.id || targetReservation.customer_id;
      const filePath = `${targetUserId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, data.proof_file, {
          contentType: data.proof_file.type,
          upsert: false,
        });

      if (uploadErr) {
        console.error('Storage bucket upload failed:', uploadErr);
        throw new Error(`Proof of payment upload failed: ${uploadErr.message}`);
      }

      // Generate signed URL (1-year validity for secure viewing)
      const { data: signedData, error: signErr } = await supabase.storage
        .from('payment-proofs')
        .createSignedUrl(filePath, 60 * 60 * 24 * 365);

      if (signErr || !signedData?.signedUrl) {
        finalProofUrl = uploadData?.path || filePath;
      } else {
        finalProofUrl = signedData.signedUrl;
      }
    }

    const newPayment: Payment = {
      id: Date.now(),
      reservation_id: data.reservation_id,
      amount: roundedAmount,
      payment_type: data.payment_type,
      payment_method: data.payment_method,
      reference_number: finalReference,
      proof_image_url: finalProofUrl,
      status: 'pending_verification',
      paid_at: new Date().toISOString(),
      verified_at: null,
      reservation: targetReservation,
    };

    const updated = [newPayment, ...payments];
    setPayments(updated);
    mockStore.savePayments(updated);

    // Notify admin
    const adminId = profiles.find(p => p.role === 'admin')?.id || '00000000-0000-0000-0000-000000000001';
    const adminNotif: Notification = {
      id: Date.now(),
      user_id: adminId,
      title: 'Payment Awaiting Verification',
      message: `₱${roundedAmount.toLocaleString()} received via ${data.payment_method.toUpperCase()} for Ref ${finalReference || 'N/A'}.`,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    const notifs = [adminNotif, ...notifications];
    setNotifications(notifs);
    mockStore.saveNotifications(notifs);

    if (isSupabaseConfigured()) {
      const { data: insertedPay, error: insertError } = await supabase.from('payments').insert({
        reservation_id: data.reservation_id,
        amount: roundedAmount,
        payment_type: data.payment_type,
        payment_method: data.payment_method,
        reference_number: finalReference,
        proof_image_url: finalProofUrl,
        status: 'pending_verification',
      }).select().single();

      if (insertError) {
        setPayments(prev => {
          const next = prev.filter(p => p.id !== newPayment.id);
          mockStore.savePayments(next);
          return next;
        });
        setNotifications(prev => {
          const next = prev.filter(n => n.id !== adminNotif.id);
          mockStore.saveNotifications(next);
          return next;
        });
        if (insertError.code === '23505') {
          throw new Error('This transaction reference number has already been submitted.');
        }
        throw new Error(insertError.message);
      }

      if (insertedPay) {
        setPayments(prev => {
          const next = prev.map(p => (p.id === newPayment.id ? { ...p, id: insertedPay.id } : p));
          mockStore.savePayments(next);
          return next;
        });
        newPayment.id = insertedPay.id;
      }

      // Insert WITHOUT `.select()`: the customer cannot SELECT an admin-addressed
      // row under RLS, which would make PostgREST fail/rollback the insert.
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: adminNotif.user_id,
        title: adminNotif.title,
        message: adminNotif.message,
      });
      if (notifError) {
        console.error('Failed to notify admin of payment:', notifError.message);
      } else {
        await refreshNotifications();
      }
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

        if (isSupabaseConfigured()) {
          const { error: notifError } = await supabase.from('notifications').insert({
            user_id: custNotif.user_id,
            title: custNotif.title,
            message: custNotif.message,
          });
          if (notifError) {
            console.error('Failed to notify customer of payment verification:', notifError.message);
          } else {
            await refreshNotifications();
          }
        }
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
      if (userId === 'all') {
        await supabase.from('notifications').update({ is_read: true }).gte('id', 0);
      } else {
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
      }
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
