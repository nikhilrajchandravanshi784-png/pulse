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
    const { barrier, freeText } = body;

    if (!barrier) {
      return NextResponse.json({ error: "Barrier is required" }, { status: 400 });
    }

    const result = await InterventionLifecycleService.recordBarrierResponse(
      params.id,
      barrier,
      freeText
    );

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to record barrier" }, { status: 400 });
  }
}
