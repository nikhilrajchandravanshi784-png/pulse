/**
 * Pulse Food AI — Shared Types
 * All food recognition and nutrition estimation types live here.
 */

// ─── Food Recognition ────────────────────────────────────────────────────────

export interface FoodRecognitionContext {
  mealType?: string;
  mealDescription?: string;
  cuisineType?: string;
  portionContext?: string;
}

export interface CandidateFoodItem {
  candidateFoodName: string;
  candidateFoodNameHi?: string;
  alternativeName?: string;
  estimatedPortion?: number;
  estimatedPortionUnit?: string;
  estimatedMassGrams?: number;
  confidenceScore?: number; // 0.0 – 1.0
  uncertaintyNotes?: string;
  ambiguityNote?: string;
  suggestionOptions?: string[]; // alternative names to choose from
  originalPrediction?: string; // raw JSON snapshot
}

export interface FoodRecognitionResult {
  isDemo: boolean;
  provider: string;
  modelVersion?: string;
  items: CandidateFoodItem[];
  overallConfidence?: number;
  analysisNotes?: string;
}

export interface FoodRecognitionProvider {
  readonly providerKey: string;
  readonly isDemo: boolean;
  analyzeMeal(
    imageBuffer: Buffer,
    mimeType: string,
    context: FoodRecognitionContext
  ): Promise<FoodRecognitionResult>;
}

// ─── Nutrition ───────────────────────────────────────────────────────────────

export interface NutrientValues {
  calories?: number;     // kcal per 100g
  carbs?: number;        // g per 100g
  protein?: number;      // g per 100g
  fat?: number;          // g per 100g
  fiber?: number;        // g per 100g
  sugar?: number;        // g per 100g
  sodium?: number;       // mg per 100g
}

export interface PortionConversion {
  unit: string;          // "katori", "roti", "cup", "tablespoon", "piece"
  grams: number;         // approximate mass in grams
}

export interface NutritionRecord {
  id: string;
  provider: string;
  externalFoodId?: string;
  canonicalName: string;
  canonicalNameHi?: string;
  alternativeNames: string[];
  servingDescription?: string;
  defaultServingMass?: number;
  nutrients: NutrientValues; // per 100g
  portionConversions: PortionConversion[];
  sourceReference?: string;
  dataVersion?: string;
  isVerified: boolean;
  estimationNotes?: string;
}

export interface NutritionEstimate {
  foodName: string;
  foodNameHi?: string;
  quantity: number;
  quantityUnit: string;
  estimatedMassGrams: number;
  calories: number;
  carbohydrates: number;
  protein: number;
  fat: number;
  fiber: number;
  sugar?: number;
  sodium?: number;
  nutritionSource: string;
  nutritionFoodId?: string;
  estimationNotes: string;
}

export interface NutritionProvider {
  readonly providerKey: string;
  searchFood(query: string, lang?: "en" | "hi"): Promise<NutritionRecord[]>;
  getFoodById(id: string): Promise<NutritionRecord | null>;
  estimateNutrition(
    foodName: string,
    massGrams: number,
    nutritionRecord?: NutritionRecord
  ): Promise<NutritionEstimate>;
}

// ─── Image Storage ───────────────────────────────────────────────────────────

export interface StoredImage {
  imageRef: string;      // opaque key, never a public URL
  mimeType: string;
  sizeBytes: number;
}

export interface ImageStorageProvider {
  store(buffer: Buffer, mimeType: string, userId: string): Promise<StoredImage>;
  getSignedUrl(imageRef: string, expiresInSeconds?: number): Promise<string>;
  delete(imageRef: string): Promise<void>;
}

// ─── Portion utils ────────────────────────────────────────────────────────────

/**
 * Calculate nutrient values for a given food mass (grams) from per-100g nutrient data.
 */
export function calcNutrientsForMass(
  nutrients: NutrientValues,
  massGrams: number
): Required<Pick<NutritionEstimate, "calories" | "carbohydrates" | "protein" | "fat" | "fiber">> & {
  sugar?: number;
  sodium?: number;
} {
  const factor = massGrams / 100;
  return {
    calories: Math.round((nutrients.calories ?? 0) * factor * 10) / 10,
    carbohydrates: Math.round((nutrients.carbs ?? 0) * factor * 10) / 10,
    protein: Math.round((nutrients.protein ?? 0) * factor * 10) / 10,
    fat: Math.round((nutrients.fat ?? 0) * factor * 10) / 10,
    fiber: Math.round((nutrients.fiber ?? 0) * factor * 10) / 10,
    sugar: nutrients.sugar != null ? Math.round(nutrients.sugar * factor * 10) / 10 : undefined,
    sodium: nutrients.sodium != null ? Math.round(nutrients.sodium * factor * 10) / 10 : undefined,
  };
}

/**
 * Resolve a portion unit to grams using conversion table, with a fallback default.
 */
export function resolvePortionMass(
  quantity: number,
  unit: string,
  conversions: PortionConversion[],
  defaultServingMass?: number
): number {
  const unitLower = unit.toLowerCase().trim();
  if (unitLower === "grams" || unitLower === "g" || unitLower === "gram") {
    return quantity;
  }
  const match = conversions.find((c) => c.unit.toLowerCase() === unitLower);
  if (match) return quantity * match.grams;
  if (defaultServingMass) return quantity * defaultServingMass;
  return quantity * 100; // conservative fallback
}
