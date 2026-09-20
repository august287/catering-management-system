import React from 'react';
import { AlertTriangle, Info, Trash2, CheckCircle2, LogOut } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

type ModalVariant = 'danger' | 'warning' | 'info' | 'success' | 'logout';

export interface ConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ModalVariant;
  loading?: boolean;
  className?: string;
}

const variantConfig: Record<
  ModalVariant,
  {
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    buttonVariant: 'destructive' | 'gold' | 'default';
  }
> = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    buttonVariant: 'destructive',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    buttonVariant: 'gold',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    buttonVariant: 'default',
  },
  success: {
    icon: CheckCircle2,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    buttonVariant: 'gold',
  },
  logout: {
    icon: LogOut,
    iconBg: 'bg-red-100',       
    iconColor: 'text-red-600',  
    buttonVariant: 'destructive', 
  },
};

export function ConfirmationModal({
  open,
  onOpenChange,
  onConfirm,
  title = 'Are you sure?',
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
  className,
}: ConfirmationModalProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className={cn('max-w-md', className)}>
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        <div className={cn('flex h-14 w-14 items-center justify-center rounded-full', config.iconBg)}>
          <Icon className={cn('h-7 w-7', config.iconColor)} />
        </div>

        {/* Title */}
        <h3 className="mt-4 font-serif text-lg font-bold text-ink">{title}</h3>

        {/* Description */}
        {description && (
          <p className="mt-2 text-sm text-text-muted leading-relaxed">{description}</p>
        )}

        {/* Actions */}
        <div className="mt-6 flex w-full gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={config.buttonVariant}
            className="flex-1"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// Dedicated Logout Modal Wrapper
export interface LogoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading?: boolean;
}

export function LogoutModal({ open, onOpenChange, onConfirm, loading = false }: LogoutModalProps) {
  return (
    <ConfirmationModal
  open={open}
  onOpenChange={onOpenChange}
  onConfirm={onConfirm}
  title="Sign Out"
  description="Are you sure you want to sign out of your account? You will need to log back in to manage your reservations."
  confirmLabel="Sign Out"
  cancelLabel="Cancel"
  variant="logout"
  loading={loading}
/>
  );
}

export default ConfirmationModal;