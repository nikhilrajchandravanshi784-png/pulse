/**
 * Pulse Food AI — Demo Food Recognition Provider
 *
 * Returns clearly-labeled mock food recognition results.
 * Used when FOOD_AI_PROVIDER is not configured or is set to "demo".
 * Never pretends to be a real AI model.
 */

import {
  FoodRecognitionContext,
  FoodRecognitionProvider,
  FoodRecognitionResult,
  CandidateFoodItem,
} from "./types";

const DEMO_RESPONSES: Record<string, CandidateFoodItem[]> = {
  indian_lunch: [
    {
      candidateFoodName: "Cooked White Rice",
      candidateFoodNameHi: "पके हुए चावल",
      alternativeName: "chawal",
      estimatedPortion: 1,
      estimatedPortionUnit: "katori",
      estimatedMassGrams: 150,
      confidenceScore: 0.78,
      uncertaintyNotes: "Portion estimated from typical katori serving. Adjust if different.",
    },
    {
      candidateFoodName: "Dal (Cooked Lentil Soup)",
      candidateFoodNameHi: "दाल",
      alternativeName: "lentil soup",
      estimatedPortion: 1,
      estimatedPortionUnit: "katori",
      estimatedMassGrams: 150,
      confidenceScore: 0.72,
      uncertaintyNotes: "Dal type (toor/moong/masoor) unclear from image — nutrition may vary.",
      ambiguityNote: "Could be toor dal, moong dal, or masoor dal. Please confirm.",
      suggestionOptions: ["Toor Dal", "Moong Dal", "Masoor Dal", "Mixed Dal"],
    },
    {
      candidateFoodName: "Roti (Whole Wheat Chapati)",
      candidateFoodNameHi: "रोटी / चपाती",
      alternativeName: "chapati",
      estimatedPortion: 2,
      estimatedPortionUnit: "roti",
      estimatedMassGrams: 60,
      confidenceScore: 0.85,
      uncertaintyNotes: "Counted 2 rotis. Adjust if portion differs.",
    },
    {
      candidateFoodName: "Mixed Vegetable Curry",
      candidateFoodNameHi: "मिक्स सब्जी",
      alternativeName: "sabzi",
      estimatedPortion: 1,
      estimatedPortionUnit: "katori",
      estimatedMassGrams: 150,
      confidenceScore: 0.65,
      uncertaintyNotes: "Vegetable type and preparation unclear. Recipe and oil used will affect nutrition.",
      ambiguityNote: "Type of vegetable curry is uncertain — could be aloo, gobi, or mixed.",
    },
  ],
  breakfast: [
    {
      candidateFoodName: "Idli (Steamed Rice Cake)",
      candidateFoodNameHi: "इडली",
      alternativeName: "steamed rice cake",
      estimatedPortion: 3,
      estimatedPortionUnit: "idli",
      estimatedMassGrams: 135,
      confidenceScore: 0.88,
    },
    {
      candidateFoodName: "Sambar",
      candidateFoodNameHi: "सांभर",
      estimatedPortion: 1,
      estimatedPortionUnit: "katori",
      estimatedMassGrams: 150,
      confidenceScore: 0.76,
    },
    {
      candidateFoodName: "Curd / Yogurt (Plain, Full Fat)",
      candidateFoodNameHi: "दही",
      alternativeName: "dahi",
      estimatedPortion: 1,
      estimatedPortionUnit: "small katori",
      estimatedMassGrams: 100,
      confidenceScore: 0.70,
    },
  ],
  snack: [
    {
      candidateFoodName: "Banana",
      candidateFoodNameHi: "केला",
      alternativeName: "kela",
      estimatedPortion: 1,
      estimatedPortionUnit: "medium banana",
      estimatedMassGrams: 120,
      confidenceScore: 0.92,
    },
    {
      candidateFoodName: "Apple",
      candidateFoodNameHi: "सेब",
      estimatedPortion: 1,
      estimatedPortionUnit: "medium apple",
      estimatedMassGrams: 150,
      confidenceScore: 0.88,
    },
  ],
};

export class DemoFoodRecognitionProvider implements FoodRecognitionProvider {
  readonly providerKey = "demo";
  readonly isDemo = true;

  async analyzeMeal(
    _imageBuffer: Buffer,
    _mimeType: string,
    context: FoodRecognitionContext
  ): Promise<FoodRecognitionResult> {
    // Simulate a realistic analysis delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    const mealType = context.mealType?.toLowerCase() ?? "";
    let items: CandidateFoodItem[];

    if (mealType === "breakfast") {
      items = DEMO_RESPONSES.breakfast;
    } else if (mealType === "snack") {
      items = DEMO_RESPONSES.snack;
    } else {
      // Default to Indian lunch
      items = DEMO_RESPONSES.indian_lunch;
    }

    return {
      isDemo: true,
      provider: "demo",
      modelVersion: "demo-v1",
      items: items.map((item) => ({
        ...item,
        originalPrediction: JSON.stringify(item),
      })),
      overallConfidence: 0.75,
      analysisNotes:
        "🔬 DEMO MODE — These results are sample data, not real AI food recognition. Configure FOOD_AI_PROVIDER=gemini and FOOD_AI_API_KEY to enable live analysis.",
    };
  }
}
