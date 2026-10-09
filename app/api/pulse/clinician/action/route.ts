import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || (session.role !== "CLINICIAN" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Clinician role required" }, { status: 403 });
    }

    const body = await request.json();
    const { actionType, targetId, resolutionNotes } = body;

    if (actionType === "RESOLVE_ESCALATION") {
      const escalation = await prisma.safetyEscalation.update({
        where: { id: targetId },
        data: {
          resolutionStatus: "RESOLVED",
          resolvedAt: new Date(),
          resolutionNotes: resolutionNotes || "Reviewed and clinically resolved by physician.",
          clinicianId: session.userId,
        },
      });

      return NextResponse.json({ success: true, escalation });
    }

    if (actionType === "APPROVE_GOAL") {
      const goal = await prisma.healthGoal.update({
        where: { id: targetId },
        data: {
          clinicianStatus: "APPROVED",
          patientStatus: "ACCEPTED",
        },
      });

      return NextResponse.json({ success: true, goal });
    }

    return NextResponse.json({ error: "Unknown action type" }, { status: 400 });
  } catch (error) {
    console.error("Clinician action error:", error);
    return NextResponse.json({ error: "Failed to process clinician action" }, { status: 500 });
  }
}
