import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { getUserMessages, sendUserMessage, getUserCareProgram } from "@/services/careTeam/careTeamService";

const messageSchema = z.object({
  content: z.string().min(1, "Message content is required").max(1000),
});

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const messages = await getUserMessages(session.userId);
    const program = await getUserCareProgram(session.userId);

    return NextResponse.json({
      success: true,
      program,
      messages,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { content } = messageSchema.parse(body);

    const message = await sendUserMessage(session.userId, content);

    return NextResponse.json({ success: true, message });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message }, { status: 422 });
    }
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
