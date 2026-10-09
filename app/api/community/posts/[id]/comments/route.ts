import { NextResponse } from "next/server";
import { resolveCommunityUser } from "@/lib/communityAuth";
import { listComments, addComment } from "@/services/community/communityService";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await resolveCommunityUser();
    const comments = await listComments(params.id, authContext?.userId);
    return NextResponse.json({ comments });
  } catch (error) {
    return NextResponse.json({ error: "Failed to list comments" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await resolveCommunityUser();
    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized: Please sign in to reply" }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body as { content: string };

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Comment content cannot be empty" }, { status: 400 });
    }

    if (content.length > 800) {
      return NextResponse.json({ error: "Comment cannot exceed 800 characters" }, { status: 400 });
    }

    const { comment, screening } = await addComment({
      userId: authContext.userId,
      postId: params.id,
      content,
    });

    return NextResponse.json({ comment, screening }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to post comment" }, { status: 400 });
  }
}
