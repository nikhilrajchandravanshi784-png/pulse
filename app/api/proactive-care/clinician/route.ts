import { NextResponse } from "next/server";
import { resolveProactiveUser } from "@/lib/proactiveCareAuth";
import { prisma } from "@/lib/db";
import { RecoveryTrackingService } from "@/services/proactiveCare";

export async function GET() {
  try {
    const auth = await resolveProactiveUser();
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Role check: Only clinicians or admins or demo user in demo mode
    if (auth.role !== "CLINICIAN" && auth.role !== "ADMIN" && !auth.isGuest) {
      return NextResponse.json({ error: "Forbidden: Clinician access required" }, { status: 403 });
    }

    const [metrics, openEscalations, repeatedBarriers, goalAdjustments] = await Promise.all([
      RecoveryTrackingService.computeMetrics(),
      prisma.safetyEscalation.findMany({
        where: { resolutionStatus: { not: "RESOLVED" } },
        include: { patient: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.interventionResponse.findMany({
        where: { responseType: "EXPLAINED_BARRIER" },
        include: {
          intervention: {
            include: { user: true, goal: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.healthGoal.findMany({
        where: {
          patientStatus: "ADJUSTMENT_REQUESTED",
        },
        include: { user: true },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      metrics,
      openEscalations,
      repeatedBarriers,
      goalAdjustments,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch clinician proactive data" }, { status: 500 });
  }
}
