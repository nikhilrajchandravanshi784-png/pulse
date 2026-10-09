/**
 * Project Pulse — Routine Monitoring Service
 * Observes recorded routines, evaluates active SMART goals, and flags missed occurrences.
 */

import { prisma } from "@/lib/db";

export interface RoutineEvaluationItem {
  occurrenceId: string;
  userId: string;
  goalId: string;
  goalTitle: string;
  goalCategory: string;
  scheduledAt: Date;
  status: string;
  eligibilityStatus: string;
  isMissed: boolean;
  consecutiveMisses: number;
  difficultyFeedbackCount: number;
}

export class RoutineMonitoringService {
  /**
   * Evaluates all active, eligible scheduled routine occurrences for a user or all users.
   * A routine is missed if scheduledAt + graceMinutes < now and status is PENDING.
   */
  static async evaluateEligibleRoutines(
    userId?: string,
    graceMinutes: number = 60,
    referenceDate: Date = new Date()
  ): Promise<RoutineEvaluationItem[]> {
    const whereClause: any = {
      status: "PENDING",
      eligibilityStatus: "ELIGIBLE",
      goal: {
        status: "ACTIVE", // Only active goals
        patientStatus: { notIn: ["PAUSED", "UNSUITABLE"] },
      },
    };

    if (userId) {
      whereClause.userId = userId;
    }

    const occurrences = await prisma.routineOccurrence.findMany({
      where: whereClause,
      include: {
        goal: true,
      },
      orderBy: { scheduledAt: "asc" },
    });

    const evaluated: RoutineEvaluationItem[] = [];

    for (const occ of occurrences) {
      const scheduledMs = new Date(occ.scheduledAt).getTime();
      const cutoffMs = scheduledMs + graceMinutes * 60 * 1000;
      const isMissed = referenceDate.getTime() > cutoffMs;

      if (isMissed) {
        // Mark occurrence as MISSED in database
        await prisma.routineOccurrence.update({
          where: { id: occ.id },
          data: { status: "MISSED" },
        });

        // Calculate consecutive misses for this goal
        const pastOccurrences = await prisma.routineOccurrence.findMany({
          where: {
            userId: occ.userId,
            goalId: occ.goalId,
            scheduledAt: { lt: occ.scheduledAt },
          },
          orderBy: { scheduledAt: "desc" },
          take: 5,
        });

        let consecutiveMisses = 1;
        for (const past of pastOccurrences) {
          if (past.status === "MISSED") {
            consecutiveMisses++;
          } else if (past.status === "COMPLETED") {
            break;
          }
        }

        // Check if goal was marked as too difficult recently
        const difficultCount = await prisma.routineOccurrence.count({
          where: {
            goalId: occ.goalId,
            difficultyFeedback: "TOO_DIFFICULT",
          },
        });

        evaluated.push({
          occurrenceId: occ.id,
          userId: occ.userId,
          goalId: occ.goalId,
          goalTitle: occ.goal.title,
          goalCategory: occ.goal.category,
          scheduledAt: occ.scheduledAt,
          status: "MISSED",
          eligibilityStatus: occ.eligibilityStatus,
          isMissed: true,
          consecutiveMisses,
          difficultyFeedbackCount: difficultCount,
        });
      }
    }

    return evaluated;
  }

  /**
   * Helper to ensure or seed scheduled occurrences for active SMART goals for today/yesterday.
   */
  static async seedOrScheduleOccurrences(userId: string, targetDate: Date = new Date()) {
    const goals = await prisma.healthGoal.findMany({
      where: {
        userId,
        status: "ACTIVE",
        patientStatus: { notIn: ["PAUSED", "UNSUITABLE"] },
      },
    });

    const created: any[] = [];

    for (const goal of goals) {
      // Determine scheduled time from preferredTime e.g. "13:30" or default to 13:00
      let hour = 13;
      let minute = 0;
      if (goal.preferredTime) {
        const timeMatch = goal.preferredTime.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
          hour = parseInt(timeMatch[1], 10);
          minute = parseInt(timeMatch[2], 10);
        } else if (goal.preferredTime.toLowerCase().includes("morning") || goal.preferredTime.toLowerCase().includes("breakfast")) {
          hour = 8;
        } else if (goal.preferredTime.toLowerCase().includes("evening") || goal.preferredTime.toLowerCase().includes("dinner")) {
          hour = 20;
        }
      }

      const scheduledAt = new Date(targetDate);
      scheduledAt.setHours(hour, minute, 0, 0);

      // Check if already created for this window
      const existing = await prisma.routineOccurrence.findFirst({
        where: {
          userId,
          goalId: goal.id,
          scheduledAt: {
            gte: new Date(scheduledAt.getTime() - 2 * 60 * 60 * 1000),
            lte: new Date(scheduledAt.getTime() + 2 * 60 * 60 * 1000),
          },
        },
      });

      if (!existing) {
        const occ = await prisma.routineOccurrence.create({
          data: {
            userId,
            goalId: goal.id,
            scheduledAt,
            dueTimeOfDay: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
            status: "PENDING",
            eligibilityStatus: "ELIGIBLE",
          },
        });
        created.push(occ);
      }
    }

    return created;
  }
}
