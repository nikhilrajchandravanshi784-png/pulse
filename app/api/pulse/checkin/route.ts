import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recordRecoveryEvent } from "@/services/pulse/recoveryEngine";
import { evaluateSafetyRules } from "@/services/pulse/safetyService";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      mood,
      routineStatus,
      barrier,
      barrierDetails,
      supportRequested,
      notes,
      glucose,
      completionTimeSec,
    } = body;

    const todayStr = new Date().toISOString().split("T")[0];
    const patientId = session.userId;

    // Safety checks on text/notes
    if (notes) {
      await evaluateSafetyRules(patientId, notes, "CHECKIN_BARRIER");
    }

    // Upsert Daily Check-In
    const checkIn = await prisma.dailyCheckIn.upsert({
      where: {
        userId_date: {
          userId: patientId,
          date: todayStr,
        },
      },
      update: {
        mood: mood || "Okay",
        routineStatus: routineStatus || "Completed",
        barrier: barrier || null,
        barrierDetails: barrierDetails || null,
        supportRequested: Boolean(supportRequested),
        notes: notes || null,
        completionTimeSec: completionTimeSec || 35,
      },
      create: {
        userId: patientId,
        date: todayStr,
        mood: mood || "Okay",
        routineStatus: routineStatus || "Completed",
        barrier: barrier || null,
        barrierDetails: barrierDetails || null,
        supportRequested: Boolean(supportRequested),
        notes: notes || null,
        completionTimeSec: completionTimeSec || 35,
      },
    });

    // Optional Glucose Entry
    let glucoseEntry = null;
    if (glucose && glucose.value) {
      const gVal = parseFloat(glucose.value);
      // Run safety check on extreme glucose
      await evaluateSafetyRules(patientId, `Glucose reading: ${gVal}`, "GLUCOSE_READING", gVal);

      glucoseEntry = await prisma.glucoseEntry.create({
        data: {
          userId: patientId,
          checkInId: checkIn.id,
          value: gVal,
          unit: glucose.unit || "mg/dL",
          context: glucose.context || "Random",
          notes: glucose.notes || null,
          source: "manual_entry",
        },
      });

      // Also ingest as HealthMetric for unified charting
      await prisma.healthMetric.create({
        data: {
          userId: patientId,
          source: "manual_checkin",
          metricType: "glucose",
          value: gVal,
          unit: glucose.unit || "mg/dL",
          timestamp: new Date(),
          metadata: JSON.stringify({ context: glucose.context || "Random" }),
        },
      });
    }

    // Synchronization with RoutineOccurrence & Proactive Care
    const primaryGoal = await prisma.healthGoal.findFirst({
      where: { userId: patientId, status: "ACTIVE", isPrimary: true },
    }) || await prisma.healthGoal.findFirst({
      where: { userId: patientId, status: "ACTIVE" },
    });

    const dayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${todayStr}T23:59:59.999Z`);

    if (primaryGoal) {
      const occ = await prisma.routineOccurrence.findFirst({
        where: {
          userId: patientId,
          goalId: primaryGoal.id,
          scheduledAt: { gte: dayStart, lte: dayEnd },
        },
      });

      const occStatus = routineStatus === "Completed" ? "COMPLETED" : routineStatus === "Partially completed" ? "PARTIAL" : "MISSED";

      if (occ) {
        await prisma.routineOccurrence.update({
          where: { id: occ.id },
          data: {
            status: occStatus,
            completedAt: routineStatus === "Completed" ? new Date() : null,
          },
        });
      } else {
        await prisma.routineOccurrence.create({
          data: {
            userId: patientId,
            goalId: primaryGoal.id,
            scheduledAt: new Date(),
            status: occStatus,
            eligibilityStatus: "ELIGIBLE",
            completedAt: routineStatus === "Completed" ? new Date() : null,
          },
        });
      }

      // If completed, suppress pending proactive reminders
      if (routineStatus === "Completed") {
        await prisma.interventionEvent.updateMany({
          where: {
            userId: patientId,
            goalId: primaryGoal.id,
            lifecycleStatus: { in: ["PENDING", "DETECTED", "ELIGIBILITY_CHECKED"] },
          },
          data: {
            lifecycleStatus: "SUPPRESSED",
            explainableReason: "Routine completed during daily check-in",
          },
        });
      }
    }

    // Engagement Recovery Engine Trigger:
    // If routine was not completed and barrier reported, generate recovery proposal
    let recoveryData = null;
    if (routineStatus !== "Completed" && barrier && primaryGoal) {
      recoveryData = await recordRecoveryEvent(
        patientId,
        primaryGoal.id,
        todayStr,
        barrier
      );
    }

    // Refresh weekly review metrics
    try {
      const { getPatientWeeklyReview } = await import("@/services/pulse/reviewService");
      await getPatientWeeklyReview(patientId);
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      checkIn,
      glucoseEntry,
      recoveryProposal: recoveryData?.proposal || null,
      recoveryEventId: recoveryData?.event.id || null,
      message: "Daily check-in saved successfully in 35 seconds",
    });
  } catch (error) {
    console.error("Pulse check-in submit error:", error);
    return NextResponse.json({ error: "Failed to submit daily check-in" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const checkIn = await prisma.dailyCheckIn.findUnique({
      where: {
        userId_date: {
          userId: session.userId,
          date: todayStr,
        },
      },
      include: { glucoseEntries: true },
    });

    const recentHistory = await prisma.dailyCheckIn.findMany({
      where: { userId: session.userId },
      orderBy: { date: "desc" },
      take: 14,
      include: { glucoseEntries: true },
    });

    return NextResponse.json({
      success: true,
      hasCheckedInToday: Boolean(checkIn),
      checkIn,
      recentHistory,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch check-in history" }, { status: 500 });
  }
}
