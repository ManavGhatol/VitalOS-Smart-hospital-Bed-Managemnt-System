import React, { useState, useEffect } from 'react';
import {
  Users,
  Bed as BedIcon,
  AlertOctagon,
  LogOut,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  X,
  PlusCircle,
  FileCheck,
  Stethoscope,
  Heart,
  ChevronRight,
  Zap,
  MapPin,
  Activity,
  UserCheck,
  ShieldAlert,
  FileText,
  Printer,
  Syringe,
  Eye,
  Check,
  AlertCircle,
  Radio,
  Compass,
  ClipboardList,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import {
  fetchPatients,
  fetchBeds,
  executeEmergencyOverride,
  dischargePatient,
  assignBedToPatient,
  allocateBestBedForPatient,
  subscribeToLiveEvents,
  acknowledgeDirectBedPatient,
  approveBedRequest,
  declineBedRequest,
} from '../services/api';
import type { DoctorUser, Patient, Bed, EmergencyOverridePayload, TriageLevel, BedAssignmentRequest } from '../types';

interface DoctorDashboardProps {
  doctor: DoctorUser;
  onLogout: () => void;
  onOpenLiveBedBoard: () => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({
  doctor,
  onLogout,
  onOpenLiveBedBoard,
}) => {
  const [activeTab, setActiveTab] = useState<'patients' | 'requests' | 'beds' | 'emergency'>('patients');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Modals state
  const [showOverrideModal, setShowOverrideModal] = useState<boolean>(false);
  const [showDischargeModal, setShowDischargeModal] = useState<boolean>(false);
  const [showAssignBedModal, setShowAssignBedModal] = useState<boolean>(false);

  // Direct Bed Allocation states
  const [directViewScope, setDirectViewScope] = useState<'my-assigned' | 'all'>('my-assigned');
  const [viewingAssessmentPatient, setViewingAssessmentPatient] = useState<Patient | null>(null);
  const [statOrderPatient, setStatOrderPatient] = useState<Patient | null>(null);
  const [selectedStatOrder, setSelectedStatOrder] = useState<string>('Stat 12-Lead ECG & High-Sensitivity Troponin I');
  const [isAcknowledgingId, setIsAcknowledgingId] = useState<string | null>(null);

  // Target patient for discharge or assign
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [dischargeReason, setDischargeReason] = useState<string>('Clinical Recovery');
  const [dischargeNotes, setDischargeNotes] = useState<string>('Patient has reached normal physiological metrics.');

  // Emergency override state
  const [overrideUrgentPatientId, setOverrideUrgentPatientId] = useState<string>('');
  const [overrideDischargePatientId, setOverrideDischargePatientId] = useState<string>('');
  const [overrideTargetBedId, setOverrideTargetBedId] = useState<string>('');
  const [overrideDoctorNotes, setOverrideDoctorNotes] = useState<string>('Acute pulmonary compromise requiring urgent ventilator access.');
  const [isExecutingOverride, setIsExecutingOverride] = useState<boolean>(false);

  // Assign bed state
  const [assignBedId, setAssignBedId] = useState<string>('');

  // Non-Serious Bed Review & Approval states
  const [requestsViewScope, setRequestsViewScope] = useState<'my-assigned' | 'all'>('my-assigned');
  const [approvingRequestPatient, setApprovingRequestPatient] = useState<Patient | null>(null);
  const [approvingBedId, setApprovingBedId] = useState<string>('');
  const [approvingReviewNotes, setApprovingReviewNotes] = useState<string>('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState<boolean>(false);

  const [decliningRequestPatient, setDecliningRequestPatient] = useState<Patient | null>(null);
  const [decliningDecision, setDecliningDecision] = useState<string>('Outpatient Specialist Follow-up');
  const [decliningNotes, setDecliningNotes] = useState<string>('');
  const [isSubmittingDecline, setIsSubmittingDecline] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [patData, bedData] = await Promise.all([fetchPatients(), fetchBeds()]);
      setPatients(patData.patients);
      setBeds(bedData.beds);
    } catch (err: any) {
      console.warn('Doctor dashboard load warning:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Live Event Stream for instantaneous direct bed allocation updates
    const unsubscribe = subscribeToLiveEvents((event) => {
      if (
        event.type === 'bed_allocated' ||
        event.type === 'patient_triaged' ||
        event.type === 'patient_updated' ||
        event.type === 'emergency_override' ||
        event.type === 'bed_updated' ||
        event.type === 'bed_request_created' ||
        event.type === 'bed_request_approved' ||
        event.type === 'bed_request_declined'
      ) {
        loadData();

        if (event.type === 'bed_allocated') {
          const pat = event.data?.patient;
          const assignedDoc = event.data?.assignedDoctorName || pat?.assignedDoctorName;
          const room = event.data?.roomNumber || pat?.roomNumber || event.data?.bed?.roomNumber || '';
          const bedNum = event.data?.bedNumber || pat?.bedNumber || event.data?.bed?.bedNumber || '';
          const ward = event.data?.ward || pat?.ward || event.data?.bed?.ward || '';

          showToast(
            `🚨 LIVE DIRECT BED ALLOCATION: ${pat?.name || 'Critical Patient'} assigned to ${room ? `Room ${room}, ` : ''}Bed ${bedNum} (${ward}) under ${assignedDoc || doctor.name}!`,
            'warning'
          );
        } else if (event.type === 'bed_request_created') {
          const pat = event.data?.patient;
          const req = event.data?.request;
          showToast(
            `📋 NEW BED REQUEST ROUTED: ${pat?.name || req?.patientName} (Stable, Severity ${pat?.severity || '4'}/10) requires your clinical review & authorization.`,
            'warning'
          );
        } else if (event.type === 'bed_request_approved') {
          const pat = event.data?.patient;
          showToast(
            `✅ Bed assignment approved for ${pat?.name || 'patient'}. Inpatient admission active.`,
            'success'
          );
        } else if (event.type === 'bed_request_declined') {
          const pat = event.data?.patient;
          showToast(
            `ℹ️ Bed request for ${pat?.name || 'patient'} reviewed & routed to outpatient care.`,
            'warning'
          );
        }
      }
    });

    const interval = setInterval(loadData, 6000);
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [doctor.name]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  const [isDirectAssigning, setIsDirectAssigning] = useState<boolean>(false);

  const handleDirectAssignBed = async (patientId: string) => {
    setIsDirectAssigning(true);
    try {
      const res = await allocateBestBedForPatient(patientId, doctor.name);
      showToast(
        `Emergency bed directly assigned: ${res.bed.roomNumber || ''} Bed ${res.bed.bedNumber} (${res.bed.ward}) to ${res.patient.name}`,
        'success'
      );
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Direct bed allocation failed', 'error');
    } finally {
      setIsDirectAssigning(false);
    }
  };

  const handleAcknowledgePatient = async (patient: Patient) => {
    setIsAcknowledgingId(patient.id);
    try {
      await acknowledgeDirectBedPatient({
        patientId: patient.id,
        doctorName: doctor.name,
        doctorId: doctor.id,
        action: 'Direct Bed Assignment Acknowledged by Attending',
      });
      showToast(
        `Care Confirmed: ${patient.name} acknowledged in ${patient.roomNumber ? `Room ${patient.roomNumber}, ` : ''}Bed ${patient.bedNumber} under Dr. ${doctor.name}`,
        'success'
      );
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to acknowledge patient', 'error');
    } finally {
      setIsAcknowledgingId(null);
    }
  };

  const handleConfirmStatOrder = async () => {
    if (!statOrderPatient || !selectedStatOrder) return;
    try {
      await acknowledgeDirectBedPatient({
        patientId: statOrderPatient.id,
        doctorName: doctor.name,
        doctorId: doctor.id,
        action: `Ordered Stat Protocol: ${selectedStatOrder}`,
      });
      showToast(
        `Stat Order Dispatched: "${selectedStatOrder}" for ${statOrderPatient.name} in Bed ${statOrderPatient.bedNumber}. Nursing & Lab notified.`,
        'success'
      );
      setStatOrderPatient(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to dispatch stat order', 'error');
    }
  };

  // Trigger Discharge
  const handleConfirmDischarge = async () => {
    if (!selectedPatient) return;
    try {
      await dischargePatient(selectedPatient.id, {
        doctorName: doctor.name,
        dischargeReason,
        dischargeNotes,
      });
      showToast(`Discharge complete for ${selectedPatient.name}. Bed queued for terminal cleaning.`, 'success');
      setShowDischargeModal(false);
      setSelectedPatient(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Discharge failed', 'error');
    }
  };

  // Trigger Assign Bed
  const handleConfirmAssignBed = async () => {
    if (!selectedPatient || !assignBedId) return;
    try {
      await assignBedToPatient(selectedPatient.id, assignBedId, doctor.name);
      showToast(`Patient ${selectedPatient.name} assigned to bed.`, 'success');
      setShowAssignBedModal(false);
      setSelectedPatient(null);
      setAssignBedId('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Bed assignment failed', 'error');
    }
  };

  // Open Approve Bed Request Modal
  const handleOpenApproveModal = (p: Patient) => {
    setApprovingRequestPatient(p);
    const suggested = p.bedAssignmentRequest?.suggestedBedId
      ? beds.find((b) => b.id === p.bedAssignmentRequest?.suggestedBedId && b.status === 'vacant')
      : null;
    const matchingBed =
      suggested ||
      beds.find((b) => b.status === 'vacant' && b.ward === (p.ward || 'General Ward')) ||
      beds.find((b) => b.status === 'vacant');
    setApprovingBedId(matchingBed ? matchingBed.id : '');
    setApprovingReviewNotes('Patient clinically evaluated. Condition stable and suitable for inpatient ward care. Bed admission authorized.');
  };

  const handleConfirmApproveBedRequest = async () => {
    if (!approvingRequestPatient) return;
    setIsSubmittingApproval(true);
    try {
      const res = await approveBedRequest({
        patientId: approvingRequestPatient.id,
        doctorId: doctor.id,
        doctorName: doctor.name,
        bedId: approvingBedId || undefined,
        reviewNotes: approvingReviewNotes,
      });
      showToast(
        `Bed assignment approved! ${approvingRequestPatient.name} admitted to ${res.bed.roomNumber || ''} Bed ${res.bed.bedNumber} (${res.bed.ward}).`,
        'success'
      );
      setApprovingRequestPatient(null);
      setApprovingBedId('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve bed request', 'error');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Open Decline Bed Request Modal
  const handleOpenDeclineModal = (p: Patient) => {
    setDecliningRequestPatient(p);
    setDecliningDecision('Outpatient Specialist Follow-up');
    setDecliningNotes('Condition is non-serious and stable. Inpatient hospital bed admission is not clinically indicated. Patient is safely routed to outpatient ambulatory care.');
  };

  const handleConfirmDeclineBedRequest = async () => {
    if (!decliningRequestPatient) return;
    setIsSubmittingDecline(true);
    try {
      await declineBedRequest({
        patientId: decliningRequestPatient.id,
        doctorId: doctor.id,
        doctorName: doctor.name,
        decision: decliningDecision,
        physicianNotes: decliningNotes,
      });
      showToast(
        `Bed request declined. ${decliningRequestPatient.name} routed to: ${decliningDecision}.`,
        'warning'
      );
      setDecliningRequestPatient(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to decline bed request', 'error');
    } finally {
      setIsSubmittingDecline(false);
    }
  };

  // Trigger Emergency Override
  const handleConfirmEmergencyOverride = async () => {
    if (!overrideUrgentPatientId || !overrideTargetBedId) {
      showToast('Please select an urgent patient and target bed.', 'error');
      return;
    }

    setIsExecutingOverride(true);
    try {
      const payload: EmergencyOverridePayload = {
        urgentPatientId: overrideUrgentPatientId,
        dischargePatientId: overrideDischargePatientId,
        targetBedId: overrideTargetBedId,
        doctorNotes: overrideDoctorNotes,
        doctorId: doctor.id,
        doctorName: doctor.name,
      };

      const res = await executeEmergencyOverride(payload);
      showToast(res.message || 'Emergency Bed Reallocation Executed Successfully!', 'success');
      setShowOverrideModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Emergency Override Failed', 'error');
    } finally {
      setIsExecutingOverride(false);
    }
  };

  const getTriageBadge = (level?: TriageLevel) => {
    switch (level) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
            CRITICAL
          </span>
        );
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            URGENT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            NON-URGENT
          </span>
        );
    }
  };

  // Filter patients
  const criticalWaitingPatients = patients.filter((p) => p.status === 'Waiting' && p.triageLevel === 'CRITICAL');
  const waitingPatients = patients.filter((p) => p.status === 'Waiting');
  const admittedPatients = patients.filter((p) => p.status === 'Admitted');
  const dischargeEligiblePatients = patients.filter(
    (p) => p.status === 'Admitted' && (p.dischargeReason?.includes('Ready') || p.triageLevel === 'NON-URGENT')
  );

  const vacantBeds = beds.filter((b) => b.status === 'vacant');

  // Direct Bed Allocation Patients (CRITICAL / High-Risk patients directly placed in beds)
  const allDirectAllocatedPatients = patients.filter(
    (p) =>
      p.status === 'Admitted' &&
      p.bedNumber &&
      (p.isDirectAllocation ||
        p.triageLevel === 'CRITICAL' ||
        (p.severity !== undefined && p.severity >= 7) ||
        (p.triageLevel === 'URGENT' && p.severity !== undefined && p.severity >= 6))
  );

  const myDirectAllocatedPatients = allDirectAllocatedPatients.filter(
    (p) =>
      p.assignedDoctorId === doctor.id ||
      p.assignedDoctorName?.toLowerCase() === doctor.name.toLowerCase() ||
      p.assignedDoctorName?.toLowerCase().includes(doctor.name.toLowerCase().replace('dr. ', '').trim())
  );

  const displayDirectPatients =
    directViewScope === 'my-assigned' && myDirectAllocatedPatients.length > 0
      ? myDirectAllocatedPatients
      : allDirectAllocatedPatients;

  // Pending Bed Assignment Requests (Non-serious patients routed directly for doctor review & approval)
  const allPendingBedRequests = patients.filter(
    (p) =>
      p.bedRequestStatus === 'pending_doctor_review' ||
      (p.bedAssignmentRequest && p.bedAssignmentRequest.status === 'pending')
  );

  const myPendingBedRequests = allPendingBedRequests.filter(
    (p) =>
      p.assignedDoctorId === doctor.id ||
      p.assignedDoctorName?.toLowerCase() === doctor.name.toLowerCase() ||
      p.assignedDoctorName?.toLowerCase().includes(doctor.name.toLowerCase().replace('dr. ', '').trim())
  );

  const displayPendingBedRequests =
    requestsViewScope === 'my-assigned' && myPendingBedRequests.length > 0
      ? myPendingBedRequests
      : allPendingBedRequests;

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Recently';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.max(1, Math.floor(diffMs / 60000));
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-18 right-6 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : notification.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600" />
          )}
          <span className="text-xs font-bold">{notification.message}</span>
        </div>
      )}

      {/* Doctor Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Stethoscope className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">{doctor.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                {doctor.licenseNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {doctor.department} • {doctor.hospitalName}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Live Telemetry Active
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-[11px] font-bold border border-red-200">
                <Activity className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                {myDirectAllocatedPatients.length} High-Risk Direct Bed Cases Assigned to You
              </span>
              {allPendingBedRequests.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('requests')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200 cursor-pointer transition-colors"
                >
                  <ClipboardList className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    {myPendingBedRequests.length} Non-Serious Bed Requests Routed to You ({allPendingBedRequests.length} Total)
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Emergency Override Primary Button */}
          <button
            id="doctor-emergency-override-btn"
            onClick={() => {
              if (criticalWaitingPatients.length > 0) {
                setOverrideUrgentPatientId(criticalWaitingPatients[0].id);
              } else if (waitingPatients.length > 0) {
                setOverrideUrgentPatientId(waitingPatients[0].id);
              }
              if (dischargeEligiblePatients.length > 0) {
                setOverrideDischargePatientId(dischargeEligiblePatients[0].id);
                if (dischargeEligiblePatients[0].bedId) {
                  setOverrideTargetBedId(dischargeEligiblePatients[0].bedId);
                }
              }
              setShowOverrideModal(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md shadow-red-600/20 transition-all cursor-pointer"
          >
            <AlertOctagon className="w-4 h-4 animate-bounce" />
            <span>Emergency Bed Override</span>
          </button>

          <button
            id="doctor-view-bed-board-btn"
            onClick={onOpenLiveBedBoard}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <BedIcon className="w-4 h-4 text-blue-400" />
            <span>Bed Board Matrix</span>
          </button>

          <button
            onClick={onLogout}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 transition-colors border border-slate-200 cursor-pointer"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* PROMINENTLY HIGHLIGHTED DIRECT BED ALLOCATION SECTION FOR CRITICAL PATIENTS */}
      {allDirectAllocatedPatients.length > 0 && (
        <section
          id="direct-bed-allocation-highlighted-section"
          aria-label="High-Risk Emergency Direct Bed Allocation"
          className="mb-8 rounded-3xl bg-linear-to-b from-red-500/10 via-red-500/5 to-white border-2 border-red-500/80 shadow-xl shadow-red-500/10 overflow-hidden"
        >
          {/* Emergency Alert Section Header */}
          <div className="bg-linear-to-r from-red-700 via-red-800 to-slate-900 text-white p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center border border-white/20 shadow-inner shrink-0">
                <AlertOctagon className="w-6 h-6 text-red-300 animate-pulse" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase flex items-center gap-2">
                    <span>Critical Emergency Direct Bed Allocations</span>
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[11px] font-black tracking-wider uppercase shadow-xs">
                    Queue Bypassed
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-xs font-mono font-bold">
                    {displayDirectPatients.length} Active {displayDirectPatients.length === 1 ? 'Case' : 'Cases'}
                  </span>
                </div>
                <p className="text-xs text-red-100/90 mt-0.5 font-medium">
                  High-risk triage patients automatically assigned immediate beds with verified room and attending physician stamping.
                </p>
              </div>
            </div>

            {/* Scope Filter Switcher */}
            <div className="flex items-center gap-1.5 bg-black/30 p-1 rounded-xl border border-white/10 text-xs font-bold self-stretch md:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setDirectViewScope('my-assigned')}
                className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  directViewScope === 'my-assigned'
                    ? 'bg-white text-red-900 shadow-md font-black'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Assigned to You ({myDirectAllocatedPatients.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setDirectViewScope('all')}
                className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  directViewScope === 'all'
                    ? 'bg-white text-red-900 shadow-md font-black'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>All Direct Allocations ({allDirectAllocatedPatients.length})</span>
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="p-4 sm:p-6 space-y-4">
            {displayDirectPatients.length === 0 ? (
              <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-red-200 text-slate-600 text-xs">
                No direct bed allocations currently assigned specifically to your physician ID.
                <button
                  type="button"
                  onClick={() => setDirectViewScope('all')}
                  className="ml-2 font-bold text-red-700 underline cursor-pointer"
                >
                  View all hospital direct emergency cases ({allDirectAllocatedPatients.length})
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {displayDirectPatients.map((p) => {
                  const isAssignedToThisDoctor =
                    p.assignedDoctorId === doctor.id ||
                    p.assignedDoctorName?.toLowerCase() === doctor.name.toLowerCase() ||
                    p.assignedDoctorName?.toLowerCase().includes(doctor.name.toLowerCase().replace('dr. ', '').trim());

                  return (
                    <div
                      key={p.id}
                      id={`direct-bed-card-${p.id}`}
                      className="relative rounded-2xl bg-white border-2 border-red-400 p-5 sm:p-6 shadow-md shadow-red-500/5 flex flex-col justify-between transition-all hover:border-red-500 hover:shadow-lg"
                    >
                      {/* Top Bar: Urgency Badges & Triage Level */}
                      <div>
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-red-100">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-black tracking-wide shadow-xs uppercase">
                              <Zap className="w-3 h-3 fill-current" />
                              DIRECT BED ASSIGNMENT
                            </span>
                            {p.triageLevel === 'CRITICAL' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-xs font-black border border-red-300">
                                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                                CRITICAL PRIORITY (Severity {p.severity}/10)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black border border-amber-300">
                                <span className="w-2 h-2 rounded-full bg-amber-600" />
                                HIGH ACUITY (Severity {p.severity}/10)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Admitted {formatTimeAgo(p.admittedAt || p.createdAt)}</span>
                          </div>
                        </div>

                        {/* High-Contrast Location & Bed Assignment Grid */}
                        <div className="mb-4 bg-linear-to-br from-slate-900 via-slate-800 to-red-950 text-white rounded-2xl p-4 sm:p-5 shadow-inner border border-slate-700/60">
                          <div className="text-[10px] uppercase font-mono tracking-widest text-red-300 mb-3 font-bold flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-red-400" />
                              Physical Bed Allocation Coordinates
                            </span>
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Immediate Vacancy Locked
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                            {/* Room Number */}
                            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 block mb-0.5">
                                Room Number
                              </span>
                              <span className="text-lg sm:text-xl font-black text-white block tracking-tight">
                                {p.roomNumber || 'Assigned Suite'}
                              </span>
                              <span className="text-[10px] text-red-200 block truncate mt-0.5">
                                Dedicated Care Unit
                              </span>
                            </div>

                            {/* Ward & Floor */}
                            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 block mb-0.5">
                                Ward / Department
                              </span>
                              <span className="text-base sm:text-lg font-black text-white block">
                                {p.ward || 'ICU'}
                              </span>
                              <span className="text-[10px] text-slate-300 block truncate mt-0.5">
                                {p.floor || '3rd Floor'}
                              </span>
                            </div>

                            {/* Bed Number */}
                            <div className="bg-red-600/30 backdrop-blur-xs rounded-xl p-3 border border-red-400/40">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-red-200 block mb-0.5">
                                Bed Number
                              </span>
                              <span className="text-xl sm:text-2xl font-black font-mono text-white block tracking-wider">
                                {p.bedNumber}
                              </span>
                              <span className="text-[10px] text-red-200 font-bold block uppercase tracking-wider mt-0.5">
                                Direct Assigned
                              </span>
                            </div>

                            {/* Attending Doctor */}
                            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 block mb-0.5">
                                Attending Doctor
                              </span>
                              <span className="text-xs sm:text-sm font-black text-amber-300 block truncate">
                                {p.assignedDoctorName || doctor.name}
                              </span>
                              <span className="text-[10px] text-emerald-300 font-bold block mt-0.5 flex items-center gap-1 truncate">
                                <Check className="w-3 h-3" />
                                {isAssignedToThisDoctor ? 'Assigned to You' : 'Assigned Attending'}
                              </span>
                            </div>
                          </div>

                          {/* Navigation Route */}
                          {p.locationInstructions && (
                            <div className="mt-3 pt-2.5 border-t border-white/10 text-xs text-slate-200 flex items-start gap-2">
                              <Compass className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                              <p className="text-[11px] leading-relaxed text-slate-300">
                                <strong className="text-white">Direct Route:</strong> {p.locationInstructions}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Patient Clinical Profile */}
                        <div className="space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">{p.name}</h3>
                                {p.gender && p.age && (
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                                    {p.age}y • {p.gender}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 mt-1 font-medium">
                                <strong className="text-slate-900">Chief Complaint:</strong> {p.symptomsRaw}
                              </p>
                            </div>

                            {/* Attending Physician Care Acknowledgment Pill */}
                            <div className="shrink-0">
                              {p.acknowledgedByDoctor ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Care Confirmed by Attending
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-bold border border-red-300 animate-pulse">
                                  <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                                  Awaiting Bedside Care Acknowledgment
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Symptoms Badges */}
                          {p.symptomsStructured && p.symptomsStructured.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              {p.symptomsStructured.map((symp, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200"
                                >
                                  {symp}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Doctor Action Toolbar */}
                      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
                        {/* Acknowledge Care Button */}
                        {!p.acknowledgedByDoctor ? (
                          <button
                            type="button"
                            onClick={() => handleAcknowledgePatient(p)}
                            disabled={isAcknowledgingId === p.id}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>
                              {isAcknowledgingId === p.id ? 'Acknowledging...' : 'Acknowledge & Confirm Bedside Care'}
                            </span>
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                            <Check className="w-3.5 h-3.5" />
                            <span>Attending Care Active</span>
                          </div>
                        )}

                        {/* Stat Clinical Orders Button */}
                        <button
                          type="button"
                          onClick={() => setStatOrderPatient(p)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <Syringe className="w-3.5 h-3.5" />
                          <span>Order Stat Workup</span>
                        </button>

                        {/* View Assessment Sheet */}
                        <button
                          type="button"
                          onClick={() => setViewingAssessmentPatient(p)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Clinical Assessment Sheet</span>
                        </button>

                        {/* Discharge / Transfer */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPatient(p);
                            setShowDischargeModal(true);
                          }}
                          className="ml-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border border-slate-200 hover:border-amber-300 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <FileCheck className="w-3.5 h-3.5" />
                          <span>Discharge / Transfer</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* PENDING BED ASSIGNMENT REQUESTS (NON-SERIOUS PATIENTS ROUTED FOR DOCTOR REVIEW & APPROVAL) */}
      {allPendingBedRequests.length > 0 && (
        <section
          id="pending-bed-requests-review-section"
          aria-label="Pending Bed Assignment Requests Requiring Doctor Review"
          className="mb-8 rounded-3xl bg-linear-to-b from-indigo-950/5 via-blue-50/20 to-white border-2 border-indigo-400/80 shadow-xl shadow-indigo-500/5 overflow-hidden"
        >
          {/* Clinical Review Header Banner */}
          <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600/30 backdrop-blur-xs flex items-center justify-center border border-indigo-400/30 shadow-inner shrink-0">
                <ClipboardList className="w-6 h-6 text-indigo-300" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-300 font-black">
                    Attending Physician Review Queue
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-xs font-mono font-bold">
                    {displayPendingBedRequests.length} Awaiting Authorization
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold">
                    Non-Serious Patient Protocol Active
                  </span>
                </div>
                <p className="text-xs text-indigo-200/90 mt-0.5 font-medium">
                  Stable and non-serious patients are routed directly to your profile for clinical review & approval instead of auto-assigning beds immediately.
                </p>
              </div>
            </div>

            {/* Scope Filter Switcher */}
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 text-xs font-bold self-stretch md:self-auto shrink-0">
              <button
                type="button"
                onClick={() => setRequestsViewScope('my-assigned')}
                className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  requestsViewScope === 'my-assigned'
                    ? 'bg-white text-indigo-950 shadow-md font-black'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Routed to You ({myPendingBedRequests.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setRequestsViewScope('all')}
                className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  requestsViewScope === 'all'
                    ? 'bg-white text-indigo-950 shadow-md font-black'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>All Hospital Requests ({allPendingBedRequests.length})</span>
              </button>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="p-4 sm:p-6 space-y-4">
            {displayPendingBedRequests.length === 0 ? (
              <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-indigo-200 text-slate-600 text-xs">
                No non-serious bed assignment requests currently routed specifically to your profile.
                <button
                  type="button"
                  onClick={() => setRequestsViewScope('all')}
                  className="ml-2 font-bold text-indigo-700 underline cursor-pointer"
                >
                  View all hospital bed requests awaiting review ({allPendingBedRequests.length})
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {displayPendingBedRequests.map((p) => {
                  const isAssignedToThisDoctor =
                    p.assignedDoctorId === doctor.id ||
                    p.assignedDoctorName?.toLowerCase() === doctor.name.toLowerCase() ||
                    p.assignedDoctorName?.toLowerCase().includes(doctor.name.toLowerCase().replace('dr. ', '').trim());

                  const req = p.bedAssignmentRequest;
                  const suggestedWard = req?.suggestedWard || p.ward || p.department || 'General Ward';
                  const suggestedBedNumber = req?.suggestedBedNumber || 'GW-02';
                  const suggestedRoomNumber = req?.suggestedRoomNumber || 'Room 202';

                  return (
                    <div
                      key={p.id}
                      id={`pending-bed-request-card-${p.id}`}
                      className="relative rounded-2xl bg-white border-2 border-indigo-300 p-5 sm:p-6 shadow-md shadow-indigo-500/5 flex flex-col justify-between transition-all hover:border-indigo-500 hover:shadow-lg"
                    >
                      <div>
                        {/* Top Bar: Badges */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-indigo-100">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-black tracking-wide shadow-xs uppercase">
                              <ClipboardList className="w-3 h-3" />
                              DOCTOR REVIEW REQUIRED
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                              <span className="w-2 h-2 rounded-full bg-emerald-500" />
                              NOT SERIOUS (Severity {p.severity || 4}/10)
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold">
                              {p.triageLevel || 'NON-URGENT'} Priority
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Requested {formatTimeAgo(req?.requestedAt || p.createdAt)}</span>
                          </div>
                        </div>

                        {/* High-Contrast Proposed Bed Coordinates Box */}
                        <div className="mb-4 bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-inner border border-indigo-700/50">
                          <div className="text-[10px] uppercase font-mono tracking-widest text-indigo-300 mb-3 font-bold flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                              Proposed Bed Allocation Coordinates
                            </span>
                            <span className="text-amber-300 font-bold flex items-center gap-1 text-[11px]">
                              <Clock className="w-3 h-3 animate-pulse" />
                              Pending Physician Approval
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 block mb-0.5">
                                Suggested Room
                              </span>
                              <span className="text-lg sm:text-xl font-black text-white block tracking-tight">
                                {suggestedRoomNumber}
                              </span>
                              <span className="text-[10px] text-indigo-200 block truncate mt-0.5">
                                Standard Recovery
                              </span>
                            </div>

                            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 block mb-0.5">
                                Suggested Ward
                              </span>
                              <span className="text-base sm:text-lg font-black text-white block">
                                {suggestedWard}
                              </span>
                              <span className="text-[10px] text-slate-300 block truncate mt-0.5">
                                Inpatient Floor
                              </span>
                            </div>

                            <div className="bg-indigo-600/30 backdrop-blur-xs rounded-xl p-3 border border-indigo-400/40">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-200 block mb-0.5">
                                Candidate Bed
                              </span>
                              <span className="text-xl sm:text-2xl font-black font-mono text-white block tracking-wider">
                                {suggestedBedNumber}
                              </span>
                              <span className="text-[10px] text-emerald-300 font-bold block uppercase tracking-wider mt-0.5">
                                Vacant & Ready
                              </span>
                            </div>

                            <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/10">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300 block mb-0.5">
                                Attending Physician
                              </span>
                              <span className="text-xs sm:text-sm font-black text-amber-300 block truncate">
                                {p.assignedDoctorName || doctor.name}
                              </span>
                              <span className="text-[10px] text-emerald-300 font-bold block mt-0.5 flex items-center gap-1 truncate">
                                <Check className="w-3 h-3" />
                                {isAssignedToThisDoctor ? 'Assigned to You' : 'Assigned Attending'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Patient Demographics & Clinical Presentation */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                              Patient Profile
                            </span>
                            <div className="font-extrabold text-slate-900 text-sm">{p.name}</div>
                            <div className="text-xs text-slate-600 mt-0.5">
                              {p.age} years old • {p.gender} • MRN: {p.id.toUpperCase()}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1">
                              Duration of Symptoms: <strong>{p.duration || 'Not specified'}</strong>
                            </div>
                          </div>

                          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                              Medical History & Medications
                            </span>
                            <div className="text-xs text-slate-700">
                              <span className="font-semibold text-slate-500">History: </span>
                              {p.medicalHistory && p.medicalHistory.length > 0 ? p.medicalHistory.join(', ') : 'None reported'}
                            </div>
                            <div className="text-xs text-slate-700 mt-1">
                              <span className="font-semibold text-slate-500">Meds: </span>
                              {p.currentMedications && p.currentMedications.length > 0 ? p.currentMedications.join(', ') : 'None'}
                            </div>
                          </div>
                        </div>

                        {/* Reported Symptoms */}
                        <div className="bg-indigo-50/40 rounded-xl p-3 border border-indigo-100 text-xs">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-900 block mb-1">
                            Reported Symptoms & Triage Intake
                          </span>
                          <p className="text-slate-800 font-medium leading-relaxed">{p.symptomsRaw}</p>
                          {p.symptomsStructured && p.symptomsStructured.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {p.symptomsStructured.map((sym, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 rounded-md bg-indigo-100/80 text-indigo-900 text-[10px] font-bold"
                                >
                                  {sym}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Doctor Action Toolbar */}
                      <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2.5">
                        {/* Approve Bed Assignment Button */}
                        <button
                          type="button"
                          id={`approve-bed-btn-${p.id}`}
                          onClick={() => handleOpenApproveModal(p)}
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve & Assign Bed</span>
                        </button>

                        {/* Decline / Route to Ambulatory */}
                        <button
                          type="button"
                          id={`decline-bed-btn-${p.id}`}
                          onClick={() => handleOpenDeclineModal(p)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <XCircle className="w-4 h-4 text-amber-600" />
                          <span>Decline / Outpatient Care</span>
                        </button>

                        {/* View Assessment Sheet */}
                        <button
                          type="button"
                          onClick={() => setViewingAssessmentPatient(p)}
                          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Clinical Sheet</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Critical Patient Emergency Alert Banner */}
      {criticalWaitingPatients.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border-2 border-red-500 text-red-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0">
              <AlertOctagon className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-red-600">
                  Critical Emergency Alert
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-600 text-white">
                  {criticalWaitingPatients.length} Critical Case(s) Waiting
                </span>
              </div>
              <p className="text-xs text-red-800 font-medium mt-0.5">
                {criticalWaitingPatients.map((p) => `${p.name} (${p.symptomsStructured[0] || 'Severe Symptoms'})`).join(', ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleDirectAssignBed(criticalWaitingPatients[0].id)}
              disabled={isDirectAssigning}
              className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-black shadow-md transition-colors shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Direct Assign Bed Now</span>
            </button>
            <button
              onClick={() => {
                setOverrideUrgentPatientId(criticalWaitingPatients[0].id);
                setShowOverrideModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-red-50 text-red-700 border border-red-300 text-xs font-bold transition-colors shrink-0 cursor-pointer"
            >
              Emergency Override &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Sub-navigation tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 mb-6 text-xs font-bold overflow-x-auto">
        <button
          id="tab-btn-intake-roster"
          onClick={() => setActiveTab('patients')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'patients'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Patient Intake Roster ({patients.length})</span>
        </button>

        <button
          id="tab-btn-pending-requests"
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'requests'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Pending Bed Requests</span>
          {allPendingBedRequests.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'requests' ? 'bg-white text-indigo-900' : 'bg-indigo-100 text-indigo-800'
              }`}
            >
              {allPendingBedRequests.length}
            </span>
          )}
        </button>

        <button
          id="tab-btn-bed-allocations"
          onClick={() => setActiveTab('beds')}
          className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'beds'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BedIcon className="w-4 h-4" />
          <span>Quick Bed Allocations</span>
        </button>
      </div>

      {/* Main Content View */}
      {activeTab === 'requests' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-indigo-200 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-indigo-600" />
                  <span>Bed Assignment Requests Awaiting Doctor Authorization</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                    {displayPendingBedRequests.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Non-serious cases do not consume hospital beds automatically. As attending physician, evaluate clinical status and authorize admission or direct to outpatient care.
                </p>
              </div>

              {/* View Scope Toggle */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setRequestsViewScope('my-assigned')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    requestsViewScope === 'my-assigned'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>My Assigned ({myPendingBedRequests.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRequestsViewScope('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    requestsViewScope === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>All Hospital ({allPendingBedRequests.length})</span>
                </button>
              </div>
            </div>

            {displayPendingBedRequests.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-slate-700">No pending requests in this view</p>
                <p className="text-slate-400 mt-0.5">All bed assignment requests have been processed.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 mt-2">
                {displayPendingBedRequests.map((p) => {
                  const req = p.bedAssignmentRequest;
                  return (
                    <div key={p.id} className="py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900 text-base">{p.name}</span>
                          <span className="text-xs text-slate-500 font-medium">
                            {p.age}y • {p.gender}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                            Severity {p.severity || 4}/10 (Stable)
                          </span>
                          <span className="text-xs text-slate-400">
                            Requested {formatTimeAgo(req?.requestedAt || p.createdAt)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                          <strong className="text-slate-700">Symptoms: </strong>{p.symptomsRaw}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                            Suggested: <strong>{req?.suggestedRoomNumber || 'Room 202'} • {req?.suggestedBedNumber || 'GW-02'}</strong> ({req?.suggestedWard || 'General Ward'})
                          </span>
                          <span>Attending: <strong className="text-slate-700">{p.assignedDoctorName || doctor.name}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenApproveModal(p)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve Bed</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenDeclineModal(p)}
                          className="px-3.5 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <XCircle className="w-4 h-4 text-amber-600" />
                          <span>Decline / Outpatient</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewingAssessmentPatient(p)}
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          title="View clinical assessment"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'patients' ? (
        <div className="space-y-6">
          {/* Section 1: Waiting Room & AI Triage Cases */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Waiting Room (Pending Bed Allocation)</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                  {waitingPatients.length}
                </span>
              </h3>
            </div>

            {waitingPatients.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
                No patients currently awaiting bed allocation.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {waitingPatients.map((p) => (
                  <div
                    key={p.id}
                    className={`bg-white rounded-2xl border p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md ${
                      p.triageLevel === 'CRITICAL'
                        ? 'border-red-300 ring-2 ring-red-500/10'
                        : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{p.name}</h4>
                          <span className="text-[11px] text-slate-500">
                            Queue Pos: #{p.queuePosition || 1} • {p.duration}
                          </span>
                        </div>
                        {getTriageBadge(p.triageLevel)}
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 my-2 text-xs border border-slate-100">
                        <span className="font-bold text-slate-700 block mb-1">Symptoms Reported:</span>
                        <p className="text-slate-600 line-clamp-2">{p.symptomsRaw}</p>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                        <span>Severity: {p.severity}/10</span>
                        <span>Dept: {p.department}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                      {p.triageLevel === 'CRITICAL' ? (
                        <>
                          <button
                            onClick={() => handleDirectAssignBed(p.id)}
                            disabled={isDirectAssigning}
                            className="flex-1 py-2 px-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-black text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                          >
                            <Zap className="w-3.5 h-3.5 fill-current" />
                            <span>Direct Assign</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPatient(p);
                              setShowAssignBedModal(true);
                            }}
                            className="py-2 px-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer"
                            title="Select bed manually"
                          >
                            Manual
                          </button>
                          <button
                            onClick={() => {
                              setOverrideUrgentPatientId(p.id);
                              setShowOverrideModal(true);
                            }}
                            className="py-2 px-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs border border-red-200 transition-colors cursor-pointer"
                            title="Emergency override"
                          >
                            Override
                          </button>
                        </>
                      ) : p.bedRequestStatus === 'pending_doctor_review' ? (
                        <div className="flex items-center gap-1.5 w-full">
                          <button
                            onClick={() => handleOpenApproveModal(p)}
                            className="flex-1 py-2 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Review & Approve</span>
                          </button>
                          <button
                            onClick={() => handleOpenDeclineModal(p)}
                            className="py-2 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300 transition-colors cursor-pointer"
                            title="Decline / Route to Outpatient"
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedPatient(p);
                            setShowAssignBedModal(true);
                          }}
                          className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Assign Bed</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Admitted Patients */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <BedIcon className="w-4 h-4 text-emerald-600" />
                <span>Admitted Patients Across Wards</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
                  {admittedPatients.length}
                </span>
              </h3>
            </div>

            {admittedPatients.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
                No patients currently admitted in this facility.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {admittedPatients.map((p) => {
                  const isDirect =
                    p.isDirectAllocation ||
                    p.triageLevel === 'CRITICAL' ||
                    (p.severity !== undefined && p.severity >= 7);

                  return (
                    <div
                      key={p.id}
                      className={`bg-white rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all ${
                        isDirect
                          ? 'border-2 border-red-400 bg-linear-to-b from-red-50/40 via-white to-white ring-1 ring-red-300/50'
                          : 'border border-slate-200'
                      }`}
                    >
                      <div>
                        {/* Direct Allocation Pill if applicable */}
                        {isDirect && (
                          <div className="mb-2.5 flex items-center justify-between gap-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                              <Zap className="w-3 h-3 fill-current" />
                              Direct Bed Allocation
                            </span>
                            {p.acknowledgedByDoctor ? (
                              <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600" />
                                Care Active
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-red-600 flex items-center gap-1 animate-pulse">
                                <AlertTriangle className="w-3 h-3 text-red-500" />
                                Unacknowledged
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-900 text-sm">{p.name}</h4>
                              <span
                                className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${
                                  isDirect
                                    ? 'bg-red-100 text-red-800 border border-red-300'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {p.bedNumber}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500">{p.ward}</span>
                          </div>
                          {getTriageBadge(p.triageLevel)}
                        </div>

                        {/* Direct Details Box: Room, Ward, Bed, Attending Doctor */}
                        <div className="my-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] space-y-1">
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="font-medium">Room Number:</span>
                            <span className="font-black text-slate-900">{p.roomNumber || 'Assigned Suite'}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="font-medium">Ward:</span>
                            <span className="font-bold text-slate-800">{p.ward}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600">
                            <span className="font-medium">Bed Number:</span>
                            <span className="font-mono font-black text-red-700">{p.bedNumber}</span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                            <span className="font-medium">Attending:</span>
                            <span className="font-bold text-blue-700 flex items-center gap-1">
                              <Stethoscope className="w-3 h-3 text-blue-600" />
                              {p.assignedDoctorName || doctor.name}
                            </span>
                          </div>
                        </div>

                        {p.dischargeReason && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold my-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                            <span>Status: {p.dischargeReason}</span>
                          </div>
                        )}

                        <p className="text-xs text-slate-600 mt-2 line-clamp-2">{p.notes || p.symptomsRaw}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
                        {isDirect && !p.acknowledgedByDoctor && (
                          <button
                            type="button"
                            onClick={() => handleAcknowledgePatient(p)}
                            disabled={isAcknowledgingId === p.id}
                            className="w-full py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>{isAcknowledgingId === p.id ? 'Confirming...' : 'Acknowledge Care'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setViewingAssessmentPatient(p)}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Assessment</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPatient(p);
                            setShowDischargeModal(true);
                          }}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 font-bold text-xs border border-slate-200 hover:border-amber-300 transition-colors cursor-pointer flex items-center justify-center gap-1"
                        >
                          <FileCheck className="w-3 h-3" />
                          <span>Discharge</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Quick Beds Overview Tab */
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Bed Allocation Matrix Overview</h3>
              <p className="text-xs text-slate-500">Live view of immediate vacancies</p>
            </div>
            <button
              onClick={onOpenLiveBedBoard}
              className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>Full Ward Breakdown</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
            {beds.slice(0, 24).map((b) => (
              <div
                key={b.id}
                className={`p-2.5 rounded-xl border text-center text-xs ${
                  b.status === 'vacant'
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                    : b.status === 'occupied'
                    ? 'bg-red-50/60 border-red-200 text-red-800'
                    : 'bg-purple-50/60 border-purple-200 text-purple-800'
                }`}
              >
                <span className="font-mono font-black text-xs block">{b.bedNumber}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">
                  {b.status}
                </span>
                {b.patientName && <span className="text-[10px] truncate block mt-0.5">{b.patientName}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: Emergency Bed Allocation Override */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-red-600">
                <AlertOctagon className="w-6 h-6" />
                <h3 className="text-lg font-black tracking-tight text-slate-900">
                  EMERGENCY BED ALLOCATION OVERRIDE
                </h3>
              </div>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong>CLINICAL WARNING:</strong> This action triggers an atomic bed reallocation, discharging a stabilized patient or overriding vacancy to admit an acute emergency case immediately.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Select Urgent Patient */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  1. SELECT URGENT PATIENT (CRITICAL / WAITING):
                </label>
                <select
                  value={overrideUrgentPatientId}
                  onChange={(e) => setOverrideUrgentPatientId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-medium text-slate-800"
                >
                  <option value="">-- Choose Urgent Patient --</option>
                  {waitingPatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      [{p.triageLevel}] {p.name} - Severity {p.severity}/10 ({p.department})
                    </option>
                  ))}
                </select>
              </div>

              {/* Patient to Discharge / Step Down */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  2. PATIENT TO DISCHARGE / STEP-DOWN (Filter by Status: Ready / Recovered):
                </label>
                <select
                  value={overrideDischargePatientId}
                  onChange={(e) => {
                    setOverrideDischargePatientId(e.target.value);
                    const found = admittedPatients.find((p) => p.id === e.target.value);
                    if (found && found.bedId) {
                      setOverrideTargetBedId(found.bedId);
                    }
                  }}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-medium text-slate-800"
                >
                  <option value="">-- None (Assign to Vacant Bed Below) --</option>
                  {admittedPatients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Bed: {p.bedNumber} - {p.ward}) [{p.dischargeReason || 'Admitted'}]
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Bed Assignment */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  3. TARGET BED ASSIGNMENT:
                </label>
                <select
                  value={overrideTargetBedId}
                  onChange={(e) => setOverrideTargetBedId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-mono font-bold text-slate-800"
                >
                  <option value="">-- Select Target Bed --</option>
                  {beds.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bedNumber} ({b.ward}) - [{b.status.toUpperCase()}] {b.patientName ? `(Occ: ${b.patientName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Doctor Clinical Notes */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  4. ATTENDING DOCTOR CLINICAL REASONING / NOTES:
                </label>
                <textarea
                  rows={3}
                  value={overrideDoctorNotes}
                  onChange={(e) => setOverrideDoctorNotes(e.target.value)}
                  placeholder="State medical justification for emergency bed reallocation..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-800 resize-none font-medium"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isExecutingOverride || !overrideUrgentPatientId || !overrideTargetBedId}
                onClick={handleConfirmEmergencyOverride}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md shadow-red-600/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isExecutingOverride ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Executing Reallocation...</span>
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>Confirm Emergency Override</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Standard Discharge Modal */}
      {showDischargeModal && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Initiate Patient Discharge</h3>
              <button
                onClick={() => setShowDischargeModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 text-xs space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block">Patient Name</span>
                <span className="font-bold text-slate-900 text-sm">{selectedPatient.name}</span>
                <span className="text-slate-500 block mt-1">
                  Bed: {selectedPatient.bedNumber} ({selectedPatient.ward})
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Discharge Category</label>
                <select
                  value={dischargeReason}
                  onChange={(e) => setDischargeReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs"
                >
                  <option value="Clinical Recovery">Clinical Recovery (Full Discharge)</option>
                  <option value="Transfer to Step-down">Transfer to Step-down</option>
                  <option value="Outpatient Followup">Outpatient Follow-up Care</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Discharge Summary & Instructions</label>
                <textarea
                  rows={3}
                  value={dischargeNotes}
                  onChange={(e) => setDischargeNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                Notice: Processing discharge will automatically update bed status to <strong>"Cleaning in Progress"</strong> for 15 minutes.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowDischargeModal(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDischarge}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Process Discharge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Assign Bed to Waiting Patient */}
      {showAssignBedModal && selectedPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Assign Inpatient Bed</h3>
              <button
                onClick={() => setShowAssignBedModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 text-xs space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 block">Patient Name</span>
                <span className="font-bold text-slate-900 text-sm">{selectedPatient.name}</span>
                <span className="text-slate-500 block mt-0.5">
                  Triage: {selectedPatient.triageLevel} • Recommended: {selectedPatient.department}
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Vacant Bed</label>
                <select
                  value={assignBedId}
                  onChange={(e) => setAssignBedId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-300 font-mono text-xs font-bold"
                >
                  <option value="">-- Choose Vacant Bed --</option>
                  {vacantBeds.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bedNumber} - {b.ward}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setShowAssignBedModal(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!assignBedId}
                onClick={handleConfirmAssignBed}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirm Admission
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clinical Assessment Sheet Modal */}
      {viewingAssessmentPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900">
                    Clinical Inpatient Assessment & Bed Allocation Record
                  </h3>
                  <p className="text-xs text-slate-500">
                    MRN: {viewingAssessmentPatient.id.toUpperCase()} • Direct Triage Intake
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingAssessmentPatient(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-5 space-y-4 text-xs">
              {/* Physical Bed Allocation Coordinates */}
              <div className="p-4 rounded-2xl bg-linear-to-r from-red-900 to-slate-900 text-white border border-red-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono tracking-widest text-red-300 uppercase font-bold">
                    Official Bed Stamping Coordinates
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-red-600 text-[10px] font-bold text-white uppercase">
                    High Alert Allocation
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Room</span>
                    <span className="text-base font-black text-white">
                      {viewingAssessmentPatient.roomNumber || 'Assigned Suite'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Ward</span>
                    <span className="text-base font-black text-white">{viewingAssessmentPatient.ward}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Bed Number</span>
                    <span className="text-xl font-mono font-black text-red-300">
                      {viewingAssessmentPatient.bedNumber}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Attending</span>
                    <span className="text-sm font-bold text-amber-300 truncate block">
                      {viewingAssessmentPatient.assignedDoctorName || doctor.name}
                    </span>
                  </div>
                </div>
                {viewingAssessmentPatient.locationInstructions && (
                  <div className="mt-3 pt-2 border-t border-white/10 text-[11px] text-slate-300 flex items-start gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span>{viewingAssessmentPatient.locationInstructions}</span>
                  </div>
                )}
              </div>

              {/* Patient Demographics & Acuity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Patient Profile
                  </span>
                  <p className="font-bold text-slate-900 text-sm">{viewingAssessmentPatient.name}</p>
                  <p className="text-slate-600 text-xs mt-0.5">
                    {viewingAssessmentPatient.age} years old • {viewingAssessmentPatient.gender}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Acuity Evaluation
                  </span>
                  <div className="flex items-center gap-2">
                    {getTriageBadge(viewingAssessmentPatient.triageLevel)}
                    <span className="text-xs font-bold text-slate-700">
                      Severity: {viewingAssessmentPatient.severity || 'N/A'}/10
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Bypassed waitlist due to acute severity criteria.
                  </p>
                </div>
              </div>

              {/* Clinical Presentation & Chief Complaint */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Reported Chief Complaint & Symptoms
                </span>
                <p className="text-slate-900 font-semibold leading-relaxed">
                  {viewingAssessmentPatient.symptomsRaw}
                </p>
                {viewingAssessmentPatient.symptomsStructured &&
                  viewingAssessmentPatient.symptomsStructured.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {viewingAssessmentPatient.symptomsStructured.map((sym, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-0.5 rounded-md bg-white border border-slate-300 text-slate-800 text-[11px] font-bold"
                        >
                          {sym}
                        </span>
                      ))}
                    </div>
                  )}
              </div>

              {/* Medical History & Current Medications */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Pre-Existing Medical History
                  </span>
                  {viewingAssessmentPatient.medicalHistory && viewingAssessmentPatient.medicalHistory.length > 0 ? (
                    <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                      {viewingAssessmentPatient.medicalHistory.map((hist, i) => (
                        <li key={i}>{hist}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-slate-400 italic">None reported</span>
                  )}
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                    Current Medications
                  </span>
                  {viewingAssessmentPatient.currentMedications &&
                  viewingAssessmentPatient.currentMedications.length > 0 ? (
                    <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                      {viewingAssessmentPatient.currentMedications.map((med, i) => (
                        <li key={i}>{med}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-slate-400 italic">None recorded</span>
                  )}
                </div>
              </div>

              {/* Physician Electronic Sign-off */}
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <Stethoscope className="w-5 h-5 text-blue-600" />
                  <div>
                    <span className="font-bold text-blue-900 block">
                      Attending Physician: {viewingAssessmentPatient.assignedDoctorName || doctor.name}
                    </span>
                    <span className="text-[11px] text-blue-700">
                      Medical Staff ID: {doctor.licenseNumber} • {doctor.hospitalName}
                    </span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Physician Order Authenticated
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center gap-2 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Clinical Record</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingAssessmentPatient(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stat Clinical Orders Modal */}
      {statOrderPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center">
                  <Syringe className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Dispatch Stat Emergency Protocol</h3>
                  <p className="text-[11px] text-slate-500">
                    Bed {statOrderPatient.bedNumber} • {statOrderPatient.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStatOrderPatient(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-4 text-xs space-y-3">
              <p className="text-slate-600">
                Select critical order protocol to immediately notify unit nursing and diagnostic labs:
              </p>

              <div className="space-y-2">
                {[
                  'Stat 12-Lead ECG & High-Sensitivity Troponin I',
                  'Stat CT Angiogram Pulmonary / Aorta',
                  'Bedside Focused Cardiac Ultrasound (POCUS) & Echo',
                  'IV Crystalloid Bolus (30mL/kg) + Norepinephrine Infusion',
                  'Point-of-Care Arterial Blood Gas (ABG) & Lactate Panel',
                  'Stat Type & Screen with Emergency Blood Transfusion',
                ].map((orderOption) => (
                  <label
                    key={orderOption}
                    className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                      selectedStatOrder === orderOption
                        ? 'bg-red-50/80 border-red-400 text-red-900 font-bold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="statOrderOption"
                      checked={selectedStatOrder === orderOption}
                      onChange={() => setSelectedStatOrder(orderOption)}
                      className="text-red-600 focus:ring-red-500 cursor-pointer"
                    />
                    <span>{orderOption}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setStatOrderPatient(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmStatOrder}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md shadow-red-600/20 cursor-pointer flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Dispatch Order Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Approve Bed Assignment Request Modal */}
      {approvingRequestPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-indigo-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Approve Bed Assignment Request
                  </h3>
                  <p className="text-xs text-slate-500">
                    Attending Authorization for Inpatient Admission
                  </p>
                </div>
              </div>
              <button
                onClick={() => setApprovingRequestPatient(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-5 space-y-4 text-xs">
              {/* Patient Card */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm">
                      {approvingRequestPatient.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      Severity {approvingRequestPatient.severity || 4}/10 (Stable)
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1">
                    {approvingRequestPatient.age}y • {approvingRequestPatient.gender} • Symptoms: {approvingRequestPatient.symptomsRaw}
                  </p>
                </div>
              </div>

              {/* Bed Selection */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Select Inpatient Bed:
                </label>
                <select
                  id="approve-bed-select"
                  value={approvingBedId}
                  onChange={(e) => setApprovingBedId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="">-- Best Available Vacant Bed (Auto-Select) --</option>
                  {beds
                    .filter((b) => b.status === 'vacant')
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.roomNumber ? `Room ${b.roomNumber} • ` : ''}Bed {b.bedNumber} ({b.ward})
                      </option>
                    ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Vacant beds in General Ward & Telemetry are pre-filtered for stable admissions.
                </p>
              </div>

              {/* Physician Review Notes */}
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Physician Admission & Clinical Justification Notes:
                </label>
                <textarea
                  id="approve-review-notes"
                  rows={3}
                  value={approvingReviewNotes}
                  onChange={(e) => setApprovingReviewNotes(e.target.value)}
                  placeholder="Enter clinical assessment, admission orders, or monitoring plan..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden leading-relaxed"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  <span>Attending Physician Sign-off: {doctor.name} ({doctor.licenseNumber})</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Approving this request will immediately assign the patient to the designated bed, transition their status to Admitted, and log an authenticated admission audit record.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApprovingRequestPatient(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-approve-bed-btn"
                onClick={handleConfirmApproveBedRequest}
                disabled={isSubmittingApproval}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmittingApproval ? 'Approving...' : 'Confirm & Authorize Bed Admission'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Decline Bed Assignment Request Modal */}
      {decliningRequestPatient && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-amber-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
                  <XCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Decline Bed Assignment Request
                  </h3>
                  <p className="text-xs text-slate-500">
                    Route Stable Patient to Outpatient or Ambulatory Care
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDecliningRequestPatient(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-5 space-y-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200">
                <span className="font-extrabold text-amber-950 block text-sm">
                  {decliningRequestPatient.name} (Severity {decliningRequestPatient.severity || 4}/10)
                </span>
                <p className="text-amber-900 mt-0.5">
                  Symptoms: {decliningRequestPatient.symptomsRaw}
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-2">
                  Clinical Disposition / Alternative Care Pathway:
                </label>
                <div className="space-y-2">
                  {[
                    'Outpatient Specialist Follow-up',
                    'Discharge with Oral Prescription & 48h Home Care',
                    'Ambulatory Observation Only (No Inpatient Bed)',
                    'Transfer to Primary Care Community Clinic',
                  ].map((decisionOption) => (
                    <label
                      key={decisionOption}
                      className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        decliningDecision === decisionOption
                          ? 'bg-amber-50/90 border-amber-400 text-amber-950 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name="decliningDecisionRadio"
                        checked={decliningDecision === decisionOption}
                        onChange={() => setDecliningDecision(decisionOption)}
                        className="text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                      <span>{decisionOption}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">
                  Physician Rationale & Discharge / Routing Notes:
                </label>
                <textarea
                  id="decline-review-notes"
                  rows={3}
                  value={decliningNotes}
                  onChange={(e) => setDecliningNotes(e.target.value)}
                  placeholder="Explain why inpatient bed is not clinically required..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDecliningRequestPatient(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-decline-bed-btn"
                onClick={handleConfirmDeclineBedRequest}
                disabled={isSubmittingDecline}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-md shadow-amber-600/20 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>{isSubmittingDecline ? 'Declining...' : 'Confirm Routing Decision'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
