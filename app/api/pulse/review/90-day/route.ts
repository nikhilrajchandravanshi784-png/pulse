import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { get90DayProgramOutcome } from "@/services/pulse/reviewService";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("patientId") || session.userId;

    // Enforce role authorization if viewing another patient
    if (targetUserId !== session.userId && session.role !== "CLINICIAN" && session.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Clinical authorization required" }, { status: 403 });
    }

    const outcome = await get90DayProgramOutcome(targetUserId);

    return NextResponse.json({
      success: true,
      outcome,
    });
  } catch (error) {
    console.error("90-day review error:", error);
    return NextResponse.json({ error: "Failed to generate 90-day review" }, { status: 500 });
  }
}
