import { NextResponse } from "next/server";
import { resolveCommunityUser } from "@/lib/communityAuth";
import { togglePostReaction } from "@/services/community/communityService";
import { ReactionType } from "@/services/community/types";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await resolveCommunityUser();
    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized: Please sign in to react" }, { status: 401 });
    }

    const body = await request.json();
    const { type } = body as { type: ReactionType };

    if (!type || !["HELPFUL", "SUPPORTIVE", "CELEBRATE"].includes(type)) {
      return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });
    }

    const result = await togglePostReaction(params.id, authContext.userId, type);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update reaction" }, { status: 400 });
  }
}
