# Vitalis OS — Project Requirements Document (PRD)

---

## 1. Executive Summary & Vision
**Vitalis OS** is an intelligent, role-based healthcare operations platform bridging real-time conversational AI patient triage, clinical decision-support routing, and hospital bed management. It automates emergency intake prioritization while enforcing physician gatekeeping for inpatient bed authorizations.

The primary objective is eliminating emergency room bottlenecks by rapidly triaging incoming patients, instantly assigning beds to critical/life-threatening cases, and routing non-serious cases directly to the attending physician for clinical review and alternative care pathways.

---

## 2. Target Users & Personas

### 2.1 Intake Patient & Paramedic
* **Context:** Arriving at the hospital triage desk or submitting symptoms remotely prior to intake.
* **Needs:**
  * Fast, low-friction symptom communication via natural language (voice or text).
  * Multilingual support for non-native language speakers.
  * Real-time wait time forecasts and queue transparency.
  * Clear, printable clinical assessment sheets with bed stamps.

### 2.2 Attending Physician & Unit Doctor
* **Context:** Stationed in emergency, critical care, telemetry, or inpatient ward stations.
* **Needs:**
  * Instant, high-visibility notification of incoming critical bed allocations.
  * A dedicated authorization queue to review and approve/decline non-serious bed assignment requests.
  * Fast emergency bed preemption/override controls when capacity is at 100%.
  * One-click stat workup order dispatch and bedside care acknowledgment.

### 2.3 Hospital Administrator & Charge Nurse
* **Context:** Managing facility operations, ward staffing, and hospital throughput.
* **Needs:**
  * Bird's-eye view of all bed statuses (vacant, occupied, cleaning, reserved).
  * Departmental occupancy tracking across ICU, Emergency, General Ward, Telemetry, and Recovery.
  * Comprehensive immutable audit logging of clinical decisions and bed reallocations.

---

## 3. Core Feature Matrix

| Feature | Description | Target User |
| :--- | :--- | :--- |
| **Conversational AI Triage** | Multi-turn medical intake assistant capable of processing spoken voice or typed natural language symptoms. | Patient / Paramedic |
| **Structured Clinical Entity Extraction** | Converts natural language intake into normalized clinical entities: severity score (1–10), ESI triage level, symptoms list, recommended ward. | All |
| **High-Risk Direct Bed Allocation** | Automatically bypasses waiting rooms for `CRITICAL` or severity $\ge 7$ patients, assigning a vacant acute bed immediately. | Doctor / Patient |
| **Non-Serious Doctor Review Routing** | Suspends auto-bed assignment for stable/non-serious patients, routing a formal authorization request to the doctor's profile. | Doctor |
| **Physician Bed Approval & Decline Hub** | Modal-based clinical review allowing doctors to approve specific beds with admission notes or decline and divert to outpatient pathways. | Doctor |
| **Emergency Bed Override (Preemption)** | Enables authenticated clinicians to displace stable patients for emergent incoming cases with mandatory clinical justification. | Doctor |
| **Real-Time Distributed SSE Bus** | Zero-latency pub/sub event distribution keeping patient screens, doctor profiles, and hospital bed boards synchronized. | All |
| **Bed Turnaround Management** | Tracks post-discharge terminal cleaning lifecycles with time counters and turnover status updates. | Administrator / Nurse |
| **Printable Clinical Assessment Sheet** | Generates verified intake documentation with attending doctor details, patient demographics, vitals, and bed stamps. | Patient / Doctor |

---

## 4. Success Metrics & Performance KPIs
* **Triage Intake Velocity:** Average time to complete patient triage $\le 90$ seconds.
* **Critical Bed Assignment Latency:** Under 500ms from triage completion to bed reservation and doctor alert.
* **Bed Misallocation Reduction:** Zero unreviewed automatic admissions for stable/non-serious patients.
* **Audit Compliance:** 100% of emergency overrides and bed request approvals logged with attending physician identity and clinical rationale notes.
