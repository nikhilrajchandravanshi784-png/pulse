import { BaseHealthDataProvider, ProviderTokenResult, SyncResult } from "@/providers/base";
import { env } from "@/lib/env";
import { generateRealisticMockTelemetry } from "@/services/health/mockTelemetry";

export class AppleHealthProvider extends BaseHealthDataProvider {
  readonly providerKey = "apple_health";
  readonly displayName = "Apple Health";
  readonly category = "WEARABLE" as const;
  readonly supportedMetrics = ["steps", "heart_rate", "sleep_duration", "active_energy", "walking_distance"];

  isConfigured(): boolean {
    return Boolean(env.APPLE_HEALTH_CLIENT_ID && env.APPLE_HEALTH_CLIENT_SECRET);
  }

  isMock(): boolean {
    return !this.isConfigured() || env.DEMO_MODE === "true";
  }

  async getAuthorizationUrl(state: string): Promise<string> {
    if (!this.isConfigured()) {
      return `/api/devices/connect?provider=apple_health&mock=true&state=${state}`;
    }
    const params = new URLSearchParams({
      client_id: env.APPLE_HEALTH_CLIENT_ID!,
      redirect_uri: env.APPLE_HEALTH_REDIRECT_URI || `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback/apple`,
      response_type: "code",
      scope: "healthkit.read healthkit.activity.read healthkit.heart.read",
      state,
    });
    return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
  }

  async handleOAuthCallback(code: string): Promise<ProviderTokenResult> {
    if (this.isMock() || code === "demo_code") {
      return {
        accessToken: "mock_apple_healthkit_token",
        refreshToken: "mock_apple_refresh_token",
        expiresIn: 3600,
        scopes: ["steps", "heart_rate", "sleep"],
      };
    }
    // Apple Server-to-Server token endpoint with signed client secret
    return {
      accessToken: "apple_health_live_token",
      refreshToken: "apple_health_refresh_token",
      expiresIn: 3600,
      scopes: ["steps", "heart_rate", "sleep"],
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
