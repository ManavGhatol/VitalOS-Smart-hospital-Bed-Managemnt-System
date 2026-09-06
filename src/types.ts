export type UserRole = 'doctor' | 'patient' | 'admin';

export type TriageLevel = 'CRITICAL' | 'URGENT' | 'NON-URGENT';

export type BedStatus = 'vacant' | 'occupied' | 'reserved' | 'cleaning';

export type WardType = 'ICU' | 'General Ward' | 'Emergency' | 'Recovery' | 'OPD';

export type PatientStatus = 'Waiting' | 'Admitted' | 'Discharged' | 'In Triage';

export type BedRequestStatus = 'pending_doctor_review' | 'approved' | 'declined' | 'none';

export interface BedAssignmentRequest {
  id: string;
  patientId: string;
  patientName: string;
  age?: number;
  gender?: string;
  triageLevel: TriageLevel;
  severity: number;
  department: string;
  symptomsRaw: string;
  symptomsStructured: string[];
  duration: string;
  medicalHistory: string[];
  currentMedications: string[];
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  suggestedWard?: WardType;
  suggestedBedId?: string;
  suggestedBedNumber?: string;
  suggestedRoomNumber?: string;
  status: 'pending' | 'approved' | 'declined';
  requestedAt: string;
  reviewedAt?: string;
  reviewedByDoctorName?: string;
  reviewDecision?: 'approved_bed' | 'declined_outpatient' | 'declined_observation';
  physicianReviewNotes?: string;
}

export interface DoctorUser {
  id: string;
  name: string;
  email: string;
  role: 'doctor';
  licenseNumber: string;
  hospitalName: string;
  department: string;
  status: 'approved' | 'pending' | 'blocked';
  createdAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin';
  createdAt: string;
}

export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  age?: number;
  gender?: string;
  symptomsRaw: string;
  symptomsStructured: string[];
  duration: string;
  severity: number; // 1-10
  triageLevel: TriageLevel;
  department: string;
  estimatedWaitMinutes: number;
  medicalHistory: string[];
  currentMedications: string[];
  assignedDoctorId?: string;
  assignedDoctorName?: string;
  bedId?: string;
  bedNumber?: string;
  roomNumber?: string;
  ward?: WardType;
  floor?: string;
  locationInstructions?: string;
  status: PatientStatus;
  notes?: string;
  dischargeReason?: string;
  dischargeNotes?: string;
  queuePosition?: number;
  createdAt: string;
  admittedAt?: string;
  dischargedAt?: string;
  isDirectAllocation?: boolean;
  acknowledgedByDoctor?: boolean;
  bedRequestStatus?: BedRequestStatus;
  bedAssignmentRequest?: BedAssignmentRequest;
}

export interface Bed {
  id: string;
  bedNumber: string;
  roomNumber?: string;
  ward: WardType;
  floor?: string;
  locationInstructions?: string;
  status: BedStatus;
  patientId?: string;
  patientName?: string;
  triageLevel?: TriageLevel;
  timeInBed?: string;
  occupiedSince?: string;
  equipment?: string[];
  notes?: string;
  cleaningEtaMinutes?: number;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  status: 'success' | 'warning' | 'error';
}

export interface TriageMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  isStructuredResult?: boolean;
  structuredData?: {
    patientName: string;
    primarySymptoms: string[];
    duration: string;
    severity: number;
    triageLevel: TriageLevel;
    recommendedDepartment: string;
    estimatedWaitMinutes: number;
    medicalHistory: string[];
    clinicalRationale: string;
  };
}

export interface EmergencyOverridePayload {
  urgentPatientId: string;
  dischargePatientId: string;
  targetBedId: string;
  doctorNotes: string;
  doctorId: string;
  doctorName: string;
}

export interface DashboardMetrics {
  totalDoctors: number;
  totalActivePatients: number;
  totalBeds: number;
  occupiedBeds: number;
  vacantBeds: number;
  cleaningBeds: number;
  occupancyRate: number;
  criticalPatientsCount: number;
  urgentAlertsCount: number;
}

export interface BedAllocationNotification {
  patientId: string;
  patientName: string;
  roomNumber: string;
  ward: string;
  floor?: string;
  bedNumber: string;
  assignedDoctorName: string;
  locationInstructions: string;
  allocatedAt: string;
  triageLevel?: TriageLevel;
  isDirectAllocation?: boolean;
}

