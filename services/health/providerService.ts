import { prisma } from "@/lib/db";
import { getHealthProvider } from "@/providers";
import { getProviderCapabilities } from "@/lib/env";

export async function getUserDataSources(userId: string) {
  const sources = await prisma.dataSource.findMany({
    where: { userId },
  });

  const capabilities = getProviderCapabilities();

  // Combine user sources with full catalog
  const catalog = Object.values(capabilities).map((cap) => {
    const existing = sources.find((s) => s.providerKey === cap.providerKey);
    return {
      providerKey: cap.providerKey,
      displayName: cap.name,
      category: cap.category,
      isConnected: existing ? existing.isConnected : false,
      isMock: existing ? existing.isMock : cap.isMockOnly,
      lastSyncStatus: existing ? existing.lastSyncStatus : "IDLE",
      lastSyncAt: existing?.lastSyncAt || null,
      errorMessage: existing?.errorMessage || null,
      description: cap.description,
      isConfigured: cap.isConfigured,
    };
  });

  return catalog;
}

export async function connectProvider(
  userId: string,
  providerKey: string,
  scopes: string[] = ["activity", "heart_rate", "sleep", "glucose"]
) {
  const provider = getHealthProvider(providerKey);
  const capabilities = getProviderCapabilities();
  const cap = capabilities[providerKey];

  const isMock = provider ? provider.isMock() : true;

  // Record explicit consent record first
  await prisma.consentRecord.create({
    data: {
      userId,
      providerKey,
      dataCategories: JSON.stringify(scopes),
      purpose: "Metabolic health analysis, unified profile aggregation, and care team review",
      explicitConsent: true,
      consentedAt: new Date(),
    },
  });

  // Upsert DataSource
  const source = await prisma.dataSource.upsert({
    where: {
      id: (await prisma.dataSource.findFirst({ where: { userId, providerKey } }))?.id || "temp-id",
    },
    update: {
      isConnected: true,
      isMock,
      scopesGranted: JSON.stringify(scopes),
      lastSyncStatus: "SUCCESS",
      lastSyncAt: new Date(),
      errorMessage: null,
    },
    create: {
      userId,
      providerKey,
      displayName: cap?.name || providerKey,
      category: cap?.category || "WEARABLE",
      isConnected: true,
      isMock,
      scopesGranted: JSON.stringify(scopes),
      lastSyncStatus: "SUCCESS",
      lastSyncAt: new Date(),
    },
  });

  // Also register a Device record
  const deviceNames: Record<string, string> = {
    apple_health: "Apple Watch Series 9",
    google_health: "Pixel Watch 2",
    fitbit: "Fitbit Sense 2",
    garmin: "Garmin Forerunner 965",
    oura: "Oura Ring Gen 3",
    dexcom: "Dexcom G7 CGM",
    withings: "Withings Body Comp",
  };

  await prisma.device.create({
    data: {
      userId,
      provider: providerKey,
      deviceName: deviceNames[providerKey] || `${providerKey} Sensor`,
      status: "CONNECTED",
      lastSyncAt: new Date(),
      batteryLevel: 88,
      firmwareVersion: "v4.2.1-prod",
    },
  });

  return source;
}

export async function disconnectProvider(userId: string, providerKey: string) {
  // Update data source
  const source = await prisma.dataSource.findFirst({
    where: { userId, providerKey },
  });

  if (source) {
    await prisma.dataSource.update({
      where: { id: source.id },
      data: {
        isConnected: false,
        lastSyncStatus: "IDLE",
        accessToken: null,
        refreshToken: null,
      },
    });
  }

  // Update associated devices
  await prisma.device.updateMany({
    where: { userId, provider: providerKey },
    data: {
      status: "DISCONNECTED",
    },
  });

  // Mark consent as revoked
  await prisma.consentRecord.updateMany({
    where: { userId, providerKey, isRevoked: false },
    data: {
      isRevoked: true,
      revokedAt: new Date(),
    },
  });

  return true;
}
