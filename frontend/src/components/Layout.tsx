import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame, MessageSquare, User, LogOut, CircleUser, Map } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Discover', icon: Flame },
    { path: '/hangouts', label: 'Hangouts', icon: Map },
    { path: '/chat', label: 'Matches', icon: MessageSquare },
    { path: '/profile', label: 'Profile', icon: CircleUser },
    { path: '/settings', label: 'Settings', icon: User },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100">
      {/* Premium Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Flame className="w-8 h-8 text-rose-500 fill-rose-500 animate-pulse" />
            <span className="text-xl font-bold tracking-tight text-gradient bg-clip-text">HeartSync</span>
          </div>

          <nav className="flex space-x-1 md:space-x-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    isActive
                      ? 'bg-rose-500/10 text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all duration-300"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden md:inline">Log out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl flex flex-col justify-center">
        {children}
      </main>

      {/* Subtle Premium Footer */}
      <footer className="py-6 border-t border-slate-900 text-center text-xs text-slate-600">
        <p>&copy; 2026 HeartSync. 18+ Verification Mandatory. Block and report tools active.</p>
      </footer>
    </div>
  );
}
