import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, Utensils, CalendarPlus, Check, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { useCateringData } from '@/hooks/useCateringData';
import { formatCurrency } from '@/lib/utils';

export function BrowseMenu() {
  const { themes, packages, menuItems, categories, rentals } = useCateringData();
  const [activeTab, setActiveTab] = useState('themes');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [foodSearch, setFoodSearch] = useState('');

  const activeThemes = themes.filter(t => t.is_active);

  const filteredFood = menuItems.filter(item => {
    const matchCat = selectedCat === 'all' || item.category_id.toString() === selectedCat;
    const matchSearch =
      item.name.toLowerCase().includes(foodSearch.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(foodSearch.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-8">
      {/* Luxury Hero Banner */}
      <div
        className="relative overflow-hidden rounded-2xl bg-ink p-8 sm:p-12 text-white shadow-pop bg-cover bg-center"
        style={{
          backgroundImage:
            "linear-gradient(rgba(23, 20, 15, 0.75), rgba(23, 20, 15, 0.90)), url('/images/7.jpg')",
        }}
      >
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-gold-light border border-gold/30 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-gold" />
            <span>Exquisite Filipino Catering & Event Styling</span>
          </div>

          <h1 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl leading-tight">
            Celebrate Life’s Grandest Milestones
          </h1>

          <p className="mt-3 text-sm sm:text-base text-cream/80 leading-relaxed">
            From majestic wedding banquets to vibrant family fiestas, explore our signature event
            themes, chef-crafted Pinoy delicacies, and premium banquet equipment.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/customer/book">
              <Button variant="gold" size="lg" className="gap-2 text-sm shadow-md">
                <CalendarPlus className="h-4 w-4" /> Book a Reservation
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="themes">Event Themes ({activeThemes.length})</TabsTrigger>
            <TabsTrigger value="food">Dishes & Menu ({menuItems.length})</TabsTrigger>
            <TabsTrigger value="rentals">Banquet Rentals ({rentals.length})</TabsTrigger>
          </TabsList>

          <div className="text-xs text-text-muted">
            All prices in Philippine Peso (PHP) · Fully customized inclusions available
          </div>
        </div>

        {/* Tab 1: Event Themes */}
        <TabsContent value="themes" className="pt-4 space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {activeThemes.map(theme => {
              const themePackages = packages.filter(p => p.theme_id === theme.id);
              const minPrice = themePackages.length
                ? Math.min(...themePackages.map(p => p.price_per_pax))
                : 450;

              return (
                <Card
                  key={theme.id}
                  className="group flex flex-col justify-between overflow-hidden hover:shadow-pop transition-all duration-300"
                >
                  <div>
                    {/* Theme Image */}
                    <div
                      className="relative h-52 w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url(${theme.image_url})` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4 text-white">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-gold-light">
                          {theme.tagline}
                        </span>
                        <h3 className="font-serif text-xl font-bold">{theme.name}</h3>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <p className="text-xs text-text-muted leading-relaxed line-clamp-3">
                        {theme.description}
                      </p>

                      <div className="mt-4 flex items-center justify-between pt-3 border-t border-border text-xs">
                        <span className="text-text-muted">Packages starting from:</span>
                        <span className="font-serif font-bold text-ink text-sm">
                          {formatCurrency(minPrice)} <span className="text-[10px] font-sans font-normal text-text-muted">/ head</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t border-border p-4 bg-cream/30">
                    <Link to={`/customer/menu/${theme.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full text-xs">
                        View Packages
                      </Button>
                    </Link>
                    <Link to={`/customer/book?themeId=${theme.id}`} className="flex-1">
                      <Button variant="gold" size="sm" className="w-full text-xs gap-1">
                        Book Motif <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab 2: Food Menu */}
        <TabsContent value="food" className="pt-4 space-y-6">
          {/* Categories pill bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setSelectedCat('all')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  selectedCat === 'all'
                    ? 'bg-ink text-white shadow-sm'
                    : 'bg-white border border-border text-text-muted hover:bg-cream-dark'
                }`}
              >
                All Categories
              </button>
              {categories.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCat(c.id.toString())}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    selectedCat === c.id.toString()
                      ? 'bg-ink text-white shadow-sm'
                      : 'bg-white border border-border text-text-muted hover:bg-cream-dark'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-text-muted" />
              <Input
                placeholder="Search dishes..."
                value={foodSearch}
                onChange={e => setFoodSearch(e.target.value)}
                className="pl-8 text-xs h-9"
              />
            </div>
          </div>

          {/* Dishes Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFood.map(item => {
              const cat = categories.find(c => c.id === item.category_id);
              return (
                <Card key={item.id} className="p-5 hover:shadow-card transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-gold-dark">
                        {cat?.name || 'Catering Special'}
                      </span>
                      <h4 className="font-serif text-base font-bold text-ink mt-0.5">
                        {item.name}
                      </h4>
                    </div>
                    <span className="font-serif font-bold text-sm text-ink shrink-0">
                      {formatCurrency(item.price_per_head)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-text-muted leading-relaxed">
                    {item.description || 'Prepared fresh with native culinary traditions.'}
                  </p>
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-border text-[11px]">
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <Check className="h-3 w-3" /> Included in Buffet Packages
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab 3: Rentals */}
        <TabsContent value="rentals" className="pt-4 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {rentals.map(rental => (
              <Card key={rental.id} className="p-5 flex flex-col justify-between">
                <div>
                  <span className="rounded bg-cream-dark px-2 py-0.5 text-[10px] font-bold uppercase text-text-muted">
                    {rental.category}
                  </span>
                  <h4 className="font-serif text-base font-bold text-ink mt-2">
                    {rental.name}
                  </h4>
                  <div className="mt-3 font-serif text-xl font-bold text-gold-dark">
                    {formatCurrency(rental.rate_per_unit)}
                    <span className="text-xs font-normal text-text-muted font-sans"> / piece</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-text-muted">
                  <span>Stock capacity:</span>
                  <span className="font-bold text-ink">{rental.stock_quantity} available</span>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default BrowseMenu;
