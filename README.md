# Pulse Health — Continuous Metabolic Intelligence Platform

> **Product Vision**: "Your health data comes together automatically, so you spend less time logging and more time improving."

Pulse Health is a modern healthcare web application inspired by continuous metabolic tracking and unified health data profiles. It replaces tedious manual calorie logging with background wearable telemetry, harmonizing continuous glucose (CGM), heart rate, sleep architecture, and activity streams into an actionable metabolic baseline.

---

## 1. Scope & Core Architecture

```
LANDING PAGE
     ↓
SIGN UP / LOGIN (Encrypted sessions, demo account auto-fill)
     ↓
HEALTH PROFILE ONBOARDING (6-Step Wizard)
  ├── 1. Personal Information (Demographics, height, weight)
  ├── 2. Medical History (Conditions, medications, allergies, "prefer not to say")
  ├── 3. Health Goals (Primary metabolic priorities & secondary targets)
  ├── 4. Food & Lifestyle (Dietary pattern, meal window, circadian rhythm)
  ├── 5. Health Data Sources (Apple Health, CGM, Fitbit, Oura, Garmin)
  └── 6. Explicit Consent (Non-prechecked granular permissions & revocability)
     ↓
CONTINUOUS HEALTH DASHBOARD
  ├── "Good morning, [Name]" overview
  ├── 6 Core Metric Cards: Glucose, Steps, Resting Pulse, Sleep, Weight, Activity
  ├── 24-Hour Interstitial Glucose Curve (Interactive Recharts with 70–140 target corridor)
  ├── Daily Health Rhythm: 30-Second 1-tap check-in with immediate guidance
  └── Device Sync Control (Background passive telemetry)
     ↓
SPECIALIZED HEALTH MODULES
  ├── Continuous Health Timeline (Grouped by time and source)
  ├── Personalized Insights (Strictly segregated: Data Observation vs Wellness Recommendation)
  ├── Connected Data Center (Live connection status, sync states, connect/disconnect)
  ├── Goals Management (Primary & secondary targets)
  ├── Care Program & Care Team (12-week protocol & asynchronous messaging with Dr. Sarah Lin)
  └── Unified Health Profile (Harmonized clinical parameters, medical history, legal consents)
```

---

## 2. Technologies Used

- **Framework**: Next.js 14 (App Router, React 18, Strict TypeScript)
- **Styling**: Tailwind CSS with custom healthcare palette (Teal, Emerald, Slate)
- **Icons**: Lucide React
- **Charts**: Recharts (Accessible SVG time-series visualization)
- **Database & ORM**: Prisma ORM with SQLite (local development zero-config) and PostgreSQL production ready
- **Authentication**: Secure JWT sessions (`jose`), bcrypt password hashing, HTTP-only secure cookies
- **Validation**: Zod schema validation on all API endpoints
- **Architecture**: Modular provider adapter pattern (`BaseHealthDataProvider`)

---

## 3. Environment Variables Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `APP_NAME` | Application Brand Name | `"Pulse Health"` |
| `NEXT_PUBLIC_APP_URL` | Base application URL | `"http://localhost:3000"` |
| `DATABASE_URL` | Database connection string | `"file:./dev.db"` (SQLite) |
| `AUTH_SECRET` | 32+ character JWT signing key | Required for production |
| `DEMO_MODE` | Enables realistic telemetry simulation | `"true"` |
| `APPLE_HEALTH_*` | Apple HealthKit OAuth credentials | Optional (auto-mocks if empty) |
| `GOOGLE_HEALTH_*` | Google Health Connect credentials | Optional (auto-mocks if empty) |
| `FITBIT_*` | Fitbit Web API credentials | Optional (auto-mocks if empty) |
| `GARMIN_*` | Garmin Health credentials | Requires enterprise partner access |
| `OURA_*` | Oura Ring Cloud API v2 | Optional (auto-mocks if empty) |

*Security Rule: Real API credentials, keys, and tokens are NEVER hard-coded or committed to git.*

---

## 4. Integration Status (Real vs Mocked)

Pulse Health enforces strict honesty: integrations without live OAuth credentials operate through realistic simulated adapters that explicitly label all data as **DEMO DATA**:

- **Real Implementations**: OAuth 2.0 redirection parameters, code token exchange flows, and schema models for Apple Health, Google Health Connect, Fitbit, and Oura.
- **Mock Fallback**: When environment credentials are not present, the `BaseHealthDataProvider` dynamically switches to the `generateRealisticMockTelemetry` engine.
- **Clinical Device Notice**: Medical CGM (Dexcom) and smart scales (Withings) require official enterprise medical device platform agreements and are noted accordingly.

---

## 5. Local Setup & Running

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Initialize Database
```bash
npx prisma db push
```

### Step 3: Seed Realistic Demo Telemetry
```bash
node scripts/seed.mjs
```
*Preloads Alex Morgan's account with 24 hours of simulated CGM, Apple Watch, and Oura Ring data:*
- **Email**: `alex.morgan@pulsehealth.demo`
- **Password**: `DemoPassword123!`

### Step 4: Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 6. Security, Privacy & Clinical Safety

- **Tenant Isolation**: Every API endpoint strictly validates `session.userId` against requested entities. Users cannot view or mutate another user's health metrics.
- **Explicit Consent**: Zero pre-checked consent checkboxes during onboarding. Granular consent records stored in `ConsentRecord`.
- **Clinical Safety Disclaimers**: Non-diagnostic language enforced across all UI. The platform observes trends and suggests wellness habits; medical advice is reserved for licensed physicians.
- **Compliance Placeholder**: *"Compliance review required before production healthcare deployment."*

---

## 7. Roadmap & Next Steps

1. **Native HealthKit Bridge**: Implement React Native / Swift companion app for continuous native HealthKit background delivery.
2. **HL7 / FHIR Ingestion**: Support FHIR R4 standard for importing existing electronic health records (EHR).
3. **AI Metabolic Simulation Engine**: Ingest continuous meal photos with multimodal vision to correlate postprandial glucose excursions with specific macronutrients.
