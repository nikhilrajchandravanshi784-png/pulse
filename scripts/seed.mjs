import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Pulse Health realistic seed script...");

  const email = "alex.morgan@pulsehealth.demo";
  const passwordHash = await bcrypt.hash("DemoPassword123!", 10);

  // Clean existing demo user if present
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Cleaning previous demo user records...");
    await prisma.user.delete({ where: { email } });
  }

  // 1. Create User & Profile
  const user = await prisma.user.create({
    data: {
      email,
      name: "Alex Morgan",
      passwordHash,
      role: "PATIENT",
      profile: {
        create: {
          dateOfBirth: new Date("1988-06-14"),
          biologicalSex: "male",
          heightCm: 178,
          weightKg: 75.4,
          country: "United States",
          onboardingStep: 6,
          isOnboarded: true,
        },
      },
    },
  });

  console.log(`✅ Demo user created: ${user.name} (${user.email})`);

  // 2. Medical History
  await prisma.medicalHistory.create({
    data: {
      userId: user.id,
      existingConditions: JSON.stringify(["Pre-diabetes (HbA1c 5.8%)", "Mild seasonal allergies"]),
      previousDiagnoses: JSON.stringify(["Postprandial glucose variability"]),
      allergies: JSON.stringify(["Penicillin", "Ragweed pollen"]),
      currentMedications: JSON.stringify(["Omega-3 Fish Oil 1000mg", "Vitamin D3 2000 IU"]),
      previousSurgeries: JSON.stringify(["None"]),
      familyMedicalHistory: JSON.stringify([
        "Father: Type 2 Diabetes diagnosed age 52",
        "Maternal Grandmother: Hypertension",
      ]),
      additionalNotes: "Focused on reversing pre-diabetes trajectory through lifestyle, sleep, and continuous metabolic tracking.",
      preferNotToSay: false,
    },
  });

  // 3. Health Goals
  await prisma.healthGoal.createMany({
    data: [
      {
        userId: user.id,
        title: "Improve glucose control & metabolic stability",
        category: "metabolic",
        isPrimary: true,
        targetValue: 95,
        targetUnit: "mg/dL (time in range > 90%)",
        status: "ACTIVE",
      },
      {
        userId: user.id,
        title: "Achieve 7.5+ hours of restorative sleep",
        category: "sleep",
        isPrimary: false,
        targetValue: 450,
        targetUnit: "minutes",
        status: "ACTIVE",
      },
      {
        userId: user.id,
        title: "Maintain 8,500 daily active steps",
        category: "activity",
        isPrimary: false,
        targetValue: 8500,
        targetUnit: "steps",
        status: "ACTIVE",
      },
    ],
  });

  // 4. Lifestyle Profile
  await prisma.lifestyleProfile.create({
    data: {
      userId: user.id,
      dietaryPreference: "Mediterranean / Low-Glycemic",
      typicalMeals: "High protein breakfast (eggs & avocado), salmon/greens lunch, olive oil vegetables dinner",
      mealTiming: "12-hour fasting window (08:00 - 20:00)",
      exerciseFrequency: "4-5 days/week (Zone 2 cardio & hypertrophy)",
      sleepSchedule: "23:00 - 06:45",
      workActivityPattern: "moderately active (standing desk)",
      smokingStatus: "never",
      alcoholConsumption: "occasional (1 glass red wine on weekends)",
    },
  });

  // 5. Data Sources & Connected Devices (Clearly tagged DEMO/MOCK)
  const appleSource = await prisma.dataSource.create({
    data: {
      userId: user.id,
      providerKey: "apple_health",
      displayName: "Apple Health",
      category: "WEARABLE",
      isConnected: true,
      isMock: true,
      scopesGranted: JSON.stringify(["steps", "heart_rate", "sleep", "active_energy"]),
      lastSyncStatus: "SUCCESS",
      lastSyncAt: new Date(),
    },
  });

  const cgmSource = await prisma.dataSource.create({
    data: {
      userId: user.id,
      providerKey: "dexcom",
      displayName: "Dexcom G7 CGM",
      category: "GLUCOSE",
      isConnected: true,
      isMock: true,
      scopesGranted: JSON.stringify(["interstitial_glucose", "rate_of_change"]),
      lastSyncStatus: "SUCCESS",
      lastSyncAt: new Date(),
    },
  });

  const ouraSource = await prisma.dataSource.create({
    data: {
      userId: user.id,
      providerKey: "oura",
      displayName: "Oura Ring Gen 3",
      category: "WEARABLE",
      isConnected: true,
      isMock: true,
      scopesGranted: JSON.stringify(["sleep_stages", "readiness", "hrv"]),
      lastSyncStatus: "SUCCESS",
      lastSyncAt: new Date(),
    },
  });

  // Hardware devices
  const appleWatch = await prisma.device.create({
    data: {
      userId: user.id,
      provider: "apple_health",
      deviceName: "Apple Watch Series 9",
      deviceModel: "Watch7,4 (45mm)",
      status: "CONNECTED",
      lastSyncAt: new Date(),
      batteryLevel: 82,
      firmwareVersion: "watchOS 10.5",
    },
  });

  const cgmDevice = await prisma.device.create({
    data: {
      userId: user.id,
      provider: "dexcom",
      deviceName: "Dexcom G7 Sensor",
      deviceModel: "G7-RevB",
      status: "CONNECTED",
      lastSyncAt: new Date(),
      batteryLevel: 94,
      firmwareVersion: "v1.4.2",
    },
  });

  // 6. Explicit Consent Records
  await prisma.consentRecord.createMany({
    data: [
      {
        userId: user.id,
        providerKey: "platform_onboarding",
        dataCategories: JSON.stringify(["personal_info", "medical_history", "lifestyle", "wearable_telemetry"]),
        purpose: "Comprehensive metabolic health monitoring & care team review",
        explicitConsent: true,
      },
      {
        userId: user.id,
        providerKey: "apple_health",
        dataCategories: JSON.stringify(["steps", "heart_rate", "sleep"]),
        purpose: "Passive background collection for cardiovascular and circadian monitoring",
        explicitConsent: true,
      },
      {
        userId: user.id,
        providerKey: "dexcom",
        dataCategories: JSON.stringify(["interstitial_glucose"]),
        purpose: "Continuous glucose telemetry to understand glycemic response to meals",
        explicitConsent: true,
      },
    ],
  });

  // 7. Time-series Health Metrics (Past 24 hours of realistic data points)
  console.log("Ingesting time-series telemetry...");
  const metricsBatch = [];
  const now = new Date();

  // A. Glucose points every 30 minutes over past 24 hours
  for (let i = 48; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 30 * 60 * 1000);
    const hour = timestamp.getHours();
    let glucoseVal = 92;

    if (hour >= 8 && hour <= 10) glucoseVal = 126; // Post-breakfast peak
    else if (hour >= 13 && hour <= 15) glucoseVal = 114; // Post-lunch
    else if (hour >= 19 && hour <= 21) glucoseVal = 129; // Post-dinner
    else if (hour >= 0 && hour <= 6) glucoseVal = 86; // Overnight fasting

    const noise = Math.sin(i * 0.4) * 5 + ((i % 3) - 1) * 2;
    const finalVal = Math.round(glucoseVal + noise);

    metricsBatch.push({
      userId: user.id,
      deviceId: cgmDevice.id,
      source: "cgm",
      metricType: "glucose",
      value: finalVal,
      unit: "mg/dL",
      timestamp,
      metadata: JSON.stringify({
        isDemoData: true,
        sensorType: "Dexcom G7 Interstitial",
        trendArrow: finalVal > 115 ? "FLAT_UP" : "FLAT",
      }),
    });
  }

  // B. Heart rate (hourly)
  for (let i = 24; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = timestamp.getHours();
    let hrVal = 64;
    if (hour >= 0 && hour <= 6) hrVal = 52 + (i % 3);
    else if (hour === 7 || hour === 18) hrVal = 118; // Exercise
    else hrVal = 70 + (i % 6);

    metricsBatch.push({
      userId: user.id,
      deviceId: appleWatch.id,
      source: "apple_health",
      metricType: "heart_rate",
      value: hrVal,
      unit: "bpm",
      timestamp,
      metadata: JSON.stringify({ isDemoData: true }),
    });
  }

  // C. Steps
  const stepBuckets = [
    { hoursAgo: 16, val: 1820 },
    { hoursAgo: 12, val: 2450 },
    { hoursAgo: 6, val: 2100 },
    { hoursAgo: 2, val: 1472 },
  ];
  for (const b of stepBuckets) {
    metricsBatch.push({
      userId: user.id,
      deviceId: appleWatch.id,
      source: "apple_health",
      metricType: "steps",
      value: b.val,
      unit: "count",
      timestamp: new Date(now.getTime() - b.hoursAgo * 3600 * 1000),
      metadata: JSON.stringify({ isDemoData: true }),
    });
  }

  // D. Sleep session
  metricsBatch.push({
    userId: user.id,
    deviceId: appleWatch.id,
    source: "apple_health",
    metricType: "sleep_duration",
    value: 452, // 7h 32m
    unit: "minutes",
    timestamp: new Date(now.getTime() - 14 * 3600 * 1000),
    metadata: JSON.stringify({
      isDemoData: true,
      efficiencyScore: 89,
      deepSleepMinutes: 94,
      remSleepMinutes: 110,
    }),
  });

  // E. Weight
  metricsBatch.push({
    userId: user.id,
    deviceId: null,
    source: "withings",
    metricType: "weight",
    value: 75.4,
    unit: "kg",
    timestamp: new Date(now.getTime() - 10 * 3600 * 1000),
    metadata: JSON.stringify({ isDemoData: true, bodyFat: 18.2 }),
  });

  // F. Active Minutes
  metricsBatch.push({
    userId: user.id,
    deviceId: appleWatch.id,
    source: "apple_health",
    metricType: "active_minutes",
    value: 48,
    unit: "minutes",
    timestamp: new Date(now.getTime() - 2 * 3600 * 1000),
    metadata: JSON.stringify({ isDemoData: true }),
  });

  await prisma.healthMetric.createMany({ data: metricsBatch });

  // 8. Daily Summary
  const todayStr = now.toISOString().split("T")[0];
  await prisma.dailySummary.create({
    data: {
      userId: user.id,
      date: todayStr,
      avgGlucose: 104,
      glucoseTimeInRange: 96,
      totalSteps: 7842,
      avgHeartRate: 64,
      restingHeartRate: 54,
      sleepDurationMinutes: 452,
      sleepQualityScore: 89,
      weightKg: 75.4,
      activeMinutes: 48,
      burnedCalories: 2180,
      dataCompletenessScore: 95,
    },
  });

  // 9. Insights with distinct Observation vs Recommendation vs Safety Badges
  const safetyDisclaimer =
    "This information is for wellness and informational purposes only. It is not a medical diagnosis or substitute for professional medical advice.";

  await prisma.insight.createMany({
    data: [
      {
        userId: user.id,
        type: "OBSERVATION",
        category: "glucose",
        title: "96% Time in Healthy Glycemic Range",
        description: "Your glucose remained between 70–140 mg/dL for 96% of the last 24 hours. Post-breakfast excursion peaked at only 126 mg/dL, showing robust glycemic recovery.",
        impactScore: 5,
        disclaimer: safetyDisclaimer,
      },
      {
        userId: user.id,
        type: "OBSERVATION",
        category: "sleep",
        title: "Deep Sleep Architecture Extended",
        description: "You logged 7h 32m of total sleep with 94 minutes in deep NREM. Deep sleep promotes cellular repair and stabilizes morning cortisol levels.",
        impactScore: 4,
        disclaimer: safetyDisclaimer,
      },
      {
        userId: user.id,
        type: "RECOMMENDATION",
        category: "activity",
        title: "Post-Dinner Walking Opportunity",
        description: "A 10–15 minute walk around 20:00 could blunt the mild dinner elevation and help lower nocturnal resting heart rate by 2–4 bpm.",
        impactScore: 4,
        disclaimer: safetyDisclaimer,
      },
      {
        userId: user.id,
        type: "MILESTONE",
        category: "overall",
        title: "3 Continuous Health Data Streams Connected",
        description: "Apple Watch, Dexcom CGM, and Oura Ring are actively streaming passive metrics. Your unified metabolic digital twin is continuously updating.",
        impactScore: 5,
        disclaimer: safetyDisclaimer,
      },
    ],
  });

  // 10. Care Program & Care Team Messages
  await prisma.careProgram.create({
    data: {
      userId: user.id,
      name: "Metabolic Restoration Protocol",
      description: "Personalized 12-week clinical program aimed at optimizing insulin sensitivity, glucose variability, and circadian rhythm alignment through continuous data collection.",
      currentWeek: 2,
      totalWeeks: 12,
      status: "ACTIVE",
      assignedCoach: "Dr. Sarah Lin, MD (Metabolic Lead) & Marcus Vance, RD",
      weeklyFocus: "Stabilizing post-breakfast glucose curves with circadian protein timing",
    },
  });

  await prisma.careTeamMessage.createMany({
    data: [
      {
        userId: user.id,
        senderName: "Dr. Sarah Lin, MD",
        senderRole: "CARE_TEAM",
        content: "Hi Alex! Welcome to the Metabolic Restoration track. I reviewed your onboarding profile and the initial Dexcom CGM telemetry. Your 96% time-in-range is a fantastic baseline.",
        isCarePlanNote: true,
        read: true,
      },
      {
        userId: user.id,
        senderName: "Marcus Vance, RD",
        senderRole: "CARE_TEAM",
        content: "Great job keeping dinner balanced yesterday. If you'd like to test your glycemic response to higher fiber carbohydrates tomorrow, let me know in the chat!",
        isCarePlanNote: false,
        read: true,
      },
      {
        userId: user.id,
        senderName: "You",
        senderRole: "PATIENT",
        content: "Thanks Dr. Lin! Feeling energetic today. I will do the light walk after dinner as recommended.",
        read: true,
      },
    ],
  });

  // 11. Daily Check-in for today
  await prisma.dailyCheckIn.create({
    data: {
      userId: user.id,
      date: todayStr,
      mood: "Great",
      energyLevel: 5,
      stressLevel: 2,
      note: "Slept deeply, woke up feeling refreshed and clear-headed.",
    },
  });

  console.log("✨ Seed completed successfully! Demo account credentials:");
  console.log("   Email:    alex.morgan@pulsehealth.demo");
  console.log("   Password: DemoPassword123!");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
