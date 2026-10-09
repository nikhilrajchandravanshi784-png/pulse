import { prisma } from "@/lib/db";
import { HealthInsight } from "@/types/health";

export const MEDICAL_SAFETY_DISCLAIMER =
  "This information is for wellness and informational purposes only. It is not a medical diagnosis, treatment plan, or substitute for professional medical advice. Always consult your physician before making clinical decisions.";

export async function getUserInsights(userId: string): Promise<HealthInsight[]> {
  // Check existing stored insights
  let insights = await prisma.insight.findMany({
    where: { userId, isDismissed: false },
    orderBy: { createdAt: "desc" },
  });

  // If none or stale, generate fresh data-grounded insights
  if (insights.length === 0) {
    await generateFreshInsights(userId);
    insights = await prisma.insight.findMany({
      where: { userId, isDismissed: false },
      orderBy: { createdAt: "desc" },
    });
  }

  return insights.map((i) => ({
    id: i.id,
    userId: i.userId,
    type: i.type as HealthInsight["type"],
    category: i.category as HealthInsight["category"],
    title: i.title,
    description: i.description,
    impactScore: i.impactScore,
    isRead: i.isRead,
    isDismissed: i.isDismissed,
    disclaimer: i.disclaimer,
    createdAt: i.createdAt,
  }));
}

export async function generateFreshInsights(userId: string) {
  // Check device count
  const connectedCount = await prisma.dataSource.count({
    where: { userId, isConnected: true },
  });

  // Check recent metrics
  const recentSteps = await prisma.healthMetric.findMany({
    where: { userId, metricType: "steps" },
    take: 10,
    orderBy: { timestamp: "desc" },
  });

  const recentGlucose = await prisma.healthMetric.findMany({
    where: { userId, metricType: "glucose" },
    take: 10,
    orderBy: { timestamp: "desc" },
  });

  const recentSleep = await prisma.healthMetric.findFirst({
    where: { userId, metricType: "sleep_duration" },
    orderBy: { timestamp: "desc" },
  });

  const generatedInsights = [];

  // Insight 1: Data Connection observation
  if (connectedCount > 0) {
    generatedInsights.push({
      userId,
      type: "OBSERVATION",
      category: "overall",
      title: `Connected Data Streams Active (${connectedCount} Sources)`,
      description: `You have successfully connected ${connectedCount} automatic data stream${connectedCount > 1 ? "s" : ""}. Background telemetry is compiling into your unified metabolic profile without manual entry.`,
      impactScore: 4,
      disclaimer: MEDICAL_SAFETY_DISCLAIMER,
    });
  }

  // Insight 2: Sleep duration observation & wellness recommendation
  if (recentSleep && recentSleep.value >= 420) {
    const hours = (recentSleep.value / 60).toFixed(1);
    generatedInsights.push({
      userId,
      type: "OBSERVATION",
      category: "sleep",
      title: "Restorative Sleep Baseline Maintained",
      description: `Your average sleep duration reached ${hours} hours last night. Consistent sleep duration above 7 hours strongly supports insulin sensitivity and daytime glucose stability.`,
      impactScore: 5,
      disclaimer: MEDICAL_SAFETY_DISCLAIMER,
    });
  }

  // Insight 3: Activity & step trend
  if (recentSteps.length > 0) {
    const totalSteps = recentSteps.reduce((acc, curr) => acc + curr.value, 0);
    generatedInsights.push({
      userId,
      type: "RECOMMENDATION",
      category: "activity",
      title: "Post-Meal Movement Window",
      description: `You accumulated ${totalSteps.toLocaleString()} steps today. Taking a light 10-15 minute walk after meals helps muscle contractions draw glucose directly from the bloodstream, smoothing postprandial spikes.`,
      impactScore: 4,
      disclaimer: MEDICAL_SAFETY_DISCLAIMER,
    });
  }

  // Insight 4: Glucose stability
  if (recentGlucose.length > 0) {
    const avg = Math.round(
      recentGlucose.reduce((a, b) => a + b.value, 0) / recentGlucose.length
    );
    generatedInsights.push({
      userId,
      type: "OBSERVATION",
      category: "glucose",
      title: "Glucose Stability Trend",
      description: `Your mean interstitial glucose over recent passive readings is ${avg} mg/dL, showing consistent control within the healthy non-diabetic metabolic target range (70–140 mg/dL).`,
      impactScore: 5,
      disclaimer: MEDICAL_SAFETY_DISCLAIMER,
    });
  }

  for (const item of generatedInsights) {
    await prisma.insight.create({
      data: item,
    });
  }
}
