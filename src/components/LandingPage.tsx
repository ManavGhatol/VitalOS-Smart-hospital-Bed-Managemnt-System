import React from 'react';
import { Stethoscope, MessageSquareHeart, ShieldCheck, ArrowRight, Zap, Bed, Activity, HeartHandshake } from 'lucide-react';
import type { UserRole, DashboardMetrics } from '../types';
import { VitalisBotAvatar } from './VitalisBotAvatar';

interface LandingPageProps {
  onSelectRole: (role: UserRole) => void;
  onOpenBedBoard: () => void;
  metrics: DashboardMetrics | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSelectRole,
  onOpenBedBoard,
  metrics,
}) => {
  return (
    <div className="min-h-[calc(100vh-65px)] flex flex-col justify-between">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 w-full">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-6 shadow-xs">
            <Zap className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>Next-Gen Clinical Resource Orchestration</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-5 leading-tight">
            Welcome to <span className="text-blue-600">Vitalis OS</span>
            <br />
            <span className="text-slate-800 text-2xl sm:text-3xl lg:text-4xl font-bold">
              Intelligent Healthcare Management
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            A unified clinical operating system streamlining patient intake, physician workflows,
            and critical hospital bed allocations with real-time AI triage and dynamic emergency reallocation.
          </p>

          {/* Workflow Value Prop Pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-medium text-slate-700">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Activity className="w-4 h-4 text-emerald-600" />
              Instant AI Triage
            </span>
            <span className="text-slate-400 font-bold">→</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
              <HeartHandshake className="w-4 h-4 text-blue-600" />
              Automated Doctor Assignment
            </span>
            <span className="text-slate-400 font-bold">→</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-800 border border-red-200">
              <Zap className="w-4 h-4 text-red-600" />
              Dynamic Emergency Bed Override
            </span>
          </div>
        </div>

        {/* Role Selection Cards (Main Focus) */}
        <section aria-labelledby="role-selection-heading" className="mb-16">
          <h2 id="role-selection-heading" className="sr-only">
            Select Your Portal Role
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
            {/* Card 1: Doctor */}
            <div
              id="role-card-doctor"
              onClick={() => onSelectRole('doctor')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectRole('doctor')}
              className="group relative bg-white rounded-2xl border-2 border-blue-100 hover:border-blue-500 p-8 flex flex-col justify-between h-[320px] transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer text-left focus:outline-hidden focus:ring-4 focus:ring-blue-500/20"
            >
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white shadow-sm">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>

              <div>
                <div className="w-20 h-20 rounded-2xl bg-blue-50 group-hover:bg-blue-600 text-blue-600 group-hover:text-white flex items-center justify-center mb-6 transition-colors shadow-xs">
                  <Stethoscope className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Doctor
                </h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-3">
                  Access patient records, manage bed allocation, and provide instant emergency response and clinical overrides.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                <span>Physician & Clinical Portal</span>
                <span className="group-hover:translate-x-1 transition-transform">Sign in &rarr;</span>
              </div>
            </div>

            {/* Card 2: Patient */}
            <div
              id="role-card-patient"
              onClick={() => onSelectRole('patient')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectRole('patient')}
              className="group relative bg-white rounded-2xl border-2 border-emerald-100 hover:border-emerald-500 p-8 flex flex-col justify-between h-[320px] transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-emerald-500/10 cursor-pointer text-left focus:outline-hidden focus:ring-4 focus:ring-emerald-500/20"
            >
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white shadow-sm">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>

              <div>
                <div className="w-20 h-20 rounded-2xl bg-orange-50 border border-orange-200/60 flex items-center justify-center mb-6 shadow-xs group-hover:scale-105 transition-transform overflow-visible">
                  <VitalisBotAvatar size={64} animated={true} />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                    Patient
                  </h3>
                  <span className="text-[10px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">
                    Vitalis Bot
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-3">
                  Chat directly with Vitalis, your AI Health Bot, to describe your symptoms, receive instant emergency triage, and view real-time admission status.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600">
                <span>Conversational Intake & Triage</span>
                <span className="group-hover:translate-x-1 transition-transform">Chat with Bot &rarr;</span>
              </div>
            </div>

            {/* Card 3: Admin */}
            <div
              id="role-card-admin"
              onClick={() => onSelectRole('admin')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectRole('admin')}
              className="group relative bg-white rounded-2xl border-2 border-purple-100 hover:border-purple-500 p-8 flex flex-col justify-between h-[320px] transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/10 cursor-pointer text-left focus:outline-hidden focus:ring-4 focus:ring-purple-500/20 md:col-span-2 lg:col-span-1"
            >
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white shadow-sm">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </div>

              <div>
                <div className="w-20 h-20 rounded-2xl bg-purple-50 group-hover:bg-purple-600 text-purple-600 group-hover:text-white flex items-center justify-center mb-6 transition-colors shadow-xs">
                  <ShieldCheck className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                  Admin
                </h3>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed line-clamp-3">
                  Monitor system activity, manage medical staff licenses, inspect real-time audit logs, and view hospital-wide telemetry.
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-600">
                <span>Executive Command Console</span>
                <span className="group-hover:translate-x-1 transition-transform">Open Console &rarr;</span>
              </div>
            </div>
          </div>
        </section>

        {/* Live Hospital Resources Bar */}
        <section aria-label="Hospital Status Overview" className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg shadow-slate-900/10 max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Live Facility Status</span>
              <h3 className="text-lg sm:text-xl font-bold mt-1">Vitalis OS Central Inpatient & Emergency Facility</h3>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Real-time ward capacity synchronized across telemetry monitors.
              </p>
            </div>

            <button
              id="landing-view-bed-matrix-btn"
              onClick={onOpenBedBoard}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <Bed className="w-4 h-4" />
              <span>Explore 46 Beds Matrix</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
            <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50">
              <span className="text-xs text-slate-400 block">Total Beds</span>
              <span className="text-2xl font-black text-white">{metrics ? metrics.totalBeds : '46'}</span>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50">
              <span className="text-xs text-emerald-400 block">Vacant Beds</span>
              <span className="text-2xl font-black text-emerald-400">{metrics ? metrics.vacantBeds : '42'}</span>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50">
              <span className="text-xs text-amber-400 block">Occupancy Rate</span>
              <span className="text-2xl font-black text-amber-300">{metrics ? `${metrics.occupancyRate}%` : '9%'}</span>
            </div>
            <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/50">
              <span className="text-xs text-red-400 block">Emergency Alerts</span>
              <span className="text-2xl font-black text-red-400">{metrics ? metrics.urgentAlertsCount : '2'}</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 sm:px-6 lg:px-8 mt-12 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>&copy; {new Date().getFullYear()} Vitalis OS Technologies. All rights reserved. HIPAA & GDPR Compliant Architecture.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-800 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-800 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-800 cursor-pointer">Clinical Support</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
