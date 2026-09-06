# Vitalis OS — Intelligent Healthcare Triage & Bed Allocation Platform

> A real-time, role-based clinical intake and hospital bed management platform powered by conversational AI, clinical decision-support routing, and live Server-Sent Events (SSE).

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.1-38bdf8.svg)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gen_AI-Gemini_2.5_Flash-orange.svg)](https://ai.google.dev/)

---

## 📋 Overview

Emergency departments and hospital wards face chronic bottlenecks caused by delayed intake triage, manual phone-based bed assignments, and unvetted admissions.

**Vitalis OS** solves this with an intelligent, closed-loop clinical management system:
1. **Empathetic AI Triage:** Patients or paramedics report symptoms through conversational speech or text. The system leverages Google Gemini to normalize symptoms and determine clinical acuity using an adapted Emergency Severity Index (ESI).
2. **Dual-Path Bed Gatekeeping:**
   * **High-Risk / Critical Patients ($\ge 7$ or `CRITICAL`):** Instantly allocated a vacant acute care bed (`directAllocateBed`) with real-time push alerts sent directly to the assigned doctor.
   * **Non-Serious / Stable Patients ($\le 6$ or `NON-URGENT`):** Auto-allocation is suspended. A bed request is routed to the attending physician's profile for clinical review, preventing hospital bed saturation.
3. **Physician Authorization Hub:** Doctors can approve inpatient admissions with specific bed assignments or decline and route patients to alternative care pathways (outpatient specialist, home care, or ambulatory observation).
4. **Emergency Bed Preemption (Override):** When units are at 100% capacity and a critical patient arrives, doctors can safely reallocate beds from stable patients with mandatory clinical justification and license verification.

---

## ⚡ Key Features

* 🎙️ **Multimodal Voice & Text Triage:** Hands-free voice symptom intake utilizing Web Speech API and MediaRecorder audio processing.
* 🧠 **Structured Clinical Entity Extraction:** Transforms raw natural language into standardized medical entities (severity 1–10, ESI triage level, normalized symptoms, recommended department).
* 🚨 **Direct Critical Bed Assignment:** Zero-wait bed reservations for acute cardiac, respiratory, and trauma emergencies.
* 📋 **Physician Review & Approval Queue:** Live pending request counter, review cards, and dedicated Approve/Decline modals with clinical documentation.
* 🔄 **Emergency Bed Override:** Authenticated clinician preemption workflow to displace stable occupants when wards are full.
* 📡 **Zero-Latency Real-Time Bus:** Built on Server-Sent Events (SSE) to synchronize patient intake terminals, doctor dashboards, and charge nurse boards without polling.
* 🛏️ **Interactive Hospital Bed Census:** Live tracking across ICU, Emergency, General Ward, Telemetry, and Recovery units with terminal cleaning workflows.
* 📄 **Verified Clinical Assessment Sheets:** Digital, printable intake sheets featuring attending physician details, vitals summary, and verified bed stamps.

---

## 🏗️ Technical Architecture & Stack

```
[Patient / Paramedic Client]
         │ (Voice / Text Symptoms)
         ▼
[POST /api/triage/chat (Express Server)]
         │
         ├───> [Google Gen AI SDK (@google/genai)] ──> Structured Clinical JSON
         │
         ├───> [Clinical Triage Classifier (ESI / MTS Logic)]
         │        ├── If Severity ≥ 7 or CRITICAL:
         │        │     └──> [directAllocateBed()] ──> Auto-allocates Acute Bed
         │        │
         │        └── If Severity ≤ 6 or NON-URGENT:
         │              └──> Creates BedAssignmentRequest (status: 'pending_doctor_review')
         │
         ├───> [In-Memory State Engine & Audit Log Generator]
         │
         └───> [SSE Event Bus (/api/events)] 
                  ├──> Doctor Dashboard (Alerts & Review Queue)
                  ├──> Admin Census & Bed Status
                  └──> Patient Intake Terminal
```

* **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Motion.
* **Backend:** Node.js, Express, TypeScript, Server-Sent Events (SSE).
* **AI Model:** Google Gen AI (`@google/genai` SDK) utilizing `gemini-2.5-flash`.
* **Security:** Strict server-side API proxying — API keys and medical logic are never exposed to the client.

---

## 📂 Project Structure

```
├── index.html                      # HTML5 entry point with metadata sync
├── metadata.json                   # Application metadata & iframe permissions
├── package.json                    # Dependencies & build scripts
├── server.ts                       # Express backend, Gemini proxy, SSE bus, bed logic
├── tsconfig.json                   # TypeScript compiler configuration
├── vite.config.ts                  # Vite build & Tailwind CSS plugin
├── README.md                       # Main project overview (this file)
├── PRD.md                          # Product Requirements Document
├── Architecture.md                 # Technical architecture & API reference
├── Rules.md                        # AI boundaries, coding guardrails & error handling
├── Phases.md                       # Phased development roadmap
├── Design.md                       # Visual design system & color palette
├── Memory.md                       # AI context memory & state reference
└── src/
    ├── main.tsx                    # Client entry point
    ├── index.css                   # Global styles & Tailwind imports
    ├── types.ts                    # Canonical data interfaces (Patient, Bed, Doctor, etc.)
    ├── data/
    │   └── initialData.ts          # Seed data (doctors, wards, beds, mock patients)
    ├── services/
    │   └── api.ts                  # REST API client & SSE subscription manager
    ├── components/
    │   ├── Navigation.tsx          # Role switcher (Patient / Doctor / Admin)
    │   ├── PatientTriageChat.tsx   # Conversational triage terminal & voice input
    │   ├── DoctorDashboard.tsx     # Physician profile, alerts, bed approval queue
    │   ├── AdminDashboard.tsx      # Hospital bed census, turnover tracking, audit logs
    │   ├── AssessmentSheetModal.tsx # Printable clinical intake summary & bed stamp
    │   └── VitalisBotAvatar.tsx    # Animated clinical AI bot avatar
    └── lib/
        └── utils.ts                # Class merging utility
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js:** v18.0.0 or higher
* **npm** or **bun**
* **Google Gemini API Key:** Required for AI triage extraction ([Google AI Studio](https://aistudio.google.com/))

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd vitalis-os
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   Add your Gemini API key:
   ```env
   GEMINI_API_KEY="your_actual_gemini_api_key"
   ```

### Running the Application

* **Development Mode:**
  Starts the full-stack server with live Vite middleware on port 3000:
  ```bash
  npm run dev
  ```
  Open `http://localhost:3000` in your browser.

* **Type Checking & Linting:**
  ```bash
  npm run lint
  ```

* **Production Build:**
  Compiles the React frontend into `/dist` and bundles `server.ts` into a self-contained CommonJS binary (`dist/server.cjs`):
  ```bash
  npm run build
  ```

* **Production Start:**
  ```bash
  npm start
  ```

---

## 🩺 Clinical Algorithms & Logic

### 1. Adapted Emergency Severity Index (ESI)
* **Level 1 (`CRITICAL`):** Severe life-threats (acuity $\ge 7$, chest pressure, dyspnea, hemorrhage). Bypasses waiting room for immediate resuscitation.
* **Level 2 (`URGENT`):** High risk of deterioration (acuity $5 - 6$). Prioritized in physician review queues.
* **Level 3–5 (`NON-URGENT`):** Hemodynamically stable (acuity $\le 4$). Evaluated for outpatient or home discharge.

### 2. Multi-Factor Bed Placement Scoring
When beds are allocated, candidate beds are scored:
$$\text{Score}(B) = 50 \cdot M_{\text{ward}}(B) + 30 \cdot M_{\text{status}}(B) + 20 \cdot M_{\text{equipment}}(B)$$
Only beds with `status: vacant` are eligible for assignment.

---

## 🔒 Security & Clinical Boundaries

* **Non-Diagnostic Tool:** The AI provides preliminary triage prioritization and structured summaries; it does not replace physician clinical judgment.
* **Non-Prescriptive:** The system does not provide prescription medication advice or dosages.
* **Physician Sovereignty:** Hospital doctors hold absolute authority over bed placements, admission authorizations, and emergency preemptions.
* **Audit Trail:** All triage assessments, bed assignments, and emergency overrides are logged with timestamps, clinician IDs, and medical notes.

---

## 📄 License
This project is proprietary and maintained for healthcare clinical operations prototyping.
