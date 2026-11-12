import React, { useMemo, useState } from 'react';
import { AlertCircle, KeyRound, Lock, Pencil, ShieldCheck, ShieldPlus, Trash2, User, UserCog } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { setStaffPassword, staffActionError, STRONG_PASSWORD, STRONG_PASSWORD_MESSAGE } from '@/lib/staffAccounts';
import { canRename, displayNameError } from '@/lib/staffRules';
import { Input } from '@/components/ui/Input';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { SearchInput } from '@/components/ui/SearchInput';
import { ConfirmationModal } from '@/components/ui/Modal';
import { Pagination } from '@/components/ui/Pagination';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/hooks/useAuth';
import { useCateringData } from '@/hooks/useCateringData';
import { usePagination } from '@/hooks/usePagination';
import { formatDate } from '@/lib/utils';
import { Profile, UserRole, ROLE_LABELS, CUSTOMER_PROMOTION_ERROR, roleChangeError } from '@/types/database';

const ROLE_ORDER: UserRole[] = ['super_admin', 'admin', 'customer'];

const ROLE_BADGE: Record<UserRole, 'gold' | 'confirmed' | 'default'> = {
  super_admin: 'gold',
  admin: 'confirmed',
  customer: 'default',
};

type RoleFilter = 'all' | UserRole;

interface PendingChange {
  user: Profile;
  role: UserRole;
}

export function UserManagement() {
  const { profile: me, setOwnDisplayName } = useAuth();
  const { profiles, updateProfileRole, removeStaffAccount, updateProfileName } = useCateringData();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [saving, setSaving] = useState(false);

  // Delete / change password for staff accounts
  const [toDelete, setToDelete] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pwUser, setPwUser] = useState<Profile | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  // Rename (display name)
  const [renameUser, setRenameUser] = useState<Profile | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const [renameSaving, setRenameSaving] = useState(false);

  const openRenameDialog = (u: Profile) => {
    setRenameUser(u);
    // Accounts made in the Supabase dashboard start as "New Customer"; start blank instead.
    setRenameValue(u.name === 'New Customer' ? '' : u.name);
    setRenameError('');
  };

  const handleRenameSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameUser) return;
    if (!canRename(me, renameUser)) return setRenameError('You cannot rename this account.');
    const invalid = displayNameError(renameValue);
    if (invalid) return setRenameError(invalid);
    setRenameSaving(true);
    setRenameError('');
    try {
      const saved = await updateProfileName(renameUser.id, renameValue);
      if (renameUser.id === me?.id) setOwnDisplayName(saved);
      toast({ title: 'Display name saved', description: `Now shown as ${saved}.` });
      setRenameUser(null);
    } catch (err: any) {
      setRenameError(err?.message || 'Could not save the name. Please try again.');
    } finally {
      setRenameSaving(false);
    }
  };

  const openPasswordDialog = (u: Profile) => {
    setPwUser(u);
    setNewPassword('');
    setConfirmPassword('');
    setPwError('');
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwUser) return;
    const blocked = staffActionError(me, pwUser);
    if (blocked) return setPwError(blocked);
    if (!STRONG_PASSWORD.test(newPassword)) return setPwError(STRONG_PASSWORD_MESSAGE);
    if (newPassword !== confirmPassword) return setPwError('Passwords do not match.');
    setPwSaving(true);
    setPwError('');
    try {
      await setStaffPassword(pwUser.id, newPassword);
      toast({ title: 'Password changed', description: `${pwUser.name} can now sign in with the new password.` });
      setPwUser(null);
    } catch (err: any) {
      setPwError(err?.message || 'Could not change the password. Please try again.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const blocked = staffActionError(me, toDelete);
    if (blocked) {
      toast({ tone: 'error', title: 'Not allowed', description: blocked });
      setToDelete(null);
      return;
    }
    setDeleting(true);
    try {
      await removeStaffAccount(toDelete.id);
      toast({ title: 'Account deleted', description: `${toDelete.name}'s account was deleted.` });
      setToDelete(null);
    } catch (err: any) {
      toast({ tone: 'error', title: 'Could not delete account', description: err?.message || 'Please try again.' });
    } finally {
      setDeleting(false);
    }
  };

  const counts = useMemo(() => {
    const c: Record<UserRole, number> = { super_admin: 0, admin: 0, customer: 0 };
    profiles.forEach(p => {
      if (p.role in c) c[p.role] += 1;
    });
    return c;
  }, [profiles]);

  const users = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return profiles
      .filter(p => roleFilter === 'all' || p.role === roleFilter)
      .filter(
        p =>
          !q ||
          p.name.toLowerCase().includes(q) ||
          (p.phone && p.phone.toLowerCase().includes(q)) ||
          p.id.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const byRole = ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role);
        return byRole !== 0 ? byRole : a.name.localeCompare(b.name);
      });
  }, [profiles, searchQuery, roleFilter]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    totalPages,
    startIndex,
    endIndex,
    paginatedItems,
  } = usePagination(users, `${searchQuery}|${roleFilter}`);

  const handleConfirm = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      await updateProfileRole(pending.user.id, pending.role);
      toast({
        title: 'Role updated',
        description: `${pending.user.name} is now ${ROLE_LABELS[pending.role]}.`,
      });
      setPending(null);
    } catch (err: any) {
      toast({ tone: 'error', title: 'Could not change role', description: err?.message || 'Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const statCards: { role: UserRole; icon: React.ElementType; hint: string }[] = [
    { role: 'super_admin', icon: ShieldPlus, hint: 'Full access, manages users' },
    { role: 'admin', icon: ShieldCheck, hint: 'Runs bookings, menu, payments' },
    { role: 'customer', icon: User, hint: 'Books and pays for events' },
  ];

  const filterOptions: { value: RoleFilter; label: string }[] = [
    { value: 'all', label: `All (${profiles.length})` },
    ...ROLE_ORDER.map(r => ({ value: r, label: `${ROLE_LABELS[r]} (${counts[r]})` })),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-ink">User Management</h2>
        <p className="text-sm text-text-muted">
          Change staff access between Admin and Super Admin, reset a staff member's password, or delete a staff
          account. Customer accounts can't be promoted to staff. Only super admins can see this page.
        </p>
      </div>

      {/* Role counts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map(({ role, icon: Icon, hint }) => (
          <Card key={role}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-light text-gold-dark border border-gold/30">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">{ROLE_LABELS[role]}s</p>
                <p className="font-serif text-2xl font-bold text-ink leading-tight">{counts[role]}</p>
                <p className="text-[11px] text-text-faint">{hint}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search & filter */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
          <SearchInput
            wrapperClassName="w-full md:max-w-sm"
            placeholder="Search by name, phone, or account ID..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="text-xs"
          />
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by role">
            {filterOptions.map(opt => (
              <Button
                key={opt.value}
                type="button"
                size="sm"
                variant={roleFilter === opt.value ? 'gold' : 'outline'}
                onClick={() => setRoleFilter(opt.value)}
                aria-pressed={roleFilter === opt.value}
                className="text-xs"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Users table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-cream-dark/60 border-b border-border text-xs uppercase font-semibold text-text-muted">
                <tr>
                  <th className="px-6 py-3.5">User</th>
                  <th className="px-6 py-3.5">Phone</th>
                  <th className="px-6 py-3.5">Current Role</th>
                  <th className="px-6 py-3.5">Member Since</th>
                  <th className="px-6 py-3.5 text-right">Change Role</th>
                  <th className="px-6 py-3.5 text-right">Account</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-text-muted">
                      No users match your search.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map(u => {
                    const isMe = u.id === me?.id;
                    return (
                      <tr key={u.id} className="hover:bg-cream/40 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold-light text-gold-dark font-bold text-xs border border-gold/30">
                              {u.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-ink">
                                {u.name} {isMe && <span className="text-[11px] font-normal text-text-muted">(you)</span>}
                              </div>
                              <div className="text-[11px] text-text-muted">ID: {u.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-text">{u.phone || '—'}</td>
                        <td className="px-6 py-4">
                          <Badge variant={ROLE_BADGE[u.role] ?? 'default'}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                        </td>
                        <td className="px-6 py-4 text-xs text-text-muted">
                          {u.created_at ? formatDate(u.created_at) : '—'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {u.role === 'customer' ? (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] text-text-faint"
                              title={CUSTOMER_PROMOTION_ERROR}
                            >
                              <Lock className="h-3 w-3" aria-hidden="true" />
                              Customers can't be promoted
                            </span>
                          ) : (
                            <>
                              <label htmlFor={`role-${u.id}`} className="sr-only">
                                Role for {u.name}
                              </label>
                              <Select
                                id={`role-${u.id}`}
                                value={u.role}
                                disabled={isMe}
                                title={isMe ? "You can't change your own role" : undefined}
                                onChange={e => {
                                  const role = e.target.value as UserRole;
                                  if (role === u.role) return;
                                  const invalid = roleChangeError(u.role, role);
                                  if (invalid) {
                                    toast({ tone: 'error', title: 'Not allowed', description: invalid });
                                    return;
                                  }
                                  setPending({ user: u, role });
                                }}
                                className="ml-auto w-40 text-xs"
                              >
                                {ROLE_ORDER.map(r => (
                                  <option key={r} value={r} disabled={!!roleChangeError(u.role, r)}>
                                    {ROLE_LABELS[r]}
                                  </option>
                                ))}
                              </Select>
                            </>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          {canRename(me, u) || staffActionError(me, u) === null ? (
                            <div className="flex justify-end gap-1.5">
                              {canRename(me, u) && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openRenameDialog(u)}
                                  className="gap-1 text-xs"
                                  aria-label={`Rename ${u.name}`}
                                >
                                  <Pencil className="h-3.5 w-3.5" /> Rename
                                </Button>
                              )}
                              {staffActionError(me, u) === null && (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openPasswordDialog(u)}
                                    className="gap-1 text-xs"
                                    aria-label={`Change password for ${u.name}`}
                                  >
                                    <KeyRound className="h-3.5 w-3.5" /> Password
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setToDelete(u)}
                                    className="gap-1 text-xs"
                                    aria-label={`Delete ${u.name}'s account`}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                  </Button>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-text-faint">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {users.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              total={total}
              startIndex={startIndex}
              endIndex={endIndex}
            />
          )}
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-xs text-text-muted">
        <UserCog className="h-3.5 w-3.5 text-gold" />
        Role changes apply the next time that user signs in.
      </p>

      <ConfirmationModal
        open={!!pending}
        onOpenChange={open => !open && !saving && setPending(null)}
        onConfirm={handleConfirm}
        loading={saving}
        variant="warning"
        title="Change user role?"
        description={
          pending
            ? `${pending.user.name} will change from ${ROLE_LABELS[pending.user.role]} to ${ROLE_LABELS[pending.role]}.` +
              (pending.role === 'customer'
                ? ' Customers cannot be promoted back to staff from this page, so this cannot be undone here.'
                : '')
            : ''
        }
        confirmLabel="Change Role"
      />

      {/* Delete staff account */}
      <ConfirmationModal
        open={!!toDelete}
        onOpenChange={open => !open && !deleting && setToDelete(null)}
        onConfirm={handleDelete}
        loading={deleting}
        variant="danger"
        title="Delete this staff account?"
        description={
          toDelete
            ? `${toDelete.name} (${ROLE_LABELS[toDelete.role]}) will be signed out and can no longer log in. Their account and notifications are permanently deleted. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete Account"
      />

      {/* Rename (display name) */}
      <Dialog
        open={!!renameUser}
        onOpenChange={open => !open && !renameSaving && setRenameUser(null)}
        title="Change display name"
        description={
          renameUser
            ? renameUser.id === me?.id
              ? 'This is the name shown in the sidebar and top bar.'
              : `Shown wherever ${renameUser.name} appears in the app.`
            : undefined
        }
      >
        <form onSubmit={handleRenameSave} className="space-y-4">
          {renameError && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{renameError}</span>
            </div>
          )}
          <div>
            <label htmlFor="display-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
              Display name
            </label>
            <Input
              id="display-name"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              maxLength={60}
              autoComplete="name"
              disabled={renameSaving}
              placeholder="e.g. Natalie Santos"
              autoFocus
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setRenameUser(null)} disabled={renameSaving}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" disabled={renameSaving}>
              {renameSaving ? 'Saving…' : 'Save Name'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Change staff password */}
      <Dialog
        open={!!pwUser}
        onOpenChange={open => !open && !pwSaving && setPwUser(null)}
        title="Change password"
        description={pwUser ? `Set a new password for ${pwUser.name} (${ROLE_LABELS[pwUser.role]}).` : undefined}
      >
        <form onSubmit={handlePasswordSave} className="space-y-4">
          {pwError && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{pwError}</span>
            </div>
          )}
          <div>
            <label htmlFor="staff-new-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
              New password
            </label>
            <PasswordInput
              id="staff-new-password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
              disabled={pwSaving}
              required
            />
            <p className="mt-1 text-[11px] text-text-faint">
              At least 8 characters, with an uppercase letter, lowercase letter, number, and special character.
            </p>
          </div>
          <div>
            <label htmlFor="staff-confirm-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-text-muted">
              Confirm new password
            </label>
            <PasswordInput
              id="staff-confirm-password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              disabled={pwSaving}
              required
            />
          </div>
          <p className="text-[11px] text-text-muted">
            Share the new password with them privately. They can change it later with "Forgot password".
          </p>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setPwUser(null)} disabled={pwSaving}>
              Cancel
            </Button>
            <Button type="submit" variant="gold" disabled={pwSaving}>
              {pwSaving ? 'Saving…' : 'Change Password'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

export default UserManagement;
