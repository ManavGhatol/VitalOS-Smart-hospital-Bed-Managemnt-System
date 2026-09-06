# Vitalis OS — AI Boundaries, Coding Guardrails & Operational Rules

---

## 1. Clinical Safety & Medical Boundaries

1. **Strictly Non-Diagnostic:** The AI must explicitly act as a triage priority classifier, not a diagnostician. Every assessment sheet and triage dialog must explicitly include a medical disclaimer.
2. **Strictly Non-Prescriptive:** The AI is strictly barred from recommending or prescribing specific prescription drugs, dosages, or self-medication regimens.
3. **Conservative High-Risk Prioritization:** If any red-flag keywords or symptoms appear (e.g., chest pain radiating to arm, anaphylaxis, severe dyspnea, rigid neck with high fever, sudden slurred speech), the system must enforce `CRITICAL` triage priority with severity $\ge 7$.
4. **Physician Authority Overrides AI:** In all instances where hospital beds are concerned, the attending doctor has absolute authority to override AI triage suggestions, reject non-serious admissions, or preempt beds.

---

## 2. API Key Security & Architectural Guardrails

1. **Default Full-Stack Architecture:** All third-party SDKs and Google Gen AI calls MUST remain inside `server.ts` or server-side modules.
2. **Never Expose Secret Keys to Browser:** The `GEMINI_API_KEY` must never be prefixed with `VITE_` and must never be accessed via `import.meta.env`.
3. **No UI for API Keys:** Never generate input fields, configuration dialogues, or modal forms asking users to type API keys or secrets. Configuration must come via environment variables documented in `.env.example`.
4. **Fixed Port 3000:** In dev and production, the server MUST bind strictly to port `3000` and host `0.0.0.0`. Do not attempt to override or read custom ports.

---

## 3. Approved vs. Banned Libraries

| Category | Approved Libraries | Banned / Prohibited Patterns |
| :--- | :--- | :--- |
| **Styling** | Tailwind CSS utility classes | Custom `.css` files, styled-components, CSS-in-JS, inline `style={...}` objects |
| **Icons** | `lucide-react` exclusively | FontAwesome, custom SVGs, React-Icons |
| **AI SDK** | `@google/genai` (Node.js server) | Legacy `@google/generative-ai`, client-side GenAI SDK calls |
| **Animations** | `motion` (imported from `motion/react`) | Framer-motion legacy imports, jQuery |
| **Charts** | `recharts` / `d3` | Unmaintained or mock visualization scripts |
| **Dialogs** | Built-in accessible React components / Tailwind modals | Browser `window.alert()`, `window.prompt()`, `window.confirm()` (blocked in iframes) |

---

## 4. Error Handling & System Resilience

1. **Lazy SDK Initialization:** Initialize the Google Gen AI client inside the request route or lazily so server startup does not crash if the key is missing or invalid.
2. **Structured JSON Fallback:** If the LLM generates conversational text around the JSON payload or formatting issues occur, the parser must apply regex boundary matching (`\{[\s\S]*\}`) before attempting `JSON.parse()`. If that fails, it must fall back to a safe deterministic triage result.
3. **SSE Resilience & Auto-Reconnect:**
   * If the SSE connection drops or is closed by the browser, the client must automatically fall back to background polling (`fetchPatientStatus` every 3s).
   * SSE subscriber handlers must be cleanly unregistered when components unmount to prevent memory leaks.
4. **Microphone & Audio Graceful Degradation:**
   * If microphone permissions are denied or the browser does not support `webkitSpeechRecognition`, disable the mic button with a helpful tooltip and instruct the user to type symptoms.

---

## 5. Coding Standards & Conventions

1. **TypeScript Typing:**
   * All shared entities (Patient, Bed, Doctor, BedAssignmentRequest) must be declared in `/src/types.ts`.
   * Standard `enum` or union types must be used instead of `const enum`.
   * Never use `any` when explicit types can be modeled.
2. **Avoid File Bloat:**
   * Do not put all logic into `App.tsx` or a single file. Sub-components (dashboards, modals, avatars) must live in modular files in `/src/components/`.
3. **Read-Modify-Write Rule:**
   * Always call `view_file` on target code before performing surgical edits to verify exact line contents.
