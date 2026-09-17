import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider } from './services/auth';
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
import { FacultyDirectoryPage } from './pages/FacultyDirectoryPage';
import { AboutPage } from './pages/AboutPage';
import { LoginPage } from './pages/LoginPage';
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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
                <Route path="/cabins" element={<FacultyDirectoryPage />} />
                <Route path="/announcements" element={<AnnouncementsPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/dashboard" element={<StudentDashboard />} />
                <Route path="/profile" element={<Navigate to="/dashboard" replace />} />
                <Route path="/saved" element={<SavedItemsPage />} />
                <Route path="/publisher" element={<PublisherDashboard />} />
                <Route path="/publisher/events/create" element={<PublisherCreateEventPage />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/verification" element={<AdminVerificationPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </main>

            <Footer />
            <MobileNav />
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
