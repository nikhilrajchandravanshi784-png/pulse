import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getPatientPreferences, updatePatientPreferences, DEFAULT_PREFERENCES } from "@/services/mealCoach/preferenceService";
import { PatientPreferencesData } from "@/services/mealCoach/types";

/**
 * GET /api/meal-coach/preferences — returns patient dietary preferences
 * PUT /api/meal-coach/preferences — updates patient dietary preferences
 */
export async function GET() {
  try {
    const session = await getSession();
    const preferences = session
      ? await getPatientPreferences(session.userId)
      : DEFAULT_PREFERENCES;
    return NextResponse.json({ success: true, preferences });
  } catch (error: unknown) {
    console.error("[meal-coach/preferences GET]", error);
    return NextResponse.json({ error: "Could not load preferences" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    const body = (await request.json()) as Partial<PatientPreferencesData>;

    // Validate allergy & intolerance formats
    if (body.allergies && !Array.isArray(body.allergies)) {
      return NextResponse.json({ error: "allergies must be an array of strings" }, { status: 400 });
    }
    if (body.intolerances && !Array.isArray(body.intolerances)) {
      return NextResponse.json({ error: "intolerances must be an array of strings" }, { status: 400 });
    }

    const updated = session
      ? await updatePatientPreferences(session.userId, body)
      : { ...DEFAULT_PREFERENCES, ...body };

    return NextResponse.json({
      success: true,
      preferences: updated,
      message: "Preferences updated successfully.",
    });
  } catch (error: unknown) {
    console.error("[meal-coach/preferences PUT]", error);
    return NextResponse.json({ error: "Could not update preferences" }, { status: 500 });
  }
}
