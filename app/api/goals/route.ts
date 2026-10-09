import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

const goalSchema = z.object({
  title: z.string().min(2, "Goal title required"),
  category: z.string().default("metabolic"),
  isPrimary: z.boolean().default(false),
  targetValue: z.number().optional(),
  targetUnit: z.string().optional(),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const goals = await prisma.healthGoal.findMany({
      where: { userId: session.userId },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ success: true, goals });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch goals" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = goalSchema.parse(body);

    const goal = await prisma.healthGoal.create({
      data: {
        userId: session.userId,
        title: validated.title,
        category: validated.category,
        isPrimary: validated.isPrimary,
        targetValue: validated.targetValue || null,
        targetUnit: validated.targetUnit || null,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ success: true, goal });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 422 });
    }
    return NextResponse.json({ error: "Failed to create goal" }, { status: 500 });
  }
}
