import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserInsights } from "@/services/health/insightService";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const insights = await getUserInsights(session.userId);

    return NextResponse.json({
      success: true,
      insights,
    });
  } catch (error) {
    console.error("Insights error:", error);
    return NextResponse.json(
      { error: "Failed to fetch health insights" },
      { status: 500 }
    );
  }
}
