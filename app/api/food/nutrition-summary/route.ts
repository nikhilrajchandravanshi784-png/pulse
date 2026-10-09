import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/food/nutrition-summary?date=YYYY-MM-DD
 * Returns the aggregated nutrition summary for the given date.
 * If no summary exists, returns zeros with PARTIAL status.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

    const summary = await prisma.dailyNutritionSummary.findUnique({
      where: { userId_date: { userId: session.userId, date } },
    });

    // Also return per-meal breakdown
    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);
    const logs = await prisma.foodLog.findMany({
      where: {
        userId: session.userId,
        status: "CONFIRMED",
        mealTime: { gte: dayStart, lte: dayEnd },
      },
      include: { items: { where: { patientConfirmed: true } } },
      orderBy: { mealTime: "asc" },
    });

    const mealBreakdown = logs.map((log) => ({
      mealType: log.mealType,
      mealTime: log.mealTime,
      calories: log.items.reduce((s, i) => s + (i.calories ?? 0), 0),
      carbohydrates: log.items.reduce((s, i) => s + (i.carbohydrates ?? 0), 0),
      protein: log.items.reduce((s, i) => s + (i.protein ?? 0), 0),
      fiber: log.items.reduce((s, i) => s + (i.fiber ?? 0), 0),
    }));

    return NextResponse.json({
      date,
      summary: summary
        ? {
            loggedCalories: summary.loggedCalories,
            loggedCarbohydrates: summary.loggedCarbohydrates,
            loggedProtein: summary.loggedProtein,
            loggedFat: summary.loggedFat,
            loggedFiber: summary.loggedFiber,
            mealsLogged: summary.mealsLogged,
            completenessStatus: summary.completenessStatus,
          }
        : {
            loggedCalories: 0,
            loggedCarbohydrates: 0,
            loggedProtein: 0,
            loggedFat: 0,
            loggedFiber: 0,
            mealsLogged: 0,
            completenessStatus: "PARTIAL",
          },
      disclaimer:
        "These are estimated values from logged meals only. Unlogged meals are not counted. Values are not laboratory-measured and should not be used for clinical decisions.",
      mealBreakdown,
    });
  } catch (error: unknown) {
    console.error("[food/nutrition-summary]", error);
    return NextResponse.json({ error: "Failed to load nutrition summary." }, { status: 500 });
  }
}
