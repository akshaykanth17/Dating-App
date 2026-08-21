import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Flame, Mail, Lock, User, Calendar, MapPin } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('male');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'fetching' | 'success' | 'failed'>('idle');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch coordinates on component mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      setLocationStatus('fetching');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setLocationStatus('success');
        },
        (err) => {
          console.warn('[Register] Geolocation permission denied or failed:', err);
          // Set mock coordinates as fallback (New Delhi coordinates)
          setLatitude(28.6139);
          setLongitude(77.2090);
          setLocationStatus('failed');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      // Browser doesn't support geolocation
      setLatitude(28.6139);
      setLongitude(77.2090);
      setLocationStatus('failed');
    }
  }, []);

  const getAge = (birthdateString: string): number => {
    const today = new Date();
    const birthDate = new Date(birthdateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Enforce 18+ age gate locally
    const age = getAge(birthdate);
    if (age < 18) {
      setError('Signup Blocked: You must be at least 18 years old to join HeartSync.');
      return;
    }

    if (latitude === null || longitude === null) {
      setError('Location coordinates are required. Please share location or reload.');
      return;
    }

    setIsLoading(true);

    try {
      await register({
        email,
        password,
        name,
        birthdate,
        gender,
        latitude,
        longitude,
        gendersInterestedIn: gender === 'male' ? ['female'] : ['male'], // default
      });
      setMessage('Registration successful! Please check your email to verify your account.');
      
      // Clear fields
      setEmail('');
      setPassword('');
      setName('');
      setBirthdate('');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center space-x-2">
          <Flame className="w-12 h-12 text-rose-500 fill-rose-500 animate-pulse" />
          <span className="text-3xl font-extrabold text-gradient bg-clip-text">HeartSync</span>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-100">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Or{' '}
          <Link to="/login" className="font-medium text-rose-500 hover:text-rose-400 transition-colors">
            sign in to your profile
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="glass p-8 rounded-2xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-rose-700"></div>

          {error && (
            <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm">
              {message}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-300">
                Your Name
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-800 rounded-xl bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all text-sm"
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                Email address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-800 rounded-xl bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all text-sm"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-800 rounded-xl bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all text-sm"
                  placeholder="Min 6 characters"
                  minLength={6}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="birthdate" className="block text-sm font-medium text-slate-300">
                  Birthdate (18+)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    id="birthdate"
                    type="date"
                    required
                    value={birthdate}
                    onChange={(e) => setBirthdate(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-800 rounded-xl bg-slate-900/60 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="gender" className="block text-sm font-medium text-slate-300">
                  Gender
                </label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-800 rounded-xl bg-slate-900/60 text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition-all text-sm"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Geolocation Status Display */}
            <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-800/50">
              <span className="text-slate-400 flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-rose-500" />
                <span>GPS Location:</span>
              </span>
              {locationStatus === 'fetching' && <span className="text-amber-400 animate-pulse">Requesting location...</span>}
              {locationStatus === 'success' && <span className="text-emerald-400">Successfully set ({latitude?.toFixed(2)}, {longitude?.toFixed(2)})</span>}
              {locationStatus === 'failed' && <span className="text-slate-400">Failed (Using fallback Delhi coordinates)</span>}
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading || locationStatus === 'fetching'}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-rose-500 transition-all disabled:opacity-50"
              >
                {isLoading ? <span>Registering...</span> : <span>Create Account</span>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
