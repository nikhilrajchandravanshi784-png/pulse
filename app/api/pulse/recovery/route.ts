import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getPatientRecoveryMetrics } from "@/services/pulse/recoveryEngine";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const metrics = await getPatientRecoveryMetrics(session.userId);

    const activePendingEvent = await prisma.recoveryEvent.findFirst({
      where: { patientId: session.userId, patientDecision: "PENDING" },
      orderBy: { recoveryTimestamp: "desc" },
      include: { goal: true },
    });

    return NextResponse.json({
      success: true,
      activePendingEvent,
      metrics,
    });
  } catch (error) {
    console.error("Recovery fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch recovery data" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { recoveryEventId, decision, revisedGoalTitle } = body;

    const event = await prisma.recoveryEvent.findFirst({
      where: { id: recoveryEventId, patientId: session.userId },
    });

    if (!event) {
      return NextResponse.json({ error: "Recovery event not found" }, { status: 404 });
    }

    // Update Recovery Event decision
    const updated = await prisma.recoveryEvent.update({
      where: { id: event.id },
      data: {
        patientDecision: decision, // "ACCEPTED" or "REJECTED"
        revisedGoalTitle: revisedGoalTitle || event.suggestedActionTitle,
        subsequentActionDone: decision === "ACCEPTED" ? true : false,
        status: "RESOLVED",
        recoveryResolvedAt: new Date(),
      },
    });

    // If accepted and non-medical goal adaptation, update the goal title/duration safely
    if (decision === "ACCEPTED" && event.goalId) {
      await prisma.healthGoal.update({
        where: { id: event.goalId },
        data: {
          title: revisedGoalTitle || event.suggestedActionTitle || "Adapted Micro-Routine",
          patientStatus: "ACCEPTED",
        },
      });
    }

    return NextResponse.json({
      success: true,
      event: updated,
      message: "Engagement recovery adaptation applied successfully",
    });
  } catch (error) {
    console.error("Recovery update error:", error);
    return NextResponse.json({ error: "Failed to update recovery decision" }, { status: 500 });
  }
}
