/**
 * Project Pulse — Recovery Tracking Service
 * Verifies subsequent routine resumption and aggregates clinical recovery metrics.
 */

import { prisma } from "@/lib/db";
import { ProactiveMetricsDTO } from "./types";

export class RecoveryTrackingService {
  /**
   * Evaluates routine occurrence completion and checks if it fulfills an open recovery outcome.
   */
  static async recordRoutineCompletion(occurrenceId: string) {
    const occurrence = await prisma.routineOccurrence.findUnique({
      where: { id: occurrenceId },
      include: { goal: true },
    });

    if (!occurrence) return null;

    const now = new Date();

    // Mark occurrence as completed
    await prisma.routineOccurrence.update({
      where: { id: occurrenceId },
      data: {
        status: "COMPLETED",
        completedAt: now,
      },
    });

    // Check if there is an active RecoveryOutcome awaiting this occurrence
    // or awaiting any occurrence of this goal for this user
    const pendingOutcome = await prisma.recoveryOutcome.findFirst({
      where: {
        outcomeStatus: "PENDING",
        OR: [
          { nextEligibleOccurrenceId: occurrenceId },
          {
            intervention: {
              userId: occurrence.userId,
              goalId: occurrence.goalId,
              lifecycleStatus: "RECOVERY_TRACKING",
            },
          },
        ],
      },
      include: { intervention: true },
    });

    if (pendingOutcome) {
      await prisma.recoveryOutcome.update({
        where: { id: pendingOutcome.id },
        data: {
          outcomeStatus: "RECOVERED",
          recoveredAt: now,
          notes: "Routine successfully resumed after proactive adjustment.",
        },
      });

      // Mark the parent intervention event as RESOLVED
      await prisma.interventionEvent.update({
        where: { id: pendingOutcome.interventionId },
        data: {
          lifecycleStatus: "RESOLVED",
        },
      });

      // Log recovery audit
      await prisma.interventionAuditLog.create({
        data: {
          userId: occurrence.userId,
          interventionId: pendingOutcome.interventionId,
          action: "ROUTINE_RECOVERED",
          details: JSON.stringify({
            occurrenceId,
            goalId: occurrence.goalId,
            recoveredAt: now.toISOString(),
          }),
        },
      });

      return {
        recovered: true,
        outcomeId: pendingOutcome.id,
      };
    }

    return { recovered: false };
  }

  /**
   * Computes comprehensive proactive recovery metrics for patient or clinician dashboards.
   */
  static async computeMetrics(userId?: string): Promise<ProactiveMetricsDTO> {
    const userFilter = userId ? { userId } : {};
    const patientFilter = userId ? { patientId: userId } : {};

    // 1. Total missed eligible occurrences
    const eligibleMissedRoutines = await prisma.routineOccurrence.count({
      where: {
        ...userFilter,
        status: "MISSED",
        eligibilityStatus: "ELIGIBLE",
      },
    });

    // 2. Interventions issued
    const interventionsIssued = await prisma.interventionEvent.count({
      where: {
        ...userFilter,
        lifecycleStatus: { notIn: ["SUPPRESSED", "CANCELLED"] },
      },
    });

    // 3. Barrier responses
    const barrierResponsesCount = await prisma.interventionResponse.count({
      where: {
        intervention: userFilter,
        responseType: "EXPLAINED_BARRIER",
      },
    });

    // 4. Suggestions accepted
    const suggestionsAcceptedCount = await prisma.interventionAuditLog.count({
      where: {
        ...userFilter,
        action: "SUGGESTION_ACCEPTED",
      },
    });

    // 5. Routines recovered
    const routinesRecoveredCount = await prisma.recoveryOutcome.count({
      where: {
        outcomeStatus: "RECOVERED",
        intervention: userFilter,
      },
    });

    // 6. Dismissed interventions
    const interventionsDismissedCount = await prisma.interventionAuditLog.count({
      where: {
        ...userFilter,
        action: "INTERVENTION_DISMISSED",
      },
    });

    // 7. Unresolved safety escalations
    const unresolvedSafetyEscalationsCount = await prisma.safetyEscalation.count({
      where: {
        ...patientFilter,
        resolutionStatus: { not: "RESOLVED" },
      },
    });

    // Calculate percentages
    const barrierResponseRatePercent =
      interventionsIssued > 0
        ? Math.round((barrierResponsesCount / interventionsIssued) * 100)
        : 0;

    const suggestionsAcceptedRatePercent =
      interventionsIssued > 0
        ? Math.round((suggestionsAcceptedCount / interventionsIssued) * 100)
        : 0;

    const routineRecoveryRatePercent =
      interventionsIssued > 0
        ? Math.round((routinesRecoveredCount / interventionsIssued) * 100)
        : 0;

    // Calculate average time to recovery (in hours)
    const recoveredOutcomes = await prisma.recoveryOutcome.findMany({
      where: {
        outcomeStatus: "RECOVERED",
        recoveredAt: { not: null },
        intervention: userFilter,
      },
      include: { intervention: true },
    });

    let totalRecoveryHours = 0;
    for (const ro of recoveredOutcomes) {
      if (ro.recoveredAt && ro.intervention.createdAt) {
        const diffMs = new Date(ro.recoveredAt).getTime() - new Date(ro.intervention.createdAt).getTime();
        totalRecoveryHours += Math.max(0, diffMs / (1000 * 60 * 60));
      }
    }

    const averageHoursToRecovery =
      recoveredOutcomes.length > 0
        ? Math.round((totalRecoveryHours / recoveredOutcomes.length) * 10) / 10
        : 0;

    return {
      eligibleMissedRoutines,
      interventionsIssued,
      barrierResponseRatePercent,
      suggestionsAcceptedCount,
      suggestionsAcceptedRatePercent,
      routinesRecoveredCount,
      routineRecoveryRatePercent,
      interventionsDismissedCount,
      unresolvedSafetyEscalationsCount,
      averageHoursToRecovery,
    };
  }
}
