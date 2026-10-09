import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { syncAllUserDevices } from "@/services/health/syncService";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const results = await syncAllUserDevices(session.userId);

    return NextResponse.json({
      success: true,
      message: "Sync triggered across all active data streams",
      results,
    });
  } catch (error) {
    console.error("Multi-device sync error:", error);
    return NextResponse.json({ error: "Failed to sync devices" }, { status: 500 });
  }
}
