import { NextResponse } from "next/server";
import { processWebhookEvent } from "@/services/subscription/subscriptionService";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("x-razorpay-signature") || undefined;
    const rawBody = await request.text();
    const payload = JSON.parse(rawBody);

    const eventId = payload.event_id || payload.id || `evt_${Date.now()}`;
    const eventType = payload.event || "unknown";

    const result = await processWebhookEvent({
      providerEventId: eventId,
      eventType,
      payload,
      signature,
    });

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Webhook processing failed",
      },
      { status: 400 }
    );
  }
}
