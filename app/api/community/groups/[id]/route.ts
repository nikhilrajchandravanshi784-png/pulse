import { NextResponse } from "next/server";
import { resolveCommunityUser } from "@/lib/communityAuth";
import { getGroupDetails } from "@/services/community/communityService";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await resolveCommunityUser();
    const group = await getGroupDetails(params.id, authContext?.userId);

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json({ group });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load group details" }, { status: 500 });
  }
}
