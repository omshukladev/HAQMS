'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Activity, LogOut, LayoutDashboard, MonitorPlay } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 px-6 py-3 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Branding */}
        <Link href="/" className="flex items-center gap-2.5 text-teal-600 font-bold text-xl tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
            <Activity className="h-4 w-4 text-white" />
          </div>
          <span>HAQMS</span>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/queue"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all"
          >
            <MonitorPlay className="h-4 w-4" />
            Live Queue
          </Link>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-semibold text-gray-800">{user.name}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xxs font-bold tracking-wide uppercase bg-teal-50 text-teal-700 border border-teal-200">
              {user.role}
            </span>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}
