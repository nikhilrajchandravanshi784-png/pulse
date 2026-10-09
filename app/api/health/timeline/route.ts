import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getHealthTimeline } from "@/services/health/healthDataService";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const events = await getHealthTimeline(session.userId);

    return NextResponse.json({
      success: true,
      events,
    });
  } catch (error) {
    console.error("Health timeline error:", error);
    return NextResponse.json(
      { error: "Failed to fetch health timeline" },
      { status: 500 }
    );
  }
}
