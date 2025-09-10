# 📱 SpendWise

**SpendWise** is an open-source, mobile-first expense tracking app that combines SMS parsing, on-device ML, and stunning visualizations — all while respecting your privacy. It’s designed to be fast, offline-ready, and fun to use. Built with **React Native (Expo)** and a lightweight **Bun + Express backend**, SpendWise turns your bank SMS alerts into rich insights.

---

## 🔍 Purpose

SpendWise automates personal expense tracking using local device capabilities:

- 📩 Parses bank SMS alerts via NLP
- 📊 Shows deep spending insights and trends
- 📉 Forecasts your future expenses using ML
- 🚨 Flags suspicious transactions
- 🔒 Keeps everything **local and encrypted**

---

## 🚀 Features

- **SMS-Based Tracking**: Auto-logs transactions using `compromise.js` NLP.
- **Budgets & Alerts**: Set category-based budgets and get real-time notifications.
- **Insights & Trends**: Visualize spending via `Victory` charts and `simple-statistics`.
- **ML Forecasting**: Predict future expenses using `TensorFlow.js`.
- **Anomaly Detection**: Identify potentially fraudulent transactions.
- **Offline-First**: Uses SQLite (`expo-sqlite`) for on-device storage.
- **Voice Queries**: Ask questions about your spending via `react-native-voice`.
- **Gamified UX**: Earn badges, progress rings, and reach savings goals.
- **Export Reports**: Export PDF/CSV summaries using `react-native-pdf-lib` and `papaparse`.
- **Privacy First**: All data is encrypted with `crypto-js` and never leaves your device.
- **Optional Backend**: Sync with a Bun + Express local server if desired.

---

## 🧰 Tech Stack

### 📱 Frontend
- React Native (Expo)
- NativeBase
- Victory / react-native-chart-kit
- Zustand
- SQLite (`expo-sqlite`)
- TanStack Router (navigation & routing)
- `react-native-voice`, `crypto-js`, `papaparse`, `react-native-pdf-lib`

### 🔧 Backend (Optional)
- Bun + Express
- SQLite
- OpenAPI (via `openapi-backend`)
- TensorFlow.js
- Simple-statistics

### 🧠 AI / ML
- NLP: `compromise.js`
- Forecasting: `@tensorflow/tfjs`
- Statistics: `simple-statistics`

### 🧪 Tooling & Testing
- **Routing**: `@tanstack/router`
- **Testing**: `vitest` (unit tests), `playwright` (end-to-end)
- **Linting**: Biome / ESLint
- **Docs**: OpenAPI YAML + Swagger UI (backend)

---

## 📦 Prerequisites

- Node.js v18+ (for Expo compatibility)
- Bun v1.0+ (for backend)
- Expo CLI: `npm install -g expo-cli`
- Git
- Expo Go app (for device testing)
- Optional: Android Studio / Xcode for emulators

---

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/amitksingh0880/spendwise.git
cd spendwise
