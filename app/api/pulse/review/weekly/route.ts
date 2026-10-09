import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPatientWeeklyReview } from "@/services/pulse/reviewService";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const week = parseInt(searchParams.get("week") || "2", 10);

    const review = await getPatientWeeklyReview(session.userId, week);

    return NextResponse.json({
      success: true,
      review: review.weekly,
      recentCheckIns: review.checkIns,
      recentRecoveries: review.recoveries,
    });
  } catch (error) {
    console.error("Weekly review error:", error);
    return NextResponse.json({ error: "Failed to generate weekly review" }, { status: 500 });
  }
}
