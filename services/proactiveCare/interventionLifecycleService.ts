/**
 * Project Pulse — Intervention Lifecycle Service
 * Manages the persistent intervention state machine and patient response transitions.
 */

import { prisma } from "@/lib/db";
import {
  LifecycleStatus,
  TriggerType,
  BarrierCategory,
  InterventionDTO,
} from "./types";
import { InterventionDecisionService, DecisionContext } from "./interventionDecisionService";
import { NotificationDeliveryService } from "./notificationDeliveryService";
import { RecoverySuggestionService } from "./recoverySuggestionService";

export class InterventionLifecycleService {
  /**
   * Evaluates context and creates a persistent InterventionEvent if eligible.
   */
  static async createIntervention(ctx: DecisionContext) {
    // Run decision engine
    const decision = await InterventionDecisionService.decide(ctx);

    if (!decision.isApproved) {
      // Create suppressed audit entry if policy blocked it
      await prisma.interventionAuditLog.create({
        data: {
          userId: ctx.userId,
          action: "SUPPRESSED_POLICY",
          details: JSON.stringify({
            deduplicationKey: ctx.deduplicationKey,
            reason: decision.explainableReason,
            suppressReason: decision.suppressReason,
          }),
        },
      });
      return null;
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24-hour relevance window

    // Persist InterventionEvent
    const intervention = await prisma.interventionEvent.create({
      data: {
        userId: ctx.userId,
        goalId: ctx.goalId || null,
        routineOccurrenceId: ctx.routineOccurrenceId || null,
        safetyEscalationId: decision.safetyEscalationId || null,
        triggerType: ctx.triggerType,
        triggerReason: ctx.triggerReason,
        interventionType: decision.interventionType,
        lifecycleStatus: decision.interventionType === "SAFETY_ESCALATION" ? "ESCALATED_FOR_REVIEW" : "DELIVERED",
        deduplicationKey: ctx.deduplicationKey,
        title: decision.title,
        titleHi: decision.titleHi,
        message: decision.message,
        messageHi: decision.messageHi,
        optionsJson: JSON.stringify(decision.options),
        explainableReason: decision.explainableReason,
        aiPersonalized: decision.aiPersonalized,
        expiresAt,
      },
      include: {
        safetyEscalation: true,
      },
    });

    // Deliver notification
    await NotificationDeliveryService.deliver(
      intervention.id,
      ctx.userId,
      decision.title,
      decision.titleHi,
      decision.message,
      decision.messageHi,
      "IN_APP"
    );

    // Audit log
    await prisma.interventionAuditLog.create({
      data: {
        userId: ctx.userId,
        interventionId: intervention.id,
        action: "INTERVENTION_CREATED",
        details: JSON.stringify({
          triggerType: ctx.triggerType,
          interventionType: decision.interventionType,
          reason: decision.explainableReason,
        }),
      },
    });

    return intervention;
  }

  /**
   * Retrieves the current active intervention for a patient ("Your Next Small Step").
   */
  static async getCurrentActiveIntervention(userId: string): Promise<InterventionDTO | null> {
    const intervention = await prisma.interventionEvent.findFirst({
      where: {
        userId,
        lifecycleStatus: { in: ["DELIVERED", "PATIENT_RESPONDED", "SUPPORT_OFFERED", "ESCALATED_FOR_REVIEW"] },
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        goal: true,
        safetyEscalation: true,
      },
    });

    if (!intervention) return null;

    let parsedOptions = [];
    try {
      parsedOptions = intervention.optionsJson ? JSON.parse(intervention.optionsJson) : [];
    } catch {
      parsedOptions = [];
    }

    return {
      id: intervention.id,
      userId: intervention.userId,
      goalId: intervention.goalId,
      goalTitle: intervention.goal?.title || null,
      goalCategory: intervention.goal?.category || null,
      triggerType: intervention.triggerType as any,
      triggerReason: intervention.triggerReason,
      interventionType: intervention.interventionType as any,
      lifecycleStatus: intervention.lifecycleStatus as any,
      title: intervention.title,
      titleHi: intervention.titleHi,
      message: intervention.message,
      messageHi: intervention.messageHi,
      explainableReason: intervention.explainableReason,
      options: parsedOptions,
      aiPersonalized: intervention.aiPersonalized,
      createdAt: intervention.createdAt.toISOString(),
      expiresAt: intervention.expiresAt?.toISOString() || null,
      safetyEscalation: intervention.safetyEscalation
        ? {
            id: intervention.safetyEscalation.id,
            severity: intervention.safetyEscalation.severity,
            reason: intervention.safetyEscalation.reason,
            patientSafeNotice: intervention.safetyEscalation.patientSafeNotice,
          }
        : null,
    };
  }

  /**
   * Patient records a barrier ("What got in the way").
   */
  static async recordBarrierResponse(
    interventionId: string,
    barrier: BarrierCategory,
    freeText?: string
  ) {
    const intervention = await prisma.interventionEvent.findUnique({
      where: { id: interventionId },
      include: { goal: true },
    });

    if (!intervention) throw new Error("Intervention not found");

    // Check for safety concern in barrier or text
    const safety = await InterventionDecisionService.decide({
      userId: intervention.userId,
      triggerType: intervention.triggerType as any,
      triggerReason: intervention.triggerReason,
      goalId: intervention.goalId || undefined,
      reportedBarrier: barrier,
      freeTextNote: freeText,
      deduplicationKey: `resp_safety:${interventionId}:${Date.now()}`,
    });

    // Save response
    await prisma.interventionResponse.upsert({
      where: { interventionId },
      create: {
        interventionId,
        responseType: "EXPLAINED_BARRIER",
        selectedBarrier: barrier,
        freeText: freeText || null,
      },
      update: {
        responseType: "EXPLAINED_BARRIER",
        selectedBarrier: barrier,
        freeText: freeText || null,
      },
    });

    if (safety.interventionType === "SAFETY_ESCALATION") {
      await prisma.interventionEvent.update({
        where: { id: interventionId },
        data: {
          lifecycleStatus: "ESCALATED_FOR_REVIEW",
          interventionType: "SAFETY_ESCALATION",
          title: safety.title,
          titleHi: safety.titleHi,
          message: safety.message,
          messageHi: safety.messageHi,
          optionsJson: JSON.stringify(safety.options),
          explainableReason: safety.explainableReason,
          safetyEscalationId: safety.safetyEscalationId,
        },
      });

      return {
        status: "ESCALATED_FOR_REVIEW",
        safety: true,
        message: safety.message,
        messageHi: safety.messageHi,
      };
    }

    // Generate tailored recovery proposal for this barrier
    const proposal = RecoverySuggestionService.generateProposal(barrier, intervention.goal);

    await prisma.interventionEvent.update({
      where: { id: interventionId },
      data: {
        lifecycleStatus: "SUPPORT_OFFERED",
        title: proposal.titleEn,
        titleHi: proposal.titleHi,
        message: proposal.descriptionEn,
        messageHi: proposal.descriptionHi,
        optionsJson: JSON.stringify(proposal.options),
        explainableReason: `Patient reported barrier "${barrier}". Tailored adjustment offered: ${proposal.rationaleEn}`,
      },
    });

    await prisma.interventionAuditLog.create({
      data: {
        userId: intervention.userId,
        interventionId,
        action: "PATIENT_RESPONDED",
        details: JSON.stringify({ barrier, freeText }),
      },
    });

    return {
      status: "SUPPORT_OFFERED",
      proposal,
    };
  }

  /**
   * Patient accepts a recovery suggestion (e.g. adjust goal duration or time).
   */
  static async acceptSuggestion(
    interventionId: string,
    optionId: string,
    payload?: { adjustedDurationMin?: number; adjustedTime?: string }
  ) {
    const intervention = await prisma.interventionEvent.findUnique({
      where: { id: interventionId },
      include: { goal: true },
    });

    if (!intervention) throw new Error("Intervention not found");

    // If goal is non-medical, apply accepted adjustment to goal
    let revisedGoalId = intervention.goalId;
    if (intervention.goal && intervention.goal.isNonMedical) {
      const updateData: any = {};
      if (payload?.adjustedDurationMin) {
        updateData.targetDurationMin = payload.adjustedDurationMin;
      }
      if (payload?.adjustedTime) {
        updateData.preferredTime = payload.adjustedTime;
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.healthGoal.update({
          where: { id: intervention.goal.id },
          data: updateData,
        });
      }
    }

    // Schedule next eligible occurrence for recovery tracking
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(13, 0, 0, 0);

    let nextOccurrence = null;
    if (intervention.goalId) {
      nextOccurrence = await prisma.routineOccurrence.create({
        data: {
          userId: intervention.userId,
          goalId: intervention.goalId,
          scheduledAt: tomorrow,
          status: "PENDING",
          eligibilityStatus: "ELIGIBLE",
        },
      });
    }

    // Create RecoveryOutcome record
    await prisma.recoveryOutcome.upsert({
      where: { interventionId },
      create: {
        interventionId,
        revisedGoalId,
        nextEligibleOccurrenceId: nextOccurrence?.id || null,
        outcomeStatus: "PENDING",
        notes: `Suggestion accepted (${optionId}). Tracking subsequent routine resumption.`,
      },
      update: {
        revisedGoalId,
        nextEligibleOccurrenceId: nextOccurrence?.id || null,
        outcomeStatus: "PENDING",
      },
    });

    // Update intervention lifecycle
    await prisma.interventionEvent.update({
      where: { id: interventionId },
      data: {
        lifecycleStatus: "RECOVERY_TRACKING",
      },
    });

    // Record audit log
    await prisma.interventionAuditLog.create({
      data: {
        userId: intervention.userId,
        interventionId,
        action: "SUGGESTION_ACCEPTED",
        details: JSON.stringify({ optionId, payload }),
      },
    });

    return {
      success: true,
      nextOccurrenceId: nextOccurrence?.id || null,
    };
  }

  /**
   * Patient dismisses intervention without penalty.
   */
  static async dismissIntervention(interventionId: string) {
    const intervention = await prisma.interventionEvent.findUnique({
      where: { id: interventionId },
    });
    if (!intervention) throw new Error("Intervention not found");

    await prisma.interventionEvent.update({
      where: { id: interventionId },
      data: { lifecycleStatus: "RESOLVED" },
    });

    await prisma.interventionAuditLog.create({
      data: {
        userId: intervention.userId,
        interventionId,
        action: "INTERVENTION_DISMISSED",
        details: "Patient dismissed prompt without penalty",
      },
    });

    return { success: true };
  }

  /**
   * Patient requests help from care team.
   */
  static async requestHelp(interventionId: string, notes?: string) {
    const intervention = await prisma.interventionEvent.findUnique({
      where: { id: interventionId },
    });
    if (!intervention) throw new Error("Intervention not found");

    // Find clinician
    const clinician = await prisma.user.findFirst({
      where: { role: "CLINICIAN" },
    });

    if (clinician) {
      await prisma.followUpTask.create({
        data: {
          patientId: intervention.userId,
          clinicianId: clinician.id,
          title: `Support Requested: Patient needs help with routine`,
          description: notes || `Patient requested assistance regarding routine intervention: ${intervention.title}`,
          priority: "HIGH",
          status: "PENDING",
        },
      });
    }

    await prisma.interventionEvent.update({
      where: { id: interventionId },
      data: { lifecycleStatus: "ESCALATED_FOR_REVIEW" },
    });

    await prisma.interventionAuditLog.create({
      data: {
        userId: intervention.userId,
        interventionId,
        action: "HELP_REQUESTED",
        details: JSON.stringify({ notes }),
      },
    });

    return { success: true, message: "Care team notified for follow-up" };
  }
}
