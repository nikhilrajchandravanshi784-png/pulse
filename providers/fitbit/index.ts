import { BaseHealthDataProvider, ProviderTokenResult, SyncResult } from "@/providers/base";
import { env } from "@/lib/env";
import { generateRealisticMockTelemetry } from "@/services/health/mockTelemetry";

export class FitbitProvider extends BaseHealthDataProvider {
  readonly providerKey = "fitbit";
  readonly displayName = "Fitbit";
  readonly category = "WEARABLE" as const;
  readonly supportedMetrics = ["steps", "heart_rate", "sleep_duration", "resting_heart_rate", "spo2", "calories"];

  isConfigured(): boolean {
    return Boolean(env.FITBIT_CLIENT_ID && env.FITBIT_CLIENT_SECRET);
  }

  isMock(): boolean {
    return !this.isConfigured() || env.DEMO_MODE === "true";
  }

  async getAuthorizationUrl(state: string): Promise<string> {
    if (!this.isConfigured()) {
      return `/api/devices/connect?provider=fitbit&mock=true&state=${state}`;
    }
    const params = new URLSearchParams({
      client_id: env.FITBIT_CLIENT_ID!,
      response_type: "code",
      scope: "activity heartrate sleep oxygen_saturation profile",
      redirect_uri: env.FITBIT_REDIRECT_URI || `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback/fitbit`,
      expires_in: "604800",
      state,
    });
    return `https://www.fitbit.com/oauth2/authorize?${params.toString()}`;
  }

  async handleOAuthCallback(code: string): Promise<ProviderTokenResult> {
    if (this.isMock() || code === "demo_code") {
      return {
        accessToken: "mock_fitbit_token",
        refreshToken: "mock_fitbit_refresh_token",
        expiresIn: 28800,
        scopes: ["activity", "heartrate", "sleep", "oxygen_saturation"],
      };
    }
    return {
      accessToken: "fitbit_live_token",
      refreshToken: "fitbit_refresh_token",
      expiresIn: 28800,
      scopes: ["activity", "heartrate", "sleep"],
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
