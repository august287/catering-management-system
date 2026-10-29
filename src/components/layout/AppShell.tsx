import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { ConfirmationModal } from '@/components/ui/Modal';
import { useAuth } from '@/hooks/useAuth';

// Topbar titles match the sidebar labels so users always see where they are.
const PAGE_TITLES: [prefix: string, title: string][] = [
  ['/admin/dashboard', 'Dashboard'],
  ['/admin/menu', 'Menu Management'],
  ['/admin/reservations', 'Reservations'],
  ['/admin/customers', 'Customers'],
  ['/admin/payments', 'Payments'],
  ['/admin/notifications', 'Notifications'],
  ['/admin/reports', 'Reports & Analytics'],
  ['/customer/menu/', 'Theme Details'],
  ['/customer/menu', 'Browse Menu'],
  ['/customer/book', 'Book Reservation'],
  ['/customer/reservations', 'My Reservations'],
  ['/customer/payments', 'Payments'],
  ['/customer/notifications', 'Notifications'],
];

function getPageTitle(pathname: string): string {
  return PAGE_TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "Natalie's Catering";
}

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutPrompt, setShowLogoutPrompt] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const mainRef = useRef<HTMLElement>(null);

  // Intercept browser back button to prevent uncontrolled session exit
  useEffect(() => {
    if (!user) return;

    const handlePopState = () => {
      // Push the current URL back so navigation is cancelled
      window.history.pushState(null, '', window.location.href);
      setShowLogoutPrompt(true);
    };

    // Seed history so popstate fires instead of actually navigating away
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [user]);

  // New page → start at the top and close the mobile menu.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogoutConfirm = useCallback(async () => {
    setShowLogoutPrompt(false);
    await logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const title = getPageTitle(location.pathname);

  useEffect(() => {
    document.title = `${title} · Natalie's Catering`;
  }, [title]);

  return (
    <div className="flex h-screen h-[100dvh] overflow-hidden bg-cream">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to main content
      </a>

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          title={title}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(prev => !prev)}
        />
        <main
          id="main-content"
          ref={mainRef}
          tabIndex={-1}
          className="flex-1 overflow-y-auto overflow-x-hidden p-4 outline-none sm:p-6 lg:p-8"
        >
          <div className="mx-auto w-full max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Logout Confirmation Modal — triggered by browser back button */}
      <ConfirmationModal
        open={showLogoutPrompt}
        onOpenChange={setShowLogoutPrompt}
        onConfirm={handleLogoutConfirm}
        title="Leaving so soon?"
        description="Pressing the back button will end your current session. Are you sure you want to log out?"
        confirmLabel="Yes, Log Out"
        cancelLabel="Cancel — Stay Here"
        variant="logout"
      />
    </div>
  );
}

export default AppShell;
