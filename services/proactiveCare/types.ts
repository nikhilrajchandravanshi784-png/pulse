/**
 * Project Pulse — Proactive Care Domain Types & Constants
 * Defines triggers, intervention types, lifecycle states, barrier taxonomy, and DTOs.
 */

export type TriggerType =
  | "MISSED_SINGLE_ROUTINE"
  | "REPEATED_MISSED_ROUTINES"
  | "GOAL_REPEATEDLY_TOO_DIFFICULT"
  | "PATIENT_REQUESTED_HELP"
  | "ROUTINE_RESUMED"
  | "RECOVERY_SUPPORT_NEEDED"
  | "CLINICAL_CONCERN_REPORTED";

export type InterventionType =
  | "GENTLE_REMINDER"
  | "ASK_BARRIER"
  | "SUGGEST_SMALLER_STEP"
  | "OFFER_RESCHEDULE"
  | "SHARE_EDUCATION"
  | "CONTACT_CARE_TEAM"
  | "SUPPRESS"
  | "SAFETY_ESCALATION";

export type LifecycleStatus =
  | "DETECTED"
  | "ELIGIBILITY_CHECKED"
  | "PENDING"
  | "DELIVERED"
  | "PATIENT_RESPONDED"
  | "SUPPORT_OFFERED"
  | "SUPPORT_ACCEPTED"
  | "SUPPORT_DECLINED"
  | "RECOVERY_TRACKING"
  | "RESOLVED"
  | "SUPPRESSED"
  | "EXPIRED"
  | "CANCELLED"
  | "ESCALATED_FOR_REVIEW";

export type BarrierCategory =
  | "BUSY_SCHEDULE"
  | "FORGOT"
  | "LOW_MOTIVATION"
  | "TOO_DIFFICULT"
  | "COST_OR_ACCESS"
  | "DID_NOT_UNDERSTAND"
  | "FELT_UNWELL"
  | "PAIN_OR_MOBILITY"
  | "RESPONSIBILITIES"
  | "SOMETHING_ELSE"
  | "PREFER_NOT_TO_SAY";

export type DeliveryChannel = "IN_APP" | "EMAIL" | "PUSH";

export type DeliveryStatus = "PENDING" | "DELIVERED" | "FAILED" | "SUPPRESSED";

export type RecoveryOutcomeStatus = "PENDING" | "RECOVERED" | "UNRESOLVED" | "EXPIRED";

export interface BarrierDefinition {
  id: BarrierCategory;
  labelEn: string;
  labelHi: string;
  descriptionEn: string;
  descriptionHi: string;
  isSafetySignal?: boolean;
}

export const BARRIER_CATALOG: BarrierDefinition[] = [
  {
    id: "BUSY_SCHEDULE",
    labelEn: "Busy schedule",
    labelHi: "व्यस्त दिनचर्या",
    descriptionEn: "Work or daily commitments took longer than expected.",
    descriptionHi: "काम या जिम्मेदारियों में समय अधिक लग गया।",
  },
  {
    id: "FORGOT",
    labelEn: "Forgot the routine",
    labelHi: "समय पर याद नहीं रहा",
    descriptionEn: "Slipped mind during a busy period.",
    descriptionHi: "व्यस्तता के कारण समय का ध्यान नहीं रहा।",
  },
  {
    id: "TOO_DIFFICULT",
    labelEn: "The step felt too difficult",
    labelHi: "लक्ष्य बहुत कठिन लगा",
    descriptionEn: "Current target duration or intensity feels excessive.",
    descriptionHi: "वर्तमान समय या प्रयास आज बहुत भारी लगा।",
  },
  {
    id: "LOW_MOTIVATION",
    labelEn: "Low energy or motivation",
    labelHi: "ऊर्जा या प्रेरणा में कमी",
    descriptionEn: "Feeling fatigued or drained.",
    descriptionHi: "थकान महसूस हो रही थी।",
  },
  {
    id: "FELT_UNWELL",
    labelEn: "Felt unwell or fatigued",
    labelHi: "तबीयत ठीक नहीं लग रही थी",
    descriptionEn: "Physical symptoms or weakness required rest.",
    descriptionHi: "कमजोरी या अस्वस्थता के कारण विश्राम आवश्यक था।",
    isSafetySignal: true,
  },
  {
    id: "PAIN_OR_MOBILITY",
    labelEn: "Pain or movement difficulty",
    labelHi: "दर्द या चलने-फिरने में कठिनाई",
    descriptionEn: "Joint, muscle, or back discomfort.",
    descriptionHi: "जोड़ों, मांसपेशियों या पीठ में असुविधा।",
    isSafetySignal: true,
  },
  {
    id: "RESPONSIBILITIES",
    labelEn: "Family or caregiving responsibilities",
    labelHi: "पारिवारिक या घरेलू जिम्मेदारियां",
    descriptionEn: "Prioritized attending to family members.",
    descriptionHi: "परिवार या बच्चों की देखभाल को प्राथमिकता दी।",
  },
  {
    id: "DID_NOT_UNDERSTAND",
    labelEn: "Unclear instructions",
    labelHi: "निर्देश स्पष्ट नहीं लगे",
    descriptionEn: "Not sure how or when to perform the routine safely.",
    descriptionHi: "यह स्पष्ट नहीं था कि यह कदम कब और कैसे करना है।",
  },
  {
    id: "COST_OR_ACCESS",
    labelEn: "Resource or access problem",
    labelHi: "संसाधन या सुविधा की कमी",
    descriptionEn: "Safe walking area, footwear, or food item unavailable.",
    descriptionHi: "सुरक्षित चलने की जगह या आवश्यक सामग्री उपलब्ध नहीं थी।",
  },
  {
    id: "SOMETHING_ELSE",
    labelEn: "Something else",
    labelHi: "कुछ अन्य कारण",
    descriptionEn: "A different personal circumstance.",
    descriptionHi: "कोई अन्य व्यक्तिगत परिस्थिति।",
  },
  {
    id: "PREFER_NOT_TO_SAY",
    labelEn: "Prefer not to say",
    labelHi: "बताना नहीं चाहते",
    descriptionEn: "No explanation needed.",
    descriptionHi: "कोई कारण साझा नहीं करना चाहते।",
  },
];

export interface InterventionActionOption {
  id: string;
  type: "TRY_SMALLER_STEP" | "CHANGE_TIME" | "EXPLAIN_BARRIER" | "REQUEST_HELP" | "DISMISS" | "PAUSE_REST";
  labelEn: string;
  labelHi: string;
  descriptionEn?: string;
  descriptionHi?: string;
  payload?: Record<string, any>;
}

export interface InterventionDTO {
  id: string;
  userId: string;
  goalId?: string | null;
  goalTitle?: string | null;
  goalCategory?: string | null;
  triggerType: TriggerType;
  triggerReason: string;
  interventionType: InterventionType;
  lifecycleStatus: LifecycleStatus;
  title: string;
  titleHi?: string | null;
  message: string;
  messageHi?: string | null;
  explainableReason: string;
  options: InterventionActionOption[];
  aiPersonalized: boolean;
  createdAt: string;
  expiresAt?: string | null;
  safetyEscalation?: {
    id: string;
    severity: string;
    reason: string;
    patientSafeNotice: string;
  } | null;
}

export interface ProactiveMetricsDTO {
  eligibleMissedRoutines: number;
  interventionsIssued: number;
  barrierResponseRatePercent: number;
  suggestionsAcceptedCount: number;
  suggestionsAcceptedRatePercent: number;
  routinesRecoveredCount: number;
  routineRecoveryRatePercent: number;
  interventionsDismissedCount: number;
  unresolvedSafetyEscalationsCount: number;
  averageHoursToRecovery: number;
}
