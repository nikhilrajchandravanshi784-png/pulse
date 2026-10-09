import { NextResponse } from "next/server";
import { resolveCommunityUser } from "@/lib/communityAuth";
import { reportContent } from "@/services/community/communityService";
import { ReportCategory } from "@/services/community/types";

export async function POST(request: Request) {
  try {
    const authContext = await resolveCommunityUser();
    if (!authContext?.userId) {
      return NextResponse.json({ error: "Unauthorized: Please sign in to submit reports" }, { status: 401 });
    }

    const body = await request.json();
    const { contentType, contentId, category, description } = body as {
      contentType: "POST" | "COMMENT";
      contentId: string;
      category: ReportCategory;
      description?: string;
    };

    if (!contentType || !contentId || !category) {
      return NextResponse.json({ error: "Missing required report fields" }, { status: 400 });
    }

    const result = await reportContent({
      reporterId: authContext.userId,
      contentType,
      contentId,
      category,
      description,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to submit report" }, { status: 400 });
  }
}
