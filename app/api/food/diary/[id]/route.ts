import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rebuildDailySummary } from "@/services/food/nutritionProvider";
import { estimateItemNutrition } from "@/services/food/nutritionProvider";

/**
 * GET /api/food/diary/[id]   — get a single log
 * PUT /api/food/diary/[id]   — update / replace items
 * DELETE /api/food/diary/[id] — soft-delete
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const log = await prisma.foodLog.findUnique({
    where: { id: params.id },
    include: { items: true },
  });
  if (!log || log.userId !== session.userId || log.status === "DELETED") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ log });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const log = await prisma.foodLog.findUnique({ where: { id: params.id } });
    if (!log || log.userId !== session.userId || log.status === "DELETED") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await request.json();
    const { mealType, mealTime, notes, items } = body as {
      mealType?: string;
      mealTime?: string;
      notes?: string;
      items?: Array<{
        foodName: string;
        foodNameHi?: string;
        quantity: number;
        quantityUnit: string;
        nutritionFoodId?: string;
      }>;
    };

    const dateStr = (mealTime ? new Date(mealTime) : log.mealTime).toISOString().split("T")[0];

    await prisma.$transaction(async (tx) => {
      await tx.foodLog.update({
        where: { id: params.id },
        data: {
          ...(mealType && { mealType }),
          ...(mealTime && { mealTime: new Date(mealTime) }),
          ...(notes !== undefined && { notes }),
        },
      });

      if (items) {
        // Replace items
        await tx.foodLogItem.deleteMany({ where: { foodLogId: params.id } });
        const resolved = await Promise.all(
          items.map(async (item) => {
            const nutrition = await estimateItemNutrition(
              item.foodName,
              item.quantity,
              item.quantityUnit,
              item.nutritionFoodId
            );
            return {
              foodLogId: params.id,
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
              nutritionSource: nutrition.nutritionSource,
              estimationNotes: nutrition.estimationNotes,
              patientConfirmed: true,
            };
          })
        );
        await tx.foodLogItem.createMany({ data: resolved });
      }
    });

    await rebuildDailySummary(session.userId, dateStr);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error("[food/diary/:id PUT]", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const log = await prisma.foodLog.findUnique({ where: { id: params.id } });
    if (!log || log.userId !== session.userId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const dateStr = log.mealTime.toISOString().split("T")[0];

    await prisma.foodLog.update({
      where: { id: params.id },
      data: { status: "DELETED" },
    });

    await rebuildDailySummary(session.userId, dateStr);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error("[food/diary/:id DELETE]", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
