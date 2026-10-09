# Pulse Health — External Health Integrations Architecture

This document specifies the technical integration specifications, OAuth 2.0 flows, required environment credentials, error handling, and data synchronization behaviors for external health platforms supported by Pulse Health.

---

## 1. Provider Integration Matrix

| Provider | Category | Auth Method | Environment Variables Required | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Apple Health** | Wearable | HealthKit / OAuth | `APPLE_HEALTH_CLIENT_ID`, `APPLE_HEALTH_CLIENT_SECRET`, `APPLE_HEALTH_REDIRECT_URI` | Simulated in Demo; Real requires Apple Developer Program HealthKit entitlement |
| **Google Health Connect** | Wearable | OAuth 2.0 / REST | `GOOGLE_HEALTH_CLIENT_ID`, `GOOGLE_HEALTH_CLIENT_SECRET`, `GOOGLE_HEALTH_REDIRECT_URI` | Simulated in Demo; Real requires Google Cloud Fitness API verification |
| **Fitbit Web API** | Wearable | OAuth 2.0 PKCE | `FITBIT_CLIENT_ID`, `FITBIT_CLIENT_SECRET`, `FITBIT_REDIRECT_URI` | Production Adapter Ready; Mock fallback when credentials absent |
| **Garmin Health API** | Wearable | OAuth 1.0a / 2.0 | `GARMIN_CLIENT_ID`, `GARMIN_CLIENT_SECRET`, `GARMIN_REDIRECT_URI` | Integration requires provider approval / production credentials |
| **Oura Cloud API v2** | Wearable | OAuth 2.0 Bearer | `OURA_CLIENT_ID`, `OURA_CLIENT_SECRET`, `OURA_REDIRECT_URI` | Production Adapter Ready; Mock fallback when credentials absent |
| **Dexcom CGM API** | Glucose | OAuth 2.0 | `DEXCOM_CLIENT_ID`, `DEXCOM_CLIENT_SECRET` | Integration requires provider approval / production credentials |
| **Withings API** | Body Scale | OAuth 2.0 | `WITHINGS_CLIENT_ID`, `WITHINGS_CLIENT_SECRET` | Integration requires provider approval / production credentials |

---

## 2. Detailed Provider Specifications

### A. Apple Health (HealthKit)

- **Purpose**: Passive background collection of continuous step cadence, active energy expenditure, resting and walking heart rates, and sleep stage analysis.
- **Authentication Method**: Native iOS HealthKit Authorization or Apple Server-to-Server Token Exchange.
- **Required Environment Variables**:
  - `APPLE_HEALTH_CLIENT_ID`
  - `APPLE_HEALTH_CLIENT_SECRET`
  - `APPLE_HEALTH_REDIRECT_URI`
- **OAuth Flow**: Authorization Code Flow (`response_type=code`).
- **Required Scopes**:
  - `healthkit.read`
  - `healthkit.activity.read`
  - `healthkit.heart.read`
- **Data Retrieved**:
  - `HKQuantityTypeIdentifierStepCount` -> `steps` (count)
  - `HKQuantityTypeIdentifierHeartRate` -> `heart_rate` (bpm)
  - `HKCategoryTypeIdentifierSleepAnalysis` -> `sleep_duration` (minutes)
  - `HKQuantityTypeIdentifierActiveEnergyBurned` -> `active_energy` (kcal)
- **Sync Frequency**: Background delivery via observer queries, or 15-minute polling batches.
- **Error Handling**: Graceful degradation when permissions are denied by user; flags missing data points without failing pipeline.
- **Disconnect Behavior**: Revokes local session tokens, sets device state to `DISCONNECTED`, and marks `ConsentRecord` as revoked.

---

### B. Google Health Connect (Android)

- **Purpose**: Unified aggregation across Android-connected hardware (Pixel Watch, Samsung Galaxy Watch, third-party sensors).
- **Authentication Method**: Google OAuth 2.0.
- **Required Environment Variables**:
  - `GOOGLE_HEALTH_CLIENT_ID`
  - `GOOGLE_HEALTH_CLIENT_SECRET`
  - `GOOGLE_HEALTH_REDIRECT_URI`
- **OAuth Flow**: Standard Google OAuth 2.0 with offline access token exchange.
- **Required Scopes**:
  - `https://www.googleapis.com/auth/fitness.activity.read`
  - `https://www.googleapis.com/auth/fitness.heart_rate.read`
  - `https://www.googleapis.com/auth/fitness.sleep.read`
- **API Endpoint Configuration**:
  - Authorize: `https://accounts.google.com/o/oauth2/v2/auth`
  - Token: `https://oauth2.googleapis.com/token`
  - Dataset: `https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate`
- **Data Retrieved**: Aggregated 15-minute bucketed heart rate, step delta counts, and sleep sessions.
- **Sync Frequency**: 30-minute periodic cron or manual on-demand trigger.
- **Error Handling**: 401 token expiry triggers automated refresh flow using `refreshToken`.
- **Disconnect Behavior**: Submits token revocation request to Google revoke endpoint; purges user access tokens from database.

---

### C. Fitbit Web API

- **Purpose**: Continuous telemetry for step cadence, heart rate variability, SpO2, and intraday heart rate.
- **Authentication Method**: OAuth 2.0 with PKCE.
- **Required Environment Variables**:
  - `FITBIT_CLIENT_ID`
  - `FITBIT_CLIENT_SECRET`
  - `FITBIT_REDIRECT_URI`
- **OAuth Flow**: Authorization Code Grant with PKCE.
- **Required Scopes**:
  - `activity`
  - `heartrate`
  - `sleep`
  - `oxygen_saturation`
- **API Endpoint Configuration**:
  - Authorize: `https://www.fitbit.com/oauth2/authorize`
  - Token: `https://api.fitbit.com/oauth2/token`
  - Activities: `https://api.fitbit.com/1/user/-/activities/date/{date}.json`
  - Intraday Heart Rate: `https://api.fitbit.com/1/user/-/activities/heart/date/{date}/1d/1min.json`
- **Data Retrieved**: Intraday minute-level heart rates, sleep stages (deep, light, REM, wake), resting heart rate.
- **Sync Frequency**: Webhook subscription (`fitbit-subscriber`) notifications on data arrival, fallback to hourly poll.
- **Disconnect Behavior**: Revokes tokens via `https://api.fitbit.com/oauth2/revoke`.

---

### D. Garmin Health API

- **Purpose**: High-fidelity autonomic metrics: Body Battery™, stress index, continuous HRV status, VO2 max.
- **Authentication Method**: OAuth 1.0a / OAuth 2.0 Bearer.
- **Required Environment Variables**:
  - `GARMIN_CLIENT_ID`
  - `GARMIN_CLIENT_SECRET`
  - `GARMIN_REDIRECT_URI`
- **Status Notice**: *Integration requires provider approval / production credentials.*
- **API Endpoint Configuration**:
  - Base: `https://healthapi.garmin.com/wellness-api/rest/`
  - Endpoints: `/dailies`, `/epochs`, `/sleeps`, `/hrv`
- **Sync Frequency**: Garmin Health Push Webhook architecture.
- **Disconnect Behavior**: User deregistration ping to Garmin de-registration webhook.

---

### E. Oura Cloud API v2

- **Purpose**: Nocturnal recovery biomarkers: sleep stage latency, nocturnal heart rate variability, skin temperature deviation.
- **Authentication Method**: OAuth 2.0 Bearer token.
- **Required Environment Variables**:
  - `OURA_CLIENT_ID`
  - `OURA_CLIENT_SECRET`
  - `OURA_REDIRECT_URI`
- **API Endpoint Configuration**:
  - Authorize: `https://cloud.ouraring.com/oauth/authorize`
  - Token: `https://api.ouraring.com/oauth/token`
  - Daily Sleep: `https://api.ouraring.com/v2/usercollection/daily_sleep`
  - Daily Readiness: `https://api.ouraring.com/v2/usercollection/daily_readiness`
- **Data Retrieved**: `sleep_score`, `deep_sleep_duration`, `rem_sleep_duration`, `hrv_balance`.
- **Sync Frequency**: Once daily post-awakening plus on-demand sync.
- **Disconnect Behavior**: Revokes bearer token and ceases nocturnal webhook receipt.

---

### F. Dexcom CGM API

- **Purpose**: Continuous interstitial glucose monitoring readings every 5 minutes.
- **Status Notice**: *Integration requires provider approval / production credentials.*
- **API Endpoint Configuration**:
  - Base: `https://api.dexcom.com/v3/users/self/egvs`
- **Data Retrieved**: Estimated Glucose Values (`egvs`), rate of change trend arrows (`FLAT`, `FORTY_FIVE_UP`, `SINGLE_UP`, etc.).
- **Simulation**: In development (`DEMO_MODE=true`), realistic circadian sinusoidal glucose curves with meal excursions are simulated.

---

## 3. Provider Abstraction Architecture

All providers extend `BaseHealthDataProvider` defined in `/providers/base.ts`:

```typescript
export abstract class BaseHealthDataProvider {
  abstract readonly providerKey: string;
  abstract readonly displayName: string;
  abstract readonly category: "WEARABLE" | "GLUCOSE" | "BODY_SCALE";
  abstract readonly supportedMetrics: string[];

  abstract isConfigured(): boolean;
  abstract isMock(): boolean;
  abstract getAuthorizationUrl(state: string): Promise<string>;
  abstract handleOAuthCallback(code: string): Promise<ProviderTokenResult>;
  abstract fetchLatestMetrics(userId: string, deviceId?: string): Promise<SyncResult>;
  abstract revokeAccess(userId: string): Promise<boolean>;
}
```

When credentials are not present in `.env`, the provider's `isConfigured()` returns `false`, causing the system to transparently deploy a safe mock simulator that flags all ingested data as `isDemoData: true`.

---

## 4. Pulse Community Moderation Engine Integration

The Pulse Community peer support module features a multi-tiered safety screening and moderation pipeline:

- **Providers Supported**:
  - `rules_fallback` (Default): Built-in deterministic clinical rules and regex heuristics for Hindi and English. Zero latency, 100% offline-ready, no API keys needed.
  - `groq`: Fast server-side LLM classification using OpenAI-compatible Chat Completions API with fallback to rules engine.
  - `gemini`: Google Gemini API endpoint support with fallback to rules engine.

- **Prohibited Content Vectors**:
  1. Peer medication / insulin dosing adjustments.
  2. Advice to abandon or stop prescribed clinical treatments.
  3. Claims of guaranteed permanent cures for diabetes.
  4. Extreme caloric restriction, starvation, or unsafe herbal remedies.
  5. Personal attacks, harassment, abuse, or spam.

- **Non-blocking Safe Hold Workflow**:
  - Any post or comment flagged for potential safety violations is moved to `HELD_FOR_REVIEW` and routed to the protected Moderator Dashboard.
  - Patients receive non-judgmental messaging reassuring them that their submission is undergoing brief moderation review.

---

## 5. Pulse Proactive Care Intervention Engine Integration

The **Pulse Proactive Care** engine provides automated routine monitoring, trigger detection, barrier exploration, and measurable recovery tracking:

- **Core Lifecycle**:
  `DETECTED` → `ELIGIBILITY_CHECKED` → `PENDING` → `DELIVERED` → `PATIENT_RESPONDED` → `SUPPORT_OFFERED` → `SUPPORT_ACCEPTED` → `RECOVERY_TRACKING` → `RESOLVED`.
- **Policy Safeguards**:
  - Opt-out immediately respected (`enabled: false`).
  - Quiet hours window enforcement (e.g. 22:00 to 07:00 in patient timezone).
  - Configurable daily frequency cap (default: 2 interventions/24h).
  - Cooldown period (default: 4 hours).
  - Deduplication per trigger/routine occurrence.
  - Interim routine completion suppresses pending reminders.
- **Safety-First Routing**:
  - Medical symptoms (chest pain, shortness of breath, severe dizziness) and medication/insulin adjustment queries are immediately intercepted and escalated to `SafetyEscalation` with `EMERGENCY` or `HIGH` severity.
  - Ordinary engagement messages are strictly suppressed when safety concerns are present.
- **Recovery Tracking**:
  - Recovery is recorded when the patient subsequently completes the next eligible scheduled routine occurrence (`RecoveryOutcome.outcomeStatus = RECOVERED`).

---

## 6. Payment & Recurring Subscription Gateway (Razorpay Subscriptions — ₹499/mo INR)

The **Pulse Subscription and Membership System** manages recurring monthly billing for **Pulse Premium** (₹499/month INR) using Razorpay Subscriptions:

- **Provider**: Razorpay Subscriptions API (Standard Indian Rupee Recurring Payments with e-Mandate / UPI Autopay / Card Recurring).
- **Required Environment Variables**:
  - `PAYMENT_PROVIDER`: `"razorpay"` or `"mock"`
  - `RAZORPAY_KEY_ID`: Razorpay Public Key ID (Client-side checkout modal)
  - `RAZORPAY_KEY_SECRET`: Razorpay Secret Key (Server-side HMAC verification only)
  - `RAZORPAY_WEBHOOK_SECRET`: Webhook signing secret (`x-razorpay-signature`)
  - `RAZORPAY_PLAN_ID`: Plan ID created in Razorpay Dashboard (`plan_pulse_premium_499`)
- **Checkout Lifecycle**:
  1. Patient clicks "Subscribe for ₹499/month" -> `POST /api/subscription/checkout`.
  2. Server creates Razorpay Subscription or Order, returning checkout configuration (Key ID, Subscription/Order ID, amount in paise: 49900, currency: INR).
  3. Razorpay Standard Checkout modal collects payment via UPI, Credit/Debit Card, or Netbanking.
  4. On completion, checkout returns `razorpay_payment_id`, `razorpay_subscription_id` (or `order_id`), and `razorpay_signature`.
  5. Frontend submits credentials to `POST /api/subscription/verify`.
  6. Server cryptographically verifies the HMAC SHA-256 signature using `RAZORPAY_KEY_SECRET`.
  7. Upon valid verification, creates `PaymentTransaction` with receipt number and marks `UserSubscription.status = "ACTIVE"`.
- **Webhook Events Supported**:
  - `subscription.activated` -> Sets subscription to `ACTIVE`, creates initial transaction record.
  - `subscription.charged` / `payment.captured` -> Extends `currentPeriodEnd` by 30 days, adds renewal transaction.
  - `payment.failed` -> Sets status to `PAYMENT_FAILED` or `PAST_DUE`.
  - `subscription.cancelled` -> Marks `status = "CANCELLED"`, records `cancelledAt`.
- **Idempotency & Security Safeguards**:
  - Webhook payloads verified against `x-razorpay-signature` using HMAC SHA-256.
  - Deduplicated via `PaymentWebhookEvent` table to prevent duplicate activations.
  - Client-side status claims are rejected; access is strictly determined by server-side verification.
  - Patient health data (goals, check-ins, glucose history, food logs, Care Circle, consultations) is **never deleted** on cancellation or expiration.



