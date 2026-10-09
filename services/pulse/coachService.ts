import { prisma } from "@/lib/db";
import { evaluateSafetyRules } from "./safetyService";

export interface CoachResponse {
  answer: string;
  answerHindi: string;
  citedArticleTitle?: string;
  citedArticleSource?: string;
  isSafetyEscalation: boolean;
  severity: string;
}

export async function askPulseCoach(
  patientId: string,
  question: string,
  language: "hi" | "en" = "hi"
): Promise<CoachResponse> {
  // Step 1: Pre-flight Clinical Safety Evaluation
  const safety = await evaluateSafetyRules(patientId, question, "COACH_QUERY");
  if (!safety.isSafe) {
    return {
      answer: safety.patientGuidance,
      answerHindi: safety.patientGuidanceHindi,
      isSafetyEscalation: true,
      severity: safety.severity,
    };
  }

  // Step 2: Search Approved Reviewed Educational Articles
  const articles = await prisma.educationalArticle.findMany({
    where: { isApproved: true, status: "PUBLISHED" },
  });

  const lowerQ = question.toLowerCase();

  // Find matching article based on keywords
  const matched = articles.find((art) => {
    const titleMatch = art.title.toLowerCase().includes(lowerQ) || (art.titleHindi && art.titleHindi.includes(question));
    const topicMatch = art.topic.toLowerCase().split("_").some((t) => lowerQ.includes(t));
    return titleMatch || topicMatch;
  });

  if (matched) {
    return {
      answer: `Based on clinically reviewed guidance from ${matched.authorOrg}: ${matched.content.slice(0, 320)}... Always consult your physician for individualized care.`,
      answerHindi: `डॉक्टरों द्वारा समीक्षित जानकारी (${matched.authorOrg}) के अनुसार: ${matched.contentHindi?.slice(0, 320) || matched.content.slice(0, 320)}... व्यक्तिगत सलाह के लिए हमेशा अपने चिकित्सक से परामर्श लें।`,
      citedArticleTitle: language === "hi" && matched.titleHindi ? matched.titleHindi : matched.title,
      citedArticleSource: matched.evidenceInfo || "ICMR Guidelines for Type 2 Diabetes Management",
      isSafetyEscalation: false,
      severity: "NORMAL",
    };
  }

  // If general lifestyle question, provide nonjudgmental empathetic diabetes recovery advice
  if (lowerQ.includes("walk") || lowerQ.includes("टहलना") || lowerQ.includes("कदम")) {
    return {
      answer: "A gentle 10–15 minute walk after meals helps skeletal muscles absorb glucose directly from the bloodstream, smoothing postprandial glycemic excursions without stressing your joints.",
      answerHindi: "भोजन के 10-15 मिनट बाद हल्की सैर करने से मांसपेशियां रक्त में मौजूद शर्करा को तुरंत ऊर्जा के रूप में उपयोग कर लेती हैं, जिससे भोजन के बाद शुगर अचानक नहीं बढ़ती।",
      citedArticleTitle: "Post-Meal Movement for Glycemic Stability",
      citedArticleSource: "ICMR & ADA Guidelines for Physical Activity in Diabetes",
      isSafetyEscalation: false,
      severity: "NORMAL",
    };
  }

  if (lowerQ.includes("food") || lowerQ.includes("diet") || lowerQ.includes("भोजन") || lowerQ.includes("खाना") || lowerQ.includes("roti")) {
    return {
      answer: "Clinically recommended diabetes nutrition focuses on the plate method: half of your plate with high-fiber green vegetables or salad, one-quarter with lean protein (dal, paneer, eggs), and one-quarter with complex carbohydrates (whole-grain roti or brown rice).",
      answerHindi: "मधुमेह में 'थाली का नियम' सबसे आसान और असरदार है: आधी थाली हरी सब्जियां या सलाद, एक-चौथाई प्रोटीन (दाल, पनीर या अंडा), और एक-चौथाई अनाज (साबुत अनाज की रोटी)।",
      citedArticleTitle: "Plate Method for Balanced Blood Glucose",
      citedArticleSource: "Pulse Clinical Board Dietary Guidelines",
      isSafetyEscalation: false,
      severity: "NORMAL",
    };
  }

  // Honest acknowledgment of uncertainty per Section 6
  return {
    answer: "We do not have a specific reviewed clinical article for this exact question in our verified diabetes library. For personalized medical judgment, please check with Dr. Raman Verma and your care team.",
    answerHindi: "हमारी समीक्षित स्वास्थ्य लाइब्रेरी में इस विशिष्ट प्रश्न के लिए कोई पूर्व-स्वीकृत सामग्री उपलब्ध नहीं है। सुरक्षित और सटीक जानकारी के लिए कृपया अपने डॉक्टर या केयर टीम से परामर्श करें।",
    isSafetyEscalation: false,
    severity: "NORMAL",
  };
}
