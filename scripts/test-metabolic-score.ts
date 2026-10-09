/**
 * Test Suite: Metabolic Score Calculation & HbA1c Onboarding Integration
 */

import { prisma } from "../lib/db";
import {
  calculateMetabolicScore,
  computeAndSaveUserMetabolicScore,
} from "../services/pulse/metabolicScoreService";
import { DashboardSyncService } from "../services/pulse/dashboardSyncService";

async function runTests() {
  console.log("=== RUNNING METABOLIC SCORE & HBA1C TESTS ===");

  // 1. Pure calculation tests across diverse clinical profiles
  console.log("\n--- TEST 1: Pure Calculation Logic ---");

  // Case A: Optimal Profile (HbA1c 5.2%, Healthy BMI, Active, Whole Foods)
  const scoreOptimal = calculateMetabolicScore({
    hba1c: 5.2,
    heightCm: 175,
    weightKg: 68,
    exerciseFrequency: "5+ days/week",
    sleepSchedule: "23:00 - 07:00 (approx 8 hours)",
    dietaryPreference: "Mediterranean",
    smokingStatus: "never",
    primaryGoals: ["Improve metabolic health"],
  });
  console.log(`[Optimal Profile] Score: ${scoreOptimal.totalScore}/100, Tier: ${scoreOptimal.tier}`);
  console.log(`  Glycemic: ${scoreOptimal.breakdown.glycemicScore}/40, BMI: ${scoreOptimal.breakdown.bmiScore}/25, Lifestyle: ${scoreOptimal.breakdown.lifestyleScore}/20, Intention: ${scoreOptimal.breakdown.intentionScore}/15`);
  if (scoreOptimal.totalScore < 85 || scoreOptimal.tier !== "Optimal") {
    throw new Error(`Expected Optimal tier (>=85), got ${scoreOptimal.totalScore} (${scoreOptimal.tier})`);
  }

  // Case B: Prediabetes Profile (HbA1c 6.1%, Overweight BMI, Moderate activity)
  const scorePrediabetes = calculateMetabolicScore({
    hba1c: 6.1,
    heightCm: 170,
    weightKg: 82, // BMI ~28.4
    exerciseFrequency: "2-3 days/week",
    sleepSchedule: "approx 7 hours",
    dietaryPreference: "Omnivore",
    smokingStatus: "never",
    primaryGoals: ["Improve glucose control"],
  });
  console.log(`[Prediabetes Profile] Score: ${scorePrediabetes.totalScore}/100, Tier: ${scorePrediabetes.tier}`);
  console.log(`  Target: ${scorePrediabetes.projectedTargetScore}/100 (+${scorePrediabetes.potentialGain} pts)`);
  if (scorePrediabetes.totalScore < 50 || scorePrediabetes.totalScore > 84) {
    throw new Error(`Expected score between 50 and 84, got ${scorePrediabetes.totalScore}`);
  }

  // Case C: Elevated / T2D Profile (HbA1c 7.8%, Obese BMI, Sedentary, Smoker)
  const scoreElevated = calculateMetabolicScore({
    hba1c: 7.8,
    heightCm: 165,
    weightKg: 95, // BMI ~34.9
    exerciseFrequency: "0-1 days/week",
    sleepSchedule: "approx 6 hours",
    dietaryPreference: "Standard",
    smokingStatus: "current",
    primaryGoals: ["Lose weight"],
  });
  console.log(`[Elevated Profile] Score: ${scoreElevated.totalScore}/100, Tier: ${scoreElevated.tier}`);
  console.log(`  Projected Target: ${scoreElevated.projectedTargetScore}/100 (+${scoreElevated.potentialGain} pts)`);
  if (scoreElevated.totalScore > 65) {
    throw new Error(`Expected score <= 65 for high glycemic burden, got ${scoreElevated.totalScore}`);
  }

  // 2. Integration Test: Patient Onboarding Simulation with HbA1c
  console.log("\n--- TEST 2: Onboarding Persistence & Score Generation ---");
  const testUserEmail = `test-metabolic-${Date.now()}@pulsehealth.internal`;
  const user = await prisma.user.create({
    data: {
      email: testUserEmail,
      name: "Jordan Lee",
      role: "PATIENT",
      passwordHash: "dummy-hash",
    },
  });
  console.log(`Created test user ID: ${user.id} (${user.email})`);

  // Simulate Step 1: HealthProfile
  await prisma.healthProfile.create({
    data: {
      userId: user.id,
      heightCm: 172,
      weightKg: 74,
      onboardingStep: 2,
    },
  });

  // Simulate Step 2: HbA1c (6.3% - Prediabetes)
  const hba1cValue = 6.3;
  await prisma.clinicalMeasurement.create({
    data: {
      userId: user.id,
      measurementType: "HBA1C",
      value: hba1cValue,
      unit: "%",
      measuredAt: new Date(),
      source: "PATIENT_ONBOARDING",
      laboratoryName: "Reported Venous Blood Draw",
      isBaseline: true,
      clinicalNotes: `Baseline HbA1c calibrated during onboarding: ${hba1cValue}%`,
    },
  });

  await prisma.patientProfile.create({
    data: {
      userId: user.id,
      diabetesType: "Pre-diabetes",
      programDayCurrent: 1,
      programStatus: "ACTIVE",
    },
  });

  // Step 4: Lifestyle Profile
  await prisma.lifestyleProfile.create({
    data: {
      userId: user.id,
      dietaryPreference: "Mediterranean",
      exerciseFrequency: "3-4 days/week",
      sleepSchedule: "23:00 - 07:00 (approx 8 hours)",
      smokingStatus: "never",
      alcoholConsumption: "occasional",
    },
  });

  // Step 3: Goals
  await prisma.healthGoal.create({
    data: {
      userId: user.id,
      title: "Improve glucose control",
      category: "monitoring",
      isPrimary: true,
      status: "ACTIVE",
    },
  });

  // Now run computeAndSaveUserMetabolicScore for this user
  const savedScore = await computeAndSaveUserMetabolicScore(user.id);
  console.log(`Generated and persisted Metabolic Score: ${savedScore.totalScore}/100 (${savedScore.tier})`);
  console.log(`  Projected Target: ${savedScore.projectedTargetScore}/100 (+${savedScore.potentialGain} pts)`);
  console.log(`  Recommendations: ${savedScore.clinicalRecommendations.join(" | ")}`);

  // Verify it was stored in HealthMetric
  const storedMetric = await prisma.healthMetric.findFirst({
    where: { userId: user.id, metricType: "metabolic_score" },
  });
  if (!storedMetric || storedMetric.value !== savedScore.totalScore) {
    throw new Error("Failed to verify stored metabolic_score HealthMetric");
  }
  console.log("✓ Verified HealthMetric persistence");

  // 3. Test Dashboard Synchronization
  console.log("\n--- TEST 3: Dashboard Synchronization ---");
  const dashboardData = await DashboardSyncService.getLiveDashboardData(user.id, user.name || "Jordan");
  console.log(`Dashboard data metabolicScore:`, dashboardData.metabolicScore);

  if (!dashboardData.metabolicScore) {
    throw new Error("Expected metabolicScore on dashboard data, received null");
  }
  if (dashboardData.metabolicScore.score !== savedScore.totalScore) {
    throw new Error(`Expected score ${savedScore.totalScore}, got ${dashboardData.metabolicScore.score}`);
  }
  if (dashboardData.metabolicScore.hba1c !== 6.3) {
    throw new Error(`Expected baseline HbA1c 6.3, got ${dashboardData.metabolicScore.hba1c}`);
  }
  console.log(`✓ Dashboard returned synchronized Metabolic Score: ${dashboardData.metabolicScore.score}/100 (${dashboardData.metabolicScore.tier}) with baseline HbA1c ${dashboardData.metabolicScore.hba1c}%`);

  // Cleanup test user
  await prisma.user.delete({ where: { id: user.id } });
  console.log("✓ Cleaned up test user");

  console.log("\n=== ALL METABOLIC SCORE & HBA1C TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
