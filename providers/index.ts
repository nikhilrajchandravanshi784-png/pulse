import { BaseHealthDataProvider } from "./base";
import { AppleHealthProvider } from "./apple";
import { HealthConnectProvider } from "./google";
import { FitbitProvider } from "./fitbit";
import { GarminProvider } from "./garmin";
import { OuraProvider } from "./oura";

const providersRegistry: Record<string, BaseHealthDataProvider> = {
  apple_health: new AppleHealthProvider(),
  google_health: new HealthConnectProvider(),
  fitbit: new FitbitProvider(),
  garmin: new GarminProvider(),
  oura: new OuraProvider(),
};

export function getHealthProvider(providerKey: string): BaseHealthDataProvider | null {
  return providersRegistry[providerKey] || null;
}

export function getAllHealthProviders(): BaseHealthDataProvider[] {
  return Object.values(providersRegistry);
}

export * from "./base";
export * from "./apple";
export * from "./google";
export * from "./fitbit";
export * from "./garmin";
export * from "./oura";
