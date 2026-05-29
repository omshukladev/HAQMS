'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/common/Navbar';
import { useAuth } from '@/context/AuthContext';
import { Activity, Bell, Monitor, RefreshCw, AlertCircle } from 'lucide-react';

export default function QueueMonitor() {
  const { fetchWithAuth } = useAuth();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [refreshCount, setRefreshCount] = useState(0);

  const fetchQueueData = async () => {
    try {
      // Insecure: Fetches queue without checking credentials (it's a public dashboard, which is fine, 
      // but it uses the hardcoded API domain)
      const res = await fetchWithAuth('/queue');
      if (!res.ok) {
        throw new Error('Failed to retrieve active token queue.');
      }
      const data = await res.json();
      // BUG FIX: Extract tokens from standardized response envelope
      if (data.status === 'success') {
        setTokens(data.data.tokens);
      }
      setError('');
    } catch (err) {
      console.error('Queue poll fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchQueueData();

    // MEMORY LEAK BUG:
    // This setInterval has NO cleanup function (does not return clearInterval).
    // Every time this page is mounted, a new background polling timer is spun up.
    // If the candidate navigates between Dashboard and Queue multiple times,
    // dozens of parallel intervals will poll the database, causing memory bloat,
    // state update crashes on unmounted components, and heavy server load.
    const intervalId = setInterval(() => {
      console.log(`[POLL] Active Queue Poll #${refreshCount + 1} firing...`);
      fetchQueueData();
      setRefreshCount((prev) => prev + 1);
    }, 3000);

    // BUG FIX: Return cleanup function to clear interval on unmount, preventing memory leak
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Note that refreshCount dependency is missing too, causing stale closure on log!

  // Group tokens by doctor
  const groupedTokens = tokens.reduce((groups, token) => {
    const docId = token.doctorId;
    if (!groups[docId]) {
      groups[docId] = {
        doctorName: token.doctor.name,
        specialization: token.doctor.specialization,
        calling: null,
        waiting: [],
      };
    }
    
    if (token.status === 'CALLING') {
      groups[docId].calling = token;
    } else if (token.status === 'WAITING') {
      groups[docId].waiting.push(token);
    }
    return groups;
  }, {});

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <Navbar />
      
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8">
        {/* Header Dashboard Banner */}
        <div className="bg-[#ffffff] p-8 rounded-5xl shadow-sm border border-[#e2e8f0] mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="flex items-center gap-5">
            <div className="p-5 bg-[#0d9488] text-white rounded-2xl shadow-lg shadow-[#0d9488]/20">
              <Monitor className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-[#0f172a] tracking-tighter">
                Public Monitor
              </h1>
              <p className="text-sm text-[#64748b] font-black uppercase tracking-widest mt-1">
                Real-time physician calling boards • Auto-syncing
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-[#f0fdf4] text-[#166534] text-[11px] font-black uppercase tracking-[0.2em] border border-[#dcfce7]">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Live Sync
            </span>
            <div className="px-5 py-2.5 bg-[#f1f5f9] rounded-full text-[#475569] text-[11px] font-black uppercase tracking-[0.2em]">
              Cycles: {refreshCount}
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-6 mb-10 rounded-2xl bg-[#fff1f2] border border-[#ffe4e6] text-[#e11d48] flex items-center gap-5 text-sm font-black animate-in fade-in slide-in-from-top-4 duration-300 shadow-sm">
            <AlertCircle className="h-7 w-7 shrink-0" />
            <div>
              <strong>Sync Interrupted:</strong> {error} - Verify API connectivity.
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && tokens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40">
            <div className="pulse-loader mb-8"><div></div></div>
            <p className="text-[11px] font-black text-[#94a3b8] uppercase tracking-[0.3em] animate-pulse">Initializing Board...</p>
          </div>
        ) : Object.keys(groupedTokens).length === 0 ? (
          <div className="bg-[#ffffff] p-24 text-center rounded-5xl border-2 border-dashed border-[#e2e8f0]">
            <Bell className="h-20 w-20 text-[#e2e8f0] mx-auto mb-8 animate-bounce" />
            <h3 className="text-3xl font-black text-[#0f172a] tracking-tighter">No Active Tokens</h3>
            <p className="mt-4 text-[#64748b] font-medium max-w-md mx-auto text-lg">
              The clinic is currently not calling any patients.
            </p>
          </div>
        ) : (
          /* Grid of Doctor Calling Boards */
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(groupedTokens).map(([docId, docInfo]) => (
              <div
                key={docId}
                className="bg-[#ffffff] rounded-5xl shadow-xl shadow-[#0f172a]/5 border border-[#e2e8f0] overflow-hidden flex flex-col h-full hover:border-[#0d9488]/30 transition-all duration-300"
              >
                {/* Doctor Title Header */}
                <div className="bg-[#f8fafc] p-8 border-b border-[#f1f5f9]">
                  <h3 className="font-black text-2xl text-[#0f172a] tracking-tighter">{docInfo.doctorName}</h3>
                  <p className="text-[11px] text-[#0d9488] font-black uppercase tracking-[0.2em] mt-2">
                    {docInfo.specialization}
                  </p>
                </div>

                {/* Token Display Grid */}
                <div className="p-10 flex-1 flex flex-col justify-between bg-[#ffffff]">
                  {/* Current Active Token Box */}
                  <div className="mb-12">
                    <h4 className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.3em] mb-6 px-1">
                      Now Calling
                    </h4>
                    {docInfo.calling ? (
                      <div className="bg-[#0d9488] p-12 rounded-[2.5rem] text-center shadow-2xl shadow-[#0d9488]/40 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <span className="block text-8xl font-black text-white tracking-tighter">
                          #{docInfo.calling.tokenNumber}
                        </span>
                        <span className="block text-[11px] font-black text-[#ccfbf1] uppercase tracking-[0.3em] mt-6">
                          {docInfo.calling.patient.name}
                        </span>
                      </div>
                    ) : (
                      <div className="bg-[#f8fafc] border border-[#f1f5f9] p-12 rounded-[2.5rem] text-center">
                        <span className="block text-5xl font-black text-[#e2e8f0] tracking-tighter italic">
                          IDLE
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Upcoming Tokens list */}
                  <div>
                    <h4 className="text-[10px] font-black text-[#94a3b8] uppercase tracking-[0.3em] mb-6 px-1">
                      Waiting List
                    </h4>
                    {docInfo.waiting.length > 0 ? (
                      <div className="flex flex-wrap gap-4">
                        {docInfo.waiting.map((token) => (
                          <div
                            key={token.id}
                            className="px-6 py-3 rounded-2xl bg-[#f1f5f9] border border-[#e2e8f0] text-lg font-black text-[#475569] shadow-sm"
                          >
                            #{token.tokenNumber}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-[#cbd5e1] font-bold italic px-1 block">
                        No pending tokens
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
