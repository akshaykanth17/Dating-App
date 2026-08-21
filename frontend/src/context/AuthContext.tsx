import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  isVerified: boolean;
  profile: {
    id: string;
    name: string;
    birthdate: string;
    gender: string;
    bio: string;
    latitude: number;
    longitude: number;
    photos: { id: string; url: string; isPrimary: boolean }[];
  } | null;
}

// Mock demo user — auth is bypassed
const MOCK_USER: User = {
  id: 'demo-user',
  email: 'demo@heartsync.app',
  isVerified: true,
  profile: null,
};

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: unknown) => Promise<void>;
  logout: () => void;
  updateUserProfile: (profileData: unknown) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(MOCK_USER);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch the actual seeded user ID from the backend to match the Socket middleware
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/profiles/me`);
        if (response.ok) {
          const data = await response.json();
          // data is the profile, which includes userId
          if (data && data.userId) {
            setUser({
              id: data.userId,
              email: 'demo@heartsync.app', // placeholder
              isVerified: true,
              profile: data
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch demo user profile:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUser();
  }, []);

  const login = async (_email: string, _password: string) => {
    // Auth bypassed — no-op
  };

  const register = async (_data: unknown) => {
    // Auth bypassed — no-op
  };

  const logout = () => {
    // Auth bypassed — no-op
  };

  const updateUserProfile = (profileData: unknown) => {
    setUser((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        profile: profileData as User['profile'],
      };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: true,
        isLoading,
        login,
        register,
        logout,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
