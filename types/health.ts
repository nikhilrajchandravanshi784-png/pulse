export type HealthMetricType =
  | "glucose"
  | "heart_rate"
  | "resting_heart_rate"
  | "steps"
  | "sleep_duration"
  | "sleep_quality"
  | "weight"
  | "body_fat"
  | "activity"
  | "active_minutes"
  | "calories"
  | "hrv"
  | "spo2"
  | "blood_pressure_systolic"
  | "blood_pressure_diastolic";

export type MetricUnit =
  | "mg/dL"
  | "bpm"
  | "count"
  | "minutes"
  | "hours"
  | "kg"
  | "lbs"
  | "%"
  | "kcal"
  | "ms"
  | "mmHg";

export interface HealthMetricData {
  id?: string;
  userId: string;
  deviceId?: string | null;
  source: string;
  metricType: HealthMetricType;
  value: number;
  unit: MetricUnit;
  timestamp: string | Date;
  metadata?: Record<string, unknown> | null;
  createdAt?: string | Date;
}

export type DeviceStatus = "CONNECTED" | "DISCONNECTED" | "ERROR" | "SYNCING";

export interface DeviceInfo {
  id: string;
  userId: string;
  provider: string;
  deviceName: string;
  deviceModel?: string | null;
  status: DeviceStatus;
  lastSyncAt?: string | Date | null;
  batteryLevel?: number | null;
  firmwareVersion?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface DataSourceInfo {
  id: string;
  userId: string;
  providerKey: string;
  displayName: string;
  category: "WEARABLE" | "GLUCOSE" | "BODY_SCALE";
  isConnected: boolean;
  isMock: boolean;
  scopesGranted: string[];
  lastSyncStatus: "IDLE" | "SYNCING" | "SUCCESS" | "ERROR";
  lastSyncAt?: string | Date | null;
  errorMessage?: string | null;
}

export interface DailySummaryData {
  date: string;
  avgGlucose?: number | null;
  glucoseTimeInRange?: number | null;
  totalSteps?: number | null;
  avgHeartRate?: number | null;
  restingHeartRate?: number | null;
  sleepDurationMinutes?: number | null;
  sleepQualityScore?: number | null;
  weightKg?: number | null;
  activeMinutes?: number | null;
  burnedCalories?: number | null;
  dataCompletenessScore?: number | null;
}

export type InsightType = "OBSERVATION" | "RECOMMENDATION" | "MILESTONE" | "SAFETY_ALERT";

export interface HealthInsight {
  id: string;
  userId: string;
  type: InsightType;
  category: "glucose" | "sleep" | "activity" | "metabolic" | "overall";
  title: string;
  description: string;
  impactScore: number;
  isRead: boolean;
  isDismissed: boolean;
  disclaimer: string;
  createdAt: string | Date;
}

export interface HealthGoalItem {
  id: string;
  userId: string;
  title: string;
  category: string;
  isPrimary: boolean;
  targetValue?: number | null;
  targetUnit?: string | null;
  status: "ACTIVE" | "COMPLETED" | "PAUSED";
  createdAt: string | Date;
}

export interface TimelineEvent {
  id: string;
  timestamp: string | Date;
  timeFormatted: string;
  title: string;
  subtitle: string;
  source: string;
  sourceLabel: string;
  category: "sleep" | "nutrition" | "glucose" | "activity" | "heart" | "care_team";
  iconName: string;
  badgeColor: string;
}

export interface OnboardingPayload {
  step: number;
  personal?: {
    fullName: string;
    dateOfBirth: string;
    biologicalSex: "male" | "female" | "other" | "prefer_not_to_say";
    heightCm: number;
    weightKg: number;
    country: string;
  };
  medical?: {
    existingConditions: string[];
    previousDiagnoses: string[];
    allergies: string[];
    currentMedications: string[];
    previousSurgeries: string[];
    familyMedicalHistory: string[];
    additionalNotes?: string;
    preferNotToSay: boolean;
  };
  goals?: {
    primaryGoals: string[];
    secondaryGoals: string[];
  };
  lifestyle?: {
    dietaryPreference: string;
    typicalMeals: string;
    mealTiming: string;
    exerciseFrequency: string;
    sleepSchedule: string;
    workActivityPattern: string;
    smokingStatus: string;
    alcoholConsumption: string;
  };
  connectedProviders?: string[];
  consent?: {
    categories: string[];
    explicitConsent: boolean;
    purpose: string;
  };
}
