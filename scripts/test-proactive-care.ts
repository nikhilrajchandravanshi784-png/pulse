/**
 * Project Pulse — Automated Test Suite for Pulse Proactive Care Intervention Engine
 * Verifies routine monitoring, trigger detection, safety-first routing, barrier adjustments,
 * notification policy safeguards, and end-to-end recovery tracking.
 */

import { prisma } from "../lib/db";
import {
  RoutineMonitoringService,
  TriggerDetectionService,
  InterventionDecisionService,
  RecoverySuggestionService,
  SafetyRoutingService,
  NotificationPolicyService,
  InterventionLifecycleService,
  RecoveryTrackingService,
  ProactiveCareEngine,
} from "../services/proactiveCare";

async function runProactiveCareTests() {
  console.log("==================================================================");
  console.log("🧪 RUNNING PULSE PROACTIVE CARE AUTOMATED TEST SUITE");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details ? `(${details})` : ""}`);
      failed++;
    }
  }

  // 1. SETUP TEST USER & GOALS
  console.log("--- 1. TEST PATIENT & SMART GOALS SETUP ---");
  const testPatient = await prisma.user.upsert({
    where: { email: "test-proactive-patient@pulse.internal" },
    create: {
      email: "test-proactive-patient@pulse.internal",
      name: "Kavita Devi",
      passwordHash: "$2a$10$fakePasswordHashForProactiveCareTesting123",
      role: "PATIENT",
      preferredLang: "hi",
    },
    update: {},
  });

  // Ensure default notification preferences
  await prisma.proactiveNotificationPreference.upsert({
    where: { userId: testPatient.id },
    create: {
      userId: testPatient.id,
      enabled: true,
      preferredLanguage: "hi",
      preferredChannel: "IN_APP",
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      maxDailyInterventions: 3,
      cooldownHours: 2,
    },
    update: {
      enabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      maxDailyInterventions: 3,
      cooldownHours: 2,
    },
  });

  // Active non-medical physical goal
  const walkGoal = await prisma.healthGoal.create({
    data: {
      userId: testPatient.id,
      title: "15-minute post-lunch walk",
      titleHindi: "दोपहर के भोजन के बाद 15 मिनट टहलें",
      category: "activity",
      targetDurationMin: 15,
      preferredTime: "13:30",
      frequency: "5 days/week",
      isNonMedical: true,
      status: "ACTIVE",
      patientStatus: "ACCEPTED",
    },
  });

  // Paused goal (should be ignored by monitoring)
  const pausedGoal = await prisma.healthGoal.create({
    data: {
      userId: testPatient.id,
      title: "Morning brisk jog",
      category: "activity",
      targetDurationMin: 20,
      isNonMedical: true,
      status: "PAUSED",
      patientStatus: "PAUSED",
    },
  });

  assert(Boolean(testPatient.id), "Test patient created and initialized");
  assert(Boolean(walkGoal.id), "Active SMART goal configured for routine monitoring");
  assert(pausedGoal.status === "PAUSED", "Paused goal created for suppression validation");

  // 2. ROUTINE OCCURRENCE MONITORING & MISSED DETECTION
  console.log("\n--- 2. ROUTINE MONITORING & MISSED OCCURRENCE DETECTION ---");
  const pastScheduled = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago (well past grace period)

  const occurrence1 = await prisma.routineOccurrence.create({
    data: {
      userId: testPatient.id,
      goalId: walkGoal.id,
      scheduledAt: pastScheduled,
      status: "PENDING",
      eligibilityStatus: "ELIGIBLE",
    },
  });

  // Paused goal occurrence (should not be evaluated)
  const pausedOccurrence = await prisma.routineOccurrence.create({
    data: {
      userId: testPatient.id,
      goalId: pausedGoal.id,
      scheduledAt: pastScheduled,
      status: "PENDING",
      eligibilityStatus: "PAUSED",
    },
  });

  const evaluated = await RoutineMonitoringService.evaluateEligibleRoutines(testPatient.id, 60);
  const matchedOcc1 = evaluated.find((e) => e.occurrenceId === occurrence1.id);
  const matchedPaused = evaluated.find((e) => e.occurrenceId === pausedOccurrence.id);

  assert(Boolean(matchedOcc1?.isMissed), "Eligible routine detected as missed after 60-min grace period");
  assert(matchedPaused === undefined, "Paused goal occurrence properly excluded from routine monitoring");

  // Verify DB occurrence status updated to MISSED
  const updatedOcc1 = await prisma.routineOccurrence.findUnique({ where: { id: occurrence1.id } });
  assert(updatedOcc1?.status === "MISSED", "RoutineOccurrence status updated to MISSED in database");

  // 3. TRIGGER DETECTION & DEDUPLICATION
  console.log("\n--- 3. TRIGGER DETECTION & DEDUPLICATION ---");
  const triggers = TriggerDetectionService.detectFromRoutineEvaluations(evaluated);
  assert(triggers.length >= 1, "Trigger detection identified candidate routine changes");
  assert(triggers[0].triggerType === "MISSED_SINGLE_ROUTINE", "Identified trigger type MISSED_SINGLE_ROUTINE");
  assert(triggers[0].deduplicationKey.startsWith("trig:MISSED_SINGLE_ROUTINE"), "Generated deterministic deduplication key");

  // 4. INTERVENTION CREATION & POLICY ENFORCEMENT
  console.log("\n--- 4. INTERVENTION CREATION & POLICY SAFEGUARDS ---");
  const intervention1 = await InterventionLifecycleService.createIntervention({
    userId: testPatient.id,
    triggerType: triggers[0].triggerType,
    triggerReason: triggers[0].triggerReason,
    goalId: triggers[0].goalId,
    routineOccurrenceId: triggers[0].routineOccurrenceId,
    deduplicationKey: triggers[0].deduplicationKey,
  });

  assert(Boolean(intervention1?.id), "Proactive intervention created and persisted in database");
  assert(intervention1?.lifecycleStatus === "DELIVERED", "Intervention initialized in DELIVERED state");
  assert(Boolean(intervention1?.explainableReason), "Intervention includes transparent explainable reason");

  // Idempotency: Attempt creating exact same intervention again
  const duplicateAttempt = await InterventionLifecycleService.createIntervention({
    userId: testPatient.id,
    triggerType: triggers[0].triggerType,
    triggerReason: triggers[0].triggerReason,
    goalId: triggers[0].goalId,
    routineOccurrenceId: triggers[0].routineOccurrenceId,
    deduplicationKey: triggers[0].deduplicationKey,
  });
  assert(duplicateAttempt === null, "Duplicate intervention suppressed via deduplication key");

  // 5. NOTIFICATION POLICY: QUIET HOURS & OPT-OUT
  console.log("\n--- 5. NOTIFICATION POLICY: QUIET HOURS & OPT-OUT ---");
  // Test quiet hours evaluation helper
  const nightTime = new Date("2026-10-09T23:30:00Z"); // 23:30
  const isQuiet = NotificationPolicyService.isWithinQuietHours(nightTime, "22:00", "07:00", "UTC");
  assert(isQuiet === true, "Overnight quiet hours accurately detected (23:30 within 22:00-07:00)");

  const dayTime = new Date("2026-10-09T14:00:00Z"); // 14:00
  const isDayQuiet = NotificationPolicyService.isWithinQuietHours(dayTime, "22:00", "07:00", "UTC");
  assert(isDayQuiet === false, "Daytime active hours accurately allowed (14:00 outside 22:00-07:00)");

  // Opt-out test
  await prisma.proactiveNotificationPreference.update({
    where: { userId: testPatient.id },
    data: { enabled: false },
  });

  const optOutPolicy = await NotificationPolicyService.evaluatePolicy(
    testPatient.id,
    `test_optout_key_${Date.now()}`
  );
  assert(optOutPolicy.allowed === false, "Opt-out immediately respected; proactive contact blocked");
  assert(optOutPolicy.suppressReason === "OPTED_OUT", "Suppression reason correctly recorded as OPTED_OUT");

  // Restore enabled state for remaining tests
  await prisma.proactiveNotificationPreference.update({
    where: { userId: testPatient.id },
    data: { enabled: true, cooldownHours: 0 }, // zero cooldown for deterministic test flow
  });

  // 6. BARRIER IDENTIFICATION & RECOVERY PROPOSALS
  console.log("\n--- 6. BARRIER IDENTIFICATION & TAILORED RECOVERY ---");
  const busyProposal = RecoverySuggestionService.generateProposal("BUSY_SCHEDULE", walkGoal);
  assert(busyProposal.suggestedDurationMin !== undefined && busyProposal.suggestedDurationMin < 15, "Busy schedule suggests shorter micro-routine (<15m)");
  assert(busyProposal.options.some((o) => o.type === "TRY_SMALLER_STEP"), "Includes option to try smaller step");
  assert(busyProposal.options.some((o) => o.type === "CHANGE_TIME"), "Includes option to reschedule time");

  const diffProposal = RecoverySuggestionService.generateProposal("TOO_DIFFICULT", walkGoal);
  assert(diffProposal.suggestedDurationMin !== undefined, "Goal too difficult suggests reduced duration");

  const unwellProposal = RecoverySuggestionService.generateProposal("FELT_UNWELL", walkGoal);
  assert(unwellProposal.options.some((o) => o.type === "PAUSE_REST"), "Unwell barrier provides compassionate pause without pressure");

  const painProposal = RecoverySuggestionService.generateProposal("PAIN_OR_MOBILITY", walkGoal);
  assert(painProposal.options.some((o) => o.type === "REQUEST_HELP"), "Pain barrier offers care team consultation rather than forcing exercise");

  // 7. PATIENT BARRIER RESPONSE & SUGGESTION ACCEPTANCE
  console.log("\n--- 7. PATIENT RESPONSE & GOAL ADAPTATION ---");
  if (intervention1) {
    const barrierResp = await InterventionLifecycleService.recordBarrierResponse(
      intervention1.id,
      "BUSY_SCHEDULE",
      "Held in evening client review meeting"
    );
    assert(barrierResp.status === "SUPPORT_OFFERED", "Recorded barrier and transitioned lifecycle to SUPPORT_OFFERED");

    // Accept suggestion: reduce duration to 7 minutes
    const acceptRes = await InterventionLifecycleService.acceptSuggestion(
      intervention1.id,
      "opt_micro_step",
      { adjustedDurationMin: 7, adjustedTime: "20:00" }
    );
    assert(acceptRes.success === true, "Patient accepted recovery suggestion successfully");

    // Verify goal adaptation
    const adaptedGoal = await prisma.healthGoal.findUnique({ where: { id: walkGoal.id } });
    assert(adaptedGoal?.targetDurationMin === 7, "Non-medical health goal targetDurationMin adapted to 7 minutes");
    assert(adaptedGoal?.preferredTime === "20:00", "Goal preferredTime adapted to 20:00");

    // Verify RecoveryOutcome record created
    const outcome = await prisma.recoveryOutcome.findUnique({ where: { interventionId: intervention1.id } });
    assert(outcome?.outcomeStatus === "PENDING", "RecoveryOutcome created in PENDING state awaiting subsequent routine");
    assert(Boolean(outcome?.nextEligibleOccurrenceId), "RecoveryOutcome linked to next scheduled routine occurrence");
  }

  // 8. VERIFY SUBSEQUENT ROUTINE RESUMPTION & RECOVERY
  console.log("\n--- 8. SUBSEQUENT ROUTINE RESUMPTION & RECOVERY ---");
  if (intervention1) {
    const outcome = await prisma.recoveryOutcome.findUnique({ where: { interventionId: intervention1.id } });
    if (outcome?.nextEligibleOccurrenceId) {
      // Simulate patient completing the next scheduled occurrence
      const completionResult = await RecoveryTrackingService.recordRoutineCompletion(
        outcome.nextEligibleOccurrenceId
      );
      assert(completionResult?.recovered === true, "Recovery recorded upon subsequent routine completion");

      // Verify RecoveryOutcome status updated to RECOVERED
      const verifiedOutcome = await prisma.recoveryOutcome.findUnique({ where: { id: outcome.id } });
      assert(verifiedOutcome?.outcomeStatus === "RECOVERED", "RecoveryOutcome outcomeStatus updated to RECOVERED");
      assert(Boolean(verifiedOutcome?.recoveredAt), "Recovered timestamp recorded");

      // Verify parent intervention event marked as RESOLVED
      const resolvedIntervention = await prisma.interventionEvent.findUnique({ where: { id: intervention1.id } });
      assert(resolvedIntervention?.lifecycleStatus === "RESOLVED", "InterventionEvent lifecycle marked as RESOLVED");
    }
  }

  // 9. REPEATED MISSED ROUTINES PATTERN
  console.log("\n--- 9. REPEATED MISSED ROUTINES DETECTION ---");
  const past2 = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const past3 = new Date(Date.now() - 4 * 60 * 60 * 1000);

  await prisma.routineOccurrence.create({
    data: {
      userId: testPatient.id,
      goalId: walkGoal.id,
      scheduledAt: past2,
      status: "MISSED",
      eligibilityStatus: "ELIGIBLE",
    },
  });

  const repeatOcc = await prisma.routineOccurrence.create({
    data: {
      userId: testPatient.id,
      goalId: walkGoal.id,
      scheduledAt: past3,
      status: "PENDING",
      eligibilityStatus: "ELIGIBLE",
    },
  });

  const repeatEvaluated = await RoutineMonitoringService.evaluateEligibleRoutines(testPatient.id, 60);
  const repeatTriggers = TriggerDetectionService.detectFromRoutineEvaluations(repeatEvaluated);
  const repeatedTrigger = repeatTriggers.find((t) => t.triggerType === "REPEATED_MISSED_ROUTINES");

  assert(Boolean(repeatedTrigger), "Consecutive missed routines detected as REPEATED_MISSED_ROUTINES");

  // 10. SAFETY-FIRST ROUTING & RED-FLAG INTERCEPTION
  console.log("\n--- 10. SAFETY-FIRST ROUTING & CLINICAL INTERCEPTION ---");
  // Test emergency symptom detection
  const emergencyCheck = SafetyRoutingService.assessContext(
    "FELT_UNWELL",
    "Feeling severe chest pain and difficulty breathing"
  );
  assert(emergencyCheck.isSafetyConcern === true, "Emergency symptoms flagged as safety concern");
  assert(emergencyCheck.severity === "EMERGENCY", "Severity set to EMERGENCY");
  assert(emergencyCheck.emergencyActions.length > 0, "Emergency actions provided (call 108/112)");

  // Test medication adjustment inquiry
  const medCheck = SafetyRoutingService.assessContext(
    "SOMETHING_ELSE",
    "Should I increase my insulin dose tonight?"
  );
  assert(medCheck.isSafetyConcern === true, "Medication alteration query flagged as safety concern");
  assert(medCheck.severity === "HIGH", "Medication alteration query marked as HIGH severity");

  // Safety escalation creation in DB
  const escalation = await SafetyRoutingService.createEscalation(
    testPatient.id,
    emergencyCheck,
    "Patient reported severe chest pain"
  );
  assert(Boolean(escalation?.id), "SafetyEscalation record persisted in database");
  assert(escalation?.triggerSource === "PROACTIVE_CARE", "SafetyEscalation triggerSource flagged as PROACTIVE_CARE");
  assert(escalation?.resolutionStatus === "OPEN", "SafetyEscalation initialized in OPEN status");

  // 11. CLINICIAN QUEUE & RECOVERY METRICS
  console.log("\n--- 11. CLINICIAN QUEUE & RECOVERY METRICS ---");
  const metrics = await RecoveryTrackingService.computeMetrics(testPatient.id);
  assert(metrics.interventionsIssued >= 1, "Metrics accurately calculated interventionsIssued");
  assert(metrics.routinesRecoveredCount >= 1, "Metrics accurately calculated routinesRecoveredCount");
  assert(metrics.unresolvedSafetyEscalationsCount >= 1, "Metrics identified unresolved safety escalations");
  assert(typeof metrics.routineRecoveryRatePercent === "number", "Computed routineRecoveryRatePercent");

  // Clean-up test goals & user
  console.log("\n--- CLEANUP ---");
  await prisma.routineOccurrence.deleteMany({ where: { userId: testPatient.id } });
  await prisma.interventionEvent.deleteMany({ where: { userId: testPatient.id } });
  await prisma.safetyEscalation.deleteMany({ where: { patientId: testPatient.id } });
  await prisma.healthGoal.deleteMany({ where: { userId: testPatient.id } });
  await prisma.proactiveNotificationPreference.deleteMany({ where: { userId: testPatient.id } });
  await prisma.user.delete({ where: { id: testPatient.id } });
  console.log("  Cleaned up test data safely.");

  console.log("\n==================================================================");
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runProactiveCareTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
