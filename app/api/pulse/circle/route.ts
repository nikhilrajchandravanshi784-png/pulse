import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { inviteCaregiver } from "@/services/pulse/careCircleService";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const caregivers = await prisma.careCircleInvitation.findMany({
      where: { patientId: session.userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, caregivers });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch care circle" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      caregiverName,
      caregiverEmail,
      relationship,
      shareGoals,
      shareCompletedActions,
      shareReminders,
      shareEducation,
      shareWeeklySummary,
      shareGlucose,
    } = body;

    if (!caregiverName || !caregiverEmail) {
      return NextResponse.json({ error: "Caregiver name and email required" }, { status: 422 });
    }

    const invitation = await inviteCaregiver(session.userId, {
      caregiverName,
      caregiverEmail,
      relationship: relationship || "Family Member",
      shareGoals: Boolean(shareGoals),
      shareCompletedActions: Boolean(shareCompletedActions),
      shareReminders: Boolean(shareReminders),
      shareEducation: Boolean(shareEducation),
      shareWeeklySummary: Boolean(shareWeeklySummary),
      shareGlucose: Boolean(shareGlucose), // Explicit opt-in only
    });

    return NextResponse.json({
      success: true,
      invitation,
      message: "Caregiver invited with patient-controlled permissions",
    });
  } catch (error) {
    console.error("Care circle invite error:", error);
    return NextResponse.json({ error: "Failed to invite caregiver" }, { status: 500 });
  }
}
