import { NextResponse } from "next/server";
import {
  getCurrentUserOrDemo,
  getUserSubscriptionDetails,
} from "@/services/subscription/subscriptionService";
import { PULSE_PREMIUM_FEATURES } from "@/scripts/seed-subscription";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUserOrDemo();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const details = await getUserSubscriptionDetails(user.id);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      subscription: details.subscription,
      plan: details.plan,
      isSubscribed: details.isSubscribed,
      transactions: details.transactions,
      features: PULSE_PREMIUM_FEATURES,
    });
  } catch (error: any) {
    console.error("Subscription status error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load subscription status" },
      { status: 500 }
    );
  }
}
