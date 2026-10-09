import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/food/diary?date=YYYY-MM-DD
 * Returns all confirmed food logs for the patient on the given date.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    const dayEnd = new Date(`${date}T23:59:59.999Z`);

    const logs = await prisma.foodLog.findMany({
      where: {
        userId: session.userId,
        status: { not: "DELETED" },
        mealTime: { gte: dayStart, lte: dayEnd },
      },
      include: {
        items: true,
        analysis: {
          select: {
            imageRef: true,
            isDemo: true,
            provider: true,
          },
        },
      },
      orderBy: { mealTime: "asc" },
    });

    // Build image URLs (signed, short-lived) for logs that have photos
    const logsWithUrls = logs.map((log) => ({
      id: log.id,
      mealType: log.mealType,
      mealTime: log.mealTime,
      status: log.status,
      notes: log.notes,
      hasPhoto: log.hasPhoto,
      isDemo: log.analysis?.isDemo ?? false,
      provider: log.analysis?.provider ?? "demo",
      // imageUrl intentionally omitted server-side — use /api/food/image/:ref with auth
      imageRef: log.analysis?.imageRef ?? null,
      items: log.items.map((item) => ({
        id: item.id,
        foodName: item.foodName,
        foodNameHi: item.foodNameHi,
        quantity: item.quantity,
        quantityUnit: item.quantityUnit,
        estimatedMassGrams: item.estimatedMassGrams,
        calories: item.calories,
        carbohydrates: item.carbohydrates,
        protein: item.protein,
        fat: item.fat,
        fiber: item.fiber,
        nutritionSource: item.nutritionSource,
        estimationNotes: item.estimationNotes,
        patientConfirmed: item.patientConfirmed,
      })),
      totals: {
        calories: log.items.reduce((s, i) => s + (i.calories ?? 0), 0),
        carbohydrates: log.items.reduce((s, i) => s + (i.carbohydrates ?? 0), 0),
        protein: log.items.reduce((s, i) => s + (i.protein ?? 0), 0),
        fat: log.items.reduce((s, i) => s + (i.fat ?? 0), 0),
        fiber: log.items.reduce((s, i) => s + (i.fiber ?? 0), 0),
      },
    }));

    return NextResponse.json({ date, logs: logsWithUrls });
  } catch (error: unknown) {
    console.error("[food/diary] Error:", error);
    return NextResponse.json({ error: "Failed to load diary." }, { status: 500 });
  }
}
