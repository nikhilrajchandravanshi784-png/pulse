import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { syncUserDevice } from "@/services/health/syncService";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const providerKey = params.id;
    const result = await syncUserDevice(session.userId, providerKey);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Sync error";
    return NextResponse.json(
      { error: errMessage },
      { status: 500 }
    );
  }
}
