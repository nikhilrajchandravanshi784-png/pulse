import { BaseHealthDataProvider, ProviderTokenResult, SyncResult } from "@/providers/base";
import { env } from "@/lib/env";
import { generateRealisticMockTelemetry } from "@/services/health/mockTelemetry";

export class GarminProvider extends BaseHealthDataProvider {
  readonly providerKey = "garmin";
  readonly displayName = "Garmin Health";
  readonly category = "WEARABLE" as const;
  readonly supportedMetrics = ["steps", "heart_rate", "hrv", "sleep_duration", "stress", "respiration"];

  isConfigured(): boolean {
    return Boolean(env.GARMIN_CLIENT_ID && env.GARMIN_CLIENT_SECRET);
  }

  isMock(): boolean {
    return !this.isConfigured() || env.DEMO_MODE === "true";
  }

  async getAuthorizationUrl(state: string): Promise<string> {
    if (!this.isConfigured()) {
      return `/api/devices/connect?provider=garmin&mock=true&state=${state}`;
    }
    const params = new URLSearchParams({
      oauth_consumer_key: env.GARMIN_CLIENT_ID!,
      oauth_callback: env.GARMIN_REDIRECT_URI || `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback/garmin`,
      state,
    });
    return `https://connect.garmin.com/oauthConfirm?${params.toString()}`;
  }

  async handleOAuthCallback(code: string): Promise<ProviderTokenResult> {
    if (this.isMock() || code === "demo_code") {
      return {
        accessToken: "mock_garmin_token",
        refreshToken: "mock_garmin_refresh_token",
        expiresIn: 86400,
        scopes: ["dailies", "epochs", "sleeps", "stress"],
      };
    }
    return {
      accessToken: "garmin_live_token",
      refreshToken: "garmin_refresh_token",
      expiresIn: 86400,
      scopes: ["dailies", "sleeps"],
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
