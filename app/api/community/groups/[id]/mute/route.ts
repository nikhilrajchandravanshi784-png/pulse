import { NextResponse } from "next/server";
import { resolveCommunityUser } from "@/lib/communityAuth";
import { toggleGroupNotifications } from "@/services/community/communityService";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await resolveCommunityUser();
    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const muted = await toggleGroupNotifications(params.id, authContext.userId);
    return NextResponse.json({ notificationsMuted: muted });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update notification settings" }, { status: 400 });
  }
}
