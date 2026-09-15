export type UserRole = 'admin' | 'customer';

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type PaymentStatus =
  | 'pending_verification'
  | 'verified'
  | 'rejected';

export type PaymentType =
  | 'downpayment'
  | 'full_payment'
  | 'final_balance';

export type PaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'gcash'
  | 'credit_card';

export interface Profile {
  id: string;
  name: string;
  phone?: string | null;
  role: UserRole;
  created_at?: string;
}

export interface EventTheme {
  id: number;
  name: string;
  tagline?: string | null;
  description?: string | null;
  image_url?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface MenuCategory {
  id: number;
  name: string;
  display_order: number;
}

export interface MenuItem {
  id: number;
  category_id: number;
  name: string;
  description?: string | null;
  price_per_head: number;
  is_available: boolean;
}

export interface Package {
  id: number;
  name: string;
  description?: string | null;
  price_per_pax: number;
  min_pax: number;
  theme_id?: number | null;
  created_at?: string;
}

export interface RentalItem {
  id: number;
  name: string;
  category: string;
  rate_per_unit: number;
  stock_quantity: number;
  is_available: boolean;
}

export interface ReservationRental {
  id: number;
  reservation_id: number;
  rental_item_id: number;
  quantity: number;
  subtotal: number;
  rental_item?: RentalItem;
}

export interface Reservation {
  id: number;
  booking_code: string;
  customer_id: string;
  theme_id?: number | null;
  package_id?: number | null;
  event_date: string;
  event_time: string;
  venue_address: string;
  guest_count: number;
  special_requests?: string | null;
  total_amount: number;
  status: ReservationStatus;
  created_at: string;
  updated_at?: string;
  // Joined fields
  customer?: Profile;
  theme?: EventTheme;
  package?: Package;
  rentals?: ReservationRental[];
}

export interface Payment {
  id: number;
  reservation_id: number;
  amount: number;
  payment_type: PaymentType;
  payment_method: PaymentMethod;
  reference_number?: string | null;
  proof_image_url?: string | null;
  status: PaymentStatus;
  paid_at: string;
  verified_at?: string | null;
  reservation?: Reservation;
}

export interface Notification {
  id: number;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
