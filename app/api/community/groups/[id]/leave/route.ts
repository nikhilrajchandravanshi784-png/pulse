import { NextResponse } from "next/server";
import { resolveCommunityUser } from "@/lib/communityAuth";
import { leaveCommunityGroup } from "@/services/community/communityService";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await resolveCommunityUser();
    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const success = await leaveCommunityGroup(params.id, authContext.userId);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to leave group" }, { status: 400 });
  }
}
