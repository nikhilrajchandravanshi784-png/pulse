import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateMealSuggestions } from "@/services/mealCoach/mealSuggestionService";
import { MealCoachContext, MealCoachItemInput } from "@/services/mealCoach/types";

/**
 * POST /api/meal-coach/suggestions
 * Generates personalized, safe educational meal improvement suggestions.
 * Accepts:
 *   - foodLogId?: string (if attached to an existing confirmed meal)
 *   - mealType?: string (breakfast, lunch, dinner, snack)
 *   - items?: MealCoachItemInput[] (explicit items or pulled from foodLog)
 *   - language?: "hi" | "en"
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    const userId = session?.userId ?? "guest_patient";

    const body = await request.json();
    const { foodLogId, mealType, items: customItems, language } = body as {
      foodLogId?: string;
      mealType?: string;
      items?: MealCoachItemInput[];
      language?: "hi" | "en";
    };

    let resolvedItems: MealCoachItemInput[] = customItems ?? [];
    let resolvedMealType = mealType ?? "lunch";

    // If foodLogId is supplied, verify ownership and pull confirmed items
    if (foodLogId) {
      const log = await prisma.foodLog.findUnique({
        where: { id: foodLogId },
        include: { items: true },
      });

      if (!log) {
        return NextResponse.json({ error: "Food log not found" }, { status: 404 });
      }

      if (session && log.userId !== session.userId) {
        return NextResponse.json({ error: "Forbidden: You cannot access another patient's food log" }, { status: 403 });
      }

      resolvedMealType = log.mealType;

      // Prefer confirmed food log items
      if (log.items.length > 0 && resolvedItems.length === 0) {
        resolvedItems = log.items.map((i) => ({
          foodName: i.foodName,
          foodNameHi: i.foodNameHi,
          quantity: i.quantity,
          quantityUnit: i.quantityUnit,
          estimatedMassGrams: i.estimatedMassGrams,
          calories: i.calories,
          carbohydrates: i.carbohydrates,
          protein: i.protein,
          fat: i.fat,
          fiber: i.fiber,
        }));
      }
    }

    const context: MealCoachContext = {
      userId,
      foodLogId,
      mealType: resolvedMealType,
      items: resolvedItems,
      language: language ?? "hi",
    };

    const response = await generateMealSuggestions(context);

    return NextResponse.json({
      success: true,
      ...response,
    });
  } catch (error: unknown) {
    console.error("[meal-coach/suggestions] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Could not generate meal suggestions at this time. Please try again." },
      { status: 500 }
    );
  }
}
