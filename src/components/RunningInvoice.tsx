import React from 'react';
import { Minus, Plus, Receipt, ShieldCheck, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { DOWNPAYMENT_RATE } from '@/lib/bookingTerms';

export interface InvoiceStepper {
  /** Current value shown between the buttons, e.g. "10". */
  value: number;
  /** Unit for screen readers and the label, e.g. "pcs", "pax", "hrs". */
  unit: string;
  onIncrement: () => void;
  onDecrement: () => void;
  canIncrement: boolean;
  canDecrement: boolean;
  /** How much one click changes the value (for the button labels). Default 1. */
  step?: number;
}

export interface InvoiceLine {
  /** Stable key; defaults to the label. */
  id?: string;
  label: string;
  detail?: string;
  amount: number;
  /** Shown as "Included" instead of ₱0.00. */
  included?: boolean;
  /** Adds − / + buttons to change the quantity right from the invoice. */
  stepper?: InvoiceStepper;
  /** Adds a remove (trash) button. */
  onRemove?: () => void;
}

interface RunningInvoiceProps {
  lines: InvoiceLine[];
  total: number;
  /** Shown at the top, e.g. the theme and pax. */
  heading?: string;
  /** Optional action under the lines, e.g. an "Add rentals" link. */
  footerAction?: React.ReactNode;
  className?: string;
}

const stepBtn =
  'flex h-7 w-7 items-center justify-center rounded-md border border-border bg-white text-ink transition-colors hover:border-gold hover:bg-gold-faint disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-border disabled:hover:bg-white';

function Stepper({ s, label }: { s: InvoiceStepper; label: string }) {
  const by = `${s.step ?? 1} ${s.unit}`;
  return (
    <div className="flex items-center gap-1" role="group" aria-label={`${label} quantity`}>
      <button
        type="button"
        onClick={s.onDecrement}
        disabled={!s.canDecrement}
        aria-label={`Decrease ${label} by ${by}`}
        className={stepBtn}
      >
        <Minus className="h-3 w-3" aria-hidden="true" />
      </button>
      <span className="min-w-[3.25rem] text-center font-num text-xs font-bold tabular-nums text-ink" aria-live="polite">
        {s.value} <span className="font-medium text-text-muted">{s.unit}</span>
      </span>
      <button
        type="button"
        onClick={s.onIncrement}
        disabled={!s.canIncrement}
        aria-label={`Increase ${label} by ${by}`}
        className={stepBtn}
      >
        <Plus className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Live quote that updates as the customer picks a package, pax, rentals and extras. */
export function RunningInvoice({ lines, total, heading, footerAction, className = '' }: RunningInvoiceProps) {
  const downpayment = Math.round(total * DOWNPAYMENT_RATE * 100) / 100;
  return (
    <section
      aria-label="Running invoice"
      className={`overflow-hidden rounded-xl border border-border bg-white shadow-card ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-border bg-ink px-4 py-3 text-white">
        <Receipt className="h-4 w-4 text-gold" aria-hidden="true" />
        <span className="font-serif text-sm font-bold">Running Invoice</span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-cream/60">Live quote</span>
      </div>

      <div className="p-4 text-xs">
        {heading && <p className="mb-2 font-semibold text-ink">{heading}</p>}

        <ul className="divide-y divide-border" aria-live="polite">
          {lines.map(line => (
            <li key={line.id || line.label} className="py-2.5 first:pt-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="block font-medium leading-snug text-text">{line.label}</span>
                  {line.detail && (
                    <span className="block font-num text-[11px] tabular-nums text-text-muted">{line.detail}</span>
                  )}
                </div>
                <span
                  className={`shrink-0 font-num font-bold tabular-nums ${
                    line.included ? 'text-emerald-700' : 'text-ink'
                  }`}
                >
                  {line.included ? 'Included' : formatCurrency(line.amount)}
                </span>
              </div>
              {(line.stepper || line.onRemove) && (
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  {line.stepper ? <Stepper s={line.stepper} label={line.label} /> : <span />}
                  {line.onRemove && (
                    <button
                      type="button"
                      onClick={line.onRemove}
                      aria-label={`Remove ${line.label}`}
                      title="Remove"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-text-faint transition-colors hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>

        {footerAction && <div className="border-t border-border pt-2.5">{footerAction}</div>}

        <div className="mt-2 flex items-baseline justify-between gap-3 border-t-2 border-ink/80 pt-3">
          <span className="text-sm font-bold text-ink">Total</span>
          <span className="font-num text-xl font-extrabold tabular-nums tracking-tight text-ink">
            {formatCurrency(total)}
          </span>
        </div>

        <div className="mt-3 space-y-1 rounded-lg bg-gold-light/40 p-2.5">
          <div className="flex items-center justify-between gap-3 font-semibold text-gold-dark">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> {DOWNPAYMENT_RATE * 100}% Down Payment
            </span>
            <span className="font-num font-bold tabular-nums">{formatCurrency(downpayment)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 text-text-muted">
            <span>Balance before event</span>
            <span className="font-num tabular-nums">{formatCurrency(total - downpayment)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
