import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Clock, Users, Utensils } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { formatCurrency, MAX_GUEST_COUNT, MIN_GUEST_COUNT } from '@/lib/utils';
import { getPackageMenuRules, offeredCourses } from '@/lib/menuCourses';
import { GUESTS_PER_SERVER, INCLUDED_SERVICE_HOURS, includedServers } from '@/lib/bookingTerms';
import type { EventTheme, Package } from '@/types/database';

/**
 * All-in package offers with everything each one includes, priced live for the
 * guest count the customer types.
 */
export function CompletePackages({ packages, themes }: { packages: Package[]; themes: EventTheme[] }) {
  const [paxInput, setPaxInput] = useState(String(MIN_GUEST_COUNT));
  const pax = paxInput === '' ? 0 : parseInt(paxInput, 10);
  const paxOk = pax >= MIN_GUEST_COUNT && pax <= MAX_GUEST_COUNT;

  return (
    <div className="space-y-5">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <label htmlFor="pkg-pax" className="block text-xs font-bold uppercase tracking-wider text-text-muted">
            How many guests?
          </label>
          <p className="mt-0.5 text-xs text-text-muted">
            Type your guest count and every package total is calculated for you.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            id="pkg-pax"
            type="text"
            inputMode="numeric"
            value={paxInput}
            onChange={e => setPaxInput(e.target.value.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 4))}
            className="w-28 text-center text-base font-bold"
            aria-describedby="pkg-pax-help"
          />
          <span className="text-sm font-semibold text-text-muted">pax</span>
        </div>
      </Card>
      <p id="pkg-pax-help" className={`-mt-3 text-xs ${paxOk ? 'text-text-muted' : 'font-semibold text-red-600'}`}>
        {paxOk
          ? `${includedServers(pax)} servers and ${INCLUDED_SERVICE_HOURS} hours of service included at ${pax} pax.`
          : `We cater ${MIN_GUEST_COUNT}–${MAX_GUEST_COUNT} guests per event.`}
      </p>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {packages.map(pkg => {
          const rules = getPackageMenuRules(pkg);
          const courses = offeredCourses(rules);
          const theme = themes.find(t => t.id === pkg.theme_id);
          const minPax = Math.min(MAX_GUEST_COUNT, Math.max(MIN_GUEST_COUNT, pkg.min_pax));
          const fits = paxOk && pax >= minPax;
          const total = fits ? pkg.price_per_pax * pax : 0;
          const bookUrl = `/customer/book?packageId=${pkg.id}${theme ? `&themeId=${theme.id}` : ''}${
            fits ? `&pax=${pax}` : ''
          }`;
          return (
            <Card key={pkg.id} className="flex flex-col justify-between overflow-hidden">
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {theme && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-gold-dark">
                        {theme.name}
                      </span>
                    )}
                    <h3 className="font-serif text-lg font-bold text-ink">{pkg.name}</h3>
                  </div>
                  <Badge variant="gold">{`${minPax}–${MAX_GUEST_COUNT} pax`}</Badge>
                </div>
                <div className="mt-2 font-serif text-2xl font-bold text-gold-dark">
                  {formatCurrency(pkg.price_per_pax)}
                  <span className="font-sans text-xs font-normal text-text-muted"> / head</span>
                </div>
                {pkg.description && <p className="mt-2 text-xs leading-relaxed text-text-muted">{pkg.description}</p>}

                <div className="mt-4 space-y-1.5 text-xs">
                  <p className="font-bold uppercase tracking-wider text-text-muted">Complete package includes</p>
                  <ul className="space-y-1">
                    {courses.map(c => (
                      <li key={c.key} className="flex items-center gap-2 text-text">
                        <Utensils className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
                        {c.count} {c.count === 1 ? c.one : c.many} of your choice
                      </li>
                    ))}
                    {(rules.included || []).map(inc => (
                      <li key={inc} className="flex items-center gap-2 text-text">
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                        {inc}
                      </li>
                    ))}
                    <li className="flex items-center gap-2 text-text">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                      {INCLUDED_SERVICE_HOURS} hours of buffet service
                    </li>
                    <li className="flex items-center gap-2 text-text">
                      <Users className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                      1 server per {GUESTS_PER_SERVER} guests, buffet set-up, chafing dishes & utensils
                    </li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-border bg-cream/40 p-4">
                <div className="mb-3 flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-text-muted">{fits ? `Total for ${pax} pax` : `Minimum ${minPax} pax`}</span>
                  <span className="font-serif text-lg font-bold text-ink">
                    {fits ? formatCurrency(total) : formatCurrency(pkg.price_per_pax * minPax)}
                  </span>
                </div>
                <Link to={bookUrl}>
                  <Button variant="gold" size="sm" className="w-full gap-1 text-xs">
                    Book this package <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
