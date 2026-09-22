import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Utensils,
  Phone,
  Mail,
  MapPin,
  Facebook,
  Instagram,
  ArrowRight,
  Heart,
  Star,
  Sparkles,
} from 'lucide-react';
import logo from '/public/images/natalielogo.jpg';

const services = [
  {
    icon: Heart,
    title: 'Weddings',
    description:
      'Timeless romantic banquet styling with delicate table runners, elegant floral backdrops, and VIP couple dining arrangements.',
    image: '/images/2 PIC.jpg',
  },
  {
    icon: Sparkles,
    title: 'Birthday Celebrations',
    description:
      'Vibrant festive setups with dynamic balloon arches, customized stage backdrop, themed dessert table, and party favors.',
    image: '/images/5.jpg',
  },
  {
    icon: Star,
    title: 'Debut Elegance',
    description:
      'Glamorous 18-roses and 18-candles grand reception, illuminated floral centerpieces, chandelier accents, and plush debutante throne.',
    image: '/images/1 PIC.jpg',
  },
  {
    icon: Utensils,
    title: 'Corporate Galas',
    description:
      'Sleek executive banquet setup, podium styling, neat linen presentation, and polished buffet service for conferences and annual galas.',
    image: '/images/4 PIC.jpg',
  },
  {
    icon: Star,
    title: 'Filipino Fiesta',
    description:
      'Warm native bamboo accents, vibrant banner streamers, traditional banana leaf accents, and hearty heirloom banquet service.',
    image: '/images/3 PIC.jpg',
  },
  {
    icon: Heart,
    title: 'Christening & Dedication',
    description:
      'Soft pastel palettes, delicate cloud balloons, angel wings or carousel backdrop styling, and family-friendly buffet arrangements.',
    image: '/images/6.jpg',
  },
];

const packages = [
  {
    name: 'Silver Buffet',
    price: '₱450',
    per: '/ pax',
    features: [
      '1 Soup, 1 Appetizer',
      '3 Main Courses',
      '1 Noodle, 1 Rice, 1 Dessert',
      'Bottomless Iced Tea',
      'Buffet setup & trained waiters',
    ],
  },
  {
    name: 'Gold Feast',
    price: '₱650',
    per: '/ pax',
    features: [
      '1 Soup, 2 Appetizers',
      '4 Main Courses (Beef, Pork, Chicken, Seafood)',
      '2 Rice varieties, 2 Desserts',
      'Themed centerpiece on all tables',
      'Bottomless Specialty Cooler',
    ],
  },
  {
    name: 'Platinum Royal',
    price: '₱950',
    per: '/ pax',
    features: [
      '2 Soups, 3 Appetizers',
      '5 Premium Mains incl. Tiger Prawns',
      '3 Gourmet Desserts',
      'Champagne toast & VIP Table service',
      'Grand floral centerpiece',
    ],
  },
];

const locations = [
  'Cabuyao City, Laguna',
  'Santa Rosa City, Laguna',
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-cream">
      {/* ─── Sticky Navbar ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-cream/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gold p-1 shadow-sm">
              <img src={logo} alt="Natalie's Catering" className="h-full w-full object-cover rounded-md" />
            </div>
            <span className="font-serif text-lg font-bold tracking-tight text-ink">
              Natalie's Catering
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button variant="gold" size="sm" className="text-xs sm:text-sm gap-1">
                Book Now <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section
        className="relative flex min-h-screen items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "linear-gradient(rgba(23, 20, 15, 0.60), rgba(23, 20, 15, 0.82)), url('/images/7.jpg')",
        }}
      >
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6">

          <h1 className="font-serif text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            Crafting Unforgettable
            <br />
            <span className="text-gold-light">Celebrations</span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-cream/80 sm:text-lg">
            From majestic wedding banquets to vibrant family fiestas, we bring exquisite flavors,
            elegant themes, and seamless service to every milestone in Cabuyao City, Laguna.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/login">
              <Button variant="gold" size="lg" className="gap-2 text-sm shadow-md px-8">
                Book Your Reservation Now! <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#services">
              <Button variant="outline" size="lg" className="gap-2 text-sm border-white/25 hover:bg-white/10 hover:border-white/40 px-8 hover:text-white transition-colors">
                Explore Services
              </Button>
            </a>
          </div>

          <div className="mt-10 flex items-center justify-center gap-3">
            <div className="h-px w-10 bg-gold" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-cream/80">
              Brgy. Marinig, Cabuyao City, Laguna
            </span>
            <div className="h-px w-10 bg-gold" />
          </div>
        </div>

        {/* Decorative bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-cream to-transparent" />
      </section>

      {/* ─── Services Section ─── */}
      <section id="services" className="scroll-mt-16 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-gold">What We Offer</span>
            <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Our Catering Services
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-text-muted">
              We specialize in curating bespoke celebrations — from intimate gatherings to grand receptions — tailored to your vision.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((svc) => (
              <Card
                key={svc.title}
                className="group overflow-hidden hover:shadow-pop transition-all duration-300"
              >
                <div
                  className="relative h-48 w-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url(${svc.image})` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <h3 className="font-serif text-lg font-bold text-white">{svc.title}</h3>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-xs leading-relaxed text-text-muted">{svc.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Packages Section ─── */}
      <section className="bg-ink py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-gold-light">Pricing</span>
            <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Our Catering Packages
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-cream/70">
              All prices in Philippine Peso (PHP). Fully customized inclusions available for every celebration size.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {packages.map((pkg, idx) => (
              <div
                key={pkg.name}
                className={`relative flex flex-col rounded-xl border p-6 sm:p-8 transition-all duration-300 hover:shadow-pop ${
                  idx === 1
                    ? 'border-gold/50 bg-white/[0.07] shadow-pop'
                    : 'border-white/10 bg-white/[0.04]'
                }`}
              >
                {idx === 1 && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                    Most Popular
                  </span>
                )}
                <div>
                  <h3 className="font-serif text-lg font-bold text-white">{pkg.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1">
                    <span className="font-serif text-3xl font-bold text-gold-light">{pkg.price}</span>
                    <span className="text-xs text-cream/50">{pkg.per}</span>
                  </div>
                </div>
                <ul className="mt-6 flex-1 space-y-2.5">
                  {pkg.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs leading-relaxed text-cream/75">
                      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/register" className="mt-8">
                  <Button
                    variant={idx === 1 ? 'gold' : 'outline'}
                    size="sm"
                    className="w-full text-xs gap-1 hover:bg-ink hover:text-white hover:border-ink"
                  >
                    Book Package <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Location / Service Areas ─── */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-card">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* Map side */}
              <div className="relative min-h-[320px] bg-cream-dark">
                <iframe
                  title="Natalie's Catering - 616, 617 Marinig, Cabuyao City, Laguna"
                  className="h-full w-full"
                  src="https://www.google.com/maps?q=616%2C%20617%20Marinig%2C%20Cabuyao%20City%2C%20Laguna&z=16&output=embed"
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              {/* Info side */}
              <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-12">
                <span className="text-xs font-bold uppercase tracking-widest text-gold">
                  Service Areas
                </span>
                <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  Now Serving Cabuyao City, Laguna
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-text-muted">
                  Natalie's Catering proudly serves Marinig, Cabuyao City, and surrounding areas in the province of Laguna. Based at 616, 617 Marinig, our team brings the full banquet experience directly to your chosen venue.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  {locations.map((loc) => (
                    <div
                      key={loc}
                      className="flex items-center gap-2 rounded-lg border border-border bg-cream px-4 py-3 text-sm font-medium text-ink"
                    >
                      <MapPin className="h-4 w-4 shrink-0 text-gold" />
                      {loc}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Contact & Social Media ─── */}
      <section className="bg-cream-dark py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-gold">Get in Touch</span>
            <h2 className="mt-2 font-serif text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Contact Us
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-text-muted">
              Ready to plan your next celebration? Reach out to us through any of the channels below or visit us at our office.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Phone */}
            <Card className="flex flex-col items-center p-6 text-center hover:shadow-pop transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
                <Phone className="h-5 w-5 text-gold" />
              </div>
              <h4 className="mt-4 font-serif text-sm font-bold text-ink">Phone</h4>
              <p className="mt-1 text-xs text-text-muted">+63 917 888 0001</p>
              <p className="text-xs text-text-muted">+63 918 123 4567</p>
            </Card>

            {/* Email */}
            <Card className="flex flex-col items-center p-6 text-center hover:shadow-pop transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
                <Mail className="h-5 w-5 text-gold" />
              </div>
              <h4 className="mt-4 font-serif text-sm font-bold text-ink">Email</h4>
              <p className="mt-1 text-xs text-text-muted">hello@nataliescatering.ph</p>
              <p className="text-xs text-text-muted">bookings@nataliescatering.ph</p>
            </Card>

            {/* Address */}
            <Card className="flex flex-col items-center p-6 text-center hover:shadow-pop transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
                <MapPin className="h-5 w-5 text-gold" />
              </div>
              <h4 className="mt-4 font-serif text-sm font-bold text-ink">Office Address</h4>
              <p className="mt-1 text-xs leading-relaxed text-text-muted">
                616, 617 Marinig,
                <br />
                Cabuyao City, Laguna
              </p>
            </Card>

            {/* Social Media */}
            <Card className="flex flex-col items-center p-6 text-center hover:shadow-pop transition-shadow">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
                <Utensils className="h-5 w-5 text-gold" />
              </div>
              <h4 className="mt-4 font-serif text-sm font-bold text-ink">Follow Us</h4>
              <div className="mt-3 flex items-center gap-3">
                <a
                  href="https://facebook.com/nataliescatering"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Facebook"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-ink hover:border-gold hover:bg-gold/10 hover:text-gold transition-colors"
                >
                  <Facebook className="h-4 w-4" />
                </a>
                <a
                  href="https://instagram.com/nataliescatering"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Instagram"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-ink hover:border-gold hover:bg-gold/10 hover:text-gold transition-colors"
                >
                  <Instagram className="h-4 w-4" />
                </a>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section
        className="relative overflow-hidden bg-cover bg-center bg-no-repeat py-20 sm:py-24"
        style={{
          backgroundImage:
            "linear-gradient(rgba(23, 20, 15, 0.78), rgba(23, 20, 15, 0.88)), url('/images/8.jpg')",
        }}
      >
        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to Make Your Event Unforgettable?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-cream/80">
            Create your account today to browse our full menu catalog, reserve exclusive event themes, and secure your booking with easy online payments.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register">
              <Button variant="gold" size="lg" className="gap-2 text-sm shadow-md px-8">
                Create Account & Book <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/login">
              <Button
                variant="outline"
                size="lg"
                className="text-sm border-white/25 text-black hover:bg-black/10 hover:border-white/40 px-8 hover:text-white transition-colors"
              >
                Sign In to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border bg-cream py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gold p-1 shadow-sm">
                <img src={logo} alt="Natalie's Catering" className="h-full w-full object-cover rounded-md" />
              </div>
              <div>
                <span className="font-serif text-sm font-bold text-ink">Natalie's Catering</span>
                <p className="text-[11px] text-text-muted">Premium Filipino Catering & Event Styling</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <a
                href="https://facebook.com/nataliescatering"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-gold transition-colors"
                title="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://instagram.com/nataliescatering"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-gold transition-colors"
                title="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
            <p className="text-[11px] text-text-muted">
              &copy; {new Date().getFullYear()} Natalie's Catering. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-[11px] text-text-muted">
              <Link to="/login" className="hover:text-gold transition-colors">Sign In</Link>
              <Link to="/register" className="hover:text-gold transition-colors">Register</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
