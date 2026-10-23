import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export const MIN_BOOKING_DAYS = 7;
export const MIN_GUEST_COUNT = 100;
export const MAX_GUEST_COUNT = 200;

export function isValidGuestCount(count: number): boolean {
  return Number.isInteger(count) && count >= MIN_GUEST_COUNT && count <= MAX_GUEST_COUNT;
}

export const PAYMENT_REFERENCE_MIN_LENGTH = 6;
export const PAYMENT_REFERENCE_MAX_LENGTH = 80;
export const PAYMENT_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function isValidPaymentReference(reference: string): boolean {
  const value = reference.trim();
  return (
    value.length >= PAYMENT_REFERENCE_MIN_LENGTH &&
    value.length <= PAYMENT_REFERENCE_MAX_LENGTH &&
    PAYMENT_REFERENCE_PATTERN.test(value)
  );
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getMinimumBookingDate(from: Date = new Date()): string {
  const min = new Date(from);
  min.setHours(0, 0, 0, 0);
  min.setDate(min.getDate() + MIN_BOOKING_DAYS);
  return toLocalDateString(min);
}

export function isAtLeastOneWeekAhead(dateString: string, from: Date = new Date()): boolean {
  if (!dateString) return false;
  return dateString >= getMinimumBookingDate(from);
}

export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount ?? 0);
  if (isNaN(num)) return '₱0.00';
  return '₱' + num.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatTime(timeString: string | null | undefined): string {
  if (!timeString) return '—';
  try {
    const [hours, minutes] = timeString.split(':');
    if (hours === undefined || minutes === undefined) return timeString;
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedH = h % 12 || 12;
    const formattedM = m < 10 ? `0${m}` : `${m}`;
    return `${formattedH}:${formattedM} ${ampm}`;
  } catch {
    return timeString;
  }
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const letters = parts.slice(0, 2).map(p => p[0]?.toUpperCase() || '');
  return letters.join('') || '?';
}
