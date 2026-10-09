import { NextResponse } from "next/server";
import { resolveCommunityUser } from "@/lib/communityAuth";
import { listCommunityGroups } from "@/services/community/communityService";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const language = searchParams.get("language") || undefined;

    const authContext = await resolveCommunityUser();
    const groups = await listCommunityGroups(authContext?.userId, category, language);

    return NextResponse.json({
      groups,
      currentUserId: authContext?.userId || null,
      isGuest: authContext?.isGuest || false,
    });
  } catch (error) {
    console.error("❌ Failed to list community groups:", error);
    return NextResponse.json({ error: "Failed to load groups" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authContext = await resolveCommunityUser();
    if (!authContext?.isModerator) {
      return NextResponse.json({ error: "Unauthorized: Admin privileges required" }, { status: 403 });
    }

    const body = await request.json();
    const { name, nameHi, description, descriptionHi, purpose, rules, language, category, memberLimit, slug } = body;

    const group = await prisma.communityGroup.create({
      data: {
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name,
        nameHi,
        description,
        descriptionHi,
        purpose: purpose || "Supportive peer discussion.",
        rules: JSON.stringify(rules || []),
        language: language || "bilingual",
        category: category || "HABITS",
        memberLimit: Number(memberLimit) || 15,
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to create group" }, { status: 400 });
  }
}
