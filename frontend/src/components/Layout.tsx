import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame, MessageSquare, User, LogOut, CircleUser, Map, MapPin } from 'lucide-react';
import { reverseGeocode } from '../utils/location';

import LocationPickerModal from './LocationPickerModal';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [locationName, setLocationName] = React.useState('');
  const [showLocationModal, setShowLocationModal] = React.useState(false);

  React.useEffect(() => {
    if (user?.profile?.latitude && user?.profile?.longitude) {
      reverseGeocode(user.profile.latitude, user.profile.longitude).then(setLocationName);
    }
  }, [user?.profile?.latitude, user?.profile?.longitude]);

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
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 overflow-x-hidden">
      {/* Location Picker Modal */}
      <LocationPickerModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        currentLat={user?.profile?.latitude}
        currentLng={user?.profile?.longitude}
        currentLocationName={locationName}
        onLocationSelected={(loc) => {
          setLocationName(loc.locationName);
        }}
      />

      {/* Premium Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Flame className="w-8 h-8 text-rose-500 fill-rose-500 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-gradient bg-clip-text leading-none">HeartSync</span>
              <button
                type="button"
                onClick={() => setShowLocationModal(true)}
                className="text-[10px] text-slate-400 hover:text-rose-400 font-medium flex items-center mt-0.5 group transition-colors cursor-pointer text-left"
                title="Tap to change location"
              >
                <MapPin className="w-3 h-3 mr-0.5 text-rose-500 group-hover:scale-110 transition-transform" />
                <span className="truncate max-w-[130px] sm:max-w-[180px]">{locationName || 'Set Location'}</span>
                <span className="text-[9px] text-rose-400/80 ml-1 group-hover:underline">✎</span>
              </button>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-4">
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
                  <span>{item.label}</span>
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
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24 md:pb-8 flex flex-col">
        {children}
      </main>

      {/* Subtle Premium Footer (Desktop only) */}
      <footer className="hidden md:block py-6 border-t border-slate-900 text-center text-xs text-slate-600">
        <p>&copy; 2026 HeartSync. 18+ Verification Mandatory. Block and report tools active.</p>
      </footer>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-md border-t border-slate-800" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${
                  isActive
                    ? 'text-rose-500'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]' : ''}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
