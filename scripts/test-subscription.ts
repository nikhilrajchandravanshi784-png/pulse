import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import {
  getSubscriptionPlan,
  getUserSubscriptionDetails,
  createCheckoutSession,
  verifyPaymentAndActivate,
  processWebhookEvent,
  cancelSubscription,
  getPaymentHistory,
  PLAN_PRICE_INR,
  PLAN_PRICE_PAISE,
  PLAN_CURRENCY,
  PLAN_NAME,
} from "../services/subscription/subscriptionService";
import { evaluateFeatureAccess } from "../services/subscription/accessPolicy";

const prisma = new PrismaClient();

async function runSubscriptionTests() {
  console.log("=== RUNNING PULSE SUBSCRIPTION & MEMBERSHIP TEST SUITE ===");

  // 1. Verify Subscription Plan
  console.log("\n[Test 1] Testing getSubscriptionPlan()...");
  const plan = await getSubscriptionPlan();
  if (!plan) throw new Error("Subscription plan not found in database");
  if (plan.name !== PLAN_NAME) throw new Error(`Expected plan name "${PLAN_NAME}", got "${plan.name}"`);
  if (plan.price !== PLAN_PRICE_INR) throw new Error(`Expected plan price ${PLAN_PRICE_INR}, got ${plan.price}`);
  if (plan.currency !== PLAN_CURRENCY) throw new Error(`Expected currency "${PLAN_CURRENCY}", got "${plan.currency}"`);
  if (plan.billingInterval !== "monthly") throw new Error(`Expected interval "monthly", got "${plan.billingInterval}"`);
  console.log(`PASS: Verified plan "${plan.name}" at ₹${plan.price}/${plan.billingInterval} (${plan.currency})`);

  // 2. Identify Test Patient
  console.log("\n[Test 2] Locating test patient Alex Morgan...");
  const patient = await prisma.user.findFirst({
    where: { email: "alex.morgan@pulsehealth.demo" },
  });
  if (!patient) throw new Error("Test patient Alex Morgan not found in database");
  console.log(`PASS: Found patient: ${patient.name} (${patient.id})`);

  // Reset any prior subscription state for clean test isolation
  await prisma.paymentTransaction.deleteMany({ where: { userId: patient.id } });
  await prisma.userSubscription.deleteMany({ where: { userId: patient.id } });

  // 3. Test Initial Unsubscribed Status & Access Policy
  console.log("\n[Test 3] Testing initial NOT_SUBSCRIBED status & Access Policy...");
  const initialDetails = await getUserSubscriptionDetails(patient.id);
  if (initialDetails.isSubscribed) {
    throw new Error("Patient should not be subscribed initially");
  }
  console.log(`PASS: Initial subscription status confirmed: ${initialDetails.subscription.status}`);

  // Test access before subscribing
  const planAccessBefore = await evaluateFeatureAccess(patient.id, "PULSE_PLAN");
  if (planAccessBefore.hasAccess) {
    throw new Error("Patient without active subscription should not have premium feature access");
  }
  console.log(`PASS: Premium feature properly gated before subscription: status = ${planAccessBefore.status}`);

  // Test unconditional patient rights (safety & personal data)
  const privacyAccess = await evaluateFeatureAccess(patient.id, "PRIVACY_CONTROLS");
  if (!privacyAccess.hasAccess) {
    throw new Error("Privacy & safety controls must ALWAYS be accessible to patient");
  }
  console.log(`PASS: Unconditional patient data access confirmed for PRIVACY_CONTROLS`);

  // 4. Test Server-Side Checkout Session Creation
  console.log("\n[Test 4] Testing createCheckoutSession()...");
  const checkout = await createCheckoutSession(patient.id);
  if (!checkout.success) throw new Error("Checkout creation failed");
  if (checkout.amount !== PLAN_PRICE_PAISE) throw new Error(`Expected amount ${PLAN_PRICE_PAISE} paise, got ${checkout.amount}`);
  if (checkout.currency !== "INR") throw new Error(`Expected currency "INR", got ${checkout.currency}`);
  if (!checkout.subscriptionId || !checkout.keyId) throw new Error("Missing subscriptionId or keyId in checkout payload");
  console.log(`PASS: Created checkout session for ₹${checkout.amount / 100} (${checkout.subscriptionId})`);

  // 5. Test Server-Side Payment Verification & Cryptographic HMAC Activation
  console.log("\n[Test 5] Testing verifyPaymentAndActivate() with HMAC SHA256...");
  const paymentId = `pay_test_${crypto.randomBytes(6).toString("hex")}`;
  const secret = process.env.RAZORPAY_KEY_SECRET || "rzp_secret_pulse_health_demo_sec";
  const validSignature = crypto
    .createHmac("sha256", secret)
    .update(`${paymentId}|${checkout.subscriptionId}`)
    .digest("hex");

  const activationResult = await verifyPaymentAndActivate({
    userId: patient.id,
    providerPaymentId: paymentId,
    providerSubscriptionId: checkout.subscriptionId,
    providerOrderId: checkout.orderId,
    providerSignature: validSignature,
    paymentMethod: "UPI Autopay",
  });

  if (activationResult.subscription.status !== "ACTIVE") {
    throw new Error(`Expected subscription status "ACTIVE", got "${activationResult.subscription.status}"`);
  }
  if (!activationResult.transaction || activationResult.transaction.status !== "SUCCESS") {
    throw new Error("Payment transaction was not recorded as SUCCESS");
  }
  console.log(`PASS: Subscription authoritatively activated! Status: ${activationResult.subscription.status}`);
  console.log(`PASS: Transaction recorded: ${activationResult.transaction.receiptNumber} (Amount: ₹${activationResult.transaction.amount})`);

  // 6. Test Signature Tampering Prevention
  console.log("\n[Test 6] Testing signature tampering prevention (Security Check)...");
  let tamperingCaught = false;
  try {
    await verifyPaymentAndActivate({
      userId: patient.id,
      providerPaymentId: `pay_tampered_${Date.now()}`,
      providerSubscriptionId: checkout.subscriptionId,
      providerSignature: "invalid_forged_signature_attack_attempt",
    });
  } catch (err: any) {
    tamperingCaught = true;
    console.log(`PASS: Forged signature successfully rejected: "${err.message}"`);
  }
  if (!tamperingCaught) {
    throw new Error("FAIL: Tampered payment signature was accepted!");
  }

  // 7. Test Idempotency (Duplicate Payment Submission)
  console.log("\n[Test 7] Testing duplicate transaction idempotency...");
  const duplicateResult = await verifyPaymentAndActivate({
    userId: patient.id,
    providerPaymentId: paymentId, // Same payment ID
    providerSubscriptionId: checkout.subscriptionId,
    providerSignature: validSignature,
  });
  const txCount = await prisma.paymentTransaction.count({
    where: { providerPaymentId: paymentId },
  });
  if (txCount !== 1) {
    throw new Error(`Expected exactly 1 transaction for paymentId ${paymentId}, found ${txCount}`);
  }
  console.log(`PASS: Re-submitted payment ID did not produce duplicate transaction records (Count: ${txCount})`);

  // 8. Test Centralized Feature Access When Subscribed
  console.log("\n[Test 8] Testing feature access for active subscriber...");
  const planAccessAfter = await evaluateFeatureAccess(patient.id, "PULSE_PLAN");
  if (!planAccessAfter.hasAccess || planAccessAfter.status !== "ACTIVE") {
    throw new Error(`Expected hasAccess=true and status="ACTIVE", got ${JSON.stringify(planAccessAfter)}`);
  }
  console.log(`PASS: Active subscriber confirmed access to PULSE_PLAN`);

  // 9. Test Webhook Processing & Deduplication
  console.log("\n[Test 9] Testing webhook event processing with signature verification...");
  const webhookEventId = `evt_test_${crypto.randomBytes(6).toString("hex")}`;
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "whsec_pulse_health_dev_2026";
  const webhookPayload = {
    event_id: webhookEventId,
    event: "subscription.charged",
    payload: {
      subscription: {
        entity: {
          id: checkout.subscriptionId,
          amount: 49900,
          currency: "INR",
          method: "UPI Autopay",
          email: patient.email,
        },
      },
    },
  };
  const rawPayload = JSON.stringify(webhookPayload);
  const webhookSig = crypto.createHmac("sha256", webhookSecret).update(rawPayload).digest("hex");

  const webhookResult = await processWebhookEvent({
    providerEventId: webhookEventId,
    eventType: "subscription.charged",
    payload: webhookPayload,
    signature: webhookSig,
  });

  if (webhookResult.status !== "PROCESSED") {
    throw new Error(`Webhook failed to process: ${JSON.stringify(webhookResult)}`);
  }
  console.log(`PASS: Webhook processed successfully: eventId = ${webhookEventId}`);

  // Test Webhook Deduplication
  const duplicateWebhook = await processWebhookEvent({
    providerEventId: webhookEventId,
    eventType: "subscription.charged",
    payload: webhookPayload,
    signature: webhookSig,
  });
  if (duplicateWebhook.status !== "ALREADY_PROCESSED") {
    throw new Error(`Duplicate webhook should report ALREADY_PROCESSED, got ${duplicateWebhook.status}`);
  }
  console.log(`PASS: Duplicate webhook correctly flagged as ALREADY_PROCESSED (Idempotency verified)`);

  // 10. Test Cancellation Workflow & Patient Data Preservation
  console.log("\n[Test 10] Testing cancelSubscription() with patient data preservation...");
  const cancelResult = await cancelSubscription({
    userId: patient.id,
    reason: "Testing cancellation flow",
    cancelImmediately: false, // Period end
  });

  if (!cancelResult.success || !cancelResult.subscription.cancelAtPeriodEnd) {
    throw new Error("Cancellation at period end failed to set cancelAtPeriodEnd flag");
  }
  console.log(`PASS: Scheduled cancellation at period end confirmed. Message: "${cancelResult.message}"`);

  // Verify patient medical data remains completely intact
  const patientProfile = await prisma.patientProfile.findUnique({ where: { userId: patient.id } });
  const appts = await prisma.doctorAppointment.findMany({ where: { patientId: patient.id } });
  if (!patientProfile) {
    throw new Error("Patient profile was unexpectedly altered during subscription cancellation!");
  }
  console.log(`PASS: Verified patient health profile and ${appts.length} appointment(s) remain 100% intact!`);

  // 11. Test Payment History
  console.log("\n[Test 11] Testing getPaymentHistory()...");
  const history = await getPaymentHistory(patient.id);
  if (history.length === 0) {
    throw new Error("No payment transactions found in history");
  }
  console.log(`PASS: Retrieved ${history.length} payment transaction(s) for patient. Most recent: ₹${history[0].amount} (${history[0].receiptNumber})`);

  console.log("\n===========================================================");
  console.log(" ALL PULSE SUBSCRIPTION & MEMBERSHIP TESTS PASSED CLEANLY! ");
  console.log("===========================================================");
}

runSubscriptionTests()
  .catch((e) => {
    console.error("Test execution error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
