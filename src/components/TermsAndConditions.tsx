import React from 'react';
import { FileText } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { formatCurrency } from '@/lib/utils';
import { TERMS_VERSION, termsSections } from '@/lib/bookingTerms';

/** The catering contract terms, in plain numbered sections. */
export function TermsContent({ className = '' }: { className?: string }) {
  const sections = termsSections(formatCurrency);
  return (
    <div className={`space-y-4 text-sm text-text ${className}`}>
      {sections.map((sec, i) => (
        <section key={sec.title}>
          <h4 className="font-serif text-sm font-bold text-ink">
            {i + 1}. {sec.title}
          </h4>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13px] leading-relaxed text-text">
            {sec.points.map(pt => (
              <li key={pt}>{pt}</li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-[11px] text-text-faint">Terms version {TERMS_VERSION}</p>
    </div>
  );
}

export function TermsDialog({
  open,
  onOpenChange,
  onAgree,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Shown as an "I agree" button when given. */
  onAgree?: () => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Terms & Conditions"
      description="Catering service contract — please read before booking."
      className="max-w-2xl"
    >
      <div className="max-h-[60vh] overflow-y-auto pr-1">
        <TermsContent />
      </div>
      <div className="mt-4 flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
        {onAgree && (
          <Button
            variant="gold"
            onClick={() => {
              onAgree();
              onOpenChange(false);
            }}
          >
            I have read and agree
          </Button>
        )}
      </div>
    </Dialog>
  );
}

/** Small "View Terms & Conditions" link button. */
export function TermsLink({ onClick, label = 'View Terms & Conditions' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs font-semibold text-gold-dark underline-offset-2 hover:underline"
    >
      <FileText className="h-3.5 w-3.5" aria-hidden="true" /> {label}
    </button>
  );
}
