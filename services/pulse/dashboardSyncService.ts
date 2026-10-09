/**
 * Project Pulse — Dashboard Synchronization Service
 * Aggregates live, authoritative patient data for the Home dashboard.
 */

import { prisma } from "@/lib/db";
import { GoalSyncService, TodayGoalStatus } from "./goalSyncService";
import { getLatestMetricsOverview } from "@/services/health/healthDataService";
import { calculateMetabolicScore } from "./metabolicScoreService";

export interface DashboardTimelineEvent {
  id: string;
  timeFormatted: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  timestamp: Date;
}

export interface LiveDashboardData {
  userName: string;
  todayGoal: TodayGoalStatus;
  todayCheckIn: {
    id: string;
    date: string;
    mood: string;
    routineStatus: string;
    barrier?: string | null;
    notes?: string | null;
  } | null;
  latestMeal: {
    id: string;
    mealType: string;
    mealTime: Date;
    itemsCount: number;
    totalCalories: number;
    totalCarbs: number;
    itemNames: string[];
    hasPhoto: boolean;
  } | null;
  dailyNutrition: {
    calories: number;
    carbohydrates: number;
    protein: number;
    fat: number;
    fiber: number;
  };
  activeCaregiversCount: number;
  proactiveIntervention: {
    id: string;
    headline: string;
    suggestionText: string;
    deliveryChannel: string;
    status: string;
  } | null;
  recentTimelineEvents: DashboardTimelineEvent[];
  progressSnapshot: {
    weeklyAdherencePercent: number;
    totalCheckIns: number;
    totalMealsLogged: number;
  };
  overview: Record<string, any>;
  connectedDevicesCount: number;
  metabolicScore: {
    score: number;
    tier: string;
    projectedTarget: number;
    hba1c: number | null;
    headline: string;
    summary: string;
  } | null;
}

export class DashboardSyncService {
  static async getLiveDashboardData(userId: string, userName: string): Promise<LiveDashboardData> {
    const todayStr = new Date().toISOString().split("T")[0];
    const dayStart = new Date(`${todayStr}T00:00:00.000Z`);
    const dayEnd = new Date(`${todayStr}T23:59:59.999Z`);

    // 1. Live Goal & Routine Status
    const todayGoal = await GoalSyncService.getTodayGoalAndStatus(userId);

    // 2. Today's Check-In
    const checkIn = await prisma.dailyCheckIn.findUnique({
      where: {
        userId_date: { userId, date: todayStr },
      },
      include: { glucoseEntries: true },
    });

    // 3. Latest Confirmed Meal
    const latestMealLog = await prisma.foodLog.findFirst({
      where: {
        userId,
        status: "CONFIRMED",
      },
      orderBy: { mealTime: "desc" },
      include: { items: true },
    });

    const latestMeal = latestMealLog
      ? {
          id: latestMealLog.id,
          mealType: latestMealLog.mealType,
          mealTime: latestMealLog.mealTime,
          itemsCount: latestMealLog.items.length,
          totalCalories: latestMealLog.items.reduce((s, i) => s + (i.calories ?? 0), 0),
          totalCarbs: latestMealLog.items.reduce((s, i) => s + (i.carbohydrates ?? 0), 0),
          itemNames: latestMealLog.items.map((i) => i.foodName),
          hasPhoto: latestMealLog.hasPhoto,
        }
      : null;

    // 4. Today's Daily Nutrition Summary
    const nutritionSummary = await prisma.dailyNutritionSummary.findUnique({
      where: {
        userId_date: { userId, date: todayStr },
      },
    });

    const dailyNutrition = {
      calories: Math.round(nutritionSummary?.loggedCalories ?? 0),
      carbohydrates: Math.round(nutritionSummary?.loggedCarbohydrates ?? 0),
      protein: Math.round(nutritionSummary?.loggedProtein ?? 0),
      fat: Math.round(nutritionSummary?.loggedFat ?? 0),
      fiber: Math.round(nutritionSummary?.loggedFiber ?? 0),
    };

    // 5. Active Caregivers Count
    const activeCaregiversCount = await prisma.careCircleInvitation.count({
      where: {
        patientId: userId,
        status: { in: ["PENDING", "ACCEPTED"] },
      },
    });

    // 6. Proactive Intervention / Recovery
    const activeIntervention = await prisma.interventionEvent.findFirst({
      where: {
        userId,
        lifecycleStatus: { in: ["PENDING", "DELIVERED", "DETECTED"] },
      },
      orderBy: { createdAt: "desc" },
    });

    const proactiveIntervention = activeIntervention
      ? {
          id: activeIntervention.id,
          headline: activeIntervention.title,
          suggestionText: activeIntervention.message,
          deliveryChannel: "IN_APP",
          status: activeIntervention.lifecycleStatus,
        }
      : null;

    // 7. Recent Timeline Events (Real Chronological Records)
    const timelineEvents: DashboardTimelineEvent[] = [];

    // Check-in events
    const recentCheckIns = await prisma.dailyCheckIn.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 2,
    });
    for (const c of recentCheckIns) {
      const timeStr = new Date(c.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      timelineEvents.push({
        id: `checkin-${c.id}`,
        timeFormatted: timeStr,
        title: "Daily Check-In Recorded",
        subtitle: `Feeling: ${c.mood} • Routine: ${c.routineStatus}${c.barrier ? ` (${c.barrier})` : ""}`,
        badge: "Check-In",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        timestamp: c.createdAt,
      });
    }

    // Food log events
    const recentFoodLogs = await prisma.foodLog.findMany({
      where: { userId, status: "CONFIRMED" },
      orderBy: { mealTime: "desc" },
      take: 2,
      include: { items: true },
    });
    for (const f of recentFoodLogs) {
      const timeStr = new Date(f.mealTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const cals = f.items.reduce((s, i) => s + (i.calories ?? 0), 0);
      const carbs = f.items.reduce((s, i) => s + (i.carbohydrates ?? 0), 0);
      timelineEvents.push({
        id: `food-${f.id}`,
        timeFormatted: timeStr,
        title: `${f.mealType} Logged`,
        subtitle: `${f.items.map((i) => i.foodName).join(", ")} • ~${cals} kcal, ${carbs}g carbs`,
        badge: "Food AI",
        badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
        timestamp: f.mealTime,
      });
    }

    // Glucose entries
    const recentGlucose = await prisma.glucoseEntry.findMany({
      where: { userId },
      orderBy: { measuredAt: "desc" },
      take: 2,
    });
    for (const g of recentGlucose) {
      const timeStr = new Date(g.measuredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      timelineEvents.push({
        id: `glucose-${g.id}`,
        timeFormatted: timeStr,
        title: "Glucose Reading Recorded",
        subtitle: `${g.value} ${g.unit} (${g.context})`,
        badge: "Biometric",
        badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
        timestamp: g.measuredAt,
      });
    }

    // Sort combined events descending by timestamp
    timelineEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    const topTimelineEvents = timelineEvents.slice(0, 5);

    // 8. Progress Snapshot (7-Day Adherence)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000);
    const pastCheckIns = await prisma.dailyCheckIn.findMany({
      where: {
        userId,
        createdAt: { gte: sevenDaysAgo },
      },
    });
    const completedCheckIns = pastCheckIns.filter((c) => c.routineStatus === "Completed").length;
    const weeklyAdherence = pastCheckIns.length > 0 ? Math.round((completedCheckIns / pastCheckIns.length) * 100) : 100;

    const totalMealsLogged = await prisma.foodLog.count({
      where: { userId, status: "CONFIRMED" },
    });

    // 9. Telemetry Overview
    const overview = await getLatestMetricsOverview(userId);
    const connectedDevicesCount = await prisma.dataSource.count({
      where: { userId, isConnected: true },
    });

    // 10. Metabolic Health Score
    let metabolicScoreData = null;
    const latestScoreMetric = await prisma.healthMetric.findFirst({
      where: { userId, metricType: "metabolic_score" },
      orderBy: { timestamp: "desc" },
    });
    const baselineLab = await prisma.clinicalMeasurement.findFirst({
      where: { userId, measurementType: "HBA1C" },
      orderBy: { measuredAt: "desc" },
    });

    if (latestScoreMetric) {
      let meta: any = {};
      try {
        if (latestScoreMetric.metadata) meta = JSON.parse(latestScoreMetric.metadata);
      } catch {}
      metabolicScoreData = {
        score: Math.round(latestScoreMetric.value),
        tier: meta.tier || "Good",
        projectedTarget: meta.projectedTarget || Math.min(100, Math.round(latestScoreMetric.value + 14)),
        hba1c: baselineLab ? baselineLab.value : null,
        headline: meta.tier === "Optimal" ? "Optimal Resilience" : meta.tier === "Good" ? "Good Foundation" : "Actionable Opportunities",
        summary: "Calibrated from your continuous glycemic data, HbA1c, and lifestyle rhythm.",
      };
    } else if (baselineLab) {
      // Calculate from baselineLab on-the-fly
      const calc = calculateMetabolicScore({ hba1c: baselineLab.value });
      metabolicScoreData = {
        score: calc.totalScore,
        tier: calc.tier,
        projectedTarget: calc.projectedTargetScore,
        hba1c: baselineLab.value,
        headline: calc.headline,
        summary: calc.summary,
      };
    }

    return {
      userName,
      todayGoal,
      todayCheckIn: checkIn
        ? {
            id: checkIn.id,
            date: checkIn.date,
            mood: checkIn.mood,
            routineStatus: checkIn.routineStatus,
            barrier: checkIn.barrier,
            notes: checkIn.notes,
          }
        : null,
      latestMeal,
      dailyNutrition,
      activeCaregiversCount,
      proactiveIntervention,
      recentTimelineEvents: topTimelineEvents,
      progressSnapshot: {
        weeklyAdherencePercent: weeklyAdherence,
        totalCheckIns: pastCheckIns.length,
        totalMealsLogged,
      },
      overview,
      connectedDevicesCount,
      metabolicScore: metabolicScoreData,
    };
  }
}
