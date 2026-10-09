import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const checkinSchema = z.object({
  mood: z.enum(["Great", "Good", "Okay", "Low", "Bad"]),
  energyLevel: z.number().min(1).max(5).optional(),
  stressLevel: z.number().min(1).max(5).optional(),
  note: z.string().max(280).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = checkinSchema.parse(body);

    const todayStr = new Date().toISOString().split("T")[0];

    const checkIn = await prisma.dailyCheckIn.upsert({
      where: {
        userId_date: {
          userId: session.userId,
          date: todayStr,
        },
      },
      update: {
        mood: validated.mood,
        energyLevel: validated.energyLevel || 4,
        stressLevel: validated.stressLevel || 2,
        note: validated.note || null,
      },
      create: {
        userId: session.userId,
        date: todayStr,
        mood: validated.mood,
        energyLevel: validated.energyLevel || 4,
        stressLevel: validated.stressLevel || 2,
        note: validated.note || null,
      },
    });

    return NextResponse.json({
      success: true,
      checkIn,
      message: "Daily health check-in logged",
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Invalid checkin data" },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: "Failed to record daily checkin" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const checkIn = await prisma.dailyCheckIn.findUnique({
      where: {
        userId_date: {
          userId: session.userId,
          date: todayStr,
        },
      },
    });

    return NextResponse.json({
      success: true,
      hasCheckedInToday: Boolean(checkIn),
      checkIn,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to check daily status" }, { status: 500 });
  }
}
