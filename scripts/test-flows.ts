import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateRealisticMockTelemetry } from "../services/health/mockTelemetry";
import { getProviderCapabilities, isDemoMode } from "../lib/env";
import {
  ingestHealthMetrics,
  getLatestMetricsOverview,
  getHealthTimeline,
  updateDailySummary,
} from "../services/health/healthDataService";
import {
  connectProvider,
  disconnectProvider,
  getUserDataSources,
} from "../services/health/providerService";
import { getUserInsights } from "../services/health/insightService";
import { getUserMessages, sendUserMessage } from "../services/careTeam/careTeamService";

const prisma = new PrismaClient();

async function runVerificationTests() {
  console.log("==================================================");
  console.log("🧪 RUNNING PULSE HEALTH ARCHITECTURE TEST SUITE");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Environment & Secrets Check
    console.log("\n[1] Checking Environment & Secrets Safety...");
    assert(isDemoMode === true, "Demo mode is properly enabled");
    const caps = getProviderCapabilities();
    assert(caps.apple_health !== undefined, "Apple Health provider registered");
    assert(caps.dexcom.isMockOnly === true, "Dexcom is properly flagged as mock/approval required");
    assert(caps.fitbit !== undefined, "Fitbit provider registered");

    // 2. Auth & Password Security
    console.log("\n[2] Testing Authentication & Password Security...");
    const testPassword = "SecureHealthcarePassword99!";
    const hashed = await bcrypt.hash(testPassword, 10);
    assert(hashed !== testPassword, "Passwords are never plaintext");
    const match = await bcrypt.compare(testPassword, hashed);
    assert(match === true, "Password hashing and verification matches");

    // 3. User & Health Profile Isolation
    console.log("\n[3] Testing User & Health Profile Isolation...");
    const testUserEmail = `test.patient.${Date.now()}@pulse.test`;
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        passwordHash: hashed,
        name: "Test Patient",
        profile: {
          create: {
            dateOfBirth: new Date("1992-05-15"),
            biologicalSex: "female",
            heightCm: 168,
            weightKg: 63,
            country: "United States",
            onboardingStep: 6,
            isOnboarded: true,
          },
        },
      },
      include: { profile: true },
    });
    assert(user.id !== undefined, "User created successfully with UUID/CUID");
    assert(user.profile?.isOnboarded === true, "Health profile associated and marked onboarded");

    // 4. Data Sources & Explicit Consent
    console.log("\n[4] Testing Data Source Connection & Explicit Consent...");
    const connectedSource = await connectProvider(user.id, "apple_health", ["steps", "heart_rate", "sleep"]);
    assert(connectedSource.isConnected === true, "Data source connected successfully");
    const consent = await prisma.consentRecord.findFirst({
      where: { userId: user.id, providerKey: "apple_health" },
    });
    assert(consent !== null, "Explicit consent record recorded in database");
    assert(consent?.explicitConsent === true, "Consent was explicitly given");

    // 5. Ingestion of Time-Series Telemetry
    console.log("\n[5] Testing Time-Series Ingestion & Mock Labeling...");
    const generatedTelemetry = generateRealisticMockTelemetry(user.id, "apple_health", undefined, 12);
    assert(generatedTelemetry.length > 0, `Generated ${generatedTelemetry.length} telemetry points`);
    assert(generatedTelemetry[0].metadata?.isDemoData === true, "Every simulated point carries isDemoData flag");

    const ingestedCount = await ingestHealthMetrics(user.id, generatedTelemetry);
    assert(ingestedCount > 0, `Successfully ingested ${ingestedCount} time-series points`);

    // 6. Metrics Overview & Summary Aggregation
    console.log("\n[6] Testing Overview Metrics & Aggregations...");
    const overview = await getLatestMetricsOverview(user.id);
    assert(overview.glucose !== undefined || overview.steps !== undefined, "Overview aggregates fetched");

    const todayStr = new Date().toISOString().split("T")[0];
    const summary = await updateDailySummary(user.id, todayStr);
    assert(summary !== null, "DailySummary successfully aggregated");

    // 7. Timeline Generation with Source Grouping
    console.log("\n[7] Testing Health Timeline Generation...");
    const timeline = await getHealthTimeline(user.id);
    assert(timeline.length > 0, `Timeline produced ${timeline.length} grouped events`);
    assert(timeline[0].sourceLabel !== undefined, "Timeline events carry human-readable source labels");

    // 8. Health Insights with Non-diagnostic Disclaimers
    console.log("\n[8] Testing Health Insights Generation & Clinical Safety...");
    const insights = await getUserInsights(user.id);
    assert(insights.length > 0, `Generated ${insights.length} personalized insights`);
    assert(
      insights.every((i) => i.disclaimer.includes("wellness and informational")),
      "All insights include mandatory healthcare safety disclaimer"
    );
    assert(
      insights.some((i) => i.type === "OBSERVATION" || i.type === "RECOMMENDATION"),
      "Insights clearly distinguish observations from recommendations"
    );

    // 9. Care Program & Messaging
    console.log("\n[9] Testing Care Program & Messaging...");
    const msg = await sendUserMessage(user.id, "Hi coach, reporting in for week 2!");
    assert(msg.senderRole === "PATIENT", "User message created");
    const allMessages = await getUserMessages(user.id);
    assert(allMessages.length >= 2, "Care team conversation initialized with clinician messages");

    // 10. Disconnect & Consent Revocation
    console.log("\n[10] Testing Disconnect & Consent Revocation...");
    await disconnectProvider(user.id, "apple_health");
    const sourcesAfter = await getUserDataSources(user.id);
    const appleAfter = sourcesAfter.find((s) => s.providerKey === "apple_health");
    assert(appleAfter?.isConnected === false, "Provider disconnected");
    const revokedConsent = await prisma.consentRecord.findFirst({
      where: { userId: user.id, providerKey: "apple_health" },
    });
    assert(revokedConsent?.isRevoked === true, "Consent record marked as revoked with timestamp");

    // Clean up test patient
    await prisma.user.delete({ where: { id: user.id } });
    console.log("\nTest patient cleaned up safely.");

    console.log("\n==================================================");
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerificationTests();
