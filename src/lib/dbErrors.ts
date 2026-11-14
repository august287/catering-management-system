/**
 * Turns raw PostgreSQL constraint errors into messages fit for users, so table
 * and constraint names (e.g. "reservations_guest_count_range") never show in
 * the UI. Messages raised on purpose by our own triggers/functions (for example
 * "Guest count must be between 100 and 200 pax." or DATE_FULLY_BOOKED) are
 * already readable and are returned unchanged.
 */
export function friendlyDbError(
  error: { message?: string | null; code?: string | null } | null | undefined,
  fallback = 'Something went wrong while saving. Please try again.'
): string {
  const message = error?.message?.trim() || '';
  if (!message) return fallback;

  if (/duplicate key value violates unique constraint/i.test(message)) {
    return 'This record already exists. Please check for a duplicate entry.';
  }
  if (/violates foreign key constraint/i.test(message)) {
    return 'This record is linked to other data that is missing or still in use.';
  }
  if (/violates not-null constraint/i.test(message)) {
    return 'A required field is missing. Please fill in every required field.';
  }
  if (/violates check constraint/i.test(message)) {
    return 'This change does not meet the booking rules. Please review the details and try again.';
  }
  return message;
}
