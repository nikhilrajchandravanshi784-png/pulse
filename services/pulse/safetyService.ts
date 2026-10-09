import { prisma } from "@/lib/db";

export interface SafetyCheckResult {
  isSafe: boolean;
  severity: "EMERGENCY" | "HIGH" | "MODERATE" | "LOW" | "NORMAL";
  reason?: string;
  patientGuidance: string;
  patientGuidanceHindi: string;
  escalationCreated: boolean;
}

const EMERGENCY_KEYWORDS = [
  "chest pain",
  "severe breathlessness",
  "shortness of breath",
  "passed out",
  "fainted",
  "unconscious",
  "extreme dizziness",
  "severe hypoglycemia",
  "sugar below 50",
  "sugar below 55",
  "सीने में दर्द",
  "सांस फूलना",
  "बेहोश",
  "चक्कर आकर गिरना",
];

const MEDICATION_CHANGE_KEYWORDS = [
  "increase insulin",
  "decrease insulin",
  "stop metformin",
  "change medicine dose",
  "double dose",
  "इंसुलिन बढ़ाएं",
  "दवा बंद करें",
  "डोज़ बदलें",
];

export async function evaluateSafetyRules(
  patientId: string,
  text: string,
  triggerSource: "COACH_QUERY" | "CHECKIN_BARRIER" | "GLUCOSE_READING" | "MANUAL",
  glucoseValue?: number
): Promise<SafetyCheckResult> {
  const lower = text.toLowerCase();

  // 1. Extreme Critical Glucose Check
  if (glucoseValue !== undefined && glucoseValue < 55) {
    const escalation = await prisma.safetyEscalation.create({
      data: {
        patientId,
        reason: `Severe Hypoglycemia Flagged: ${glucoseValue} mg/dL`,
        severity: "EMERGENCY",
        triggerSource,
        symptomDetails: `Glucose reading entered: ${glucoseValue} mg/dL`,
        patientSafeNotice:
          "Severe low blood sugar detected. Consume 15g fast-acting glucose (fruit juice, glucose tablets) immediately, re-check in 15 minutes, and seek emergency help if symptoms do not improve.",
      },
    });

    return {
      isSafe: false,
      severity: "EMERGENCY",
      reason: `Severe Hypoglycemia (${glucoseValue} mg/dL)`,
      patientGuidance:
        "EMERGENCY ADVISORY: Blood sugar is critically low. Take 15g fast sugar (half cup juice or 3 glucose tablets). Call emergency services (112 / 108) if you feel drowsy or symptoms persist.",
      patientGuidanceHindi:
        "आपातकालीन सूचना: रक्त शर्करा बहुत कम है। तुरंत 15 ग्राम मीठा (आधा कप जूस या ग्लूकोज) लें। 15 मिनट बाद दोबारा जांचें। यदि स्थिति न सुधरे तो तुरंत 112 / 108 पर संपर्क करें।",
      escalationCreated: true,
    };
  }

  // 2. Emergency Symptoms Check
  for (const kw of EMERGENCY_KEYWORDS) {
    if (lower.includes(kw)) {
      await prisma.safetyEscalation.create({
        data: {
          patientId,
          reason: `Emergency red flag keyword detected: "${kw}"`,
          severity: "EMERGENCY",
          triggerSource,
          symptomDetails: text,
          patientSafeNotice:
            "Potential urgent symptom detected. Please seek emergency medical care immediately.",
        },
      });

      return {
        isSafe: false,
        severity: "EMERGENCY",
        reason: `Urgent symptom: ${kw}`,
        patientGuidance:
          "URGENT CLINICAL ALERT: The symptoms you described require immediate medical assessment. Please call emergency services (112 / 108 in India) or visit the nearest emergency room immediately.",
        patientGuidanceHindi:
          "आपातकालीन चिकित्सकीय चेतावनी: आपके द्वारा बताए गए लक्षण तुरंत डॉक्टर द्वारा जांचे जाने योग्य हैं। कृपया तुरंत आपातकालीन नंबर (112 / 108) पर कॉल करें या नजदीकी अस्पताल जाएं।",
        escalationCreated: true,
      };
    }
  }

  // 3. Medication Dosage Inquiry Check
  for (const kw of MEDICATION_CHANGE_KEYWORDS) {
    if (lower.includes(kw)) {
      await prisma.safetyEscalation.create({
        data: {
          patientId,
          reason: `Medication / insulin dosage alteration inquiry: "${kw}"`,
          severity: "HIGH",
          triggerSource,
          symptomDetails: text,
          patientSafeNotice:
            "Medication changes must only be directed by your licensed physician.",
        },
      });

      return {
        isSafe: false,
        severity: "HIGH",
        reason: "Medication Adjustment Request",
        patientGuidance:
          "CLINICAL SAFETY NOTICE: Pulse is a lifestyle and recovery companion and cannot alter, recommend, or prescribe medication or insulin dosages. Please consult Dr. Raman Verma or your treating endocrinologist directly.",
        patientGuidanceHindi:
          "सुरक्षा सूचना: पल्स केवल जीवनशैली और दिनचर्या में सहायता करता है। यह दवाओं या इंसुलिन की मात्रा में बदलाव नहीं कर सकता। कृपया अपने डॉक्टर से सीधे संपर्क करें।",
        escalationCreated: true,
      };
    }
  }

  return {
    isSafe: true,
    severity: "NORMAL",
    patientGuidance: "",
    patientGuidanceHindi: "",
    escalationCreated: false,
  };
}
