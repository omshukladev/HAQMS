'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Activity, ArrowLeft, Calendar, Clock, User, Phone, Mail, AlertCircle } from 'lucide-react';

export default function PatientHistoryRecords() {
  const { fetchWithAuth } = useAuth();
  const params = useParams();
  const patientId = params.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patient, setPatient] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!patientId) return;
    const loadPatient = async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth(`/patients/${patientId}`);
        const data = await res.json();
        if (data.status === 'success') {
          setPatient(data.data.patient);
        } else {
          setError(data.error || 'Failed to load patient data');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadPatient();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="pulse-loader"><div></div><div></div></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      {/* Top Navigation Bar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 px-6 py-3 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-teal-600 font-extrabold text-xl">
            <Activity className="h-6 w-6" />
            HAQMS
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto p-6 sm:p-8">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="pulse-loader"><div></div><div></div></div>
            <p className="mt-4 text-sm font-semibold text-gray-400">Loading patient records...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center gap-3">
            <AlertCircle className="h-6 w-6 shrink-0" />
            <div>
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Patient Data */}
        {patient && !loading && (
          <>
            {/* Patient Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900">{patient.name}</h1>
                  <p className="text-teal-600 font-bold text-sm mt-1">Patient History Records</p>
                </div>
                <span className="inline-flex px-3 py-1 rounded-full bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200">
                  ID: {patient.id?.slice(0, 8)}...
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-8">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Email</p>
                    <p className="text-sm font-bold text-gray-700">{patient.email || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Phone</p>
                    <p className="text-sm font-bold text-gray-700">{patient.phoneNumber}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Age / Gender</p>
                    <p className="text-sm font-bold text-gray-700">{patient.age} / {patient.gender}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Registered</p>
                    <p className="text-sm font-bold text-gray-700">
                      {new Date(patient.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Medical History Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
              <h2 className="text-lg font-extrabold text-gray-900 mb-4">Medical History</h2>
              <p className="text-gray-700 leading-relaxed">
                {patient.medicalHistory || 'No medical history recorded.'}
              </p>
            </div>

            {/* Appointments History */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h2 className="text-lg font-extrabold text-gray-900 mb-4">Appointment History</h2>
              {patient.appointments && patient.appointments.length > 0 ? (
                <div className="space-y-4">
                  {patient.appointments.map((app) => (
                    <div
                      key={app.id}
                      className="p-5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-teal-600" />
                          <div>
                            <p className="font-bold text-gray-900">
                              {new Date(app.appointmentDate).toLocaleDateString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                              {' '}
                              {new Date(app.appointmentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-sm text-gray-500">Dr. {app.doctor?.name} — {app.doctor?.specialization}</p>
                          </div>
                        </div>
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            app.status === 'COMPLETED'
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : app.status === 'CANCELLED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>
                      {app.reason && (
                        <p className="mt-2 text-sm text-gray-600 ml-8">
                          <span className="font-semibold">Reason:</span> {app.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Calendar className="h-12 w-12 mx-auto mb-3" />
                  <p className="font-bold">No appointment history found for this patient.</p>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
