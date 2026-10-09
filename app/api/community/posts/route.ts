import { NextResponse } from "next/server";
import { resolveCommunityUser } from "@/lib/communityAuth";
import { listPosts, createCommunityPost } from "@/services/community/communityService";
import { PostCategory } from "@/services/community/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const onlyJoined = searchParams.get("onlyJoined") === "true";
    const limit = Number(searchParams.get("limit")) || 20;

    const authContext = await resolveCommunityUser();
    const posts = await listPosts({
      userId: authContext?.userId,
      category,
      onlyJoined,
      limit,
    });

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("❌ Failed to list community posts:", error);
    return NextResponse.json({ error: "Failed to list posts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await resolveCommunityUser();
    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized: Please sign in to participate" }, { status: 401 });
    }

    const body = await request.json();
    const { groupId, content, category, language } = body as {
      groupId: string;
      content: string;
      category?: PostCategory;
      language?: string;
    };

    if (!groupId) {
      return NextResponse.json({ error: "Group ID is required" }, { status: 400 });
    }

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: "Post content cannot be empty" }, { status: 400 });
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: "Post cannot exceed 2000 characters" }, { status: 400 });
    }

    const { post, screening } = await createCommunityPost({
      userId: authContext.userId,
      groupIdOrSlug: groupId,
      content,
      category,
      language,
    });

    return NextResponse.json({ post, screening }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create post" }, { status: 400 });
  }
}
