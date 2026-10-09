import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { disconnectProvider } from "@/services/health/providerService";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const providerKey = params.id;
    await disconnectProvider(session.userId, providerKey);

    return NextResponse.json({
      success: true,
      message: `Disconnected ${providerKey} and revoked data access`,
    });
  } catch (error) {
    console.error("Disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect device" },
      { status: 500 }
    );
  }
}
