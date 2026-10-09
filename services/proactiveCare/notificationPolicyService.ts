/**
 * Project Pulse — Notification Policy Service
 * Enforces patient consent, quiet hours, cooldowns, frequency limits, and deduplication.
 */

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";

export interface PolicyCheckResult {
  allowed: boolean;
  suppressReason?: "OPTED_OUT" | "QUIET_HOURS" | "COOLDOWN_ACTIVE" | "DAILY_CAP_REACHED" | "DUPLICATE_TRIGGER" | "ROUTINE_ALREADY_COMPLETED";
  details?: string;
}

export class NotificationPolicyService {
  /**
   * Retrieves or creates default proactive notification preferences for a patient.
   */
  static async getPreferences(userId: string) {
    let pref = await prisma.proactiveNotificationPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await prisma.proactiveNotificationPreference.create({
        data: {
          userId,
          enabled: true,
          preferredLanguage: "hi",
          preferredChannel: "IN_APP",
          quietHoursStart: "22:00",
          quietHoursEnd: "07:00",
          timezone: "Asia/Kolkata",
          maxDailyInterventions: env.PROACTIVE_MAX_DAILY_INTERVENTIONS || 2,
          cooldownHours: env.PROACTIVE_COOLDOWN_HOURS || 4,
          allowFollowUpPrompts: true,
          allowCaregiverAssistance: false,
        },
      });
    }

    return pref;
  }

  /**
   * Evaluates whether a new proactive intervention can be issued under patient policy.
   */
  static async evaluatePolicy(
    userId: string,
    deduplicationKey: string,
    routineOccurrenceId?: string | null
  ): Promise<PolicyCheckResult> {
    const pref = await this.getPreferences(userId);

    // 1. Check Opt-Out
    if (!pref.enabled) {
      await this.logAudit(userId, "SUPPRESSED_OPTED_OUT", "User has disabled proactive interventions");
      return {
        allowed: false,
        suppressReason: "OPTED_OUT",
        details: "Patient has disabled proactive interventions.",
      };
    }

    // 2. Check Deduplication
    const existing = await prisma.interventionEvent.findUnique({
      where: { deduplicationKey },
    });
    if (existing) {
      return {
        allowed: false,
        suppressReason: "DUPLICATE_TRIGGER",
        details: "Intervention with identical deduplication key already exists.",
      };
    }

    // 3. Check Routine Completed in interim
    if (routineOccurrenceId) {
      const occ = await prisma.routineOccurrence.findUnique({
        where: { id: routineOccurrenceId },
      });
      if (occ && (occ.status === "COMPLETED" || occ.eligibilityStatus === "CANCELLED" || occ.eligibilityStatus === "PAUSED")) {
        await this.logAudit(userId, "SUPPRESSED_COMPLETED", "Routine is already completed or inactive");
        return {
          allowed: false,
          suppressReason: "ROUTINE_ALREADY_COMPLETED",
          details: "Scheduled routine was already completed or paused.",
        };
      }
    }

    const now = new Date();

    // 4. Check Quiet Hours
    if (pref.quietHoursStart && pref.quietHoursEnd) {
      if (this.isWithinQuietHours(now, pref.quietHoursStart, pref.quietHoursEnd, pref.timezone)) {
        await this.logAudit(userId, "SUPPRESSED_QUIET_HOURS", `Current time within quiet hours (${pref.quietHoursStart} - ${pref.quietHoursEnd})`);
        return {
          allowed: false,
          suppressReason: "QUIET_HOURS",
          details: `Patient quiet hours active (${pref.quietHoursStart} - ${pref.quietHoursEnd}).`,
        };
      }
    }

    // 5. Check Cooldown (Minimum hours since last delivered intervention)
    const cooldownMs = (pref.cooldownHours || 4) * 60 * 60 * 1000;
    const lastIntervention = await prisma.interventionEvent.findFirst({
      where: {
        userId,
        lifecycleStatus: { notIn: ["SUPPRESSED", "CANCELLED", "EXPIRED"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (lastIntervention) {
      const diffMs = now.getTime() - new Date(lastIntervention.createdAt).getTime();
      if (diffMs < cooldownMs) {
        await this.logAudit(
          userId,
          "SUPPRESSED_COOLDOWN",
          `Active cooldown: ${(diffMs / 3600000).toFixed(1)}h elapsed out of ${pref.cooldownHours}h required`
        );
        return {
          allowed: false,
          suppressReason: "COOLDOWN_ACTIVE",
          details: `Cooldown active: ${pref.cooldownHours}h required between proactive contacts.`,
        };
      }
    }

    // 6. Check Daily Cap (Max interventions created in past 24 hours)
    const past24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const count24h = await prisma.interventionEvent.count({
      where: {
        userId,
        createdAt: { gte: past24h },
        lifecycleStatus: { notIn: ["SUPPRESSED", "CANCELLED"] },
      },
    });

    if (count24h >= pref.maxDailyInterventions) {
      await this.logAudit(
        userId,
        "SUPPRESSED_MAX_CAP",
        `Daily cap reached: ${count24h} of ${pref.maxDailyInterventions} interventions issued in past 24h`
      );
      return {
        allowed: false,
        suppressReason: "DAILY_CAP_REACHED",
        details: `Daily maximum of ${pref.maxDailyInterventions} proactive messages reached for 24-hour window.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Helper to evaluate whether a specific local time falls inside quiet hours.
   */
  static isWithinQuietHours(date: Date, startStr: string, endStr: string, timezone: string = "Asia/Kolkata"): boolean {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      }).formatToParts(date);

      const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
      const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
      const currentMin = hour * 60 + minute;

      const [sH, sM] = startStr.split(":").map(Number);
      const [eH, eM] = endStr.split(":").map(Number);
      const startMin = sH * 60 + sM;
      const endMin = eH * 60 + eM;

      if (startMin > endMin) {
        // Overnight span (e.g. 22:00 to 07:00)
        return currentMin >= startMin || currentMin < endMin;
      } else {
        return currentMin >= startMin && currentMin < endMin;
      }
    } catch {
      return false;
    }
  }

  private static async logAudit(userId: string, action: string, details: string) {
    try {
      await prisma.interventionAuditLog.create({
        data: {
          userId,
          action,
          details,
        },
      });
    } catch {
      // safe fallback
    }
  }
}
