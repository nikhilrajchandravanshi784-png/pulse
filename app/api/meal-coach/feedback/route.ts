import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { FeedbackAction } from "@/services/mealCoach/types";

/**
 * POST /api/meal-coach/feedback
 * Records patient response to a meal suggestion.
 * Body: {
 *   suggestionId: string,
 *   response: "TRY_IDEA" | "ANOTHER_OPTION" | "SAVE_FOR_LATER" | "NOT_SUITABLE" | "DISMISSED",
 *   reason?: string
 * }
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json();
    const { suggestionId, response, reason } = body as {
      suggestionId: string;
      response: FeedbackAction;
      reason?: string;
    };

    if (!suggestionId || !response) {
      return NextResponse.json({ error: "suggestionId and response are required" }, { status: 400 });
    }

    // Support guest / transient feedback without DB failure
    if (!session || suggestionId.startsWith("transient-") || suggestionId.startsWith("guest_")) {
      const statusMap: Record<string, string> = {
        TRY_IDEA: "ACCEPTED",
        SAVE_FOR_LATER: "SAVED_FOR_LATER",
        NOT_SUITABLE: "UNSUITABLE",
        DISMISSED: "DISMISSED",
        ANOTHER_OPTION: "ACTIVE",
      };
      return NextResponse.json({
        success: true,
        status: statusMap[response] || "ACTIVE",
        message: response === "TRY_IDEA"
          ? "Saved as a meal planning idea. Your current food diary remains untouched."
          : response === "SAVE_FOR_LATER"
          ? "Saved for your future meal planning."
          : response === "NOT_SUITABLE"
          ? "Thank you. We'll avoid similar ideas for your future meals."
          : "Response noted.",
      });
    }

    // Verify user owns the suggestion
    const suggestion = await prisma.mealSuggestion.findUnique({
      where: { id: suggestionId },
    });

    if (!suggestion) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    if (suggestion.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Map response to new suggestion status
    let newStatus = "ACTIVE";
    let confirmationMessage = "Feedback recorded.";

    if (response === "TRY_IDEA") {
      newStatus = "ACCEPTED";
      confirmationMessage = "Saved as a meal planning idea. Your current food diary remains untouched.";
    } else if (response === "SAVE_FOR_LATER") {
      newStatus = "SAVED_FOR_LATER";
      confirmationMessage = "Saved for your future meal planning.";
    } else if (response === "NOT_SUITABLE") {
      newStatus = "UNSUITABLE";
      confirmationMessage = "Thank you. We'll avoid similar ideas for your future meals.";

      // If patient noted a disliked food, optionally append to avoided foods preference
      if (reason && reason.trim().length > 2) {
        try {
          const pref = await prisma.patientFoodPreference.findUnique({
            where: { userId: session.userId },
          });
          if (pref) {
            const currentAvoided: string[] = JSON.parse(pref.foodsAvoided || "[]");
            if (!currentAvoided.includes(reason.trim().toLowerCase())) {
              currentAvoided.push(reason.trim().toLowerCase());
              await prisma.patientFoodPreference.update({
                where: { userId: session.userId },
                data: { foodsAvoided: JSON.stringify(currentAvoided) },
              });
            }
          }
        } catch {
          // Ignore preference append warning
        }
      }
    } else if (response === "DISMISSED") {
      newStatus = "DISMISSED";
      confirmationMessage = "Great! Keeping your meal as it is.";
    }

    // Save feedback and update suggestion status in transaction
    await prisma.$transaction([
      prisma.mealSuggestionFeedback.create({
        data: {
          userId: session.userId,
          suggestionId,
          response,
          reason: reason?.trim() || null,
        },
      }),
      prisma.mealSuggestion.update({
        where: { id: suggestionId },
        data: { status: newStatus },
      }),
    ]);

    return NextResponse.json({
      success: true,
      status: newStatus,
      message: confirmationMessage,
    });
  } catch (error: unknown) {
    console.error("[meal-coach/feedback] Error:", error);
    return NextResponse.json({ error: "Could not save feedback" }, { status: 500 });
  }
}
