# Vitalis OS — AI Working Memory & Context State

---

## 1. Project Status Summary
* **Platform Name:** Vitalis OS
* **Current Version:** v1.2.0 (Dual-Path Triage & Physician Review Protocol Active)
* **Build Status:** Fully compiled and lint-clean (`compile_applet` & `lint_applet` passing with 0 errors).
* **Environment:** Node.js + Express backend, Vite React frontend running on port 3000.

---

## 2. Implemented Features & Code Manifest

### 2.1 Backend (`server.ts`)
* **Gemini AI Integration:** Proxies user chat to `@google/genai` (model `gemini-2.5-flash`), enforcing structured JSON extraction (`triageLevel`, `severity`, `symptomsStructured`, `recommendedDepartment`).
* **Dual-Path Routing:**
  * If patient severity $\ge 7$ or triage level is `CRITICAL`: Calls `directAllocateBed()` to immediately assign an acute bed.
  * If patient severity $\le 6$ or `NON-URGENT`: Sets `bedRequestStatus = 'pending_doctor_review'`, creates `BedAssignmentRequest`, and suspends auto-allocation.
* **Physician Approval Endpoints:**
  * `GET /api/doctor/bed-requests`: Returns pending bed authorization requests.
  * `POST /api/doctor/approve-bed-request`: Transitions patient to `Admitted`, assigns chosen bed, logs audit record.
  * `POST /api/doctor/decline-bed-request`: Declines bed, logs alternative clinical care pathway.
* **SSE Event Bus (`/api/events`):** Broadcasts `bed_allocated`, `bed_request_created`, `bed_request_approved`, `bed_request_declined`, and `emergency_override` to all connected clients.

### 2.2 Frontend Components
* `src/components/Navigation.tsx`: Navigation bar with role switcher (Patient Triage, Doctor Station, Hospital Census).
* `src/components/PatientTriageChat.tsx`: Conversational AI triage terminal with Web Speech / audio recording, quick test waitlist buttons (Marcus Vance #1, Sophie Clark #2, Liam Brooks #3), and real-time status banners.
* `src/components/DoctorDashboard.tsx`: Attending physician profile with:
  * Emergency alert banner and direct allocation cards for critical patients.
  * Prominent "Pending Bed Assignment Requests" section and tab with live badge counters.
  * "Approve Bed Assignment Request" modal with bed selection and admission notes.
  * "Decline Bed Assignment Request" modal with alternative care pathways.
  * "Emergency Override" modal for displacing stable patients when units are 100% full.
* `src/components/AdminDashboard.tsx`: Hospital bed census visualizer across all units (ICU, Emergency, General Ward, Telemetry, Recovery), cleaning turnaround tracking, and system audit logs.
* `src/components/AssessmentSheetModal.tsx`: Printable verified clinical intake assessment with doctor details and bed allocation stamp.

---

## 3. Data Contracts & State Schemas (`src/types.ts`)

* **`Patient`:**
  * Core fields: `id`, `name`, `age`, `gender`, `symptomsRaw`, `symptomsStructured`, `severity`, `triageLevel`, `status`, `assignedDoctorId`, `assignedDoctorName`.
  * Bed allocation fields: `bedNumber`, `roomNumber`, `ward`, `floor`, `allocatedAt`.
  * Review fields: `bedRequestStatus` (`'pending_doctor_review' | 'approved' | 'declined' | 'none'`), `bedAssignmentRequest`.
* **`BedAssignmentRequest`:**
  * Fields: `id`, `patientId`, `patientName`, `severity`, `triageLevel`, `department`, `symptomsRaw`, `suggestedWard`, `suggestedBedNumber`, `status`, `requestedAt`, `reviewedAt`, `reviewedByDoctorName`, `reviewDecision`, `physicianReviewNotes`.
* **`Bed`:**
  * Fields: `id`, `bedNumber`, `ward`, `roomNumber`, `floor`, `status` (`'vacant' | 'occupied' | 'reserved' | 'cleaning'`), `currentPatientId`, `equipment`.

---

## 4. Key Architectural Decisions & Invariants
1. **Never auto-assign non-serious patients:** A stable patient must never be allocated a bed without attending physician review and authorization.
2. **Never expose secrets to browser:** All Gemini API interactions must remain server-side.
3. **Keep events real-time:** State mutations must call `broadcastEvent()` to trigger instant updates across all open tabs.
4. **Preserve auditability:** Every bed override and request approval must capture the physician's license number and clinical notes.
