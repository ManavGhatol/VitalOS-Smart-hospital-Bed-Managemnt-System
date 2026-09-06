# Vitalis OS — Project Requirements Document (PRD)

---

## 1. Product Definition & Feature Scope

### 1.1 Project Summary
**Vitalis OS** is an intelligent, role-based healthcare operations platform bridging real-time conversational AI patient triage, clinical decision-support routing, and hospital bed management. It automates emergency intake prioritization while enforcing physician gatekeeping for inpatient bed authorizations.

### 1.2 Target Users & Personas

| User Role | Primary Needs & Workflows |
| :--- | :--- |
| **Intake Patient / Paramedic** | Fast, conversational symptom triage (multilingual & voice-enabled), queue status tracking, transparent wait time estimates, printable clinical assessment sheets. |
| **Attending Physician / Doctor** | Live dashboard of assigned intake cases, immediate emergency alerts for high-risk admissions, approval queue for non-serious bed assignment requests, emergency bed override with clinical justification, stat orders dispatch. |
| **Hospital Administrator / Charge Nurse** | Real-time bed census monitoring (ICU, Emergency, Telemetry, General Ward, Recovery), turnover tracking, cleaning workflow management, and hospital-wide audit logging. |

### 1.3 Functional Requirements & Core Feature Matrix

* **Conversational AI Patient Triage:**
  * Multi-turn empathetic symptom inquiry with audio input transcription (Web Speech API + MediaRecorder).
  * Natural language extraction into structured clinical data (severity score 1–10, ESI acuity level, primary symptoms, recommended unit).
  * Multilingual capability supporting English, Spanish, Hindi, French, Mandarin, and other major languages.
* **Dual-Path Clinical Bed Routing Engine:**
  * **Critical Path ($\ge 7$ or `CRITICAL`):** Automatic direct bed allocation bypassing the waiting room; immediate notification dispatched to the assigned doctor.
  * **Non-Serious Path ($\le 6$ or `NON-URGENT`):** Bed auto-allocation is suspended; a formal bed request is routed to the attending physician's profile for clinical review and authorization.
* **Attending Doctor Review & Approval Hub:**
  * Dedicated "Pending Bed Requests" tab and prominent review queue in the doctor profile.
  * **Approve Modal:** Select/verify bed, log admission clinical notes, electronically sign off.
  * **Decline Modal:** Route stable patient to alternative care pathways (*Outpatient Specialist*, *Discharge with Prescription & 48h Home Care*, *Ambulatory Observation*).
* **Emergency Bed Preemption (Override Engine):**
  * Allows physicians to displace stable occupants from acute beds for incoming critical patients when units are 100% full, enforcing mandatory clinical justification and license authentication.
* **Real-Time Distributed Synchronization:**
  * Server-Sent Events (SSE) pub/sub event bus instantly updating patient terminals, doctor dashboards, and admin views without page reloads.

---

## 2. Architecture & Technical Design

### 2.1 Technical Stack
* **Client Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Canvas-Confetti.
* **Server Runtime:** Node.js, Express, TypeScript (executed via `tsx` in dev, bundled with `esbuild` for production).
* **AI Integration:** Google Gen AI SDK (`@google/genai`) hosted strictly on the server side (`server.ts`).
* **Live Communications:** Server-Sent Events (SSE) via `/api/events` connection pool.

### 2.2 System Data Flow

```
[Patient / Paramedic Client]
         │ (Voice / Text Symptoms)
         ▼
[POST /api/triage/chat (Express Server)]
         │
         ├───> [Gemini 2.5 Flash / Google Gen AI]
         │        (Clinical JSON Schema Extraction)
         │
         ├───> [Clinical Triage Classifier (ESI / MTS Logic)]
         │        │
         │        ├── If Severity ≥ 7 or CRITICAL:
         │        │     └──> [directAllocateBed()] ──> Reserves ICU/ER Bed
         │        │
         │        └── If Severity ≤ 6 or NON-URGENT:
         │              └──> Creates BedAssignmentRequest (status: 'pending_doctor_review')
         │
         ├───> [In-Memory State Store & Audit Log Generator]
         │
         └───> [SSE Event Bus (/api/events)]
                  │
                  ├──> [Doctor Dashboard (Live Alert / Approval Queue)]
                  ├──> [Admin Hospital Census]
                  └──> [Patient Intake Screen]
```

### 2.3 Project File & Directory Structure

```
├── index.html                      # HTML5 entry point & metadata sync
├── metadata.json                   # App capabilities & iframe permissions
├── package.json                    # Dependencies & build scripts
├── server.ts                       # Express backend, Gemini API proxy, SSE bus, bed logic
├── tsconfig.json                   # TypeScript configuration
├── vite.config.ts                  # Vite build & Tailwind CSS plugin configuration
└── src/
    ├── main.tsx                    # React client mount point
    ├── index.css                   # Global styles & Tailwind imports
    ├── types.ts                    # Canonical data interfaces (Patient, Bed, Doctor, etc.)
    ├── data/
    │   └── initialData.ts          # Default mock doctors, beds, patients, and unit schemas
    ├── services/
    │   └── api.ts                  # Client HTTP requests, SSE subscriber, and event handlers
    ├── components/
    │   ├── Navigation.tsx          # App role switcher & top status header
    │   ├── PatientTriageChat.tsx   # Conversational triage terminal & audio recording
    │   ├── DoctorDashboard.tsx     # Physician profile, direct allocations, approval queue
    │   ├── AdminDashboard.tsx      # Hospital bed census, capacity gauges, audit logs
    │   ├── AssessmentSheetModal.tsx # Printable clinical intake summary & bed stamp
    │   └── VitalisBotAvatar.tsx    # Animated clinical AI bot visual avatar
    └── lib/
        └── utils.ts                # Tailwind CSS class merger utility
```

---

## 3. AI Boundaries, Clinical Guardrails & Error Handling

### 3.1 What the AI MUST Do
* Act strictly as an empathetic, structured triage assistant and intake summarizer.
* Normalize raw clinical complaints into standardized medical tokens (e.g., "radiating arm pain", "dyspnea").
* Enforce deterministic output constraints using strict JSON schema validation.
* Default to clinical caution: any presence of red-flag symptoms (chest tightness, loss of consciousness, severe hemorrhage, respiratory collapse) forces a minimum severity of 7 and `CRITICAL` triage rating.

### 3.2 What the AI MUST NOT Do (Safety Guardrails)
* **Never provide a definitive diagnosis:** The AI must explicitly inform patients that assessments are preliminary triage categorizations, not final diagnoses.
* **Never prescribe medications or therapeutic dosages:** The AI is strictly barred from instructing patients to take specific pharmaceuticals.
* **Never expose API keys client-side:** All Google Gen AI interactions must remain behind Express `/api/*` endpoints.

### 3.3 Error Handling & Resilience
* **Network & SSE Disconnection:** Client implements an automated exponential polling fallback (`fetchPatientStatus` every 3s) if the live SSE stream terminates.
* **Audio Capture Degradation:** If `MediaRecorder` or Web Speech API is denied or unsupported, the interface gracefully falls back to text input with helpful guidance.
* **Malformed AI Response Recovery:** The server wraps LLM response parsing in a regex JSON extractor with a deterministic rule-based fallback if the model returns invalid syntax.

---

## 4. Phased Implementation Roadmap

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Phase 1   │ ──> │   Phase 2   │ ──> │   Phase 3   │ ──> │   Phase 4   │ ──> │   Phase 5   │
│ Foundation  │     │ Conversational│   │   Routing   │     │   Doctor    │     │ Admin & Audit│
│ & State     │     │   AI Triage   │   │  Gatekeeper │     │   Portal    │     │  Hardening  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

* **Phase 1: Architectural Foundation & Real-time State Bus**
  * Set up Express + Vite unified server, in-memory state stores for beds, patients, and doctors.
  * Implement Server-Sent Events (SSE) connection hub for zero-latency cross-client event broadcasting.
* **Phase 2: Conversational AI Intake Engine**
  * Integrate `@google/genai` on server with structured JSON schema extraction.
  * Build voice-to-text recording pipeline with live speech recognition and waveform feedback.
  * Implement printable stamped clinical assessment sheet generator.
* **Phase 3: Dual-Path Clinical Bed Routing**
  * Implement modified ESI/MTS acuity classification algorithm.
  * Branch high-acuity patients to immediate automatic bed allocation (`directAllocateBed`).
  * Route non-serious patients to `pending_doctor_review` status and dispatch `bed_request_created` events.
* **Phase 4: Physician Workflow & Approval Queue**
  * Build attending physician profile view with live header badge counters.
  * Create dedicated Bed Request Authorization interface with Approve and Decline modals.
  * Implement emergency bed preemption/override modal with mandatory clinical rationale notes.
* **Phase 5: Hospital Administration, Auditing & Resilience**
  * Build full bed census visualizer, department occupancy filters, and turnaround monitors.
  * Establish immutable audit logging system for all triage admissions, overrides, and dispositions.
  * Perform comprehensive end-to-end linting, typing, and production build optimization.

---

## 5. UI/UX & Design System Specifications

### 5.1 Visual Identity & Themes
* **Theme Archetype:** Clean, high-contrast, modern clinical dashboard (avoids low-effort dark gradients and AI clichés).
* **Primary Canvas:** Refined off-white and cool slate neutral (`#F8FAFC`, `#F1F5F9`).
* **Surface Containers:** Crisp white cards (`#FFFFFF`) with subtle 1px border definition (`#E2E8F0` / `#CBD5E1`) and optical contrast $\le 7\%$.

### 5.2 Semantic Color Palette

| Role | Color Family | TailWind Class | Usage |
| :--- | :--- | :--- | :--- |
| **Brand Primary** | Deep Navy / Medical Slate | `text-slate-900`, `bg-slate-900` | Header bars, primary navigation, main headings |
| **Clinical Accent** | Medical Blue / Cyan | `bg-blue-600`, `text-blue-600` | Interactive CTAs, patient intake cards, doctor profile badge |
| **Emergency / Critical** | High-Acuity Crimson | `bg-red-600`, `border-red-500` | Critical triage badges, direct bed alert banners, override actions |
| **Urgent / Warning** | Clinical Amber | `bg-amber-500`, `text-amber-900` | Urgent triage level, decline disposition pathways |
| **Stable / Success** | Medical Emerald | `bg-emerald-600`, `text-emerald-800`| Approved admissions, confirmed bed allocations, stable acuity |
| **Physician Review** | Clinical Indigo / Purple | `bg-indigo-600`, `border-indigo-400`| Non-serious pending request cards, review queues |

### 5.3 Typography & Hierarchy
* **Primary Font Family:** `Plus Jakarta Sans`, sans-serif (imported via Google Fonts).
* **Monospace Font:** System monospace / `font-mono` for bed identifiers (`GW-02`, `ICU-01`), timestamps, and medical license numbers.
* **Scale Ratio:** Major Second (1.125) / Minor Third (1.20) for dense, highly legible clinical data tables and dashboards.
* **Micro-copy Rule:** Badges, chips, and button labels must remain single-line (`whitespace-nowrap`) with 2x horizontal padding relative to vertical padding.

### 5.4 Component Spacing & Mathematical Rules
* **Card Padding:** Outer container padding $\ge 16\text{px}$ (typically `p-5` or `p-6` on desktop).
* **Nested Radius Rule:** Inner elements adhere to $R_{\text{inner}} = R_{\text{outer}} - \text{Padding}$. Standard outer radius is `rounded-2xl` (16px) or `rounded-3xl` (24px).
* **Responsive Layout:** Desktop-first 2-column or 3-column split view collapsing to single-column on mobile with touch targets $\ge 44\text{px}$.
