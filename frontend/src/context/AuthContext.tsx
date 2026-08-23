import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface User {
  id: string;
  email: string;
  isVerified: boolean;
  isOnboarded: boolean;
  authProvider: string;
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

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithFirebaseToken: (idToken: string) => Promise<{ isOnboarded: boolean }>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUserProfile: (profileData: unknown) => void;
  setOnboarded: (val: boolean) => void;
  demoLogin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN_KEY = 'tapin_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current user from backend using stored token
  const fetchCurrentUser = useCallback(async (jwt: string) => {
    try {
      // Fetch user data first to validate token
      const userRes = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${jwt}` },
      });
      
      if (userRes.ok) {
        const userData = await userRes.json();
        
        // Now try to fetch profile
        let profile = null;
        try {
          const profileRes = await fetch(`${API_URL}/profiles/me`, {
            headers: { Authorization: `Bearer ${jwt}` },
          });
          if (profileRes.ok) {
            profile = await profileRes.json();
          }
        } catch (e) {
          // Ignore network error for profile
        }
        
        setUser({
          id: userData.id || profile?.userId,
          email: userData.email || '',
          isVerified: userData.isVerified ?? true,
          isOnboarded: Boolean(userData.isOnboarded && profile),
          authProvider: userData.authProvider || 'email',
          profile,
        });
      } else if (userRes.status === 401) {
        // Token invalid — clear it
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      }
    } catch {
      // Network error — keep token but set no user
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const saveToken = (jwt: string) => {
    localStorage.setItem(TOKEN_KEY, jwt);
    setToken(jwt);
  };

  // Email/password login via our backend
  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    saveToken(data.accessToken);
    setUser({ ...data.user, isOnboarded: data.user.isOnboarded ?? false });
  };

  // Firebase ID token exchange (Google or Email via Firebase)
  const loginWithFirebaseToken = async (idToken: string) => {
    const res = await fetch(`${API_URL}/onboarding/firebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Firebase auth failed');
    saveToken(data.accessToken);
    setUser({ ...data.user, profile: data.user.profile || null });
    return { isOnboarded: data.isOnboarded };
  };

  // Register new user with email/password
  const register = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    // Auto-login after register
    await login(email, password);
  };

  // Demo login — logs in as seeded user (for testing)
  const demoLogin = async () => {
    const res = await fetch(`${API_URL}/auth/demo-login`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error('Demo login failed');
    saveToken(data.accessToken);
    setUser({ ...data.user, isOnboarded: true });
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const updateUserProfile = (profileData: unknown) => {
    setUser(prev => prev ? { ...prev, profile: profileData as User['profile'] } : null);
  };

  const setOnboarded = (val: boolean) => {
    setUser(prev => prev ? { ...prev, isOnboarded: val } : null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      token,
      login,
      loginWithFirebaseToken,
      register,
      logout,
      updateUserProfile,
      setOnboarded,
      demoLogin,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
