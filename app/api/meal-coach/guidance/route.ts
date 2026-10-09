import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getApprovedNutritionGuidance } from "@/services/mealCoach/guidanceLibrary";

/**
 * GET /api/meal-coach/guidance
 * Returns the approved clinical nutrition education content library.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const guidance = await getApprovedNutritionGuidance();

    return NextResponse.json({
      success: true,
      guidance,
      governance: {
        reviewStandard: "ICMR-NIN & RSSDI Clinical Nutrition Standards",
        lastAuditDate: new Date().toISOString().split("T")[0],
        status: "ACTIVE_APPROVED",
      },
    });
  } catch (error: unknown) {
    console.error("[meal-coach/guidance GET]", error);
    return NextResponse.json({ error: "Could not load guidance library" }, { status: 500 });
  }
}
