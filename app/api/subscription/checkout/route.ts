import { NextResponse } from "next/server";
import {
  getCurrentUserOrDemo,
  createCheckoutSession,
} from "@/services/subscription/subscriptionService";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await getCurrentUserOrDemo();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Role safety check: Clinicians & Admins should not receive patient billing sessions
    if (user.role === "CLINICIAN" || user.role === "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "Clinicians and Administrators do not require patient memberships.",
        },
        { status: 403 }
      );
    }

    const session = await createCheckoutSession(user.id);
    return NextResponse.json(session);
  } catch (error: any) {
    console.error("Checkout creation error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
