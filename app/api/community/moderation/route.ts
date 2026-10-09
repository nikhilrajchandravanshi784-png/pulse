import { NextResponse } from "next/server";
import { resolveCommunityUser } from "@/lib/communityAuth";
import { getModerationQueue, executeModeratorAction } from "@/services/community/communityService";
import { ModeratorActionType } from "@/services/community/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const authContext = await resolveCommunityUser();
    if (!authContext?.isModerator) {
      return NextResponse.json({ error: "Forbidden: Moderator permissions required" }, { status: 403 });
    }

    const queue = await getModerationQueue();
    return NextResponse.json(queue);
  } catch (error) {
    return NextResponse.json({ error: "Failed to load moderation queue" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await resolveCommunityUser();
    if (!authContext?.isModerator) {
      return NextResponse.json({ error: "Forbidden: Moderator permissions required" }, { status: 403 });
    }

    const body = await request.json();
    const { targetType, targetId, actionType, reason, reportId } = body as {
      targetType: "POST" | "COMMENT" | "USER";
      targetId: string;
      actionType: ModeratorActionType;
      reason: string;
      reportId?: string;
    };

    if (!targetType || !targetId || !actionType || !reason) {
      return NextResponse.json({ error: "Missing required moderation action fields" }, { status: 400 });
    }

    const success = await executeModeratorAction({
      moderatorId: authContext.userId,
      targetType,
      targetId,
      actionType,
      reason,
      reportId,
    });

    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to execute moderation action" }, { status: 400 });
  }
}
