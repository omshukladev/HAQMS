'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { User, Lock, Activity, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const { login, error: authError, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Local validation issues
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValidationError('');

    // INCONSISTENT VALIDATION BUG:
    // Simple basic regex that is flawed (e.g. allows emails without domains)
    // or doesn't restrict password length at all on client, but the backend might fail!
    const emailRegex = /^[^\s@]+@[^\s@]+$/; // This is a standard regex, but let's see,
    // junior dev wrote it to skip length check, letting empty or weak passwords through to the DB:
    if (!email) {
      setValidationError('Please enter your email address.');
      return;
    }
    
    if (!emailRegex.test(email)) {
      setValidationError('Please enter a valid email format.');
      return;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.');
      return;
    }

    const result = await login(email, password);
    if (!result.success) {
      setValidationError(result.error || 'Invalid credentials');
    }
  };

  return (
    <div className="flex flex-col min-h-screen justify-center items-center py-12 px-6 lg:px-8 bg-[#f8fafc]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-3 text-[#0d9488] font-black text-4xl tracking-tighter">
          <div className="w-12 h-12 rounded-2xl bg-[#0d9488] flex items-center justify-center shadow-xl shadow-[#0d9488]/20">
            <Activity className="h-7 w-7 text-white" />
          </div>
          <span>HAQMS</span>
        </Link>
        <h2 className="mt-10 text-4xl font-black text-[#0f172a] tracking-tighter">
          Portal Login
        </h2>
        <p className="mt-3 text-sm font-bold text-[#64748b]">
          Clinical access for registered staff members
        </p>
      </div>

      <div className="mt-12 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[#ffffff] py-12 px-10 shadow-2xl rounded-5xl border border-[#e2e8f0] ring-1 ring-[#0f172a]/5">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Validation Display */}
            {(validationError || authError) && (
              <div className="p-5 text-sm font-black bg-[#fff1f2] border border-[#ffe4e6] text-[#e11d48] rounded-3xl animate-in fade-in slide-in-from-top-2 duration-300">
                {validationError || authError}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-[#64748b] uppercase tracking-widest text-[10px] mb-2 px-1 font-black">
                Email Address
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-[#94a3b8] group-focus-within:text-[#0d9488] transition-colors">
                  <User className="h-5 w-5" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-14 pr-5 py-5 border border-[#cbd5e1] bg-[#f8fafc] rounded-2xl text-[#0f172a] font-black focus:ring-4 focus:ring-[#0d9488]/10 focus:border-[#0d9488] focus:bg-[#ffffff] transition-all outline-none"
                  placeholder="admin@haqms.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-[#64748b] uppercase tracking-widest text-[10px] mb-2 px-1 font-black">
                Account Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-[#94a3b8] group-focus-within:text-[#0d9488] transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-14 pr-14 py-5 border border-[#cbd5e1] bg-[#f8fafc] rounded-2xl text-[#0f172a] font-black focus:ring-4 focus:ring-[#0d9488]/10 focus:border-[#0d9488] focus:bg-[#ffffff] transition-all outline-none"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-6 flex items-center text-[#94a3b8] hover:text-[#0d9488] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 px-6 bg-[#0d9488] hover:bg-[#0f766e] text-white font-black rounded-2xl shadow-xl shadow-[#0d9488]/20 transition-all active:scale-95 disabled:opacity-50 mt-6 text-lg"
            >
              {loading ? 'Verifying...' : 'Sign In To Portal'}
            </button>
          </form>

          {/* Seeded Credentials */}
          <div className="mt-12 pt-10 border-t border-[#f1f5f9]">
            <h4 className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.2em] mb-8 text-center">Development Access</h4>
            <div className="grid grid-cols-1 gap-4">
              <button
                type="button"
                onClick={() => { setEmail('admin@haqms.com'); setPassword('password123'); }}
                className="group text-left p-5 rounded-3xl bg-[#f8fafc] border border-[#e2e8f0] hover:border-[#0d9488] hover:bg-[#f0fdfa] transition-all"
              >
                <div className="text-sm font-black text-[#0f172a] group-hover:text-[#0d9488]">Admin Root</div>
                <div className="text-[11px] text-[#64748b] font-bold mt-1 uppercase tracking-wider">admin@haqms.com</div>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('reception1@haqms.com'); setPassword('password123'); }}
                className="group text-left p-5 rounded-3xl bg-[#f8fafc] border border-[#e2e8f0] hover:border-[#0d9488] hover:bg-[#f0fdfa] transition-all"
              >
                <div className="text-sm font-black text-[#0f172a] group-hover:text-[#0d9488]">Receptionist Desk</div>
                <div className="text-[11px] text-[#64748b] font-bold mt-1 uppercase tracking-wider">reception1@haqms.com</div>
              </button>
              <button
                type="button"
                onClick={() => { setEmail('doctor1@haqms.com'); setPassword('password123'); }}
                className="group text-left p-5 rounded-3xl bg-[#f8fafc] border border-[#e2e8f0] hover:border-[#0d9488] hover:bg-[#f0fdfa] transition-all"
              >
                <div className="text-sm font-black text-[#0f172a] group-hover:text-[#0d9488]">Physician Worklist</div>
                <div className="text-[11px] text-[#64748b] font-bold mt-1 uppercase tracking-wider">doctor1@haqms.com</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
