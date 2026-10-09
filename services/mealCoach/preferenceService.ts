/**
 * Project Pulse — Patient Food Preference Service
 *
 * Retrieves and updates voluntary dietary preferences.
 * Strict Rule: Allergy and intolerance exclusions are mandatory constraints.
 * Never recommend foods conflicting with recorded allergies or intolerances.
 */

import { prisma } from "@/lib/db";
import { PatientPreferencesData } from "./types";

export const DEFAULT_PREFERENCES: PatientPreferencesData = {
  dietaryPattern: "vegetarian",
  regionalCuisine: "North Indian",
  allergies: [],
  intolerances: [],
  foodsAvoided: [],
  budgetPriority: "standard",
  cookingTimeMinutes: 30,
  cookingFacilities: "standard_kitchen",
  servingsCount: 1,
};

export async function getPatientPreferences(userId: string): Promise<PatientPreferencesData> {
  const record = await prisma.patientFoodPreference.findUnique({
    where: { userId },
  });

  if (!record) {
    return DEFAULT_PREFERENCES;
  }

  return {
    dietaryPattern: record.dietaryPattern ?? "vegetarian",
    regionalCuisine: record.regionalCuisine ?? "North Indian",
    allergies: parseJsonArray(record.allergies),
    intolerances: parseJsonArray(record.intolerances),
    foodsAvoided: parseJsonArray(record.foodsAvoided),
    budgetPriority: (record.budgetPriority as PatientPreferencesData["budgetPriority"]) ?? "standard",
    cookingTimeMinutes: record.cookingTimeMinutes ?? 30,
    cookingFacilities: record.cookingFacilities ?? "standard_kitchen",
    servingsCount: record.servingsCount ?? 1,
  };
}

export async function updatePatientPreferences(
  userId: string,
  updates: Partial<PatientPreferencesData>
): Promise<PatientPreferencesData> {
  const current = await getPatientPreferences(userId);
  const merged: PatientPreferencesData = {
    ...current,
    ...updates,
  };

  await prisma.patientFoodPreference.upsert({
    where: { userId },
    update: {
      dietaryPattern: merged.dietaryPattern,
      regionalCuisine: merged.regionalCuisine,
      allergies: JSON.stringify(merged.allergies),
      intolerances: JSON.stringify(merged.intolerances),
      foodsAvoided: JSON.stringify(merged.foodsAvoided),
      budgetPriority: merged.budgetPriority,
      cookingTimeMinutes: merged.cookingTimeMinutes,
      cookingFacilities: merged.cookingFacilities,
      servingsCount: merged.servingsCount,
    },
    create: {
      userId,
      dietaryPattern: merged.dietaryPattern,
      regionalCuisine: merged.regionalCuisine,
      allergies: JSON.stringify(merged.allergies),
      intolerances: JSON.stringify(merged.intolerances),
      foodsAvoided: JSON.stringify(merged.foodsAvoided),
      budgetPriority: merged.budgetPriority,
      cookingTimeMinutes: merged.cookingTimeMinutes,
      cookingFacilities: merged.cookingFacilities,
      servingsCount: merged.servingsCount,
    },
  });

  return merged;
}

/**
 * Checks if a candidate food or ingredient triggers any recorded allergy, intolerance, or avoidance.
 * Case-insensitive match against keywords.
 */
export function checkFoodAllergySafety(
  candidateText: string,
  prefs: PatientPreferencesData
): { isSafe: boolean; violationReason?: string } {
  const lower = candidateText.toLowerCase();

  for (const allergy of prefs.allergies) {
    if (!allergy) continue;
    const cleanAllergy = allergy.toLowerCase().trim();
    const stem = cleanAllergy.endsWith("s") ? cleanAllergy.slice(0, -1) : cleanAllergy;
    const regex = new RegExp(`\\b(${cleanAllergy}|${stem})`, "i");
    if (regex.test(lower)) {
      return { isSafe: false, violationReason: `Conflicts with recorded allergy: ${allergy}` };
    }
  }

  for (const intolerance of prefs.intolerances) {
    if (!intolerance) continue;
    const clean = intolerance.toLowerCase().trim();
    const stem = clean.endsWith("s") ? clean.slice(0, -1) : clean;
    const regex = new RegExp(`\\b(${clean}|${stem})`, "i");
    if (regex.test(lower)) {
      return { isSafe: false, violationReason: `Conflicts with recorded intolerance: ${intolerance}` };
    }
  }

  // Dietary pattern constraints with word boundary to avoid false positives like "veggie"
  if (prefs.dietaryPattern === "vegetarian" || prefs.dietaryPattern === "jain") {
    const nonVegRegex = /\b(chicken|mutton|fish|meat|egg|eggs|anda|ande|prawn|prawns|beef|pork)\b/i;
    const match = lower.match(nonVegRegex);
    if (match) {
      return { isSafe: false, violationReason: `Contains non-vegetarian ingredient (${match[0]}) contrary to vegetarian preference` };
    }
  }

  if (prefs.dietaryPattern === "jain") {
    const rootVegRegex = /\b(onion|onions|garlic|potato|potatoes|aloo|pyaz|lahsun|ginger|adrak|radish|mooli)\b/i;
    const match = lower.match(rootVegRegex);
    if (match) {
      return { isSafe: false, violationReason: `Contains root vegetable (${match[0]}) contrary to Jain dietary pattern` };
    }
  }

  return { isSafe: true };
}

function parseJsonArray(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
