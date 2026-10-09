import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { revokeCaregiverAccess, updateCaregiverPermissions } from "@/services/pulse/careCircleService";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await revokeCaregiverAccess(session.userId, params.id);

    return NextResponse.json({
      success: true,
      message: "Caregiver permissions immediately revoked",
    });
  } catch (error) {
    console.error("Care circle revoke error:", error);
    return NextResponse.json({ error: "Failed to revoke caregiver access" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const updated = await updateCaregiverPermissions(session.userId, params.id, body);

    return NextResponse.json({
      success: true,
      invitation: updated,
      message: "Caregiver permissions updated successfully",
    });
  } catch (error: any) {
    console.error("Care circle permissions update error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update permissions" },
      { status: 500 }
    );
  }
}
