import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { DoctorAuth } from './components/DoctorAuth';
import { DoctorDashboard } from './components/DoctorDashboard';
import { PatientTriageChat } from './components/PatientTriageChat';
import { AdminDashboard } from './components/AdminDashboard';
import { BedManagementDashboard } from './components/BedManagementDashboard';
import { fetchDashboardMetrics, subscribeToLiveEvents } from './services/api';
import type { UserRole, DoctorUser, DashboardMetrics } from './types';

export default function App() {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [activeDoctor, setActiveDoctor] = useState<DoctorUser | null>(null);
  const [showBedBoard, setShowBedBoard] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [liveToast, setLiveToast] = useState<{ title: string; message: string } | null>(null);

  // Load facility metrics
  const loadMetrics = async () => {
    try {
      const data = await fetchDashboardMetrics();
      setMetrics(data);
    } catch (err) {
      console.warn('Failed to load metrics initially:', err);
    }
  };

  useEffect(() => {
    loadMetrics();

    // Subscribe to real-time events via SSE
    const unsubscribe = subscribeToLiveEvents((event) => {
      if (event.type === 'patient_triaged') {
        setLiveToast({
          title: 'Incoming Patient Triage',
          message: `${event.data?.patient?.name} triaged as ${event.data?.patient?.triageLevel}.`,
        });
        loadMetrics();
      } else if (event.type === 'emergency_override') {
        setLiveToast({
          title: 'Emergency Override Triggered',
          message: event.data?.message || 'Bed reallocated immediately by attending physician.',
        });
        loadMetrics();
      } else if (event.type === 'bed_updated') {
        loadMetrics();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Clear live toast after 5s
  useEffect(() => {
    if (liveToast) {
      const t = setTimeout(() => setLiveToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [liveToast]);

  // Role navigation handlers
  const handleSelectRole = (role: UserRole) => {
    setShowBedBoard(false);
    setCurrentRole(role);
  };

  const handleNavigateHome = () => {
    setShowBedBoard(false);
    setCurrentRole(null);
  };

  const handleDoctorLoginSuccess = (doctor: DoctorUser) => {
    setActiveDoctor(doctor);
    setCurrentRole('doctor');
  };

  const handleDoctorLogout = () => {
    setActiveDoctor(null);
    setCurrentRole(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white flex flex-col">
      {/* Global Navbar */}
      <Navbar
        currentRole={currentRole}
        activeDoctor={activeDoctor}
        onNavigateHome={handleNavigateHome}
        onSelectRole={handleSelectRole}
        onOpenBedBoard={() => setShowBedBoard(true)}
        onLogoutDoctor={handleDoctorLogout}
      />

      {/* Global Live SSE Alert Toast */}
      {liveToast && (
        <div
          id="global-live-sse-toast"
          className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <h4 className="text-xs font-black uppercase tracking-wider text-blue-400">
              {liveToast.title}
            </h4>
          </div>
          <p className="text-xs text-slate-300 leading-snug">{liveToast.message}</p>
        </div>
      )}

      {/* Dynamic View Router */}
      <div className="flex-1">
        {showBedBoard ? (
          <BedManagementDashboard
            metrics={metrics}
            onBack={() => setShowBedBoard(false)}
            onEmergencyOverrideClick={
              activeDoctor
                ? () => {
                    setShowBedBoard(false);
                    setCurrentRole('doctor');
                  }
                : undefined
            }
          />
        ) : currentRole === 'doctor' ? (
          activeDoctor ? (
            <DoctorDashboard
              doctor={activeDoctor}
              onLogout={handleDoctorLogout}
              onOpenLiveBedBoard={() => setShowBedBoard(true)}
            />
          ) : (
            <DoctorAuth
              onSuccess={handleDoctorLoginSuccess}
              onNavigateHome={handleNavigateHome}
            />
          )
        ) : currentRole === 'patient' ? (
          <PatientTriageChat onNavigateHome={handleNavigateHome} />
        ) : currentRole === 'admin' ? (
          <AdminDashboard
            onLogout={handleNavigateHome}
            onOpenBedBoard={() => setShowBedBoard(true)}
          />
        ) : (
          <LandingPage
            onSelectRole={handleSelectRole}
            onOpenBedBoard={() => setShowBedBoard(true)}
            metrics={metrics}
          />
        )}
      </div>
    </div>
  );
}
