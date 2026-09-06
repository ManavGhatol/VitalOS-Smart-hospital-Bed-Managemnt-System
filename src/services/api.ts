import type {
  DoctorUser,
  Patient,
  Bed,
  ActivityLog,
  DashboardMetrics,
  EmergencyOverridePayload,
  BedAssignmentRequest,
} from '../types';

export const API_BASE = '';

export async function fetchMetrics(): Promise<DashboardMetrics> {
  const res = await fetch('/api/admin/dashboard');
  if (!res.ok) throw new Error('Failed to fetch metrics');
  const data = await res.json();
  return data.metrics;
}

export const fetchDashboardMetrics = fetchMetrics;

export function subscribeToLiveEvents(
  onEvent: (event: { type: string; data: any }) => void
): () => void {
  try {
    const eventSource = new EventSource('/api/events');

    eventSource.onmessage = (e) => {
      try {
        const parsed = JSON.parse(e.data);
        onEvent(parsed);
      } catch (err) {
        console.warn('Notice parsing SSE event data:', err);
      }
    };

    eventSource.onerror = (err) => {
      // EventSource reconnects automatically
      console.warn('SSE connection warning:', err);
    };

    return () => {
      eventSource.close();
    };
  } catch (err) {
    console.warn('SSE not supported or failed to initialize:', err);
    return () => {};
  }
}

export async function fetchBeds(): Promise<{ beds: Bed[]; metrics: DashboardMetrics }> {
  const res = await fetch('/api/beds');
  if (!res.ok) throw new Error('Failed to fetch beds');
  return res.json();
}

export async function fetchDoctors(): Promise<{ doctors: DoctorUser[] }> {
  const res = await fetch('/api/doctors');
  if (!res.ok) throw new Error('Failed to fetch doctors');
  return res.json();
}

export async function fetchPatients(doctorId?: string): Promise<{ patients: Patient[] }> {
  const url = doctorId ? `/api/doctor/patients?doctorId=${encodeURIComponent(doctorId)}` : '/api/doctor/patients';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch patients');
  return res.json();
}

export async function submitTriageChat(payload: {
  patientName: string;
  message: string;
  chatHistory: { sender: 'ai' | 'user'; text: string }[];
  age?: number;
  gender?: string;
}) {
  const res = await fetch('/api/patient/triage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Triage processing failed');
  }
  return res.json();
}

export async function transcribePatientAudio(payload: {
  audioBase64: string;
  mimeType?: string;
}): Promise<{
  transcript: string;
  language: string;
  englishTranslation?: string;
}> {
  const res = await fetch('/api/patient/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Speech transcription failed');
  }
  return res.json();
}

export async function doctorLogin(credentials: { email: string; password: string }) {
  const res = await fetch('/api/doctor/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Authentication failed');
  }
  return res.json();
}

export async function doctorRegister(doctorData: {
  name: string;
  email: string;
  licenseNumber: string;
  hospitalName: string;
  department: string;
  password: string;
}) {
  const res = await fetch('/api/doctor/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(doctorData),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Registration failed');
  }
  return res.json();
}

export async function executeEmergencyOverride(payload: EmergencyOverridePayload) {
  const res = await fetch('/api/doctor/emergency-override', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Emergency override failed');
  }
  return res.json();
}

export async function dischargePatient(
  patientId: string,
  details: { doctorName: string; dischargeReason: string; dischargeNotes: string }
) {
  const res = await fetch(`/api/doctor/discharge/${encodeURIComponent(patientId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(details),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Discharge request failed');
  }
  return res.json();
}

export async function assignBedToPatient(patientId: string, bedId: string, doctorName: string) {
  const res = await fetch('/api/doctor/assign-bed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientId, bedId, doctorName }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Bed assignment failed');
  }
  return res.json();
}

export async function updateBedStatus(bedId: string, status: string, notes?: string) {
  const res = await fetch(`/api/beds/${encodeURIComponent(bedId)}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update bed status');
  }
  return res.json();
}

export async function fetchAdminDashboard(): Promise<{
  metrics: DashboardMetrics;
  recentRegistrations: DoctorUser[];
  activityLogs: ActivityLog[];
  patients: Patient[];
}> {
  const res = await fetch('/api/admin/dashboard');
  if (!res.ok) throw new Error('Failed to fetch admin dashboard');
  return res.json();
}

export async function updateDoctorStatus(userId: string, status: 'approved' | 'blocked') {
  const res = await fetch(`/api/admin/user/${encodeURIComponent(userId)}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update doctor status');
  }
  return res.json();
}

export async function fetchPatientStatus(patientId: string): Promise<{
  patient: Patient;
  bed?: Bed;
  isAllocated: boolean;
  roomNumber?: string;
  bedNumber?: string;
  ward?: string;
  floor?: string;
  locationInstructions?: string;
  assignedDoctorName?: string;
}> {
  const res = await fetch(`/api/patient/status/${encodeURIComponent(patientId)}`);
  if (!res.ok) throw new Error('Failed to fetch patient status');
  return res.json();
}

export async function allocateBestBedForPatient(
  patientId: string,
  doctorName?: string,
  preferredWard?: string,
  isDoctorApproval?: boolean
): Promise<{
  success: boolean;
  patient: Patient;
  bed?: Bed;
  routedToDoctor?: boolean;
  requiresDoctorApproval?: boolean;
  message?: string;
  request?: BedAssignmentRequest;
}> {
  const res = await fetch('/api/patient/allocate-best-bed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patientId, doctorName, preferredWard, isDoctorApproval }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to allocate bed');
  }
  return res.json();
}

export async function fetchPendingBedRequests(doctorId?: string): Promise<{
  requests: BedAssignmentRequest[];
  patients: Patient[];
}> {
  const url = doctorId
    ? `/api/doctor/bed-requests?doctorId=${encodeURIComponent(doctorId)}`
    : '/api/doctor/bed-requests';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch pending bed requests');
  return res.json();
}

export async function approveBedRequest(payload: {
  patientId: string;
  doctorName: string;
  doctorId?: string;
  bedId?: string;
  reviewNotes?: string;
}): Promise<{ success: boolean; patient: Patient; bed: Bed }> {
  const res = await fetch('/api/doctor/approve-bed-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to approve bed request');
  }
  return res.json();
}

export async function declineBedRequest(payload: {
  patientId: string;
  doctorName: string;
  doctorId?: string;
  decision?: string;
  physicianNotes?: string;
}): Promise<{ success: boolean; patient: Patient }> {
  const res = await fetch('/api/doctor/decline-bed-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to decline bed request');
  }
  return res.json();
}

export async function acknowledgeDirectBedPatient(payload: {
  patientId: string;
  doctorName: string;
  doctorId?: string;
  action?: string;
}): Promise<{ success: boolean; patient: Patient }> {
  const res = await fetch('/api/doctor/acknowledge-patient', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to acknowledge patient');
  }
  return res.json();
}


