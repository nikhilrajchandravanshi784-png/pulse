/**
 * Pulse Food AI — Gemini Vision Food Recognition Provider
 *
 * Uses Google Gemini vision models to analyze meal photographs.
 * Requires FOOD_AI_API_KEY (server-side only, never exposed to browser).
 * Falls back to demo mode if credentials are absent.
 *
 * IMPORTANT: Never call this from browser-side code.
 */

import {
  FoodRecognitionContext,
  FoodRecognitionProvider,
  FoodRecognitionResult,
  CandidateFoodItem,
} from "./types";
import { env } from "@/lib/env";

interface GeminiCandidate {
  content: { parts: Array<{ text: string }> };
}
interface GeminiResponse {
  candidates?: GeminiCandidate[];
  error?: { message: string; code: number };
}

export class GeminiFoodRecognitionProvider implements FoodRecognitionProvider {
  readonly providerKey = "gemini";
  readonly isDemo = false;

  private get apiKey(): string {
    return env.FOOD_AI_API_KEY ?? "";
  }
  private get model(): string {
    return env.FOOD_AI_MODEL ?? "gemini-1.5-flash";
  }
  private get baseUrl(): string {
    return (
      env.FOOD_AI_API_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta"
    );
  }

  async analyzeMeal(
    imageBuffer: Buffer,
    mimeType: string,
    context: FoodRecognitionContext
  ): Promise<FoodRecognitionResult> {
    const imageBase64 = imageBuffer.toString("base64");

    const systemPrompt = `You are a food recognition assistant for a diabetes management application. 
Analyze the meal photograph and identify each distinct food item visible.
Return a JSON object with this exact structure:
{
  "items": [
    {
      "candidateFoodName": "English food name",
      "candidateFoodNameHi": "Hindi name if known",
      "alternativeName": "common alternative name",
      "estimatedPortion": 1.0,
      "estimatedPortionUnit": "katori|roti|cup|piece|grams|tablespoon|idli|dosa",
      "estimatedMassGrams": 150,
      "confidenceScore": 0.75,
      "uncertaintyNotes": "brief explanation of what is uncertain",
      "ambiguityNote": "if multiple foods could match, say so",
      "suggestionOptions": ["alternative1", "alternative2"]
    }
  ],
  "overallConfidence": 0.75,
  "analysisNotes": "brief overall note"
}

Rules:
- Identify each food item separately, do not merge all into one.
- Be honest about uncertainty — say when you cannot distinguish dal types, curry types etc.
- Do NOT invent precise gram weights — provide reasonable estimates based on standard Indian serving sizes.
- For composite dishes (biryani, curry), note that recipe and preparation affect nutrition.
- Return ONLY valid JSON, no markdown.
- If the image is unclear or does not show food, return items: [] with an appropriate analysisNotes.
${context.mealType ? `Meal type context: ${context.mealType}` : ""}
${context.cuisineType ? `Cuisine: ${context.cuisineType}` : ""}
${context.portionContext ? `Portion context provided by patient: ${context.portionContext}` : ""}`;

    const requestBody = {
      contents: [
        {
          parts: [
            { text: systemPrompt },
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
      },
    };

    const url = `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(60_000), // 60s timeout for vision models
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "unknown");
      throw new Error(`Gemini API error ${response.status}: ${errText.slice(0, 200)}`);
    }

    const geminiData = (await response.json()) as GeminiResponse;

    if (geminiData.error) {
      throw new Error(`Gemini API error: ${geminiData.error.message}`);
    }

    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Strip markdown code fences if present
    const jsonText = rawText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed: {
      items?: Partial<CandidateFoodItem>[];
      overallConfidence?: number;
      analysisNotes?: string;
    };

    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error(
        "Gemini returned unparseable JSON. Raw response (first 300 chars): " +
          rawText.slice(0, 300)
      );
    }

    const items: CandidateFoodItem[] = (parsed.items ?? []).map((item) => ({
      candidateFoodName: item.candidateFoodName ?? "Unknown food",
      candidateFoodNameHi: item.candidateFoodNameHi,
      alternativeName: item.alternativeName,
      estimatedPortion: item.estimatedPortion,
      estimatedPortionUnit: item.estimatedPortionUnit,
      estimatedMassGrams: item.estimatedMassGrams,
      confidenceScore: item.confidenceScore,
      uncertaintyNotes: item.uncertaintyNotes,
      ambiguityNote: item.ambiguityNote,
      suggestionOptions: item.suggestionOptions,
      originalPrediction: JSON.stringify(item),
    }));

    return {
      isDemo: false,
      provider: "gemini",
      modelVersion: this.model,
      items,
      overallConfidence: parsed.overallConfidence,
      analysisNotes: parsed.analysisNotes,
    };
  }
}
