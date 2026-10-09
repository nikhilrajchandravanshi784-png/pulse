import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/meal-coach/suggestions/[id]
 * Retrieves a single meal suggestion by ID with user ownership check.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const suggestion = await prisma.mealSuggestion.findUnique({
      where: { id: params.id },
      include: {
        feedbacks: { orderBy: { createdAt: "desc" } },
        guidance: true,
      },
    });

    if (!suggestion) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    if (suggestion.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      suggestion: {
        id: suggestion.id,
        suggestionType: suggestion.suggestionType,
        title: suggestion.title,
        titleHi: suggestion.titleHi,
        suggestionText: suggestion.suggestionText,
        suggestionTextHi: suggestion.suggestionTextHi,
        explanation: suggestion.explanation,
        explanationHi: suggestion.explanationHi,
        alternatives: suggestion.alternatives ? JSON.parse(suggestion.alternatives) : [],
        evidenceReference: suggestion.evidenceReference,
        uncertaintyNotes: suggestion.uncertaintyNotes,
        status: suggestion.status,
        isAiGenerated: suggestion.isAiGenerated,
        providerModel: suggestion.providerModel,
        createdAt: suggestion.createdAt,
        feedbacks: suggestion.feedbacks,
      },
    });
  } catch (error: unknown) {
    console.error("[meal-coach/suggestions/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to retrieve suggestion" }, { status: 500 });
  }
}
