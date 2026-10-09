import { NextResponse } from "next/server";
import { resolveCommunityUser } from "@/lib/communityAuth";
import { deletePost } from "@/services/community/communityService";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const post = await prisma.communityPost.findUnique({
      where: { id: params.id },
      include: {
        group: { select: { id: true, name: true, slug: true } },
        author: {
          select: {
            id: true,
            communityProfile: { select: { displayName: true, avatarUrl: true, isModerator: true } },
          },
        },
      },
    });

    if (!post || post.deletedAt || post.moderationStatus !== "APPROVED") {
      return NextResponse.json({ error: "Post not found or unavailable" }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load post" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await resolveCommunityUser();
    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const success = await deletePost(params.id, authContext.userId, authContext.isModerator);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to delete post" }, { status: 403 });
  }
}
