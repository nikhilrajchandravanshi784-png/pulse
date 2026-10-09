import { NextResponse } from "next/server";
import { getCaregiverViewData } from "@/services/pulse/careCircleService";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ valid: false, error: "Missing invitation token" }, { status: 400 });
    }

    const data = await getCaregiverViewData(token);

    if (!data.valid) {
      return NextResponse.json(data, { status: 403 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ valid: false, error: "Error retrieving caregiver view" }, { status: 500 });
  }
}
