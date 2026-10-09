import { NextResponse } from "next/server";
import { getAvailableSlots } from "@/services/support/appointmentService";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const specialistId = searchParams.get("specialistId");
    const date = searchParams.get("date"); // YYYY-MM-DD

    if (!specialistId || !date) {
      return NextResponse.json(
        { success: false, error: "specialistId and date are required query parameters" },
        { status: 400 }
      );
    }

    const slots = await getAvailableSlots(specialistId, date);
    return NextResponse.json({ success: true, slots, specialistId, date });
  } catch (error: any) {
    console.error("Error fetching availability slots:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load availability" },
      { status: 500 }
    );
  }
}
