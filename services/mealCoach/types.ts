/**
 * Project Pulse — Pulse Meal Coach
 * Types & Zod Schemas for AI-Powered Meal Improvement Suggestions
 */

import { z } from "zod";

export type SuggestionType = "ADDITION" | "SUBSTITUTION" | "PREPARATION";
export type SuggestionStatus = "ACTIVE" | "ACCEPTED" | "SAVED_FOR_LATER" | "DISMISSED" | "UNSUITABLE";
export type FeedbackAction = "TRY_IDEA" | "ANOTHER_OPTION" | "SAVE_FOR_LATER" | "NOT_SUITABLE" | "DISMISSED";

export interface MealCoachItemInput {
  foodName: string;
  foodNameHi?: string | null;
  quantity: number;
  quantityUnit: string;
  estimatedMassGrams?: number | null;
  calories?: number | null;
  carbohydrates?: number | null;
  protein?: number | null;
  fat?: number | null;
  fiber?: number | null;
}

export interface MealCoachContext {
  userId: string;
  foodLogId?: string;
  mealType: string;
  mealTime?: Date | string;
  items: MealCoachItemInput[];
  language?: "hi" | "en";
}

export interface PatientPreferencesData {
  dietaryPattern: string; // "vegetarian", "eggetarian", "non_vegetarian", "vegan", "jain"
  regionalCuisine: string; // "North Indian", "South Indian", "Gujarati", etc.
  allergies: string[];
  intolerances: string[];
  foodsAvoided: string[];
  budgetPriority: "budget_conscious" | "standard" | "flexible";
  cookingTimeMinutes: number;
  cookingFacilities: string;
  servingsCount: number;
}

export interface ApprovedGuidanceRecord {
  id: string;
  title: string;
  titleHi?: string;
  content: string;
  contentHi?: string;
  language: string;
  topic: string;
  sourceOrg: string;
  sourceUrl?: string;
  publicationDate?: string;
  reviewerRole: string;
  reviewStatus: string;
  lastReviewedAt: Date;
  applicableLimitations?: string;
}

export interface SingleSuggestion {
  id?: string;
  suggestionType: SuggestionType;
  title: string;
  titleHi: string;
  suggestionText: string;
  suggestionTextHi: string;
  explanation: string;
  explanationHi: string;
  alternatives: string[];
  evidenceReference: string;
  guidanceId?: string;
  uncertaintyNotes: string;
  isAiGenerated: boolean;
  providerModel?: string;
  status?: SuggestionStatus | string;
}

export interface MealCoachResponse {
  suggestions: SingleSuggestion[];
  disclaimer: string;
  disclaimerHi: string;
  patientPreferencesApplied: {
    dietaryPattern: string;
    allergiesExcluded: string[];
    intolerancesExcluded: string[];
  };
  hasEnoughGuidance: boolean;
  fallbackMessage?: string;
  isFallbackMode?: boolean;
  modeLabel?: string;
}

// ─── Zod Schema for Structured AI Generation Validation ─────────────────────

export const AISuggestionCandidateSchema = z.object({
  suggestionType: z.enum(["ADDITION", "SUBSTITUTION", "PREPARATION"]),
  title: z.string().min(3),
  titleHi: z.string().min(3),
  suggestionText: z.string().min(10),
  suggestionTextHi: z.string().min(10),
  explanation: z.string().min(15),
  explanationHi: z.string().min(15),
  alternatives: z.array(z.string()).default([]),
  evidenceReference: z.string().min(3),
  uncertaintyNotes: z.string().default("Preparation method and portion size affect nutritional impact."),
});

export const AISuggestionsOutputSchema = z.object({
  suggestions: z.array(AISuggestionCandidateSchema).max(3),
});
