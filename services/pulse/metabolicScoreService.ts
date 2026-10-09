/**
 * Project Pulse — Metabolic Score Calculation Engine
 * Calculates a clinically grounded Metabolic Health Score out of 100
 * based on user's HbA1c, Body Composition (BMI), Movement/Rest habits,
 * and Dietary/Metabolic intentions.
 */

import { prisma } from "@/lib/db";

export interface MetabolicScoreBreakdown {
  glycemicScore: number;     // max 40
  glycemicMax: 40;
  glycemicLabel: string;
  glycemicStatus: "optimal" | "good" | "moderate" | "risk";

  bmiScore: number;          // max 25
  bmiMax: 25;
  bmiValue: number;
  bmiCategory: string;
  bmiStatus: "optimal" | "good" | "moderate" | "risk";

  lifestyleScore: number;    // max 20
  lifestyleMax: 20;
  lifestyleStatus: "optimal" | "good" | "moderate" | "risk";

  intentionScore: number;    // max 15
  intentionMax: 15;
  intentionStatus: "optimal" | "good" | "moderate" | "risk";
}

export interface MetabolicScoreResult {
  totalScore: number; // 0 to 100
  tier: "Optimal" | "Good" | "Needs Attention" | "High Risk";
  tierColor: {
    bg: string;
    text: string;
    border: string;
    ring: string;
  };
  headline: string;
  summary: string;
  breakdown: MetabolicScoreBreakdown;
  projectedTargetScore: number;
  potentialGain: number;
  clinicalRecommendations: string[];
}

export interface MetabolicInputParams {
  hba1c?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  dateOfBirth?: Date | string | null;
  biologicalSex?: string | null;
  exerciseFrequency?: string | null;
  sleepSchedule?: string | null;
  dietaryPreference?: string | null;
  smokingStatus?: string | null;
  alcoholConsumption?: string | null;
  primaryGoals?: string[] | null;
}

/**
 * Pure calculation function for Metabolic Score out of 100.
 * Can be run on both server and client.
 */
export function calculateMetabolicScore(params: MetabolicInputParams): MetabolicScoreResult {
  const hba1c = typeof params.hba1c === "number" && !isNaN(params.hba1c) ? params.hba1c : 5.8;
  const heightCm = typeof params.heightCm === "number" && !isNaN(params.heightCm) ? params.heightCm : 170;
  const weightKg = typeof params.weightKg === "number" && !isNaN(params.weightKg) ? params.weightKg : 70;

  // 1. Glycemic Score (Max 40 points)
  let glycemicScore = 30;
  let glycemicLabel = "Normal Glycemic Range";
  let glycemicStatus: MetabolicScoreBreakdown["glycemicStatus"] = "good";

  if (hba1c < 5.4) {
    glycemicScore = 40;
    glycemicLabel = "Optimal Fasting & Postprandial Stability";
    glycemicStatus = "optimal";
  } else if (hba1c <= 5.6) {
    glycemicScore = 38;
    glycemicLabel = "Healthy Normal Glycemic Range";
    glycemicStatus = "optimal";
  } else if (hba1c <= 5.9) {
    glycemicScore = 34;
    glycemicLabel = "Early Prediabetes / Mild Glycemic Fluctuation";
    glycemicStatus = "good";
  } else if (hba1c <= 6.4) {
    glycemicScore = 28;
    glycemicLabel = "Prediabetes Range (Insulin Resistance)";
    glycemicStatus = "moderate";
  } else if (hba1c <= 6.9) {
    glycemicScore = 22;
    glycemicLabel = "Controlled Diabetes Range";
    glycemicStatus = "moderate";
  } else if (hba1c <= 7.9) {
    glycemicScore = 16;
    glycemicLabel = "Elevated Glycemic Burden";
    glycemicStatus = "risk";
  } else if (hba1c <= 8.9) {
    glycemicScore = 11;
    glycemicLabel = "High Glycemic Variability";
    glycemicStatus = "risk";
  } else {
    glycemicScore = 6;
    glycemicLabel = "Significantly Elevated Glycemic Marker";
    glycemicStatus = "risk";
  }

  // 2. BMI & Body Composition Score (Max 25 points)
  let bmiScore = 20;
  let bmiCategory = "Healthy Weight";
  let bmiStatus: MetabolicScoreBreakdown["bmiStatus"] = "good";
  const heightM = heightCm / 100;
  const bmi = heightM > 0 ? Math.round((weightKg / (heightM * heightM)) * 10) / 10 : 23.5;

  if (bmi >= 18.5 && bmi <= 24.9) {
    bmiScore = 25;
    bmiCategory = "Optimal BMI Range (18.5–24.9)";
    bmiStatus = "optimal";
  } else if (bmi >= 25.0 && bmi <= 26.9) {
    bmiScore = 21;
    bmiCategory = "Slightly Elevated BMI (25.0–26.9)";
    bmiStatus = "good";
  } else if (bmi >= 27.0 && bmi <= 29.9) {
    bmiScore = 17;
    bmiCategory = "Overweight Range (27.0–29.9)";
    bmiStatus = "moderate";
  } else if (bmi >= 30.0 && bmi <= 34.9) {
    bmiScore = 12;
    bmiCategory = "Class I Obesity (30.0–34.9)";
    bmiStatus = "risk";
  } else if (bmi >= 35.0) {
    bmiScore = 8;
    bmiCategory = "Class II+ Obesity (≥35.0)";
    bmiStatus = "risk";
  } else {
    bmiScore = 18;
    bmiCategory = "Underweight (<18.5)";
    bmiStatus = "moderate";
  }

  // 3. Movement & Rest Rhythm Score (Max 20 points)
  let exercisePoints = 6;
  const freq = (params.exerciseFrequency || "").toLowerCase();
  if (freq.includes("5+") || freq.includes("high")) exercisePoints = 11;
  else if (freq.includes("3-4") || freq.includes("moderate")) exercisePoints = 9;
  else if (freq.includes("2-3") || freq.includes("light")) exercisePoints = 6;
  else exercisePoints = 3;

  let sleepPoints = 4;
  const sleepStr = (params.sleepSchedule || "").toLowerCase();
  if (sleepStr.includes("8") || sleepStr.includes("7") || sleepStr.includes("approx")) {
    sleepPoints = 5;
  }

  let smokePoints = 4;
  const smoke = (params.smokingStatus || "").toLowerCase();
  if (smoke.includes("current")) smokePoints = 0;
  else if (smoke.includes("former")) smokePoints = 2;
  else smokePoints = 4;

  const lifestyleScore = Math.min(20, exercisePoints + sleepPoints + smokePoints);
  const lifestyleStatus: MetabolicScoreBreakdown["lifestyleStatus"] =
    lifestyleScore >= 17 ? "optimal" : lifestyleScore >= 13 ? "good" : lifestyleScore >= 9 ? "moderate" : "risk";

  // 4. Nutritional Pattern & Intention Score (Max 15 points)
  let dietPoints = 6;
  const diet = (params.dietaryPreference || "").toLowerCase();
  if (diet.includes("mediterranean") || diet.includes("whole") || diet.includes("low carb") || diet.includes("plant")) {
    dietPoints = 8;
  } else if (diet.includes("fasting")) {
    dietPoints = 7;
  } else if (diet.includes("omnivore")) {
    dietPoints = 6;
  } else {
    dietPoints = 5;
  }

  let goalPoints = 5;
  if (params.primaryGoals && params.primaryGoals.length > 0) {
    goalPoints = 7;
  }

  const intentionScore = Math.min(15, dietPoints + goalPoints);
  const intentionStatus: MetabolicScoreBreakdown["intentionStatus"] =
    intentionScore >= 13 ? "optimal" : intentionScore >= 10 ? "good" : "moderate";

  // Total Score out of 100
  const totalScore = Math.min(100, Math.max(10, Math.round(glycemicScore + bmiScore + lifestyleScore + intentionScore)));

  // Tiers and Recommendations
  let tier: MetabolicScoreResult["tier"] = "Good";
  let tierColor = {
    bg: "bg-[#D5F3E7]",
    text: "text-[#087F8C]",
    border: "border-[#087F8C]/30",
    ring: "#087F8C",
  };
  let headline = "Solid Metabolic Foundation";
  let summary = "Your metabolic profile indicates healthy adaptive capacity with clear targets to reach peak insulin sensitivity.";
  const clinicalRecommendations: string[] = [];

  if (totalScore >= 85) {
    tier = "Optimal";
    tierColor = {
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      border: "border-emerald-200",
      ring: "#059669",
    };
    headline = "Optimal Metabolic Resilience";
    summary = "Outstanding glycemic baseline, balanced body mass index, and consistent movement rhythm. Low cardiometabolic risk profile.";
    clinicalRecommendations.push("Maintain consistent postprandial movement windows (10–15 mins).");
    clinicalRecommendations.push("Continue circadian-aligned 12-hour nutrition window.");
    clinicalRecommendations.push("Maintain periodic continuous glucose or HbA1c surveillance every 6–12 months.");
  } else if (totalScore >= 70) {
    tier = "Good";
    tierColor = {
      bg: "bg-[#D5F3E7]",
      text: "text-[#087F8C]",
      border: "border-[#087F8C]/40",
      ring: "#087F8C",
    };
    headline = "Good / Well-Managed Baseline";
    summary = "Stable metabolic indicators with actionable opportunities to lower glycemic excursions and elevate daily energy.";
    clinicalRecommendations.push("Incorporate light brisk walking after dinner to flatten evening glucose curves.");
    clinicalRecommendations.push("Anchor meals with 25–30g dietary protein and adequate soluble fiber.");
    clinicalRecommendations.push("Maintain regular sleep schedule to protect daytime insulin sensitivity.");
  } else if (totalScore >= 50) {
    tier = "Needs Attention";
    tierColor = {
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-200",
      ring: "#D97706",
    };
    headline = "Moderate / Needs Optimization";
    summary = "Metabolic markers highlight insulin resistance vulnerability. Targeted lifestyle habits can reverse this trajectory quickly.";
    clinicalRecommendations.push("Focus on carbohydrate quality and pacing to avoid large post-meal glucose spikes.");
    clinicalRecommendations.push("Target 3–4 days per week of moderate resistance or brisk cardio exercise.");
    clinicalRecommendations.push("Aim for an HbA1c reduction of 0.3%–0.5% over the 90-day program.");
  } else {
    tier = "High Risk";
    tierColor = {
      bg: "bg-rose-50",
      text: "text-rose-800",
      border: "border-rose-200",
      ring: "#E11D48",
    };
    headline = "Elevated Cardiometabolic Risk";
    summary = "High glycemic baseline or elevated biometric strain detected. Structured clinical coaching and daily support are strongly advised.";
    clinicalRecommendations.push("Schedule a consultation with your assigned endocrinologist or metabolic coach.");
    clinicalRecommendations.push("Prioritize daily medication or supplement routine adherence.");
    clinicalRecommendations.push("Track continuous glucose trends to identify specific food triggers.");
  }

  // 90-Day Projected Gain
  const potentialGain = totalScore < 60 ? 22 : totalScore < 75 ? 16 : totalScore < 88 ? 10 : 5;
  const projectedTargetScore = Math.min(98, totalScore + potentialGain);

  return {
    totalScore,
    tier,
    tierColor,
    headline,
    summary,
    breakdown: {
      glycemicScore,
      glycemicMax: 40,
      glycemicLabel,
      glycemicStatus,

      bmiScore,
      bmiMax: 25,
      bmiValue: bmi,
      bmiCategory,
      bmiStatus,

      lifestyleScore,
      lifestyleMax: 20,
      lifestyleStatus,

      intentionScore,
      intentionMax: 15,
      intentionStatus,
    },
    projectedTargetScore,
    potentialGain,
    clinicalRecommendations,
  };
}

/**
 * Server-side helper to compute and persist metabolic score for a user
 */
export async function computeAndSaveUserMetabolicScore(userId: string, inputParams?: MetabolicInputParams) {
  // Fetch existing records if inputParams is incomplete
  let hba1c = inputParams?.hba1c;
  let heightCm = inputParams?.heightCm;
  let weightKg = inputParams?.weightKg;
  let exerciseFrequency = inputParams?.exerciseFrequency;
  let sleepSchedule = inputParams?.sleepSchedule;
  let dietaryPreference = inputParams?.dietaryPreference;
  let smokingStatus = inputParams?.smokingStatus;
  let primaryGoals = inputParams?.primaryGoals;

  if (hba1c === undefined || hba1c === null) {
    const baselineLab = await prisma.clinicalMeasurement.findFirst({
      where: { userId, measurementType: "HBA1C" },
      orderBy: { measuredAt: "desc" },
    });
    if (baselineLab) hba1c = baselineLab.value;
  }

  if (heightCm === undefined || weightKg === undefined) {
    const profile = await prisma.healthProfile.findUnique({
      where: { userId },
    });
    if (profile) {
      if (heightCm === undefined) heightCm = profile.heightCm;
      if (weightKg === undefined) weightKg = profile.weightKg;
    }
  }

  if (!dietaryPreference || !exerciseFrequency) {
    const lifestyle = await prisma.lifestyleProfile.findUnique({
      where: { userId },
    });
    if (lifestyle) {
      if (!dietaryPreference) dietaryPreference = lifestyle.dietaryPreference;
      if (!exerciseFrequency) exerciseFrequency = lifestyle.exerciseFrequency;
      if (!sleepSchedule) sleepSchedule = lifestyle.sleepSchedule;
      if (!smokingStatus) smokingStatus = lifestyle.smokingStatus;
    }
  }

  if (!primaryGoals) {
    const goals = await prisma.healthGoal.findMany({
      where: { userId, isPrimary: true },
    });
    primaryGoals = goals.map((g) => g.title);
  }

  const result = calculateMetabolicScore({
    hba1c,
    heightCm,
    weightKg,
    exerciseFrequency,
    sleepSchedule,
    dietaryPreference,
    smokingStatus,
    primaryGoals,
  });

  // Persist score as HealthMetric
  await prisma.healthMetric.create({
    data: {
      userId,
      source: "PULSE_ALGORITHM",
      metricType: "metabolic_score",
      value: result.totalScore,
      unit: "/100",
      timestamp: new Date(),
      metadata: JSON.stringify({
        tier: result.tier,
        breakdown: result.breakdown,
        projectedTarget: result.projectedTargetScore,
      }),
    },
  });

  return result;
}
