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

    const body = await request.json().catch(() => ({}));
    const result = await InterventionLifecycleService.requestHelp(params.id, body.notes);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to request assistance" }, { status: 400 });
  }
}
