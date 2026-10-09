/**
 * Project Pulse — Community Moderation & Safety Screening Engine
 * 
 * Clinical Principles:
 * 1. Peer support is NEVER clinical or medical advice.
 * 2. Members may share personal lifestyle journeys, but cannot prescribe, adjust dosages,
 *    or instruct peers to abandon medical treatment.
 * 3. Misinformation (e.g. "guaranteed permanent cure in 10 days") is intercepted immediately.
 * 4. Bilingual rules (Hindi & English) run deterministically with zero latency.
 * 5. Optional LLM-assisted verification with instant safe rules fallback.
 */

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { ModerationScreeningResult, ModerationStatus, ModeratorActionType } from "./types";

// Prohibited prescription / dosing modification patterns (English & Hindi)
const DANGEROUS_DOSING_REGEX = [
  /\b(?:increase|decrease|double|halve|stop|adjust)\s+(?:taking\s+)?(?:your\s+)?(?:dose|dosage|units|insulin|metformin|glimepiride|medicine|medication|pills?|tablets?)\b/i,
  /\b(?:take|inject)\s+\d+\s*(?:units?|iu|mg|ml)\s+of\s+insulin\b/i,
  /\b(?:stop|quit|abandon|drop|skip)\s+(?:taking\s+)?(?:your\s+)?(?:prescription|medicines?|doctor'?s advice|meds|metformin|insulin|drugs?|tablets?|pills?)\b/i,
  /\b(?:don'?t|do not)\s+(?:take|listen to)\s+(?:your\s+)?(?:doctor|medicines?|metformin|insulin)\b/i,
  /\b(?:skip|stop)\s+(?:taking\s+)?(?:your\s+)?(?:insulin|metformin)\b/i,
  // Hindi transliteration & Devanagari
  /(?:दवा|दवाइयां|इंसुलिन|गोली)\s*(?:बंद\s*कर|छोड़\s*दो|मत\s*लो|लेना\s*बंद)/i,
  /(?:इंसुलिन|डोज़|dose)\s*(?:बढ़ा\s*लो|घटा\s*लो|डबल\s*कर|इतनी\s*यूनिट)/i,
  /(?:डॉक्टर\s*की\s*मत\s*सुनो|डॉक्टर\s*गलत\s*है)/i,
  /(?:dawa|insulin|goli)\s*(?:band\s*karo|chhod\s*do|mat\s*lo)/i,
];

// Unverified / Guaranteed cure claims
const CURE_MISINFORMATION_REGEX = [
  /\b(?:guaranteed|permanent|100%|complete|miracle)\s+(?:cure|eradication)\s+(?:for|of)\s+diabetes\b/i,
  /\b(?:cure|reverse)\s+diabetes\s+(?:in|within)\s+\d+\s*(?:days?|weeks?|hours?)\b/i,
  /\b(?:secret|magic)\s+(?:remedy|cure|powder|herb)\s+(?:that doctors hide|cures diabetes)\b/i,
  // Hindi transliteration & Devanagari
  /(?:डायबिटीज|शुगर)\s*(?:जड़\s*से\s*खत्म|का\s*शर्तिया\s*इलाज|गारंटीड\s*इलाज|100%\s*इलाज)/i,
  /(?:jad\s*se\s*khatam|guaranteed\s*ilaj|shartiya\s*ilaj)/i,
];

// Dangerous extreme dietary / fasting instructions
const DANGEROUS_EXTREME_DIET_REGEX = [
  /\b(?:dry\s*fast|stop\s*drinking\s*water|water\s*fast\s*for\s*(?:[7-9]|\d{2,})\s*days)\b/i,
  /\b(?:starve|don'?t\s*eat\s*anything\s*for\s*(?:days|weeks))\b/i,
  /(?:खाना\s*पीना\s*बिल्कुल\s*बंद|पानी\s*मत\s*पियो|भूखे\s*रहो)/i,
];

// Abuse, harassment, spam & personal data solicitation
const HARASSMENT_SPAM_REGEX = [
  /\b(?:call\s*me\s*at|whatsapp\s*me|send\s*money|telegram|crypto|bitcoins?)\b/i,
  /\b(?:idiot|stupid|fraud|loser|harami|chutiya|kutta)\b/i,
  /(?:पैसे\s*भेजो|व्हाट्सएप\s*करो|कॉल\s*करो)/i,
];

// Questions requiring clinical judgment (triggers friendly care team prompt)
const MEDICAL_INQUIRY_REGEX = [
  /\b(?:what\s+should\s+my\s+(?:insulin|dose|medication)\s+be|should\s+i\s+(?:change|stop)\s+my\s+medicine)\b/i,
  /(?:मेरी\s*दवा\s*कितनी\s*होनी\s*चाहिए|क्या\s*मैं\s*दवा\s*बदल\s*दूँ|कितना\s*इंसुलिन\s*लूँ)/i,
];

/**
 * Deterministic clinical rules-based screening (zero latency, fully offline-ready).
 */
export function screenTextWithRules(content: string): ModerationScreeningResult {
  const normalized = content.trim();

  // 1. Length & boundary checks
  if (normalized.length === 0) {
    return {
      status: "HELD_FOR_REVIEW",
      flagReason: "Empty submission",
      isDangerousMedicalAdvice: false,
      safetyWarning: null,
      suggestCareTeam: false,
      providerUsed: "rules_fallback",
    };
  }

  // 2. Dangerous dosing / prescription adjustments
  for (const rx of DANGEROUS_DOSING_REGEX) {
    if (rx.test(normalized)) {
      return {
        status: "HELD_FOR_REVIEW",
        flagReason: "Contains prescriptive medication or insulin dosing instructions for peers.",
        isDangerousMedicalAdvice: true,
        safetyWarning: "Only qualified healthcare providers can adjust medications or insulin. Content held for moderator review.",
        suggestCareTeam: true,
        providerUsed: "rules_fallback",
      };
    }
  }

  // 3. Guaranteed cure claims / false promises
  for (const rx of CURE_MISINFORMATION_REGEX) {
    if (rx.test(normalized)) {
      return {
        status: "HELD_FOR_REVIEW",
        flagReason: "Contains unverified claims of permanent diabetes cures or miracle treatments.",
        isDangerousMedicalAdvice: true,
        safetyWarning: "Evidence-based diabetes management focuses on sustainable lifestyle habits rather than unverified cure claims.",
        suggestCareTeam: false,
        providerUsed: "rules_fallback",
      };
    }
  }

  // 4. Dangerous extreme fasting / starvation
  for (const rx of DANGEROUS_EXTREME_DIET_REGEX) {
    if (rx.test(normalized)) {
      return {
        status: "HELD_FOR_REVIEW",
        flagReason: "Contains potentially harmful extreme fasting or severe restriction instructions.",
        isDangerousMedicalAdvice: true,
        safetyWarning: "Extreme fasting can trigger severe hypoglycemia or dehydration. Held for review.",
        suggestCareTeam: true,
        providerUsed: "rules_fallback",
      };
    }
  }

  // 5. Harassment, abuse or spam
  for (const rx of HARASSMENT_SPAM_REGEX) {
    if (rx.test(normalized)) {
      return {
        status: "HELD_FOR_REVIEW",
        flagReason: "Contains potential harassment, abusive language, or commercial solicitation.",
        isDangerousMedicalAdvice: false,
        safetyWarning: "Our community maintains a respectful, safe, and commercial-free environment.",
        suggestCareTeam: false,
        providerUsed: "rules_fallback",
      };
    }
  }

  // 6. Medical inquiry detection (does NOT block the post, but flags care team suggestion)
  let suggestCareTeam = false;
  for (const rx of MEDICAL_INQUIRY_REGEX) {
    if (rx.test(normalized)) {
      suggestCareTeam = true;
      break;
    }
  }

  return {
    status: "APPROVED",
    flagReason: null,
    isDangerousMedicalAdvice: false,
    safetyWarning: null,
    suggestCareTeam,
    providerUsed: "rules_fallback",
  };
}

/**
 * Screen post or comment content.
 * Executes automated safety pipeline: Input Validation -> Rules Engine -> Optional LLM -> Status.
 */
export async function screenCommunityContent(content: string): Promise<ModerationScreeningResult> {
  // First run local clinical rules (fast, deterministic, zero-cost)
  const rulesResult = screenTextWithRules(content);

  // If rules flagged as held, immediately uphold safety without wasting API quota
  if (rulesResult.status !== "APPROVED") {
    return rulesResult;
  }

  // Check if AI moderation is configured and requested
  const apiKey = env.COMMUNITY_MODERATION_API_KEY || env.GROQ_API_KEY;
  const isAiConfigured = (env.COMMUNITY_MODERATION_PROVIDER === "groq" || env.COMMUNITY_MODERATION_PROVIDER === "gemini") && Boolean(apiKey);

  if (!isAiConfigured) {
    return rulesResult;
  }

  // Optional AI Screening via Groq / OpenAI compatible endpoint
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500); // 2.5s strict timeout

    const response = await fetch(`${env.COMMUNITY_MODERATION_API_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: env.COMMUNITY_MODERATION_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a healthcare community safety screener for a diabetes peer group.
Evaluate user content for:
1. Direct medication or insulin dosing instructions to peers.
2. Direct advice to stop prescribed medications.
3. Guaranteed permanent cure claims for diabetes.
4. Abusive harassment or spam.

Respond with strict JSON ONLY:
{
  "isSafe": boolean,
  "reason": string or null
}`,
          },
          {
            role: "user",
            content: `Evaluate this community text:\n"""${content.slice(0, 500)}"""`,
          },
        ],
        temperature: 0.1,
        max_tokens: 100,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      const parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
      if (parsed.isSafe === false) {
        return {
          status: "HELD_FOR_REVIEW",
          flagReason: parsed.reason || "Automated safety screening flagged medical or safety concern.",
          isDangerousMedicalAdvice: true,
          safetyWarning: "Held for moderator review.",
          suggestCareTeam: true,
          providerUsed: "groq_ai",
        };
      }
    }
  } catch {
    // Graceful silent fallback to rules result on any AI network or timeout error
    return rulesResult;
  }

  return rulesResult;
}

/**
 * Log community actions in the persistent audit trail.
 */
export async function logCommunityAudit(
  userId: string | null,
  action: string,
  details: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  try {
    await prisma.communityAuditLog.create({
      data: {
        userId: userId || null,
        action,
        details: JSON.stringify(details),
        ipAddress: ipAddress || null,
      },
    });
  } catch (error) {
    console.warn("⚠️ Failed to write community audit log:", error);
  }
}
