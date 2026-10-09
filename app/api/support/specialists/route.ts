import { NextResponse } from "next/server";
import { getVerifiedSpecialists } from "@/services/support/appointmentService";

export async function GET() {
  try {
    const specialists = await getVerifiedSpecialists();
    return NextResponse.json({ success: true, specialists });
  } catch (error: any) {
    console.error("Error fetching specialists:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load specialists" },
      { status: 500 }
    );
  }
}
