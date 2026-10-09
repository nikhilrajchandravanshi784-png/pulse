import { NextResponse } from "next/server";
import {
  getCurrentUserOrDemo,
  cancelSubscription,
} from "@/services/subscription/subscriptionService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUserOrDemo();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { reason, cancelImmediately } = body;

    const result = await cancelSubscription({
      userId: user.id,
      reason: reason || "Cancelled by patient via subscription manager",
      cancelImmediately: Boolean(cancelImmediately),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Subscription cancellation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to cancel subscription.",
      },
      { status: 400 }
    );
  }
}
