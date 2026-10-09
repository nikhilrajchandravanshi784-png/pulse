import { NextResponse } from "next/server";
import { resolveProactiveUser } from "@/lib/proactiveCareAuth";
import { InterventionLifecycleService } from "@/services/proactiveCare";

export async function GET() {
  try {
    const auth = await resolveProactiveUser();
    if (!auth?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const current = await InterventionLifecycleService.getCurrentActiveIntervention(auth.userId);
    return NextResponse.json({ intervention: current });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch active intervention" }, { status: 500 });
  }
}
