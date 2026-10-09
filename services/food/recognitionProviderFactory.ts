/**
 * Pulse Food AI — Food Recognition Provider Factory
 *
 * Selects the appropriate food recognition provider based on environment config.
 * Always server-side. Never imported in browser code.
 */

import { FoodRecognitionProvider } from "./types";
import { DemoFoodRecognitionProvider } from "./demoRecognitionProvider";
import { GeminiFoodRecognitionProvider } from "./geminiRecognitionProvider";
import { GroqFoodRecognitionProvider } from "./groqRecognitionProvider";
import { env } from "@/lib/env";

let _recognitionProvider: FoodRecognitionProvider | null = null;

export function getFoodRecognitionProvider(): FoodRecognitionProvider {
  if (_recognitionProvider) return _recognitionProvider;

  const providerKey = env.FOOD_AI_PROVIDER ?? "demo";

  if ((providerKey === "groq" || env.GROQ_API_KEY) && (env.GROQ_API_KEY || env.FOOD_AI_API_KEY)) {
    _recognitionProvider = new GroqFoodRecognitionProvider();
    console.info("[FoodAI] Using Groq ultra-fast vision provider (qwen/qwen3.8-27b).");
  } else if (providerKey === "gemini" && env.FOOD_AI_API_KEY) {
    _recognitionProvider = new GeminiFoodRecognitionProvider();
    console.info("[FoodAI] Using Gemini vision provider for food recognition.");
  } else {
    _recognitionProvider = new DemoFoodRecognitionProvider();
    console.info("[FoodAI] Using DEMO food recognition provider. Set GROQ_API_KEY for real analysis.");
  }

  return _recognitionProvider;
}

export function isFoodAIDemo(): boolean {
  const provider = getFoodRecognitionProvider();
  return provider.isDemo;
}
