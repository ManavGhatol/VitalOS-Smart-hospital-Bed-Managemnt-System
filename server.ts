import express from 'express';
import path from 'path';
import { spawn } from 'child_process';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import type {
  Bed,
  Patient,
  DoctorUser,
  ActivityLog,
  TriageLevel,
  EmergencyOverridePayload,
  DashboardMetrics,
  WardType,
  BedAssignmentRequest,
  BedRequestStatus,
} from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// SSE Clients collection for real-time dashboard updates
const sseClients: express.Response[] = [];

function broadcastEvent(eventType: string, payload: any) {
  const message = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].write(message);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

// Initial In-Memory Database
const doctors: DoctorUser[] = [
  {
    id: 'doc-1',
    name: 'Dr. Sarah Jenkins',
    email: 'sarah.jenkins@hospital.org',
    role: 'doctor',
    licenseNumber: 'MD-84920-CA',
    hospitalName: 'Vitalis OS Central Hospital',
    department: 'Emergency & Critical Care',
    status: 'approved',
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'doc-2',
    name: 'Dr. Michael Marcus',
    email: 'michael.marcus@hospital.org',
    role: 'doctor',
    licenseNumber: 'MD-72019-CA',
    hospitalName: 'Vitalis OS Central Hospital',
    department: 'Cardiology & Intensive Care',
    status: 'approved',
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: 'doc-3',
    name: 'Dr. Elena Rostova',
    email: 'elena.rostova@hospital.org',
    role: 'doctor',
    licenseNumber: 'MD-91823-CA',
    hospitalName: 'Vitalis OS Central Hospital',
    department: 'Pulmonology & Trauma',
    status: 'approved',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

// Initial realistic beds across departments with physical room & floor mapping
const initialWards: {
  ward: WardType;
  prefix: string;
  count: number;
  floor: string;
  roomPrefix: string;
  roomBase: number;
  instructions: string;
}[] = [
  {
    ward: 'ICU',
    prefix: 'ICU',
    count: 8,
    floor: '3rd Floor, West Critical Care Tower',
    roomPrefix: 'ICU Suite',
    roomBase: 300,
    instructions: 'Take Central Elevator B to 3rd Floor. Proceed through Critical Care double doors and report directly to Charge Nurse Station Alpha.',
  },
  {
    ward: 'Emergency',
    prefix: 'ER',
    count: 10,
    floor: 'Ground Floor, Acute Resuscitation Pavilion',
    roomPrefix: 'Trauma Bay',
    roomBase: 100,
    instructions: 'Follow the illuminated Red Floor Line from triage intake directly into the Acute Resuscitation Bay corridor.',
  },
  {
    ward: 'General Ward',
    prefix: 'GW',
    count: 14,
    floor: '2nd Floor, East Medical Wing',
    roomPrefix: 'Room',
    roomBase: 200,
    instructions: 'Take Elevator A to 2nd Floor. Follow Blue signs toward General Inpatient Medicine and check in at Nurse Station Bravo.',
  },
  {
    ward: 'Recovery',
    prefix: 'REC',
    count: 8,
    floor: '1st Floor, Surgical Step-Down Unit',
    roomPrefix: 'Step-Down Room',
    roomBase: 150,
    instructions: 'Take Elevator A to 1st Floor East. Press intercom at Post-Operative Recovery for nursing staff escort.',
  },
  {
    ward: 'OPD',
    prefix: 'OPD',
    count: 6,
    floor: 'Ground Floor, Clinical Consult Corridor D',
    roomPrefix: 'Consult Suite',
    roomBase: 40,
    instructions: 'Proceed past main outpatient pharmacy into Corridor D. Report to ambulatory coordinator at Counter 4.',
  },
];

const beds: Bed[] = [];
let bedCounter = 1;

for (const { ward, prefix, count, floor, roomPrefix, roomBase, instructions } of initialWards) {
  for (let i = 1; i <= count; i++) {
    const bedNumber = `${prefix}-${String(i).padStart(2, '0')}`;
    const roomIndex = Math.ceil(i / 2);
    const roomNumber = `${roomPrefix} ${roomBase + roomIndex}`;
    const locationInstructions = `${instructions} Assigned Station: ${roomNumber}, Bed ${bedNumber}.`;

    beds.push({
      id: `bed-${bedCounter++}`,
      bedNumber,
      roomNumber,
      ward,
      floor,
      locationInstructions,
      status: 'vacant',
      equipment:
        ward === 'ICU'
          ? ['Ventilator', 'Arterial Line Monitor', 'Infusion Pump']
          : ward === 'Emergency'
          ? ['Multipara Monitor', 'Defibrillator Access', 'O2 Supply']
          : ['Vital Monitor', 'Nurse Call Assist'],
    });
  }
}

// Seed realistic patients with active bed allocations
const patients: Patient[] = [
  {
    id: 'pat-1',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    age: 44,
    gender: 'Female',
    symptomsRaw: 'Post-op appendectomy observation, vitals normalized, pain score 1/10.',
    symptomsStructured: ['Post-operative monitoring', 'Stable vitals'],
    duration: '3 days',
    severity: 2,
    triageLevel: 'NON-URGENT',
    department: 'Recovery',
    estimatedWaitMinutes: 0,
    medicalHistory: ['Hypertension (managed)'],
    currentMedications: ['Acetaminophen 500mg'],
    assignedDoctorId: 'doc-1',
    assignedDoctorName: 'Dr. Sarah Jenkins',
    bedId: 'bed-1', // ICU-01
    bedNumber: 'ICU-01',
    roomNumber: 'ICU Suite 301',
    ward: 'ICU',
    floor: '3rd Floor, West Critical Care Tower',
    locationInstructions: 'Take Central Elevator B to 3rd Floor. Proceed through Critical Care double doors to ICU Suite 301, Bed ICU-01.',
    status: 'Admitted',
    dischargeReason: 'Ready for Discharge',
    notes: 'Recovery complete. Eligible for immediate discharge or step-down ward.',
    createdAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    admittedAt: new Date(Date.now() - 44 * 3600000).toISOString(),
  },
  {
    id: 'pat-2',
    name: 'Robert Hayes',
    email: 'robert.hayes@example.com',
    age: 62,
    gender: 'Male',
    symptomsRaw: 'Acute coronary syndrome, ST segment elevation, requiring oxygenation.',
    symptomsStructured: ['Chest pain radiation to jaw', 'Diaphoresis', 'Dyspnea'],
    duration: '4 hours',
    severity: 9,
    triageLevel: 'CRITICAL',
    department: 'ICU',
    estimatedWaitMinutes: 0,
    medicalHistory: ['Type 2 Diabetes', 'Hyperlipidemia'],
    currentMedications: ['Aspirin', 'Atorvastatin'],
    assignedDoctorId: 'doc-2',
    assignedDoctorName: 'Dr. Michael Marcus',
    bedId: 'bed-2', // ICU-02
    bedNumber: 'ICU-02',
    roomNumber: 'ICU Suite 301',
    ward: 'ICU',
    floor: '3rd Floor, West Critical Care Tower',
    locationInstructions: 'Take Central Elevator B to 3rd Floor. Proceed through Critical Care double doors to ICU Suite 301, Bed ICU-02.',
    status: 'Admitted',
    isDirectAllocation: true,
    notes: 'Continuous cardiac telemetry active.',
    createdAt: new Date(Date.now() - 12 * 3600000).toISOString(),
    admittedAt: new Date(Date.now() - 11 * 3600000).toISOString(),
  },
  {
    id: 'pat-3',
    name: 'Carlos Mendoza',
    email: 'carlos.m@example.com',
    age: 35,
    gender: 'Male',
    symptomsRaw: 'Compound tibia fracture after motor vehicle accident, splinted.',
    symptomsStructured: ['Lower limb trauma', 'Deformity', 'Acute severe pain'],
    duration: '2 hours',
    severity: 8,
    triageLevel: 'URGENT',
    department: 'Emergency',
    estimatedWaitMinutes: 0,
    medicalHistory: ['No known allergies'],
    currentMedications: ['IV Morphine'],
    assignedDoctorId: 'doc-1',
    assignedDoctorName: 'Dr. Sarah Jenkins',
    bedId: 'bed-9', // ER-01
    bedNumber: 'ER-01',
    roomNumber: 'Trauma Bay 101',
    ward: 'Emergency',
    floor: 'Ground Floor, Acute Resuscitation Pavilion',
    locationInstructions: 'Follow illuminated Red Floor Line from triage into Trauma Bay 101, Bed ER-01.',
    status: 'Admitted',
    isDirectAllocation: true,
    notes: 'Scheduled for orthopedic fixation tomorrow morning.',
    createdAt: new Date(Date.now() - 6 * 3600000).toISOString(),
    admittedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: 'pat-4',
    name: 'Emily Davis',
    email: 'emily.davis@example.com',
    age: 28,
    gender: 'Female',
    symptomsRaw: 'Mild bronchial spasm, wheezing relieved after nebulizer treatment.',
    symptomsStructured: ['Asthma exacerbation', 'Wheezing'],
    duration: '6 hours',
    severity: 4,
    triageLevel: 'NON-URGENT',
    department: 'General Ward',
    estimatedWaitMinutes: 0,
    medicalHistory: ['Childhood asthma'],
    currentMedications: ['Albuterol inhaler'],
    assignedDoctorId: 'doc-3',
    assignedDoctorName: 'Dr. Elena Rostova',
    bedId: 'bed-19', // GW-01
    bedNumber: 'GW-01',
    roomNumber: 'Room 201',
    ward: 'General Ward',
    floor: '2nd Floor, East Medical Wing',
    locationInstructions: 'Take Elevator A to 2nd Floor. Follow Blue signs to General Medicine, Room 201, Bed GW-01.',
    status: 'Admitted',
    dischargeReason: 'Ready for Discharge',
    notes: 'SpO2 99% on room air. Ready for discharge protocol.',
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    admittedAt: new Date(Date.now() - 20 * 3600000).toISOString(),
  },
  {
    id: 'pat-5',
    name: 'Marcus Vance',
    email: 'marcus.v@example.com',
    age: 53,
    gender: 'Male',
    symptomsRaw: 'Crushing retrosternal chest pain with left arm radiation, diaphoresis, dyspnea.',
    symptomsStructured: ['Crushing chest pressure', 'Left arm numbness', 'Diaphoresis', 'Shortness of breath'],
    duration: '45 minutes',
    severity: 9,
    triageLevel: 'CRITICAL',
    department: 'Emergency & Critical Care',
    estimatedWaitMinutes: 5,
    medicalHistory: ['Prior Angioplasty 2021', 'Smoking history'],
    currentMedications: ['Clopidogrel 75mg'],
    assignedDoctorId: 'doc-2',
    assignedDoctorName: 'Dr. Michael Marcus',
    status: 'Waiting',
    queuePosition: 1,
    notes: 'AI Triage Flag: Suspected Acute Coronary Syndrome. Immediate ICU/ER resuscitation bed required.',
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
  },
  {
    id: 'pat-6',
    name: 'Sophie Clark',
    email: 'sophie.c@example.com',
    age: 22,
    gender: 'Female',
    symptomsRaw: 'High persistent fever 39.8C, severe headache, neck stiffness, photophobia.',
    symptomsStructured: ['High fever', 'Meningeal signs', 'Severe headache', 'Nuchal rigidity'],
    duration: '18 hours',
    severity: 8,
    triageLevel: 'CRITICAL',
    department: 'Emergency',
    estimatedWaitMinutes: 10,
    medicalHistory: ['None'],
    currentMedications: ['None'],
    assignedDoctorId: 'doc-1',
    assignedDoctorName: 'Dr. Sarah Jenkins',
    status: 'Waiting',
    queuePosition: 2,
    notes: 'Rule out acute bacterial meningitis. Isolation precautions required.',
    createdAt: new Date(Date.now() - 40 * 60000).toISOString(),
  },
  {
    id: 'pat-7',
    name: 'Liam Sullivan',
    email: 'liam.sullivan@example.com',
    age: 34,
    gender: 'Male',
    symptomsRaw: 'Low-grade fever (38.1C), diffuse abdominal cramps, mild nausea, and moderate dehydration after food exposure.',
    symptomsStructured: ['Gastroenteritis', 'Abdominal cramps', 'Low-grade fever'],
    duration: '24 hours',
    severity: 4,
    triageLevel: 'NON-URGENT',
    department: 'General Ward',
    estimatedWaitMinutes: 20,
    medicalHistory: ['Hypertension (mild)'],
    currentMedications: ['Lisinopril 10mg'],
    assignedDoctorId: 'doc-1',
    assignedDoctorName: 'Dr. Sarah Jenkins',
    status: 'Waiting',
    queuePosition: 3,
    bedRequestStatus: 'pending_doctor_review',
    bedAssignmentRequest: {
      id: 'req-pat-7',
      patientId: 'pat-7',
      patientName: 'Liam Sullivan',
      age: 34,
      gender: 'Male',
      triageLevel: 'NON-URGENT',
      severity: 4,
      department: 'General Ward',
      symptomsRaw: 'Low-grade fever (38.1C), diffuse abdominal cramps, mild nausea, and moderate dehydration after food exposure.',
      symptomsStructured: ['Gastroenteritis', 'Abdominal cramps', 'Low-grade fever'],
      duration: '24 hours',
      medicalHistory: ['Hypertension (mild)'],
      currentMedications: ['Lisinopril 10mg'],
      assignedDoctorId: 'doc-1',
      assignedDoctorName: 'Dr. Sarah Jenkins',
      suggestedWard: 'General Ward',
      suggestedBedId: 'bed-20',
      suggestedBedNumber: 'GW-02',
      suggestedRoomNumber: 'Room 202',
      status: 'pending',
      requestedAt: new Date(Date.now() - 35 * 60000).toISOString(),
    },
    notes: 'Condition assessed as stable and not serious. Bed assignment request routed directly to Dr. Sarah Jenkins for review and approval.',
    createdAt: new Date(Date.now() - 35 * 60000).toISOString(),
  },
  {
    id: 'pat-8',
    name: 'Chloe Bennett',
    email: 'chloe.b@example.com',
    age: 41,
    gender: 'Female',
    symptomsRaw: 'Mild non-radiating chest tightness with normal vital signs, mild anxiety, SpO2 99%.',
    symptomsStructured: ['Mild chest tightness', 'Atypical musculoskeletal discomfort', 'Normal vitals'],
    duration: '2 hours',
    severity: 3,
    triageLevel: 'NON-URGENT',
    department: 'General Ward',
    estimatedWaitMinutes: 30,
    medicalHistory: ['Mitral valve prolapse (mild)'],
    currentMedications: ['None'],
    assignedDoctorId: 'doc-2',
    assignedDoctorName: 'Dr. Michael Marcus',
    status: 'Waiting',
    queuePosition: 4,
    bedRequestStatus: 'pending_doctor_review',
    bedAssignmentRequest: {
      id: 'req-pat-8',
      patientId: 'pat-8',
      patientName: 'Chloe Bennett',
      age: 41,
      gender: 'Female',
      triageLevel: 'NON-URGENT',
      severity: 3,
      department: 'General Ward',
      symptomsRaw: 'Mild non-radiating chest tightness with normal vital signs, mild anxiety, SpO2 99%.',
      symptomsStructured: ['Mild chest tightness', 'Atypical musculoskeletal discomfort', 'Normal vitals'],
      duration: '2 hours',
      medicalHistory: ['Mitral valve prolapse (mild)'],
      currentMedications: ['None'],
      assignedDoctorId: 'doc-2',
      assignedDoctorName: 'Dr. Michael Marcus',
      suggestedWard: 'General Ward',
      suggestedBedId: 'bed-21',
      suggestedBedNumber: 'GW-03',
      suggestedRoomNumber: 'Room 203',
      status: 'pending',
      requestedAt: new Date(Date.now() - 15 * 60000).toISOString(),
    },
    notes: 'Atypical non-urgent chest complaint. Bed request routed to Dr. Michael Marcus for clinical evaluation.',
    createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
  },
];

// Link seeded beds to admitted patients
for (const p of patients) {
  if (p.bedId) {
    const targetBed = beds.find((b) => b.id === p.bedId);
    if (targetBed) {
      targetBed.status = 'occupied';
      targetBed.patientId = p.id;
      targetBed.patientName = p.name;
      targetBed.triageLevel = p.triageLevel;
      targetBed.occupiedSince = p.admittedAt || p.createdAt;
      targetBed.timeInBed = '18 hours';
    }
  }
}

// Activity logs
const activityLogs: ActivityLog[] = [
  {
    id: 'log-1',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    user: 'Dr. Sarah Jenkins',
    action: 'Bed Allocation',
    details: 'Patient Carlos Mendoza allocated to ER-01',
    status: 'success',
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
    user: 'AI Triage Engine',
    action: 'Triage Assessment Complete',
    details: 'Patient Marcus Vance triaged as CRITICAL (Severity 9/10)',
    status: 'warning',
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    user: 'Dr. Michael Marcus',
    action: 'Patient Admission',
    details: 'Admitted Robert Hayes to ICU-02 with cardiac telemetry',
    status: 'success',
  },
  {
    id: 'log-4',
    timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
    user: 'Admin System',
    action: 'Bed Maintenance',
    details: 'GW-05 disinfection and terminal cleaning completed',
    status: 'success',
  },
];

function logActivity(user: string, action: string, details: string, status: 'success' | 'warning' | 'error' = 'success') {
  const newLog: ActivityLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    user,
    action,
    details,
    status,
  };
  activityLogs.unshift(newLog);
  broadcastEvent('activity_logged', newLog);
  return newLog;
}

// Helper: Calculate Metrics
function calculateMetrics(): DashboardMetrics {
  const totalDoctors = doctors.filter((d) => d.status === 'approved').length;
  const totalActivePatients = patients.filter((p) => p.status === 'Waiting' || p.status === 'Admitted').length;
  const totalBeds = beds.length;
  const occupiedBeds = beds.filter((b) => b.status === 'occupied').length;
  const vacantBeds = beds.filter((b) => b.status === 'vacant').length;
  const cleaningBeds = beds.filter((b) => b.status === 'cleaning').length;
  const occupancyRate = Math.round((occupiedBeds / totalBeds) * 100);
  const criticalPatientsCount = patients.filter((p) => p.triageLevel === 'CRITICAL' && p.status === 'Waiting').length;
  const urgentAlertsCount = criticalPatientsCount + beds.filter((b) => b.status === 'occupied' && b.triageLevel === 'CRITICAL').length;

  return {
    totalDoctors,
    totalActivePatients,
    totalBeds,
    occupiedBeds,
    vacantBeds,
    cleaningBeds,
    occupancyRate,
    criticalPatientsCount,
    urgentAlertsCount,
  };
}

// --- SSE Endpoint for Real-time Dashboard Updates ---
app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);

  // Send initial handshake
  res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    const index = sseClients.indexOf(res);
    if (index !== -1) sseClients.splice(index, 1);
  });
});

// Helper to directly allocate an optimal vacant bed to a patient (used for high-risk / emergency intake)
function directAllocateBed(
  patient: Patient,
  preferredWard?: string,
  doctorName?: string
): { bed: Bed; isEmergencyOverride: boolean } | null {
  // 1. If preferred ward or department specified, prioritize vacant bed in that ward
  const targetWard =
    preferredWard ||
    patient.ward ||
    (patient.triageLevel === 'CRITICAL' ? 'ICU' : patient.department === 'Emergency' ? 'Emergency' : undefined);

  let targetBed: Bed | undefined;
  if (targetWard) {
    targetBed = beds.find((b) => b.status === 'vacant' && b.ward === targetWard);
  }

  // 2. If CRITICAL and no bed in preferred ward, try ICU first, then Emergency
  if (!targetBed && patient.triageLevel === 'CRITICAL') {
    targetBed = beds.find((b) => b.status === 'vacant' && (b.ward === 'ICU' || b.ward === 'Emergency'));
  }

  // 3. Fallback: any vacant bed in the hospital
  if (!targetBed) {
    targetBed = beds.find((b) => b.status === 'vacant');
  }

  // 4. If all beds occupied, find non-urgent/recovering bed to override
  let isOverride = false;
  if (!targetBed) {
    const overrideCandidate = beds.find(
      (b) => b.status === 'occupied' && (b.triageLevel === 'NON-URGENT' || b.triageLevel === 'URGENT')
    );
    if (overrideCandidate) {
      targetBed = overrideCandidate;
      isOverride = true;
    }
  }

  if (!targetBed) {
    return null;
  }

  // Commit bed allocation in database
  targetBed.status = 'occupied';
  targetBed.patientId = patient.id;
  targetBed.patientName = patient.name;
  targetBed.triageLevel = patient.triageLevel;
  targetBed.occupiedSince = new Date().toISOString();
  targetBed.timeInBed = 'Just admitted';

  patient.bedId = targetBed.id;
  patient.bedNumber = targetBed.bedNumber;
  patient.roomNumber = targetBed.roomNumber;
  patient.ward = targetBed.ward;
  patient.floor = targetBed.floor;
  patient.locationInstructions = targetBed.locationInstructions;
  patient.status = 'Admitted';
  patient.admittedAt = new Date().toISOString();
  if (doctorName) {
    patient.assignedDoctorName = doctorName;
  }
  delete patient.queuePosition;

  return { bed: targetBed, isEmergencyOverride: isOverride };
}

// --- AI Triage Endpoint (Powered by Gemini API) ---
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

app.post('/api/patient/triage', async (req, res) => {
  try {
    const { patientName, message, chatHistory = [], age, gender } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ai = getGeminiClient();

    let structuredResult: any = null;
    let aiResponseText = '';

    const systemPrompt = `You are Vitalis OS's advanced Emergency Clinical Triage AI assistant.
Your duty is to conduct rapid, compassionate, and precise symptom triage for incoming patients.
Guidelines:
1. Speak in a reassuring, professional tone. Keep responses focused and empathetic.
2. Carefully identify warning signs: chest pain, difficulty breathing, altered mental status, severe bleeding, stroke symptoms (FAST), severe trauma -> Mark as CRITICAL (Level 1, Red).
3. Identify urgent symptoms: high fever > 39C with rigid neck, severe abdominal pain, fractures, deep lacerations -> Mark as URGENT (Level 2, Yellow).
4. Identify non-urgent symptoms: mild colds, minor sprains, rashes, mild headache -> Mark as NON-URGENT (Level 3, Green).
5. If the patient has provided sufficient details (name, symptoms, duration, severity), formulate a complete clinical triage assessment.
6. Always return valid JSON matching this schema:
{
  "replyText": "Patient-facing empathetic response explaining findings and next immediate guidance",
  "isAssessmentComplete": true or false,
  "structuredData": {
    "patientName": "string",
    "primarySymptoms": ["string"],
    "duration": "string",
    "severity": number between 1 and 10,
    "triageLevel": "CRITICAL" | "URGENT" | "NON-URGENT",
    "recommendedDepartment": "ICU" | "Emergency" | "General Ward" | "OPD",
    "estimatedWaitMinutes": number,
    "medicalHistory": ["string"],
    "clinicalRationale": "Brief 1-2 sentence doctor-facing triage rationale"
  } (or null if more questions are needed)
}`;

    if (ai) {
      const conversationContext = chatHistory
        .map((m: any) => `${m.sender === 'user' ? 'Patient' : 'AI'}: ${m.text}`)
        .join('\n');

      const prompt = `Conversation history:\n${conversationContext}\nPatient's latest message: "${message}"\nPatient Name provided: ${patientName || 'Unknown'}\nAge: ${age || 'Not stated'}, Gender: ${gender || 'Not stated'}\n\nPerform clinical triage and return JSON response.`;

      // Models cascade in sequence:
      // 1. 'gemini-3.8-flash' (standard fast flash)
      // 2. 'gemini-3.1-flash-lite' (high throughput, low-latency with independent capacity)
      // 3. 'gemini-3.1-pro-preview' (pro model fallback if flash family experiences high demand)
      // 4. 'gemini-flash-latest' (general flash alias)
      const modelsToTry = [
        'gemini-3.8-flash',
        'gemini-3.1-flash-lite',
        'gemini-3.1-pro-preview',
        'gemini-flash-latest',
      ];

      for (const modelName of modelsToTry) {
        let attempts = 0;
        const maxAttemptsForModel = 2;
        let modelSuccess = false;

        while (attempts < maxAttemptsForModel && !modelSuccess) {
          attempts++;
          try {
            const geminiRes = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                systemInstruction: systemPrompt,
                responseMimeType: 'application/json',
              },
            });

            let rawText = geminiRes.text?.trim() || '';
            if (rawText.startsWith('```')) {
              rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
            }

            if (rawText) {
              try {
                const parsed = JSON.parse(rawText);
                aiResponseText = parsed.replyText || '';
                if (parsed.isAssessmentComplete && parsed.structuredData) {
                  structuredResult = parsed.structuredData;
                }
                if (aiResponseText) {
                  modelSuccess = true;
                  break;
                }
              } catch {
                // Ignore parse errors on intermediate text
              }
            }
          } catch (geminiError: any) {
            const errCode = geminiError?.status || geminiError?.code;
            const errMsg = geminiError?.message || String(geminiError);
            const isTransient =
              errCode === 503 ||
              errCode === 429 ||
              errMsg.includes('503') ||
              errMsg.includes('high demand') ||
              errMsg.includes('overloaded');

            if (isTransient && attempts < maxAttemptsForModel) {
              // Quick backoff before 1 retry on this model
              await new Promise((resolve) => setTimeout(resolve, 350));
              continue;
            }

            // Move to next candidate model seamlessly
            console.log(`[Triage AI] Model ${modelName} unavailable (${errCode || 'transient'}), attempting next model...`);
            break;
          }
        }

        if (aiResponseText) {
          break; // Successfully got response from model cascade
        }
      }
    }

    // Fallback clinical triage rule-engine if Gemini isn't available or didn't return complete data
    if (!aiResponseText) {
      const lower = message.toLowerCase();
      const isChestPain = lower.includes('chest pain') || lower.includes('heart') || lower.includes('breathing') || lower.includes('unconscious') || lower.includes('stroke') || lower.includes('choking') || lower.includes('severe bleeding');
      const isUrgent = lower.includes('fracture') || lower.includes('fever') || lower.includes('vomiting') || lower.includes('burn') || lower.includes('cut') || lower.includes('abdominal');

      if (isChestPain) {
        aiResponseText = `Thank you for sharing this, ${patientName || 'there'}. Because you mentioned severe chest discomfort and difficulty breathing, this is flagged as a high-priority medical emergency. Our trauma & critical care team has been immediately notified.`;
        structuredResult = {
          patientName: patientName || 'Patient',
          primarySymptoms: ['Acute Chest Pain', 'Shortness of breath / Respiratory distress'],
          duration: 'Current / Sudden onset',
          severity: 9,
          triageLevel: 'CRITICAL',
          recommendedDepartment: 'ICU',
          estimatedWaitMinutes: 3,
          medicalHistory: ['Under clinical review'],
          clinicalRationale: 'Patient reports high-acuity cardiopulmonary distress symptoms indicative of acute coronary syndrome or pulmonary compromise.',
        };
      } else if (isUrgent) {
        aiResponseText = `I understand, ${patientName || 'there'}. We have evaluated your symptoms and registered your case with our urgent medical team. A triage nurse is preparing your admission intake.`;
        structuredResult = {
          patientName: patientName || 'Patient',
          primarySymptoms: [message.slice(0, 50)],
          duration: 'Acute onset',
          severity: 6,
          triageLevel: 'URGENT',
          recommendedDepartment: 'Emergency',
          estimatedWaitMinutes: 15,
          medicalHistory: ['None noted'],
          clinicalRationale: 'Patient presents with moderate-to-high acute symptoms requiring prompt physical evaluation and diagnostic tests.',
        };
      } else {
        aiResponseText = `Thank you, ${patientName || 'there'}. I have recorded your symptoms for triage. Your vital assessment is stable and categorized as non-urgent.`;
        structuredResult = {
          patientName: patientName || 'Patient',
          primarySymptoms: [message.slice(0, 50)],
          duration: '1-3 days',
          severity: 3,
          triageLevel: 'NON-URGENT',
          recommendedDepartment: 'OPD',
          estimatedWaitMinutes: 30,
          medicalHistory: ['None reported'],
          clinicalRationale: 'Hemodynamically stable non-urgent presentation suitable for outpatient evaluation.',
        };
      }
    }

    // If assessment completed, create or update a patient in waiting list
    let createdPatient: Patient | null = null;
    if (structuredResult) {
      const waitCount = patients.filter((p) => p.status === 'Waiting').length;
      createdPatient = {
        id: `pat-${Date.now()}`,
        name: structuredResult.patientName || patientName || 'Intake Patient',
        symptomsRaw: message,
        symptomsStructured: structuredResult.primarySymptoms || [message],
        duration: structuredResult.duration || 'Acute',
        severity: structuredResult.severity || 5,
        triageLevel: structuredResult.triageLevel || 'URGENT',
        department: structuredResult.recommendedDepartment || 'Emergency',
        estimatedWaitMinutes: structuredResult.estimatedWaitMinutes || 15,
        medicalHistory: structuredResult.medicalHistory || [],
        currentMedications: [],
        status: 'Waiting',
        queuePosition: waitCount + 1,
        notes: `AI Triage: ${structuredResult.clinicalRationale || 'Evaluated by Vitalis OS'}`,
        createdAt: new Date().toISOString(),
      };

      // Auto-assign to available doctor based on specialty/load
      let availableDoc = doctors.find((d) => d.status === 'approved');
      const deptLower = (structuredResult.recommendedDepartment || '').toLowerCase();
      const textForMatching = `${message} ${(structuredResult.primarySymptoms || []).join(' ')}`.toLowerCase();

      if (
        deptLower.includes('cardio') ||
        textForMatching.includes('chest') ||
        textForMatching.includes('cardiac') ||
        textForMatching.includes('heart') ||
        textForMatching.includes('coronary') ||
        textForMatching.includes('angina') ||
        textForMatching.includes('infarct')
      ) {
        const cardioDoc = doctors.find((d) => d.id === 'doc-2' || d.department.toLowerCase().includes('cardio'));
        if (cardioDoc) availableDoc = cardioDoc;
      } else if (
        deptLower.includes('pulmon') ||
        textForMatching.includes('breath') ||
        textForMatching.includes('wheez') ||
        textForMatching.includes('asthma') ||
        textForMatching.includes('lung') ||
        textForMatching.includes('dyspnea')
      ) {
        const pulmDoc = doctors.find((d) => d.id === 'doc-3' || d.department.toLowerCase().includes('pulmon'));
        if (pulmDoc) availableDoc = pulmDoc;
      } else {
        const erDoc = doctors.find((d) => d.id === 'doc-1' || d.department.toLowerCase().includes('emergency'));
        if (erDoc) availableDoc = erDoc;
      }

      if (!availableDoc) availableDoc = doctors[0];

      if (availableDoc) {
        createdPatient.assignedDoctorId = availableDoc.id;
        createdPatient.assignedDoctorName = availableDoc.name;
        structuredResult.assignedDoctorName = availableDoc.name;
        structuredResult.assignedDoctorId = availableDoc.id;
        structuredResult.assignedDoctorDepartment = availableDoc.department;
        structuredResult.assignedDoctorLicense = availableDoc.licenseNumber;
      }

      // DIRECT BED ALLOCATION FOR HIGH RISK & HIGH ALERT PATIENTS:
      // If patient is CRITICAL priority, severity >= 7, or URGENT with severity >= 6:
      // Immediately and directly assign a bed and bed number without placing in waitlist!
      const isHighRisk =
        createdPatient.triageLevel === 'CRITICAL' ||
        createdPatient.severity >= 7 ||
        (createdPatient.triageLevel === 'URGENT' && createdPatient.severity >= 6);

      let directAllocatedBed: Bed | null = null;
      if (isHighRisk) {
        const alloc = directAllocateBed(
          createdPatient,
          createdPatient.department || (createdPatient.triageLevel === 'CRITICAL' ? 'ICU' : 'Emergency'),
          createdPatient.assignedDoctorName
        );

        if (alloc && alloc.bed) {
          directAllocatedBed = alloc.bed;

          // Directly stamp location metadata onto structuredResult for immediate Assessment Sheet and UI sync
          createdPatient.isDirectAllocation = true;
          structuredResult.bedId = directAllocatedBed.id;
          structuredResult.bedNumber = directAllocatedBed.bedNumber;
          structuredResult.roomNumber = directAllocatedBed.roomNumber;
          structuredResult.ward = directAllocatedBed.ward;
          structuredResult.floor = directAllocatedBed.floor;
          structuredResult.locationInstructions = directAllocatedBed.locationInstructions;
          structuredResult.isDirectAllocation = true;

          // Enrich AI reply text so the patient hears it directly in chat stream
          aiResponseText += `\n\n🚨 **High-Risk Immediate Direct Bed Allocation**:\nBecause your condition has been assessed as **HIGH ALERT (${createdPatient.triageLevel} Priority, Severity ${createdPatient.severity}/10)**, Vitalis OS has **directly and immediately assigned you a bed without waiting**:\n• **Room Number**: ${directAllocatedBed.roomNumber}\n• **Ward / Department**: ${directAllocatedBed.ward} (${directAllocatedBed.floor})\n• **Bed Number**: ${directAllocatedBed.bedNumber}\n• **Attending Physician**: ${createdPatient.assignedDoctorName}\n\n📍 **Direct Walking & Reception Instructions**:\n${directAllocatedBed.locationInstructions}\n\nYour Clinical Assessment Sheet has been automatically stamped with this physical location. Please proceed immediately to your assigned bed!`;

          logActivity(
            'Direct Emergency Intake',
            'High-Alert Bed Assigned',
            `High-risk patient ${createdPatient.name} (${createdPatient.triageLevel}, Sev ${createdPatient.severity}) directly allocated to ${directAllocatedBed.roomNumber || ''} Bed ${directAllocatedBed.bedNumber} (${directAllocatedBed.ward}) under ${createdPatient.assignedDoctorName}`,
            'warning'
          );
        }
      } else {
        // NON-SERIOUS PATIENT PROTOCOL:
        // When a patient is not serious, the bed assignment request is routed directly
        // to the doctor's profile/dashboard for review and approval instead of auto-assigning a bed immediately!
        createdPatient.bedRequestStatus = 'pending_doctor_review';

        const suggestedBed =
          beds.find((b) => b.status === 'vacant' && (b.ward === (createdPatient.department || 'General Ward') || b.ward === 'General Ward')) ||
          beds.find((b) => b.status === 'vacant');

        const bedRequest: BedAssignmentRequest = {
          id: `req-${Date.now()}`,
          patientId: createdPatient.id,
          patientName: createdPatient.name,
          age: createdPatient.age,
          gender: createdPatient.gender,
          triageLevel: createdPatient.triageLevel,
          severity: createdPatient.severity,
          department: createdPatient.department || 'General Ward',
          symptomsRaw: createdPatient.symptomsRaw,
          symptomsStructured: createdPatient.symptomsStructured || [],
          duration: createdPatient.duration || 'Recent onset',
          medicalHistory: createdPatient.medicalHistory || [],
          currentMedications: createdPatient.currentMedications || [],
          assignedDoctorId: createdPatient.assignedDoctorId,
          assignedDoctorName: createdPatient.assignedDoctorName,
          suggestedWard: (suggestedBed?.ward || 'General Ward') as WardType,
          suggestedBedId: suggestedBed?.id,
          suggestedBedNumber: suggestedBed?.bedNumber,
          suggestedRoomNumber: suggestedBed?.roomNumber,
          status: 'pending',
          requestedAt: new Date().toISOString(),
        };

        createdPatient.bedAssignmentRequest = bedRequest;
        structuredResult.bedRequestStatus = 'pending_doctor_review';
        structuredResult.bedAssignmentRequest = bedRequest;

        aiResponseText += `\n\n📋 **Bed Assignment Request Routed to Physician for Review**:\nBecause your condition is assessed as **stable and not serious (${createdPatient.triageLevel} Priority, Severity ${createdPatient.severity}/10)**, hospital clinical protocol routes your bed assignment request directly to **${createdPatient.assignedDoctorName}**'s physician profile and dashboard for clinical review and approval rather than auto-assigning an inpatient bed immediately.\n\nDr. ${createdPatient.assignedDoctorName} will review your clinical triage details to approve bed allocation or determine if ambulatory/outpatient observation is appropriate.`;

        logActivity(
          'Clinical Triage Routing',
          'Bed Request Routed to Doctor',
          `Non-serious patient ${createdPatient.name} (${createdPatient.triageLevel}, Severity ${createdPatient.severity}/10) bed assignment request routed directly to ${createdPatient.assignedDoctorName}'s dashboard for review and approval.`,
          'success'
        );
      }

      patients.unshift(createdPatient);

      logActivity(
        'AI Triage Engine',
        'Patient Triage Completed',
        `${createdPatient.name} triaged as ${createdPatient.triageLevel} (${createdPatient.department})`,
        createdPatient.triageLevel === 'CRITICAL' ? 'warning' : 'success'
      );

      broadcastEvent('patient_triaged', createdPatient);
      if (directAllocatedBed) {
        broadcastEvent('bed_allocated', {
          patient: createdPatient,
          bed: directAllocatedBed,
          assignedDoctorName: createdPatient.assignedDoctorName,
          assignedDoctorId: createdPatient.assignedDoctorId,
          roomNumber: directAllocatedBed.roomNumber,
          bedNumber: directAllocatedBed.bedNumber,
          ward: directAllocatedBed.ward,
          floor: directAllocatedBed.floor,
          locationInstructions: directAllocatedBed.locationInstructions,
          isDirectAllocation: true,
          message: `🚨 HIGH ALERT: Patient ${createdPatient.name} directly assigned to ${directAllocatedBed.roomNumber || ''}, Bed ${directAllocatedBed.bedNumber} (${directAllocatedBed.ward}) under ${createdPatient.assignedDoctorName}.`,
        });
        broadcastEvent('bed_updated', directAllocatedBed);
        broadcastEvent('patient_updated', createdPatient);
      } else if (createdPatient.bedAssignmentRequest) {
        broadcastEvent('bed_request_created', {
          patient: createdPatient,
          request: createdPatient.bedAssignmentRequest,
          message: `📋 Bed Assignment Request: ${createdPatient.name} (Not Serious) routed directly to ${createdPatient.assignedDoctorName} for review and approval.`,
        });
      }
      broadcastEvent('metrics_updated', calculateMetrics());
    }

    return res.json({
      replyText: aiResponseText,
      structuredData: structuredResult,
      patient: createdPatient,
    });
  } catch (error: any) {
    console.log('Triage endpoint notice:', error?.message || error);
    return res.status(500).json({ error: 'Failed to process triage intake: ' + error.message });
  }
});

// Helper to convert incoming audio (webm, mp4, etc.) to 16kHz mono WAV PCM for Gemini API
async function convertAudioBufferToWav(inputBuffer: Buffer): Promise<{ data: Buffer; mimeType: string }> {
  try {
    const converted = await new Promise<Buffer>((resolve) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0',
        '-vn',
        '-ar', '16000',
        '-ac', '1',
        '-c:a', 'pcm_s16le',
        '-f', 'wav',
        'pipe:1',
      ]);

      const chunks: Buffer[] = [];
      ffmpeg.stdout.on('data', (c) => chunks.push(c));
      ffmpeg.stderr.on('data', () => {});
      ffmpeg.on('close', (code) => {
        if (code === 0 && chunks.length > 0) {
          resolve(Buffer.concat(chunks));
        } else {
          resolve(inputBuffer);
        }
      });
      ffmpeg.on('error', () => resolve(inputBuffer));
      ffmpeg.stdin.write(inputBuffer);
      ffmpeg.stdin.end();
    });

    if (converted.length >= 12 && converted.toString('ascii', 0, 4) === 'RIFF') {
      return { data: converted, mimeType: 'audio/wav' };
    }
    return { data: converted, mimeType: 'audio/wav' };
  } catch {
    return { data: inputBuffer, mimeType: 'audio/wav' };
  }
}

// --- AI Speech-to-Text Endpoint (Multilingual Voice Recognition) ---
app.post('/api/patient/transcribe', async (req, res) => {
  try {
    const { audioBase64, mimeType = 'audio/webm' } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data is required' });
    }

    const cleanBase64 = audioBase64.replace(/^data:[^;]+;base64,/, '');
    const rawBuffer = Buffer.from(cleanBase64, 'base64');

    if (rawBuffer.length < 100) {
      return res.status(400).json({ error: 'Audio recording was too short. Please speak clearly for a few seconds.' });
    }

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({ error: 'Gemini Speech-to-Text service is currently unavailable' });
    }

    // Convert audio to clean 16kHz mono WAV for maximum model compatibility
    const { data: wavBuffer, mimeType: finalMime } = await convertAudioBufferToWav(rawBuffer);

    const audioPart = {
      inlineData: {
        mimeType: finalMime,
        data: wavBuffer.toString('base64'),
      },
    };

    const promptText = `You are a medical intake speech-to-text transcriber.
Listen carefully to the patient speaking in this audio clip.
The patient may speak in ANY language (such as English, Spanish, Hindi, French, Mandarin, Arabic, German, Russian, Portuguese, Marathi, Bengali, Telugu, Tamil, Japanese, etc.).
Instructions:
1. Transcribe the patient's speech verbatim in the exact original language spoken.
2. Identify the spoken language name (e.g. English, Spanish, Hindi, Marathi, etc.).
3. If the language is not English, also provide an accurate, clear English translation.
Reply strictly in valid JSON format:
{
  "transcript": "Verbatim text in the spoken language",
  "language": "Detected language name",
  "englishTranslation": "English translation if spoken in another language, otherwise identical to transcript"
}`;

    // Proven audio models cascade:
    // 1. 'gemini-3.1-flash-lite' (high availability, handles WAV audio speech directly)
    // 2. 'gemini-3.8-flash' (multimodal understanding)
    // 3. 'gemini-flash-latest' (fallback)
    const transcribeModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let result: { transcript?: string; language?: string; englishTranslation?: string } | null = null;

    for (const modelName of transcribeModels) {
      // Retry loop for rate limits (429) or spikes (503)
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                parts: [audioPart, { text: promptText }],
              },
            ],
            config: {
              responseMimeType: 'application/json',
            },
          });

          let rawText = response.text?.trim() || '';
          if (!rawText && response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.text) rawText += part.text;
            }
          }

          rawText = rawText.trim();
          if (rawText.startsWith('```')) {
            rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
          }

          if (rawText) {
            try {
              const parsed = JSON.parse(rawText);
              if (parsed.transcript && parsed.transcript.trim()) {
                result = parsed;
                break;
              }
            } catch {
              // If model returned plain text rather than JSON
              if (rawText.length > 0) {
                result = {
                  transcript: rawText,
                  language: 'Detected Automatically',
                  englishTranslation: rawText,
                };
                break;
              }
            }
          }
        } catch (err: any) {
          const status = err?.status || err?.code;
          console.log(`[Speech-to-Text] Model ${modelName} attempt ${attempt} notice:`, err?.message?.slice(0, 80));
          if (attempt === 1 && (status === 429 || status === 503)) {
            await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
          }
        }
      }

      if (result && result.transcript) {
        break;
      }
    }

    if (!result || !result.transcript) {
      return res.status(200).json({
        transcript: '',
        language: 'Unrecognized',
        englishTranslation: '',
        message: 'No clear speech detected. Please speak louder or type your symptoms.',
      });
    }

    return res.json({
      transcript: result.transcript,
      language: result.language || 'Detected Automatically',
      englishTranslation: result.englishTranslation || result.transcript,
    });
  } catch (error: any) {
    console.log('Audio transcription endpoint notice:', error?.message || error);
    return res.status(500).json({ error: 'Audio transcription failed: ' + (error?.message || error) });
  }
});

// --- Doctor Routes ---
app.post('/api/doctor/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const doctor = doctors.find((d) => d.email.toLowerCase() === email.toLowerCase());
  if (!doctor) {
    return res.status(401).json({ error: 'No doctor account found with this email address' });
  }
  if (doctor.status === 'blocked') {
    return res.status(403).json({ error: 'Your credentials have been placed on hold by hospital administration.' });
  }

  logActivity(doctor.name, 'Doctor Login', `Logged into Vitalis OS Clinical Portal`, 'success');

  return res.json({
    token: `jwt-pulse-${doctor.id}-${Date.now()}`,
    doctor,
  });
});

app.post('/api/doctor/register', (req, res) => {
  const { name, email, licenseNumber, hospitalName, department, password } = req.body;

  if (!name || !email || !licenseNumber || !hospitalName || !password) {
    return res.status(400).json({ error: 'All fields are required for medical registration' });
  }

  // Duplicate email check
  if (doctors.some((d) => d.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'A physician account already exists with this email address' });
  }

  // License format validation (e.g. MD-XXXXX-XX)
  const licenseRegex = /^MD-[0-9]{4,6}-[A-Z]{2}$/i;
  if (!licenseRegex.test(licenseNumber.trim())) {
    return res.status(400).json({
      error: 'Invalid Medical License format. Format must match: MD-#####-STATE (e.g., MD-84920-CA)',
    });
  }

  const newDoctor: DoctorUser = {
    id: `doc-${Date.now()}`,
    name: name.startsWith('Dr.') ? name : `Dr. ${name}`,
    role: 'doctor',
    email,
    licenseNumber: licenseNumber.toUpperCase().trim(),
    hospitalName,
    department: department || 'General Medicine',
    status: 'approved',
    createdAt: new Date().toISOString(),
  };

  doctors.push(newDoctor);

  logActivity('System Auth', 'Physician Registration', `${newDoctor.name} registered with license ${newDoctor.licenseNumber}`, 'success');
  broadcastEvent('doctor_registered', newDoctor);
  broadcastEvent('metrics_updated', calculateMetrics());

  return res.status(201).json({
    message: 'Physician registration verified and approved.',
    doctor: newDoctor,
  });
});

app.get('/api/doctors', (req, res) => {
  const approvedDocs = doctors
    .filter((d) => d.status === 'approved')
    .map(({ id, name, email, role, licenseNumber, hospitalName, department, status, createdAt }) => ({
      id,
      name,
      email,
      role,
      licenseNumber,
      hospitalName,
      department,
      status,
      createdAt,
    }));
  return res.json({ doctors: approvedDocs });
});

app.get('/api/doctor/patients', (req, res) => {
  const { doctorId } = req.query;
  let result = patients;
  if (doctorId) {
    result = patients.filter((p) => p.assignedDoctorId === doctorId || !p.assignedDoctorId);
  }
  return res.json({ patients: result });
});

// Patient location and admission status lookup
app.get('/api/patient/status/:patientId', (req, res) => {
  const { patientId } = req.params;
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const bed = patient.bedId ? beds.find((b) => b.id === patient.bedId) : undefined;
  const isAllocated = patient.status === 'Admitted' && !!patient.bedNumber;

  return res.json({
    patient,
    bed,
    isAllocated,
    roomNumber: patient.roomNumber || bed?.roomNumber,
    bedNumber: patient.bedNumber || bed?.bedNumber,
    ward: patient.ward || bed?.ward,
    floor: patient.floor || bed?.floor,
    locationInstructions: patient.locationInstructions || bed?.locationInstructions,
    assignedDoctorName: patient.assignedDoctorName,
  });
});

// Bed allocation endpoint: Auto-assigns for high-risk, but for non-serious patients routes to doctor for approval
app.post('/api/patient/allocate-best-bed', (req, res) => {
  const { patientId, doctorName, preferredWard, isDoctorApproval, approvedByDoctor } = req.body;
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const isApprovedByPhysician = Boolean(isDoctorApproval || approvedByDoctor);
  const isHighRisk = patient.triageLevel === 'CRITICAL' || (patient.severity !== undefined && patient.severity >= 7);

  // When a patient is not serious, the bed assignment request must be routed directly
  // to the doctor's profile/dashboard for review and approval instead of auto-assigning immediately!
  if (!isApprovedByPhysician && !isHighRisk) {
    patient.bedRequestStatus = 'pending_doctor_review';

    const suggestedBed =
      beds.find((b) => b.status === 'vacant' && (b.ward === (preferredWard || patient.ward || 'General Ward') || b.ward === 'General Ward')) ||
      beds.find((b) => b.status === 'vacant');

    if (!patient.bedAssignmentRequest) {
      patient.bedAssignmentRequest = {
        id: `req-${Date.now()}`,
        patientId: patient.id,
        patientName: patient.name,
        age: patient.age,
        gender: patient.gender,
        triageLevel: patient.triageLevel,
        severity: patient.severity,
        department: patient.department || preferredWard || 'General Ward',
        symptomsRaw: patient.symptomsRaw,
        symptomsStructured: patient.symptomsStructured || [],
        duration: patient.duration || 'Recent',
        medicalHistory: patient.medicalHistory || [],
        currentMedications: patient.currentMedications || [],
        assignedDoctorId: patient.assignedDoctorId,
        assignedDoctorName: patient.assignedDoctorName || doctorName || 'Attending Physician',
        suggestedWard: (suggestedBed?.ward || 'General Ward') as WardType,
        suggestedBedId: suggestedBed?.id,
        suggestedBedNumber: suggestedBed?.bedNumber,
        suggestedRoomNumber: suggestedBed?.roomNumber,
        status: 'pending',
        requestedAt: new Date().toISOString(),
      };
    }

    logActivity(
      'Bed Intake Routing',
      'Routed to Physician for Review',
      `Bed assignment request for ${patient.name} (Stable, Severity ${patient.severity}/10) routed directly to ${patient.assignedDoctorName || 'doctor'} for review and approval.`,
      'success'
    );

    broadcastEvent('bed_request_created', {
      patient,
      request: patient.bedAssignmentRequest,
      message: `📋 Bed Assignment Request: ${patient.name} (Not Serious) routed to ${patient.assignedDoctorName} for review and approval.`,
    });
    broadcastEvent('patient_updated', patient);

    return res.json({
      success: true,
      routedToDoctor: true,
      requiresDoctorApproval: true,
      message: `Because this patient is not serious (${patient.triageLevel} Priority, Severity ${patient.severity}/10), bed assignment request has been routed directly to Dr. ${patient.assignedDoctorName || doctorName || 'Attending Physician'} for clinical review and approval instead of auto-assigning immediately.`,
      patient,
      request: patient.bedAssignmentRequest,
    });
  }

  // Otherwise, proceed with bed allocation (critical patient or explicit doctor approval)
  const alloc = directAllocateBed(patient, preferredWard || patient.ward, doctorName || patient.assignedDoctorName);
  if (!alloc || !alloc.bed) {
    return res.status(400).json({ error: 'No vacant hospital beds are currently available.' });
  }

  const targetBed = alloc.bed;
  if (isHighRisk) {
    patient.isDirectAllocation = true;
  }
  patient.bedRequestStatus = 'approved';
  if (patient.bedAssignmentRequest) {
    patient.bedAssignmentRequest.status = 'approved';
    patient.bedAssignmentRequest.reviewedAt = new Date().toISOString();
    patient.bedAssignmentRequest.reviewedByDoctorName = doctorName || patient.assignedDoctorName || 'Attending Physician';
    patient.bedAssignmentRequest.reviewDecision = 'approved_bed';
  }

  logActivity(
    doctorName || 'Attending Physician',
    'Bed Allocation Confirmed',
    `Patient ${patient.name} admitted to ${targetBed.roomNumber || ''} ${targetBed.bedNumber} (${targetBed.ward})`,
    'success'
  );

  broadcastEvent('bed_allocated', {
    patient,
    bed: targetBed,
    assignedDoctorName: patient.assignedDoctorName || doctorName,
    assignedDoctorId: patient.assignedDoctorId,
    roomNumber: targetBed.roomNumber,
    bedNumber: targetBed.bedNumber,
    ward: targetBed.ward,
    floor: targetBed.floor,
    locationInstructions: targetBed.locationInstructions,
    isDirectAllocation: patient.isDirectAllocation || false,
    message: `Patient ${patient.name} allocated to ${targetBed.roomNumber || ''}, Bed ${targetBed.bedNumber} (${targetBed.ward}).`,
  });
  broadcastEvent('bed_updated', targetBed);
  broadcastEvent('patient_updated', patient);
  broadcastEvent('metrics_updated', calculateMetrics());

  return res.json({ success: true, patient, bed: targetBed });
});

// GET pending bed assignment requests for doctor dashboard
app.get('/api/doctor/bed-requests', (req, res) => {
  const { doctorId } = req.query;
  let pendingPatients = patients.filter((p) => p.bedRequestStatus === 'pending_doctor_review');
  if (doctorId) {
    pendingPatients = pendingPatients.filter(
      (p) => !p.assignedDoctorId || p.assignedDoctorId === doctorId
    );
  }

  const requests = pendingPatients.map((p) => {
    if (p.bedAssignmentRequest) return p.bedAssignmentRequest;
    return {
      id: `req-${p.id}`,
      patientId: p.id,
      patientName: p.name,
      age: p.age,
      gender: p.gender,
      triageLevel: p.triageLevel,
      severity: p.severity,
      department: p.department,
      symptomsRaw: p.symptomsRaw,
      symptomsStructured: p.symptomsStructured || [],
      duration: p.duration,
      medicalHistory: p.medicalHistory || [],
      currentMedications: p.currentMedications || [],
      assignedDoctorId: p.assignedDoctorId,
      assignedDoctorName: p.assignedDoctorName,
      status: 'pending' as const,
      requestedAt: p.createdAt,
    };
  });

  return res.json({ requests, patients: pendingPatients });
});

// POST Doctor Approves Bed Assignment Request
app.post('/api/doctor/approve-bed-request', (req, res) => {
  const { patientId, doctorId, doctorName, bedId, reviewNotes } = req.body;
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  // Find candidate vacant bed
  let targetBed: Bed | undefined;
  if (bedId) {
    targetBed = beds.find((b) => b.id === bedId && b.status === 'vacant');
  }
  if (!targetBed) {
    targetBed =
      beds.find((b) => b.status === 'vacant' && b.ward === (patient.ward || 'General Ward')) ||
      beds.find((b) => b.status === 'vacant');
  }

  if (!targetBed) {
    return res.status(400).json({ error: 'No vacant hospital beds are currently available.' });
  }

  // Allocate target bed
  targetBed.status = 'occupied';
  targetBed.patientId = patient.id;
  targetBed.patientName = patient.name;
  targetBed.triageLevel = patient.triageLevel;
  targetBed.occupiedSince = new Date().toISOString();
  targetBed.timeInBed = 'Just admitted';

  patient.bedId = targetBed.id;
  patient.bedNumber = targetBed.bedNumber;
  patient.roomNumber = targetBed.roomNumber;
  patient.ward = targetBed.ward;
  patient.floor = targetBed.floor;
  patient.locationInstructions = targetBed.locationInstructions;
  patient.status = 'Admitted';
  patient.admittedAt = new Date().toISOString();
  if (doctorName) patient.assignedDoctorName = doctorName;
  if (doctorId) patient.assignedDoctorId = doctorId;
  delete patient.queuePosition;

  patient.bedRequestStatus = 'approved';
  if (!patient.bedAssignmentRequest) {
    patient.bedAssignmentRequest = {
      id: `req-${patient.id}`,
      patientId: patient.id,
      patientName: patient.name,
      triageLevel: patient.triageLevel,
      severity: patient.severity,
      department: patient.department,
      symptomsRaw: patient.symptomsRaw,
      symptomsStructured: patient.symptomsStructured || [],
      duration: patient.duration,
      medicalHistory: patient.medicalHistory || [],
      currentMedications: patient.currentMedications || [],
      status: 'approved',
      requestedAt: patient.createdAt,
    };
  }

  patient.bedAssignmentRequest.status = 'approved';
  patient.bedAssignmentRequest.reviewedAt = new Date().toISOString();
  patient.bedAssignmentRequest.reviewedByDoctorName = doctorName || patient.assignedDoctorName || 'Attending Physician';
  patient.bedAssignmentRequest.reviewDecision = 'approved_bed';
  patient.bedAssignmentRequest.physicianReviewNotes = reviewNotes || 'Bed assignment approved after clinical review.';

  logActivity(
    doctorName || 'Attending Physician',
    'Bed Request Approved',
    `Dr. ${doctorName || 'Attending'} reviewed and approved bed assignment for ${patient.name} (${patient.triageLevel}, Sev ${patient.severity}) -> Room ${targetBed.roomNumber || ''} Bed ${targetBed.bedNumber} (${targetBed.ward})`,
    'success'
  );

  broadcastEvent('bed_allocated', {
    patient,
    bed: targetBed,
    assignedDoctorName: patient.assignedDoctorName || doctorName,
    assignedDoctorId: patient.assignedDoctorId,
    roomNumber: targetBed.roomNumber,
    bedNumber: targetBed.bedNumber,
    ward: targetBed.ward,
    floor: targetBed.floor,
    locationInstructions: targetBed.locationInstructions,
    isDirectAllocation: false,
    message: `Dr. ${doctorName || 'Attending'} approved bed assignment for ${patient.name} to ${targetBed.roomNumber || ''} Bed ${targetBed.bedNumber} (${targetBed.ward}).`,
  });

  broadcastEvent('bed_request_approved', {
    patient,
    bed: targetBed,
    doctorName: doctorName || patient.assignedDoctorName,
    notes: reviewNotes,
  });
  broadcastEvent('bed_updated', targetBed);
  broadcastEvent('patient_updated', patient);
  broadcastEvent('metrics_updated', calculateMetrics());

  return res.json({ success: true, patient, bed: targetBed });
});

// POST Doctor Declines Bed Request (Route to Outpatient / Ambulatory Care)
app.post('/api/doctor/decline-bed-request', (req, res) => {
  const { patientId, doctorId, doctorName, decision, physicianNotes } = req.body;
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  patient.bedRequestStatus = 'declined';
  if (!patient.bedAssignmentRequest) {
    patient.bedAssignmentRequest = {
      id: `req-${patient.id}`,
      patientId: patient.id,
      patientName: patient.name,
      triageLevel: patient.triageLevel,
      severity: patient.severity,
      department: patient.department,
      symptomsRaw: patient.symptomsRaw,
      symptomsStructured: patient.symptomsStructured || [],
      duration: patient.duration,
      medicalHistory: patient.medicalHistory || [],
      currentMedications: patient.currentMedications || [],
      status: 'declined',
      requestedAt: patient.createdAt,
    };
  }

  patient.bedAssignmentRequest.status = 'declined';
  patient.bedAssignmentRequest.reviewedAt = new Date().toISOString();
  patient.bedAssignmentRequest.reviewedByDoctorName = doctorName || patient.assignedDoctorName || 'Attending Physician';
  patient.bedAssignmentRequest.reviewDecision = decision || 'declined_outpatient';
  patient.bedAssignmentRequest.physicianReviewNotes = physicianNotes || 'Inpatient bed not indicated; outpatient care advised.';

  patient.notes = `Physician Review: ${physicianNotes || 'Inpatient bed not clinically required. Follow-up via Outpatient Clinic.'}`;

  logActivity(
    doctorName || 'Attending Physician',
    'Bed Request Declined / Outpatient Routed',
    `Dr. ${doctorName || 'Attending'} reviewed bed request for ${patient.name}. Inpatient bed declined in favor of ${decision || 'outpatient care'}.`,
    'warning'
  );

  broadcastEvent('bed_request_declined', {
    patient,
    doctorName: doctorName || patient.assignedDoctorName,
    decision,
    physicianNotes,
  });
  broadcastEvent('patient_updated', patient);

  return res.json({ success: true, patient });
});

// Physician Acknowledgment of Direct Bed Assignment
app.post('/api/doctor/acknowledge-patient', (req, res) => {
  const { patientId, doctorName, doctorId, action } = req.body;
  const patient = patients.find((p) => p.id === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  patient.acknowledgedByDoctor = true;
  if (doctorName && !patient.assignedDoctorName) {
    patient.assignedDoctorName = doctorName;
    if (doctorId) patient.assignedDoctorId = doctorId;
  }

  logActivity(
    doctorName || 'Attending Physician',
    action || 'Direct Bed Assignment Acknowledged',
    `Dr. ${doctorName || 'Attending'} acknowledged direct bed allocation for ${patient.name} in Room ${patient.roomNumber || 'Assigned'}, Bed ${patient.bedNumber} (${patient.ward})`,
    'success'
  );

  broadcastEvent('patient_updated', patient);
  return res.json({ success: true, patient });
});

// Doctor assigns patient to bed
app.post('/api/doctor/assign-bed', (req, res) => {
  const { patientId, bedId, doctorName } = req.body;
  const patient = patients.find((p) => p.id === patientId);
  const bed = beds.find((b) => b.id === bedId);

  if (!patient || !bed) {
    return res.status(404).json({ error: 'Patient or bed not found' });
  }

  if (bed.status === 'occupied') {
    return res.status(400).json({ error: `Bed ${bed.bedNumber} is already occupied` });
  }

  bed.status = 'occupied';
  bed.patientId = patient.id;
  bed.patientName = patient.name;
  bed.triageLevel = patient.triageLevel;
  bed.occupiedSince = new Date().toISOString();
  bed.timeInBed = 'Just admitted';

  patient.bedId = bed.id;
  patient.bedNumber = bed.bedNumber;
  patient.roomNumber = bed.roomNumber;
  patient.ward = bed.ward;
  patient.floor = bed.floor;
  patient.locationInstructions = bed.locationInstructions;
  patient.status = 'Admitted';
  patient.admittedAt = new Date().toISOString();
  if (doctorName) {
    patient.assignedDoctorName = doctorName;
  }
  delete patient.queuePosition;

  logActivity(
    doctorName || 'Doctor',
    'Bed Allocation',
    `Patient ${patient.name} admitted to ${bed.roomNumber || ''} ${bed.bedNumber} (${bed.ward})`,
    'success'
  );

  broadcastEvent('bed_allocated', {
    patient,
    bed,
    message: `Patient ${patient.name} allocated to ${bed.roomNumber || ''}, Bed ${bed.bedNumber} (${bed.ward}).`,
  });
  broadcastEvent('bed_updated', bed);
  broadcastEvent('patient_updated', patient);
  broadcastEvent('metrics_updated', calculateMetrics());

  return res.json({ success: true, patient, bed });
});

// Doctor discharges patient
app.post('/api/doctor/discharge/:patientId', (req, res) => {
  const { patientId } = req.params;
  const { doctorName, dischargeReason, dischargeNotes } = req.body;

  const patient = patients.find((p) => p.id === patientId);
  if (!patient) {
    return res.status(404).json({ error: 'Patient not found' });
  }

  const oldBedId = patient.bedId;
  const oldBedNumber = patient.bedNumber;

  patient.status = 'Discharged';
  patient.dischargedAt = new Date().toISOString();
  patient.dischargeReason = dischargeReason || 'Clinical Recovery';
  patient.dischargeNotes = dischargeNotes || 'Patient discharged in stable condition with post-care instructions.';
  delete patient.bedId;
  delete patient.bedNumber;

  let bedToUpdate: Bed | undefined;
  if (oldBedId) {
    bedToUpdate = beds.find((b) => b.id === oldBedId);
    if (bedToUpdate) {
      bedToUpdate.status = 'cleaning';
      bedToUpdate.notes = 'Terminal sanitation in progress following discharge';
      bedToUpdate.cleaningEtaMinutes = 15;
      delete bedToUpdate.patientId;
      delete bedToUpdate.patientName;
      delete bedToUpdate.triageLevel;
      delete bedToUpdate.occupiedSince;
    }
  }

  logActivity(
    doctorName || 'Doctor',
    'Patient Discharge',
    `Discharged ${patient.name} from ${oldBedNumber || 'ward'}. Bed flagged for sanitization.`,
    'success'
  );

  broadcastEvent('patient_discharged', patient);
  if (bedToUpdate) broadcastEvent('bed_updated', bedToUpdate);
  broadcastEvent('metrics_updated', calculateMetrics());

  return res.json({
    success: true,
    message: `Patient ${patient.name} discharged successfully. Bed ${oldBedNumber || ''} queued for sanitization.`,
    patient,
    bed: bedToUpdate,
  });
});

// Doctor Emergency Bed Reallocation / Override (ATOMIC SWAP)
app.post('/api/doctor/emergency-override', (req, res) => {
  const payload: EmergencyOverridePayload = req.body;
  const { urgentPatientId, dischargePatientId, targetBedId, doctorNotes, doctorName } = payload;

  if (!urgentPatientId || !targetBedId) {
    return res.status(400).json({ error: 'Urgent patient ID and target bed ID are required' });
  }

  const urgentPatient = patients.find((p) => p.id === urgentPatientId);
  const targetBed = beds.find((b) => b.id === targetBedId);

  if (!urgentPatient || !targetBed) {
    return res.status(404).json({ error: 'Urgent patient or bed target not found' });
  }

  let dischargedPatient: Patient | undefined;

  // If a discharge patient is specified or if bed was occupied
  if (dischargePatientId) {
    dischargedPatient = patients.find((p) => p.id === dischargePatientId);
  } else if (targetBed.patientId) {
    dischargedPatient = patients.find((p) => p.id === targetBed.patientId);
  }

  // Execute Atomic Transaction
  if (dischargedPatient) {
    dischargedPatient.status = 'Discharged';
    dischargedPatient.dischargedAt = new Date().toISOString();
    dischargedPatient.dischargeReason = 'Emergency Bed Reallocation / Step-down';
    dischargedPatient.dischargeNotes = `Discharged/Stepped down to accommodate critical emergency admission. Doctor note: ${doctorNotes}`;
    delete dischargedPatient.bedId;
    delete dischargedPatient.bedNumber;
  }

  // Admit Urgent Patient to target Bed
  urgentPatient.status = 'Admitted';
  urgentPatient.admittedAt = new Date().toISOString();
  urgentPatient.bedId = targetBed.id;
  urgentPatient.bedNumber = targetBed.bedNumber;
  urgentPatient.roomNumber = targetBed.roomNumber;
  urgentPatient.ward = targetBed.ward;
  urgentPatient.floor = targetBed.floor;
  urgentPatient.locationInstructions = targetBed.locationInstructions;
  if (doctorName) {
    urgentPatient.assignedDoctorName = doctorName;
  }
  urgentPatient.notes = `EMERGENCY OVERRIDE ADMISSION: ${doctorNotes}`;
  delete urgentPatient.queuePosition;

  // Update Bed
  targetBed.status = 'occupied';
  targetBed.patientId = urgentPatient.id;
  targetBed.patientName = urgentPatient.name;
  targetBed.triageLevel = urgentPatient.triageLevel;
  targetBed.occupiedSince = new Date().toISOString();
  targetBed.timeInBed = 'Emergency Priority Admitted';
  targetBed.notes = `Priority allocated by ${doctorName || 'Doctor'}. Notes: ${doctorNotes}`;

  // Log audit trail
  logActivity(
    doctorName || 'Attending Physician',
    'EMERGENCY OVERRIDE',
    `Urgent admission: ${urgentPatient.name} (Critical) into ${targetBed.roomNumber || ''} ${targetBed.bedNumber}. Discharged: ${
      dischargedPatient ? dischargedPatient.name : 'None (Vacant)'
    }. Reason: ${doctorNotes}`,
    'warning'
  );

  broadcastEvent('bed_allocated', {
    patient: urgentPatient,
    bed: targetBed,
    message: `Emergency admission: ${urgentPatient.name} assigned to ${targetBed.roomNumber || ''}, Bed ${targetBed.bedNumber} (${targetBed.ward}).`,
  });
  broadcastEvent('patient_updated', urgentPatient);
  broadcastEvent('bed_updated', targetBed);
  broadcastEvent('emergency_override', {
    urgentPatient,
    dischargedPatient,
    bed: targetBed,
  });
  broadcastEvent('metrics_updated', calculateMetrics());

  return res.json({
    success: true,
    message: `Emergency bed reallocation executed successfully. Bed ${targetBed.bedNumber} allocated to ${urgentPatient.name}.`,
    urgentPatient,
    dischargedPatient,
    bed: targetBed,
  });
});

// --- Admin Routes ---
app.get('/api/admin/dashboard', (req, res) => {
  const metrics = calculateMetrics();
  return res.json({
    metrics,
    recentRegistrations: doctors,
    activityLogs: activityLogs.slice(0, 30),
    patients: patients,
  });
});

app.get('/api/admin/users', (req, res) => {
  return res.json({ doctors });
});

app.put('/api/admin/user/:userId/status', (req, res) => {
  const { userId } = req.params;
  const { status } = req.body;

  const doc = doctors.find((d) => d.id === userId);
  if (!doc) {
    return res.status(404).json({ error: 'Physician not found' });
  }

  doc.status = status;
  logActivity('Hospital Admin', 'Physician Status Update', `${doc.name} status updated to ${status.toUpperCase()}`, status === 'blocked' ? 'error' : 'success');
  broadcastEvent('doctor_status_changed', doc);

  return res.json({ success: true, doctor: doc });
});

app.get('/api/admin/activity-logs', (req, res) => {
  return res.json({ logs: activityLogs });
});

// --- Bed Management Routes ---
app.get('/api/beds', (req, res) => {
  return res.json({ beds, metrics: calculateMetrics() });
});

app.get('/api/beds/vacant', (req, res) => {
  const vacant = beds.filter((b) => b.status === 'vacant');
  return res.json({ beds: vacant });
});

app.put('/api/beds/:bedId/status', (req, res) => {
  const { bedId } = req.params;
  const { status, notes } = req.body;

  const bed = beds.find((b) => b.id === bedId);
  if (!bed) {
    return res.status(404).json({ error: 'Bed not found' });
  }

  bed.status = status;
  if (notes !== undefined) bed.notes = notes;
  if (status === 'vacant') {
    delete bed.patientId;
    delete bed.patientName;
    delete bed.triageLevel;
    delete bed.occupiedSince;
    delete bed.cleaningEtaMinutes;
  }

  logActivity('Bed Management', 'Bed Status Updated', `Bed ${bed.bedNumber} changed to ${status.toUpperCase()}`, 'success');
  broadcastEvent('bed_updated', bed);
  broadcastEvent('metrics_updated', calculateMetrics());

  return res.json({ success: true, bed });
});

// --- Patient Routes ---
app.get('/api/patient/status/:patientId', (req, res) => {
  const patient = patients.find((p) => p.id === req.params.patientId);
  if (!patient) return res.status(404).json({ error: 'Patient not found' });
  return res.json({ patient });
});

app.get('/api/patient/waiting-room', (req, res) => {
  const waitingPatients = patients.filter((p) => p.status === 'Waiting');
  return res.json({ waitingPatients, count: waitingPatients.length });
});

// Start the server with Vite middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vitalis OS server listening on http://0.0.0.0:${PORT}`);
  });
}
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  startServer();
}

export default app;
