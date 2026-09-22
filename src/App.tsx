import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/hooks/useAuth';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';

// Landing & Auth Pages
import LandingPage from '@/pages/LandingPage';
import Login from '@/pages/Login';
import Register from '@/pages/Register';

// Admin Pages
import AdminDashboard from '@/pages/admin/Dashboard';
import AdminMenuManagement from '@/pages/admin/MenuManagement';
import AdminReservations from '@/pages/admin/Reservations';
import AdminCustomers from '@/pages/admin/Customers';
import AdminPayments from '@/pages/admin/Payments';
import AdminNotifications from '@/pages/admin/Notifications';
import AdminReports from '@/pages/admin/Reports';

// Customer Pages
import CustomerBrowseMenu from '@/pages/customer/BrowseMenu';
import CustomerThemeDetail from '@/pages/customer/ThemeDetail';
import CustomerBookReservation from '@/pages/customer/BookReservation';
import CustomerMyReservations from '@/pages/customer/MyReservations';
import CustomerPayments from '@/pages/customer/Payments';
import CustomerNotifications from '@/pages/customer/Notifications';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Root Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Admin Protected Subsystem */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRole="admin">
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="menu" element={<AdminMenuManagement />} />
            <Route path="reservations" element={<AdminReservations />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="payments" element={<AdminPayments />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="reports" element={<AdminReports />} />
          </Route>

          {/* Customer Protected Subsystem */}
          <Route
            path="/customer"
            element={
              <ProtectedRoute allowedRole="customer">
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/customer/menu" replace />} />
            <Route path="menu" element={<CustomerBrowseMenu />} />
            <Route path="menu/:themeId" element={<CustomerThemeDetail />} />
            <Route path="book" element={<CustomerBookReservation />} />
            <Route path="reservations" element={<CustomerMyReservations />} />
            <Route path="payments" element={<CustomerPayments />} />
            <Route path="notifications" element={<CustomerNotifications />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
