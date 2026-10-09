import { NextResponse } from "next/server";
import {
  getCurrentUserOrDemo,
  verifyPaymentAndActivate,
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

    const body = await request.json();
    const {
      providerPaymentId,
      providerSubscriptionId,
      providerOrderId,
      providerSignature,
      paymentMethod,
    } = body;

    if (!providerPaymentId || !providerSignature) {
      return NextResponse.json(
        {
          success: false,
          error: "providerPaymentId and providerSignature are required for verification.",
        },
        { status: 400 }
      );
    }

    const result = await verifyPaymentAndActivate({
      userId: user.id,
      providerPaymentId,
      providerSubscriptionId,
      providerOrderId,
      providerSignature,
      paymentMethod,
    });

    return NextResponse.json({
      success: true,
      message: "Payment successfully verified. Pulse Premium membership is active!",
      subscription: result.subscription,
      transaction: result.transaction,
    });
  } catch (error: any) {
    console.error("Payment verification failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Payment verification failed.",
      },
      { status: 400 }
    );
  }
}
