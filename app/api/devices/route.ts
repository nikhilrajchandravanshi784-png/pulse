import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserDataSources } from "@/services/health/providerService";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dataSources = await getUserDataSources(session.userId);
    const devices = await prisma.device.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      dataSources,
      devices,
    });
  } catch (error) {
    console.error("Fetch devices error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve connected devices" },
      { status: 500 }
    );
  }
}
