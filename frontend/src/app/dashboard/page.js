'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/common/Navbar';
import Link from 'next/link';
import {
  Users, CalendarDays, Activity, Search, UserPlus,
  Trash2, ClipboardList, TrendingUp, Award, Clock,
  ArrowRight, ShieldAlert, CheckCircle
} from 'lucide-react';

export default function Dashboard() {
  const { user, token, API_BASE_URL, fetchWithAuth, logout } = useAuth();

  // Global State
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState(user?.role === 'ADMIN' ? 'reports' : user?.role === 'RECEPTIONIST' ? 'patients' : 'appointments');
  const abortRef = useRef(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Create AbortController once on mount, abort all fetches on unmount
  useEffect(() => {
    abortRef.current = new AbortController();
    return () => abortRef.current?.abort();
  }, []);

  // ==========================================
  // STATE FOR RECEPTIONIST WORKFLOWS
  // ==========================================
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientGender, setPatientGender] = useState('All');
  const [patientsPagination, setPatientsPagination] = useState({ page: 1, totalPages: 1 });
  
  // Registration Form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAge, setRegAge] = useState('');
  const [regGender, setRegGender] = useState('Male');
  const [regHistory, setRegHistory] = useState('');
  const [regMessage, setRegMessage] = useState('');

  // Queue and Appointment Booking
  const [doctorsList, setDoctorsList] = useState([]);
  const [bookingPatientId, setBookingPatientId] = useState('');
  const [bookingDoctorId, setBookingDoctorId] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [checkinSubmitting, setCheckinSubmitting] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState('');
  const [walkinPatientId, setWalkinPatientId] = useState('');
  const [walkinDoctorId, setWalkinDoctorId] = useState('');

  // ==========================================
  // STATE FOR DOCTOR WORKFLOWS
  // ==========================================
  const [doctorAppointments, setDoctorAppointments] = useState([]);
  const [doctorQueue, setDoctorQueue] = useState([]);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [queueActionLoading, setQueueActionLoading] = useState(false);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState(null);

  // ==========================================
  // STATE FOR ADMIN WORKFLOWS
  // ==========================================
  const [adminReportData, setAdminReportData] = useState(null);
  const [adminReportLoading, setAdminReportLoading] = useState(false);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [doctorSearchResults, setDoctorSearchResults] = useState([]);

  // ==========================================
  // RECEPTIONIST FUNCTIONS
  // ==========================================
  
  // Fetch Patients List
  const fetchPatients = async (page = 1) => {
    setPatientsLoading(true);
    try {
      // Inefficient memory pagination called from client
      const res = await fetchWithAuth(`/patients?page=${page}&limit=5&search=${patientSearch}&gender=${patientGender}`, { signal: abortRef.current?.signal });
      const data = await res.json();
      // BUG FIX: Handle standardized response envelope
      if (data.status === 'success') {
        setPatients(data.data.patients);
        setPatientsPagination({
          page: data.data.pagination.page,
          totalPages: data.data.pagination.totalPages,
          totalPatients: data.data.pagination.totalPatients
        });
      }
    } catch (e) {
      if (e?.name === 'AbortError') return;
      console.error(e);
    } finally {
      setPatientsLoading(false);
    }
  };

  // Debounced patient search: fires 300ms after last keystroke
  useEffect(() => {
    if (user.role !== 'RECEPTIONIST' && user.role !== 'ADMIN') return;
    const timer = setTimeout(() => {
      fetchPatients(1);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientSearch, patientGender]);

  // Fetch Doctors for booking drop-down
  const fetchDoctorsDropdown = async () => {
    try {
      const res = await fetchWithAuth('/doctors', { signal: abortRef.current?.signal });
      const data = await res.json();
      // BUG FIX: Extract doctors array from standardized response envelope
      if (data.status === 'success') {
        setDoctorsList(data.data.doctors);
      }
    } catch (e) {
      if (e?.name === 'AbortError') return;
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDoctorsDropdown();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Patient Registration
  const handleRegisterPatient = async (e) => {
    e.preventDefault();
    setRegMessage('');

    if (!regName || !regPhone || !regAge) {
      setRegMessage('Error: Name, Age and Phone number are required.');
      return;
    }

    // Phone: strip dashes/spaces, then validate 7-15 digits with optional +
    const cleanedPhone = regPhone.replace(/[\s-]/g, '');
    if (!/^\+?\d{7,15}$/.test(cleanedPhone)) {
      setRegMessage('Error: Phone must be 7-15 digits (numbers, +, spaces, dashes only).');
      return;
    }

    // Age: must be a number between 0 and 150
    const ageNum = parseInt(regAge, 10);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 150) {
      setRegMessage('Error: Age must be a number between 0 and 150.');
      return;
    }

    if (regSubmitting) return;
    setRegSubmitting(true);

    try {
      const res = await fetchWithAuth('/patients', {
        method: 'POST',
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          phoneNumber: regPhone,
          age: regAge,
          gender: regGender,
          medicalHistory: regHistory
        })
      });

      const data = await res.json();
      if (res.ok) {
        setRegMessage('Success: Patient registered successfully!');
        // Clear fields
        setRegName('');
        setRegEmail('');
        setRegPhone('');
        setRegAge('');
        setRegHistory('');
        // Refresh directory
        fetchPatients(1);
      } else {
        setRegMessage(`Error: ${data.error || 'Failed to register'}`);
      }
    } catch (err) {
      setRegMessage(`Error: ${err.message}`);
    } finally {
      setRegSubmitting(false);
    }
  };

  // Handle Appointment Booking
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setBookingMessage('');

    if (!bookingPatientId || !bookingDoctorId || !bookingDate) {
      setBookingMessage('Error: All booking fields are required.');
      return;
    }

    if (bookingSubmitting) return;
    setBookingSubmitting(true);

    try {
      const res = await fetchWithAuth('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          patientId: bookingPatientId,
          doctorId: bookingDoctorId,
          appointmentDate: bookingDate,
          reason: bookingReason
        })
      });

      const data = await res.json();
      if (res.ok) {
        setBookingMessage('Success: Appointment booked successfully!');
        setBookingReason('');
        if (user.role === 'DOCTOR') fetchDoctorWorklist();
      } else {
        setBookingMessage(`Error: ${data.error || 'Failed to book'}`);
      }
    } catch (err) {
      setBookingMessage(`Error: ${err.message}`);
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Delete Patient (Bypassed authorization admin check!)
  const handleDeletePatient = async (id) => {
    if (!confirm('Are you sure you want to delete this patient record?')) return;
    try {
      const res = await fetchWithAuth(`/patients/${id}`, { method: 'DELETE' });
      const data = await res.json();
      // BUG FIX: Handle standardized response envelope
      if (res.ok && data.status === 'success') {
        alert(data.data.message || 'Patient deleted.');
        fetchPatients(patientsPagination.page);
      } else {
        alert(`Error: ${data.error || 'Unauthorized deletion!'}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // Queue Token Checkin (Race condition API!)
  const handleQueueCheckin = async (patientId, doctorId, appointmentId = null) => {
    setCheckinMessage('');
    if (checkinSubmitting) return;
    setCheckinSubmitting(true);
    try {
      const res = await fetchWithAuth('/queue/checkin', {
        method: 'POST',
        body: JSON.stringify({ patientId, doctorId, appointmentId })
      });
      const data = await res.json();
      // BUG FIX: Handle standardized response envelope
      if (res.ok && data.status === 'success') {
        setCheckinMessage(`Checked in! Generated Token #${data.data.token.tokenNumber}`);
        if (user.role === 'DOCTOR') fetchDoctorWorklist();
      } else {
        setCheckinMessage(`Error check-in: ${data.error}`);
      }
    } catch (err) {
      setCheckinMessage(`Error: ${err.message}`);
    } finally {
      setCheckinSubmitting(false);
    }
  };

  // ==========================================
  // DOCTOR WORKFLOW FUNCTIONS
  // ==========================================
  const fetchDoctorWorklist = async () => {
    if (user.role !== 'DOCTOR') return;
    setDoctorLoading(true);
    try {
      // Find matching doctor from doctors dropdown using user ID link
      const matchedDoc = doctorsList.find(d => d.userId === user.id);
      if (!matchedDoc) { setDoctorLoading(false); return; }

      // 1. Fetch appointments for this doctor (N+1 database queries triggers inside server)
      const appRes = await fetchWithAuth(`/appointments?doctorId=${matchedDoc.id}`);
      const appData = await appRes.json();
      // BUG FIX: Handle standardized response envelope
      if (appData.status === 'success') {
        setDoctorAppointments(appData.data.appointments);
      }

      // 2. Fetch queue list for this doctor today
      const queueRes = await fetchWithAuth(`/queue?doctorId=${matchedDoc.id}`);
      const queueData = await queueRes.json();
      // BUG FIX: Extract from standardized envelope
      if (queueData.status === 'success') {
        setDoctorQueue(queueData.data.tokens);
      }

    } catch (e) {
      console.error(e);
    } finally {
      setDoctorLoading(false);
    }
  };

  useEffect(() => {
    if (user.role === 'DOCTOR' && doctorsList.length > 0) {
      fetchDoctorWorklist();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorsList]);

  // Update token status (WAITING -> CALLING -> COMPLETED / SKIPPED)
  const handleUpdateQueueStatus = async (tokenId, newStatus) => {
    if (queueActionLoading) return;
    setQueueActionLoading(true);
    try {
      const res = await fetchWithAuth(`/queue/${tokenId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchDoctorWorklist();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setQueueActionLoading(false);
    }
  };

  // Complete consultation of an appointment
  const handleCompleteAppointment = async (appId) => {
    if (queueActionLoading) return;
    setQueueActionLoading(true);
    try {
      const res = await fetchWithAuth(`/appointments/${appId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      if (res.ok) {
        fetchDoctorWorklist();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setQueueActionLoading(false);
    }
  };

  // ==========================================
  // ADMIN SYSTEM WORKFLOWS
  // ==========================================
  
  // Slow report generator fetch
  const generateSystemReport = async () => {
    setAdminReportLoading(true);
    try {
      // Calls slow nested aggregation endpoint
      const res = await fetchWithAuth('/reports/doctor-stats');
      const data = await res.json();
      // BUG FIX: Handle standardized response envelope
      if (data.status === 'success') {
        setAdminReportData({ doctors: data.data.doctors });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAdminReportLoading(false);
    }
  };

  // Search Doctors (SQL Injection vulnerable API!)
  const searchPhysiciansAdmin = async () => {
    try {
      const res = await fetchWithAuth(`/doctors?search=${adminSearchQuery}`);
      const data = await res.json();
      // BUG FIX: Handle standardized response envelope
      if (data.status === 'success') {
        setDoctorSearchResults(data.data.doctors);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="pulse-loader">
          <div></div>
          <div></div>
        </div>
        <p className="mt-6 text-sm font-medium text-gray-400">Loading dashboard...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">

        {/* Navigation Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-1.5 mb-8 overflow-x-auto">
          <div className="flex">
            {user.role === 'ADMIN' && (
              <>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === 'reports' ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                  System Audit Reports
                </button>
                <button
                  onClick={() => setActiveTab('physicians')}
                  className={`px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === 'physicians' ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                  Physician Registry
                </button>
              </>
            )}

            {(user.role === 'RECEPTIONIST' || user.role === 'ADMIN') && (
              <>
                <button
                  onClick={() => setActiveTab('patients')}
                  className={`px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === 'patients' ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                  Patient Registry
                </button>
                <button
                  onClick={() => setActiveTab('book')}
                  className={`px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === 'book' ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                  Scheduling / Check-in
                </button>
              </>
            )}

            {user.role === 'DOCTOR' && (
              <>
                <button
                  onClick={() => setActiveTab('appointments')}
                  className={`px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === 'appointments' ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                  My Appointments
                </button>
                <button
                  onClick={() => setActiveTab('queue')}
                  className={`px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === 'queue' ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                  Calling Queue
                </button>
              </>
            )}
          </div>
        </div>

        {/* Notifications */}
        {checkinMessage && (
          <div className="banner banner-info mb-6 flex items-center justify-between">
            <span>{checkinMessage}</span>
            <button onClick={() => setCheckinMessage('')} className="font-semibold underline text-xs ml-4 shrink-0">Dismiss</button>
          </div>
        )}

        {/* ==============================================================
            TAB: PATIENT REGISTRY (RECEPTIONIST & ADMIN)
            ============================================================== */}
        {activeTab === 'patients' && (
          <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-3">
              {/* Directory Section */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#ffffff] p-8 rounded-4xl shadow-md border border-[#e2e8f0]">
                  <h3 className="text-2xl font-black text-[#0f172a] flex items-center gap-3 mb-8">
                    <ClipboardList className="h-7 w-7 text-[#0d9488]" />
                    Patient Directory
                  </h3>

                  {/* Filters */}
                  <div className="flex gap-4 mb-10">
                    <div className="relative flex-1 group">
                      <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-[#94a3b8]">
                        <Search className="h-5 w-5" />
                      </div>
                      <input
                        type="text"
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        placeholder="Search by name, phone or email..."
                        className="block w-full pl-14 pr-4 py-4 border border-[#e2e8f0] bg-[#f8fafc] rounded-2xl text-[#0f172a] font-medium focus:ring-4 focus:ring-[#0d9488]/10 focus:border-[#0d9488] focus:bg-[#ffffff] transition-all text-sm outline-none"
                      />
                    </div>

                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value)}
                      className="px-8 py-4 border border-[#e2e8f0] bg-[#f8fafc] rounded-2xl text-[#0f172a] text-sm font-black focus:ring-4 focus:ring-[#0d9488]/10 focus:bg-[#ffffff] transition-all outline-none cursor-pointer"
                    >
                      <option value="All">All Genders</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Table listing */}
                  {patientsLoading ? (
                    <div className="text-center py-20">
                       <div className="pulse-loader mx-auto mb-6"><div></div></div>
                       <p className="text-sm font-black text-[#94a3b8] uppercase tracking-widest animate-pulse">Fetching Patient Records...</p>
                    </div>
                  ) : patients.length === 0 ? (
                    <div className="text-center py-20 bg-[#f8fafc] rounded-3xl border-2 border-dashed border-[#e2e8f0]">
                      <p className="text-[#94a3b8] font-bold">No registered patients match this filter.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm text-left">
                        <thead>
                          <tr className="text-[#64748b] uppercase tracking-widest text-[10px] font-black border-b-2 border-[#f1f5f9]">
                            <th className="pb-5 px-4 bg-[#f8fafc] rounded-tl-xl">Patient Name</th>
                            <th className="pb-5 px-4 bg-[#f8fafc]">Contact Info</th>
                            <th className="pb-5 px-4 bg-[#f8fafc]">Demographics</th>
                            <th className="pb-5 px-4 bg-[#f8fafc] text-right rounded-tr-xl">Management</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f1f5f9]">
                          {patients.map((p) => (
                            <tr key={p.id} className="group hover:bg-[#f0fdfa] transition-all">
                              <td className="py-5 px-4">
                                <span className="font-black text-[#0f172a] text-base block">{p.name}</span>
                                {p.email && <span className="text-xs text-[#64748b] font-medium">{p.email}</span>}
                              </td>
                              <td className="py-5 px-4 text-[#475569] font-black tabular-nums">{p.phoneNumber}</td>
                              <td className="py-5 px-4 text-[#475569] font-bold">
                                {p.age} Years <span className="text-[#cbd5e1] mx-1">/</span> <span className="capitalize text-[#0d9488]">{p.gender}</span>
                              </td>
                              <td className="py-5 px-4 text-right space-x-2">
                                <button
                                  disabled={doctorsList.length === 0 || checkinSubmitting}
                                  onClick={() => handleQueueCheckin(p.id, doctorsList[0]?.id)}
                                  className="px-5 py-2.5 rounded-xl bg-[#0d9488] text-white text-xs font-black hover:bg-[#0f766e] transition-all shadow-md shadow-[#0d9488]/20 disabled:opacity-50"
                                >
                                  {checkinSubmitting ? 'Checking In...' : 'Check In'}
                                </button>
                                <button
                                  onClick={() => handleDeletePatient(p.id)}
                                  className="p-2.5 rounded-xl bg-[#fff1f2] text-[#e11d48] hover:bg-[#e11d48] hover:text-white transition-all border border-[#ffe4e6]"
                                  title="Delete patient record"
                                >
                                  <Trash2 className="h-5 w-5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Pagination control */}
                  <div className="flex items-center justify-between mt-10 pt-8 border-t border-[#f1f5f9]">
                    <span className="text-xs text-[#64748b] font-black uppercase tracking-widest">
                      Displaying Page {patientsPagination.page} of {patientsPagination.totalPages}
                    </span>
                    <div className="flex gap-3">
                      <button
                        disabled={patientsPagination.page <= 1}
                        onClick={() => fetchPatients(patientsPagination.page - 1)}
                        className="px-6 py-3 rounded-2xl border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] disabled:opacity-30 text-xs font-black transition-all active:scale-95"
                      >
                        Previous
                      </button>
                      <button
                        disabled={patientsPagination.page >= patientsPagination.totalPages}
                        onClick={() => fetchPatients(patientsPagination.page + 1)}
                        className="px-6 py-3 rounded-2xl border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] disabled:opacity-30 text-xs font-black transition-all active:scale-95"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Registration Form */}
              <div className="bg-[#ffffff] p-8 rounded-4xl shadow-sm border border-slate-200 h-fit">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-8">
                  <UserPlus className="h-6 w-6 text-teal-600" />
                  New Entry
                </h3>

                {regMessage && (
                  <div className={`p-5 text-sm font-black rounded-2xl mb-8 border ${regMessage.startsWith('Success') ? 'bg-[#f0fdf4] text-[#166534] border-[#dcfce7]' : 'bg-[#fff1f2] text-[#9f1239] border-[#ffe4e6]'}`}>
                    {regMessage}
                  </div>
                )}

                <form onSubmit={handleRegisterPatient} className="space-y-6 text-sm font-bold text-[#475569]">
                  <div>
                    <label className="block mb-2 text-[#64748b] uppercase tracking-widest text-[10px] px-1 font-black">Patient Full Name*</label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Bruce Wayne"
                      className="block w-full px-5 py-4 border border-[#e2e8f0] bg-[#f8fafc] rounded-2xl text-[#0f172a] font-medium focus:ring-4 focus:ring-[#0d9488]/10 focus:border-[#0d9488] focus:bg-[#ffffff] transition-all outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 text-[#64748b] uppercase tracking-widest text-[10px] px-1 font-black">Age (Years)*</label>
                      <input
                        type="number"
                        required
                        value={regAge}
                        onChange={(e) => setRegAge(e.target.value)}
                        placeholder="35"
                        className="block w-full px-5 py-4 border border-[#e2e8f0] bg-[#f8fafc] rounded-2xl text-[#0f172a] font-medium focus:ring-4 focus:ring-[#0d9488]/10 focus:border-[#0d9488] focus:bg-[#ffffff] transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 text-[#64748b] uppercase tracking-widest text-[10px] px-1 font-black">Gender*</label>
                      <select
                        value={regGender}
                        onChange={(e) => setRegGender(e.target.value)}
                        className="block w-full px-5 py-4 border border-[#e2e8f0] bg-[#f8fafc] rounded-2xl text-[#0f172a] font-black focus:ring-4 focus:ring-[#0d9488]/10 focus:border-[#0d9488] focus:bg-[#ffffff] transition-all outline-none"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block mb-2 text-[#64748b] uppercase tracking-widest text-[10px] px-1 font-black">Contact Phone*</label>
                    <input
                      type="text"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="555-0199"
                      className="block w-full px-5 py-4 border border-[#e2e8f0] bg-[#f8fafc] rounded-2xl text-[#0f172a] font-medium focus:ring-4 focus:ring-[#0d9488]/10 focus:border-[#0d9488] focus:bg-[#ffffff] transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-[#64748b] uppercase tracking-widest text-[10px] px-1 font-black">Email Address</label>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="bruce@wayne.com"
                      className="block w-full px-5 py-4 border border-[#e2e8f0] bg-[#f8fafc] rounded-2xl text-[#0f172a] font-medium focus:ring-4 focus:ring-[#0d9488]/10 focus:border-[#0d9488] focus:bg-[#ffffff] transition-all outline-none"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-[#64748b] uppercase tracking-widest text-[10px] px-1 font-black">Clinical History</label>
                    <textarea
                      value={regHistory}
                      onChange={(e) => setRegHistory(e.target.value)}
                      placeholder="Any pre-existing conditions..."
                      rows="3"
                      className="block w-full px-5 py-4 border border-[#e2e8f0] bg-[#f8fafc] rounded-2xl text-[#0f172a] font-medium focus:ring-4 focus:ring-[#0d9488]/10 focus:border-[#0d9488] focus:bg-[#ffffff] transition-all outline-none resize-none"
                    ></textarea>
                  </div>

                  <button
                    type="submit"
                    disabled={regSubmitting}
                    className="w-full py-5 bg-[#0d9488] hover:bg-[#0f766e] text-white font-black rounded-2xl shadow-xl shadow-[#0d9488]/20 transition-all active:scale-95 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {regSubmitting ? 'Registering...' : 'Register Patient Record'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB: SCHEDULING / BOOKING & CHECKIN (RECEPTIONIST & ADMIN)
            ============================================================== */}
        {activeTab === 'book' && (
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Book Appointment Card */}
            <div className="bg-[#ffffff] p-8 rounded-4xl shadow-md border border-[#e2e8f0]">
              <h3 className="text-2xl font-black text-[#0f172a] flex items-center gap-3 mb-8">
                <CalendarDays className="h-7 w-7 text-[#0d9488]" />
                Schedule Slot
              </h3>

              {bookingMessage && (
                <div className={`p-5 text-sm font-black rounded-2xl mb-8 border ${bookingMessage.startsWith('Success') ? 'bg-[#f0fdf4] text-[#166534] border-[#dcfce7]' : 'bg-[#fff1f2] text-[#9f1239] border-[#ffe4e6]'}`}>
                  {bookingMessage}
                </div>
              )}

              <form onSubmit={handleBookAppointment} className="space-y-6 text-sm font-bold text-[#475569]">
                <div>
                  <label className="block mb-2 text-[#64748b] uppercase tracking-widest text-[10px] px-1 font-black">Select Patient*</label>
                  <select
                    required
                    value={bookingPatientId}
                    onChange={(e) => setBookingPatientId(e.target.value)}
                    className="block w-full px-5 py-4 border border-[#e2e8f0] bg-[#f8fafc] rounded-2xl text-[#0f172a] font-black focus:ring-4 focus:ring-[#0d9488]/10 focus:border-[#0d9488] focus:bg-[#ffffff] transition-all outline-none"
                  >
                    <option value="">-- Choose Patient --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.phoneNumber})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-[#64748b] uppercase tracking-widest text-[10px] px-1 font-black">Assign Physician*</label>
                  <select
                    required
                    value={bookingDoctorId}
                    onChange={(e) => setBookingDoctorId(e.target.value)}
                    className="block w-full px-5 py-4 border border-[#e2e8f0] bg-[#f8fafc] rounded-2xl text-[#0f172a] font-black focus:ring-4 focus:ring-[#0d9488]/10 focus:border-[#0d9488] focus:bg-[#ffffff] transition-all outline-none"
                  >
                    <option value="">-- Choose Physician --</option>
                    {doctorsList.map(d => (
                      <option key={d.id} value={d.id}>{d.name} - {d.specialization} (${d.consultationFee})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block mb-2 text-[#64748b] uppercase tracking-widest text-[10px] px-1 font-black">Date & Time*</label>
                  <input
                    type="datetime-local"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className="block w-full px-5 py-4 border border-[#e2e8f0] bg-[#f8fafc] rounded-2xl text-[#0f172a] font-medium focus:ring-4 focus:ring-[#0d9488]/10 focus:border-[#0d9488] focus:bg-[#ffffff] transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="block mb-2 text-[#64748b] uppercase tracking-widest text-[10px] px-1 font-black">Reason for Visit</label>
                  <input
                    type="text"
                    value={bookingReason}
                    onChange={(e) => setBookingReason(e.target.value)}
                    placeholder="e.g. Regular diagnostic review"
                    className="block w-full px-5 py-4 border border-[#e2e8f0] bg-[#f8fafc] rounded-2xl text-[#0f172a] font-medium focus:ring-4 focus:ring-[#0d9488]/10 focus:border-[#0d9488] focus:bg-[#ffffff] transition-all outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={bookingSubmitting}
                  className="w-full py-5 bg-[#0d9488] hover:bg-[#0f766e] text-white font-black rounded-2xl shadow-xl shadow-[#0d9488]/20 transition-all active:scale-95 mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {bookingSubmitting ? 'Booking...' : 'Book Appointment Slot'}
                </button>
              </form>
            </div>

            {/* Quick Walkin Checkin Token Board */}
            <div className="bg-[#ffffff] p-8 rounded-4xl shadow-md border border-[#e2e8f0]">
              <h3 className="text-2xl font-black text-[#0f172a] flex items-center gap-3 mb-8">
                <Activity className="h-7 w-7 text-[#0d9488]" />
                Live Check-In
              </h3>
              
              <div className="space-y-8">
                <div className="p-6 rounded-2xl border border-[#dcfce7] bg-[#f0fdf4] text-[#166534] text-sm leading-relaxed font-bold">
                  <strong>Atomic Token Generation:</strong> Generates a sequential waiting number for the selected practitioner.
                </div>

                <div className="space-y-6 text-sm font-black text-[#64748b]">
                  <div>
                    <label className="block mb-2 uppercase tracking-widest text-[10px] px-1">Select Patient*</label>
                    <select
                      value={walkinPatientId}
                      onChange={(e) => setWalkinPatientId(e.target.value)}
                      className="block w-full px-5 py-4 border border-[#e2e8f0] bg-[#f8fafc] rounded-2xl text-[#0f172a] font-black focus:ring-4 focus:ring-[#0d9488]/10 focus:bg-[#ffffff] transition-all outline-none"
                    >
                      <option value="">-- Choose Patient --</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 uppercase tracking-widest text-[10px] px-1">Assign Doctor*</label>
                    <select
                      value={walkinDoctorId}
                      onChange={(e) => setWalkinDoctorId(e.target.value)}
                      className="block w-full px-5 py-4 border border-[#e2e8f0] bg-[#f8fafc] rounded-2xl text-[#0f172a] font-black focus:ring-4 focus:ring-[#0d9488]/10 focus:bg-[#ffffff] transition-all outline-none"
                    >
                      <option value="">-- Choose Physician --</option>
                      {doctorsList.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.specialization})</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      if (!walkinPatientId || !walkinDoctorId) {
                        alert('Select patient and doctor first');
                        return;
                      }
                      handleQueueCheckin(walkinPatientId, walkinDoctorId);
                    }}
                    className="w-full py-5 bg-[#0f172a] hover:bg-[#000000] text-white font-black rounded-2xl shadow-xl transition-all active:scale-95 mt-4"
                  >
                    Generate Live Token
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB: DOCTOR WORKLIST - APPOINTMENTS (DOCTOR ROLE)
            ============================================================== */}
        {activeTab === 'appointments' && (
          <div className="space-y-8">
            <div className="bg-[#ffffff] p-8 rounded-4xl shadow-md border border-[#e2e8f0]">
              <h3 className="text-2xl font-black text-[#0f172a] flex items-center gap-3 mb-8">
                <CalendarDays className="h-7 w-7 text-[#0d9488]" />
                Today Schedule
              </h3>

              {doctorLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="pulse-loader"><div></div><div></div></div>
                </div>
              ) : doctorAppointments.length === 0 ? (
                <div className="text-center py-20 bg-[#f8fafc] rounded-3xl border-2 border-dashed border-[#e2e8f0]">
                  <p className="text-[#94a3b8] font-bold">No appointments scheduled for you today.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm text-left">
                    <thead>
                      <tr className="text-[#64748b] uppercase tracking-widest text-[10px] font-black border-b-2 border-[#f1f5f9]">
                        <th className="pb-5 px-4 bg-[#f8fafc] rounded-tl-xl">Time</th>
                        <th className="pb-5 px-4 bg-[#f8fafc]">Patient Info</th>
                        <th className="pb-5 px-4 bg-[#f8fafc]">Reason</th>
                        <th className="pb-5 px-4 bg-[#f8fafc]">Status</th>
                        <th className="pb-5 px-4 bg-[#f8fafc] text-right rounded-tr-xl">Management</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f1f5f9]">
                      {doctorAppointments.map((app) => (
                        <tr key={app.id} className="group hover:bg-[#f0fdfa] transition-all">
                          <td className="py-5 px-4 font-black text-[#0d9488] text-base tabular-nums">
                            {new Date(app.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-5 px-4">
                            <button
                              onClick={() => setSelectedPatientHistory(app.patient)}
                              className="font-black text-[#0f172a] text-base hover:text-[#0d9488] transition-colors"
                            >
                              {app.patient ? app.patient.name : 'Unknown Patient'}
                            </button>
                            <span className="block text-xs text-[#64748b] font-medium">Age: {app.patient?.age}</span>
                          </td>
                          <td className="py-5 px-4 text-[#475569] font-bold">{app.reason || 'Not specified'}</td>
                          <td className="py-5 px-4">
                            <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${app.status === 'COMPLETED' ? 'bg-[#f0fdf4] text-[#166534] border-[#dcfce7]' : app.status === 'CANCELLED' ? 'bg-[#fff1f2] text-[#9f1239] border-[#ffe4e6]' : 'bg-[#fffbeb] text-[#92400e] border-[#fef3c7]'}`}>
                              {app.status}
                            </span>
                          </td>
                          <td className="py-5 px-4 text-right space-x-2">
                            {app.status === 'PENDING' && (
                              <>
                                <button
                                  disabled={checkinSubmitting}
                                  onClick={() => {
                                    const matchedDoc = doctorsList.find(d => d.userId === user.id);
                                    handleQueueCheckin(app.patientId, matchedDoc.id, app.id);
                                  }}
                                  className="px-4 py-2 rounded-xl bg-[#0d9488] text-white text-xs font-black hover:bg-[#0f766e] transition-all disabled:opacity-50"
                                >
                                  {checkinSubmitting ? 'Checking In...' : 'Check In'}
                                </button>
                                <button
                                  disabled={queueActionLoading}
                                  onClick={() => handleCompleteAppointment(app.id)}
                                  className="px-4 py-2 rounded-xl bg-[#f1f5f9] text-[#475569] text-xs font-black hover:bg-[#e2e8f0] transition-all disabled:opacity-50"
                                >
                                  {queueActionLoading ? 'Completing...' : 'Complete'}
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB: DOCTOR ACTIVE CALLING QUEUE (DOCTOR ROLE)
            ============================================================== */}
        {activeTab === 'queue' && (
          <div className="bg-[#ffffff] p-8 rounded-4xl shadow-md border border-[#e2e8f0]">
            <h3 className="text-2xl font-black text-[#0f172a] flex items-center gap-3 mb-4">
              <Clock className="h-7 w-7 text-[#0d9488]" />
              Live Operations Queue
            </h3>
            <p className="text-sm text-[#64748b] font-bold mb-10">
              Manage the real-time patient sequence for the public monitors.
            </p>

            {doctorLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="pulse-loader"><div></div><div></div></div>
              </div>
            ) : doctorQueue.length === 0 ? (
              <div className="text-center py-20 bg-[#f8fafc] rounded-3xl border-2 border-dashed border-[#e2e8f0]">
                <p className="text-[#94a3b8] font-bold">No patients currently in your queue.</p>
              </div>
            ) : (
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {doctorQueue.map((t) => (
                  <div
                    key={t.id}
                    className={`p-8 rounded-4xl border transition-all flex flex-col justify-between ${t.status === 'CALLING' ? 'border-[#0d9488] bg-[#f0fdfa] ring-4 ring-[#0d9488]/5 shadow-xl' : 'border-[#e2e8f0] bg-[#ffffff] shadow-md'}`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="text-5xl font-black text-[#0f172a] tracking-tighter">#{t.tokenNumber}</span>
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase ${t.status === 'CALLING' ? 'bg-[#0d9488] text-white' : t.status === 'COMPLETED' ? 'bg-[#f0fdf4] text-[#166534]' : 'bg-[#fffbeb] text-[#92400e]'}`}>
                        {t.status}
                      </span>
                    </div>

                    <div className="mt-8">
                      <h4 className="text-xl font-black text-[#0f172a]">{t.patient.name}</h4>
                      <p className="text-xs text-[#64748b] mt-1 font-bold">Mobile: {t.patient.phoneNumber}</p>
                    </div>

                    <div className="mt-10 flex gap-3">
                      {t.status === 'WAITING' && (
                        <button
                          disabled={queueActionLoading}
                          onClick={() => handleUpdateQueueStatus(t.id, 'CALLING')}
                          className="flex-1 py-4 bg-[#0d9488] text-white font-black text-sm rounded-2xl hover:bg-[#0f766e] transition-all shadow-lg shadow-[#0d9488]/20 disabled:opacity-50"
                        >
                          {queueActionLoading ? 'Calling...' : 'Begin Call'}
                        </button>
                      )}
                      {t.status === 'CALLING' && (
                        <>
                          <button
                            disabled={queueActionLoading}
                            onClick={() => handleUpdateQueueStatus(t.id, 'COMPLETED')}
                            className="flex-1 py-4 bg-[#0d9488] text-white font-black text-sm rounded-2xl hover:bg-[#0f766e] transition-all shadow-lg shadow-[#0d9488]/20 disabled:opacity-50"
                          >
                            {queueActionLoading ? 'Finishing...' : 'Finished'}
                          </button>
                          <button
                            disabled={queueActionLoading}
                            onClick={() => handleUpdateQueueStatus(t.id, 'SKIPPED')}
                            className="flex-1 py-4 bg-[#fff1f2] text-[#e11d48] font-black text-sm rounded-2xl hover:bg-[#ffe4e6] transition-all border border-[#ffe4e6] disabled:opacity-50"
                          >
                            {queueActionLoading ? 'Skipping...' : 'Skip'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==============================================================
            TAB: SYSTEM REPORTS (ADMIN ROLE)
            ============================================================== */}
        {activeTab === 'reports' && (
          <div className="space-y-8">
            <div className="bg-[#ffffff] p-8 rounded-4xl shadow-md border border-[#e2e8f0]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-12">
                <div>
                  <h3 className="text-2xl font-black text-[#0f172a] flex items-center gap-3">
                    <TrendingUp className="h-7 w-7 text-[#0d9488]" />
                    Hospital Audit Stats
                  </h3>
                  <p className="text-sm text-[#64748b] font-bold mt-1">
                    Financial and operational performance metrics across all physicians.
                  </p>
                </div>
                <button
                  onClick={generateSystemReport}
                  disabled={adminReportLoading}
                  className="w-full sm:w-auto px-8 py-4 bg-[#0d9488] text-white font-black text-sm rounded-2xl shadow-xl shadow-[#0d9488]/20 hover:bg-[#0f766e] disabled:opacity-50 transition-all active:scale-95"
                >
                  {adminReportLoading ? 'Computing Metrics...' : 'Generate System Audit'}
                </button>
              </div>

              {adminReportLoading ? (
                <div className="flex flex-col items-center justify-center py-32">
                   <div className="pulse-loader mb-8"><div></div></div>
                  <p className="text-sm font-black text-[#94a3b8] uppercase tracking-widest animate-pulse">Aggregating Large Data Arrays...</p>
                </div>
              ) : !adminReportData ? (
                <div className="p-20 text-center bg-[#f8fafc] rounded-3xl text-[#94a3b8] font-black uppercase tracking-widest border-2 border-dashed border-[#e2e8f0]">
                  Ready to load real-time system performance reports.
                </div>
              ) : (
                <div className="space-y-12">
                  {/* Summary widgets */}
                  <div className="grid gap-8 sm:grid-cols-3">
                    <div className="p-8 bg-[#ffffff] border border-[#f1f5f9] rounded-4xl shadow-sm">
                      <span className="text-[10px] uppercase tracking-widest text-[#94a3b8] font-black">Active Doctors</span>
                      <h4 className="text-5xl font-black text-[#0f172a] mt-3 tracking-tighter">{adminReportData.doctors.length}</h4>
                    </div>
                    <div className="p-8 bg-[#ffffff] border border-[#f1f5f9] rounded-4xl shadow-sm">
                      <span className="text-[10px] uppercase tracking-widest text-[#94a3b8] font-black">Total Bookings</span>
                      <h4 className="text-5xl font-black text-[#0f172a] mt-3 tracking-tighter">
                        {adminReportData.doctors.reduce((sum, item) => sum + item.totalAppointments, 0)}
                      </h4>
                    </div>
                    <div className="p-8 bg-[#f0fdfa] border border-[#ccfbf1] rounded-4xl shadow-sm">
                      <span className="text-[10px] uppercase tracking-widest text-[#0d9488] font-black">Gross Revenue</span>
                      <h4 className="text-5xl font-black text-[#0d9488] mt-3 tracking-tighter">
                        ${adminReportData.doctors.reduce((sum, item) => sum + item.revenue, 0)}
                      </h4>
                    </div>
                  </div>

                  {/* Table representation */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                      <thead>
                        <tr className="text-[#64748b] uppercase tracking-widest text-[10px] font-black border-b-2 border-[#f1f5f9]">
                          <th className="pb-5 px-4 bg-[#f8fafc] rounded-tl-xl">Physician</th>
                          <th className="pb-5 px-4 bg-[#f8fafc]">Department</th>
                          <th className="pb-5 px-4 bg-[#f8fafc] text-center">Consultations</th>
                          <th className="pb-5 px-4 bg-[#f8fafc] text-center">Live Queue</th>
                          <th className="pb-5 px-4 bg-[#f8fafc] text-right rounded-tr-xl">Total Sales</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f1f5f9]">
                        {adminReportData.doctors.map((item) => (
                          <tr key={item.id} className="group hover:bg-[#f0fdfa] transition-all">
                            <td className="py-6 px-4">
                              <span className="font-black text-[#0f172a] text-base block">{item.name}</span>
                              <span className="text-xs text-[#0d9488] font-black uppercase tracking-widest">{item.specialization}</span>
                            </td>
                            <td className="py-6 px-4 text-[#475569] font-black">{item.department}</td>
                            <td className="py-6 px-4 text-center text-[#475569] font-bold">
                              {item.completedAppointments} <span className="text-[#cbd5e1] mx-1">/</span> {item.totalAppointments}
                            </td>
                            <td className="py-6 px-4 text-center">
                               <span className="px-4 py-1.5 rounded-full bg-[#f1f5f9] text-[#475569] text-[10px] font-black uppercase tracking-widest border border-[#e2e8f0]">
                                 {item.todayQueueSize} active
                               </span>
                            </td>
                            <td className="py-6 px-4 text-right font-black text-[#0d9488] text-xl tabular-nums">${item.revenue}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==============================================================
            TAB: PHYSICIAN REGISTRY (ADMIN ROLE - SQL INJECTION VULNERABILITY)
            ============================================================== */}
        {activeTab === 'physicians' && (
          <div className="bg-[#ffffff] p-8 rounded-4xl shadow-md border border-[#e2e8f0] space-y-10">
            <div>
              <h3 className="text-2xl font-black text-[#0f172a] flex items-center gap-3">
                <Award className="h-7 w-7 text-[#0d9488]" />
                Physician Credential Registry
              </h3>
              <p className="text-sm text-[#64748b] font-bold mt-1">
                Lookup certified hospital staff via database query interface.
              </p>
            </div>

            <div className="flex gap-4">
              <div className="relative flex-1 group">
                <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-[#94a3b8]">
                  <Search className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                  placeholder="Enter physician name..."
                  className="block w-full pl-14 pr-4 py-4 border border-[#e2e8f0] bg-[#f8fafc] rounded-2xl text-[#0f172a] font-medium focus:ring-4 focus:ring-[#0d9488]/10 focus:border-[#0d9488] focus:bg-[#ffffff] transition-all outline-none"
                />
              </div>

              <button
                onClick={searchPhysiciansAdmin}
                className="px-10 py-2 bg-[#0f172a] text-white font-black text-sm rounded-2xl hover:bg-[#000000] transition-all active:scale-95 shadow-xl shadow-[#0f172a]/10"
              >
                Search Registry
              </button>
            </div>

            <div className="p-5 bg-[#f0fdf4] text-[#166534] text-xs rounded-2xl border border-[#dcfce7] font-bold leading-6 flex gap-4">
              <ShieldAlert className="h-6 w-6 shrink-0" />
              <div>
                <strong>Security Implementation:</strong> Raw SQL interpolation has been fully replaced with parameterized Prisma queries to mitigate injection risks.
              </div>
            </div>

            {/* Doctors Result List */}
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {(doctorSearchResults.length > 0 ? doctorSearchResults : doctorsList).map((doc) => (
                <div
                  key={doc.id}
                  className="p-8 rounded-4xl border border-[#e2e8f0] bg-[#ffffff] shadow-sm hover:shadow-xl transition-all flex flex-col justify-between group hover:border-[#0d9488]/30"
                >
                  <div>
                    <span className="inline-flex px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-[#f0fdfa] text-[#0d9488] border border-[#ccfbf1] mb-5">
                      {doc.department}
                    </span>
                    <h4 className="text-xl font-black text-[#0f172a] group-hover:text-[#0d9488] transition-colors">{doc.name}</h4>
                    <p className="text-sm text-[#64748b] font-bold mt-1">{doc.specialization}</p>
                  </div>
                  <div className="mt-8 pt-6 border-t border-[#f1f5f9] flex justify-between items-center text-xs font-black text-[#94a3b8]">
                    <span className="uppercase tracking-widest">{doc.experience} Years Experience</span>
                    <span className="text-[#0d9488] text-lg tabular-nums">${doc.consultationFee}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Patient Detail Modal */}
        {selectedPatientHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-lg w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-xl font-extrabold text-gray-900">{selectedPatientHistory.name}</h3>
                <button
                  onClick={() => setSelectedPatientHistory(null)}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Age</p>
                    <p className="text-sm font-bold text-gray-700">{selectedPatientHistory.age}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Gender</p>
                    <p className="text-sm font-bold text-gray-700 capitalize">{selectedPatientHistory.gender}</p>
                  </div>
                  {selectedPatientHistory.email && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Email</p>
                      <p className="text-sm font-bold text-gray-700">{selectedPatientHistory.email}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Medical History</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 border border-gray-100">
                    {selectedPatientHistory.medicalHistory?.toUpperCase() || 'No history recorded'}
                  </p>
                </div>

                <Link
                  href={`/patients/${selectedPatientHistory.id}/history-records`}
                  className="block w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm rounded-xl text-center transition-all shadow-md"
                >
                  View Diagnostic Reports Details (Legacy App)
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
