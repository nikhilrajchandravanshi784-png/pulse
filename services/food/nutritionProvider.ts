/**
 * Pulse Food AI — Nutrition Provider
 *
 * Provides nutrition data lookup and estimation.
 * Uses the demo database by default; configurable for USDA FoodData Central.
 *
 * Architecture: Food recognition (AI vision) and nutrition calculation are
 * kept intentionally separate so each can be swapped independently.
 */

import {
  NutritionProvider,
  NutritionRecord,
  NutritionEstimate,
  calcNutrientsForMass,
  resolvePortionMass,
} from "./types";
import { DEMO_NUTRITION_DB } from "./demoNutritionData";
import { env } from "@/lib/env";

// ─── Demo Nutrition Provider ─────────────────────────────────────────────────

export class DemoNutritionProvider implements NutritionProvider {
  readonly providerKey = "demo";

  async searchFood(query: string, _lang?: "en" | "hi"): Promise<NutritionRecord[]> {
    const q = query.toLowerCase().trim();
    // Fuzzy search through name + aliases
    return DEMO_NUTRITION_DB.filter(
      (food) =>
        food.canonicalName.toLowerCase().includes(q) ||
        (food.canonicalNameHi ?? "").includes(q) ||
        food.alternativeNames.some((alias) => alias.toLowerCase().includes(q))
    ).slice(0, 10);
  }

  async getFoodById(id: string): Promise<NutritionRecord | null> {
    return DEMO_NUTRITION_DB.find((f) => f.id === id) ?? null;
  }

  async estimateNutrition(
    foodName: string,
    massGrams: number,
    nutritionRecord?: NutritionRecord
  ): Promise<NutritionEstimate> {
    const record = nutritionRecord ?? this.findBestMatch(foodName);

    if (!record) {
      return {
        foodName,
        quantity: massGrams,
        quantityUnit: "grams",
        estimatedMassGrams: massGrams,
        calories: 0,
        carbohydrates: 0,
        protein: 0,
        fat: 0,
        fiber: 0,
        nutritionSource: "demo",
        estimationNotes:
          "⚠️ No nutrition record found for this food. Please add it manually or search for a matching food.",
      };
    }

    const nutrients = calcNutrientsForMass(record.nutrients, massGrams);

    return {
      foodName: record.canonicalName,
      foodNameHi: record.canonicalNameHi,
      quantity: massGrams,
      quantityUnit: "grams",
      estimatedMassGrams: massGrams,
      ...nutrients,
      nutritionSource: "demo",
      nutritionFoodId: record.id,
      estimationNotes: record.estimationNotes ?? "Demo estimate",
    };
  }

  private findBestMatch(name: string): NutritionRecord | null {
    const lower = name.toLowerCase().trim();
    // 1. Exact match on canonical or alternative names
    const exact = DEMO_NUTRITION_DB.find(
      (f) =>
        f.canonicalName.toLowerCase() === lower ||
        f.alternativeNames.some((alias) => alias.toLowerCase() === lower)
    );
    if (exact) return exact;

    // 2. Substring match
    const partial = DEMO_NUTRITION_DB.find(
      (f) =>
        f.canonicalName.toLowerCase().includes(lower) ||
        lower.includes(f.canonicalName.toLowerCase()) ||
        f.alternativeNames.some(
          (alias) => alias.toLowerCase().includes(lower) || lower.includes(alias.toLowerCase())
        )
    );
    return partial ?? null;
  }
}

// ─── USDA FoodData Central Provider ──────────────────────────────────────────

export class UsdaNutritionProvider implements NutritionProvider {
  readonly providerKey = "usda";
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.nal.usda.gov/fdc/v1";

  constructor() {
    this.apiKey = env.NUTRITION_API_KEY ?? "";
  }

  async searchFood(query: string): Promise<NutritionRecord[]> {
    const url = `${this.baseUrl}/foods/search?query=${encodeURIComponent(query)}&pageSize=10&api_key=${this.apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`USDA API error ${res.status}`);
    const data = (await res.json()) as {
      foods?: Array<{
        fdcId: number;
        description: string;
        foodNutrients?: Array<{
          nutrientId: number;
          value: number;
        }>;
        servingSize?: number;
        servingSizeUnit?: string;
      }>;
    };
    return (data.foods ?? []).map((food) => this.mapUsdaFood(food));
  }

  async getFoodById(id: string): Promise<NutritionRecord | null> {
    const url = `${this.baseUrl}/food/${id}?api_key=${this.apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const food = await res.json() as {
      fdcId: number;
      description: string;
      foodNutrients?: Array<{
        nutrient?: { id: number };
        amount?: number;
      }>;
      servingSize?: number;
    };
    return this.mapUsdaFoodDetail(food);
  }

  async estimateNutrition(
    foodName: string,
    massGrams: number,
    nutritionRecord?: NutritionRecord
  ): Promise<NutritionEstimate> {
    const record = nutritionRecord ?? (await this.searchFood(foodName))[0] ?? null;
    if (!record) {
      return {
        foodName,
        quantity: massGrams,
        quantityUnit: "grams",
        estimatedMassGrams: massGrams,
        calories: 0,
        carbohydrates: 0,
        protein: 0,
        fat: 0,
        fiber: 0,
        nutritionSource: "usda",
        estimationNotes: "No USDA record found for this food.",
      };
    }
    const nutrients = calcNutrientsForMass(record.nutrients, massGrams);
    return {
      foodName: record.canonicalName,
      quantity: massGrams,
      quantityUnit: "grams",
      estimatedMassGrams: massGrams,
      ...nutrients,
      nutritionSource: "usda",
      nutritionFoodId: record.id,
      estimationNotes: `USDA FoodData Central estimate. ${record.estimationNotes ?? ""}`,
    };
  }

  // USDA nutrient IDs (per 100g basis)
  private readonly NUTRIENT_IDS = {
    calories: 1008,
    carbs: 1005,
    protein: 1003,
    fat: 1004,
    fiber: 1079,
    sugar: 2000,
    sodium: 1093,
  };

  private mapUsdaFood(food: {
    fdcId: number;
    description: string;
    foodNutrients?: Array<{ nutrientId: number; value: number }>;
    servingSize?: number;
  }): NutritionRecord {
    const getNutrient = (id: number): number | undefined =>
      food.foodNutrients?.find((n) => n.nutrientId === id)?.value;

    return {
      id: `usda-${food.fdcId}`,
      provider: "usda",
      externalFoodId: String(food.fdcId),
      canonicalName: food.description,
      alternativeNames: [],
      defaultServingMass: food.servingSize,
      nutrients: {
        calories: getNutrient(this.NUTRIENT_IDS.calories),
        carbs: getNutrient(this.NUTRIENT_IDS.carbs),
        protein: getNutrient(this.NUTRIENT_IDS.protein),
        fat: getNutrient(this.NUTRIENT_IDS.fat),
        fiber: getNutrient(this.NUTRIENT_IDS.fiber),
        sugar: getNutrient(this.NUTRIENT_IDS.sugar),
        sodium: getNutrient(this.NUTRIENT_IDS.sodium),
      },
      portionConversions: [],
      sourceReference: `USDA FoodData Central FDC ID ${food.fdcId}`,
      dataVersion: "usda-fdc-2024",
      isVerified: true,
      estimationNotes: "Values are per 100g from USDA FoodData Central.",
    };
  }

  private mapUsdaFoodDetail(food: {
    fdcId: number;
    description: string;
    foodNutrients?: Array<{ nutrient?: { id: number }; amount?: number }>;
    servingSize?: number;
  }): NutritionRecord {
    const getNutrient = (id: number): number | undefined =>
      food.foodNutrients?.find((n) => n.nutrient?.id === id)?.amount;

    return {
      id: `usda-${food.fdcId}`,
      provider: "usda",
      externalFoodId: String(food.fdcId),
      canonicalName: food.description,
      alternativeNames: [],
      defaultServingMass: food.servingSize,
      nutrients: {
        calories: getNutrient(this.NUTRIENT_IDS.calories),
        carbs: getNutrient(this.NUTRIENT_IDS.carbs),
        protein: getNutrient(this.NUTRIENT_IDS.protein),
        fat: getNutrient(this.NUTRIENT_IDS.fat),
        fiber: getNutrient(this.NUTRIENT_IDS.fiber),
        sugar: getNutrient(this.NUTRIENT_IDS.sugar),
        sodium: getNutrient(this.NUTRIENT_IDS.sodium),
      },
      portionConversions: [],
      sourceReference: `USDA FoodData Central FDC ID ${food.fdcId}`,
      dataVersion: "usda-fdc-2024",
      isVerified: true,
      estimationNotes: "Values are per 100g from USDA FoodData Central.",
    };
  }
}

// ─── Provider Factory ─────────────────────────────────────────────────────────

let _nutritionProvider: NutritionProvider | null = null;

export function getNutritionProvider(): NutritionProvider {
  if (_nutritionProvider) return _nutritionProvider;

  const providerKey = env.NUTRITION_PROVIDER ?? "demo";

  if (providerKey === "usda" && env.NUTRITION_API_KEY) {
    _nutritionProvider = new UsdaNutritionProvider();
  } else {
    _nutritionProvider = new DemoNutritionProvider();
  }

  return _nutritionProvider;
}

// ─── Nutrition Estimation Service ─────────────────────────────────────────────

/**
 * Resolve a food name + portion to a full NutritionEstimate.
 * Handles portion conversion internally.
 */
export async function estimateItemNutrition(
  foodName: string,
  quantity: number,
  quantityUnit: string,
  nutritionFoodId?: string
): Promise<NutritionEstimate & { nutritionRecord?: NutritionRecord }> {
  const provider = getNutritionProvider();

  let record: NutritionRecord | null = null;
  if (nutritionFoodId) {
    record = await provider.getFoodById(nutritionFoodId);
  }
  if (!record) {
    const results = await provider.searchFood(foodName);
    record = results[0] ?? null;
  }

  // Resolve to grams
  const massGrams = record
    ? resolvePortionMass(quantity, quantityUnit, record.portionConversions, record.defaultServingMass)
    : quantity;

  const estimate = await provider.estimateNutrition(foodName, massGrams, record ?? undefined);

  return {
    ...estimate,
    quantity,
    quantityUnit,
    estimatedMassGrams: massGrams,
    nutritionRecord: record ?? undefined,
  };
}

/**
 * Rebuild the DailyNutritionSummary for a given userId and date string (YYYY-MM-DD).
 */
export async function rebuildDailySummary(userId: string, date: string): Promise<void> {
  const { prisma } = await import("@/lib/db");

  // Find start and end of that local date (treat as UTC boundaries for SQLite)
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd = new Date(`${date}T23:59:59.999Z`);

  const logs = await prisma.foodLog.findMany({
    where: {
      userId,
      status: "CONFIRMED",
      mealTime: { gte: dayStart, lte: dayEnd },
    },
    include: { items: true },
  });

  let calories = 0, carbs = 0, protein = 0, fat = 0, fiber = 0;

  for (const log of logs) {
    for (const item of log.items) {
      if (item.patientConfirmed) {
        calories += item.calories ?? 0;
        carbs += item.carbohydrates ?? 0;
        protein += item.protein ?? 0;
        fat += item.fat ?? 0;
        fiber += item.fiber ?? 0;
      }
    }
  }

  await prisma.dailyNutritionSummary.upsert({
    where: { userId_date: { userId, date } },
    update: {
      loggedCalories: Math.round(calories * 10) / 10,
      loggedCarbohydrates: Math.round(carbs * 10) / 10,
      loggedProtein: Math.round(protein * 10) / 10,
      loggedFat: Math.round(fat * 10) / 10,
      loggedFiber: Math.round(fiber * 10) / 10,
      mealsLogged: logs.length,
      completenessStatus: "PARTIAL",
    },
    create: {
      userId,
      date,
      loggedCalories: Math.round(calories * 10) / 10,
      loggedCarbohydrates: Math.round(carbs * 10) / 10,
      loggedProtein: Math.round(protein * 10) / 10,
      loggedFat: Math.round(fat * 10) / 10,
      loggedFiber: Math.round(fiber * 10) / 10,
      mealsLogged: logs.length,
      completenessStatus: "PARTIAL",
    },
  });
}
