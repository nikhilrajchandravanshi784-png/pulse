import { NextResponse } from "next/server";
import { getCurrentUserOrDemo, rescheduleAppointment } from "@/services/support/appointmentService";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUserOrDemo();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { newDateStr, newTimeStr } = body;

    if (!newDateStr || !newTimeStr) {
      return NextResponse.json(
        { success: false, error: "newDateStr and newTimeStr are required" },
        { status: 400 }
      );
    }

    const rescheduled = await rescheduleAppointment({
      appointmentId: params.id,
      actorId: user.id,
      newDateStr,
      newTimeStr,
    });

    return NextResponse.json({ success: true, appointment: rescheduled });
  } catch (error: any) {
    console.error("Error rescheduling appointment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to reschedule appointment" },
      { status: 400 }
    );
  }
}
