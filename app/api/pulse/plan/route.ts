import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const carePlan = await prisma.carePlan.findFirst({
      where: { patientId: session.userId, status: "ACTIVE" },
      include: {
        goals: { orderBy: { createdAt: "asc" } },
        versions: { orderBy: { versionNumber: "desc" }, take: 3 },
      },
    });

    const goals = await prisma.healthGoal.findMany({
      where: { userId: session.userId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });

    const patientProfile = await prisma.patientProfile.findUnique({
      where: { userId: session.userId },
    });

    return NextResponse.json({
      success: true,
      carePlan,
      goals,
      patientProfile,
    });
  } catch (error) {
    console.error("Pulse plan fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch care plan" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { instructions, monitoringSchedule, dietGuidance, activityGuidance, goals } = body;

    // Create or update active care plan
    const carePlan = await prisma.carePlan.create({
      data: {
        patientId: session.userId,
        instructions: instructions || "Follow Mediterranean/Indian whole-grain diabetic meal plan and brisk walking.",
        monitoringSchedule: monitoringSchedule || "Fasting 3x/week, Post-prandial 2x/week",
        dietGuidance: dietGuidance || "Low glycemic index, plate method, portion controlled rotis",
        activityGuidance: activityGuidance || "15-minute post-meal walk 5 days/week",
        status: "ACTIVE",
      },
    });

    // Create SMART goals if passed
    if (goals && Array.isArray(goals)) {
      for (const g of goals) {
        await prisma.healthGoal.create({
          data: {
            userId: session.userId,
            carePlanId: carePlan.id,
            title: g.title,
            titleHindi: g.titleHindi || null,
            reason: g.reason || "Support glycemic stability",
            frequency: g.frequency || "5 days/week",
            preferredTime: g.preferredTime || "After lunch",
            targetDurationMin: g.targetDurationMin || 10,
            isPrimary: Boolean(g.isPrimary),
            patientStatus: "ACCEPTED",
            clinicianStatus: "APPROVED",
          },
        });
      }
    }

    return NextResponse.json({ success: true, carePlan });
  } catch (error) {
    console.error("Pulse plan create error:", error);
    return NextResponse.json({ error: "Failed to create care plan" }, { status: 500 });
  }
}
