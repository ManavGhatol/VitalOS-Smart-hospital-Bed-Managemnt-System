import React, { useState, useEffect } from 'react';
import {
  Bed as BedIcon,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowLeft,
  X,
  UserCheck,
  AlertOctagon,
  HeartPulse,
} from 'lucide-react';
import { fetchBeds, fetchPatients, assignBedToPatient, dischargePatient, updateBedStatus } from '../services/api';
import type { Bed, Patient, DashboardMetrics } from '../types';

interface BedManagementDashboardProps {
  onBack?: () => void;
  onEmergencyOverrideClick?: () => void;
  metrics: DashboardMetrics | null;
}

export const BedManagementDashboard: React.FC<BedManagementDashboardProps> = ({
  onBack,
  onEmergencyOverrideClick,
  metrics,
}) => {
  const [beds, setBeds] = useState<Bed[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedWard, setSelectedWard] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBed, setSelectedBed] = useState<Bed | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Assign state inside modal
  const [assignPatientId, setAssignPatientId] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bedData, patData] = await Promise.all([fetchBeds(), fetchPatients()]);
      setBeds(bedData.beds);
      setPatients(patData.patients);
    } catch (err) {
      console.warn('Failed to load beds or patients:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const showNotification = (text: string) => {
    setActionNotice(text);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleBedActionAssign = async () => {
    if (!selectedBed || !assignPatientId) return;
    try {
      await assignBedToPatient(assignPatientId, selectedBed.id, 'Attending Physician');
      showNotification(`Bed ${selectedBed.bedNumber} assigned.`);
      setSelectedBed(null);
      setAssignPatientId('');
      loadData();
    } catch (err: any) {
      showNotification(err.message || 'Error assigning bed');
    }
  };

  const handleBedActionDischarge = async () => {
    if (!selectedBed || !selectedBed.patientId) return;
    try {
      await dischargePatient(selectedBed.patientId, {
        doctorName: 'Attending Physician',
        dischargeReason: 'Clinical Discharge',
        dischargeNotes: 'Standard discharge protocol complete.',
      });
      showNotification(`Patient discharged from ${selectedBed.bedNumber}. Bed status updated to Cleaning.`);
      setSelectedBed(null);
      loadData();
    } catch (err: any) {
      showNotification(err.message || 'Discharge error');
    }
  };

  const handleMarkCleaningComplete = async (bedId: string) => {
    try {
      await updateBedStatus(bedId, 'vacant');
      showNotification(`Sanitization certified. Bed marked Vacant and ready.`);
      setSelectedBed(null);
      loadData();
    } catch (err: any) {
      showNotification(err.message || 'Error updating status');
    }
  };

  // Filter beds
  const filteredBeds = beds.filter((b) => {
    const matchesWard = selectedWard === 'all' || b.ward.toLowerCase().includes(selectedWard.toLowerCase());
    const matchesStatus = selectedStatus === 'all' || b.status === selectedStatus;
    const matchesSearch =
      b.bedNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.patientName && b.patientName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesWard && matchesStatus && matchesSearch;
  });

  const vacantCount = beds.filter((b) => b.status === 'vacant').length;
  const occupiedCount = beds.filter((b) => b.status === 'occupied').length;
  const cleaningCount = beds.filter((b) => b.status === 'cleaning').length;
  const reservedCount = beds.filter((b) => b.status === 'reserved').length;
  const occupancyPercentage = beds.length > 0 ? Math.round((occupiedCount / beds.length) * 100) : 0;

  const waitingPatients = patients.filter((p) => p.status === 'Waiting');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Action Toast */}
      {actionNotice && (
        <div className="fixed top-20 right-6 z-50 p-4 rounded-xl bg-slate-900 text-white shadow-xl flex items-center gap-3 text-xs font-bold border border-slate-700">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          {onBack && (
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Portal</span>
            </button>
          )}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Live Bed Management Matrix
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono text-xs font-bold border border-blue-200">
              {beds.length} Total Units
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time hospital bed availability, acute telemetry monitoring, and rapid emergency reallocations
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Pulsing indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>Telemetry Live Sync</span>
          </div>

          <button
            onClick={loadData}
            title="Refresh bed statuses"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {onEmergencyOverrideClick && (
            <button
              id="bed-board-emergency-override-btn"
              onClick={onEmergencyOverrideClick}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md shadow-red-600/20 transition-all cursor-pointer"
            >
              <AlertOctagon className="w-4 h-4" />
              <span>Emergency Override</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
        {/* Vacant Beds */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Vacant Beds
            </span>
            <span className="text-3xl sm:text-4xl font-black text-emerald-600 mt-1 block">
              {vacantCount}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold mt-1">
              <CheckCircle2 className="w-3 h-3" />
              Ready for immediate admission
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <BedIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Occupied Beds */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Occupied Beds
            </span>
            <span className="text-3xl sm:text-4xl font-black text-red-600 mt-1 block">
              {occupiedCount}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] text-red-700 font-bold mt-1">
              <AlertCircle className="w-3 h-3" />
              Under active inpatient care
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
            <BedIcon className="w-6 h-6" />
          </div>
        </div>

        {/* Occupancy Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Facility Occupancy Rate
            </span>
            <span className="text-xs font-mono font-bold text-slate-500">
              {occupiedCount}/{beds.length} Beds
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">
              {occupancyPercentage}%
            </span>
            <span className="text-xs text-slate-500">
              {occupancyPercentage > 85 ? 'Critical Capacity' : 'Optimal Capacity'}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${
                occupancyPercentage > 85
                  ? 'bg-red-500'
                  : occupancyPercentage > 60
                  ? 'bg-amber-500'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${occupancyPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Department Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'All Wards' },
              { id: 'icu', label: 'ICU' },
              { id: 'emergency', label: 'Emergency' },
              { id: 'general', label: 'General Ward' },
              { id: 'recovery', label: 'Recovery' },
              { id: 'cardio', label: 'Cardio Ward' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedWard(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  selectedWard === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bed or patient..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Status Filter Sub-bar */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400">Filter Status:</span>
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold cursor-pointer ${
              selectedStatus === 'all' ? 'bg-slate-200 font-bold text-slate-900' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({beds.length})
          </button>
          <button
            onClick={() => setSelectedStatus('vacant')}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold cursor-pointer ${
              selectedStatus === 'vacant' ? 'bg-emerald-100 font-bold text-emerald-800' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Vacant ({vacantCount})
          </button>
          <button
            onClick={() => setSelectedStatus('occupied')}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold cursor-pointer ${
              selectedStatus === 'occupied' ? 'bg-red-100 font-bold text-red-800' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Occupied ({occupiedCount})
          </button>
          <button
            onClick={() => setSelectedStatus('cleaning')}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold cursor-pointer ${
              selectedStatus === 'cleaning' ? 'bg-purple-100 font-bold text-purple-800' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Cleaning ({cleaningCount})
          </button>
          <button
            onClick={() => setSelectedStatus('reserved')}
            className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold cursor-pointer ${
              selectedStatus === 'reserved' ? 'bg-amber-100 font-bold text-amber-800' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Reserved ({reservedCount})
          </button>
        </div>
      </div>

      {/* Interactive Bed Matrix Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 mb-8">
        {filteredBeds.map((bed) => {
          const isVacant = bed.status === 'vacant';
          const isOccupied = bed.status === 'occupied';
          const isCleaning = bed.status === 'cleaning';
          const isReserved = bed.status === 'reserved';

          return (
            <div
              key={bed.id}
              onClick={() => setSelectedBed(bed)}
              className={`rounded-2xl p-4 border-2 transition-all cursor-pointer hover:scale-103 hover:shadow-md flex flex-col justify-between min-h-[145px] ${
                isVacant
                  ? 'bg-emerald-50/40 border-emerald-300 hover:border-emerald-500'
                  : isOccupied
                  ? 'bg-red-50/40 border-red-300 hover:border-red-500'
                  : isCleaning
                  ? 'bg-purple-50/40 border-purple-300 hover:border-purple-500'
                  : 'bg-amber-50/40 border-amber-300 hover:border-amber-500'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-mono font-black text-sm text-slate-900 tracking-tight">
                    {bed.bedNumber}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isVacant
                        ? 'bg-emerald-500'
                        : isOccupied
                        ? 'bg-red-500'
                        : isCleaning
                        ? 'bg-purple-500 animate-spin'
                        : 'bg-amber-500'
                    }`}
                  />
                </div>

                <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
                  {bed.ward}
                </span>

                {isOccupied && (
                  <div className="mt-2">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {bed.patientName || 'Admitted Patient'}
                    </p>
                    {bed.triageLevel && (
                      <span
                        className={`inline-block text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md mt-0.5 ${
                          bed.triageLevel === 'CRITICAL'
                            ? 'bg-red-200 text-red-800'
                            : 'bg-amber-200 text-amber-800'
                        }`}
                      >
                        {bed.triageLevel}
                      </span>
                    )}
                  </div>
                )}

                {isCleaning && (
                  <div className="mt-2 text-[11px] font-bold text-purple-700 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Terminal Clean</span>
                  </div>
                )}

                {isVacant && (
                  <div className="mt-2 text-[11px] font-bold text-emerald-700">
                    <span>Ready for Intake</span>
                  </div>
                )}
              </div>

              {/* Bottom equipment & time badges */}
              <div className="pt-2 border-t border-slate-200/50 flex items-center justify-between text-[10px] text-slate-400">
                <span className="truncate max-w-[70%]">
                  {bed.equipment && bed.equipment.length > 0 ? bed.equipment[0] : 'Standard Bed'}
                </span>
                <span className="font-mono text-[9px]">{bed.timeInBed || '0h'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend at Bottom */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-wrap items-center justify-around gap-4 text-xs font-medium text-slate-700">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>
            <strong>Vacant</strong>: Ready for immediate assignment
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span>
            <strong>Occupied</strong>: In use by admitted patient
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span>
            <strong>Reserved</strong>: Held for emergency triage
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-purple-500" />
          <span>
            <strong>Cleaning</strong>: Sanitation protocol in progress (15m)
          </span>
        </div>
      </div>

      {/* Interactive Bed Details Modal */}
      {selectedBed && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Bed Unit Details
                </span>
                <h3 className="text-xl font-black text-slate-900 font-mono">
                  {selectedBed.bedNumber} ({selectedBed.ward})
                </h3>
              </div>
              <button
                onClick={() => setSelectedBed(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Current Status:</span>
                <span
                  className={`font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    selectedBed.status === 'vacant'
                      ? 'bg-emerald-100 text-emerald-800'
                      : selectedBed.status === 'occupied'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {selectedBed.status}
                </span>
              </div>

              {selectedBed.patientName && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60">
                  <span className="text-slate-500 block">Admitted Patient:</span>
                  <span className="font-bold text-slate-900 text-sm block">
                    {selectedBed.patientName}
                  </span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Time in Bed: {selectedBed.timeInBed || '3 hours'}
                  </span>
                </div>
              )}

              <div>
                <span className="font-semibold text-slate-700 block mb-1">Equipped Telemetry:</span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedBed.equipment?.map((eq, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-medium"
                    >
                      {eq}
                    </span>
                  )) || <span className="text-slate-400">Standard Bed setup</span>}
                </div>
              </div>

              {/* Action Form if Vacant: Assign from Waiting Room */}
              {selectedBed.status === 'vacant' && (
                <div className="pt-2 border-t border-slate-100">
                  <label className="block font-bold text-slate-800 mb-1">
                    Direct Patient Intake Assignment:
                  </label>
                  <select
                    value={assignPatientId}
                    onChange={(e) => setAssignPatientId(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs font-medium"
                  >
                    <option value="">-- Select Waiting Patient --</option>
                    {waitingPatients.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.triageLevel}] {p.name} ({p.department})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setSelectedBed(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Close
              </button>

              {selectedBed.status === 'vacant' && (
                <button
                  disabled={!assignPatientId}
                  onClick={handleBedActionAssign}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold cursor-pointer"
                >
                  Assign to Patient
                </button>
              )}

              {selectedBed.status === 'occupied' && (
                <button
                  onClick={handleBedActionDischarge}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold cursor-pointer"
                >
                  Discharge & Sanitize Bed
                </button>
              )}

              {selectedBed.status === 'cleaning' && (
                <button
                  onClick={() => handleMarkCleaningComplete(selectedBed.id)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer"
                >
                  Mark Sanitation Complete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
