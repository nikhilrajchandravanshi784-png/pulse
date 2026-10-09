import { NextResponse } from "next/server";
import {
  getCurrentUserOrDemo,
  getUserAppointments,
  bookAppointment,
} from "@/services/support/appointmentService";

export async function GET(request: Request) {
  try {
    const user = await getCurrentUserOrDemo();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || undefined; // e.g. "2026-10-09"

    const appointments = await getUserAppointments(user.id, date);
    return NextResponse.json({ success: true, appointments, user: { id: user.id, name: user.name } });
  } catch (error: any) {
    console.error("Error fetching appointments:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load appointments" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserOrDemo();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      specialistId,
      appointmentType,
      reason,
      optionalPatientNote,
      dateStr,
      timeStr,
    } = body;

    if (!specialistId || !dateStr || !timeStr || !reason) {
      return NextResponse.json(
        { success: false, error: "specialistId, dateStr, timeStr, and reason are required" },
        { status: 400 }
      );
    }

    const appointment = await bookAppointment({
      patientId: user.id,
      specialistId,
      appointmentType,
      reason,
      optionalPatientNote,
      dateStr,
      timeStr,
    });

    return NextResponse.json({
      success: true,
      appointment,
      message: "Consultation booked successfully",
    });
  } catch (error: any) {
    console.error("Error booking appointment:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to book appointment" },
      { status: 400 }
    );
  }
}
