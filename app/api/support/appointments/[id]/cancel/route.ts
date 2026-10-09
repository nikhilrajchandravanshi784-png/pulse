import { NextResponse } from "next/server";
import { getCurrentUserOrDemo, cancelAppointment } from "@/services/support/appointmentService";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserOrDemo();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const reason = body.reason || "Patient requested cancellation";

    const cancelled = await cancelAppointment(params.id, user.id, reason);
    return NextResponse.json({ success: true, appointment: cancelled });
  } catch (error: any) {
    console.error("Error cancelling appointment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to cancel appointment" },
      { status: 400 }
    );
  }
}
