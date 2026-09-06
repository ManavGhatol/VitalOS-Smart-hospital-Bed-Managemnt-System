# Vitalis OS — Phased Implementation Roadmap

---

## Overview
To maintain architectural integrity, avoid token overflow, and ensure testability, Vitalis OS is structured into six focused development phases.

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│    Phase 1     │ ──> │    Phase 2     │ ──> │    Phase 3     │
│ Foundation &   │     │ Conversational │     │  Dual-Path     │
│ Real-Time Bus  │     │   AI Triage    │     │ Clinical Route │
└────────────────┘     └────────────────┘     └────────────────┘
        │
        ▼
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│    Phase 4     │ ──> │    Phase 5     │ ──> │    Phase 6     │
│ Doctor Profile │     │ Bed Census &   │     │ Hardening,     │
│ & Approval Hub │     │ Turnaround Hub │     │ Audit & Build  │
└────────────────┘     └────────────────┘     └────────────────┘
```

---

## Phase 1: Architectural Foundation & Real-Time Event Bus
* **Milestones:**
  * Initialize unified Express server with Vite middleware support.
  * Define canonical TypeScript data schemas in `/src/types.ts` (Patient, Bed, Doctor, BedAssignmentRequest, ActivityLog).
  * Build the in-memory hospital state store with seeded doctors, wards, and beds.
  * Implement Server-Sent Events (SSE) pub/sub broadcast channel (`/api/events`) for zero-latency cross-client updates.
* **Verification:** Confirm server boots on port 3000 and SSE streams connection heartbeat events.

---

## Phase 2: Conversational AI Intake Engine & Audio Pipeline
* **Milestones:**
  * Integrate `@google/genai` on server side with structured clinical schema extraction.
  * Build `PatientTriageChat.tsx` with conversational chat loop and empathetic triage persona.
  * Implement dual-layer audio capture: Web Speech API for live transcription + `MediaRecorder` audio chunk fallback.
  * Build `AssessmentSheetModal.tsx` for printable, stamped clinical intake summaries.
* **Verification:** Test typed and spoken symptoms, verifying the server extracts valid triage JSON with normalized symptoms, acuity score, and ESI level.

---

## Phase 3: Dual-Path Clinical Bed Routing Engine
* **Milestones:**
  * Implement the modified Emergency Severity Index (ESI) & Manchester Triage (MTS) decision rules.
  * **Critical Branch:** If severity $\ge 7$ or `CRITICAL`, call `directAllocateBed()`, immediately assigning an acute bed and notifying staff.
  * **Non-Serious Branch:** If severity $\le 6$ or `NON-URGENT`, suspend auto-allocation and create a `BedAssignmentRequest` (`status: pending_doctor_review`).
  * Broadcast `bed_request_created` events via the SSE bus.
* **Verification:** Verify that high-risk cases auto-allocate beds while non-serious cases transition to waiting status with a pending review badge.

---

## Phase 4: Attending Physician Profile & Bed Approval Hub
* **Milestones:**
  * Build `DoctorDashboard.tsx` with role profile details, active patient rosters, and live notification headers.
  * Highlight direct bed allocations prominently for incoming critical patients.
  * Build the "Pending Bed Assignment Requests" section and tab with live badge counters.
  * Implement the **Authorize & Approve Modal**: Allows the physician to select a bed, log admission rationale, and record doctor sign-off.
  * Implement the **Decline & Divert Modal**: Allows the physician to divert stable patients to alternative care pathways (Outpatient, Home Care, Ambulatory Observation).
* **Verification:** Test approving and declining non-serious bed requests and verify real-time state synchronization.

---

## Phase 5: Hospital Census, Bed Turnaround & Emergency Override Engine
* **Milestones:**
  * Build `AdminDashboard.tsx` showing interactive bed census maps across all units (ICU, Emergency, General Ward, Telemetry, Recovery).
  * Implement the Bed Turnaround pipeline: Discharging a patient transitions bed to `cleaning` status with an ETA counter before resetting to `vacant`.
  * Build the Emergency Override modal: Allows doctors to preempt stable patients for incoming critical patients with mandatory justification.
* **Verification:** Execute an emergency override when units are 100% full and confirm bed reassignment and audit logging.

---

## Phase 6: System Hardening, Auditing & Production Build
* **Milestones:**
  * Establish immutable audit trail logging all triage decisions, admissions, and overrides.
  * Run TypeScript type checking (`lint_applet`) to resolve any duplicate identifiers or syntax issues.
  * Execute production build (`compile_applet`) ensuring `esbuild` bundles `server.ts` into a self-contained `dist/server.cjs`.
  * Verify responsive design across desktop, tablet, and mobile viewports.
* **Verification:** All tests and builds pass with zero compiler warnings or runtime errors.
