import { prisma } from "@/lib/db";

export interface RecoveryProposal {
  reportedBarrier: string;
  suggestedActionTitle: string;
  suggestedActionTitleHindi: string;
  rationale: string;
  rationaleHindi: string;
  isNonMedicalAdjustment: boolean;
  requiresClinicianApproval: boolean;
}

export function evaluateBarrierForRecovery(barrier: string, originalGoalTitle: string): RecoveryProposal {
  switch (barrier) {
    case "Busy schedule":
      return {
        reportedBarrier: barrier,
        suggestedActionTitle: "5-minute micro-walk instead of full session",
        suggestedActionTitleHindi: "पूरी सैर के बजाय केवल 5 मिनट की छोटी वॉक करें",
        rationale: "When time is tight, even 5 minutes of gentle movement helps muscles utilize postprandial glucose.",
        rationaleHindi: "समय कम होने पर भी केवल 5 मिनट की चहलकदमी भोजन के बाद ग्लूकोज को नियंत्रित करने में सहायक होती है।",
        isNonMedicalAdjustment: true,
        requiresClinicianApproval: false,
      };

    case "Forgot":
      return {
        reportedBarrier: barrier,
        suggestedActionTitle: "Set an automated reminder 15 minutes post-lunch",
        suggestedActionTitleHindi: "दोपहर के भोजन के 15 मिनट बाद का रिमाइंडर सेट करें",
        rationale: "A timely, non-intrusive reminder bridges the gap between good intentions and busy daily life.",
        rationaleHindi: "समय पर मिलने वाला साधारण रिमाइंडर व्यस्त दिनचर्या में भी लक्ष्य पूरा करने में मदद करता है।",
        isNonMedicalAdjustment: true,
        requiresClinicianApproval: false,
      };

    case "Low motivation":
      return {
        reportedBarrier: barrier,
        suggestedActionTitle: "Take 100 gentle steps indoors while listening to music",
        suggestedActionTitleHindi: "संगीत सुनते हुए घर के अंदर ही 100 कदम धीरे-धीरे चलें",
        rationale: "Starting is the hardest part. A micro-step removes mental friction without judgment.",
        rationaleHindi: "शुरुआत करना सबसे कठिन होता है। बिना किसी दबाव के छोटा कदम उठाना मानसिक तनाव घटाता है।",
        isNonMedicalAdjustment: true,
        requiresClinicianApproval: false,
      };

    case "Goal felt too difficult":
      return {
        reportedBarrier: barrier,
        suggestedActionTitle: "Reduce frequency to 3 days/week with shorter 8-minute duration",
        suggestedActionTitleHindi: "अवधि घटाकर 8 मिनट और सप्ताह में केवल 3 दिन करें",
        rationale: "Consistency beats intensity. An easier goal that you actually complete builds lasting self-efficacy.",
        rationaleHindi: "कठिन लक्ष्य से बेहतर है ऐसा आसान लक्ष्य जिसे आप नियमित रूप से पूरा कर सकें।",
        isNonMedicalAdjustment: true,
        requiresClinicianApproval: false,
      };

    case "Pain or mobility difficulty":
      return {
        reportedBarrier: barrier,
        suggestedActionTitle: "Gentle seated leg stretches & request physiotherapist review",
        suggestedActionTitleHindi: "कुर्सी पर बैठकर हल्के पैर के खिंचाव करें और डॉक्टर से सलाह लें",
        rationale: "Never push through sharp pain. Seated movements maintain circulation safely.",
        rationaleHindi: "दर्द में ज़बरदस्ती न करें। कुर्सी पर बैठकर किया जाने वाला हल्का व्यायाम सुरक्षित है।",
        isNonMedicalAdjustment: true,
        requiresClinicianApproval: true,
      };

    case "Felt unwell":
      return {
        reportedBarrier: barrier,
        suggestedActionTitle: "Pause physical activity for today & rest comfortably",
        suggestedActionTitleHindi: "आज के लिए गतिविधि रोकें और आराम करें",
        rationale: "Your body needs rest when unwell. If symptoms persist or blood sugar is abnormal, contact your care team.",
        rationaleHindi: "तबीयत खराब होने पर आराम ज़रूरी है। यदि समस्या बनी रहे तो तुरंत डॉक्टर से संपर्क करें।",
        isNonMedicalAdjustment: true,
        requiresClinicianApproval: false,
      };

    default:
      return {
        reportedBarrier: barrier,
        suggestedActionTitle: "Take a relaxed 5-minute break and reset for tomorrow",
        suggestedActionTitleHindi: "आज 5 मिनट विश्राम करें और कल नई शुरुआत करें",
        rationale: "Routines fluctuate in real life. Restarting without guilt is the core of sustainable diabetes recovery.",
        rationaleHindi: "जीवन में उतार-चढ़ाव आते हैं। बिना किसी अपराधबोध के फिर से शुरू करना ही सच्ची सफलता है।",
        isNonMedicalAdjustment: true,
        requiresClinicianApproval: false,
      };
  }
}

export async function recordRecoveryEvent(
  patientId: string,
  goalId: string,
  missedDate: string,
  barrier: string
) {
  const goal = await prisma.healthGoal.findUnique({ where: { id: goalId } });
  const proposal = evaluateBarrierForRecovery(barrier, goal?.title || "Daily Routine");

  const event = await prisma.recoveryEvent.create({
    data: {
      patientId,
      goalId,
      missedDate,
      reportedBarrier: barrier,
      suggestedResponse: proposal.rationale,
      suggestedActionTitle: proposal.suggestedActionTitle,
      patientDecision: "PENDING",
      status: proposal.requiresClinicianApproval ? "ESCALATED_TO_CLINICIAN" : "PENDING",
    },
  });

  return { event, proposal };
}

export async function getPatientRecoveryMetrics(patientId: string) {
  const events = await prisma.recoveryEvent.findMany({
    where: { patientId },
    orderBy: { recoveryTimestamp: "desc" },
  });

  const totalMissed = events.length;
  const resolved = events.filter((e) => e.status === "RESOLVED").length;
  const returnToRoutineCount = events.filter((e) => e.subsequentActionDone === true).length;

  const returnToRoutineRate =
    totalMissed > 0 ? Math.round((returnToRoutineCount / totalMissed) * 100) : 100;

  return {
    totalMissedRoutines: totalMissed,
    resolvedRecoveries: resolved,
    returnToRoutineCount,
    returnToRoutineRate,
    events,
  };
}
