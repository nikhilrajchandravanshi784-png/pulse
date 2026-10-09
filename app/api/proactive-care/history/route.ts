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

    const [interventions, metrics] = await Promise.all([
      prisma.interventionEvent.findMany({
        where: { userId: auth.userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          goal: true,
          response: true,
          recoveryOutcome: true,
          safetyEscalation: true,
        },
      }),
      RecoveryTrackingService.computeMetrics(auth.userId),
    ]);

    return NextResponse.json({ interventions, metrics });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch intervention history" }, { status: 500 });
  }
}
