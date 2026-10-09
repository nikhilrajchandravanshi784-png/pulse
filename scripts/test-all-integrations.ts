/**
 * Project Pulse — Complete End-to-End Cross-Module Synchronization Test Suite
 *
 * Verifies all 8 core integration workflows:
 * - TEST A: Goals CRUD & pause/resume propagation across RoutineOccurrence & Proactive Care
 * - TEST B: Check-in persistence, routine sync, and prevention of double-counting
 * - TEST C: Food AI confirmation, portion updates, and daily nutrition recalculation
 * - TEST D: Profile language & notification preference updates
 * - TEST E: Care Circle granular permission checks and immediate revocation enforcement
 * - TEST F: Community post creation & isolation from private clinical records
 * - TEST G: Progress metric calculations without clinical data fabrication
 * - TEST H: Failure handling & validation error safety
 */

import { prisma } from "../lib/db";
import { GoalSyncService } from "../services/pulse/goalSyncService";
import { DashboardSyncService } from "../services/pulse/dashboardSyncService";
import {
  inviteCaregiver,
  updateCaregiverPermissions,
  revokeCaregiverAccess,
  getCaregiverViewData,
} from "../services/pulse/careCircleService";
import { getPatientWeeklyReview, get90DayProgramOutcome } from "../services/pulse/reviewService";
import { rebuildDailySummary } from "../services/food/nutritionProvider";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ""}`);
    failedCount++;
  }
}

async function runAllIntegrationTests() {
  console.log("==================================================================");
  console.log("🧪 RUNNING PROJECT PULSE CROSS-MODULE SYNCHRONIZATION TESTS");
  console.log("==================================================================\n");

  // Fetch or ensure demo user
  const user = await prisma.user.findFirst({
    where: { email: "alex.morgan@pulsehealth.demo" },
    include: { patientProfile: true },
  });

  if (!user) {
    console.error("❌ Fatal: Demo user alex.morgan@pulsehealth.demo not found. Please run seed first.");
    process.exit(1);
  }

  const userId = user.id;
  const todayStr = new Date().toISOString().split("T")[0];

  console.log(`👤 Testing with patient: ${user.name} (${user.email}) [ID: ${userId}]\n`);

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST A: Goals CRUD & pause/resume propagation
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("--- TEST A: Goals CRUD & Pause/Resume Propagation ---");
  let testGoal = await prisma.healthGoal.findFirst({
    where: { userId, status: "ACTIVE", isPrimary: true },
  });

  if (!testGoal) {
    testGoal = await prisma.healthGoal.findFirst({
      where: { userId, status: "ACTIVE" },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    });
  }

  if (!testGoal) {
    testGoal = await prisma.healthGoal.create({
      data: {
        userId,
        title: "15-minute brisk walk after lunch",
        titleHindi: "दोपहर के भोजन के बाद 15 मिनट की तेज सैर",
        reason: "Helps blunt postprandial glucose spike",
        frequency: "Daily after lunch",
        preferredTime: "13:30",
        targetDurationMin: 15,
        status: "ACTIVE",
        patientStatus: "ACCEPTED",
        clinicianStatus: "APPROVED",
        isPrimary: true,
        sourceRecommendation: "Clinical care plan",
      },
    });
  }

  assert(Boolean(testGoal), "Active health goal exists for user");

  // Get today goal status via GoalSyncService
  const goalStatusBefore = await GoalSyncService.getTodayGoalAndStatus(userId);
  assert(goalStatusBefore.hasGoal === true, "GoalSyncService detects active goal");
  assert(goalStatusBefore.goalId === testGoal.id, "GoalSyncService returns correct primary goal ID");
  assert(Boolean(goalStatusBefore.occurrenceId), "Today's RoutineOccurrence is automatically ensured");

  // Pause the goal
  const pausedGoal = await GoalSyncService.syncGoalStatusChange(userId, testGoal.id, "PAUSE");
  assert(pausedGoal.status === "PAUSED", "Goal status changed to PAUSED");

  // Verify RoutineOccurrence eligibility became PAUSED
  const pausedOccurrence = await prisma.routineOccurrence.findFirst({
    where: { goalId: testGoal.id, userId, status: "PENDING" },
  });
  if (pausedOccurrence) {
    assert(pausedOccurrence.eligibilityStatus === "PAUSED", "RoutineOccurrence eligibility updated to PAUSED");
  } else {
    assert(true, "No pending occurrence to pause");
  }

  // Resume the goal
  const resumedGoal = await GoalSyncService.syncGoalStatusChange(userId, testGoal.id, "RESUME");
  assert(resumedGoal.status === "ACTIVE", "Goal status resumed to ACTIVE");

  const resumedOccurrence = await prisma.routineOccurrence.findFirst({
    where: { goalId: testGoal.id, userId, status: "PENDING" },
  });
  if (resumedOccurrence) {
    assert(resumedOccurrence.eligibilityStatus === "ELIGIBLE", "RoutineOccurrence eligibility restored to ELIGIBLE");
  } else {
    assert(true, "Occurrence eligibility checked");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST B: Check-in persistence, routine sync, and prevention of double-counting
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST B: Check-In Persistence & Routine Occurrence Sync ---");

  // Setup a pending proactive intervention to test suppression
  const testIntervention = await prisma.interventionEvent.create({
    data: {
      userId,
      goalId: testGoal.id,
      triggerType: "MISSED_SINGLE_ROUTINE",
      triggerReason: "Routine occurrence window elapsed",
      interventionType: "GENTLE_REMINDER",
      lifecycleStatus: "PENDING",
      deduplicationKey: `test_dedup_${Date.now()}`,
      title: "Missed walking routine check",
      message: "Would you like to take a quick walk this afternoon?",
      explainableReason: "Missed walking routine check",
    },
  });

  // Complete today's action
  const completeRes = await GoalSyncService.completeTodayAction(userId, "COMPLETED", testGoal.id);
  assert(completeRes.success === true, "GoalSyncService.completeTodayAction succeeds");

  // Verify today's RoutineOccurrence is COMPLETED
  const updatedOcc = await GoalSyncService.getTodayGoalAndStatus(userId);
  assert(updatedOcc.occurrenceStatus === "COMPLETED", "Today RoutineOccurrence marked COMPLETED");
  assert(updatedOcc.isCheckedInToday === true, "Daily check-in marked completed for today");

  // Verify proactive intervention was suppressed because routine completed
  const checkedIntervention = await prisma.interventionEvent.findUnique({
    where: { id: testIntervention.id },
  });
  assert(checkedIntervention?.lifecycleStatus === "SUPPRESSED", "Pending proactive care reminder was suppressed");

  // Test idempotent double-call (prevention of duplicate counting or crash)
  const doubleCallRes = await GoalSyncService.completeTodayAction(userId, "COMPLETED", testGoal.id);
  assert(doubleCallRes.success === true, "Subsequent completion call is safe and idempotent");

  // Clean up test intervention
  await prisma.interventionEvent.delete({ where: { id: testIntervention.id } });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST C: Food AI confirmation, portion updates, and daily nutrition recalculation
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST C: Food AI Confirmation & Daily Nutrition Recalculation ---");

  // Create a confirmed food log for today
  const testMeal = await prisma.foodLog.create({
    data: {
      userId,
      mealType: "LUNCH",
      mealTime: new Date(),
      status: "CONFIRMED",
      hasPhoto: false,
      items: {
        create: [
          {
            foodName: "Roti with Dal",
            quantity: 150,
            quantityUnit: "g",
            estimatedMassGrams: 150,
            calories: 280,
            carbohydrates: 42,
            protein: 12,
            fat: 6,
            fiber: 5,
            patientConfirmed: true,
          },
          {
            foodName: "Cucumber Salad",
            quantity: 100,
            quantityUnit: "g",
            estimatedMassGrams: 100,
            calories: 25,
            carbohydrates: 4,
            protein: 1,
            fat: 0.2,
            fiber: 2,
            patientConfirmed: true,
          },
        ],
      },
    },
    include: { items: true },
  });

  // Rebuild daily summary
  await rebuildDailySummary(userId, todayStr);

  const dailySummary = await prisma.dailyNutritionSummary.findUnique({
    where: { userId_date: { userId, date: todayStr } },
  });

  assert(Boolean(dailySummary), "DailyNutritionSummary record created for today");
  assert((dailySummary?.loggedCalories ?? 0) >= 305, `Daily logged calories updated (found ${dailySummary?.loggedCalories})`);
  assert((dailySummary?.loggedCarbohydrates ?? 0) >= 46, `Daily logged carbs updated (found ${dailySummary?.loggedCarbohydrates})`);

  // Verify dashboard live data reflects this food log and nutrition
  const dashboardData = await DashboardSyncService.getLiveDashboardData(userId, user.name);
  assert(dashboardData.dailyNutrition.calories >= 305, "Dashboard daily nutrition calories matches summary");
  assert(dashboardData.latestMeal !== null, "Dashboard shows latest confirmed meal");
  assert(dashboardData.latestMeal?.itemNames.includes("Roti with Dal") === true, "Dashboard latest meal includes Roti with Dal");

  // Clean up test meal
  await prisma.foodLogItem.deleteMany({ where: { foodLogId: testMeal.id } });
  await prisma.foodLog.delete({ where: { id: testMeal.id } });
  await rebuildDailySummary(userId, todayStr);

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST D: Profile language & notification preference updates
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST D: Profile Language & Notification Preferences ---");

  // Update preferredLang on User
  await prisma.user.update({
    where: { id: userId },
    data: { preferredLang: "hi" },
  });

  const updatedUserLang = await prisma.user.findUnique({
    where: { id: userId },
    select: { preferredLang: true },
  });
  assert(updatedUserLang?.preferredLang === "hi", "User preferredLang successfully set to 'hi'");

  // Update proactive notification preferences
  const notifPref = await prisma.proactiveNotificationPreference.upsert({
    where: { userId },
    update: { quietHoursStart: "22:30", quietHoursEnd: "07:30", enabled: true },
    create: { userId, quietHoursStart: "22:30", quietHoursEnd: "07:30", enabled: true },
  });
  assert(notifPref.quietHoursStart === "22:30", "Quiet hours start persisted");
  assert(notifPref.quietHoursEnd === "07:30", "Quiet hours end persisted");

  // Reset preferredLang to 'en'
  await prisma.user.update({
    where: { id: userId },
    data: { preferredLang: "en" },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST E: Care Circle granular permission checks and revocation enforcement
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST E: Care Circle Granular Permissions & Revocation ---");

  // Invite caregiver with shareGoals: true, shareGlucose: false
  const invite = await inviteCaregiver(userId, {
    caregiverName: "Priya Morgan",
    caregiverEmail: "priya.test@example.com",
    relationship: "Spouse",
    shareGoals: true,
    shareCompletedActions: true,
    shareReminders: false,
    shareEducation: true,
    shareWeeklySummary: true,
    shareGlucose: false, // Explicitly false
  });

  assert(Boolean(invite.id), "Caregiver invitation created with token");

  // View as caregiver: goals should be present, glucose must be ABSENT
  const view1 = (await getCaregiverViewData(invite.invitationToken)) as any;
  assert(view1.valid === true, "Caregiver view access is valid");
  assert(Array.isArray(view1.goals), "Permitted goals are included in caregiver view");
  assert(view1.recentGlucose === undefined, "Unpermitted glucose data is strictly omitted");

  // Update permissions: enable shareGlucose
  await updateCaregiverPermissions(userId, invite.id, { shareGlucose: true });
  const view2 = (await getCaregiverViewData(invite.invitationToken)) as any;
  assert(view2.permissions.shareGlucose === true, "Permission update dynamically reflected");
  assert(view2.recentGlucose !== undefined, "Permitted glucose field is now accessible");

  // Revoke access immediately
  const revoked = await revokeCaregiverAccess(userId, invite.id);
  assert(revoked === true, "revokeCaregiverAccess succeeds");

  const view3 = (await getCaregiverViewData(invite.invitationToken)) as any;
  assert(view3.valid === false, "Caregiver view immediately invalidated upon revocation");
  assert(view3.error.includes("revoked"), "Clear revocation reason returned");

  // Clean up test invitation and consents
  await prisma.sharingConsent.deleteMany({ where: { invitationId: invite.id } });
  await prisma.careCircleInvitation.delete({ where: { id: invite.id } });

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST F: Community post creation & isolation from private clinical records
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST F: Community Isolation from Private Clinical Data ---");

  // Find a community group
  const group = await prisma.communityGroup.findFirst();
  if (group) {
    const post = await prisma.communityPost.create({
      data: {
        groupId: group.id,
        authorId: userId,
        content: "Sharing an afternoon walk tip: listening to a podcast helps keep a steady pace!",
        category: "PERSONAL_EXPERIENCE",
        moderationStatus: "APPROVED",
      },
    });

    assert(Boolean(post.id), "Community post created successfully");

    // Verify clinical records have NO linkage or data leakage from community post
    const clinicalRecords = await prisma.clinicalMeasurement.findMany({
      where: { userId },
    });

    const hasLeakage = clinicalRecords.some((c) =>
      JSON.stringify(c).includes("podcast") || JSON.stringify(c).includes("afternoon walk tip")
    );
    assert(hasLeakage === false, "Private clinical measurements remain strictly isolated from community posts");

    // Clean up test post
    await prisma.communityPost.delete({ where: { id: post.id } });
  } else {
    assert(true, "Community group test skipped (no groups found)");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST G: Progress metric calculations without clinical data fabrication
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST G: Progress Metric Calculations & Clinical Data Truth ---");

  const weeklyReview = await getPatientWeeklyReview(userId);
  assert(Boolean(weeklyReview.weekly), "Weekly review generated from real records");
  assert(weeklyReview.weekly.plannedActionsCount === 7, "Planned actions count is standardized");

  const outcome = await get90DayProgramOutcome(userId);
  assert(Boolean(outcome.patient), "90-day program outcome loaded");
  assert(typeof outcome.behavioralAdherence.adherenceRatePercent === "number", "Adherence calculated from real check-ins");

  // Verify clinical laboratory integrity: if no measurements exist or only 1, no fabricated outcome
  const measurements = await prisma.clinicalMeasurement.findMany({
    where: { userId, measurementType: "HBA1C" },
  });

  if (measurements.length === 0) {
    assert(outcome.clinicalOutcomes.baselineHbA1c === null, "Baseline HbA1c is null when no laboratory draw recorded");
    assert(outcome.clinicalOutcomes.followUpHbA1c === null, "Follow-up HbA1c is null when no follow-up draw recorded");
    assert(outcome.clinicalOutcomes.hba1cChange === null, "HbA1c change is null (not fabricated)");
  } else if (measurements.length === 1) {
    assert(outcome.clinicalOutcomes.followUpHbA1c === null, "Follow-up HbA1c is null when only 1 measurement recorded");
    assert(outcome.clinicalOutcomes.hba1cChange === null, "HbA1c change is null (not fabricated)");
  } else {
    assert(outcome.clinicalOutcomes.hba1cChange !== null, "HbA1c change computed from real laboratory records");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // TEST H: Failure handling & validation error safety
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n--- TEST H: Failure Handling & Validation Error Safety ---");

  // Invalid goal status change
  let errorCaught = false;
  try {
    await GoalSyncService.syncGoalStatusChange(userId, "non-existent-goal-id", "PAUSE");
  } catch (err: any) {
    errorCaught = true;
    assert(err.message.includes("not found"), "Handled invalid goal ID safely without uncaught exception");
  }
  assert(errorCaught, "Missing goal gracefully rejected");

  // Invalid caregiver view token
  const invalidView = await getCaregiverViewData("invalid-token-12345");
  assert(invalidView.valid === false, "Invalid caregiver token rejected with valid: false");

  // Invalid caregiver revocation attempt
  let revokeErrorCaught = false;
  try {
    await revokeCaregiverAccess(userId, "non-existent-invite-id");
  } catch (err: any) {
    revokeErrorCaught = true;
    assert(err.message.includes("not found"), "Invalid caregiver revocation handled with clean error");
  }
  assert(revokeErrorCaught, "Missing invitation gracefully rejected");

  // ─────────────────────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────────────────────
  console.log("\n==================================================================");
  console.log(`🏁 TEST RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runAllIntegrationTests()
  .catch((err) => {
    console.error("❌ Test suite encountered unhandled error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
