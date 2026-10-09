import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { GoalSyncService } from "@/services/pulse/goalSyncService";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { action, adjustedTitle, adjustedFrequency } = body;

    const updated = await GoalSyncService.syncGoalStatusChange(
      session.userId,
      params.id,
      action,
      adjustedTitle,
      adjustedFrequency
    );

    return NextResponse.json({ success: true, goal: updated });
  } catch (error: any) {
    console.error("Goal update error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update goal" },
      { status: 500 }
    );
  }
}
