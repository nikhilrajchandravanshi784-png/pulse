import { NextResponse } from "next/server";
import { resolveProactiveUser } from "@/lib/proactiveCareAuth";
import { prisma } from "@/lib/db";
import { NotificationPolicyService } from "@/services/proactiveCare";

export async function GET() {
  try {
    const auth = await resolveProactiveUser();
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = await NotificationPolicyService.getPreferences(auth.userId);
    return NextResponse.json({ preferences });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch preferences" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await resolveProactiveUser();
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      enabled,
      preferredLanguage,
      preferredChannel,
      quietHoursStart,
      quietHoursEnd,
      maxDailyInterventions,
      cooldownHours,
    } = body;

    const updated = await prisma.proactiveNotificationPreference.upsert({
      where: { userId: auth.userId },
      create: {
        userId: auth.userId,
        enabled: enabled ?? true,
        preferredLanguage: preferredLanguage || "hi",
        preferredChannel: preferredChannel || "IN_APP",
        quietHoursStart: quietHoursStart || "22:00",
        quietHoursEnd: quietHoursEnd || "07:00",
        maxDailyInterventions: maxDailyInterventions ?? 2,
        cooldownHours: cooldownHours ?? 4,
      },
      update: {
        ...(enabled !== undefined && { enabled }),
        ...(preferredLanguage && { preferredLanguage }),
        ...(preferredChannel && { preferredChannel }),
        ...(quietHoursStart !== undefined && { quietHoursStart }),
        ...(quietHoursEnd !== undefined && { quietHoursEnd }),
        ...(maxDailyInterventions !== undefined && { maxDailyInterventions }),
        ...(cooldownHours !== undefined && { cooldownHours }),
      },
    });

    return NextResponse.json({ preferences: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update preferences" }, { status: 400 });
  }
}
