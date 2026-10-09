import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getNutritionProvider } from "@/services/food/nutritionProvider";

export const dynamic = "force-dynamic";

/**
 * GET /api/food/search?q=roti&lang=en
 * Searches the nutrition database. Results include portion conversions for the review UI.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const lang = (searchParams.get("lang") ?? "en") as "en" | "hi";

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [], query: q });
    }

    const provider = getNutritionProvider();
    const results = await provider.searchFood(q, lang);

    return NextResponse.json({
      results: results.map((r) => ({
        id: r.id,
        canonicalName: r.canonicalName,
        canonicalNameHi: r.canonicalNameHi,
        alternativeNames: r.alternativeNames,
        servingDescription: r.servingDescription,
        portionConversions: r.portionConversions,
        provider: r.provider,
        isVerified: r.isVerified,
        estimationNotes: r.estimationNotes,
      })),
      query: q,
      provider: provider.providerKey,
    });
  } catch (e: unknown) {
    console.error("[food/search]", e);
    return NextResponse.json({ error: "Search failed." }, { status: 500 });
  }
}
