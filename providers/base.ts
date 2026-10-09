import { HealthMetricData } from "@/types/health";

export interface ProviderTokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scopes?: string[];
}

export interface SyncResult {
  providerKey: string;
  isMockData: boolean;
  metricsIngested: number;
  startTime: Date;
  endTime: Date;
  metrics: HealthMetricData[];
  errors?: string[];
}

export abstract class BaseHealthDataProvider {
  abstract readonly providerKey: string;
  abstract readonly displayName: string;
  abstract readonly category: "WEARABLE" | "GLUCOSE" | "BODY_SCALE";
  abstract readonly supportedMetrics: string[];

  abstract isConfigured(): boolean;
  abstract isMock(): boolean;

  abstract getAuthorizationUrl(state: string): Promise<string>;

  abstract handleOAuthCallback(code: string): Promise<ProviderTokenResult>;

  abstract fetchLatestMetrics(userId: string, deviceId?: string): Promise<SyncResult>;

  abstract revokeAccess(userId: string): Promise<boolean>;
}
