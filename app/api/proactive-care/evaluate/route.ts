import { NextResponse } from "next/server";
import { resolveProactiveUser } from "@/lib/proactiveCareAuth";
import { ProactiveCareEngine, RoutineMonitoringService } from "@/services/proactiveCare";

export async function POST(request: Request) {
  try {
    const auth = await resolveProactiveUser();
    const body = await request.json().catch(() => ({}));

    const targetUserId = body.userId || auth?.userId;
    const graceMinutes = body.graceMinutes ?? 60;

    // Optional: seed occurrences if requested
    if (body.seed && targetUserId) {
      await RoutineMonitoringService.seedOrScheduleOccurrences(targetUserId);
    }

    const result = await ProactiveCareEngine.runRoutineEvaluationJob(targetUserId, graceMinutes);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to execute evaluation job" }, { status: 500 });
  }
}
