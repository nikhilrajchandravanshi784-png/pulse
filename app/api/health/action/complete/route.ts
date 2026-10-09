import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { GoalSyncService } from "@/services/pulse/goalSyncService";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const actionType = body.actionType === "PARTIAL" ? "PARTIAL" : "COMPLETED";
    const goalId = body.goalId;

    const result = await GoalSyncService.completeTodayAction(
      session.userId,
      actionType,
      goalId
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Complete action error:", error);
    return NextResponse.json(
      { error: "Failed to record action completion" },
      { status: 500 }
    );
  }
}
