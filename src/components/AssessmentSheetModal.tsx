import React, { useState, useEffect } from 'react';
import {
  Printer,
  Download,
  X,
  CheckCircle2,
  AlertTriangle,
  User,
  Stethoscope,
  Building2,
  Clock,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import {
  AssessmentSheetData,
  printAssessmentSheetDocument,
  downloadAssessmentSheet,
} from '../utils/printAssessmentSheet';
import type { DoctorUser } from '../types';

interface AssessmentSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AssessmentSheetData;
  availableDoctors?: DoctorUser[];
}

export const AssessmentSheetModal: React.FC<AssessmentSheetModalProps> = ({
  isOpen,
  onClose,
  data,
  availableDoctors = [],
}) => {
  // Configurable fields for doctor & patient full names
  const [patientFullName, setPatientFullName] = useState<string>(data.patientName || 'Intake Patient');
  const [selectedDoctorName, setSelectedDoctorName] = useState<string>(
    data.assignedDoctorName || 'Dr. Sarah Jenkins'
  );
  const [selectedDoctorLicense, setSelectedDoctorLicense] = useState<string>(
    data.assignedDoctorLicense || 'MD-84920-CA'
  );
  const [selectedDoctorDepartment, setSelectedDoctorDepartment] = useState<string>(
    data.assignedDoctorDepartment || 'Emergency & Critical Care'
  );
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [printStatusNotice, setPrintStatusNotice] = useState<string>('');

  useEffect(() => {
    if (data.patientName) setPatientFullName(data.patientName);
    if (data.assignedDoctorName) setSelectedDoctorName(data.assignedDoctorName);
    if (data.assignedDoctorLicense) setSelectedDoctorLicense(data.assignedDoctorLicense);
    if (data.assignedDoctorDepartment) setSelectedDoctorDepartment(data.assignedDoctorDepartment);
  }, [data]);

  if (!isOpen) return null;

  // Active prepared sheet data
  const currentSheetData: AssessmentSheetData = {
    ...data,
    patientName: patientFullName,
    assignedDoctorName: selectedDoctorName,
    assignedDoctorLicense: selectedDoctorLicense,
    assignedDoctorDepartment: selectedDoctorDepartment,
  };

  const handleDoctorSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const docName = e.target.value;
    setSelectedDoctorName(docName);
    const found = availableDoctors.find((d) => d.name === docName);
    if (found) {
      setSelectedDoctorLicense(found.licenseNumber);
      setSelectedDoctorDepartment(found.department);
    }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintStatusNotice('');
    try {
      const res = await printAssessmentSheetDocument(currentSheetData);
      if (res.methodUsed === 'download') {
        setPrintStatusNotice('Printer dialog opened or assessment sheet downloaded for printing.');
      } else {
        setPrintStatusNotice('Print assessment sheet dispatched to printer.');
      }
    } catch (err: any) {
      downloadAssessmentSheet(currentSheetData);
      setPrintStatusNotice('Assessment sheet downloaded as print-ready file.');
    } finally {
      setIsPrinting(false);
      setTimeout(() => setPrintStatusNotice(''), 4500);
    }
  };

  const handleDownload = () => {
    downloadAssessmentSheet(currentSheetData);
    setPrintStatusNotice('Assessment sheet document downloaded successfully.');
    setTimeout(() => setPrintStatusNotice(''), 4000);
  };

  const triageLevel = currentSheetData.triageLevel || 'URGENT';
  const triageBadgeStyle =
    triageLevel === 'CRITICAL'
      ? 'bg-red-100 text-red-800 border-red-300'
      : triageLevel === 'URGENT'
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : 'bg-emerald-100 text-emerald-800 border-emerald-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-3 sm:p-6 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div
        id="clinical-assessment-sheet-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden my-auto"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>Clinical Triage Assessment Sheet</span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full font-bold border border-blue-400/30">
                  Print & Verification
                </span>
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Full doctor access and authorized medical intake summary
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Doctor & Patient Full Name Controls Bar */}
        <div className="bg-blue-50/80 px-6 py-3 border-b border-blue-100 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Patient Full Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-600" />
                <span>Patient Full Name</span>
              </label>
              <input
                type="text"
                value={patientFullName}
                onChange={(e) => setPatientFullName(e.target.value)}
                placeholder="Enter patient full name"
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
              />
            </div>

            {/* Doctor Full Name Access */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                <span>Attending Doctor (Full Name & Credentials)</span>
              </label>
              {availableDoctors.length > 0 ? (
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedDoctorName}
                    onChange={handleDoctorSelect}
                    className="w-full px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs cursor-pointer"
                  >
                    {availableDoctors.map((doc) => (
                      <option key={doc.id} value={doc.name}>
                        {doc.name} ({doc.department} - {doc.licenseNumber})
                      </option>
                    ))}
                    {!availableDoctors.some((d) => d.name === selectedDoctorName) && (
                      <option value={selectedDoctorName}>{selectedDoctorName}</option>
                    )}
                  </select>
                </div>
              ) : (
                <input
                  type="text"
                  value={selectedDoctorName}
                  onChange={(e) => setSelectedDoctorName(e.target.value)}
                  placeholder="Attending doctor full name (e.g. Dr. Sarah Jenkins)"
                  className="w-full px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              )}
            </div>
          </div>
        </div>

        {/* Status notice */}
        {printStatusNotice && (
          <div className="bg-emerald-50 px-6 py-2 border-b border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{printStatusNotice}</span>
          </div>
        )}

        {/* Sheet Preview Body (A4 Paper Aesthetic) */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100">
          <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 max-w-2xl mx-auto text-slate-900 font-sans space-y-4 text-xs">
            {/* Hospital Sheet Header */}
            <div className="flex items-start justify-between border-b-2 border-blue-600 pb-3">
              <div>
                <h3 className="text-lg font-black text-blue-900 tracking-tight uppercase">
                  Vitalis OS Health System
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">
                  Emergency Medicine & Clinical Triage Intake Division
                </p>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-600">
                  <span className="font-bold text-slate-800">Hospital:</span> Vitalis OS Central Hospital
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-black text-[10px] uppercase border border-blue-200">
                  Official Intake Record
                </span>
                <p className="text-[11px] font-mono font-bold text-slate-700 mt-1">
                  ID: {currentSheetData.patientId || 'VTL-INTAKE'}
                </p>
                <p className="text-[10px] text-slate-500">
                  Date: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            {/* Triage Banner */}
            <div className={`p-3 rounded-xl border flex items-center justify-between ${triageBadgeStyle}`}>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">
                  Triage Urgency Rating
                </span>
                <span className="font-black text-sm uppercase tracking-wide">
                  {triageLevel === 'CRITICAL'
                    ? 'Level 1 - CRITICAL (Immediate Resuscitation)'
                    : triageLevel === 'URGENT'
                    ? 'Level 2 - URGENT (Emergent Medical Attention)'
                    : 'Level 3 - NON-URGENT (Stable Outpatient)'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-white/90 shadow-xs">
                  Acuity: {currentSheetData.severity}/10
                </span>
              </div>
            </div>

            {/* Official Bed & Room Allocation Physical Location Stamp */}
            {currentSheetData.bedNumber ? (
              <div className="rounded-xl border-2 border-blue-500 bg-blue-50/60 overflow-hidden shadow-xs">
                <div className="bg-blue-600 text-white px-3.5 py-1.5 flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Official Bed & Room Allocation Stamp</span>
                  </div>
                  <span className="bg-white text-blue-700 px-2 py-0.5 rounded text-[10px] font-black">
                    Admitted
                  </span>
                </div>
                <div className="p-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Room Number</span>
                    <span className="text-base font-black text-blue-900 block">{currentSheetData.roomNumber || 'Assigned Room'}</span>
                    <span className="text-[11px] text-blue-600 font-semibold">{currentSheetData.floor || 'Care Tower'}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Assigned Bed & Ward</span>
                    <span className="text-base font-black text-slate-900 block">{currentSheetData.bedNumber}</span>
                    <span className="text-[11px] text-slate-600 font-semibold">{currentSheetData.ward || currentSheetData.department}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-blue-100 sm:col-span-1">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 block">Walking Instructions</span>
                    <p className="text-[11px] text-emerald-900 font-medium leading-snug mt-0.5">
                      {currentSheetData.locationInstructions || `Proceed to ${currentSheetData.ward || currentSheetData.department} nursing desk.`}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Physical Bed & Room: <strong className="text-slate-800">Pending Physician Allocation</strong></span>
                </div>
                <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                  In Waiting Queue
                </span>
              </div>
            )}

            {/* Patient & Doctor Two-Column Info */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Patient Details
                </span>
                <p className="font-bold text-slate-900 text-sm">{patientFullName}</p>
                <p className="text-slate-600">
                  Status: <span className="font-semibold text-blue-700">Waiting for Intake</span>
                </p>
                <p className="text-slate-600">
                  Target Ward: <span className="font-semibold text-slate-800">{currentSheetData.department}</span>
                </p>
              </div>

              <div className="space-y-1 border-l border-slate-200 pl-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Attending Physician (Full Access)
                </span>
                <p className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-blue-600" />
                  <span>{selectedDoctorName}</span>
                </p>
                <p className="text-slate-600">
                  License: <span className="font-semibold text-slate-800">{selectedDoctorLicense}</span>
                </p>
                <p className="text-slate-600">
                  Department: <span className="font-semibold text-slate-800">{selectedDoctorDepartment}</span>
                </p>
              </div>
            </div>

            {/* Chief Medical Complaints */}
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 pb-1 border-b border-slate-200 mb-2">
                Chief Medical Complaints & Vitals
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                {currentSheetData.symptoms && currentSheetData.symptoms.length > 0 ? (
                  currentSheetData.symptoms.map((s, idx) => (
                    <li key={idx} className="font-medium">
                      {s}
                    </li>
                  ))
                ) : (
                  <li className="font-medium">
                    {currentSheetData.rawSymptoms || 'Acute medical presentation recorded during triage.'}
                  </li>
                )}
              </ul>
              {currentSheetData.duration && (
                <p className="text-[11px] text-slate-500 mt-1.5">
                  <strong>Reported Duration:</strong> {currentSheetData.duration}
                </p>
              )}
            </div>

            {/* Clinical Impression & Rationale */}
            {currentSheetData.clinicalRationale && (
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-blue-950">
                <span className="font-bold block text-[11px] uppercase tracking-wider text-blue-800 mb-1">
                  AI Clinical Impression & Action Directives
                </span>
                <p className="leading-relaxed">{currentSheetData.clinicalRationale}</p>
              </div>
            )}

            {/* Attending Physician Authorization & Sign-off */}
            <div className="mt-4 p-3.5 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50/80">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-blue-900 tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Physician Clinical Authorization & Review</span>
                  </span>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Attending physician <strong>{selectedDoctorName}</strong> has clinical authority to access patient medical records, order diagnostics, and approve hospital admission.
                  </p>
                </div>
                <div className="text-right shrink-0 pt-3">
                  <div className="border-b border-slate-800 w-36 mb-1"></div>
                  <span className="text-[10px] text-slate-500 font-semibold">Doctor Signature</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            <span>Ready for clinical printing or digital archiving (PDF/HTML).</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-colors shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Download Sheet</span>
            </button>

            <button
              id="confirm-print-sheet-btn"
              onClick={handlePrint}
              disabled={isPrinting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{isPrinting ? 'Printing...' : 'Print Assessment Sheet'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
