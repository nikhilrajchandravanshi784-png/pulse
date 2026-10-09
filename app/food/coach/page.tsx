"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Sparkles,
  BookOpen,
  Camera,
  ShieldCheck,
  Settings2,
  ExternalLink,
  Info,
} from "lucide-react";
import { MealCoachSection } from "@/components/mealCoach/MealCoachSection";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PulseTopHeader } from "@/components/layout/PulseTopHeader";
import { SafetyBanner } from "@/components/layout/SafetyBanner";
import { useCurrentLanguage } from "@/components/LanguageToggle";
import { ApprovedGuidanceRecord } from "@/services/mealCoach/types";

export default function MealCoachDedicatedPage() {
  const router = useRouter();
  const lang = useCurrentLanguage();
  const [guidanceList, setGuidanceList] = useState<ApprovedGuidanceRecord[]>([]);
  const [loadingGuidance, setLoadingGuidance] = useState(false);
  const [showGuidanceLibrary, setShowGuidanceLibrary] = useState(false);

  useEffect(() => {
    async function loadGuidance() {
      setLoadingGuidance(true);
      try {
        const res = await fetch("/api/meal-coach/guidance");
        const data = await res.json();
        if (data.guidance) setGuidanceList(data.guidance);
      } finally {
        setLoadingGuidance(false);
      }
    }
    loadGuidance();
  }, []);

  return (
    <div className="min-h-screen bg-[#DCE8EC] text-[#101A45] flex flex-col lg:flex-row font-sans">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col min-h-screen pb-20 lg:pb-8">
        <PulseTopHeader activeTab="Track" />
        <SafetyBanner compact />

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4 w-full">
          {/* Top Header */}
          <div className="bg-white rounded-2xl border border-[#C9D7DE] p-4 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-slate-900">
                {lang === "hi" ? "पल्स मील कोच" : "Pulse Meal Coach"}
              </h1>
              <p className="text-[10px] text-slate-400">
                {lang === "hi" ? "थाली में आसान और व्यावहारिक बदलाव" : "Small food choices, explained simply."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/food/diary")}
              className="p-2 rounded-xl text-slate-500 hover:text-teal-700 hover:bg-slate-50 text-xs flex items-center gap-1"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === "hi" ? "डायरी" : "Diary"}</span>
            </button>

            <button
              onClick={() => router.push("/food")}
              className="px-3 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>{lang === "hi" ? "खाना जोड़ें" : "Log Meal"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Intro Banner */}
        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-teal-800">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider">
              {lang === "hi" ? "सहानुभूतिपूर्ण और व्यावहारिक पोषण" : "Practical & Supportive Guidance"}
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {lang === "hi"
              ? "पल्स मील कोच आपकी पसंदीदा थाली को बंद करने या रोटी-चावल छुड़वाने के लिए नहीं है। यह प्रमाणित भारतीय पोषण दिशानिर्देशों (ICMR-NIN) पर आधारित आसान बदलाव सुझाता है।"
              : "Pulse Meal Coach doesn't judge meals or ask you to eliminate staple grains. It offers simple, approved clinical nutrition ideas to gently balance your plate."}
          </p>
        </div>

        {/* Interactive Meal Coach Section */}
        <MealCoachSection />

        {/* Approved Guidance Library Explorer */}
        <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <h3 className="text-xs font-bold text-slate-900">
                {lang === "hi" ? "समीक्षित पोषण ज्ञानकोष (प्रमाणित स्रोत)" : "Approved Nutrition Guidance Library"}
              </h3>
            </div>
            <button
              onClick={() => setShowGuidanceLibrary(!showGuidanceLibrary)}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900"
            >
              {showGuidanceLibrary ? (lang === "hi" ? "छिपाएं" : "Hide") : (lang === "hi" ? "देखें" : "View Sources")}
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            {lang === "hi"
              ? "सभी विचार भारतीय चिकित्सा अनुसंधान परिषद (ICMR), राष्ट्रीय पोषण संस्थान (NIN) और RSSDI के दिशानिर्देशों पर आधारित हैं।"
              : "All advice is grounded in peer-reviewed recommendations from ICMR-NIN, RSSDI, and ADA."}
          </p>

          {showGuidanceLibrary && (
            <div className="pt-2 divide-y divide-slate-100">
              {guidanceList.map((g) => (
                <div key={g.id} className="py-3 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      {lang === "hi" && g.titleHi ? g.titleHi : g.title}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      {g.sourceOrg}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {lang === "hi" && g.contentHi ? g.contentHi : g.content}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                    <span>Reviewed by: {g.reviewerRole}</span>
                    <span>·</span>
                    <span>Status: {g.reviewStatus}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Safety Disclaimer Card */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-3xl text-[11px] text-slate-500 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>{lang === "hi" ? "चिकित्सीय सुरक्षा सीमा" : "Clinical Safety Boundary"}</span>
          </div>
          <p className="leading-relaxed">
            {lang === "hi"
              ? "यह सुविधा केवल शैक्षिक और पोषण जागरूकता के लिए है। यह किसी भी प्रकार का ग्लूकोज प्रिडिक्शन, इंसुलिन कैलकुलेशन या दवा का बदलाव नहीं करती। किसी भी नैदानिक निर्णय के लिए हमेशा अपने डॉक्टर से परामर्श करें।"
              : "This feature is for wellness and educational guidance only. It never predicts blood glucose response or replaces clinician-directed medical care plans."}
          </p>
        </div>
        </div>
      </div>
    </div>

    <MobileBottomNav />
  </div>
);
}
