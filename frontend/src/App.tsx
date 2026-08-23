import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

import SwipePage from './pages/SwipePage';
import ChatPage from './pages/ChatPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import HangoutsPage from './pages/HangoutsPage';
import OnboardingPage from './pages/OnboardingPage';
import TutorialPage from './pages/TutorialPage';
import Login from './pages/Login';
import Register from './pages/Register';

function AppRoutes() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading TapIn...</p>
        </div>
      </div>
    );
  }

  // Not logged in → always go to login
  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // Logged in but not onboarded → must complete onboarding
  if (!user?.isOnboarded) {
    return (
      <Routes>
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="*" element={<Navigate to="/onboarding" replace />} />
      </Routes>
    );
  }

  // Fully authenticated and onboarded → main app
  return (
    <SocketProvider>
      <Routes>
        <Route path="/" element={<SwipePage />} />
        <Route path="/tutorial" element={<TutorialPage />} />
        <Route path="/hangouts" element={<HangoutsPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </SocketProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
