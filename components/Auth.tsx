
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { HanifgoldLogoIcon } from './icons';
import LoadingSpinner from './LoadingSpinner';

const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Registration successful! Please check your email for verification or log in.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-gold/10 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-blue-500/10 rounded-full blur-[100px]"></div>

      <div className="w-full max-w-md z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-white/5 rounded-2xl backdrop-blur-xl border border-white/10 mb-4 shadow-2xl">
            <HanifgoldLogoIcon className="w-16 h-12" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Hanifgold AI</h1>
          <p className="text-gray-400 mt-2 font-medium">Professional Tiling Quotation Suite</p>
        </div>

        <div className="bg-white/10 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl">
          <div className="flex bg-black/20 p-1 rounded-2xl mb-8">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${!isSignUp ? 'bg-gold text-brand-dark shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Log In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${isSignUp ? 'bg-gold text-brand-dark shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 pl-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border-none rounded-2xl px-5 py-4 text-white focus:ring-4 focus:ring-gold/30 placeholder-gray-500 transition-all font-medium"
                  placeholder="e.g. john@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 pl-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border-none rounded-2xl px-5 py-4 text-white focus:ring-4 focus:ring-gold/30 placeholder-gray-500 transition-all font-medium"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm font-medium text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gold hover:bg-gold-dark text-brand-dark font-black rounded-2xl shadow-xl shadow-gold/20 transform transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-3"
            >
              {loading ? <LoadingSpinner /> : isSignUp ? 'Create Professional Account' : 'Access Dashboard'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-xs mt-8 font-medium">
            {isSignUp ? 'By signing up, you agree to our Terms and Conditions.' : 'Tiling professionals trust Hanifgold AI for precision.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
