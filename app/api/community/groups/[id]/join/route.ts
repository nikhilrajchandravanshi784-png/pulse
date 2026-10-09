import { NextResponse } from "next/server";
import { resolveCommunityUser } from "@/lib/communityAuth";
import { joinCommunityGroup } from "@/services/community/communityService";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await resolveCommunityUser();
    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized: Please sign in to join groups" }, { status: 401 });
    }

    const result = await joinCommunityGroup(params.id, authContext.userId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to join group" }, { status: 400 });
  }
}
