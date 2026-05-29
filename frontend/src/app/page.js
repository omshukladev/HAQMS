'use client';

import Link from 'next/link';
import { Activity, ShieldAlert, MonitorPlay, Users, CalendarDays, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen justify-between py-12 px-6 lg:px-8 bg-[#f8fafc]">
      <div className="max-w-4xl mx-auto w-full text-center mt-12 sm:mt-20">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#f0fdfa] text-[#0d9488] text-[11px] font-black uppercase tracking-widest mb-10 border border-[#ccfbf1] animate-pulse">
          <Activity className="h-4 w-4" />
          Live Management Portal
        </div>
        
        <h1 className="text-5xl sm:text-7xl font-black tracking-tighter bg-gradient-to-r from-[#0d9488] to-[#10b981] bg-clip-text text-transparent">
          HAQMS
        </h1>
        <p className="text-xl sm:text-3xl font-black mt-4 text-[#0f172a] tracking-tight">
          Hospital Appointment & Queue Tracking
        </p>
        
        <p className="mt-8 text-lg text-[#64748b] font-medium max-w-2xl mx-auto leading-relaxed">
          The unified digital backbone for modern medical clinics. Streamline patient check-ins, manage physician workflows, and track real-time analytics.
        </p>

        {/* Action Cards */}
        <div className="mt-16 grid gap-8 sm:grid-cols-2 max-w-3xl mx-auto">
          {/* Card 1: Staff Portal */}
          <Link href="/login" className="group">
            <div className="bg-[#ffffff] p-10 rounded-5xl shadow-xl border border-[#e2e8f0] text-left hover:border-[#0d9488] transition-all duration-300 transform hover:-translate-y-2">
              <div className="p-4 bg-[#f0fdfa] text-[#0d9488] rounded-2xl w-fit group-hover:bg-[#0d9488] group-hover:text-white transition-all duration-300 shadow-sm">
                <Users className="h-7 w-7" />
              </div>
              <h2 className="mt-8 text-2xl font-black text-[#0f172a] flex items-center gap-3">
                Staff Login
                <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
              </h2>
              <p className="mt-3 text-[#64748b] font-medium text-sm leading-relaxed">
                Access role-based workflows for Administrators, Doctors, and Receptionists.
              </p>
            </div>
          </Link>

          {/* Card 2: Public Queue Monitor */}
          <Link href="/queue" className="group">
            <div className="bg-[#ffffff] p-10 rounded-5xl shadow-xl border border-[#e2e8f0] text-left hover:border-[#0d9488] transition-all duration-300 transform hover:-translate-y-2">
              <div className="p-4 bg-[#f0fdfa] text-[#0d9488] rounded-2xl w-fit group-hover:bg-[#0d9488] group-hover:text-white transition-all duration-300 shadow-sm">
                <MonitorPlay className="h-7 w-7" />
              </div>
              <h2 className="mt-8 text-2xl font-black text-[#0f172a] flex items-center gap-3">
                Live Monitor
                <ArrowRight className="h-5 w-5 group-hover:translate-x-2 transition-transform" />
              </h2>
              <p className="mt-3 text-[#64748b] font-medium text-sm leading-relaxed">
                Public-facing board tracking active patient calls and token sequences.
              </p>
            </div>
          </Link>
        </div>

        {/* Assessment Notice Box */}
        <div className="mt-20 bg-[#ffffff] max-w-xl mx-auto p-8 rounded-4xl border border-[#e2e8f0] shadow-sm flex gap-6 text-left ring-1 ring-[#0f172a]/5">
          <div className="p-3 bg-[#fff1f2] text-[#e11d48] rounded-xl h-fit">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-black text-[#0f172a] text-lg">Technical Evaluation</h3>
            <p className="mt-2 text-[#64748b] text-sm font-medium leading-relaxed">
              Candidate evaluation environment. All frontend and backend modules are active for analysis and debugging.
            </p>
          </div>
        </div>
      </div>

      <footer className="text-center text-[#94a3b8] text-[10px] font-black uppercase tracking-[0.2em] mt-16">
        HAQMS v1.0.0-PRO &copy; {new Date().getFullYear()} Clinical Systems.
      </footer>
    </div>
  );
}
