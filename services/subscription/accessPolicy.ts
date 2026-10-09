import { prisma } from "@/lib/db";

export type FeatureKey =
  | "DASHBOARD"
  | "PULSE_PLAN"
  | "CHECKIN"
  | "FOOD_AI"
  | "MEAL_COACH"
  | "PROACTIVE_CARE"
  | "EDUCATIONAL_LIBRARY"
  | "COMMUNITY"
  | "CARE_CIRCLE"
  | "REVIEW_PROGRESS"
  | "SPECIALIST_LEARN"
  | "SUPPORT_APPOINTMENTS"
  | "PROFILE_PREFERENCES"
  | "PRIVACY_CONTROLS";

export interface AccessCheckResult {
  hasAccess: boolean;
  status: string; // "ACTIVE" | "NOT_SUBSCRIBED" | "EXPIRED" | "CANCELLED" | "PAST_DUE"
  reason?: string;
  isGrandfathered?: boolean;
  accessEndsAt?: Date | null;
}

/**
 * Core Healthcare Safety Rule:
 * Patients ALWAYS have unconditional access to view their existing medical history,
 * glucose records, food log history, booked appointments, and personal safety controls.
 * Expiry of a subscription NEVER denies access to existing health records or revokes
 * previously booked consultations.
 */
export const UNCONDITIONAL_FEATURES: FeatureKey[] = [
  "PROFILE_PREFERENCES",
  "PRIVACY_CONTROLS",
  "CARE_CIRCLE", // Viewing existing Care Circle security permissions
];

/**
 * Centralized feature access evaluation
 */
export async function evaluateFeatureAccess(
  userId: string,
  feature: FeatureKey
): Promise<AccessCheckResult> {
  // Always permit access to basic privacy, safety, and personal data management
  if (UNCONDITIONAL_FEATURES.includes(feature)) {
    return {
      hasAccess: true,
      status: "ACTIVE",
      reason: "Unconditional patient data & safety rights",
    };
  }

  // Look up verified user subscription in database
  const subscription = await prisma.userSubscription.findFirst({
    where: { userId },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) {
    return {
      hasAccess: false,
      status: "NOT_SUBSCRIBED",
      reason: "No active Pulse Premium membership found. Please subscribe for ₹499/month.",
    };
  }

  const now = new Date();

  // Active status
  if (subscription.status === "ACTIVE") {
    // If there is an end date and it has passed, status is expired
    if (subscription.currentPeriodEnd && subscription.currentPeriodEnd < now) {
      return {
        hasAccess: false,
        status: "EXPIRED",
        accessEndsAt: subscription.currentPeriodEnd,
        reason: "Your subscription period has ended. Please renew to continue premium access.",
      };
    }

    return {
      hasAccess: true,
      status: "ACTIVE",
      accessEndsAt: subscription.currentPeriodEnd,
      reason: "Active Pulse Premium membership",
    };
  }

  // Cancelled but period has not yet ended (cancelAtPeriodEnd)
  if (
    subscription.status === "CANCELLED" &&
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd > now
  ) {
    return {
      hasAccess: true,
      status: "ACTIVE_UNTIL_PERIOD_END",
      accessEndsAt: subscription.currentPeriodEnd,
      reason: "Access active until the end of current paid billing period",
    };
  }

  // Any other status (NOT_SUBSCRIBED, EXPIRED, PAST_DUE, PAYMENT_FAILED)
  return {
    hasAccess: false,
    status: subscription.status,
    accessEndsAt: subscription.currentPeriodEnd,
    reason: `Subscription status is ${subscription.status}. Please update your membership to access this feature.`,
  };
}
