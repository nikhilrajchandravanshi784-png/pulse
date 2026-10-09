/**
 * Project Pulse — Meal Suggestion Service
 *
 * Implements the core Meal Coach pipeline:
 * ConfirmedMeal
 *   → PatientPreferenceService
 *   → ApprovedGuidanceRetriever
 *   → MealSuggestionService
 *   → SafetyAndConstraintValidator
 *   → StructuredSuggestions
 *
 * Strict Medical Safety:
 * - Never claims a photograph can predict blood glucose, post-meal spikes, or insulin dosing.
 * - Enforces allergy & intolerance exclusions as hard constraints.
 * - Protects cultural staple foods (never demands eliminating roti or rice).
 * - Cites only verified guidance (ICMR-NIN, RSSDI, ADA).
 * - Maximum of 3 actionable, empathetic suggestions.
 */

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import {
  MealCoachContext,
  MealCoachResponse,
  SingleSuggestion,
  AISuggestionsOutputSchema,
} from "./types";
import { getPatientPreferences, checkFoodAllergySafety } from "./preferenceService";
import { getApprovedNutritionGuidance, findRelevantGuidance } from "./guidanceLibrary";

// ─── Main Orchestrator ────────────────────────────────────────────────────────

export async function generateMealSuggestions(
  context: MealCoachContext
): Promise<MealCoachResponse> {
  // Step 1: Retrieve voluntary patient preferences & cultural context
  const preferences = await getPatientPreferences(context.userId);

  // Step 2: Retrieve certified approved guidance
  const guidanceRecords = await getApprovedNutritionGuidance();

  if (guidanceRecords.length === 0) {
    return {
      suggestions: [],
      disclaimer: "These suggestions are for educational awareness only. They do not substitute for individual medical advice.",
      disclaimerHi: "ये विचार केवल शैक्षिक जानकारी के लिए हैं और डॉक्टर की सलाह का विकल्प नहीं हैं।",
      patientPreferencesApplied: {
        dietaryPattern: preferences.dietaryPattern,
        allergiesExcluded: preferences.allergies,
        intolerancesExcluded: preferences.intolerances,
      },
      hasEnoughGuidance: false,
      fallbackMessage: "Your current dietary guidance does not provide enough information for a personalized suggestion. Consider asking your care team.",
    };
  }

  // Step 3: Attempt AI-driven structured generation if Groq/AI is configured
  let candidates: SingleSuggestion[] = [];
  let isAiGenerated = false;
  let modelUsed = "rule_based_fallback";

  const groqApiKey = env.GROQ_API_KEY || env.AI_API_KEY;

  if (groqApiKey && env.FOOD_AI_PROVIDER !== "demo") {
    try {
      const aiResult = await generateWithGroq(context, preferences, guidanceRecords, groqApiKey);
      if (aiResult && aiResult.length > 0) {
        candidates = aiResult;
        isAiGenerated = true;
        modelUsed = "groq/openai/gpt-oss-120b";
      }
    } catch (aiErr) {
      console.warn("[mealCoach] AI generation failed, falling back to verified rule-based engine:", aiErr);
    }
  }

  // Fallback to rule-based engine if AI was skipped or failed
  if (candidates.length === 0) {
    candidates = await generateRuleBasedSuggestions(context, preferences);
    isAiGenerated = false;
    modelUsed = "rule_based_clinical_fallback";
  }

  // Step 4: Safety & Constraint Validator
  // Enforces allergy constraints, eliminates fabricated medical claims, and ensures cultural respect
  let validatedSuggestions = sanitizeAndFilterSuggestions(candidates, preferences);

  // If AI candidates were filtered out by safety constraints, safely fallback to clinical rules
  if (validatedSuggestions.length === 0) {
    const fallbackCandidates = await generateRuleBasedSuggestions(context, preferences);
    validatedSuggestions = sanitizeAndFilterSuggestions(fallbackCandidates, preferences);
    isAiGenerated = false;
    modelUsed = "rule_based_clinical_fallback";
  }

  // Step 5: Save suggestions to database for persistence and auditability
  const savedSuggestions: SingleSuggestion[] = [];

  let canPersistInDb = false;
  if (context.userId && context.userId !== "guest_patient" && !context.userId.startsWith("test_")) {
    try {
      const userExists = await prisma.user.findUnique({
        where: { id: context.userId },
        select: { id: true },
      });
      canPersistInDb = Boolean(userExists);
    } catch {
      canPersistInDb = false;
    }
  }

  for (const s of validatedSuggestions) {
    if (canPersistInDb) {
      try {
        const created = await prisma.mealSuggestion.create({
          data: {
            userId: context.userId,
            foodLogId: context.foodLogId ?? null,
            suggestionType: s.suggestionType,
            title: s.title,
            titleHi: s.titleHi,
            suggestionText: s.suggestionText,
            suggestionTextHi: s.suggestionTextHi,
            explanation: s.explanation,
            explanationHi: s.explanationHi,
            alternatives: JSON.stringify(s.alternatives),
            evidenceReference: s.evidenceReference,
            guidanceId: s.guidanceId ?? null,
            uncertaintyNotes: s.uncertaintyNotes,
            status: "ACTIVE",
            isAiGenerated,
            providerModel: modelUsed,
          },
        });

        savedSuggestions.push({
          ...s,
          id: created.id,
          status: "ACTIVE",
          isAiGenerated,
          providerModel: modelUsed,
        });
        continue;
      } catch (dbErr) {
        console.warn("[mealCoach] DB save fallback:", dbErr);
      }
    }

    // Transient / Guest / Unpersisted suggestion
    savedSuggestions.push({
      ...s,
      id: s.id || `transient-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      status: "ACTIVE",
      isAiGenerated,
      providerModel: modelUsed,
    });
  }

  return {
    suggestions: savedSuggestions.slice(0, 3), // Strictly limit to max 3 suggestions
    disclaimer:
      "These suggestions offer simple educational ideas based on standard nutrition principles. A photograph alone cannot determine exact ingredients, cooking oils, or individual glucose response. Always follow your doctor's care plan.",
    disclaimerHi:
      "ये सुझाव केवल सामान्य पोषण सिद्धांतों पर आधारित आसान शैक्षिक विचार हैं। केवल फोटो देखकर तेल, मसालों या आपके व्यक्तिगत शुगर प्रभाव का सटीक अनुमान नहीं लगाया जा सकता। हमेशा अपने डॉक्टर की सलाह का पालन करें।",
    patientPreferencesApplied: {
      dietaryPattern: preferences.dietaryPattern,
      allergiesExcluded: preferences.allergies,
      intolerancesExcluded: preferences.intolerances,
    },
    hasEnoughGuidance: true,
    isFallbackMode: !isAiGenerated,
    modeLabel: isAiGenerated ? "Personalized AI Suggestions" : "General food education",
  };
}

// ─── Groq AI Generation ───────────────────────────────────────────────────────

async function generateWithGroq(
  context: MealCoachContext,
  preferences: ReturnType<typeof getPatientPreferences> extends Promise<infer T> ? T : never,
  guidanceRecords: ReturnType<typeof getApprovedNutritionGuidance> extends Promise<infer G> ? G : never,
  apiKey: string
): Promise<SingleSuggestion[] | null> {
  const mealSummary = context.items
    .map((i) => `${i.foodName} (${i.quantity} ${i.quantityUnit})`)
    .join(", ");

  const approvedGuidanceText = guidanceRecords
    .map((g) => `- [${g.topic}] ${g.title}: ${g.content} (Source: ${g.sourceOrg})`)
    .join("\n");

  const systemPrompt = `You are the Project Pulse Meal Coach, an empathetic diabetes nutrition educator for Indian patients.
Generate exactly 3 practical, supportive educational suggestions for this confirmed meal:
1. ADDITION: An optional food or side to improve fiber, micronutrients, or vegetable variety.
2. SUBSTITUTION: A practical alternative that preserves cultural preference and meal satisfaction (DO NOT remove roti or rice entirely).
3. PREPARATION: A convenient culinary idea (cooking technique, vegetable incorporation, oil moderation).

STRICT SAFETY & COMPLIANCE RULES:
- NEVER claim that this change will lower glucose, drop HbA1c, or prevent diabetic complications.
- NEVER invent precise numerical nutrient comparisons unless verified.
- EXCLUDE strictly all foods conflicting with patient allergies: ${JSON.stringify(preferences.allergies)} or intolerances: ${JSON.stringify(preferences.intolerances)}.
- Respect dietary pattern: ${preferences.dietaryPattern}.
- Provide natural, respectful Hindi and English text for each suggestion.
- Ground explanations in the provided approved guidance list below.

Approved Guidance Available:
${approvedGuidanceText}

Return ONLY valid JSON matching:
{
  "suggestions": [
    {
      "suggestionType": "ADDITION" | "SUBSTITUTION" | "PREPARATION",
      "title": "English title (short, positive)",
      "titleHi": "Hindi title in Devanagari",
      "suggestionText": "Actionable suggestion in English",
      "suggestionTextHi": "Actionable suggestion in Hindi",
      "explanation": "Plain-language rationale without medical claims",
      "explanationHi": "Hindi explanation",
      "alternatives": ["Alternative 1", "Alternative 2"],
      "evidenceReference": "Exact organization cited from approved guidance",
      "uncertaintyNotes": "Notice regarding portion size or preparation variability"
    }
  ]
}`;

  const userPrompt = `Patient Confirmed Meal (${context.mealType}): ${mealSummary || "Standard meal"}
Cuisine Context: ${preferences.regionalCuisine}
Cooking time available: ${preferences.cookingTimeMinutes} minutes
Budget priority: ${preferences.budgetPriority}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 1500,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Groq returned ${response.status}`);
  }

  const json = await response.json();
  const rawText = json.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(rawText);

  // Validate with Zod schema
  const validation = AISuggestionsOutputSchema.safeParse(parsed);
  if (!validation.success) {
    console.warn("[mealCoach] AI response schema validation failed:", validation.error.format());
    return null;
  }

  return validation.data.suggestions.map((s) => ({
    ...s,
    isAiGenerated: true,
  }));
}

// ─── Rule-Based Clinical Fallback ─────────────────────────────────────────────

async function generateRuleBasedSuggestions(
  context: MealCoachContext,
  preferences: ReturnType<typeof getPatientPreferences> extends Promise<infer T> ? T : never
): Promise<SingleSuggestion[]> {
  const suggestions: SingleSuggestion[] = [];
  const foodNames = context.items.map((i) => i.foodName.toLowerCase());
  const hasVegSalad = foodNames.some((f) => f.includes("salad") || f.includes("cucumber") || f.includes("kheera") || f.includes("kakdi"));
  const hasDalOrProtein = foodNames.some((f) => f.includes("dal") || f.includes("paneer") || f.includes("egg") || f.includes("chana") || f.includes("rajma"));

  // 1. ADDITION: Vegetable / Salad side
  if (!hasVegSalad) {
    const vegGuidance = await findRelevantGuidance("vegetable", "VEGETABLES_FIBER");
    suggestions.push({
      suggestionType: "ADDITION",
      title: "Consider adding a fresh salad or vegetable side",
      titleHi: "थाली में एक छोटी कटोरी खीरा या ताज़ी सलाद जोड़ें",
      suggestionText: "A small katori of sliced cucumber, radish, or lightly spiced kachumber salad with your meal.",
      suggestionTextHi: "भोजन के साथ एक छोटी कटोरी ककड़ी, खीरा या टमाटर की ताज़ी सलाद शामिल करने पर विचार करें।",
      explanation: "Non-starchy raw vegetables provide dietary fiber and volume, helping meals feel more satisfying.",
      explanationHi: "सलाद में मौजूद प्राकृतिक फाइबर पाचन को संतुलित रखने और पेट को लंबे समय तक भरा रखने में मदद करता है।",
      alternatives: ["Kachumber salad with lemon juice", "Steamed beans or carrots", "Stir-fried capsicum with jeera"],
      evidenceReference: vegGuidance?.sourceOrg ?? "ICMR-NIN Dietary Guidelines for Indians 2024",
      guidanceId: vegGuidance?.id,
      uncertaintyNotes: "Portion sizes and seasoning depend on individual preference and salt restrictions.",
      isAiGenerated: false,
    });
  } else {
    // If salad is already present, offer a protein balance addition
    const proteinGuidance = await findRelevantGuidance("protein", "PROTEIN_VARIETY");
    suggestions.push({
      suggestionType: "ADDITION",
      title: "Consider a protein-rich accompaniment",
      titleHi: "दाल या दही का संतुलित भाग शामिल करें",
      suggestionText: "A small katori of homemade curd or sprouted moong chaat alongside your grain.",
      suggestionTextHi: "अपनी थाली में एक छोटी कटोरी ताज़ा दही या अंकुरित मूंग की हल्की चाट जोड़ने पर विचार करें।",
      explanation: "Pairing proteins with grains provides balanced essential amino acids and sustains energy.",
      explanationHi: "अनाज के साथ प्रोटीन युक्त आहार जोड़ने से ऊर्जा लंबे समय तक बनी रहती है।",
      alternatives: ["Plain set curd (dahi)", "Sprouted moong with lemon", "Roasted chana snack"],
      evidenceReference: proteinGuidance?.sourceOrg ?? "ICMR-NIN Dietary Guidelines for Indians 2024",
      guidanceId: proteinGuidance?.id,
      uncertaintyNotes: "Diary preparation and portion quantities significantly influence total caloric content.",
      isAiGenerated: false,
    });
  }

  // 2. SUBSTITUTION: Cultural preservation substitution (Never remove roti/rice)
  const portionGuidance = await findRelevantGuidance("carbohydrate", "PORTION_MINDFULNESS");
  suggestions.push({
    suggestionType: "SUBSTITUTION",
    title: "Balance the plate proportions mindfully",
    titleHi: "रोटी-चावल बंद किए बिना थाली का अनुपात संतुलित करें",
    suggestionText: "Keep your familiar roti or rice, while ensuring the vegetable or dal portion equals the grain portion on the plate.",
    suggestionTextHi: "रोटी या चावल छोड़ने की आवश्यकता नहीं है; बस थाली में दाल और सब्जी की मात्रा को अनाज के बराबर रखने का प्रयास करें।",
    explanation: "Clinical guidance encourages balancing grain quantity with equal vegetable volume rather than eliminating traditional staples.",
    explanationHi: "दिशानिर्देश अनाज को बंद करने के बजाय थाली में सब्जी और दाल का अनुपात बराबर रखने की सलाह देते हैं।",
    alternatives: ["Equal parts rice and thick dal", "Two small rotis paired with double katori sabzi"],
    evidenceReference: portionGuidance?.sourceOrg ?? "ADA & RSSDI Consensus on Carbohydrate Quality 2024",
    guidanceId: portionGuidance?.id,
    uncertaintyNotes: "Actual carbohydrate content varies by flour milling and rice preparation method.",
    isAiGenerated: false,
  });

  // 3. PREPARATION: Practical culinary idea
  const prepGuidance = await findRelevantGuidance("cooking", "PREPARATION_METHODS");
  suggestions.push({
    suggestionType: "PREPARATION",
    title: "Gentle tadka and vegetable mixing in familiar dishes",
    titleHi: "दाल या आटे में कद्दूकस की हुई सब्जियां मिलाना",
    suggestionText: "Try grating carrots or finely chopping spinach directly into your dal or paratha dough to incorporate vegetables without extra cooking time.",
    suggestionTextHi: "अलग से सब्जी बनाने का समय न हो तो दाल में पालक या आटे में कद्दूकस की लौकी मिलाकर आसानी से पोषण बढ़ाया जा सकता है।",
    explanation: "Blending vegetables into staple preparations saves culinary prep time while gently increasing meal fiber.",
    explanationHi: "रोज़मर्रा के भोजन में ही सब्जियां मिलाने से समय बचता है और खाने का स्वाद भी बना रहता है।",
    alternatives: ["Add methi leaves to dal", "Light tadka with 1 tsp mustard oil or jeera"],
    evidenceReference: prepGuidance?.sourceOrg ?? "ICMR-NIN Guidelines on Healthy Cooking Practices 2024",
    guidanceId: prepGuidance?.id,
    uncertaintyNotes: "Oil type and thermal cooking duration vary across home kitchens.",
    isAiGenerated: false,
  });

  // 4. SUBSTITUTION / ADDITION: Whole pulses and legumes
  const pulseGuidance = await findRelevantGuidance("protein", "PROTEIN_VARIETY");
  suggestions.push({
    suggestionType: "SUBSTITUTION",
    title: "Explore whole or sprouted pulses (sabut dal / sprouts)",
    titleHi: "साबुत दालें या अंकुरित अनाज आज़माएं",
    suggestionText: "Consider rotating whole pulses (like sabut moong, kala chana, or rajma) in place of polished split lentils.",
    suggestionTextHi: "धुली दालों की जगह कभी-कभी साबुत मूंग, काला चना या अंकुरित दालों को शामिल करने पर विचार करें।",
    explanation: "Whole pulses retain their fiber-rich outer layer, helping provide longer satiety.",
    explanationHi: "साबुत दालों के छिलके में भरपूर प्राकृतिक फाइबर होता है जो तृप्ति बनाए रखने में सहायक है।",
    alternatives: ["Sprouted moong salad with lemon", "Boiled kala chana chaat", "Whole masoor dal"],
    evidenceReference: pulseGuidance?.sourceOrg ?? "ICMR-NIN Dietary Guidelines for Indians 2024",
    guidanceId: pulseGuidance?.id,
    uncertaintyNotes: "Soaking and pressure-cooking times influence digestibility.",
    isAiGenerated: false,
  });

  // 5. PREPARATION: Meal sequencing
  const seqGuidance = await findRelevantGuidance("carbohydrate", "VEGETABLES_FIBER");
  suggestions.push({
    suggestionType: "PREPARATION",
    title: "Start your meal with salad or dal before carbs",
    titleHi: "रोटी-चावल से पहले सलाद या दाल से भोजन शुरू करें",
    suggestionText: "Try taking a few spoonfuls of salad or dal before your roti or rice.",
    suggestionTextHi: "रोटी या चावल खाने से पहले कुछ चम्मच सलाद या दाल खाकर भोजन शुरू करने पर विचार करें।",
    explanation: "Clinical guidance suggests eating dietary fiber and protein earlier in the meal slows gastric transit.",
    explanationHi: "पहले सलाद और प्रोटीन खाने से पेट धीरे-धीरे खाली होता है और भोजन का अवशोषण संतुलित रहता है।",
    alternatives: ["Warm vegetable soup first", "Cucumber slices before the main meal"],
    evidenceReference: seqGuidance?.sourceOrg ?? "RSSDI Clinical Practice Recommendations 2024",
    guidanceId: seqGuidance?.id,
    uncertaintyNotes: "Meal pacing should remain comfortable and unhurried.",
    isAiGenerated: false,
  });

  return suggestions;
}

// ─── Safety & Constraint Filtering ───────────────────────────────────────────

function sanitizeAndFilterSuggestions(
  suggestions: SingleSuggestion[],
  preferences: ReturnType<typeof getPatientPreferences> extends Promise<infer T> ? T : never
): SingleSuggestion[] {
  const safe: SingleSuggestion[] = [];

  for (const s of suggestions) {
    // 1. Allergy & intolerance check across title, text, and alternatives
    const textToCheck = `${s.title} ${s.suggestionText} ${s.explanation} ${s.alternatives.join(" ")}`;
    const allergyCheck = checkFoodAllergySafety(textToCheck, preferences);

    if (!allergyCheck.isSafe) {
      console.info(`[mealCoach] Filtered suggestion due to constraint: ${allergyCheck.violationReason}`);
      continue;
    }

    // 2. Medical claim sanitization: eliminate claims of guaranteed glucose drop or cure
    let cleanedExplanation = s.explanation
      .replace(/will (lower|drop|cure|prevent|reduce) your (blood glucose|sugar|hba1c)/gi, "may help support balanced nutrition")
      .replace(/guarantees/gi, "supports");

    let cleanedExplanationHi = s.explanationHi
      .replace(/शुगर को जड़ से खत्म/g, "संतुलित पोषण में सहायक")
      .replace(/शुगर तुरंत कम कर देगा/g, "पोषण संतुलन में मददगार");

    // 3. Staple grain protection: if suggestion demands eliminating rice/roti, soften it
    let cleanedText = s.suggestionText
      .replace(/stop eating (rice|roti|bread)/gi, "enjoy your portion of $1 with generous vegetables")
      .replace(/eliminate (rice|roti)/gi, "balance your $1 portion");

    safe.push({
      ...s,
      explanation: cleanedExplanation,
      explanationHi: cleanedExplanationHi,
      suggestionText: cleanedText,
    });

    if (safe.length >= 3) break;
  }

  return safe;
}
