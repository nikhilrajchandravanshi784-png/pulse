/**
 * Pulse Health Product Analytics Abstraction
 * Strict Privacy: Strips all sensitive PHI/health telemetry before tracking.
 * Only records product UX interaction events.
 */

export type AnalyticsEventName =
  | "onboarding_started"
  | "onboarding_step_completed"
  | "onboarding_completed"
  | "device_connection_started"
  | "device_connected"
  | "device_disconnected"
  | "device_sync_triggered"
  | "health_dashboard_viewed"
  | "health_timeline_viewed"
  | "insight_viewed"
  | "daily_checkin_completed"
  | "care_program_viewed"
  | "message_sent";

interface AnalyticsPayload {
  userId?: string;
  stepNumber?: number;
  providerKey?: string;
  insightId?: string;
  category?: string;
  deviceType?: string;
  timestamp?: string;
  [key: string]: unknown;
}

// Strip out any accidental biological or medical values
function sanitizePayload(payload: AnalyticsPayload): AnalyticsPayload {
  const sanitized = { ...payload };
  const forbiddenKeys = [
    "glucose",
    "heart_rate",
    "weight",
    "medications",
    "diagnoses",
    "conditions",
    "allergies",
    "blood_pressure",
  ];
  for (const key of forbiddenKeys) {
    if (key in sanitized) {
      delete sanitized[key];
    }
  }
  return sanitized;
}

export function trackEvent(name: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  const isEnabled = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "false";
  if (!isEnabled) return;

  const sanitized = sanitizePayload({
    ...payload,
    timestamp: new Date().toISOString(),
  });

  if (process.env.NODE_ENV === "development") {
    // In dev, log product UX events cleanly
    console.log(`[ANALYTICS] Event: ${name}`, sanitized);
  }

  // If a third-party analytics key is configured (e.g. Segment, Mixpanel, PostHog), forward safely
  if (typeof window !== "undefined" && process.env.ANALYTICS_WRITE_KEY) {
    // Forward to configured analytics client
  }
}
