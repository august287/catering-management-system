import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = (pathname: string): string => {
    if (pathname.startsWith('/admin/dashboard')) return 'Dashboard Overview';
    if (pathname.startsWith('/admin/menu')) return 'Menu & Catalog Management';
    if (pathname.startsWith('/admin/reservations')) return 'Reservations & Bookings';
    if (pathname.startsWith('/admin/customers')) return 'Customer Directory';
    if (pathname.startsWith('/admin/payments')) return 'Payment Verifications';
    if (pathname.startsWith('/admin/notifications')) return 'Admin Notifications';
    if (pathname.startsWith('/admin/reports')) return 'Analytics & Revenue Reports';
    if (pathname.startsWith('/customer/menu/')) return 'Theme Details & Packages';
    if (pathname.startsWith('/customer/menu')) return 'Browse Menu & Themes';
    if (pathname.startsWith('/customer/book')) return 'Book a Catering Reservation';
    if (pathname.startsWith('/customer/reservations')) return 'My Reservations';
    if (pathname.startsWith('/customer/payments')) return 'Payment Submissions';
    if (pathname.startsWith('/customer/notifications')) return 'Notifications';
    return "Natalie's Catering";
  };

  const title = getPageTitle(location.pathname);

  return (
    <div className="flex min-h-screen bg-cream">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar title={title} onToggleSidebar={() => setSidebarOpen(prev => !prev)} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
