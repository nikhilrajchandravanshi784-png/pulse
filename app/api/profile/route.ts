import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        profile: true,
        patientProfile: true,
        medicalHistory: true,
        lifestyle: true,
        goals: true,
        foodPreference: true,
        proactivePreference: true,
        dataSources: true,
        consents: { where: { isRevoked: false } },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Safely parse JSON strings for frontend consumption
    const parsedMedical = user.medicalHistory
      ? {
          ...user.medicalHistory,
          existingConditions: JSON.parse(user.medicalHistory.existingConditions || "[]"),
          previousDiagnoses: JSON.parse(user.medicalHistory.previousDiagnoses || "[]"),
          allergies: JSON.parse(user.medicalHistory.allergies || "[]"),
          currentMedications: JSON.parse(user.medicalHistory.currentMedications || "[]"),
          previousSurgeries: JSON.parse(user.medicalHistory.previousSurgeries || "[]"),
          familyMedicalHistory: JSON.parse(user.medicalHistory.familyMedicalHistory || "[]"),
        }
      : null;

    return NextResponse.json({
      success: true,
      profile: {
        id: user.id,
        name: user.name,
        email: user.email,
        preferredLang: user.preferredLang,
        details: user.profile,
        patientProfile: user.patientProfile,
        medical: parsedMedical,
        lifestyle: user.lifestyle,
        foodPreference: user.foodPreference,
        proactivePreference: user.proactivePreference,
        goals: user.goals,
        dataSources: user.dataSources,
        consents: user.consents,
      },
    });
  } catch (error) {
    console.error("Profile GET error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const userId = session.userId;

    // 1. User base settings (name, preferredLang)
    const userUpdates: Record<string, any> = {};
    if (body.name) userUpdates.name = body.name;
    if (body.preferredLang && (body.preferredLang === "hi" || body.preferredLang === "en")) {
      userUpdates.preferredLang = body.preferredLang;
    }

    if (Object.keys(userUpdates).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: userUpdates,
      });
    }

    // 2. HealthProfile (height, weight, country)
    if (body.heightCm !== undefined || body.weightKg !== undefined || body.country !== undefined) {
      await prisma.healthProfile.upsert({
        where: { userId },
        update: {
          heightCm: body.heightCm ? parseFloat(body.heightCm) : undefined,
          weightKg: body.weightKg ? parseFloat(body.weightKg) : undefined,
          country: body.country,
        },
        create: {
          userId,
          heightCm: body.heightCm ? parseFloat(body.heightCm) : 178,
          weightKg: body.weightKg ? parseFloat(body.weightKg) : 75.4,
          country: body.country || "India",
        },
      });
    }

    // 3. PatientProfile (reminder time, work schedule)
    if (body.preferredReminderTime !== undefined || body.workSchedule !== undefined) {
      await prisma.patientProfile.upsert({
        where: { userId },
        update: {
          preferredReminderTime: body.preferredReminderTime,
          workSchedule: body.workSchedule,
        },
        create: {
          userId,
          preferredReminderTime: body.preferredReminderTime || "08:00",
          workSchedule: body.workSchedule || "Day Shift (09:00 - 18:00)",
        },
      });
    }

    // 4. Lifestyle Profile (dietaryPreference, typicalMeals, mealTiming, exerciseFrequency, sleepSchedule)
    if (
      body.dietaryPreference !== undefined ||
      body.typicalMeals !== undefined ||
      body.mealTiming !== undefined ||
      body.exerciseFrequency !== undefined ||
      body.sleepSchedule !== undefined
    ) {
      await prisma.lifestyleProfile.upsert({
        where: { userId },
        update: {
          dietaryPreference: body.dietaryPreference,
          typicalMeals: body.typicalMeals,
          mealTiming: body.mealTiming,
          exerciseFrequency: body.exerciseFrequency,
          sleepSchedule: body.sleepSchedule,
        },
        create: {
          userId,
          dietaryPreference: body.dietaryPreference || "Mediterranean/Indian balanced",
          typicalMeals: body.typicalMeals || "Roti, dal, sabzi, curd",
          mealTiming: body.mealTiming || "12-hour fasting window",
          exerciseFrequency: body.exerciseFrequency || "4-5 days/week",
          sleepSchedule: body.sleepSchedule || "23:00 - 06:45",
        },
      });

      // Synchronize with PatientFoodPreference if dietaryPreference updated
      if (body.dietaryPreference) {
        await prisma.patientFoodPreference.upsert({
          where: { userId },
          update: {
            dietaryPattern: body.dietaryPreference,
          },
          create: {
            userId,
            dietaryPattern: body.dietaryPreference,
          },
        });
      }
    }

    // 5. Proactive Notification Preferences
    if (
      body.quietHoursStart !== undefined ||
      body.quietHoursEnd !== undefined ||
      body.pushEnabled !== undefined ||
      body.preferredLang !== undefined
    ) {
      const channel = body.pushEnabled === false ? "EMAIL" : "IN_APP";
      await prisma.proactiveNotificationPreference.upsert({
        where: { userId },
        update: {
          quietHoursStart: body.quietHoursStart,
          quietHoursEnd: body.quietHoursEnd,
          preferredLanguage: body.preferredLang || undefined,
          preferredChannel: channel,
          enabled: body.pushEnabled ?? true,
        },
        create: {
          userId,
          quietHoursStart: body.quietHoursStart || "22:00",
          quietHoursEnd: body.quietHoursEnd || "07:00",
          preferredLanguage: body.preferredLang || "en",
          preferredChannel: channel,
          enabled: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Profile and preferences updated successfully.",
    });
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
