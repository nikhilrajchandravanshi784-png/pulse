import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { connectProvider } from "@/services/health/providerService";
import { syncUserDevice } from "@/services/health/syncService";

const connectSchema = z.object({
  providerKey: z.string().min(1, "Provider key required"),
  scopes: z.array(z.string()).default(["activity", "heart_rate", "sleep", "glucose"]),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { providerKey, scopes } = connectSchema.parse(body);

    const source = await connectProvider(session.userId, providerKey, scopes);

    // Initial passive ingestion
    await syncUserDevice(session.userId, providerKey);

    return NextResponse.json({
      success: true,
      message: `Successfully connected ${providerKey}`,
      source,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0]?.message },
        { status: 422 }
      );
    }
    console.error("Connect provider error:", error);
    return NextResponse.json(
      { error: "Failed to connect health data provider" },
      { status: 500 }
    );
  }
}
