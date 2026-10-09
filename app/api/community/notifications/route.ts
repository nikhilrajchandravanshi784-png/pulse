import { NextResponse } from "next/server";
import { resolveCommunityUser } from "@/lib/communityAuth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authContext = await resolveCommunityUser();
    if (!authContext?.userId) {
      return NextResponse.json({ notifications: [] });
    }

    const notifications = await prisma.communityNotification.findMany({
      where: { userId: authContext.userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authContext = await resolveCommunityUser();
    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { id } = body as { id?: string };

    if (id) {
      await prisma.communityNotification.updateMany({
        where: { id, userId: authContext.userId },
        data: { isRead: true },
      });
    } else {
      await prisma.communityNotification.updateMany({
        where: { userId: authContext.userId, isRead: false },
        data: { isRead: true },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 });
  }
}
