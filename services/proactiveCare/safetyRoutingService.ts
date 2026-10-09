/**
 * Project Pulse — Safety Routing Service
 * Prioritizes patient clinical safety over ordinary engagement recovery.
 * Identifies red-flag symptoms, medication inquiries, and severe physiological distress.
 */

import { prisma } from "@/lib/db";
import { BarrierCategory } from "./types";

export interface SafetyAssessment {
  isSafetyConcern: boolean;
  severity: "EMERGENCY" | "HIGH" | "MODERATE" | "LOW" | "NONE";
  reason: string | null;
  patientSafeNotice: string | null;
  patientSafeNoticeHi: string | null;
  suggestCareTeam: boolean;
  emergencyActions: string[];
}

const EMERGENCY_KEYWORDS = [
  "chest pain",
  "difficulty breathing",
  "shortness of breath",
  "severe dizziness",
  "passed out",
  "unconscious",
  "loss of vision",
  "slurred speech",
  "severe hypoglycemia",
  "shaking violently",
  "सीने में दर्द",
  "सांस लेने में तकलीफ",
  "बेहोश",
  "चक्कर आकर गिर",
  "आंखों के आगे अंधेरा",
];

const MEDICATION_ALTERATION_KEYWORDS = [
  "insulin dose",
  "increase insulin",
  "decrease insulin",
  "stop metformin",
  "change medicine",
  "double dose",
  "skip dose",
  "दवा बंद",
  "इंसुलिन बढ़ा",
  "इंसुलिन घटा",
  "दवा की खुराक",
];

const CLINICAL_SYMPTOMS_KEYWORDS = [
  "vomiting",
  "high fever",
  "foot ulcer",
  "infected wound",
  "severe pain",
  "swelling in feet",
  "उल्टी",
  "तेज बुखार",
  "पैर में छाला",
  "घाव में मवाद",
  "पैर में सूजन",
];

export class SafetyRoutingService {
  /**
   * Assesses free text and reported barrier for clinical safety risks.
   */
  static assessContext(barrier?: BarrierCategory | string, text?: string | null): SafetyAssessment {
    const combined = `${barrier || ""} ${text || ""}`.toLowerCase();

    // 1. Check for Emergency
    for (const kw of EMERGENCY_KEYWORDS) {
      if (combined.includes(kw.toLowerCase())) {
        return {
          isSafetyConcern: true,
          severity: "EMERGENCY",
          reason: "Emergency symptom detected in patient communication",
          patientSafeNotice:
            "Your message mentions symptoms that require urgent medical evaluation. Please call emergency services (108/112 in India) or visit the nearest hospital emergency room immediately.",
          patientSafeNoticeHi:
            "आपके संदेश में ऐसे लक्षण शामिल हैं जिन्हें तत्काल आपातकालीन चिकित्सा की आवश्यकता है। कृपया तुरंत 108/112 पर कॉल करें या नजदीकी आपातकालीन कक्ष में जाएं।",
          suggestCareTeam: true,
          emergencyActions: [
            "Call 108 / 112 emergency services immediately",
            "Do not attempt physical exertion or unprescribed remedies",
            "Alert a family member or caregiver right now",
          ],
        };
      }
    }

    // 2. Check for Medication Alteration
    for (const kw of MEDICATION_ALTERATION_KEYWORDS) {
      if (combined.includes(kw.toLowerCase())) {
        return {
          isSafetyConcern: true,
          severity: "HIGH",
          reason: "Medication or insulin dosage alteration query detected",
          patientSafeNotice:
            "Prescription medications and insulin doses should only be adjusted under the direct instruction of your prescribing clinician. Pulse does not alter medical prescriptions.",
          patientSafeNoticeHi:
            "दवाओं या इंसुलिन की खुराक में बदलाव केवल आपके डॉक्टर के सीधे निर्देश पर ही किया जाना चाहिए। पल्स डॉक्टर की पर्ची में बदलाव नहीं करता है।",
          suggestCareTeam: true,
          emergencyActions: [
            "Contact Dr. Raman Verma or your clinic directly before changing doses",
            "Keep your regular medication log ready for clinician review",
          ],
        };
      }
    }

    // 3. Check for Clinical Symptoms
    for (const kw of CLINICAL_SYMPTOMS_KEYWORDS) {
      if (combined.includes(kw.toLowerCase())) {
        return {
          isSafetyConcern: true,
          severity: "MODERATE",
          reason: "Clinical symptoms requiring medical review reported",
          patientSafeNotice:
            "Physical symptoms or infection signs require clinical attention. We have paused routine physical activities until you consult your clinic.",
          patientSafeNoticeHi:
            "शारीरिक लक्षण या संक्रमण के संकेतों पर डॉक्टर से परामर्श की आवश्यकता होती है। हमने आपकी दिनचर्या को अस्थायी रूप से रोक दिया है।",
          suggestCareTeam: true,
          emergencyActions: [
            "Rest comfortably without physical strain",
            "Schedule a clinical check with your care team",
          ],
        };
      }
    }

    // 4. Barrier = FELT_UNWELL or PAIN_OR_MOBILITY without acute keywords
    if (barrier === "FELT_UNWELL" || barrier === "PAIN_OR_MOBILITY") {
      return {
        isSafetyConcern: true,
        severity: "LOW",
        reason: "Patient reported unwellness or pain as routine barrier",
        patientSafeNotice:
          "Rest is an important part of health recovery. There is no expectation to push through pain or illness. Please prioritize rest and contact your clinician if symptoms persist.",
        patientSafeNoticeHi:
          "विश्राम स्वास्थ्य सुधार का एक आवश्यक हिस्सा है। अस्वस्थता में व्यायाम का दबाव न लें। यदि अस्वस्थता बनी रहे तो अपने डॉक्टर से संपर्क करें।",
        suggestCareTeam: true,
        emergencyActions: [
          "Take compassionate rest today",
          "Consult your clinic if symptoms do not improve",
        ],
      };
    }

    // Ordinary engagement difficulty
    return {
      isSafetyConcern: false,
      severity: "NONE",
      reason: null,
      patientSafeNotice: null,
      patientSafeNoticeHi: null,
      suggestCareTeam: false,
      emergencyActions: [],
    };
  }

  /**
   * Creates a persistent SafetyEscalation record when a concern is identified.
   */
  static async createEscalation(
    userId: string,
    assessment: SafetyAssessment,
    details?: string,
    interventionEventId?: string
  ) {
    if (!assessment.isSafetyConcern) return null;

    // Resolve patient's clinician if available
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { patientProfile: true },
    });

    const clinician = await prisma.user.findFirst({
      where: { role: "CLINICIAN" },
    });

    const escalation = await prisma.safetyEscalation.create({
      data: {
        patientId: userId,
        clinicianId: clinician?.id || null,
        reason: assessment.reason || "Clinical Safety Concern Reported via Proactive Care",
        severity: assessment.severity,
        triggerSource: "PROACTIVE_CARE",
        symptomDetails: details || null,
        patientSafeNotice: assessment.patientSafeNotice || "Consult your healthcare team.",
        acknowledgedStatus: false,
        resolutionStatus: "OPEN",
      },
    });

    // Create Audit Log
    await prisma.interventionAuditLog.create({
      data: {
        userId,
        interventionId: interventionEventId || null,
        action: "ESCALATED_SAFETY",
        details: JSON.stringify({
          escalationId: escalation.id,
          severity: assessment.severity,
          reason: assessment.reason,
        }),
      },
    });

    return escalation;
  }
}
