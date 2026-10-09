import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { askPulseCoach } from "@/services/pulse/coachService";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { question, language = "hi" } = body;

    if (!question || !question.trim()) {
      return NextResponse.json({ error: "Question cannot be empty" }, { status: 422 });
    }

    // Call Pulse Coach service
    const response = await askPulseCoach(session.userId, question.trim(), language);

    // Save message to conversation log
    let conversation = await prisma.coachConversation.findFirst({
      where: { userId: session.userId },
      orderBy: { updatedAt: "desc" },
    });

    if (!conversation) {
      conversation = await prisma.coachConversation.create({
        data: {
          userId: session.userId,
          language,
        },
      });
    }

    await prisma.coachMessage.createMany({
      data: [
        {
          conversationId: conversation.id,
          senderRole: "USER",
          content: question.trim(),
        },
        {
          conversationId: conversation.id,
          senderRole: response.isSafetyEscalation ? "SAFETY_ROUTER" : "COACH_AI",
          content: response.answer,
          contentHindi: response.answerHindi,
          citedSource: response.citedArticleSource || null,
          safetyEscalated: response.isSafetyEscalation,
        },
      ],
    });

    return NextResponse.json({
      success: true,
      response,
    });
  } catch (error) {
    console.error("Coach API error:", error);
    return NextResponse.json({ error: "Failed to process coaching query" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch approved educational articles
    const articles = await prisma.educationalArticle.findMany({
      where: { isApproved: true, status: "PUBLISHED" },
      orderBy: { reviewDate: "desc" },
    });

    // Fetch conversation history
    const conversation = await prisma.coachConversation.findFirst({
      where: { userId: session.userId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json({
      success: true,
      articles,
      messages: conversation?.messages || [],
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch coach data" }, { status: 500 });
  }
}
