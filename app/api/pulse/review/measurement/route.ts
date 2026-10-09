import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      patientId,
      measurementType = "HBA1C",
      value,
      unit = "%",
      measuredAt,
      laboratoryName,
      isBaseline = false,
      isFollowUp = false,
      clinicalNotes,
    } = body;

    const targetPatientId = patientId || session.userId;

    if (!value || isNaN(parseFloat(value))) {
      return NextResponse.json({ error: "Valid numeric measurement value required" }, { status: 422 });
    }

    const measurement = await prisma.clinicalMeasurement.create({
      data: {
        userId: targetPatientId,
        measurementType,
        value: parseFloat(value),
        unit,
        measuredAt: measuredAt ? new Date(measuredAt) : new Date(),
        source: session.role === "CLINICIAN" ? "CLINICIAN_ENTRY" : "LABORATORY",
        laboratoryName: laboratoryName || "Verified Diagnostic Laboratory",
        isBaseline: Boolean(isBaseline),
        isFollowUp: Boolean(isFollowUp),
        clinicalNotes: clinicalNotes || null,
      },
    });

    return NextResponse.json({
      success: true,
      measurement,
      message: "Clinical measurement verified and stored",
    });
  } catch (error) {
    console.error("Clinical measurement save error:", error);
    return NextResponse.json({ error: "Failed to save clinical measurement" }, { status: 500 });
  }
}
