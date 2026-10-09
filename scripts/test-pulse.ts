import { prisma } from "../lib/db";
import bcrypt from "bcryptjs";
import { evaluateBarrierForRecovery } from "../services/pulse/recoveryEngine";
import { evaluateSafetyRules } from "../services/pulse/safetyService";
import { askPulseCoach } from "../services/pulse/coachService";
import { inviteCaregiver, revokeCaregiverAccess, getCaregiverViewData } from "../services/pulse/careCircleService";
import { get90DayProgramOutcome, getPatientWeeklyReview } from "../services/pulse/reviewService";

async function runPulseTestSuite() {
  console.log("==================================================");
  console.log("🧪 RUNNING PROJECT PULSE INTEGRATED TEST SUITE");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // Find Demo Patient
  const patient = await prisma.user.findUnique({
    where: { email: "alex.morgan@pulsehealth.demo" },
    include: { patientProfile: true, goals: true },
  });

  if (!patient) {
    throw new Error("Demo patient not found. Run scripts/seed-pulse.ts first.");
  }

  // 1. TEST: Care Plan & SMART Goals Structure
  console.log("1. Pulse Plan & SMART Goals Validation:");
  const activeGoals = await prisma.healthGoal.findMany({
    where: { userId: patient.id, status: "ACTIVE" },
  });
  assert(activeGoals.length >= 3, "Patient has active SMART goals configured");
  const walkGoal = activeGoals.find((g) => g.category === "activity");
  assert(Boolean(walkGoal && walkGoal.titleHindi), "Goal contains bilingual Hindi title");
  assert(walkGoal?.isNonMedical === true, "Lifestyle goal correctly flagged as non-medical for recovery adaptation");

  // 2. TEST: Engagement Recovery Engine Logic
  console.log("\n2. Engagement Recovery Engine Unit Tests:");
  const proposalBusy = evaluateBarrierForRecovery("Busy schedule", walkGoal?.title || "10-minute walk");
  assert(proposalBusy.isNonMedicalAdjustment === true, "Recovery proposal strictly maintains non-medical boundaries");
  assert(proposalBusy.suggestedActionTitle.includes("micro-walk"), "Recovery engine adapted duration for busy schedule");
  assert(!proposalBusy.rationale.includes("medicine") && !proposalBusy.rationale.includes("dose"), "Zero medication alteration in recovery proposals");

  const proposalUnwell = evaluateBarrierForRecovery("Felt unwell", walkGoal?.title || "10-minute walk");
  assert(proposalUnwell.suggestedActionTitle.includes("rest") || proposalUnwell.suggestedActionTitleHindi.includes("आराम"), "Recovery engine honors unwellness with compassionate rest rather than pressure");

  // 3. TEST: Clinical Safety Interceptor
  console.log("\n3. Safety Interceptor & Red-Flag Clinical Boundary Tests:");
  const redFlagSevereHypo = await evaluateSafetyRules(
    patient.id,
    "My blood sugar is 48 and I feel very shaky",
    "GLUCOSE_READING",
    48
  );
  assert(redFlagSevereHypo.isSafe === false, "Severe hypoglycemia (<55 mg/dL) identified as clinical emergency");
  assert(redFlagSevereHypo.severity === "EMERGENCY", "Severity flagged as EMERGENCY");

  const redFlagMedication = await evaluateSafetyRules(
    patient.id,
    "Can I double dose my Metformin tonight?",
    "COACH_QUERY"
  );
  assert(redFlagMedication.isSafe === false, "Prescription medication adjustment query intercepted");
  assert(redFlagMedication.severity === "HIGH", "Medication alteration flagged as HIGH severity");

  // Clean up any test safety escalations created during tests
  await prisma.safetyEscalation.deleteMany({
    where: {
      patientId: patient.id,
      reason: { contains: "Severe Hypoglycemia Flagged: 48" },
    },
  });
  await prisma.safetyEscalation.deleteMany({
    where: {
      patientId: patient.id,
      reason: { contains: "Medication / insulin dosage alteration" },
    },
  });

  // 4. TEST: Bilingual Pulse Coach with Grounded Evidence
  console.log("\n4. Pulse Coach Grounded Retrieval Tests:");
  const nutritionAnswerHi = await askPulseCoach(patient.id, "मुझे थाली में क्या खाना चाहिए?", "hi");
  assert(nutritionAnswerHi.answerHindi.length > 50, "Coach responded in empathetic Hindi");
  assert(Boolean(nutritionAnswerHi.citedArticleSource), "Coach attached certified clinical citations");
  assert(nutritionAnswerHi.isSafetyEscalation === false, "Standard lifestyle query properly identified as non-emergency");

  // 5. TEST: Pulse Care Circle & Patient-Controlled Privacy
  console.log("\n5. Pulse Care Circle Permissions & Revocation Tests:");
  const invite = await inviteCaregiver(patient.id, {
    caregiverName: "Test Caregiver",
    caregiverEmail: "test.caregiver@demo.com",
    relationship: "Sibling",
    shareGoals: true,
    shareCompletedActions: true,
    shareReminders: true,
    shareEducation: true,
    shareWeeklySummary: true,
    shareGlucose: false, // Explicit opt-in false
  });
  assert(Boolean(invite.invitationToken), "Generated 14-day secure invitation token");

  const viewData = await getCaregiverViewData(invite.invitationToken);
  assert(viewData.valid === true, "Valid token retrieves patient-approved data");
  assert(viewData.recentGlucose === undefined, "Unshared sensitive metric (glucose) is strictly hidden from caregiver");

  // Test Instant Revocation
  await revokeCaregiverAccess(patient.id, invite.id);
  const revokedView = await getCaregiverViewData(invite.invitationToken);
  assert(revokedView.valid === false, "Instant 1-click revocation immediately disables caregiver access link");

  // Clean up test invite
  await prisma.careCircleInvitation.delete({ where: { id: invite.id } });

  // 6. TEST: 90-Day Outcomes & Verified Laboratory HbA1c
  console.log("\n6. Pulse Review 90-Day Outcome & Verified HbA1c Tests:");
  const outcome = await get90DayProgramOutcome(patient.id);
  assert(outcome.clinicalOutcomes.baselineHbA1c?.value === 7.8, "Baseline HbA1c matches verified lab draw (7.8%)");
  assert(outcome.clinicalOutcomes.followUpHbA1c?.value === 7.1, "90-Day follow-up HbA1c matches verified lab draw (7.1%)");
  assert(outcome.clinicalOutcomes.hba1cChange === -0.7, "Correct net reduction calculated (-0.7%)");
  assert(outcome.behavioralAdherence.returnToRoutineRatePercent > 0, "7-day return-to-routine rate calculated");

  // 7. TEST: Weekly Progress Review
  console.log("\n7. Weekly Progress Aggregation Tests:");
  const weeklyReview = await getPatientWeeklyReview(patient.id, 2);
  assert(weeklyReview.weekly.plannedActionsCount === 7, "Weekly review aggregates 7-day cycle");
  assert(weeklyReview.weekly.completedActionsCount >= 4, "Weekly completed actions properly tallied");

  console.log("\n==================================================");
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPulseTestSuite()
  .catch((e) => {
    console.error("Test execution error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
