import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/components/ui/Toast';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { AppLayout } from '@/layouts/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { MeetingsPage } from '@/pages/MeetingsPage';
import { MeetingDetailPage } from '@/pages/MeetingDetailPage';
import { ActionItemsPage } from '@/pages/ActionItemsPage';
import { AssistantPage } from '@/pages/AssistantPage';
import { KnowledgeSearchPage } from '@/pages/KnowledgeSearchPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { UpcomingPage } from '@/pages/UpcomingPage';
import { PageLoader } from '@/components/ui/States';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/app" element={<ProtectedRoute><AppLayout><DashboardPage /></AppLayout></ProtectedRoute>} />
      <Route path="/app/meetings" element={<ProtectedRoute><AppLayout><MeetingsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/app/meetings/:id" element={<ProtectedRoute><AppLayout><MeetingDetailPage /></AppLayout></ProtectedRoute>} />
      <Route path="/app/upcoming" element={<ProtectedRoute><AppLayout><UpcomingPage /></AppLayout></ProtectedRoute>} />
      <Route path="/app/action-items" element={<ProtectedRoute><AppLayout><ActionItemsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/app/assistant" element={<ProtectedRoute><AppLayout><AssistantPage /></AppLayout></ProtectedRoute>} />
      <Route path="/app/knowledge" element={<ProtectedRoute><AppLayout><KnowledgeSearchPage /></AppLayout></ProtectedRoute>} />
      <Route path="/app/analytics" element={<ProtectedRoute><AppLayout><AnalyticsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/app/calendar" element={<ProtectedRoute><AppLayout><CalendarPage /></AppLayout></ProtectedRoute>} />
      <Route path="/app/notifications" element={<ProtectedRoute><AppLayout><NotificationsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/app/settings" element={<ProtectedRoute><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
