# Vitalis OS — Visual Design System & UI Specifications

---

## 1. Visual Philosophy & Anti-Slop Principles

Vitalis OS is built around **clean, deliberate clinical utility** rather than generic AI templates. Every color, border, and pixel is mathematically determined to ensure rapid readability and cognitive clarity in high-stress clinical environments.

* **No AI Slop:** Strictly avoids purple-to-cyan dark gradients, floating neon drop-shadows, arbitrary glassmorphism, or nested cards inside cards.
* **Light Medical Canvas:** Built primarily on crisp light backgrounds with high text-to-background contrast meeting WCAG AA standards ($> 4.5:1$ for body text).
* **Information Density:** Utilizes structured tabular data and compact badges rather than oversized hero sections.

---

## 2. Color Palette & Semantic Tokens

### 2.1 Primary & Neutral Foundations
* **Background Canvas:** `bg-slate-50` (`#F8FAFC`) — Soft, eye-safe clinical neutral.
* **Surface Containers:** `bg-white` (`#FFFFFF`) — High-contrast card surfaces.
* **Borders & Dividers:** `border-slate-200` (`#E2E8F0`) / `border-slate-300` (`#CBD5E1`) — Crisp, 1px structural framing.
* **Primary Text:** `text-slate-900` (`#0F172A`) — Deep clinical slate.
* **Muted / Secondary Text:** `text-slate-500` (`#64748B`) / `text-slate-600` (`#475569`).

### 2.2 Clinical Severity & Status Colors

| Semantic Meaning | Color Family | Tailwind Classes | UI Application |
| :--- | :--- | :--- | :--- |
| **Critical / Level 1** | Crimson / Red | `bg-red-600`, `text-red-700`, `border-red-400` | Immediate life-threat badges, emergency override, direct assign CTAs |
| **Urgent / Level 2** | Amber / Orange | `bg-amber-500`, `text-amber-900`, `border-amber-300` | Urgent acuity badges, decline disposition warnings |
| **Non-Urgent / Stable** | Emerald / Green | `bg-emerald-600`, `text-emerald-800`, `border-emerald-300` | Stable triage rating, confirmed admissions, vacant beds |
| **Physician Review** | Indigo / Violet | `bg-indigo-600`, `text-indigo-900`, `border-indigo-400` | Bed assignment review cards, authorization queue tabs |
| **Cleaning / Turnaround**| Sky Blue / Cyan | `bg-sky-500`, `text-sky-900`, `border-sky-300` | Beds undergoing terminal sanitation |

---

## 3. Typography & Mathematical Scale

* **Primary Font Family:** `Plus Jakarta Sans`, sans-serif (imported via Google Fonts).
* **Monospace Font:** System monospace (`font-mono`) used for identifiers (`GW-02`, `ICU-01`), timestamps, and medical license numbers.
* **Scale Ratio:** Major Second (1.125) / Minor Third (1.20) for dense, flexible clinical hierarchies:
  * **H1 / Page Title:** 24px–28px (`text-2xl`, `font-black`, tracking-tight)
  * **H2 / Section Title:** 18px–20px (`text-lg` or `text-xl`, `font-extrabold`)
  * **H3 / Card Header:** 14px–16px (`text-sm` or `text-base`, `font-bold`)
  * **Body Text:** 13px–14px (`text-xs` or `text-sm`, `font-normal`, line-height 1.5–1.6)
  * **Captions & Metadata:** 11px–12px (`text-[11px]` or `text-xs`, `font-medium`)

---

## 4. Spacing & Layout Math

1. **The Nested Border Radius Formula:**
   Whenever a rounded container sits inside another rounded container, the inner corner radius is mathematically calculated:
   $$R_{\text{inner}} = R_{\text{outer}} - \text{Padding}$$
   *Example:* An outer card with `rounded-3xl` (24px) and padding of `p-2` (8px) uses `rounded-2xl` (16px) for its inner badge or banner.
2. **Button Padding Proportions:**
   Horizontal padding is strictly twice the vertical padding:
   * Standard button: `py-2 px-4` (8px vertical, 16px horizontal).
   * Compact chip: `py-1.5 px-3` (6px vertical, 12px horizontal).
3. **No Multi-Line Badges:**
   Text inside pills, chips, and badges sits on exactly ONE line (`whitespace-nowrap`). Badges scale with their text rather than wrapping.

---

## 5. Component Patterns & Interactive States

* **Triage Chat Bubble:**
  * AI Message: Light slate background (`bg-slate-100`), dark text, subtle border, accompanied by the animated `VitalisBotAvatar`.
  * User Message: Rich medical blue (`bg-blue-600`), white text, aligned to the right.
* **Review Cards:**
  * Bordered by an indigo accent line (`border-indigo-400/80`) with high-contrast action buttons: Emerald "Approve" button and amber "Decline" button.
* **Direct Bed Allocation Cards:**
  * High-acuity red accent (`bg-red-50`, `border-red-300`, `text-red-900`) with pulsing indicator and stat order dispatch buttons.
* **Accessible Touch Targets:**
  * All interactive elements maintain a minimum hit box of $44 \times 44\text{px}$ on mobile viewports.
