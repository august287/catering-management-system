import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, CalendarPlus, Sparkles, Utensils, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useCateringData } from '@/hooks/useCateringData';
import { formatCurrency } from '@/lib/utils';

export function ThemeDetail() {
  const { themeId } = useParams<{ themeId: string }>();
  const navigate = useNavigate();
  const { themes, packages } = useCateringData();

  const theme = themes.find(t => t.id === Number(themeId));

  if (!theme) {
    return (
      <div className="py-16 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-ink">Theme Not Found</h2>
        <p className="text-sm text-text-muted">The requested catering motif does not exist.</p>
        <Link to="/customer/menu">
          <Button variant="gold" size="sm">
            Back to Menu
          </Button>
        </Link>
      </div>
    );
  }

  // Associated packages or universal packages
  const matchingPackages = packages.filter(
    p => p.theme_id === theme.id || p.theme_id === null
  );

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <div>
        <button
          onClick={() => navigate('/customer/menu')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-text-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to All Themes
        </button>
      </div>

      {/* Theme Hero Showcase */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 items-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-gold-light px-3 py-1 text-xs font-semibold text-gold-dark border border-gold/30">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            <span>Signature Catering Motif</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-ink leading-tight">
            {theme.name}
          </h1>

          <p className="font-serif text-lg italic text-gold-dark font-medium">
            "{theme.tagline}"
          </p>

          <p className="text-sm text-text-muted leading-relaxed">
            {theme.description}
          </p>

          <div className="pt-2">
            <Link to={`/customer/book?themeId=${theme.id}`}>
              <Button variant="gold" size="lg" className="gap-2 text-sm">
                <CalendarPlus className="h-4 w-4" /> Book Reservation for this Theme
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero Image */}
        <div className="relative overflow-hidden rounded-2xl shadow-pop">
          <img
            src={theme.image_url || '/images/2 PIC.jpg'}
            alt={theme.name}
            className="h-[380px] w-full object-cover"
          />
        </div>
      </div>

      {/* Associated Packages Section */}
      <div className="space-y-4 pt-6 border-t border-border">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">
            Recommended Packages for {theme.name}
          </h2>
          <p className="text-sm text-text-muted">
            Select a tailored catering package to fit your guest count and menu preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {matchingPackages.map(pkg => (
            <Card key={pkg.id} className="flex flex-col justify-between p-6 hover:shadow-card transition-shadow">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-serif text-xl font-bold text-ink">{pkg.name}</h3>
                  <Badge variant="gold">Min {pkg.min_pax} pax</Badge>
                </div>

                <div className="mt-3 font-serif text-3xl font-bold text-gold-dark">
                  {formatCurrency(pkg.price_per_pax)}
                  <span className="text-xs font-sans font-normal text-text-muted"> / guest</span>
                </div>

                <p className="mt-4 text-xs text-text-muted leading-relaxed">
                  {pkg.description}
                </p>

                <div className="mt-4 space-y-1.5 pt-4 border-t border-border text-xs text-text">
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Complete table setup & floral motif</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Uniformed waiters and buffet servers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Bottomless specialty drinks included</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border">
                <Link to={`/customer/book?themeId=${theme.id}&packageId=${pkg.id}`}>
                  <Button variant="gold" className="w-full text-xs gap-1.5">
                    <CalendarPlus className="h-3.5 w-3.5" /> Book This Package
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ThemeDetail;
