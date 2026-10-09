/**
 * Pulse Food AI — Groq Vision Food Recognition Provider
 *
 * Uses Groq's high-speed vision model (qwen/qwen3.8-27b) for meal image recognition.
 * Requires GROQ_API_KEY (server-side only, never exposed to client).
 * Sub-second inference latency on Groq LPU inference engine.
 */

import {
  FoodRecognitionContext,
  FoodRecognitionProvider,
  FoodRecognitionResult,
  CandidateFoodItem,
} from "./types";
import { env } from "@/lib/env";

interface GroqChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message: string;
    type: string;
  };
}

export class GroqFoodRecognitionProvider implements FoodRecognitionProvider {
  readonly providerKey = "groq";
  readonly isDemo = false;

  private get apiKey(): string {
    return env.GROQ_API_KEY ?? env.FOOD_AI_API_KEY ?? "";
  }

  private get model(): string {
    return env.FOOD_AI_MODEL || "qwen/qwen3.8-27b";
  }

  async analyzeMeal(
    imageBuffer: Buffer,
    mimeType: string,
    context: FoodRecognitionContext
  ): Promise<FoodRecognitionResult> {
    const base64Data = imageBuffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    const promptText = `You are a clinical nutrition & computer-vision food analyst for Project Pulse, a diabetes care platform.
Analyze this meal image and identify every distinct food item visible on the plate or bowl.
Return a valid JSON object strictly matching this schema:
{
  "items": [
    {
      "candidateFoodName": "English canonical food name (e.g., Roti, Dal, Cooked White Rice)",
      "candidateFoodNameHi": "Hindi name in Devanagari if known (e.g., रोटी, दाल, चावल)",
      "alternativeName": "common synonym or alias (e.g., chapati, lentil soup)",
      "estimatedPortion": 1.0,
      "estimatedPortionUnit": "katori|roti|cup|piece|grams|tablespoon|idli|dosa",
      "estimatedMassGrams": 150,
      "confidenceScore": 0.85,
      "uncertaintyNotes": "brief note on preparation uncertainty",
      "ambiguityNote": "any ambiguity if dish type is unclear",
      "suggestionOptions": ["Option 1", "Option 2"]
    }
  ],
  "overallConfidence": 0.82,
  "analysisNotes": "Brief summary of identified items. Powered by Groq Vision."
}

Rules:
- Separate distinct dishes (e.g. roti, dal, sabzi, curd) rather than grouping into one dish.
- Prioritize realistic Indian portion units (katori, roti, piece, cup).
- If the image contains no food, return {"items": [], "analysisNotes": "No food detected in image."}
${context.mealType ? `Meal Type Context: ${context.mealType}` : ""}
${context.cuisineType ? `Cuisine Context: ${context.cuisineType}` : ""}
${context.portionContext ? `Patient Context: ${context.portionContext}` : ""}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: promptText },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
        max_tokens: 2048,
      }),
      signal: AbortSignal.timeout(30_000), // 30s timeout (Groq usually finishes in < 2s)
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => "");
      throw new Error(`Groq API error ${response.status}: ${errBody.slice(0, 300)}`);
    }

    const data = (await response.json()) as GroqChatCompletionResponse;

    if (data.error) {
      throw new Error(`Groq API error: ${data.error.message}`);
    }

    const rawContent = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: {
      items?: Partial<CandidateFoodItem>[];
      overallConfidence?: number;
      analysisNotes?: string;
    };

    try {
      parsed = JSON.parse(rawContent);
    } catch {
      throw new Error(`Failed to parse JSON response from Groq: ${rawContent.slice(0, 200)}`);
    }

    const items: CandidateFoodItem[] = (parsed.items ?? []).map((item) => ({
      candidateFoodName: item.candidateFoodName ?? "Unknown food item",
      candidateFoodNameHi: item.candidateFoodNameHi,
      alternativeName: item.alternativeName,
      estimatedPortion: item.estimatedPortion ?? 1,
      estimatedPortionUnit: item.estimatedPortionUnit ?? "grams",
      estimatedMassGrams: item.estimatedMassGrams ?? 100,
      confidenceScore: item.confidenceScore ?? 0.8,
      uncertaintyNotes: item.uncertaintyNotes,
      ambiguityNote: item.ambiguityNote,
      suggestionOptions: item.suggestionOptions,
      originalPrediction: JSON.stringify(item),
    }));

    return {
      isDemo: false,
      provider: "groq",
      modelVersion: this.model,
      items,
      overallConfidence: parsed.overallConfidence ?? 0.85,
      analysisNotes: parsed.analysisNotes ?? "Analyzed via Groq Ultra-Fast Vision.",
    };
  }
}
