/**
 * Project Pulse — Trigger Detection Service
 * Detects meaningful routine changes and signals from routine monitoring, check-ins, and goals.
 */

import { TriggerType } from "./types";
import { RoutineEvaluationItem } from "./routineMonitoringService";

export interface DetectedTrigger {
  triggerType: TriggerType;
  triggerReason: string;
  userId: string;
  goalId?: string;
  routineOccurrenceId?: string;
  deduplicationKey: string;
  meta: Record<string, any>;
}

export class TriggerDetectionService {
  /**
   * Generates a deterministic deduplication key for a trigger.
   * e.g., "trig:MISSED_SINGLE_ROUTINE:user123:occ456:2026-10-09"
   */
  static generateDeduplicationKey(
    triggerType: TriggerType,
    userId: string,
    routineOccurrenceId?: string,
    goalId?: string,
    dateStr?: string
  ): string {
    const d = dateStr || new Date().toISOString().split("T")[0];
    const target = routineOccurrenceId || goalId || "general";
    return `trig:${triggerType}:${userId}:${target}:${d}`;
  }

  /**
   * Evaluates routine evaluation items and detects triggers.
   */
  static detectFromRoutineEvaluations(items: RoutineEvaluationItem[]): DetectedTrigger[] {
    const detected: DetectedTrigger[] = [];

    for (const item of items) {
      if (!item.isMissed) continue;

      const dateStr = item.scheduledAt.toISOString().split("T")[0];

      // 1. Goal repeatedly marked too difficult
      if (item.difficultyFeedbackCount >= 2) {
        detected.push({
          triggerType: "GOAL_REPEATEDLY_TOO_DIFFICULT",
          triggerReason: `Routine "${item.goalTitle}" has been reported as too difficult ${item.difficultyFeedbackCount} times.`,
          userId: item.userId,
          goalId: item.goalId,
          routineOccurrenceId: item.occurrenceId,
          deduplicationKey: this.generateDeduplicationKey(
            "GOAL_REPEATEDLY_TOO_DIFFICULT",
            item.userId,
            item.occurrenceId,
            item.goalId,
            dateStr
          ),
          meta: { difficultyCount: item.difficultyFeedbackCount },
        });
        continue;
      }

      // 2. Repeated missed routines (2+ consecutive misses)
      if (item.consecutiveMisses >= 2) {
        detected.push({
          triggerType: "REPEATED_MISSED_ROUTINES",
          triggerReason: `Routine "${item.goalTitle}" has been missed for ${item.consecutiveMisses} consecutive scheduled times.`,
          userId: item.userId,
          goalId: item.goalId,
          routineOccurrenceId: item.occurrenceId,
          deduplicationKey: this.generateDeduplicationKey(
            "REPEATED_MISSED_ROUTINES",
            item.userId,
            item.occurrenceId,
            item.goalId,
            dateStr
          ),
          meta: { consecutiveMisses: item.consecutiveMisses },
        });
        continue;
      }

      // 3. Single missed routine
      detected.push({
        triggerType: "MISSED_SINGLE_ROUTINE",
        triggerReason: `Scheduled routine "${item.goalTitle}" was not completed after its scheduled due time.`,
        userId: item.userId,
        goalId: item.goalId,
        routineOccurrenceId: item.occurrenceId,
        deduplicationKey: this.generateDeduplicationKey(
          "MISSED_SINGLE_ROUTINE",
          item.userId,
          item.occurrenceId,
          item.goalId,
          dateStr
        ),
        meta: { consecutiveMisses: 1 },
      });
    }

    return detected;
  }
}
