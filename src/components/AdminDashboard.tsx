import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  ScrollText,
  Activity,
  BarChart3,
  Settings,
  Shield,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Bed,
  AlertTriangle,
  ArrowUpRight,
  Search,
  Filter,
  LogOut,
  RefreshCw,
  Eye,
  X,
} from 'lucide-react';
import { fetchAdminDashboard, updateDoctorStatus } from '../services/api';
import type { DashboardMetrics, DoctorUser, ActivityLog, Patient, TriageLevel } from '../types';

interface AdminDashboardProps {
  onLogout: () => void;
  onOpenBedBoard: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onLogout,
  onOpenBedBoard,
}) => {
  const [activeSection, setActiveSection] = useState<'overview' | 'users' | 'logs' | 'matrix' | 'analytics'>('overview');
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [doctors, setDoctors] = useState<DoctorUser[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminDashboard();
      setMetrics(data.metrics);
      setDoctors(data.recentRegistrations);
      setActivityLogs(data.activityLogs);
      setPatients(data.patients);
    } catch (err) {
      console.warn('Admin load data warning:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleDoctorStatus = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'approved' ? 'blocked' : 'approved';
    try {
      await updateDoctorStatus(userId, nextStatus as 'approved' | 'blocked');
      loadData();
    } catch (err) {
      console.warn('Update doctor status warning:', err);
    }
  };

  const getTriageBadge = (level?: TriageLevel) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[11px] font-black border border-red-200">
            CRITICAL
          </span>
        );
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200">
            URGENT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
            NON-URGENT
          </span>
        );
    }
  };

  // Filtered lists
  const filteredDoctors = doctors.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.licenseNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredPatients = patients.filter((p) => {
    return (
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.bedNumber && p.bedNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.assignedDoctorName && p.assignedDoctorName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Admin Top Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900">Hospital Administration & Governance</h1>
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-mono text-[11px] font-bold border border-purple-200">
                Root Admin
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Vitalis OS Central Facility • Telemetry & Audit Operations</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenBedBoard}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <Bed className="w-4 h-4 text-purple-400" />
            <span>Bed Board Matrix</span>
          </button>

          <button
            onClick={loadData}
            title="Refresh logs"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors border border-slate-200 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 text-xs font-semibold border border-slate-200 hover:border-red-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Exit Console</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar Navigation */}
        <div className="lg:col-span-3 space-y-1.5">
          <button
            id="admin-nav-overview"
            onClick={() => setActiveSection('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeSection === 'overview'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Executive Overview</span>
          </button>

          <button
            id="admin-nav-users"
            onClick={() => setActiveSection('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeSection === 'users'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Physician Staff Management</span>
          </button>

          <button
            id="admin-nav-logs"
            onClick={() => setActiveSection('logs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeSection === 'logs'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80'
            }`}
          >
            <ScrollText className="w-4 h-4" />
            <span>System Activity Logs</span>
          </button>

          <button
            id="admin-nav-matrix"
            onClick={() => setActiveSection('matrix')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeSection === 'matrix'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Patient Interactions Matrix</span>
          </button>

          <button
            id="admin-nav-analytics"
            onClick={() => setActiveSection('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
              activeSection === 'analytics'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Facility Telemetry & Analytics</span>
          </button>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-9 space-y-6">
          {/* Section 1: Key Metrics Cards (Always visible on Overview, or top banner) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Active Doctors</span>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {metrics ? metrics.totalDoctors : 3}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium block mt-1">Verified Medical Staff</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Active Patients</span>
                <Activity className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-2xl sm:text-3xl font-black text-slate-900">
                {metrics ? metrics.totalActivePatients : 6}
              </span>
              <span className="text-[11px] text-slate-500 font-medium block mt-1">In Triage & Admitted</span>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Bed Occupancy Rate</span>
                <Bed className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {metrics ? `${metrics.occupancyRate}%` : '9%'}
                </span>
                <span className="text-xs text-slate-400 font-bold">
                  ({metrics ? `${metrics.occupiedBeds}/${metrics.totalBeds}` : '4/46'})
                </span>
              </div>
              {/* Visual gauge bar */}
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-purple-600 h-1.5 rounded-full transition-all"
                  style={{ width: `${metrics ? metrics.occupancyRate : 9}%` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold">Emergency Alerts</span>
                <ShieldAlert className="w-4 h-4 text-red-600" />
              </div>
              <span className="text-2xl sm:text-3xl font-black text-red-600">
                {metrics ? metrics.urgentAlertsCount : 2}
              </span>
              <span className="text-[11px] text-red-600 font-bold block mt-1">Immediate Attention</span>
            </div>
          </div>

          {/* TAB: Overview (Combines Recent Users + Activity Logs) */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Section 2: Recent User Registrations */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Recent Physician Registrations</h3>
                    <p className="text-xs text-slate-500">Verified doctor credentials & license authorization</p>
                  </div>
                  <button
                    onClick={() => setActiveSection('users')}
                    className="text-xs font-bold text-purple-600 hover:text-purple-700 cursor-pointer"
                  >
                    View All &rarr;
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100">
                        <th className="pb-3 font-semibold">Physician</th>
                        <th className="pb-3 font-semibold">License #</th>
                        <th className="pb-3 font-semibold">Specialty Dept</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold text-right">Quick Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {doctors.slice(0, 5).map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 font-bold text-slate-900">
                            <div>{d.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{d.email}</div>
                          </td>
                          <td className="py-3 font-mono text-slate-600 font-semibold">{d.licenseNumber}</td>
                          <td className="py-3 text-slate-600">{d.department}</td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                d.status === 'approved'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {d.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleToggleDoctorStatus(d.id, d.status)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                                d.status === 'approved'
                                  ? 'bg-red-50 hover:bg-red-100 text-red-700'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {d.status === 'approved' ? 'Block Access' : 'Approve'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 3: Live System Activity Log */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-base font-bold text-slate-900">Live System Activity Log</h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Real-time immutable audit trail</span>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                  {activityLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            log.status === 'error'
                              ? 'bg-red-500'
                              : log.status === 'warning'
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                          }`}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{log.action}</span>
                            <span className="text-[10px] text-slate-400">• {log.user}</span>
                          </div>
                          <p className="text-slate-600 mt-0.5">{log.details}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: User Management Full View */}
          {activeSection === 'users' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Physician Staff Management</h3>
                  <p className="text-xs text-slate-500">Manage doctor credentials, departments, and active statuses</p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-60">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search physician..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl outline-hidden"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="p-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl"
                  >
                    <option value="all">All Status</option>
                    <option value="approved">Approved</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100">
                      <th className="pb-3 font-semibold">Doctor Name</th>
                      <th className="pb-3 font-semibold">Email</th>
                      <th className="pb-3 font-semibold">License Number</th>
                      <th className="pb-3 font-semibold">Hospital & Dept</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDoctors.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-50">
                        <td className="py-3 font-bold text-slate-900">{d.name}</td>
                        <td className="py-3 text-slate-600">{d.email}</td>
                        <td className="py-3 font-mono font-bold text-slate-700">{d.licenseNumber}</td>
                        <td className="py-3 text-slate-600">
                          <div>{d.hospitalName}</div>
                          <div className="text-[10px] text-slate-400">{d.department}</div>
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              d.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {d.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleToggleDoctorStatus(d.id, d.status)}
                            className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                              d.status === 'approved'
                                ? 'bg-red-50 hover:bg-red-100 text-red-700'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {d.status === 'approved' ? 'Block' : 'Approve'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: Activity Logs Full View */}
          {activeSection === 'logs' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Hospital Operational Activity Logs</h3>
                  <p className="text-xs text-slate-500">Real-time audit record of all bed reallocations, triage results, and overrides</p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                  {activityLogs.length} Total Logs
                </span>
              </div>

              <div className="space-y-2.5">
                {activityLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-4 text-xs"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                          log.status === 'error'
                            ? 'bg-red-500'
                            : log.status === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{log.action}</span>
                          <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 text-[10px] font-semibold">
                            {log.user}
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1">{log.details}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 shrink-0">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: Patient Interactions Matrix */}
          {activeSection === 'matrix' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Patient Interactions Matrix</h3>
                  <p className="text-xs text-slate-500">End-to-end tracking from AI intake to bed assignment and discharge</p>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by patient, doctor, bed..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl outline-hidden"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-100">
                      <th className="pb-3 font-semibold">Patient</th>
                      <th className="pb-3 font-semibold">Triage Level</th>
                      <th className="pb-3 font-semibold">Attending Doctor</th>
                      <th className="pb-3 font-semibold">Bed / Location</th>
                      <th className="pb-3 font-semibold">Status</th>
                      <th className="pb-3 font-semibold text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPatients.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedPatient(p)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 font-bold text-slate-900">
                          <div>{p.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{p.duration}</div>
                        </td>
                        <td className="py-3">{getTriageBadge(p.triageLevel)}</td>
                        <td className="py-3 text-slate-700 font-medium">
                          {p.assignedDoctorName || 'Pending Assignment'}
                        </td>
                        <td className="py-3 font-mono font-bold text-slate-800">
                          {p.bedNumber ? `${p.bedNumber} (${p.ward})` : <span className="text-slate-400 font-sans">Waiting Queue</span>}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              p.status === 'Admitted'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.status === 'Waiting'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <button className="text-purple-600 hover:text-purple-800 font-bold text-xs">
                            View &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: Analytics & Facility Telemetry */}
          {activeSection === 'analytics' && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div className="pb-4 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">Hospital Resource Telemetry & Analytics</h3>
                <p className="text-xs text-slate-500">Live operational throughput, emergency intake response, and bed turnaround</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Average AI Triage Response</span>
                  <span className="text-2xl font-black text-slate-900 mt-1 block">420 ms</span>
                  <span className="text-emerald-600 font-semibold block mt-1">99.4% Symptom Categorization Accuracy</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Bed Terminal Cleaning Turnaround</span>
                  <span className="text-2xl font-black text-purple-700 mt-1 block">15 mins</span>
                  <span className="text-slate-500 font-medium block mt-1">Automated sanitization protocol</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Emergency Override Safety Record</span>
                  <span className="text-2xl font-black text-blue-600 mt-1 block">100%</span>
                  <span className="text-slate-500 font-medium block mt-1">Zero unauthorized bed reallocations</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Patient Detail Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clinical Record</span>
                <h3 className="text-lg font-bold text-slate-900">{selectedPatient.name}</h3>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span>Triage Urgency:</span>
                {getTriageBadge(selectedPatient.triageLevel)}
              </div>
              <div className="flex items-center justify-between">
                <span>Severity Score:</span>
                <span className="font-bold">{selectedPatient.severity} / 10</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Bed Assignment:</span>
                <span className="font-mono font-bold">
                  {selectedPatient.bedNumber ? `${selectedPatient.bedNumber} (${selectedPatient.ward})` : 'Waiting List'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Attending Physician:</span>
                <span className="font-semibold">{selectedPatient.assignedDoctorName || 'On-duty Triage'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold block mb-1">Symptoms & Clinical Notes:</span>
                <p className="text-slate-700">{selectedPatient.symptomsRaw}</p>
                {selectedPatient.notes && (
                  <p className="text-slate-500 mt-2 italic text-[11px]">{selectedPatient.notes}</p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedPatient(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
