export type UserRole = 'super_admin' | 'admin' | 'customer';

/** True for any role that can use the admin portal. */
export const isAdminRole = (role?: string | null): boolean =>
  role === 'admin' || role === 'super_admin';

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  customer: 'Customer',
};

export const CUSTOMER_PROMOTION_ERROR = 'Customer accounts cannot be promoted to Admin or Super Admin.';

/**
 * Returns why a role change isn't allowed, or null if it is.
 * Customers can never become staff (admin or super admin) from the app.
 * Keep in sync with prevent_profile_role_change() in the database.
 */
export function roleChangeError(from: UserRole, to: UserRole): string | null {
  if (from === to) return null;
  if (from === 'customer' && isAdminRole(to)) return CUSTOMER_PROMOTION_ERROR;
  return null;
}

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
  image_url?: string | null;
  is_available: boolean;
}

export interface Package {
  id: number;
  name: string;
  description?: string | null;
  price_per_pax: number;
  min_pax: number;
  theme_id?: number | null;
  /**
   * How many dishes per course the customer chooses, e.g.
   * { counts: { main: 3, appetizer: 1 }, included: ['Bottomless Iced Tea'] }.
   * See src/lib/menuCourses.ts. Null = use the tier's built-in default.
   */
  menu_rules?: { counts: Record<string, number>; included?: string[] } | null;
  created_at?: string;
}

/** One dish the customer chose for their event. */
export interface MenuSelectionItem {
  course: string;
  item_id: number;
  /** Dish name at booking time, kept even if the dish is renamed or removed later. */
  name: string;
}

export interface RentalItem {
  id: number;
  name: string;
  category: string;
  rate_per_unit: number;
  stock_quantity: number;
  is_available: boolean;
  image_url?: string | null;
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
  /** Dishes the customer chose within their package allowance. */
  menu_selection?: MenuSelectionItem[] | null;
  /** Hours of buffet service booked (migration 019). */
  service_hours?: number | null;
  /** Number of servers / waitstaff booked (migration 019). */
  server_count?: number | null;
  /** When the customer agreed to the terms & conditions (migration 019). */
  terms_accepted_at?: string | null;
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
