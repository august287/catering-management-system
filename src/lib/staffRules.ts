// Rules for managing staff accounts. No imports, so the test runner can load this file.
// The manage-staff Edge Function checks the same rules on the server.

// Same rule as the Register and Reset Password pages.
export const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
export const STRONG_PASSWORD_MESSAGE =
  'Password must be at least 8 characters and include an uppercase letter, lowercase letter, number, and special character.';

const STAFF_ROLES = ['admin', 'super_admin'];

/** Returns why a display name is not allowed, or null if it is fine. */
export function displayNameError(name: string): string | null {
  const n = name.trim();
  if (n.length < 2) return 'Display name must be at least 2 characters.';
  if (n.length > 60) return 'Display name must be 60 characters or fewer.';
  if (/[<>]/.test(n)) return 'Display name cannot contain < or >.';
  return null;
}

/**
 * Who a super admin may rename: themselves, or any staff account.
 * (The database also lets every user rename their own profile.)
 */
export function canRename(
  caller: { id: string; role: string } | null | undefined,
  target: { id: string; role: string } | null | undefined
): boolean {
  if (!caller || !target || caller.role !== 'super_admin') return false;
  return target.id === caller.id || STAFF_ROLES.includes(target.role);
}

/** Returns why the caller may not delete / reset the password of this account, or null if they may. */
export function staffActionError(
  caller: { id: string; role: string } | null | undefined,
  target: { id: string; role: string } | null | undefined
): string | null {
  if (!caller || caller.role !== 'super_admin') return 'Only super admins can manage staff accounts.';
  if (!target) return 'User not found.';
  if (target.id === caller.id) return 'You cannot delete or change the password of your own account here.';
  if (!STAFF_ROLES.includes(target.role)) return 'Only staff accounts (Admin or Super Admin) can be managed here.';
  return null;
}
