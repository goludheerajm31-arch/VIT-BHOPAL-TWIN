import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './services/auth';
import { DemoRoleProvider } from './services/demoRoleSwitcher';
import { ToastProvider } from './components/layout/Toast';
import { Navbar } from './components/layout/Navbar';
import { MobileNav } from './components/layout/MobileNav';
import { Footer } from './components/layout/Footer';

// Pages
import { LandingPage } from './pages/LandingPage';
import { ExplorePage } from './pages/ExplorePage';
import { SearchPage } from './pages/SearchPage';
import { EventsPage } from './pages/EventsPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { LocationsPage } from './pages/LocationsPage';
import { LocationDetailPage } from './pages/LocationDetailPage';
import { NavigationPage } from './pages/NavigationPage';
import { AnnouncementsPage } from './pages/AnnouncementsPage';
import { CampusHubPage } from './pages/CampusHubPage';
import { FacultyDirectoryPage } from './pages/FacultyDirectoryPage';
import { FacultyDashboard } from './pages/FacultyDashboard';
import { AboutPage } from './pages/AboutPage';
import { LoginPage } from './pages/LoginPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { SavedItemsPage } from './pages/SavedItemsPage';
import { PublisherDashboard } from './pages/PublisherDashboard';
import { PublisherCreateEventPage } from './pages/PublisherCreateEventPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminVerificationPage } from './pages/AdminVerificationPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Scroll to top component on navigation
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// Protected Route Guard with clean loading indicator
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: ('ADMIN' | 'FACULTY' | 'PUBLISHER' | 'STUDENT')[];
}> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading, roles } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 space-y-3">
        <div className="w-8 h-8 border-2 border-[#0071E3] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-medium text-[#86868B]">Verifying institutional access...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRoleList = user.roles || roles || [user.role];
    const hasRole = allowedRoles.some((r) => userRoleList.includes(r));
    if (!hasRole) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <DemoRoleProvider>
          <ToastProvider>
            <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
              <ScrollToTop />
              <Navbar />

              <main className="flex-1">
                <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/events/:id" element={<EventDetailPage />} />
                <Route path="/locations" element={<LocationsPage />} />
                <Route path="/locations/:id" element={<LocationDetailPage />} />
                <Route path="/navigation" element={<NavigationPage />} />
                <Route path="/navigate" element={<NavigationPage />} />
                <Route path="/faculty" element={<FacultyDirectoryPage />} />
                <Route path="/faculty/dashboard" element={<ProtectedRoute allowedRoles={['FACULTY', 'ADMIN']}><FacultyDashboard /></ProtectedRoute>} />
                <Route path="/faculty/portal" element={<Navigate to="/faculty/dashboard" replace />} />
                <Route path="/cabins" element={<FacultyDirectoryPage />} />
                <Route path="/hub" element={<CampusHubPage />} />
                <Route path="/campus-hub" element={<CampusHubPage />} />
                <Route path="/campushub" element={<CampusHubPage />} />
                <Route path="/guides" element={<Navigate to="/hub" replace />} />
                <Route path="/guide" element={<Navigate to="/hub" replace />} />
                <Route path="/announcements" element={<AnnouncementsPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/dashboard" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
                <Route path="/profile" element={<Navigate to="/dashboard" replace />} />
                <Route path="/saved" element={<ProtectedRoute><SavedItemsPage /></ProtectedRoute>} />
                <Route path="/publisher" element={<ProtectedRoute allowedRoles={['PUBLISHER', 'ADMIN']}><PublisherDashboard /></ProtectedRoute>} />
                <Route path="/publisher/events/create" element={<ProtectedRoute allowedRoles={['PUBLISHER', 'ADMIN']}><PublisherCreateEventPage /></ProtectedRoute>} />
                <Route path="/publisher/events/new" element={<ProtectedRoute allowedRoles={['PUBLISHER', 'ADMIN']}><PublisherCreateEventPage /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/admin/verification" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminVerificationPage /></ProtectedRoute>} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>

            <Footer />
            <MobileNav />
          </div>
        </ToastProvider>
      </DemoRoleProvider>
    </AuthProvider>
  </BrowserRouter>
  );
}
