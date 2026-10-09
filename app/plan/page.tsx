"use client";

import { useEffect, useState } from "react";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SafetyBanner } from "@/components/layout/SafetyBanner";
import { LanguageToggle, useCurrentLanguage } from "@/components/LanguageToggle";
import { getDictionary } from "@/lib/i18n";
import {
  Target,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  HelpCircle,
  PauseCircle,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  Info,
} from "lucide-react";
import { PulseTopHeader } from "@/components/layout/PulseTopHeader";

interface HealthGoalItem {
  id: string;
  title: string;
  titleHindi?: string | null;
  reason?: string | null;
  frequency: string;
  preferredTime?: string | null;
  targetDurationMin?: number | null;
  sourceRecommendation: string;
  patientStatus: string;
  clinicianStatus: string;
  isPrimary: boolean;
  status: string;
}

export default function PulsePlanPage() {
  const lang = useCurrentLanguage();
  const t = getDictionary(lang);

  const [goals, setGoals] = useState<HealthGoalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [adjustingGoal, setAdjustingGoal] = useState<HealthGoalItem | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newFreq, setNewFreq] = useState("3 days/week");

  // Wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [planInstructions, setPlanInstructions] = useState(
    "Walking 15 mins after meals, low glycemic whole grains, fasting glucose monitoring 3x/week."
  );
  const [workSchedule, setWorkSchedule] = useState("Day Shift (09:00 - 18:00)");
  const [mealTiming, setMealTiming] = useState("Lunch 13:00, Dinner 20:30");
  const [saving, setSaving] = useState(false);

  const fetchPlan = async () => {
    try {
      const res = await fetch("/api/pulse/plan");
      const data = await res.json();
      if (data.goals) setGoals(data.goals);
    } catch (err) {
      console.error("Plan load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  const handleGoalAction = async (goalId: string, action: string, adjustedTitle?: string) => {
    try {
      await fetch(`/api/pulse/plan/goals/${goalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          adjustedTitle,
          adjustedFrequency: newFreq,
        }),
      });
      setAdjustingGoal(null);
      await fetchPlan();
    } catch (err) {
      console.error("Goal action error:", err);
    }
  };

  const handleCompleteWizard = async () => {
    setSaving(true);
    try {
      await fetch("/api/pulse/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instructions: planInstructions,
          goals: [
            {
              title: "10-minute post-lunch walk",
              titleHindi: "दोपहर के भोजन के बाद 10 मिनट टहलें",
              reason: "Support postprandial glucose stability",
              frequency: "5 days/week",
              preferredTime: "13:30",
              targetDurationMin: 10,
              isPrimary: true,
            },
            {
              title: "Include high-fiber green salad before dinner",
              titleHindi: "रात के खाने से पहले हरी सलाद या खीरा खाएं",
              reason: "Slow glucose absorption from carbohydrates",
              frequency: "Daily",
              preferredTime: "20:00",
              targetDurationMin: 5,
              isPrimary: false,
            },
          ],
        }),
      });
      setShowWizard(false);
      await fetchPlan();
    } catch (err) {
      console.error("Wizard submit error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#DCE8EC] text-[#101A45] flex flex-col lg:flex-row font-sans">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col min-h-screen pb-20 lg:pb-8">
        <PulseTopHeader activeTab="Track" />
        <SafetyBanner compact />

        <div className="bg-white border-b border-[#C9D7DE] px-4 sm:px-8 py-4">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[#087F8C] uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                {t.modules.plan.title}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-[#101A45] mt-0.5">
                {lang === "hi" ? "आपकी दैनिक कार्य योजना" : "Personalized SMART Action Plan"}
              </h1>
              <p className="text-xs text-[#52616B] mt-0.5">{t.modules.plan.subtitle}</p>
            </div>

            <div className="flex items-center gap-3">
              <LanguageToggle />
              <button
                type="button"
                onClick={() => setShowWizard(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#101A45] hover:bg-[#101A45]/90 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-teal-300" />
                <span>{lang === "hi" ? "योजना कस्टमाइज़ करें" : "Plan Setup Wizard"}</span>
              </button>
            </div>
          </div>
        </div>

        <main className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6">
          {/* Non-Medical Safety Banner */}
          <div className="p-4 rounded-2xl bg-[#D5F3E7] border border-[#A6E5CC] text-xs text-[#101A45] flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-[#087F8C] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-[#101A45]">
                {lang === "hi" ? "डॉक्टर द्वारा स्वीकृत ढांचा" : "Clinician-Supervised Boundary"}
              </span>
              <p className="text-[11px] text-[#101A45]/85 leading-relaxed">
                {lang === "hi"
                  ? "पल्स आपके डॉक्टर के पर्चे (दवाइयों व इंसुलिन की मात्रा) में कभी बदलाव नहीं करता। यहाँ केवल जीवनशैली व व्यावहारिक लक्ष्यों को अनुकूलित किया जाता है।"
                  : "Pulse never modifies prescription medications or insulin doses. Only non-medical lifestyle habits are adapted to your daily routine."}
              </p>
            </div>
          </div>

          {/* SMART Goals Action Cards Grid */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {lang === "hi" ? "सक्रिय दैनिक लक्ष्य (SMART Goals)" : "Active Daily Actions"}
            </h3>

            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                {lang === "hi" ? "योजना लोड हो रही है..." : "Loading active plan..."}
              </div>
            ) : goals.length === 0 ? (
              <div className="p-8 rounded-3xl bg-white border border-slate-200 text-center space-y-3">
                <Target className="w-8 h-8 text-teal-600 mx-auto" />
                <h4 className="font-bold text-sm text-slate-900">
                  {lang === "hi" ? "कोई सक्रिय लक्ष्य नहीं मिला" : "No active goals yet"}
                </h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  {lang === "hi"
                    ? "डॉक्टर की सलाह को 3 छोटे दैनिक कदमों में बदलने के लिए विज़ार्ड शुरू करें।"
                    : "Launch the plan setup wizard to translate your care plan into small daily actions."}
                </p>
                <button
                  onClick={() => setShowWizard(true)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold"
                >
                  {lang === "hi" ? "सेटअप शुरू करें" : "Start Setup"}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goals.map((g) => {
                  const titleDisplay = lang === "hi" && g.titleHindi ? g.titleHindi : g.title;

                  return (
                    <div
                      key={g.id}
                      className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-teal-300 transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                              g.isPrimary
                                ? "bg-teal-50 text-teal-800 border border-teal-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {g.isPrimary
                              ? lang === "hi"
                                ? "प्राथमिक लक्ष्य"
                                : "PRIMARY ACTION"
                              : lang === "hi"
                              ? "सहायक लक्ष्य"
                              : "SUPPORTING"}
                          </span>

                          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {g.clinicianStatus === "APPROVED"
                              ? lang === "hi"
                                ? "डॉक्टर स्वीकृत"
                                : "Clinician Approved"
                              : lang === "hi"
                              ? "समीक्षा प्रतीक्षित"
                              : "Pending Review"}
                          </span>
                        </div>

                        <h4 className="text-base font-bold text-slate-900 leading-snug">
                          {titleDisplay}
                        </h4>

                        {g.reason && (
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            <strong className="text-slate-700">
                              {lang === "hi" ? "उद्देश्य:" : "Reason:"}
                            </strong>{" "}
                            {g.reason}
                          </p>
                        )}

                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                          <div>
                            <span className="text-slate-400 block font-medium">
                              {lang === "hi" ? "आवृत्ति:" : "Frequency:"}
                            </span>
                            <span className="font-semibold text-slate-700">{g.frequency}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block font-medium">
                              {lang === "hi" ? "समय:" : "Time:"}
                            </span>
                            <span className="font-semibold text-slate-700">
                              {g.preferredTime || "दोपहर"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Goal Adjustment Actions Bar */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        {g.patientStatus === "PAUSED" ? (
                          <span className="text-xs text-amber-600 font-semibold flex items-center gap-1">
                            <PauseCircle className="w-3.5 h-3.5" />
                            {lang === "hi" ? "लक्ष्य रुका हुआ है" : "Goal Paused"}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustingGoal(g);
                              setNewTitle(g.title);
                            }}
                            className="text-xs text-teal-700 hover:text-teal-900 font-semibold underline"
                          >
                            {lang === "hi" ? "बदलाव का अनुरोध" : "Request Adjustment"}
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            handleGoalAction(g.id, g.patientStatus === "PAUSED" ? "ACCEPT" : "PAUSE")
                          }
                          className="px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          {g.patientStatus === "PAUSED"
                            ? lang === "hi"
                              ? "पुनः शुरू करें"
                              : "Resume"
                            : lang === "hi"
                            ? "रोकें (Pause)"
                            : "Pause"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Goal Adjustment Modal */}
          {adjustingGoal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
              <div className="bg-white rounded-3xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-6 space-y-4 shadow-xl border border-slate-200">
                <h3 className="font-bold text-base text-slate-900">
                  {lang === "hi" ? "लक्ष्य अनुकूलन अनुरोध" : "Request Goal Adjustment"}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === "hi"
                    ? "यदि यह लक्ष्य बहुत कठिन लग रहा है, तो छोटा विकल्प चुनें। इसे डॉक्टर की समीक्षा के लिए भेजा जाएगा।"
                    : "If this routine feels too difficult, request a smaller micro-action. Your clinician will review the adjustment."}
                </p>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {lang === "hi" ? "संशोधित लक्ष्य शीर्षक" : "Adapted Goal Title"}
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. 5-minute walk instead of 15-minute"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      {lang === "hi" ? "आवृत्ति (Frequency)" : "Frequency"}
                    </label>
                    <select
                      value={newFreq}
                      onChange={(e) => setNewFreq(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                    >
                      <option value="3 days/week">3 days / week</option>
                      <option value="4 days/week">4 days / week</option>
                      <option value="5 days/week">5 days / week</option>
                      <option value="Daily">Daily</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    onClick={() => setAdjustingGoal(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                  >
                    {lang === "hi" ? "रद्द करें" : "Cancel"}
                  </button>
                  <button
                    onClick={() => handleGoalAction(adjustingGoal.id, "REQUEST_ADJUSTMENT", newTitle)}
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold"
                  >
                    {lang === "hi" ? "अनुरोध सबमिट करें" : "Submit Request"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Setup Wizard Modal */}
          {showWizard && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
              <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-base text-slate-900">
                    {lang === "hi" ? "केयर प्लान सेटअप विज़ार्ड" : "Care Plan Setup Wizard"}
                  </h3>
                  <span className="text-xs font-mono font-bold text-teal-700">
                    Step {wizardStep} of 3
                  </span>
                </div>

                {wizardStep === 1 && (
                  <div className="space-y-3 text-xs">
                    <label className="block font-semibold text-slate-800">
                      {lang === "hi"
                        ? "1. डॉक्टर द्वारा दी गई प्रमुख निर्देश (Care Plan Instructions)"
                        : "1. Doctor's Approved Care Plan Instructions"}
                    </label>
                    <textarea
                      rows={3}
                      value={planInstructions}
                      onChange={(e) => setPlanInstructions(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:border-teal-500"
                    />
                    <p className="text-[11px] text-slate-400">
                      {lang === "hi"
                        ? "पल्स इन निर्देशों को समझने योग्य दैनिक क्रियाओं में बदलेगा।"
                        : "Pulse will convert these clinical instructions into small daily habits."}
                    </p>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold text-slate-800 mb-1">
                        {lang === "hi" ? "काम/दफ्तर का समय" : "Work / Daily Schedule"}
                      </label>
                      <input
                        type="text"
                        value={workSchedule}
                        onChange={(e) => setWorkSchedule(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-800 mb-1">
                        {lang === "hi" ? "भोजन का सामान्य समय" : "Typical Meal Timings"}
                      </label>
                      <input
                        type="text"
                        value={mealTiming}
                        onChange={(e) => setMealTiming(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500"
                      />
                    </div>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="space-y-3 text-xs text-slate-600">
                    <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 space-y-1">
                      <div className="font-bold text-teal-900">
                        {lang === "hi" ? "तैयार किए गए स्मार्ट लक्ष्य:" : "Generated SMART Actions:"}
                      </div>
                      <ul className="list-disc pl-4 text-[11px] text-teal-800 space-y-1">
                        <li>10-minute walk after lunch (5 days/week)</li>
                        <li>High-fiber salad with dinner (Daily)</li>
                      </ul>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {lang === "hi"
                        ? "ये लक्ष्य गैर-चिकित्सीय जीवनशैली के लिए हैं और डॉक्टर की देखरेख में रहते हैं।"
                        : "These actions respect your clinical instructions and can be adjusted anytime."}
                    </p>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  {wizardStep > 1 ? (
                    <button
                      onClick={() => setWizardStep(wizardStep - 1)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      {lang === "hi" ? "पीछे" : "Back"}
                    </button>
                  ) : (
                    <button
                      onClick={() => setShowWizard(false)}
                      className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                    >
                      {lang === "hi" ? "रद्द करें" : "Cancel"}
                    </button>
                  )}

                  {wizardStep < 3 ? (
                    <button
                      onClick={() => setWizardStep(wizardStep + 1)}
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold"
                    >
                      {lang === "hi" ? "आगे बढ़ें" : "Next"}
                    </button>
                  ) : (
                    <button
                      disabled={saving}
                      onClick={handleCompleteWizard}
                      className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold"
                    >
                      {saving
                        ? lang === "hi"
                          ? "सहेजा जा रहा है..."
                          : "Saving..."
                        : lang === "hi"
                        ? "योजना सक्रिय करें"
                        : "Activate Plan"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
