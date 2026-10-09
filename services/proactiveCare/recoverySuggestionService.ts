/**
 * Project Pulse — Recovery Suggestion Service
 * Generates barrier-specific practical adjustments for non-medical routines.
 * Grounded in compassionate, non-judgmental behavioral science.
 */

import { BarrierCategory, InterventionActionOption } from "./types";

export interface RecoveryProposal {
  titleEn: string;
  titleHi: string;
  descriptionEn: string;
  descriptionHi: string;
  suggestedActionTitleEn: string;
  suggestedActionTitleHi: string;
  options: InterventionActionOption[];
  rationaleEn: string;
  rationaleHi: string;
  suggestedDurationMin?: number;
  suggestedFrequency?: string;
  suggestedTime?: string;
  requiresClinicianReview?: boolean;
}

export class RecoverySuggestionService {
  /**
   * Generates a tailored recovery proposal based on the patient's reported barrier.
   */
  static generateProposal(
    barrier: BarrierCategory,
    currentGoal?: {
      id: string;
      title: string;
      titleHindi?: string | null;
      targetDurationMin?: number | null;
      frequency?: string;
      preferredTime?: string | null;
      isNonMedical?: boolean;
    } | null
  ): RecoveryProposal {
    const duration = currentGoal?.targetDurationMin || 10;
    const reducedDuration = Math.max(5, Math.floor(duration / 2));

    switch (barrier) {
      case "BUSY_SCHEDULE":
        return {
          titleEn: "Let's fit this around your busy day",
          titleHi: "व्यस्त दिन में भी आसान कदम",
          descriptionEn: `We understand your day was full. Would a shorter ${reducedDuration}-minute walk or shifting to the evening feel more manageable?`,
          descriptionHi: `हम समझते हैं कि आज दिन व्यस्त था। क्या ${reducedDuration} मिनट की छोटी चहलकदमी या शाम का समय अधिक सुविधाजनक रहेगा?`,
          suggestedActionTitleEn: `${reducedDuration}-minute gentle micro-walk`,
          suggestedActionTitleHi: `${reducedDuration} मिनट की हल्की चहलकदमी`,
          suggestedDurationMin: reducedDuration,
          suggestedTime: "20:00",
          rationaleEn: "Short movement breaks provide glycemic benefits with less schedule disruption.",
          rationaleHi: "कम समय का व्यायाम भी रक्त शर्करा स्थिरता में मदद करता है और दिनचर्या पर भार नहीं डालता।",
          options: [
            {
              id: "opt_micro_step",
              type: "TRY_SMALLER_STEP",
              labelEn: `Try a ${reducedDuration}-min micro-step`,
              labelHi: `${reducedDuration} मिनट का छोटा कदम अपनाएं`,
              payload: { adjustedDurationMin: reducedDuration },
            },
            {
              id: "opt_change_time",
              type: "CHANGE_TIME",
              labelEn: "Move to 8:00 PM tonight",
              labelHi: "समय बदलकर आज रात 8:00 बजे करें",
              payload: { adjustedTime: "20:00" },
            },
            {
              id: "opt_dismiss",
              type: "DISMISS",
              labelEn: "Keep routine as is for tomorrow",
              labelHi: "कल के लिए सामान्य रखें",
            },
          ],
        };

      case "FORGOT":
        return {
          titleEn: "Gentle reminder support",
          titleHi: "समय पर सौम्य स्मरण",
          descriptionEn: "It is completely normal to lose track of time when busy. Would you like a prompt closer to your mealtime?",
          descriptionHi: "व्यस्तता में समय भूल जाना बिल्कुल स्वाभाविक है। क्या आप भोजन के समय एक सौम्य संदेश चाहेंगे?",
          suggestedActionTitleEn: "Set a 15-minute post-meal reminder",
          suggestedActionTitleHi: "भोजन के 15 मिनट बाद का स्मरण सेट करें",
          rationaleEn: "Timely in-app prompts help anchor routines around natural daily anchors like meals.",
          rationaleHi: "भोजन जैसे दैनिक समय पर स्मरण सेट करने से आदत बनाना आसान हो जाता है।",
          options: [
            {
              id: "opt_reminder_lunch",
              type: "CHANGE_TIME",
              labelEn: "Remind me at 1:30 PM",
              labelHi: "दोपहर 1:30 बजे याद दिलाएं",
              payload: { adjustedTime: "13:30" },
            },
            {
              id: "opt_dismiss",
              type: "DISMISS",
              labelEn: "I will remember tomorrow",
              labelHi: "मुझे कल याद रहेगा",
            },
          ],
        };

      case "TOO_DIFFICULT":
        return {
          titleEn: "Let's make this goal more comfortable",
          titleHi: "इस लक्ष्य को अधिक सहज बनाएं",
          descriptionEn: `Your routine should support your energy, not feel burdensome. Would you like to adjust from ${duration} mins to ${reducedDuration} mins?`,
          descriptionHi: `स्वास्थ्य लक्ष्य आपके अनुकूल होने चाहिए, बोझिल नहीं। क्या हम इसे ${duration} मिनट से घटाकर ${reducedDuration} मिनट कर दें?`,
          suggestedActionTitleEn: `${reducedDuration}-minute comfortable routine`,
          suggestedActionTitleHi: `${reducedDuration} मिनट की सहज दिनचर्या`,
          suggestedDurationMin: reducedDuration,
          rationaleEn: "Gradual habit building is more sustainable than straining against high barriers.",
          rationaleHi: "छोटे और निरंतर कदम बड़े लक्ष्यों की तुलना में अधिक स्थायी आदतें बनाते हैं।",
          options: [
            {
              id: "opt_reduce_difficulty",
              type: "TRY_SMALLER_STEP",
              labelEn: `Reduce target to ${reducedDuration} minutes`,
              labelHi: `लक्ष्य घटाकर ${reducedDuration} मिनट करें`,
              payload: { adjustedDurationMin: reducedDuration },
            },
            {
              id: "opt_consult_team",
              type: "REQUEST_HELP",
              labelEn: "Ask care team to review plan",
              labelHi: "केयर टीम से योजना की समीक्षा का अनुरोध करें",
            },
            {
              id: "opt_dismiss",
              type: "DISMISS",
              labelEn: "Keep current goal",
              labelHi: "वर्तमान लक्ष्य ही रखें",
            },
          ],
        };

      case "LOW_MOTIVATION":
        return {
          titleEn: "Small steps rebuild momentum",
          titleHi: "छोटे कदम गति लौटाते हैं",
          descriptionEn: "Low energy days happen to everyone. You don't need a full workout today—just 2 to 3 minutes of gentle stretching or pacing inside is enough.",
          descriptionHi: "थकान या कम ऊर्जा के दिन सभी के साथ आते हैं। आज पूरा व्यायाम जरूरी नहीं—कमरे में 2-3 मिनट टहलना भी पर्याप्त है।",
          suggestedActionTitleEn: "3-minute gentle indoor movement",
          suggestedActionTitleHi: "घर में 3 मिनट की हल्की चहलकदमी",
          suggestedDurationMin: 3,
          rationaleEn: "Zero-pressure micro-actions maintain cognitive habit identity without depleting willpower.",
          rationaleHi: "बिना दबाव के छोटे कार्य आदत बनाए रखते हैं और मानसिक थकान नहीं बढ़ाते।",
          options: [
            {
              id: "opt_micro_indoor",
              type: "TRY_SMALLER_STEP",
              labelEn: "Do a quick 3-minute indoor stroll",
              labelHi: "घर के अंदर 3 मिनट टहलें",
              payload: { adjustedDurationMin: 3 },
            },
            {
              id: "opt_rest_today",
              type: "PAUSE_REST",
              labelEn: "Take a restful pause today",
              labelHi: "आज विश्राम करें",
            },
          ],
        };

      case "FELT_UNWELL":
        return {
          titleEn: "Prioritize your comfort and rest",
          titleHi: "अपने स्वास्थ्य और आराम को प्राथमिकता दें",
          descriptionEn: "When your body feels unwell, rest is the most therapeutic choice. We have paused today's physical activity. Please stay hydrated and rest.",
          descriptionHi: "जब तबीयत ठीक न हो, तो विश्राम ही सबसे सही निर्णय है। हमने आज की शारीरिक गतिविधि रोक दी है। कृपया आराम करें।",
          suggestedActionTitleEn: "Rest and recover today",
          suggestedActionTitleHi: "आज आराम और स्वास्थ्य लाभ",
          rationaleEn: "Exertion during acute illness or fatigue can worsen physiological stress and glucose volatility.",
          rationaleHi: "अस्वस्थता में व्यायाम से शरीर पर तनाव बढ़ सकता है। विश्राम ही प्राथमिकता है।",
          options: [
            {
              id: "opt_pause_activity",
              type: "PAUSE_REST",
              labelEn: "Pause routine for today",
              labelHi: "आज के लिए दिनचर्या रोकें",
            },
            {
              id: "opt_contact_clinic",
              type: "REQUEST_HELP",
              labelEn: "Contact Dr. Raman Verma's clinic",
              labelHi: "डॉ. रमन वर्मा के क्लिनिक से संपर्क करें",
            },
          ],
        };

      case "PAIN_OR_MOBILITY":
        return {
          titleEn: "Never push through pain",
          titleHi: "दर्द में कभी दबाव न डालें",
          descriptionEn: "Pain is a protective signal from your body. Please do not force any joint or muscle strain. Your care team can recommend seated or modified movements.",
          descriptionHi: "दर्द शरीर का एक सुरक्षा संकेत है। किसी भी जोड़ या मांसपेशी पर जोर न दें। आपकी केयर टीम उपयुक्त विकल्प बता सकती है।",
          suggestedActionTitleEn: "Rest joint and request guidance",
          suggestedActionTitleHi: "जोड़ों को आराम दें और परामर्श लें",
          rationaleEn: "Physical activities should never cause pain. Personalized clinical physical therapy review is indicated.",
          rationaleHi: "व्यायाम से कभी दर्द नहीं होना चाहिए। डॉक्टर से परामर्श जरूरी है।",
          options: [
            {
              id: "opt_contact_care_team",
              type: "REQUEST_HELP",
              labelEn: "Request clinician guidance on mobility",
              labelHi: "गतिशीलता पर डॉक्टर से मार्गदर्शन मांगें",
            },
            {
              id: "opt_pause_routine",
              type: "PAUSE_REST",
              labelEn: "Rest without guilt today",
              labelHi: "आज बिना किसी संकोच के विश्राम करें",
            },
          ],
        };

      case "DID_NOT_UNDERSTAND":
        return {
          titleEn: "Clear, simple routine guidance",
          titleHi: "स्पष्ट और सरल दिनचर्या मार्गदर्शन",
          descriptionEn: "Health steps should be completely transparent. Would you like to read our quick 1-minute guide on post-meal walking?",
          descriptionHi: "स्वास्थ्य कदम बिल्कुल स्पष्ट होने चाहिए। क्या आप भोजन के बाद टहलने पर हमारी 1 मिनट की मार्गदर्शिका देखना चाहेंगे?",
          suggestedActionTitleEn: "Read 1-minute guide: Post-meal walking",
          suggestedActionTitleHi: "1 मिनट की मार्गदर्शिका पढ़ें: भोजन के बाद टहलना",
          rationaleEn: "Understanding the physiological rationale increases long-term habit confidence.",
          rationaleHi: "कारण समझने से आदत पर विश्वास और निरंतरता बढ़ती है।",
          options: [
            {
              id: "opt_read_guide",
              type: "TRY_SMALLER_STEP",
              labelEn: "View verified lifestyle guide",
              labelHi: "सत्यापित जीवनशैली गाइड देखें",
            },
            {
              id: "opt_ask_coach",
              type: "REQUEST_HELP",
              labelEn: "Ask Pulse Coach a question",
              labelHi: "पल्स कोच से प्रश्न पूछें",
            },
          ],
        };

      case "COST_OR_ACCESS":
        return {
          titleEn: "Free and accessible home options",
          titleHi: "घर पर नि:शुल्क और सुलभ विकल्प",
          descriptionEn: "You don't need a gym, special shoes, or equipment. Walking in place or strolling inside your hallway after meals provides identical metabolic benefits.",
          descriptionHi: "आपको जिम या किसी विशेष उपकरण की आवश्यकता नहीं है। भोजन के बाद घर के अंदर ही टहलना समान रूप से लाभकारी है।",
          suggestedActionTitleEn: "Indoor hallway pacing routine",
          suggestedActionTitleHi: "घर के अंदर ही टहलने की दिनचर्या",
          suggestedDurationMin: 5,
          rationaleEn: "Simple body movement utilizes glucose directly through muscle contraction without financial expenditure.",
          rationaleHi: "मांसपेशियों के संकुचन से रक्त शर्करा का उपयोग होता है, इसके लिए किसी खर्च की जरूरत नहीं।",
          options: [
            {
              id: "opt_home_walk",
              type: "TRY_SMALLER_STEP",
              labelEn: "5-minute hallway stroll",
              labelHi: "घर के अंदर 5 मिनट टहलें",
              payload: { adjustedDurationMin: 5 },
            },
            {
              id: "opt_dismiss",
              type: "DISMISS",
              labelEn: "I understand, thank you",
              labelHi: "समझ गया, धन्यवाद",
            },
          ],
        };

      default:
        return {
          titleEn: "Let's make today's plan easier",
          titleHi: "आज की योजना को आसान बनाएं",
          descriptionEn: "Life has unexpected turns. Would a smaller step or taking a pause feel better today?",
          descriptionHi: "दैनिक जीवन में अप्रत्याशित बदलाव आते रहते हैं। क्या आज एक छोटा कदम या विराम बेहतर रहेगा?",
          suggestedActionTitleEn: "Gentle recovery step",
          suggestedActionTitleHi: "हल्का रिकवरी कदम",
          rationaleEn: "Consistency is about resuming after interruptions, not perfection.",
          rationaleHi: "महत्वपूर्ण बात यह है कि रुकावट के बाद फिर से शुरुआत की जाए।",
          options: [
            {
              id: "opt_smaller_step",
              type: "TRY_SMALLER_STEP",
              labelEn: "Try a 5-minute step",
              labelHi: "5 मिनट का कदम अपनाएं",
              payload: { adjustedDurationMin: 5 },
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
        };
    }
  }
}
