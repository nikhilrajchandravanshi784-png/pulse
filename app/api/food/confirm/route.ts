import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { estimateItemNutrition, rebuildDailySummary } from "@/services/food/nutritionProvider";

/**
 * POST /api/food/confirm
 * Saves a patient-reviewed and confirmed meal to the food diary.
 *
 * Body: {
 *   analysisId?: string,
 *   mealType: string,
 *   mealTime: string (ISO),
 *   notes?: string,
 *   items: Array<{
 *     recognizedItemId?: string,
 *     foodName: string,
 *     foodNameHi?: string,
 *     quantity: number,
 *     quantityUnit: string,
 *     nutritionFoodId?: string,
 *     preparationMethod?: string,
 *     patientCorrected?: boolean,
 *   }>
 * }
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    let currentUserId = session?.userId;
    if (!currentUserId) {
      const demoPatient = await prisma.user.findFirst({ where: { role: "PATIENT" } });
      if (demoPatient) currentUserId = demoPatient.id;
    }
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { analysisId, mealType, mealTime, notes, items } = body as {
      analysisId?: string;
      mealType: string;
      mealTime: string;
      notes?: string;
      items: Array<{
        recognizedItemId?: string;
        foodName: string;
        foodNameHi?: string;
        quantity: number;
        quantityUnit: string;
        nutritionFoodId?: string;
        preparationMethod?: string;
        patientCorrected?: boolean;
      }>;
    };

    if (!mealType || !mealTime || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "mealType, mealTime, and items are required." },
        { status: 400 }
      );
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Please add at least one food item before saving." },
        { status: 400 }
      );
    }

    // If analysisId provided, verify ownership
    if (analysisId) {
      const analysis = await prisma.foodImageAnalysis.findUnique({
        where: { id: analysisId },
      });
      if (!analysis || analysis.userId !== currentUserId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const mealDateTime = new Date(mealTime);
    const dateStr = mealDateTime.toISOString().split("T")[0];

    // Calculate nutrition for each item
    const resolvedItems = await Promise.all(
      items.map(async (item) => {
        const nutrition = await estimateItemNutrition(
          item.foodName,
          item.quantity,
          item.quantityUnit,
          item.nutritionFoodId
        );

        let validNutritionFoodId: string | null = null;
        const candidateFoodId = nutrition.nutritionFoodId ?? item.nutritionFoodId;
        if (candidateFoodId) {
          try {
            const exists = await prisma.nutritionFood.findUnique({
              where: { id: candidateFoodId },
              select: { id: true },
            });
            if (exists) validNutritionFoodId = candidateFoodId;
          } catch {
            validNutritionFoodId = null;
          }
        }

        let validRecognizedItemId: string | null = null;
        if (item.recognizedItemId) {
          try {
            const recExists = await prisma.recognizedFoodItem.findUnique({
              where: { id: item.recognizedItemId },
              select: { id: true },
            });
            if (recExists) validRecognizedItemId = item.recognizedItemId;
          } catch {
            validRecognizedItemId = null;
          }
        }

        return {
          recognizedItemId: validRecognizedItemId,
          nutritionFoodId: validNutritionFoodId,
          foodName: item.foodName,
          foodNameHi: item.foodNameHi ?? nutrition.foodNameHi ?? null,
          quantity: item.quantity,
          quantityUnit: item.quantityUnit,
          estimatedMassGrams: nutrition.estimatedMassGrams,
          calories: nutrition.calories,
          carbohydrates: nutrition.carbohydrates,
          protein: nutrition.protein,
          fat: nutrition.fat,
          fiber: nutrition.fiber,
          sugar: nutrition.sugar ?? null,
          sodium: nutrition.sodium ?? null,
          nutritionSource: nutrition.nutritionSource,
          estimationNotes: nutrition.estimationNotes,
          patientConfirmed: true,
        };
      })
    );

    // Create the FoodLog with items in a transaction
    const foodLog = await prisma.$transaction(async (tx) => {
      const log = await tx.foodLog.create({
        data: {
          userId: currentUserId,
          analysisId: analysisId ?? null,
          mealType,
          mealTime: mealDateTime,
          status: "CONFIRMED",
          notes: notes ?? null,
          hasPhoto: Boolean(analysisId),
          items: {
            create: resolvedItems,
          },
        },
        include: { items: true },
      });

      // Apply patient corrections to recognized items
      for (const item of resolvedItems) {
        if (item.recognizedItemId && item.patientConfirmed) {
          await tx.recognizedFoodItem.update({
            where: { id: item.recognizedItemId },
            data: {
              patientCorrected: true,
              correctedFoodName: item.foodName,
              correctedPortion: item.quantity,
              correctedPortionUnit: item.quantityUnit,
              correctedMassGrams: item.estimatedMassGrams,
            },
          });
        }
      }

      return log;
    });

    // Rebuild daily nutrition summary
    try {
      await rebuildDailySummary(currentUserId, dateStr);
    } catch (summaryErr) {
      console.warn("[food/confirm] Summary rebuild warning:", summaryErr);
    }

    return NextResponse.json({
      success: true,
      foodLogId: foodLog.id,
      totalCalories: resolvedItems.reduce((s, i) => s + (i.calories ?? 0), 0),
      totalCarbs: resolvedItems.reduce((s, i) => s + (i.carbohydrates ?? 0), 0),
      message: "Meal saved to your diary.",
    });
  } catch (error: unknown) {
    console.error("[food/confirm] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Could not save meal. Please try again." },
      { status: 500 }
    );
  }
}
