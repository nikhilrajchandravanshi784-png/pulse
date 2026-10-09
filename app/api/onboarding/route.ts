import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { connectProvider } from "@/services/health/providerService";
import { syncUserDevice } from "@/services/health/syncService";
import { generateFreshInsights } from "@/services/health/insightService";
import { computeAndSaveUserMetabolicScore } from "@/services/pulse/metabolicScoreService";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { step, personal, medical, goals, lifestyle, connectedProviders, consent } = body;

    const userId = session.userId;

    // Step 1: Personal Information
    if (personal) {
      await prisma.healthProfile.upsert({
        where: { userId },
        update: {
          dateOfBirth: personal.dateOfBirth ? new Date(personal.dateOfBirth) : null,
          biologicalSex: personal.biologicalSex,
          heightCm: personal.heightCm ? parseFloat(personal.heightCm) : null,
          weightKg: personal.weightKg ? parseFloat(personal.weightKg) : null,
          country: personal.country,
          onboardingStep: Math.max(step || 1, 2),
        },
        create: {
          userId,
          dateOfBirth: personal.dateOfBirth ? new Date(personal.dateOfBirth) : null,
          biologicalSex: personal.biologicalSex,
          heightCm: personal.heightCm ? parseFloat(personal.heightCm) : null,
          weightKg: personal.weightKg ? parseFloat(personal.weightKg) : null,
          country: personal.country,
          onboardingStep: Math.max(step || 1, 2),
        },
      });

      if (personal.fullName) {
        await prisma.user.update({
          where: { id: userId },
          data: { name: personal.fullName },
        });
      }
    }

    // Step 2: Medical History (HbA1c Focused)
    if (medical) {
      const parsedHba1c =
        medical.hba1c !== undefined && medical.hba1c !== null && medical.hba1c !== ""
          ? parseFloat(String(medical.hba1c))
          : null;

      if (parsedHba1c !== null && !isNaN(parsedHba1c)) {
        // Record baseline ClinicalMeasurement for HbA1c
        await prisma.clinicalMeasurement.create({
          data: {
            userId,
            measurementType: "HBA1C",
            value: parsedHba1c,
            unit: "%",
            measuredAt: medical.testDate ? new Date(medical.testDate) : new Date(),
            source: "PATIENT_ONBOARDING",
            laboratoryName: medical.testTiming || "Reported Venous Blood Draw",
            isBaseline: true,
            clinicalNotes: `Baseline HbA1c calibrated during onboarding: ${parsedHba1c}%`,
          },
        });

        // Calibrate diabetes classification on patientProfile
        const derivedDiabetesType =
          parsedHba1c >= 6.5
            ? "Type 2 Diabetes"
            : parsedHba1c >= 5.7
            ? "Pre-diabetes"
            : "Preventive Focus";

        await prisma.patientProfile.upsert({
          where: { userId },
          update: {
            diabetesType: derivedDiabetesType,
          },
          create: {
            userId,
            diabetesType: derivedDiabetesType,
            programDayCurrent: 1,
            programStatus: "ACTIVE",
          },
        });
      }

      const existingConditionsList =
        parsedHba1c !== null && !isNaN(parsedHba1c)
          ? parsedHba1c >= 6.5
            ? ["Type 2 Diabetes"]
            : parsedHba1c >= 5.7
            ? ["Pre-diabetes"]
            : ["Optimal Glycemic Focus"]
          : medical.existingConditions || [];

      await prisma.medicalHistory.upsert({
        where: { userId },
        update: {
          existingConditions: JSON.stringify(existingConditionsList),
          previousDiagnoses: JSON.stringify(medical.previousDiagnoses || []),
          allergies: JSON.stringify(medical.allergies || []),
          currentMedications: JSON.stringify(medical.currentMedications || []),
          previousSurgeries: JSON.stringify(medical.previousSurgeries || []),
          familyMedicalHistory: JSON.stringify(medical.familyMedicalHistory || []),
          additionalNotes:
            parsedHba1c !== null
              ? `Baseline HbA1c: ${parsedHba1c}% • Recency: ${medical.testTiming || "Recent"} ${
                  medical.additionalNotes ? `• Notes: ${medical.additionalNotes}` : ""
                }`
              : medical.additionalNotes || null,
          preferNotToSay: Boolean(medical.preferNotToSay),
        },
        create: {
          userId,
          existingConditions: JSON.stringify(existingConditionsList),
          previousDiagnoses: JSON.stringify(medical.previousDiagnoses || []),
          allergies: JSON.stringify(medical.allergies || []),
          currentMedications: JSON.stringify(medical.currentMedications || []),
          previousSurgeries: JSON.stringify(medical.previousSurgeries || []),
          familyMedicalHistory: JSON.stringify(medical.familyMedicalHistory || []),
          additionalNotes:
            parsedHba1c !== null
              ? `Baseline HbA1c: ${parsedHba1c}% • Recency: ${medical.testTiming || "Recent"}`
              : medical.additionalNotes || null,
          preferNotToSay: Boolean(medical.preferNotToSay),
        },
      });

      await prisma.healthProfile.update({
        where: { userId },
        data: { onboardingStep: Math.max(step || 2, 3) },
      });
    }

    // Step 3: Health Goals
    if (goals) {
      // Clear previous and replace
      await prisma.healthGoal.deleteMany({ where: { userId } });

      const goalEntries = [];
      // Map goal titles to valid schema categories: activity, nutrition, monitoring, lifestyle, sleep
      const categoryForGoal = (title: string): string => {
        const t = title.toLowerCase();
        if (t.includes("sleep")) return "sleep";
        if (t.includes("activity") || t.includes("physical") || t.includes("exercise")) return "activity";
        if (t.includes("eating") || t.includes("nutrition") || t.includes("food")) return "nutrition";
        if (t.includes("glucose") || t.includes("monitoring")) return "monitoring";
        return "lifestyle"; // default for metabolic, cardiovascular, weight, general wellness
      };

      if (Array.isArray(goals.primaryGoals)) {
        for (const title of goals.primaryGoals) {
          goalEntries.push({
            userId,
            title,
            category: categoryForGoal(title),
            isPrimary: true,
            status: "ACTIVE",
          });
        }
      }
      if (Array.isArray(goals.secondaryGoals)) {
        for (const title of goals.secondaryGoals) {
          goalEntries.push({
            userId,
            title,
            category: categoryForGoal(title),
            isPrimary: false,
            status: "ACTIVE",
          });
        }
      }

      if (goalEntries.length > 0) {
        await prisma.healthGoal.createMany({ data: goalEntries });
      }

      await prisma.healthProfile.update({
        where: { userId },
        data: { onboardingStep: Math.max(step || 3, 4) },
      });
    }

    // Step 4: Food & Lifestyle
    if (lifestyle) {
      await prisma.lifestyleProfile.upsert({
        where: { userId },
        update: {
          dietaryPreference: lifestyle.dietaryPreference,
          typicalMeals: lifestyle.typicalMeals,
          mealTiming: lifestyle.mealTiming,
          exerciseFrequency: lifestyle.exerciseFrequency,
          sleepSchedule: lifestyle.sleepSchedule,
          workActivityPattern: lifestyle.workActivityPattern,
          smokingStatus: lifestyle.smokingStatus,
          alcoholConsumption: lifestyle.alcoholConsumption,
        },
        create: {
          userId,
          dietaryPreference: lifestyle.dietaryPreference,
          typicalMeals: lifestyle.typicalMeals,
          mealTiming: lifestyle.mealTiming,
          exerciseFrequency: lifestyle.exerciseFrequency,
          sleepSchedule: lifestyle.sleepSchedule,
          workActivityPattern: lifestyle.workActivityPattern,
          smokingStatus: lifestyle.smokingStatus,
          alcoholConsumption: lifestyle.alcoholConsumption,
        },
      });

      await prisma.healthProfile.update({
        where: { userId },
        data: { onboardingStep: Math.max(step || 4, 5) },
      });
    }

    // Step 5 & 6: Connected Data Sources & Explicit Consent
    if (connectedProviders && Array.isArray(connectedProviders)) {
      for (const provKey of connectedProviders) {
        try {
          await connectProvider(userId, provKey, ["activity", "heart_rate", "sleep", "glucose"]);
          // Automatically sync initial baseline — errors here must not abort onboarding
          await syncUserDevice(userId, provKey);
        } catch (syncErr: unknown) {
          console.warn(`[onboarding] Provider sync warning for ${provKey}:`, syncErr);
          // Non-fatal: the DataSource record was already created; sync will retry later
        }
      }
    }

    if (consent) {
      await prisma.consentRecord.create({
        data: {
          userId,
          providerKey: "platform_onboarding",
          dataCategories: JSON.stringify(consent.categories || ["all_metrics"]),
          purpose: consent.purpose || "Comprehensive metabolic continuous monitoring",
          explicitConsent: Boolean(consent.explicitConsent),
        },
      });
    }

    // If step is 6 or final submission, complete onboarding and compute metabolic score
    let metabolicScoreResult = null;
    if (step === 6 || body.isFinal) {
      await prisma.healthProfile.update({
        where: { userId },
        data: {
          isOnboarded: true,
          onboardingStep: 6,
        },
      });

      // Compute and persist the patient's calibrated Metabolic Score out of 100
      try {
        metabolicScoreResult = await computeAndSaveUserMetabolicScore(userId, {
          hba1c:
            medical?.hba1c !== undefined && medical?.hba1c !== null && medical?.hba1c !== ""
              ? parseFloat(String(medical.hba1c))
              : undefined,
          heightCm: personal?.heightCm ? parseFloat(String(personal.heightCm)) : undefined,
          weightKg: personal?.weightKg ? parseFloat(String(personal.weightKg)) : undefined,
          dateOfBirth: personal?.dateOfBirth,
          biologicalSex: personal?.biologicalSex,
          exerciseFrequency: lifestyle?.exerciseFrequency,
          sleepSchedule: lifestyle?.sleepSchedule,
          dietaryPreference: lifestyle?.dietaryPreference,
          smokingStatus: lifestyle?.smokingStatus,
          primaryGoals: goals?.primaryGoals,
        });
      } catch (scoreErr: unknown) {
        console.warn("[onboarding] Metabolic score calculation error:", scoreErr);
      }

      // Generate initial baseline insights — non-fatal if it fails
      try {
        await generateFreshInsights(userId);
      } catch (insightErr: unknown) {
        console.warn("[onboarding] Insight generation warning:", insightErr);
      }
    }

    return NextResponse.json({
      success: true,
      step: step || 6,
      message: "Health profile updated successfully",
      metabolicScore: metabolicScoreResult,
    });
  } catch (error: unknown) {
    console.error("Onboarding submission error:", error);
    return NextResponse.json(
      { error: "Failed to persist onboarding data" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.userId;
    const profile = await prisma.healthProfile.findUnique({
      where: { userId },
    });
    const baselineLab = await prisma.clinicalMeasurement.findFirst({
      where: { userId, measurementType: "HBA1C" },
      orderBy: { measuredAt: "desc" },
    });
    const latestScoreMetric = await prisma.healthMetric.findFirst({
      where: { userId, metricType: "metabolic_score" },
      orderBy: { timestamp: "desc" },
    });

    return NextResponse.json({
      success: true,
      isOnboarded: profile?.isOnboarded ?? false,
      onboardingStep: profile?.onboardingStep ?? 1,
      baselineHbA1c: baselineLab ? baselineLab.value : null,
      metabolicScore: latestScoreMetric ? latestScoreMetric.value : null,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Failed to fetch onboarding status" },
      { status: 500 }
    );
  }
}
