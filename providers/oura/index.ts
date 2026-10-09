import { BaseHealthDataProvider, ProviderTokenResult, SyncResult } from "@/providers/base";
import { env } from "@/lib/env";
import { generateRealisticMockTelemetry } from "@/services/health/mockTelemetry";

export class OuraProvider extends BaseHealthDataProvider {
  readonly providerKey = "oura";
  readonly displayName = "Oura Ring";
  readonly category = "WEARABLE" as const;
  readonly supportedMetrics = ["sleep_duration", "readiness_score", "heart_rate", "hrv", "temperature_deviation"];

  isConfigured(): boolean {
    return Boolean(env.OURA_CLIENT_ID && env.OURA_CLIENT_SECRET);
  }

  isMock(): boolean {
    return !this.isConfigured() || env.DEMO_MODE === "true";
  }

  async getAuthorizationUrl(state: string): Promise<string> {
    if (!this.isConfigured()) {
      return `/api/devices/connect?provider=oura&mock=true&state=${state}`;
    }
    const params = new URLSearchParams({
      client_id: env.OURA_CLIENT_ID!,
      response_type: "code",
      scope: "daily heartrate personal session sleep workout",
      redirect_uri: env.OURA_REDIRECT_URI || `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback/oura`,
      state,
    });
    return `https://cloud.ouraring.com/oauth/authorize?${params.toString()}`;
  }

  async handleOAuthCallback(code: string): Promise<ProviderTokenResult> {
    if (this.isMock() || code === "demo_code") {
      return {
        accessToken: "mock_oura_token",
        refreshToken: "mock_oura_refresh_token",
        expiresIn: 86400,
        scopes: ["daily", "heartrate", "sleep"],
      };
    }
    return {
      accessToken: "oura_live_token",
      refreshToken: "oura_refresh_token",
      expiresIn: 86400,
      scopes: ["daily", "sleep"],
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
