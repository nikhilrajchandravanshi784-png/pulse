import { NextResponse } from "next/server";
import { resolveProactiveUser } from "@/lib/proactiveCareAuth";
import { InterventionLifecycleService } from "@/services/proactiveCare";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await resolveProactiveUser();
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { optionId, payload } = body;

    const result = await InterventionLifecycleService.acceptSuggestion(
      params.id,
      optionId || "accepted",
      payload
    );

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to accept suggestion" }, { status: 400 });
  }
}
