/**
 * Project Pulse — Goal Synchronization Service
 * Single source of truth for goals, routine occurrences, and cross-module state sync.
 */

import { prisma } from "@/lib/db";
import { getPatientWeeklyReview } from "./reviewService";

export interface TodayGoalStatus {
  hasGoal: boolean;
  goalId?: string;
  title: string;
  titleHindi?: string | null;
  reason?: string | null;
  frequency: string;
  preferredTime: string;
  targetDurationMin: number;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  patientStatus: string;
  clinicianStatus: string;
  isPrimary: boolean;
  sourceRecommendation: string;
  occurrenceId?: string;
  occurrenceStatus: "PENDING" | "COMPLETED" | "PARTIAL" | "MISSED" | "EXCUSED";
  completedAt?: Date | null;
  isCheckedInToday: boolean;
  todayCheckInMood?: string | null;
}

export class GoalSyncService {
  /**
   * Ensures today's primary routine occurrence exists and returns unified goal status.
   */
  static async getTodayGoalAndStatus(userId: string): Promise<TodayGoalStatus> {
    const todayStr = new Date().toISOString().split("T")[0];
    const dayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${todayStr}T23:59:59.999Z`);

    // 1. Fetch Primary Active Goal
    let goal = await prisma.healthGoal.findFirst({
      where: { userId, status: "ACTIVE", isPrimary: true },
      orderBy: { createdAt: "desc" },
    });

    if (!goal) {
      // Fallback to any active goal
      goal = await prisma.healthGoal.findFirst({
        where: { userId, status: "ACTIVE" },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      });
    }

    // 2. Fetch Today's Daily Check-In
    const checkIn = await prisma.dailyCheckIn.findUnique({
      where: {
        userId_date: { userId, date: todayStr },
      },
    });

    if (!goal) {
      return {
        hasGoal: false,
        title: "No active SMART goal yet",
        frequency: "Daily",
        preferredTime: "13:30",
        targetDurationMin: 15,
        status: "CANCELLED",
        patientStatus: "PENDING",
        clinicianStatus: "APPROVED",
        isPrimary: false,
        sourceRecommendation: "Clinical care plan",
        occurrenceStatus: checkIn?.routineStatus === "Completed" ? "COMPLETED" : "PENDING",
        isCheckedInToday: Boolean(checkIn),
        todayCheckInMood: checkIn?.mood ?? null,
      };
    }

    // 3. Ensure Routine Occurrence exists for today
    let occurrence = await prisma.routineOccurrence.findFirst({
      where: {
        userId,
        goalId: goal.id,
        scheduledAt: { gte: dayStart, lte: dayEnd },
      },
    });

    if (!occurrence) {
      // Parse scheduled time
      const [hours, minutes] = (goal.preferredTime || "13:30").split(":").map(Number);
      const scheduledTime = new Date(`${todayStr}T13:30:00.000Z`);
      if (!isNaN(hours) && !isNaN(minutes)) {
        scheduledTime.setUTCHours(hours, minutes, 0, 0);
      }

      // Check if check-in already marked complete today
      const isAlreadyCompleted = checkIn?.routineStatus === "Completed";

      occurrence = await prisma.routineOccurrence.create({
        data: {
          userId,
          goalId: goal.id,
          scheduledAt: scheduledTime,
          status: isAlreadyCompleted ? "COMPLETED" : "PENDING",
          eligibilityStatus: goal.status === "ACTIVE" ? "ELIGIBLE" : "PAUSED",
          completedAt: isAlreadyCompleted ? new Date() : null,
        },
      });
    } else if (checkIn?.routineStatus === "Completed" && occurrence.status !== "COMPLETED") {
      // Sync check-in completion back to occurrence
      occurrence = await prisma.routineOccurrence.update({
        where: { id: occurrence.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
    }

    return {
      hasGoal: true,
      goalId: goal.id,
      title: goal.title,
      titleHindi: goal.titleHindi,
      reason: goal.reason,
      frequency: goal.frequency,
      preferredTime: goal.preferredTime || "13:30",
      targetDurationMin: goal.targetDurationMin || 15,
      status: goal.status as "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED",
      patientStatus: goal.patientStatus,
      clinicianStatus: goal.clinicianStatus,
      isPrimary: goal.isPrimary,
      sourceRecommendation: goal.sourceRecommendation,
      occurrenceId: occurrence.id,
      occurrenceStatus: occurrence.status as "PENDING" | "COMPLETED" | "PARTIAL" | "MISSED" | "EXCUSED",
      completedAt: occurrence.completedAt,
      isCheckedInToday: Boolean(checkIn),
      todayCheckInMood: checkIn?.mood ?? null,
    };
  }

  /**
   * Completes or partially completes today's routine action.
   * Synchronizes RoutineOccurrence, DailyCheckIn, Proactive Care, and WeeklyReview.
   */
  static async completeTodayAction(
    userId: string,
    actionType: "COMPLETED" | "PARTIAL" = "COMPLETED",
    goalId?: string
  ): Promise<{ success: boolean; message: string }> {
    const todayStr = new Date().toISOString().split("T")[0];
    const dayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${todayStr}T23:59:59.999Z`);

    // Target goal
    let targetGoalId = goalId;
    if (!targetGoalId) {
      const primaryGoal = await prisma.healthGoal.findFirst({
        where: { userId, status: "ACTIVE", isPrimary: true },
      });
      targetGoalId = primaryGoal?.id;
    }

    // 1. Update or create today's RoutineOccurrence
    if (targetGoalId) {
      const occ = await prisma.routineOccurrence.findFirst({
        where: {
          userId,
          goalId: targetGoalId,
          scheduledAt: { gte: dayStart, lte: dayEnd },
        },
      });

      if (occ) {
        await prisma.routineOccurrence.update({
          where: { id: occ.id },
          data: {
            status: actionType === "COMPLETED" ? "COMPLETED" : "PARTIAL",
            completedAt: new Date(),
          },
        });
      } else {
        await prisma.routineOccurrence.create({
          data: {
            userId,
            goalId: targetGoalId,
            scheduledAt: new Date(),
            status: actionType === "COMPLETED" ? "COMPLETED" : "PARTIAL",
            eligibilityStatus: "ELIGIBLE",
            completedAt: new Date(),
          },
        });
      }
    }

    // 2. Synchronize DailyCheckIn record
    const statusLabel = actionType === "COMPLETED" ? "Completed" : "Partially completed";
    await prisma.dailyCheckIn.upsert({
      where: {
        userId_date: { userId, date: todayStr },
      },
      update: {
        routineStatus: statusLabel,
      },
      create: {
        userId,
        date: todayStr,
        mood: "Good",
        routineStatus: statusLabel,
        completionTimeSec: 30,
      },
    });

    // 3. Proactive Care: Suppress obsolete pending intervention for this routine
    try {
      if (targetGoalId) {
        await prisma.interventionEvent.updateMany({
          where: {
            userId,
            goalId: targetGoalId,
            lifecycleStatus: { in: ["PENDING", "DETECTED", "ELIGIBILITY_CHECKED"] },
          },
          data: {
            lifecycleStatus: "SUPPRESSED",
            explainableReason: "Routine completed by patient before intervention delivery",
          },
        });
      }
    } catch (suppressErr) {
      console.warn("[GoalSyncService] Proactive suppression warning:", suppressErr);
    }

    // 4. Recalculate Weekly Progress Review
    try {
      await getPatientWeeklyReview(userId);
    } catch (reviewErr) {
      console.warn("[GoalSyncService] Review update warning:", reviewErr);
    }

    return {
      success: true,
      message: actionType === "COMPLETED" ? "Action completed successfully!" : "Partial action recorded.",
    };
  }

  /**
   * Synchronizes goal status updates (Pause, Accept, Adjust, Complete).
   */
  static async syncGoalStatusChange(
    userId: string,
    goalId: string,
    action: "PAUSE" | "ACCEPT" | "RESUME" | "COMPLETE" | "REQUEST_ADJUSTMENT",
    adjustedTitle?: string,
    adjustedFrequency?: string
  ) {
    const goal = await prisma.healthGoal.findFirst({
      where: { id: goalId, userId },
    });

    if (!goal) {
      throw new Error("Goal not found");
    }

    let updatedStatus = goal.status;
    let updatedPatientStatus = goal.patientStatus;
    let updatedClinicianStatus = goal.clinicianStatus;
    let title = goal.title;
    let frequency = goal.frequency;

    if (action === "PAUSE") {
      updatedStatus = "PAUSED";
      updatedPatientStatus = "PAUSED";
    } else if (action === "ACCEPT" || action === "RESUME") {
      updatedStatus = "ACTIVE";
      updatedPatientStatus = "ACCEPTED";
    } else if (action === "COMPLETE") {
      updatedStatus = "COMPLETED";
      updatedPatientStatus = "COMPLETED";
    } else if (action === "REQUEST_ADJUSTMENT") {
      updatedPatientStatus = "ADJUSTMENT_REQUESTED";
      updatedClinicianStatus = "PENDING_REVIEW";
      if (adjustedTitle) title = adjustedTitle;
      if (adjustedFrequency) frequency = adjustedFrequency;
    }

    const updatedGoal = await prisma.healthGoal.update({
      where: { id: goalId },
      data: {
        status: updatedStatus,
        patientStatus: updatedPatientStatus,
        clinicianStatus: updatedClinicianStatus,
        title,
        frequency,
      },
    });

    // Sync RoutineOccurrences eligibility
    if (updatedStatus === "PAUSED" || updatedStatus === "COMPLETED") {
      await prisma.routineOccurrence.updateMany({
        where: {
          goalId,
          status: "PENDING",
        },
        data: {
          eligibilityStatus: "PAUSED",
        },
      });

      // Suppress pending proactive interventions
      await prisma.interventionEvent.updateMany({
        where: {
          goalId,
          lifecycleStatus: { in: ["PENDING", "DETECTED", "ELIGIBILITY_CHECKED"] },
        },
        data: {
          lifecycleStatus: "SUPPRESSED",
          explainableReason: `Goal was ${updatedStatus.toLowerCase()}`,
        },
      });
    } else if (updatedStatus === "ACTIVE") {
      await prisma.routineOccurrence.updateMany({
        where: {
          goalId,
          status: "PENDING",
        },
        data: {
          eligibilityStatus: "ELIGIBLE",
        },
      });
    }

    // Refresh Weekly Review
    try {
      await getPatientWeeklyReview(userId);
    } catch {
      // Non-blocking
    }

    return updatedGoal;
  }
}
