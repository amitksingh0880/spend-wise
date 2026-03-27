# Modern Enhancements Roadmap (Offline-First)

This plan is tailored for `spend-wise` and keeps the product USP intact: **no external storage required**.

## Guiding Principles

- **Local-first**: all inference and storage on-device.
- **Explainable AI**: every score/recommendation includes reasons.
- **Progressive rollout**: ship usable slices every sprint.
- **Compatibility**: build on current `services/*` architecture and `app/(tabs)` UI.

---

## Phase 1 — Intelligence Foundation (2–3 sprints)

### 1) On-device Receipt OCR + Smart Split
- Build `receiptIntelligenceService` with:
  - OCR adapter interface (native module / Expo plugin capable)
  - line-item extraction schema
  - split strategies: equal, weighted, by category/project/person
- MVP acceptance:
  - import receipt text/image metadata
  - extract line items with confidence
  - auto-create split-ready draft transactions

### 2) Personal Finance Copilot (offline)
- Build local NL query layer over current transactions/budgets.
- Supported intents (MVP):
  - unusual spends by category/time
  - budget status
  - top categories this week/month
- MVP acceptance:
  - no network dependency
  - deterministic, explainable responses

### 3) Explainable Anomaly Scores
- Add anomaly scoring factors:
  - amount outlier (z-score)
  - unusual time-of-day
  - unusual vendor for category
  - rapid repeat transactions
- MVP acceptance:
  - each flag includes machine-readable reasons + human summary

---

## Phase 2 — Decisioning + Automation (2–4 sprints)

### 4) Predictive What-if Simulator
- Scenario parser (e.g., `rent +10%, fuel +15%`).
- Forward impact model for month-end projection.
- MVP acceptance:
  - compare baseline vs scenario
  - show per-category and total impact

### 5) Contextual Nudges
- Trigger system for real-time prompts:
  - overspending today/week/month
  - budget trajectory risk
  - recurring bill due soon
- MVP acceptance:
  - one-tap actions (`move budget`, `set rule`, `snooze`)

### 6) Advanced Automation Builder
- Visual rule builder UI over `rulesEngineService`:
  - IF conditions (vendor/amount/time/recurrence)
  - THEN actions (category/tag/type/alert)
- MVP acceptance:
  - create/edit/enable/disable/delete rules
  - preview matched historical transactions

---

## Phase 3 — Experience + Profiles (3–5 sprints)

### 7) Calendar & Timeline View
- Heatmap + timeline of:
  - spend spikes
  - bill dates
  - recurring outflows
- MVP acceptance:
  - day and month drill-down

### 8) Multi-Vault Profiles
- Separate encrypted vaults per profile (`Personal`, `Family`, `Business`).
- Vault switcher and scoped data services.
- MVP acceptance:
  - isolated transactions/budgets/rules per vault

### 9) Voice-first Capture (offline)
- Local speech-to-structured transaction draft pipeline.
- MVP acceptance:
  - "Spent 120 on metro" creates editable draft with inferred category

### 10) Home-screen Widgets
- Daily burn + remaining budget widgets.
- MVP acceptance:
  - quick glance values refreshed from local store

---

## Phase 4 — Product Polish (continuous)

### 11) Design System Refresh
- Better motion defaults and reduced-motion support
- Improved contrast and accessibility labels
- Consistent empty/loading/error states

### 12) Reliability + Observability (local)
- Local event logs for debugging (non-sensitive)
- Recovery-safe migrations for future storage evolution

---

## Suggested File Placement

- `services/modernIntelligenceService.ts` — copilot + simulation + explainable anomalies + nudges
- `services/receiptIntelligenceService.ts` — OCR abstraction and smart splits
- `services/vaultService.ts` — profile vault lifecycle and active vault context
- `app/(tabs)/insights.tsx` — scenario simulator panel
- `app/(tabs)/transaction.tsx` — contextual nudges and anomaly reason chips
- `app/(tabs)/settings.tsx` — automation builder + vault manager entry

---

## Delivery Notes

- Keep all new services pure and testable with deterministic inputs.
- Prefer incremental feature flags in preferences for safe rollout.
- Avoid introducing cloud dependencies unless explicitly enabled by user.
