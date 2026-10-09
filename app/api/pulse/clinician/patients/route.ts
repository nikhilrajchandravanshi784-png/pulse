import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session || (session.role !== "CLINICIAN" && session.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden: Clinician role required" }, { status: 403 });
    }

    // Fetch patients
    const patients = await prisma.user.findMany({
      where: { role: "PATIENT" },
      include: {
        patientProfile: true,
        goals: true,
        dailyCheckIns: { orderBy: { date: "desc" }, take: 7 },
        recoveryEvents: { orderBy: { recoveryTimestamp: "desc" }, take: 3 },
        patientEscalations: { where: { resolutionStatus: "OPEN" } },
        clinicalMeasurements: { orderBy: { measuredAt: "desc" }, take: 2 },
      },
    });

    // Compute patient status card summary
    const patientCards = patients.map((p) => {
      const hasOpenEscalation = p.patientEscalations.length > 0;
      const hasPendingGoalReview = p.goals.some((g) => g.clinicianStatus === "PENDING_REVIEW");
      const lastCheckIn = p.dailyCheckIns[0] || null;

      let status = "ACTIVE";
      if (hasOpenEscalation) status = "NEEDS_FOLLOW_UP";
      else if (hasPendingGoalReview) status = "AWAITING_CLINICIAN_REVIEW";
      else if (p.patientProfile?.programDayCurrent && p.patientProfile.programDayCurrent >= 90) {
        status = "PROGRAM_COMPLETED";
      }

      return {
        id: p.id,
        name: p.name,
        email: p.email,
        diabetesType: p.patientProfile?.diabetesType || "Type 2 Diabetes",
        programDayCurrent: p.patientProfile?.programDayCurrent || 14,
        status,
        lastCheckInDate: lastCheckIn?.date || "No check-in yet",
        lastMood: lastCheckIn?.mood || "—",
        openEscalationsCount: p.patientEscalations.length,
        pendingGoalReviewsCount: p.goals.filter((g) => g.clinicianStatus === "PENDING_REVIEW").length,
        goalsCount: p.goals.length,
        recentMeasurements: p.clinicalMeasurements,
      };
    });

    // Unresolved safety escalations across all patients
    const openEscalations = await prisma.safetyEscalation.findMany({
      where: { resolutionStatus: "OPEN" },
      include: { patient: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      clinicianName: session.name,
      patientCards,
      openEscalations,
    });
  } catch (error) {
    console.error("Clinician patients fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch clinician patient queue" }, { status: 500 });
  }
}
