"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  HeartHandshake,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  Lock,
  Sparkles,
  Activity,
} from "lucide-react";
import { LanguageToggle, useCurrentLanguage } from "@/components/LanguageToggle";

interface CaregiverData {
  valid: boolean;
  error?: string;
  patientName?: string;
  relationship?: string;
  caregiverName?: string;
  permissions?: {
    shareGoals: boolean;
    shareCompletedActions: boolean;
    shareReminders: boolean;
    shareEducation: boolean;
    shareWeeklySummary: boolean;
    shareGlucose: boolean;
  };
  goals?: Array<{
    id: string;
    title: string;
    titleHindi?: string | null;
    frequency: string;
    preferredTime?: string | null;
  }>;
  recentCheckIns?: Array<{
    date: string;
    mood: string;
    routineStatus: string;
  }>;
  recentGlucose?: Array<{
    value: number;
    unit: string;
    context?: string | null;
    measuredAt: string;
  }>;
}

export default function CaregiverViewPage() {
  const params = useParams();
  const token = params?.token as string;
  const lang = useCurrentLanguage();

  const [data, setData] = useState<CaregiverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedMsg, setCopiedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    fetch(`/api/pulse/circle/view?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load caregiver data:", err);
        setData({ valid: false, error: "Network error loading caregiver portal." });
        setLoading(false);
      });
  }, [token]);

  const handleCopyEncouragement = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsg(text);
    setTimeout(() => setCopiedMsg(null), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">
            {lang === "hi" ? "केयरगिवर पोर्टल लोड हो रहा है..." : "Loading Caregiver Portal..."}
          </p>
        </div>
      </div>
    );
  }

  if (!data || !data.valid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">
              {lang === "hi" ? "लिंक अमान्य या समाप्त हो गया है" : "Access Link Unavailable"}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {data?.error ||
                (lang === "hi"
                  ? "यह लिंक या तो समाप्त हो चुका है या रोगी द्वारा वापस ले लिया गया है।"
                  : "This invitation link is invalid, expired, or has been revoked by the patient.")}
            </p>
          </div>
          <div className="pt-2 text-[11px] text-slate-400">
            {lang === "hi"
              ? "यदि आपको लगता है कि यह त्रुटि है, तो कृपया रोगी से नया लिंक भेजने का अनुरोध करें।"
              : "Please ask the patient to generate a new Care Circle link if you believe this is an error."}
          </div>
        </div>
      </div>
    );
  }

  const encouragementWalk =
    lang === "hi"
      ? `नमस्ते ${data.patientName}! क्या आप आज शाम 10 मिनट टहलने के लिए साथ चलना चाहेंगे? 🌿`
      : `Hi ${data.patientName}! Would you like me to join you for a gentle 10-minute walk today? 🌿`;

  const encouragementCheer =
    lang === "hi"
      ? `नमस्ते ${data.patientName}! आपकी दैनिक निरंतरता देखकर बहुत खुशी हुई। एक छोटा कदम भी काफी है! 💫`
      : `Hi ${data.patientName}! Proud of your consistency today. One small step at a time! 💫`;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 flex items-center justify-center text-white shadow-xs">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 leading-tight">
              Project<span className="text-teal-600">Pulse</span>
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold">
              {lang === "hi" ? "केयरगिवर साथी पोर्टल" : "Care Circle Partner View"}
            </div>
          </div>
        </div>

        <LanguageToggle />
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Welcome Greeting Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white border border-teal-100 shadow-2xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-sm">
              <HeartHandshake className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">
                {lang === "hi" ? "केयर पार्टनर" : "Care Partner"} • {data.caregiverName} ({data.relationship})
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900">
                {lang === "hi"
                  ? `${data.patientName} की स्वास्थ्य यात्रा का सहयोग`
                  : `Supporting ${data.patientName}'s Health Journey`}
              </h1>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed pt-1 border-t border-slate-100">
            {lang === "hi"
              ? `${data.patientName} ने आपको अपनी दैनिक जीवनशैली में सकारात्मक प्रोत्साहन देने के लिए इस पोर्टल की पहुँच प्रदान की है।`
              : `${data.patientName} has invited you to support their daily lifestyle routine with gentle, nonjudgmental encouragement.`}
          </p>

          <div className="p-3 rounded-xl bg-slate-50 text-[11px] text-slate-500 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {lang === "hi"
                ? "यह रोगी-नियंत्रित पोर्टल है। निजी दवाएं, नुस्खे और क्लिनिकल नोट्स सुरक्षित हैं।"
                : "Patient-controlled view. Private medical notes and prescriptions remain strictly confidential."}
            </span>
          </div>
        </div>

        {/* Section: Daily SMART Goals (if shared) */}
        {data.permissions?.shareGoals && data.goals && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 px-1">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>{lang === "hi" ? "दैनिक निर्धारित लक्ष्य" : "Shared Daily Action Goals"}</span>
            </h2>

            <div className="space-y-2">
              {data.goals.map((goal) => (
                <div
                  key={goal.id}
                  className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-1"
                >
                  <div className="text-xs font-bold text-slate-900">
                    {lang === "hi" && goal.titleHindi ? goal.titleHindi : goal.title}
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2">
                    <span>{goal.frequency}</span>
                    {goal.preferredTime && <span>• {goal.preferredTime}</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section: Recent Daily Check-in Adherence (if shared) */}
        {data.permissions?.shareCompletedActions && data.recentCheckIns && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 px-1">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>{lang === "hi" ? "हाल की दिनचर्या स्थिति" : "Recent Routine Status"}</span>
            </h2>

            <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs divide-y divide-slate-100">
              {data.recentCheckIns.map((ci, idx) => (
                <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                  <span className="text-slate-600">{ci.date}</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded-md text-[11px] ${
                      ci.routineStatus === "Completed"
                        ? "bg-emerald-50 text-emerald-700"
                        : ci.routineStatus === "Partially completed"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {ci.routineStatus}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section: Blood Glucose (Only if explicit opt-in) */}
        {data.permissions?.shareGlucose && data.recentGlucose && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5 px-1">
              <Activity className="w-4 h-4 text-amber-600" />
              <span>
                {lang === "hi"
                  ? "रक्त शर्करा (रोगी द्वारा स्पष्ट साझाकरण)"
                  : "Blood Glucose (Explicitly Shared)"}
              </span>
            </h2>

            <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200/80 shadow-2xs divide-y divide-amber-100">
              {data.recentGlucose.map((g, idx) => (
                <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900">
                      {g.value} {g.unit}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {g.context || "Reading"} • {new Date(g.measuredAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section: Gentle Caregiver Encouragement Actions */}
        <section className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900">
              {lang === "hi" ? "सहानुभूतिपूर्ण संदेश भेजें" : "Send Supportive Encouragement"}
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            {lang === "hi"
              ? "एक क्लिक में संदेश कॉपी करें और व्हाट्सएप या एसएमएस पर भेजें:"
              : "Copy one of these non-judgmental prompts to send via WhatsApp, SMS, or chat:"}
          </p>

          <div className="space-y-2.5">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-700 italic flex-1">"{encouragementWalk}"</p>
              <button
                onClick={() => handleCopyEncouragement(encouragementWalk)}
                className="shrink-0 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                {copiedMsg === encouragementWalk ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">{lang === "hi" ? "कॉपी हुआ" : "Copied"}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{lang === "hi" ? "कॉपी करें" : "Copy"}</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <p className="text-xs text-slate-700 italic flex-1">"{encouragementCheer}"</p>
              <button
                onClick={() => handleCopyEncouragement(encouragementCheer)}
                className="shrink-0 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                {copiedMsg === encouragementCheer ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">{lang === "hi" ? "कॉपी हुआ" : "Copied"}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>{lang === "hi" ? "कॉपी करें" : "Copy"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Footer Security Notice */}
        <div className="text-center text-[11px] text-slate-400 space-y-1">
          <p>
            {lang === "hi"
              ? "पल्स सुरक्षित पारिवारिक देखभाल नेटवर्क • 14 दिनों में स्वतः समाप्त"
              : "Project Pulse Secure Care Circle Network • Auto-expires in 14 days"}
          </p>
          <p>
            {lang === "hi"
              ? "रोगी किसी भी समय अपनी सेटिंग्स से इस पहुँच को समाप्त कर सकता है।"
              : "Access can be revoked at any time by the patient."}
          </p>
        </div>
      </main>
    </div>
  );
}
