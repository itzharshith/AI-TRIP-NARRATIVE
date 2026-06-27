'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/client';

export default function LoginPage() {
  const { login, signup } = useAuth();
  const [activeTab, setActiveTab] = useState<'signin' | 'signup' | 'forgot'>('signin');
  
  // Sign In inputs
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign Up inputs
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);

  // Forgot password inputs
  const [forgotEmail, setForgotEmail] = useState('');

  // Alerts
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const clearAlerts = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();
    if (!signInEmail || !signInPassword) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(signInEmail, signInPassword);
      setSuccessMsg('Authenticated! Redirecting...');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();
    if (!signUpName || !signUpEmail || !signUpPassword) {
      setErrorMsg('Please fill in all signup fields.');
      return;
    }
    if (signUpPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await signup(signUpEmail, signUpPassword, signUpName);
      setSuccessMsg('Account registered successfully! Redirecting...');
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.message || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    clearAlerts();
    if (!forgotEmail) {
      setErrorMsg('Please enter your email.');
      return;
    }
    setSuccessMsg('Password reset is not configured for local databases. Please contact system administrator.');
  };

  return (
    <main className="min-h-screen flex bg-[#f7f9fb] w-full">
      
      {/* Left panel: Brand Hero (hidden on mobile) */}
      <section className="hidden md:block flex-1 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1200&q=80"
          alt="Manivtha Road Trip"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#003c90]/90 to-[#0f52ba]/65 flex flex-col justify-end p-12">
          <h2 className="font-bold text-3xl text-white mb-2 font-display">Manivtha Tours</h2>
          <p className="text-white/80 text-lg leading-relaxed max-w-sm">
            AI-driven road trip memory curation. Weave your memories into beautiful travel narratives.
          </p>
          <div className="flex gap-3 mt-8 flex-wrap">
            <span className="bg-white/15 border border-white/25 text-white px-4 py-2 rounded-full text-xs font-semibold backdrop-blur">
              ✈ Chauffeur Tours
            </span>
            <span className="bg-white/15 border border-white/25 text-white px-4 py-2 rounded-full text-xs font-semibold backdrop-blur">
              🤖 Gemini AI
            </span>
          </div>
        </div>
      </section>

      {/* Right panel: Auth Card */}
      <section className="w-full md:w-[480px] flex flex-col justify-center items-center px-8 py-12 bg-white shadow-xl overflow-y-auto">
        <div className="w-full max-w-sm">
          <Link href="/" className="font-bold text-2xl text-[#003c90] mb-8 text-center block font-display">
            Manivtha Tours
          </Link>

          {/* Alert banners */}
          {errorMsg && (
            <div className="p-4 mb-4 bg-red-50 text-red-700 text-xs font-semibold rounded-xl border border-red-200">
              ⚠️ {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-4 mb-4 bg-green-50 text-green-700 text-xs font-semibold rounded-xl border border-green-200">
              ✅ {successMsg}
            </div>
          )}

          {activeTab !== 'forgot' && (
            <div className="flex bg-[#f2f4f6] rounded-xl p-1 mb-6 gap-1">
              <button
                onClick={() => { setActiveTab('signin'); clearAlerts(); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'signin' ? 'bg-white text-[#003c90] shadow' : 'text-slate-500'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setActiveTab('signup'); clearAlerts(); }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'signup' ? 'bg-white text-[#003c90] shadow' : 'text-slate-500'}`}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* SIGN IN VIEW */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <h3 className="font-bold text-xl text-slate-800">Welcome Back</h3>
                <p className="text-xs text-slate-500 mt-1">Sign in to view and generate AI travel Stories.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Email Address</label>
                <input
                  type="email"
                  value={signInEmail}
                  onChange={e => setSignInEmail(e.target.value)}
                  placeholder="admin@manivtha.com"
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:bg-white focus:border-[#003c90] focus:ring-1 focus:ring-[#003c90] outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Password</label>
                <div className="relative">
                  <input
                    type={showSignInPassword ? 'text' : 'password'}
                    value={signInPassword}
                    onChange={e => setSignInPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:bg-white focus:border-[#003c90] focus:ring-1 focus:ring-[#003c90] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold hover:text-[#003c90]"
                  >
                    {showSignInPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#003c90] hover:bg-[#0f52ba] text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>

              <p className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => { setActiveTab('forgot'); clearAlerts(); }}
                  className="text-xs text-slate-400 hover:text-[#003c90] hover:underline"
                >
                  Forgot password?
                </button>
              </p>
            </form>
          )}

          {/* SIGN UP VIEW */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <h3 className="font-bold text-xl text-slate-800">Create Account</h3>
                <p className="text-xs text-slate-500 mt-1">Register to start managing your road trip memory lane.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Full Name</label>
                <input
                  type="text"
                  value={signUpName}
                  onChange={e => setSignUpName(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:bg-white focus:border-[#003c90] focus:ring-1 focus:ring-[#003c90] outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Email Address</label>
                <input
                  type="email"
                  value={signUpEmail}
                  onChange={e => setSignUpEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:bg-white focus:border-[#003c90] focus:ring-1 focus:ring-[#003c90] outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Password</label>
                <div className="relative">
                  <input
                    type={showSignUpPassword ? 'text' : 'password'}
                    value={signUpPassword}
                    onChange={e => setSignUpPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:bg-white focus:border-[#003c90] focus:ring-1 focus:ring-[#003c90] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold hover:text-[#003c90]"
                  >
                    {showSignUpPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#003c90] hover:bg-[#0f52ba] text-white py-3.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
              >
                {loading ? 'Creating Account...' : 'Sign Up'}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD VIEW */}
          {activeTab === 'forgot' && (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <h3 className="font-bold text-xl text-slate-800">Reset Password</h3>
                <p className="text-xs text-slate-500 mt-1">Enter your email and we'll send a password recovery helper.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">Email Address</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-sm focus:bg-white focus:border-[#003c90] focus:ring-1 focus:ring-[#003c90] outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setActiveTab('signin'); clearAlerts(); }}
                  className="flex-1 bg-[#f2f4f6] text-slate-700 py-3 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#003c90] text-white py-3 rounded-xl text-xs font-bold"
                >
                  Reset
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

    </main>
  );
}
