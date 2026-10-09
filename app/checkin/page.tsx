"use client";

import { useState, useEffect } from "react";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SafetyBanner } from "@/components/layout/SafetyBanner";
import { LanguageToggle, useCurrentLanguage } from "@/components/LanguageToggle";
import { getDictionary } from "@/lib/i18n";
import {
  CheckCircle2,
  Clock,
  Droplet,
  Sparkles,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { PulseTopHeader } from "@/components/layout/PulseTopHeader";

export default function PulseCheckInPage() {
  const lang = useCurrentLanguage();
  const t = getDictionary(lang);

  const [mood, setMood] = useState<string>("Good");
  const [routineStatus, setRoutineStatus] = useState<string>("Completed");
  const [barrier, setBarrier] = useState<string>("");
  const [supportRequested, setSupportRequested] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>("");

  // Optional glucose
  const [showGlucose, setShowGlucose] = useState(false);
  const [glucoseValue, setGlucoseValue] = useState("");
  const [glucoseUnit, setGlucoseUnit] = useState("mg/dL");
  const [glucoseContext, setGlucoseContext] = useState("2h post-meal");

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [recoveryProposal, setRecoveryProposal] = useState<{
    suggestedActionTitle: string;
    suggestedActionTitleHindi?: string;
    rationale: string;
    rationaleHindi?: string;
  } | null>(null);

  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);

  useEffect(() => {
    fetch("/api/pulse/checkin")
      .then((res) => res.json())
      .then((data) => {
        if (data.hasCheckedInToday) {
          setHasCheckedInToday(true);
          if (data.checkIn) {
            setMood(data.checkIn.mood);
            setRoutineStatus(data.checkIn.routineStatus);
            if (data.checkIn.barrier) setBarrier(data.checkIn.barrier);
          }
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/pulse/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mood,
          routineStatus,
          barrier: routineStatus !== "Completed" ? barrier : null,
          supportRequested,
          notes,
          completionTimeSec: 42,
          glucose:
            showGlucose && glucoseValue
              ? {
                  value: parseFloat(glucoseValue),
                  unit: glucoseUnit,
                  context: glucoseContext,
                }
              : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        if (data.recoveryProposal) {
          setRecoveryProposal(data.recoveryProposal);
        }
      }
    } catch (err) {
      console.error("Check-in submit error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const moodsList = [
    { key: "Great", label: t.modules.checkin.moods.Great },
    { key: "Good", label: t.modules.checkin.moods.Good },
    { key: "Okay", label: t.modules.checkin.moods.Okay },
    { key: "Not great", label: t.modules.checkin.moods["Not great"] },
    { key: "Prefer not to say", label: t.modules.checkin.moods["Prefer not to say"] },
  ];

  const routineStatusesList = [
    { key: "Completed", label: t.modules.checkin.statuses.Completed },
    { key: "Partially completed", label: t.modules.checkin.statuses["Partially completed"] },
    { key: "Not completed", label: t.modules.checkin.statuses["Not completed"] },
    { key: "Not applicable today", label: t.modules.checkin.statuses["Not applicable today"] },
  ];

  const barriersList = Object.keys(t.modules.checkin.barriers);

  return (
    <div className="min-h-screen bg-[#DCE8EC] text-[#101A45] flex flex-col lg:flex-row font-sans">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col min-h-screen pb-20 lg:pb-8">
        <PulseTopHeader activeTab="Track" />
        <SafetyBanner compact />

        <div className="bg-white border-b border-[#C9D7DE] px-4 sm:px-8 py-4">
          <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[#087F8C] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {lang === "hi" ? "30–60 सेकंड दैनिक ट्रैकिंग" : "30–60 Second Daily Check-In"}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-[#101A45] mt-0.5">
                {t.modules.checkin.title}
              </h1>
              <p className="text-xs text-[#52616B] mt-0.5">{t.modules.checkin.subtitle}</p>
            </div>

            <LanguageToggle />
          </div>
        </div>

        <main className="max-w-3xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6">
          {/* Success / Recovery Confirmation View */}
          {success ? (
            <div className="bg-white rounded-3xl border border-teal-200 p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {lang === "hi" ? "चेक-इन सहेज लिया गया!" : "Check-In Completed!"}
                  </h3>
                  <p className="text-xs text-slate-500">{t.modules.checkin.successMsg}</p>
                </div>
              </div>

              {/* Engagement Recovery Engine Proposal Card */}
              {recoveryProposal ? (
                <div className="p-5 rounded-2xl bg-teal-50 border border-teal-200 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-700" />
                    <span className="text-xs font-bold text-teal-900 uppercase tracking-wider">
                      {lang === "hi"
                        ? "एंगेजमेंट रिकवरी समाधान"
                        : "Engagement Recovery Suggestion"}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-teal-950">
                    {lang === "hi" && recoveryProposal.suggestedActionTitleHindi
                      ? recoveryProposal.suggestedActionTitleHindi
                      : recoveryProposal.suggestedActionTitle}
                  </h4>
                  <p className="text-xs text-teal-800 leading-relaxed">
                    {lang === "hi" && recoveryProposal.rationaleHindi
                      ? recoveryProposal.rationaleHindi
                      : recoveryProposal.rationale}
                  </p>
                  <div className="pt-2 text-[11px] text-teal-700 font-medium">
                    {lang === "hi"
                      ? "यह बदलाव गैर-चिकित्सीय है ताकि आप बिना किसी दबाव के अपनी दिनचर्या में वापस आ सकें।"
                      : "This is a non-medical routine adaptation to help you restart without friction."}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                  {lang === "hi"
                    ? "शानदार काम! आज का कदम पूरा करने से आपका 90-दिवसीय स्वास्थ्य लक्ष्य मजबूत हुआ है।"
                    : "Great work! Following through on today's action supports your 90-day metabolic follow-through."}
                </div>
              )}

              <button
                type="button"
                onClick={() => setSuccess(false)}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                {lang === "hi" ? "चेक-इन अपडेट करें" : "Update Check-In"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-[#C9D7DE] p-6 sm:p-8 shadow-xs space-y-6">
              {/* Question 1: Mood */}
              <div className="space-y-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#101A45]">
                  1. {t.modules.checkin.q1}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {moodsList.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMood(m.key)}
                      className={`p-3 rounded-2xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                        mood === m.key
                          ? "bg-[#D5F3E7] border-[#087F8C] text-[#101A45] shadow-xs font-bold"
                          : "bg-white border-[#C9D7DE] text-[#52616B] hover:bg-slate-50"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 2: Routine Completion */}
              <div className="space-y-3 pt-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#101A45]">
                  2. {t.modules.checkin.q2}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {routineStatusesList.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setRoutineStatus(s.key)}
                      className={`p-3.5 rounded-2xl border text-left text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                        routineStatus === s.key
                          ? "bg-[#101A45] text-white border-[#101A45] shadow-xs"
                          : "bg-white border-[#C9D7DE] text-[#101A45] hover:bg-slate-50"
                      }`}
                    >
                      <span>{s.label}</span>
                      {routineStatus === s.key && <CheckCircle2 className="w-4 h-4 text-[#D5F3E7]" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question 3: Barriers (Conditional on incomplete) */}
              {routineStatus !== "Completed" && (
                <div className="space-y-3 p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 animate-in fade-in">
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-900">
                    3. {t.modules.checkin.q3}
                  </label>
                  <p className="text-[11px] text-amber-800">
                    {lang === "hi"
                      ? "रुकावट बताना सामान्य है। हम आपके कारण को समझकर लक्ष्य को आसान बनाएंगे।"
                      : "Identifying barriers helps us adapt your goal without blame or guilt."}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {barriersList.map((bKey) => {
                      const label = (t.modules.checkin.barriers as Record<string, string>)[bKey] || bKey;
                      const isSelected = barrier === bKey;

                      return (
                        <button
                          key={bKey}
                          type="button"
                          onClick={() => setBarrier(bKey)}
                          className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                            isSelected
                              ? "bg-amber-100 border-amber-500 text-amber-950 font-bold"
                              : "bg-white border-amber-200 text-slate-700 hover:bg-amber-50"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Question 4: Support Request */}
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <input
                  type="checkbox"
                  id="suppReq"
                  checked={supportRequested}
                  onChange={(e) => setSupportRequested(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <label htmlFor="suppReq" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  {t.modules.checkin.q4}
                </label>
              </div>

              {/* Optional Manual Glucose Section */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Droplet className="w-3.5 h-3.5 text-teal-600" />
                    {t.modules.checkin.glucoseSection}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowGlucose(!showGlucose)}
                    className="text-xs text-teal-700 font-semibold underline"
                  >
                    {showGlucose
                      ? lang === "hi"
                        ? "छिपाएं"
                        : "Hide"
                      : lang === "hi"
                      ? "+ मान दर्ज करें"
                      : "+ Add Reading"}
                  </button>
                </div>

                {showGlucose && (
                  <div className="p-4 rounded-2xl bg-teal-50/50 border border-teal-200 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        {lang === "hi" ? "रीडिंग (मान)" : "Glucose Value"}
                      </label>
                      <input
                        type="number"
                        step="1"
                        placeholder="e.g. 118"
                        value={glucoseValue}
                        onChange={(e) => setGlucoseValue(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        {lang === "hi" ? "इकाई (Unit)" : "Unit"}
                      </label>
                      <select
                        value={glucoseUnit}
                        onChange={(e) => setGlucoseUnit(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                      >
                        <option value="mg/dL">mg/dL</option>
                        <option value="mmol/L">mmol/L</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">
                        {lang === "hi" ? "संदर्भ (Context)" : "Measurement Context"}
                      </label>
                      <select
                        value={glucoseContext}
                        onChange={(e) => setGlucoseContext(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                      >
                        <option value="Fasting">{t.modules.checkin.glucoseContext.Fasting}</option>
                        <option value="Before meal">{t.modules.checkin.glucoseContext["Before meal"]}</option>
                        <option value="2h post-meal">{t.modules.checkin.glucoseContext["2h post-meal"]}</option>
                        <option value="Bedtime">{t.modules.checkin.glucoseContext.Bedtime}</option>
                        <option value="Random">{t.modules.checkin.glucoseContext.Random}</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-[#101A45] hover:bg-[#101A45]/90 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <span>{t.modules.checkin.submitting}</span>
                ) : (
                  <>
                    <span>{t.modules.checkin.submitBtn}</span>
                    <ArrowRight className="w-4 h-4 text-teal-300" />
                  </>
                )}
              </button>
            </form>
          )}
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
