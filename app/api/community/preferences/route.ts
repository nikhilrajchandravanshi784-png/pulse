import { NextResponse } from "next/server";
import { resolveCommunityUser } from "@/lib/communityAuth";
import { prisma } from "@/lib/db";
import { logCommunityAudit } from "@/services/community/moderationService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authContext = await resolveCommunityUser();
    if (!authContext?.userId) {
      return NextResponse.json({
        profile: { displayName: "Member", preferredLang: "hi", isModerator: false },
        preference: { notificationsEnabled: true, quietHoursStart: "22:00", quietHoursEnd: "07:00" },
      });
    }

    const [profile, preference] = await Promise.all([
      prisma.communityProfile.findUnique({ where: { userId: authContext.userId } }),
      prisma.communityPreference.findUnique({ where: { userId: authContext.userId } }),
    ]);

    return NextResponse.json({
      profile: profile || {
        displayName: authContext.user.name?.split(" ")[0] || "Member",
        preferredLang: authContext.user.preferredLang || "hi",
        isModerator: authContext.isModerator,
      },
      preference: preference || {
        notificationsEnabled: true,
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load preferences" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const authContext = await resolveCommunityUser();
    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { displayName, preferredLang, bio, interests, notificationsEnabled, quietHoursStart, quietHoursEnd } = body;

    // Update community profile
    if (displayName || preferredLang || bio !== undefined || interests !== undefined) {
      await prisma.communityProfile.upsert({
        where: { userId: authContext.userId },
        create: {
          userId: authContext.userId,
          displayName: displayName?.trim() || "Member",
          preferredLang: preferredLang || "hi",
          bio: bio?.trim() || null,
          interests: JSON.stringify(interests || []),
        },
        update: {
          displayName: displayName ? displayName.trim() : undefined,
          preferredLang: preferredLang || undefined,
          bio: bio !== undefined ? bio.trim() : undefined,
          interests: interests !== undefined ? JSON.stringify(interests) : undefined,
        },
      });
    }

    // Update preferences
    await prisma.communityPreference.upsert({
      where: { userId: authContext.userId },
      create: {
        userId: authContext.userId,
        notificationsEnabled: notificationsEnabled !== undefined ? notificationsEnabled : true,
        quietHoursStart: quietHoursStart || "22:00",
        quietHoursEnd: quietHoursEnd || "07:00",
      },
      update: {
        notificationsEnabled: notificationsEnabled !== undefined ? notificationsEnabled : undefined,
        quietHoursStart: quietHoursStart !== undefined ? quietHoursStart : undefined,
        quietHoursEnd: quietHoursEnd !== undefined ? quietHoursEnd : undefined,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update preferences" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await resolveCommunityUser();
    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (body.action === "delete_data") {
      // Soft-delete user's community content according to retention policy
      await prisma.$transaction([
        prisma.communityPost.updateMany({
          where: { authorId: authContext.userId },
          data: { deletedAt: new Date(), moderationStatus: "REMOVED" },
        }),
        prisma.communityComment.updateMany({
          where: { authorId: authContext.userId },
          data: { deletedAt: new Date(), moderationStatus: "REMOVED" },
        }),
        prisma.postReaction.deleteMany({
          where: { userId: authContext.userId },
        }),
        prisma.groupMembership.updateMany({
          where: { userId: authContext.userId },
          data: { status: "LEFT", leftAt: new Date() },
        }),
        prisma.communityNotification.deleteMany({
          where: { userId: authContext.userId },
        }),
      ]);

      await logCommunityAudit(authContext.userId, "DATA_DELETION_REQUESTED", {
        timestamp: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, message: "Community activity removed successfully" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to process request" }, { status: 500 });
  }
}
