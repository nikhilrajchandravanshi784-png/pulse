import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { DashboardSyncService } from "@/services/pulse/dashboardSyncService";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const liveData = await DashboardSyncService.getLiveDashboardData(
      session.userId,
      session.name
    );

    return NextResponse.json({
      success: true,
      ...liveData,
      lastCalculated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health summary fetch error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve health overview" },
      { status: 500 }
    );
  }
}
