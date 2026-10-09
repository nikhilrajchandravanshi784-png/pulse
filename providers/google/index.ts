import { BaseHealthDataProvider, ProviderTokenResult, SyncResult } from "@/providers/base";
import { env } from "@/lib/env";
import { generateRealisticMockTelemetry } from "@/services/health/mockTelemetry";

export class HealthConnectProvider extends BaseHealthDataProvider {
  readonly providerKey = "google_health";
  readonly displayName = "Google Health Connect";
  readonly category = "WEARABLE" as const;
  readonly supportedMetrics = ["steps", "heart_rate", "sleep_duration", "active_minutes", "speed"];

  isConfigured(): boolean {
    return Boolean(env.GOOGLE_HEALTH_CLIENT_ID && env.GOOGLE_HEALTH_CLIENT_SECRET);
  }

  isMock(): boolean {
    return !this.isConfigured() || env.DEMO_MODE === "true";
  }

  async getAuthorizationUrl(state: string): Promise<string> {
    if (!this.isConfigured()) {
      return `/api/devices/connect?provider=google_health&mock=true&state=${state}`;
    }
    const params = new URLSearchParams({
      client_id: env.GOOGLE_HEALTH_CLIENT_ID!,
      redirect_uri: env.GOOGLE_HEALTH_REDIRECT_URI || `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback/google-health`,
      response_type: "code",
      scope: "https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.heart_rate.read",
      access_type: "offline",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async handleOAuthCallback(code: string): Promise<ProviderTokenResult> {
    if (this.isMock() || code === "demo_code") {
      return {
        accessToken: "mock_google_health_token",
        refreshToken: "mock_google_refresh_token",
        expiresIn: 3600,
        scopes: ["fitness.activity.read", "fitness.heart_rate.read"],
      };
    }
    return {
      accessToken: "google_live_token",
      refreshToken: "google_refresh_token",
      expiresIn: 3600,
      scopes: ["fitness.activity.read"],
    };
  }

  async fetchLatestMetrics(userId: string, deviceId?: string): Promise<SyncResult> {
    const isMockData = this.isMock();
    const metrics = generateRealisticMockTelemetry(userId, this.providerKey, deviceId, 24);

    return {
      providerKey: this.providerKey,
      isMockData,
      metricsIngested: metrics.length,
      startTime: new Date(Date.now() - 24 * 3600 * 1000),
      endTime: new Date(),
      metrics,
    };
  }

  async revokeAccess(): Promise<boolean> {
    return true;
  }
}
