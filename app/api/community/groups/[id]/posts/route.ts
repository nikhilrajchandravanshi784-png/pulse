import { NextResponse } from "next/server";
import { resolveCommunityUser } from "@/lib/communityAuth";
import { listPosts, createCommunityPost } from "@/services/community/communityService";
import { PostCategory } from "@/services/community/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const limit = Number(searchParams.get("limit")) || 20;

    const authContext = await resolveCommunityUser();
    const posts = await listPosts({
      userId: authContext?.userId,
      groupId: params.id,
      category,
      limit,
    });

    return NextResponse.json({ posts });
  } catch (error) {
    return NextResponse.json({ error: "Failed to list group discussions" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const authContext = await resolveCommunityUser();
    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized: Please sign in to participate" }, { status: 401 });
    }

    const body = await request.json();
    const { content, category, language } = body as {
      content: string;
      category?: PostCategory;
      language?: string;
    };

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Post content cannot be empty" }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: "Post cannot exceed 2000 characters" }, { status: 400 });
    }

    const { post, screening } = await createCommunityPost({
      userId: authContext.userId,
      groupIdOrSlug: params.id,
      content,
      category,
      language,
    });

    return NextResponse.json({ post, screening }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create post" }, { status: 400 });
  }
}
