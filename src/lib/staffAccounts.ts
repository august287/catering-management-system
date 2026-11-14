import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { mockStore } from '@/lib/mockData';
import { STRONG_PASSWORD, STRONG_PASSWORD_MESSAGE } from '@/lib/staffRules';

export { STRONG_PASSWORD, STRONG_PASSWORD_MESSAGE, staffActionError } from '@/lib/staffRules';

// Name of the deployed Edge Function holding supabase/functions/manage-staff/index.ts.
// If it is deployed under another name in the dashboard, change this to match.
export const MANAGE_STAFF_FUNCTION_NAME = 'manage-staff';

async function callManageStaff(body: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke(MANAGE_STAFF_FUNCTION_NAME, { body });
  if (error) {
    // The function's own JSON error message is more useful than the generic one.
    let message = error.message;
    try {
      const res = await (error as { context?: Response }).context?.json();
      if (res?.error) message = res.error;
    } catch {
      /* keep generic message */
    }
    throw new Error(message || 'The request failed. Is the manage-staff function deployed?');
  }
  if (!data?.ok) throw new Error(data?.error || 'The request failed.');
}

/** Permanently deletes a staff account (login and profile). */
export async function deleteStaffAccount(userId: string): Promise<void> {
  if (isSupabaseConfigured()) {
    await callManageStaff({ action: 'delete', user_id: userId });
    return;
  }
  // Offline demo store.
  mockStore.deleteUser(userId);
}

/** Sets a new password for a staff account. */
export async function setStaffPassword(userId: string, password: string): Promise<void> {
  if (!STRONG_PASSWORD.test(password)) throw new Error(STRONG_PASSWORD_MESSAGE);
  if (isSupabaseConfigured()) {
    await callManageStaff({ action: 'set_password', user_id: userId, password });
    return;
  }
  const accounts = mockStore.getAccounts();
  if (!accounts.some(a => a.profileId === userId)) throw new Error('This account has no login to update.');
  mockStore.saveAccounts(accounts.map(a => (a.profileId === userId ? { ...a, password } : a)));
}
