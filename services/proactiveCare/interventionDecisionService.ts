/**
 * Project Pulse — Intervention Decision Service
 * Context-aware decision engine that selects appropriate interventions using structured rules.
 * Supports transparent explainability and deterministic bilingual fallback.
 */

import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import {
  TriggerType,
  InterventionType,
  InterventionActionOption,
  BarrierCategory,
} from "./types";
import { SafetyRoutingService } from "./safetyRoutingService";
import { NotificationPolicyService } from "./notificationPolicyService";
import { RecoverySuggestionService } from "./recoverySuggestionService";

export interface DecisionContext {
  userId: string;
  triggerType: TriggerType;
  triggerReason: string;
  goalId?: string;
  routineOccurrenceId?: string;
  reportedBarrier?: BarrierCategory;
  freeTextNote?: string;
  deduplicationKey: string;
  lang?: string;
}

export interface InterventionDecision {
  isApproved: boolean;
  suppressReason?: string;
  interventionType: InterventionType;
  title: string;
  titleHi: string;
  message: string;
  messageHi: string;
  options: InterventionActionOption[];
  explainableReason: string;
  aiPersonalized: boolean;
  safetyEscalationId?: string;
}

export class InterventionDecisionService {
  /**
   * Decides next proactive action based on context, policy, and clinical safety.
   */
  static async decide(ctx: DecisionContext): Promise<InterventionDecision> {
    const lang = ctx.lang || "hi";

    // 1. Safety-first evaluation
    const safety = SafetyRoutingService.assessContext(ctx.reportedBarrier, ctx.freeTextNote);
    if (safety.isSafetyConcern) {
      const escalation = await SafetyRoutingService.createEscalation(
        ctx.userId,
        safety,
        ctx.freeTextNote || ctx.reportedBarrier
      );

      return {
        isApproved: true,
        interventionType: "SAFETY_ESCALATION",
        title: safety.severity === "EMERGENCY" ? "Urgent Medical Attention Advised" : "Clinical Care Team Notice",
        titleHi: safety.severity === "EMERGENCY" ? "तत्काल आपातकालीन चिकित्सा परामर्श" : "क्लिनिकल केयर टीम सूचना",
        message: safety.patientSafeNotice || "Please contact your care team.",
        messageHi: safety.patientSafeNoticeHi || "कृपया अपनी केयर टीम से संपर्क करें।",
        explainableReason: `Safety concern identified (${safety.severity}): ${safety.reason}`,
        options: [
          {
            id: "opt_emergency_help",
            type: "REQUEST_HELP",
            labelEn: "Contact Clinic or Emergency",
            labelHi: "क्लिनिक या आपातकालीन नंबर पर कॉल करें",
          },
          {
            id: "opt_pause_all",
            type: "PAUSE_REST",
            labelEn: "Pause Activity & Rest",
            labelHi: "गतिविधि रोकें और आराम करें",
          },
        ],
        aiPersonalized: false,
        safetyEscalationId: escalation?.id,
      };
    }

    // 2. Policy & Safeguards check (opt-out, quiet hours, cooldown, daily cap)
    const policy = await NotificationPolicyService.evaluatePolicy(
      ctx.userId,
      ctx.deduplicationKey,
      ctx.routineOccurrenceId
    );

    if (!policy.allowed) {
      return {
        isApproved: false,
        suppressReason: policy.suppressReason,
        interventionType: "SUPPRESS",
        title: "Intervention Suppressed",
        titleHi: "संदेश रोका गया",
        message: policy.details || "Suppressed by policy.",
        messageHi: "नीति नियमों के कारण संदेश रोका गया।",
        options: [],
        explainableReason: `Suppressed by notification policy: ${policy.suppressReason} (${policy.details})`,
        aiPersonalized: false,
      };
    }

    // 3. Resolve HealthGoal context
    const goal = ctx.goalId
      ? await prisma.healthGoal.findUnique({ where: { id: ctx.goalId } })
      : null;

    // 4. Decision mapping by TriggerType and Reported Barrier
    if (ctx.reportedBarrier) {
      const proposal = RecoverySuggestionService.generateProposal(ctx.reportedBarrier, goal);
      return {
        isApproved: true,
        interventionType: "SUGGEST_SMALLER_STEP",
        title: proposal.titleEn,
        titleHi: proposal.titleHi,
        message: proposal.descriptionEn,
        messageHi: proposal.descriptionHi,
        options: proposal.options,
        explainableReason: `Patient reported barrier "${ctx.reportedBarrier}". Tailored recovery adjustment offered: ${proposal.rationaleEn}`,
        aiPersonalized: false,
      };
    }

    switch (ctx.triggerType) {
      case "GOAL_REPEATEDLY_TOO_DIFFICULT": {
        const proposal = RecoverySuggestionService.generateProposal("TOO_DIFFICULT", goal);
        return {
          isApproved: true,
          interventionType: "SUGGEST_SMALLER_STEP",
          title: proposal.titleEn,
          titleHi: proposal.titleHi,
          message: proposal.descriptionEn,
          messageHi: proposal.descriptionHi,
          options: proposal.options,
          explainableReason: `Goal "${goal?.title}" was flagged as too difficult multiple times. Proactively offering reduced difficulty.`,
          aiPersonalized: false,
        };
      }

      case "REPEATED_MISSED_ROUTINES": {
        return {
          isApproved: true,
          interventionType: "ASK_BARRIER",
          title: "Let's make today's plan easier",
          titleHi: "आज की योजना को अधिक आसान बनाएं",
          message: `You've missed your planned "${goal?.title || "routine"}" recently. Would a shorter step or a different time work better?`,
          messageHi: `हाल ही में आपका "${goal?.titleHindi || goal?.title || "नियमित कदम"}" पूरा नहीं हो पाया। क्या कम समय या कोई दूसरा समय बेहतर रहेगा?`,
          options: [
            {
              id: "opt_try_smaller",
              type: "TRY_SMALLER_STEP",
              labelEn: "Try a 5-minute micro-step",
              labelHi: "5 मिनट का छोटा कदम अपनाएं",
              payload: { adjustedDurationMin: 5 },
            },
            {
              id: "opt_tell_barrier",
              type: "EXPLAIN_BARRIER",
              labelEn: "Tell us what got in the way",
              labelHi: "बताएं कि क्या बाधा आई",
            },
            {
              id: "opt_dismiss",
              type: "DISMISS",
              labelEn: "Not now",
              labelHi: "अभी नहीं",
            },
          ],
          explainableReason: `Multiple consecutive misses detected for "${goal?.title}". Asking about barriers with zero-guilt adaptation options.`,
          aiPersonalized: false,
        };
      }

      case "PATIENT_REQUESTED_HELP": {
        return {
          isApproved: true,
          interventionType: "CONTACT_CARE_TEAM",
          title: "We're here to help",
          titleHi: "हम आपकी सहायता के लिए उपस्थित हैं",
          message: "You mentioned needing assistance with your health routines. What would be most useful right now?",
          messageHi: "आपने अपनी दिनचर्या में सहायता की आवश्यकता बताई थी। इस समय क्या सबसे अधिक सहायक रहेगा?",
          options: [
            {
              id: "opt_ask_coach",
              type: "REQUEST_HELP",
              labelEn: "Chat with Pulse Coach",
              labelHi: "पल्स कोच से बातचीत करें",
            },
            {
              id: "opt_contact_clinic",
              type: "REQUEST_HELP",
              labelEn: "Message care team",
              labelHi: "केयर टीम को संदेश भेजें",
            },
            {
              id: "opt_dismiss",
              type: "DISMISS",
              labelEn: "I'm okay for now",
              labelHi: "अभी ठीक है",
            },
          ],
          explainableReason: "Patient explicitly requested help during daily check-in.",
          aiPersonalized: false,
        };
      }

      case "MISSED_SINGLE_ROUTINE":
      default: {
        return {
          isApproved: true,
          interventionType: "GENTLE_REMINDER",
          title: "Your planned activity is waiting",
          titleHi: "आपकी नियोजित दिनचर्या प्रतीक्षारत है",
          message: `Your planned "${goal?.title || "health step"}" was scheduled for earlier today. Would you like to do a quick step now or reschedule?`,
          messageHi: `आपका "${goal?.titleHindi || goal?.title || "स्वास्थ्य कदम"}" आज के लिए निर्धारित था। क्या आप इसे अभी पूरा करना चाहेंगे या समय बदलना चाहेंगे?`,
          options: [
            {
              id: "opt_try_smaller",
              type: "TRY_SMALLER_STEP",
              labelEn: "Try a 5-minute step",
              labelHi: "5 मिनट का कदम अपनाएं",
              payload: { adjustedDurationMin: 5 },
            },
            {
              id: "opt_change_time",
              type: "CHANGE_TIME",
              labelEn: "Change time to evening",
              labelHi: "समय बदलकर शाम का करें",
              payload: { adjustedTime: "20:00" },
            },
            {
              id: "opt_explain",
              type: "EXPLAIN_BARRIER",
              labelEn: "Tell us what got in the way",
              labelHi: "बताएं कि क्या बाधा आई",
            },
            {
              id: "opt_dismiss",
              type: "DISMISS",
              labelEn: "Not now",
              labelHi: "अभी नहीं",
            },
          ],
          explainableReason: `Single routine miss detected for "${goal?.title}" after grace period. Offering gentle, low-friction options.`,
          aiPersonalized: false,
        };
      }
    }
  }
}
