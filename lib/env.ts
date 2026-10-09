import { z } from "zod";

/**
 * Pulse Health Centralized Environment Configuration & Validator.
 * Validates critical environment variables at startup and provides
 * safe helpers for health provider configurations.
 */

const envSchema = z.object({
  APP_NAME: z.string().default("Pulse Health"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 characters for secure JWT signing"),
  AUTH_SESSION_MAX_AGE: z.coerce.number().default(2592000), // 30 days
  DEMO_MODE: z.enum(["true", "false"]).default("true"),

  // Health Providers (Optional OAuth configs)
  APPLE_HEALTH_CLIENT_ID: z.string().optional(),
  APPLE_HEALTH_CLIENT_SECRET: z.string().optional(),
  APPLE_HEALTH_REDIRECT_URI: z.string().optional(),

  GOOGLE_HEALTH_CLIENT_ID: z.string().optional(),
  GOOGLE_HEALTH_CLIENT_SECRET: z.string().optional(),
  GOOGLE_HEALTH_REDIRECT_URI: z.string().optional(),

  FITBIT_CLIENT_ID: z.string().optional(),
  FITBIT_CLIENT_SECRET: z.string().optional(),
  FITBIT_REDIRECT_URI: z.string().optional(),

  GARMIN_CLIENT_ID: z.string().optional(),
  GARMIN_CLIENT_SECRET: z.string().optional(),
  GARMIN_REDIRECT_URI: z.string().optional(),

  OURA_CLIENT_ID: z.string().optional(),
  OURA_CLIENT_SECRET: z.string().optional(),
  OURA_REDIRECT_URI: z.string().optional(),

  // Groq AI Integration
  GROQ_API_KEY: z.string().optional(),

  // AI & Services (existing)
  AI_API_KEY: z.string().optional(),
  AI_API_BASE_URL: z.string().default("https://generativelanguage.googleapis.com/v1beta"),
  AI_MODEL: z.string().default("openai/gpt-oss-120b"),

  // Food AI Recognition Provider
  FOOD_AI_PROVIDER: z.enum(["groq", "gemini", "openai", "demo"]).default("groq"),
  FOOD_AI_API_KEY: z.string().optional(),
  FOOD_AI_API_BASE_URL: z.string().default("https://generativelanguage.googleapis.com/v1beta"),
  FOOD_AI_MODEL: z.string().default("qwen/qwen3.8-27b"),

  // Nutrition Database Provider
  NUTRITION_PROVIDER: z.enum(["usda", "demo"]).default("demo"),
  NUTRITION_API_KEY: z.string().optional(), // USDA FoodData Central API key

  // Food Image Storage
  FOOD_IMAGE_MAX_SIZE_MB: z.string().default("8"),

  // Community Moderation Provider
  COMMUNITY_MODERATION_PROVIDER: z.enum(["groq", "gemini", "rules_fallback"]).default("rules_fallback"),
  COMMUNITY_MODERATION_API_KEY: z.string().optional(),
  COMMUNITY_MODERATION_API_BASE_URL: z.string().default("https://api.groq.com/openai/v1"),
  COMMUNITY_MODERATION_MODEL: z.string().default("llama-3.3-70b-versatile"),

  // Pulse Proactive Care Engine
  PROACTIVE_AI_PROVIDER: z.enum(["groq", "gemini", "rules_fallback"]).default("rules_fallback"),
  PROACTIVE_AI_API_KEY: z.string().optional(),
  PROACTIVE_AI_MODEL: z.string().default("llama-3.3-70b-versatile"),
  PROACTIVE_MAX_DAILY_INTERVENTIONS: z.coerce.number().default(2),
  PROACTIVE_COOLDOWN_HOURS: z.coerce.number().default(4),
  SCHEDULER_SECRET: z.string().optional(),
  NOTIFICATION_PROVIDER: z.enum(["in_app", "email", "push"]).default("in_app"),

  // Analytics
  ANALYTICS_WRITE_KEY: z.string().optional(),
  NEXT_PUBLIC_ANALYTICS_ENABLED: z.string().default("true"),

  // Payment & Subscription Gateway (Razorpay Recurring INR)
  PAYMENT_PROVIDER: z.enum(["razorpay", "mock"]).default("razorpay"),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_PLAN_ID: z.string().optional(),
});

function parseEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("❌ Environment validation error in Pulse Health:", result.error.format());
    // In production, throw to halt insecure startups; in dev, provide fallbacks
    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid production environment configuration");
    }
  }
  return result.success ? result.data : (process.env as unknown as z.infer<typeof envSchema>);
}

export const env = parseEnv();

export const isDemoMode = env.DEMO_MODE === "true";

export interface ProviderCapability {
  providerKey: string;
  name: string;
  category: "WEARABLE" | "GLUCOSE" | "BODY_SCALE";
  isConfigured: boolean;
  isMockOnly: boolean;
  description: string;
}

export function getProviderCapabilities(): Record<string, ProviderCapability> {
  return {
    apple_health: {
      providerKey: "apple_health",
      name: "Apple Health",
      category: "WEARABLE",
      isConfigured: Boolean(env.APPLE_HEALTH_CLIENT_ID && env.APPLE_HEALTH_CLIENT_SECRET),
      isMockOnly: !Boolean(env.APPLE_HEALTH_CLIENT_ID && env.APPLE_HEALTH_CLIENT_SECRET),
      description: "Passive background collection for Steps, Active Energy, Heart Rate, and Sleep.",
    },
    google_health: {
      providerKey: "google_health",
      name: "Google Health Connect",
      category: "WEARABLE",
      isConfigured: Boolean(env.GOOGLE_HEALTH_CLIENT_ID && env.GOOGLE_HEALTH_CLIENT_SECRET),
      isMockOnly: !Boolean(env.GOOGLE_HEALTH_CLIENT_ID && env.GOOGLE_HEALTH_CLIENT_SECRET),
      description: "Unified Android wearable and sensor synchronization with Health Connect API.",
    },
    fitbit: {
      providerKey: "fitbit",
      name: "Fitbit",
      category: "WEARABLE",
      isConfigured: Boolean(env.FITBIT_CLIENT_ID && env.FITBIT_CLIENT_SECRET),
      isMockOnly: !Boolean(env.FITBIT_CLIENT_ID && env.FITBIT_CLIENT_SECRET),
      description: "Continuous step cadence, sleep stages, resting heart rate, and SpO2.",
    },
    garmin: {
      providerKey: "garmin",
      name: "Garmin Health",
      category: "WEARABLE",
      isConfigured: Boolean(env.GARMIN_CLIENT_ID && env.GARMIN_CLIENT_SECRET),
      isMockOnly: !Boolean(env.GARMIN_CLIENT_ID && env.GARMIN_CLIENT_SECRET),
      description: "Continuous HRV status, training load, body battery, and VO2 max telemetry.",
    },
    oura: {
      providerKey: "oura",
      name: "Oura Ring",
      category: "WEARABLE",
      isConfigured: Boolean(env.OURA_CLIENT_ID && env.OURA_CLIENT_SECRET),
      isMockOnly: !Boolean(env.OURA_CLIENT_ID && env.OURA_CLIENT_SECRET),
      description: "Sleep latency, readiness score, nocturnal HRV, and skin temperature variation.",
    },
    dexcom: {
      providerKey: "dexcom",
      name: "Dexcom CGM",
      category: "GLUCOSE",
      isConfigured: false, // Requires medical device API partner approval
      isMockOnly: true,
      description: "Continuous interstitial glucose readings every 5 minutes with trend arrows.",
    },
    withings: {
      providerKey: "withings",
      name: "Withings Smart Scale",
      category: "BODY_SCALE",
      isConfigured: false,
      isMockOnly: true,
      description: "Body composition telemetry: weight, vascular age, and body fat percentage.",
    },
  };
}
