# Vitalis OS — Architecture & Technical Design

---

## 1. High-Level Architecture

Vitalis OS is architected as a **Full-Stack Single-Page Application (SPA) with an Express Backend and Real-Time Event Bus**. All communication with the Google Gemini AI model and state modifications are mediated through the secure backend service.

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Tier                           │
│  React 18 + Vite SPA | Tailwind CSS | Lucide Icons          │
│  ├── Patient Triage Terminal (Voice & Text)                 │
│  ├── Attending Doctor Profile & Review Dashboard            │
│  └── Admin Bed Census & Turnaround Hub                      │
└──────────────┬───────────────────────────────▲──────────────┘
               │ HTTP REST                     │ SSE Event Stream
               │ (POST / GET)                  │ (/api/events)
┌──────────────▼───────────────────────────────┴──────────────┐
│                       Server Tier                           │
│  Express Runtime (Node.js + TypeScript / `server.ts`)       │
│  ├── Gemini AI Proxy (Structured Extraction & Triage)       │
│  ├── Clinical Routing & Bed Matching Engine                 │
│  ├── Physician Authorization & Preemption Controller        │
│  ├── In-Memory State Store (Beds, Patients, Doctors, Logs)  │
│  └── SSE Pub/Sub Event Bus Connection Pool                  │
└──────────────────────────────┬──────────────────────────────┘
                               │ Private SDK
┌──────────────────────────────▼──────────────────────────────┐
│                    External AI Tier                         │
│  Google Gen AI API (`@google/genai` SDK)                    │
│  └── Gemini 2.5 Flash / Gemini Pro                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. End-to-End Application Flow

1. **Intake Initiation:** The patient or paramedic accesses the Triage Chat terminal. Input can be typed or spoken using the Web Speech / MediaRecorder audio pipeline.
2. **AI Inference & Extraction:** The backend proxies the input to Google Gen AI with a constrained JSON schema. Gemini returns normalized symptoms, clinical rationale, recommended unit, and an acuity score (1–10).
3. **Clinical Branching Decision:**
   * **High Risk ($\ge 7$ or `CRITICAL`):** Calls `directAllocateBed()`, assigns an immediate acute bed, and broadcasts `bed_allocated` to all clients.
   * **Non-Serious ($\le 6$ or `NON-URGENT`):** Suspends auto-allocation, creates a `BedAssignmentRequest` (`status: pending_doctor_review`), and broadcasts `bed_request_created`.
4. **Physician Review & Gatekeeping:** The request appears prominently on the assigned doctor's dashboard. The doctor approves the admission (selecting an inpatient bed) or declines with an alternative outpatient/home care care plan.
5. **Real-Time Synchronization:** All state mutations trigger `broadcastEvent()` across the SSE bus, keeping all connected doctor stations, patient terminals, and admin screens synchronized with zero manual reloads.

---

## 3. Technology Stack

* **Frontend:**
  * Framework: React 18 with Vite
  * Language: TypeScript (strict typing)
  * Styling: Tailwind CSS (modern `@import "tailwindcss";` setup)
  * Icons: `lucide-react`
  * Visual Effects: `canvas-confetti`
* **Backend:**
  * Runtime: Node.js with Express
  * Transpiler: `tsx` (development) and `esbuild` (production bundled `.cjs`)
  * Port & Host: Bound to `0.0.0.0:3000`
* **AI & Machine Learning:**
  * SDK: `@google/genai`
  * Model: `gemini-2.5-flash`
  * Security: API key accessed via `process.env.GEMINI_API_KEY` (never exposed to browser)
* **Real-Time Communication:**
  * Native Server-Sent Events (SSE) stream at `/api/events`

---

## 4. File and Folder Structure

```
├── index.html                      # Primary HTML5 entry point & meta tags
├── metadata.json                   # App capabilities, name, and permissions
├── package.json                    # Scripts and dependencies
├── server.ts                       # Express backend, Gemini API proxy, SSE bus, bed logic
├── tsconfig.json                   # TypeScript config
├── vite.config.ts                  # Vite build configuration
├── PRD.md                          # Product Requirements Document
├── Architecture.md                 # Technical architecture & design (this file)
├── Rules.md                        # AI boundaries, coding guardrails & error rules
├── Phases.md                       # Phased development roadmap
├── Design.md                       # UI/UX design specifications & palette
├── Memory.md                       # Current project context & status memory
└── src/
    ├── main.tsx                    # Client entry point
    ├── index.css                   # Tailwind entry file
    ├── types.ts                    # Global TypeScript interfaces & data contracts
    ├── data/
    │   └── initialData.ts          # Seed beds, doctors, departments, and mock patients
    ├── services/
    │   └── api.ts                  # API client functions & SSE subscription helper
    ├── components/
    │   ├── Navigation.tsx          # Top bar navigation & role switcher
    │   ├── PatientTriageChat.tsx   # Conversational triage terminal & audio intake
    │   ├── DoctorDashboard.tsx     # Doctor profile, direct alerts, bed approval queue
    │   ├── AdminDashboard.tsx      # Hospital bed census, turnover tracking, audit log
    │   ├── AssessmentSheetModal.tsx # Printable clinical intake summary & bed stamp
    │   └── VitalisBotAvatar.tsx    # Animated AI bot visual avatar
    └── lib/
        └── utils.ts                # Utility functions (`cn` class merger)
```

---

## 5. API Route Specification

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Healthcheck returning system status and uptime |
| `GET` | `/api/events` | SSE endpoint broadcasting live state mutations to connected clients |
| `POST` | `/api/triage/chat` | Proxies user input to Gemini; extracts structured clinical triage JSON |
| `POST` | `/api/triage/audio` | Transcribes spoken audio streams into structured clinical text |
| `GET` | `/api/patients` | Returns active intake and admitted patient roster |
| `GET` | `/api/beds` | Returns hospital bed census with statuses and equipment |
| `GET` | `/api/doctors` | Returns authenticated doctor list and department affiliations |
| `POST` | `/api/beds/allocate` | Matches and allocates optimal vacant bed for a given patient |
| `POST` | `/api/emergency/override` | Preempts stable occupant to assign acute bed to emergent patient |
| `GET` | `/api/doctor/bed-requests` | Retrieves non-serious bed assignment requests awaiting doctor authorization |
| `POST` | `/api/doctor/approve-bed-request`| Physician approval of inpatient admission with clinical notes |
| `POST` | `/api/doctor/decline-bed-request`| Physician decline routing stable patient to outpatient pathways |
| `POST` | `/api/beds/discharge` | Discharges patient and transitions target bed to `cleaning` status |
| `POST` | `/api/beds/complete-cleaning` | Resets cleaned bed back to `vacant` status ready for admissions |
