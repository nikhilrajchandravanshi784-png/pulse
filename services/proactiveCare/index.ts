/**
 * Project Pulse — Proactive Care Intervention Engine
 * Central entry point and orchestrator for routine monitoring, triggers, decisions, and recovery tracking.
 */

import { RoutineMonitoringService } from "./routineMonitoringService";
import { TriggerDetectionService } from "./triggerDetectionService";
import { InterventionLifecycleService } from "./interventionLifecycleService";
import { InterventionDecisionService } from "./interventionDecisionService";
import { RecoverySuggestionService } from "./recoverySuggestionService";
import { SafetyRoutingService } from "./safetyRoutingService";
import { NotificationPolicyService } from "./notificationPolicyService";
import { NotificationDeliveryService } from "./notificationDeliveryService";
import { RecoveryTrackingService } from "./recoveryTrackingService";

export * from "./types";
export * from "./routineMonitoringService";
export * from "./triggerDetectionService";
export * from "./interventionDecisionService";
export * from "./recoverySuggestionService";
export * from "./safetyRoutingService";
export * from "./notificationPolicyService";
export * from "./notificationDeliveryService";
export * from "./interventionLifecycleService";
export * from "./recoveryTrackingService";

export class ProactiveCareEngine {
  /**
   * Main background evaluator:
   * 1. Evaluates eligible routine occurrences
   * 2. Detects triggers (missed, repeated, difficulty)
   * 3. Checks safety & notification policies
   * 4. Issues appropriate proactive interventions
   */
  static async runRoutineEvaluationJob(userId?: string, graceMinutes: number = 60) {
    const evaluated = await RoutineMonitoringService.evaluateEligibleRoutines(userId, graceMinutes);
    const triggers = TriggerDetectionService.detectFromRoutineEvaluations(evaluated);

    const createdInterventions = [];
    for (const trigger of triggers) {
      const intervention = await InterventionLifecycleService.createIntervention({
        userId: trigger.userId,
        triggerType: trigger.triggerType,
        triggerReason: trigger.triggerReason,
        goalId: trigger.goalId,
        routineOccurrenceId: trigger.routineOccurrenceId,
        deduplicationKey: trigger.deduplicationKey,
      });

      if (intervention) {
        createdInterventions.push(intervention);
      }
    }

    return {
      evaluatedRoutinesCount: evaluated.length,
      triggersDetectedCount: triggers.length,
      interventionsCreatedCount: createdInterventions.length,
      interventions: createdInterventions,
    };
  }
}
