import React, { useState } from 'react';
import {
  Bed as BedIcon,
  MapPin,
  Building,
  Stethoscope,
  Compass,
  Printer,
  FileDown,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Info,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import type { BedAllocationNotification } from '../types';

interface BedAllocationCardProps {
  allocation: BedAllocationNotification;
  onPrintSheet: () => void;
  onDownloadSheet?: () => void;
  variant?: 'prominent' | 'chat-inline';
}

export const BedAllocationCard: React.FC<BedAllocationCardProps> = ({
  allocation,
  onPrintSheet,
  onDownloadSheet,
  variant = 'prominent',
}) => {
  const [showDirections, setShowDirections] = useState<boolean>(true);
  const isHighAlert = allocation.triageLevel === 'CRITICAL' || allocation.isDirectAllocation;

  return (
    <div
      id="bed-room-allocation-card"
      className={`rounded-2xl border transition-all duration-300 ${
        isHighAlert
          ? 'bg-gradient-to-br from-red-50/80 via-emerald-50/70 to-teal-50/60 border-red-300 shadow-lg shadow-red-500/10 p-5 sm:p-6'
          : variant === 'prominent'
          ? 'bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-blue-50/60 border-emerald-300 shadow-md shadow-emerald-500/10 p-5 sm:p-6'
          : 'bg-gradient-to-r from-emerald-50/90 to-teal-50/80 border-emerald-300 shadow-xs p-4'
      }`}
    >
      {/* Header Badge & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-emerald-200/80">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl text-white flex items-center justify-center shrink-0 shadow-sm ${
              isHighAlert ? 'bg-red-600 animate-pulse' : 'bg-emerald-600'
            }`}
          >
            {isHighAlert ? <Zap className="w-5 h-5 fill-current" /> : <BedIcon className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {isHighAlert ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-red-900 bg-red-200/90 px-2 py-0.5 rounded-md border border-red-300">
                  <AlertTriangle className="w-3 h-3 text-red-700" />
                  High Alert • Direct Bed Allocated (No Queue)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-200/80 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                  Bed & Room Confirmed
                </span>
              )}
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-semibold text-emerald-700">Live Hospital Sync</span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
              Physical Location Allocated for {allocation.patientName}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            id="allocation-card-print-btn"
            onClick={onPrintSheet}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            title="Print Assessment Sheet with stamped room and bed number"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Stamped Sheet</span>
          </button>
          {onDownloadSheet && (
            <button
              id="allocation-card-download-btn"
              onClick={onDownloadSheet}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 font-bold text-xs border border-emerald-300 shadow-2xs transition-colors cursor-pointer"
              title="Download clinical assessment sheet"
            >
              <FileDown className="w-3.5 h-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of Key Physical Coordinates */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        {/* Room Number */}
        <div className="p-3 bg-white/95 rounded-xl border border-emerald-200/80 shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold mb-1">
            <Building className="w-3.5 h-3.5 text-emerald-600" />
            <span>Room Number</span>
          </div>
          <div className="text-base font-black text-slate-900 tracking-tight">
            {allocation.roomNumber || 'Room Assigned'}
          </div>
        </div>

        {/* Bed Number */}
        <div className="p-3 bg-white/95 rounded-xl border border-emerald-200/80 shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold mb-1">
            <BedIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>Assigned Bed</span>
          </div>
          <div className="text-base font-black text-emerald-800 font-mono tracking-wide">
            {allocation.bedNumber}
          </div>
        </div>

        {/* Ward / Department */}
        <div className="p-3 bg-white/95 rounded-xl border border-emerald-200/80 shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold mb-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ward / Dept</span>
          </div>
          <div className="text-sm font-black text-slate-900 truncate" title={allocation.ward}>
            {allocation.ward}
          </div>
          {allocation.floor && (
            <div className="text-[10px] text-slate-500 truncate" title={allocation.floor}>
              {allocation.floor}
            </div>
          )}
        </div>

        {/* Assigned Attending Physician */}
        <div className="p-3 bg-white/95 rounded-xl border border-emerald-200/80 shadow-2xs">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold mb-1">
            <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
            <span>Attending Doctor</span>
          </div>
          <div className="text-xs sm:text-sm font-extrabold text-blue-900 truncate" title={allocation.assignedDoctorName}>
            {allocation.assignedDoctorName}
          </div>
          <div className="text-[10px] text-emerald-700 font-medium">Physician in Charge</div>
        </div>
      </div>

      {/* Direct Walking and Reception Instructions */}
      <div className="bg-white/90 rounded-xl p-3.5 border border-emerald-200/90 text-xs">
        <button
          type="button"
          onClick={() => setShowDirections(!showDirections)}
          className="w-full flex items-center justify-between font-bold text-slate-800 hover:text-emerald-800 transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-600" />
            <span className="font-extrabold text-slate-900">
              Direct Walking & Reception Instructions
            </span>
          </div>
          <span className="text-slate-400">
            {showDirections ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {showDirections && (
          <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-slate-700 leading-relaxed">
            <p className="font-medium text-[13px] text-slate-800">
              {allocation.locationInstructions ||
                'Please take the central elevator to the designated floor. Check in at the ward nursing reception station with your Clinical Assessment Sheet.'}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                <Info className="w-3 h-3 text-emerald-600" />
                Physical badge stamped on Assessment Sheet
              </span>
              <span>•</span>
              <span>Bed sanitized and prepared for immediate intake</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
