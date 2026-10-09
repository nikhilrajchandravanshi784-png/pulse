import { HealthMetricData } from "@/types/health";

/**
 * Realistic Physiological Telemetry Generator
 * Used for development, sandbox testing, and demo mode when live hardware OAuth is not connected.
 * ALL generated data points carry explicit isDemoData flags to maintain medical and ethical integrity.
 */

export function generateRealisticMockTelemetry(
  userId: string,
  providerKey: string,
  deviceId?: string,
  hoursBack: number = 24
): HealthMetricData[] {
  const metrics: HealthMetricData[] = [];
  const now = new Date();

  // 1. Glucose readings (every 15-30 minutes for realistic CGM stream)
  const glucoseIntervalMinutes = 30;
  const totalGlucosePoints = (hoursBack * 60) / glucoseIntervalMinutes;

  for (let i = totalGlucosePoints; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * glucoseIntervalMinutes * 60 * 1000);
    const hour = timestamp.getHours();

    // Circadian / postprandial curve baseline
    let baseGlucose = 92;
    let context = "fasting";

    if (hour >= 8 && hour <= 10) {
      baseGlucose = 124; // Breakfast curve
      context = "postprandial_breakfast";
    } else if (hour >= 13 && hour <= 15) {
      baseGlucose = 118; // Lunch curve
      context = "postprandial_lunch";
    } else if (hour >= 19 && hour <= 21) {
      baseGlucose = 132; // Dinner curve
      context = "postprandial_dinner";
    } else if (hour >= 0 && hour <= 6) {
      baseGlucose = 86; // Nocturnal stability
      context = "overnight";
    }

    // Add mild natural biological noise (+/- 4 mg/dL)
    const noise = Math.sin(i * 0.4) * 6 + ((i % 3) - 1) * 2;
    const value = Math.round(baseGlucose + noise);

    metrics.push({
      userId,
      deviceId: deviceId || null,
      source: providerKey,
      metricType: "glucose",
      value,
      unit: "mg/dL",
      timestamp,
      metadata: {
        isDemoData: true,
        context,
        trendArrow: value > 115 ? "FLAT_UP" : "FLAT",
        sensorType: "Interstitial Glucose Sensor",
      },
    });
  }

  // 2. Heart Rate telemetry (hourly checkpoints)
  for (let i = hoursBack; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = timestamp.getHours();

    let bpm = 68;
    if (hour >= 0 && hour <= 6) {
      bpm = 54 + (i % 4); // Resting sleep HR
    } else if (hour === 7 || hour === 18) {
      bpm = 114 + (i % 12); // Workout / commute spike
    } else {
      bpm = 72 + (i % 8);
    }

    metrics.push({
      userId,
      deviceId: deviceId || null,
      source: providerKey,
      metricType: "heart_rate",
      value: bpm,
      unit: "bpm",
      timestamp,
      metadata: {
        isDemoData: true,
        restingHeartRate: 58,
        motionArtifactFiltered: true,
      },
    });
  }

  // 3. Step counts (hourly buckets during waking hours)
  for (let i = hoursBack; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = timestamp.getHours();
    let steps = 0;

    if (hour >= 7 && hour <= 22) {
      if (hour === 7) steps = 1850; // Morning walk
      else if (hour === 12) steps = 1420; // Lunch walk
      else if (hour === 18) steps = 2300; // Evening workout
      else steps = 350 + (i % 200);
    }

    if (steps > 0) {
      metrics.push({
        userId,
        deviceId: deviceId || null,
        source: providerKey,
        metricType: "steps",
        value: steps,
        unit: "count",
        timestamp,
        metadata: {
          isDemoData: true,
          cadence: 105,
        },
      });
    }
  }

  // 4. Sleep metrics (recorded for previous night)
  const lastNight = new Date(now.getTime() - 14 * 60 * 60 * 1000);
  metrics.push({
    userId,
    deviceId: deviceId || null,
    source: providerKey,
    metricType: "sleep_duration",
    value: 452, // 7h 32m
    unit: "minutes",
    timestamp: lastNight,
    metadata: {
      isDemoData: true,
      deepSleepMinutes: 94,
      remSleepMinutes: 110,
      lightSleepMinutes: 248,
      efficiencyScore: 89,
    },
  });

  // 5. Weight & body composition
  const morningWeightTime = new Date(now.getTime() - 10 * 60 * 60 * 1000);
  metrics.push({
    userId,
    deviceId: deviceId || null,
    source: providerKey,
    metricType: "weight",
    value: 74.8,
    unit: "kg",
    timestamp: morningWeightTime,
    metadata: {
      isDemoData: true,
      bodyFatPercentage: 18.4,
      impedanceOhms: 540,
    },
  });

  return metrics;
}
