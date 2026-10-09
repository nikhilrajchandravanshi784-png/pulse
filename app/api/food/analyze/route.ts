import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateFoodImage, getImageStorageProvider } from "@/services/food/imageService";
import { getFoodRecognitionProvider, isFoodAIDemo } from "@/services/food/recognitionProviderFactory";
import { getNutritionProvider } from "@/services/food/nutritionProvider";
import { resolvePortionMass } from "@/services/food/types";

// Rate-limit: max 20 analyze calls per user per hour (simple in-memory for demo)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

/**
 * POST /api/food/analyze
 * Accepts multipart/form-data with:
 *   - image: File (JPEG/PNG/WebP, max 8MB)
 *   - mealType, mealDescription, cuisineType, portionContext (optional strings)
 *
 * Returns: analysisId + recognized food items with estimated nutrition
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

    if (!checkRateLimit(currentUserId)) {
      return NextResponse.json(
        { error: "Too many analysis requests. Please wait before trying again." },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get("image") as File | null;
    const mealType = (formData.get("mealType") as string | null) ?? undefined;
    const mealDescription = (formData.get("mealDescription") as string | null) ?? undefined;
    const cuisineType = (formData.get("cuisineType") as string | null) ?? undefined;
    const portionContext = (formData.get("portionContext") as string | null) ?? undefined;

    if (!imageFile) {
      return NextResponse.json({ error: "No image provided." }, { status: 400 });
    }

    const mimeType = imageFile.type;
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Server-side validation
    const validation = validateFoodImage(buffer, mimeType);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 422 });
    }

    // Store image privately
    const storage = getImageStorageProvider();
    const stored = await storage.store(buffer, mimeType, currentUserId);

    // Create analysis record
    const analysis = await prisma.foodImageAnalysis.create({
      data: {
        userId: currentUserId,
        imageRef: stored.imageRef,
        imageMimeType: mimeType,
        imageSizeBytes: buffer.length,
        provider: isFoodAIDemo() ? "demo" : "gemini",
        analysisStatus: "PROCESSING",
        isDemo: isFoodAIDemo(),
        mealType,
        mealDescription,
        cuisineType,
        portionContext,
      },
    });

    // Run AI recognition
    let recognitionResult;
    try {
      const recognitionProvider = getFoodRecognitionProvider();
      recognitionResult = await recognitionProvider.analyzeMeal(buffer, mimeType, {
        mealType,
        mealDescription,
        cuisineType,
        portionContext,
      });
    } catch (aiError: unknown) {
      await prisma.foodImageAnalysis.update({
        where: { id: analysis.id },
        data: {
          analysisStatus: "FAILED",
          errorCode: "AI_PROVIDER_ERROR",
          errorMessage: aiError instanceof Error ? aiError.message.slice(0, 500) : "AI analysis failed",
        },
      });
      return NextResponse.json(
        {
          error: "Some foods could not be identified. You can add them manually.",
          analysisId: analysis.id,
          canProceedManually: true,
        },
        { status: 200 }
      );
    }

    // Lookup nutrition for each item
    const nutritionProvider = getNutritionProvider();
    const itemsWithNutrition = await Promise.all(
      recognitionResult.items.map(async (item) => {
        const searchResults = await nutritionProvider.searchFood(item.candidateFoodName);
        const nutritionRecord = searchResults[0] ?? null;

        const massGrams = item.estimatedMassGrams ??
          (nutritionRecord
            ? resolvePortionMass(
                item.estimatedPortion ?? 1,
                item.estimatedPortionUnit ?? "grams",
                nutritionRecord.portionConversions,
                nutritionRecord.defaultServingMass
              )
            : (item.estimatedPortion ?? 1) * 100);

        let nutrition = null;
        if (nutritionRecord) {
          const { calcNutrientsForMass } = await import("@/services/food/types");
          const nuts = calcNutrientsForMass(nutritionRecord.nutrients, massGrams);
          nutrition = {
            ...nuts,
            nutritionFoodId: nutritionRecord.id,
            nutritionSource: nutritionRecord.provider,
            estimationNotes: nutritionRecord.estimationNotes,
          };
        }

        // Save recognized item to DB
        const savedItem = await prisma.recognizedFoodItem.create({
          data: {
            analysisId: analysis.id,
            candidateFoodName: item.candidateFoodName,
            candidateFoodNameHi: item.candidateFoodNameHi,
            alternativeName: item.alternativeName,
            normalizedFoodId: nutritionRecord?.id,
            estimatedPortion: item.estimatedPortion,
            estimatedPortionUnit: item.estimatedPortionUnit,
            estimatedMassGrams: massGrams,
            confidenceScore: item.confidenceScore,
            uncertaintyNotes: item.uncertaintyNotes,
            ambiguityNote: item.ambiguityNote,
            suggestionOptions: JSON.stringify(item.suggestionOptions ?? []),
            originalPrediction: item.originalPrediction,
          },
        });

        return {
          id: savedItem.id,
          candidateFoodName: item.candidateFoodName,
          candidateFoodNameHi: item.candidateFoodNameHi,
          alternativeName: item.alternativeName,
          estimatedPortion: item.estimatedPortion,
          estimatedPortionUnit: item.estimatedPortionUnit,
          estimatedMassGrams: massGrams,
          confidenceScore: item.confidenceScore,
          uncertaintyNotes: item.uncertaintyNotes,
          ambiguityNote: item.ambiguityNote,
          suggestionOptions: item.suggestionOptions ?? [],
          nutrition,
          nutritionRecord: nutritionRecord
            ? {
                id: nutritionRecord.id,
                canonicalName: nutritionRecord.canonicalName,
                canonicalNameHi: nutritionRecord.canonicalNameHi,
                portionConversions: nutritionRecord.portionConversions,
                estimationNotes: nutritionRecord.estimationNotes,
              }
            : null,
        };
      })
    );

    // Mark analysis complete
    await prisma.foodImageAnalysis.update({
      where: { id: analysis.id },
      data: { analysisStatus: "COMPLETED", completedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      analysisId: analysis.id,
      isDemo: recognitionResult.isDemo,
      provider: recognitionResult.provider,
      analysisNotes: recognitionResult.analysisNotes,
      items: itemsWithNutrition,
      mealType,
    });
  } catch (error: unknown) {
    console.error("[food/analyze] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Analysis failed. Please try again or log your meal manually." },
      { status: 500 }
    );
  }
}
