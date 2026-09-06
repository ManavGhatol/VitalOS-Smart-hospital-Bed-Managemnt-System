import React, { useState, useEffect } from 'react';
import { Activity, Clock, Shield, Stethoscope, LogOut, Bed as BedIcon } from 'lucide-react';
import type { UserRole, DoctorUser } from '../types';

interface NavbarProps {
  currentRole: UserRole | null;
  activeDoctor: DoctorUser | null;
  onNavigateHome: () => void;
  onSelectRole: (role: UserRole) => void;
  onOpenBedBoard: () => void;
  onLogoutDoctor: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  activeDoctor,
  onNavigateHome,
  onSelectRole,
  onOpenBedBoard,
  onLogoutDoctor,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 lg:px-8 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand & Tagline */}
        <div
          id="navbar-brand-container"
          onClick={onNavigateHome}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-slate-900 font-sans">
                Vitalis <span className="text-blue-600">OS</span>
              </span>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Hospital OS
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Smart Hospital Resource Management</p>
          </div>
        </div>

        {/* Live Status & Controls */}
        <div className="flex items-center gap-3 md:gap-6">
          {/* Live Clock & Connection indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/80 border border-slate-200/60 text-xs font-medium text-slate-600">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-700 font-semibold">Live System</span>
            <span className="text-slate-300">|</span>
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="tabular-nums font-mono">{currentTime || '12:00:00'}</span>
          </div>

          {/* Quick Bed Board Button */}
          <button
            id="nav-quick-bed-board"
            onClick={onOpenBedBoard}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <BedIcon className="w-4 h-4 text-blue-400" />
            <span>Live Bed Matrix</span>
          </button>

          {/* Active Role Indicator or Navigation */}
          {currentRole === 'doctor' && activeDoctor ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-800">{activeDoctor.name}</span>
                <span className="text-[11px] text-blue-600 font-medium">{activeDoctor.department}</span>
              </div>
              <button
                id="nav-doctor-logout-btn"
                onClick={onLogoutDoctor}
                title="Log Out Physician"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 text-xs font-semibold border border-slate-200 hover:border-red-200 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : currentRole === 'admin' ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200">
                <Shield className="w-3.5 h-3.5 text-purple-600" />
                Admin Active
              </span>
              <button
                onClick={onNavigateHome}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline underline-offset-4 cursor-pointer"
              >
                Exit
              </button>
            </div>
          ) : currentRole === 'patient' ? (
            <button
              onClick={onNavigateHome}
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Return Home
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="nav-role-doctor"
                onClick={() => onSelectRole('doctor')}
                className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <Stethoscope className="w-3.5 h-3.5" />
                Doctor
              </button>
              <button
                id="nav-role-admin"
                onClick={() => onSelectRole('admin')}
                className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-md text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
