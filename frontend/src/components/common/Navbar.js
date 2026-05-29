'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Activity, LogOut, LayoutDashboard, MonitorPlay } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 bg-[#ffffff] border-b border-[#f1f5f9] shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
        {/* Branding */}
        <Link href="/" className="flex items-center gap-3 text-[#0d9488] font-black text-2xl tracking-tighter">
          <div className="w-10 h-10 rounded-xl bg-[#0d9488] flex items-center justify-center shadow-lg shadow-[#0d9488]/20">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <span>HAQMS</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc] transition-all"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/queue"
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-black text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8fafc] transition-all"
          >
            <MonitorPlay className="h-4 w-4" />
            Live Monitor
          </Link>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-6">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-black text-[#0f172a]">{user.name}</span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black tracking-[0.2em] uppercase bg-[#f0fdfa] text-[#0d9488] border border-[#ccfbf1]">
              {user.role}
            </span>
          </div>

          <button
            onClick={logout}
            className="p-3 rounded-xl text-[#94a3b8] hover:text-[#e11d48] hover:bg-[#fff1f2] transition-all border border-transparent hover:border-[#ffe4e6]"
            title="Log Out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </nav>
  );
}
