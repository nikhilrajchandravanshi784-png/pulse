import { prisma } from "@/lib/db";
import { getHealthProvider } from "@/providers";
import { ingestHealthMetrics } from "./healthDataService";

export async function syncUserDevice(userId: string, providerKey: string) {
  const provider = getHealthProvider(providerKey);
  if (!provider) {
    throw new Error(`Unknown health data provider: ${providerKey}`);
  }

  // Set status to SYNCING
  await prisma.dataSource.updateMany({
    where: { userId, providerKey },
    data: { lastSyncStatus: "SYNCING" },
  });

  try {
    const result = await provider.fetchLatestMetrics(userId);
    const count = await ingestHealthMetrics(userId, result.metrics);

    // Update status to SUCCESS
    await prisma.dataSource.updateMany({
      where: { userId, providerKey },
      data: {
        lastSyncStatus: "SUCCESS",
        lastSyncAt: new Date(),
        errorMessage: null,
      },
    });

    await prisma.device.updateMany({
      where: { userId, provider: providerKey },
      data: {
        lastSyncAt: new Date(),
        status: "CONNECTED",
      },
    });

    return {
      success: true,
      providerKey,
      metricsIngested: count,
      isMockData: result.isMockData,
      lastSyncAt: new Date(),
    };
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Sync failed";
    await prisma.dataSource.updateMany({
      where: { userId, providerKey },
      data: {
        lastSyncStatus: "ERROR",
        errorMessage: errMessage,
      },
    });
    throw error;
  }
}

export async function syncAllUserDevices(userId: string) {
  const activeSources = await prisma.dataSource.findMany({
    where: { userId, isConnected: true },
  });

  const results = [];
  for (const src of activeSources) {
    try {
      const res = await syncUserDevice(userId, src.providerKey);
      results.push(res);
    } catch {
      results.push({ providerKey: src.providerKey, success: false });
    }
  }

  return results;
}
