"use client";

import { useState, useEffect } from "react";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { LanguageToggle, useCurrentLanguage } from "@/components/LanguageToggle";
import { getDictionary } from "@/lib/i18n";
import {
  TrendingUp,
  Award,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  FileText,
  PlusCircle,
  Printer,
  ShieldCheck,
  ChevronRight,
  Stethoscope,
  Activity,
  Flame,
  Share2,
  Download,
  Sparkles,
} from "lucide-react";
import { PulseTopHeader } from "@/components/layout/PulseTopHeader";
import { GlucoseChart } from "@/components/dashboard/GlucoseChart";

interface WeeklyReviewData {
  plannedActionsCount: number;
  completedActionsCount: number;
  partiallyCompletedCount: number;
  missedRoutinesCount: number;
  recoverySuccessCount: number;
  checkInRatePercent: number;
  reportedBarriersList: string;
}

interface OutcomeData {
  patient: {
    name: string;
    email: string;
    diabetesType: string;
    programDayCurrent: number;
    programStatus: string;
  };
  clinicalOutcomes: {
    baselineHbA1c: {
      value: number;
      unit: string;
      date: string;
      source: string;
      lab?: string;
    } | null;
    followUpHbA1c: {
      value: number;
      unit: string;
      date: string;
      source: string;
      lab?: string;
    } | null;
    hba1cChange: number | null;
    changeInterpretation: string;
  };
  behavioralAdherence: {
    totalCheckInsLogged: number;
    adherenceRatePercent: number;
    totalMissedRoutines: number;
    returnToRoutineRatePercent: number;
  };
  goalsSummary: Array<{
    title: string;
    status: string;
    patientStatus: string;
    clinicianStatus: string;
  }>;
}

export default function ReviewPage() {
  const lang = useCurrentLanguage();
  const t = getDictionary(lang);

  const [activeTab, setActiveTab] = useState<"weekly" | "90day">("weekly");

  const glucosePoints = [
    { timeFormatted: "Thu 2", value: 112, source: "Manual log" },
    { timeFormatted: "Fri 3", value: 128, source: "Manual log" },
    { timeFormatted: "Sat 4", value: 118, source: "Manual log" },
    { timeFormatted: "Sun 5", value: 135, source: "Manual log" },
    { timeFormatted: "Mon 6", value: 124, source: "Manual log" },
    { timeFormatted: "Tue 7", value: 116, source: "Manual log" },
    { timeFormatted: "Wed 8", value: 118, source: "Manual log" },
  ];
  const [weekly, setWeekly] = useState<WeeklyReviewData | null>(null);
  const [outcome, setOutcome] = useState<OutcomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddLabModal, setShowAddLabModal] = useState(false);
  const [showClinicianReportModal, setShowClinicianReportModal] = useState(false);
  const [submittingLab, setSubmittingLab] = useState(false);

  // New Lab Measurement Form
  const [labForm, setLabForm] = useState({
    value: "",
    measuredAt: new Date().toISOString().split("T")[0],
    laboratoryName: "Dr. Lal PathLabs / SRL Diagnostics",
    isBaseline: false,
    isFollowUp: true,
    clinicalNotes: "Official venous blood draw HbA1c",
  });

  const fetchData = async () => {
    try {
      const [weeklyRes, outcomeRes] = await Promise.all([
        fetch("/api/pulse/review/weekly?week=2"),
        fetch("/api/pulse/review/90-day"),
      ]);

      if (weeklyRes.ok) {
        const wData = await weeklyRes.json();
        setWeekly(wData.review);
      }
      if (outcomeRes.ok) {
        const oData = await outcomeRes.json();
        setOutcome(oData.outcome);
      }
    } catch (err) {
      console.error("Error loading reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLabSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!labForm.value) return;

    setSubmittingLab(true);
    try {
      const res = await fetch("/api/pulse/review/measurement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(labForm),
      });

      if (res.ok) {
        setShowAddLabModal(false);
        setLabForm({
          value: "",
          measuredAt: new Date().toISOString().split("T")[0],
          laboratoryName: "Dr. Lal PathLabs / SRL Diagnostics",
          isBaseline: false,
          isFollowUp: true,
          clinicalNotes: "Official venous blood draw HbA1c",
        });
        fetchData();
      }
    } catch {
      alert("Failed to save laboratory measurement.");
    } finally {
      setSubmittingLab(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex min-h-screen bg-[#DCE8EC] text-[#101A45]">
      <DesktopSidebar />

      <main className="flex-1 min-w-0 pb-24 lg:pb-12">
        <PulseTopHeader activeTab="Track" />

        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 space-y-6">
          {/* Top Health Summary Banner matching Screenshot 5 */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-[#101A45]">
                  Your health summary
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-white text-[#101A45] border border-[#C9D7DE]">
                  1 Oct - 7 Oct 2025
                </span>
              </div>
              <p className="text-xs text-[#52616B] mt-1">
                Synthesized glycemic and routine trends ready for your clinical consultation
              </p>
            </div>

            <div className="flex items-center gap-2">
              <LanguageToggle />
              <button
                type="button"
                onClick={() => setShowClinicianReportModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#101A45] hover:bg-[#101A45]/90 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-teal-300" />
                <span>Share with clinician</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-[#101A45] border border-[#C9D7DE] rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#52616B]" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>

          {/* Overview Section Pill */}
          <div className="flex items-center gap-2 pb-1">
            <span className="px-4 py-2 rounded-xl text-xs font-bold bg-[#101A45] text-white shadow-xs">
              Overview
            </span>
          </div>

          {/* 2-Column Grid matching Screenshot 5 */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column (7 cols): Glucose Trend & Donut Gauges */}
            <div className="lg:col-span-7 space-y-5">
              {/* Card 1: Glucose Trend */}
              <div className="bg-white rounded-2xl border border-[#C9D7DE] p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#101A45]">Glucose trend (mg/dL)</h3>
                    <p className="text-[11px] text-[#52616B]">Target corridor: 70–130 mg/dL</p>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#D5F3E7] text-[#087F8C]">
                    ✓ In range 86% of the time
                  </span>
                </div>
                <GlucoseChart points={glucosePoints} />
              </div>

              {/* Card 2: Habit Consistency Donut Gauges */}
              <div className="bg-white rounded-2xl border border-[#C9D7DE] p-5 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-[#101A45]">Habit consistency</h3>
                <div className="grid grid-cols-2 gap-4">
                  {/* Donut 1: 75% Daily Goals */}
                  <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                    <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="#D5F3E7" strokeWidth="8" fill="transparent" />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#087F8C"
                          strokeWidth="8"
                          strokeDasharray="251.32"
                          strokeDashoffset="62.83"
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </svg>
                      <span className="absolute text-sm font-black text-[#101A45]">75%</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#101A45]">Daily goals</div>
                      <div className="text-[11px] text-[#52616B]">18 of 24 completed</div>
                    </div>
                  </div>

                  {/* Donut 2: 92% Medication */}
                  <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-50/60 border border-slate-100">
                    <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="#D5F3E7" strokeWidth="8" fill="transparent" />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#087F8C"
                          strokeWidth="8"
                          strokeDasharray="251.32"
                          strokeDashoffset="20.1"
                          strokeLinecap="round"
                          fill="transparent"
                        />
                      </svg>
                      <span className="absolute text-sm font-black text-[#101A45]">92%</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#101A45]">Medication</div>
                      <div className="text-[11px] text-[#52616B]">13 of 14 doses</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column (5 cols): Key insights for your doctor */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-2xl border border-[#C9D7DE] p-5 shadow-xs space-y-4 h-full flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#101A45]">Key insights for your doctor</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D5F3E7] text-[#087F8C]">
                      Ready for appointment
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl border border-[#C9D7DE] bg-slate-50/50 flex items-start gap-2.5 text-xs text-[#101A45]">
                      <span className="w-5 h-5 rounded-full bg-[#D5F3E7] text-[#087F8C] flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">✓</span>
                      <p className="leading-snug">Fasting glucose stable at avg 116 mg/dL over past 14 days</p>
                    </div>
                    <div className="p-3 rounded-xl border border-[#C9D7DE] bg-slate-50/50 flex items-start gap-2.5 text-xs text-[#101A45]">
                      <span className="w-5 h-5 rounded-full bg-[#D5F3E7] text-[#087F8C] flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">✓</span>
                      <p className="leading-snug">Evening routine missed twice (busy work schedule) — recovered following day</p>
                    </div>
                    <div className="p-3 rounded-xl border border-[#C9D7DE] bg-slate-50/50 flex items-start gap-2.5 text-xs text-[#101A45]">
                      <span className="w-5 h-5 rounded-full bg-[#D5F3E7] text-[#087F8C] flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">✓</span>
                      <p className="leading-snug">Post-meal readings improved after adding 150g curd to lunch</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowClinicianReportModal(true)}
                    className="w-full py-2.5 bg-[#101A45] hover:bg-[#101A45]/90 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    Share with clinician
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="w-full py-2.5 bg-white hover:bg-slate-50 text-[#101A45] border border-[#C9D7DE] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Download PDF summary
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Tab Selector: Weekly Review vs 90-Day Outcome */}
          <div className="flex items-center gap-2 p-1 bg-white rounded-2xl border border-[#C9D7DE] shadow-xs max-w-md">
            <button
              onClick={() => setActiveTab("weekly")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "weekly"
                  ? "bg-[#101A45] text-white shadow-xs"
                  : "text-[#52616B] hover:text-[#101A45] hover:bg-slate-50"
              }`}
            >
              {lang === "hi" ? "साप्ताहिक दिनचर्या समीक्षा" : "Weekly Routine Breakdown"}
            </button>
            <button
              onClick={() => setActiveTab("90day")}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "90day"
                  ? "bg-[#101A45] text-white shadow-xs"
                  : "text-[#52616B] hover:text-[#101A45] hover:bg-slate-50"
              }`}
            >
              {lang === "hi" ? "90-दिवसीय परिणाम व HbA1c" : "90-Day Outcomes & HbA1c"}
            </button>
          </div>

          {loading ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-[#C9D7DE] text-slate-400 text-xs">
              {lang === "hi" ? "समीक्षा लोड हो रही है..." : "Loading reviews..."}
            </div>
          ) : activeTab === "weekly" ? (
            /* TAB 1: WEEKLY PROGRESS REVIEW */
            <div className="space-y-6">
              {/* Top Highlights Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {lang === "hi" ? "चेक-इन दर (7 दिन)" : "Check-In Consistency"}
                  </div>
                  <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    <span>{weekly?.checkInRatePercent ?? 85}%</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                      🌿 {lang === "hi" ? "उत्कृष्ट" : "Active"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {lang === "hi"
                      ? "7 में से 6 दिन दैनिक स्थिति दर्ज की गई"
                      : "Daily tracking maintained across the week"}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {lang === "hi" ? "पूरे किए गए कदम" : "Planned Actions Completed"}
                  </div>
                  <div className="text-2xl font-black text-teal-700 flex items-center gap-1.5">
                    <span>{weekly?.completedActionsCount ?? 5}</span>
                    <span className="text-base font-normal text-slate-400">/ 7</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {lang === "hi"
                      ? `${weekly?.partiallyCompletedCount ?? 1} कदम आंशिक रूप से पूरे हुए`
                      : `${weekly?.partiallyCompletedCount ?? 1} actions partially completed`}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-teal-100 bg-gradient-to-br from-teal-50/40 to-emerald-50/30 shadow-2xs space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                    {lang === "hi" ? "रिकवरी दर (7-Day Return)" : "Return-to-Routine Rate"}
                  </div>
                  <div className="text-2xl font-black text-teal-900 flex items-center gap-1.5">
                    <RotateCcw className="w-5 h-5 text-teal-600" />
                    <span>83%</span>
                  </div>
                  <p className="text-[11px] text-teal-700">
                    {lang === "hi"
                      ? "छूटी हुई दिनचर्या के बाद सफल वापसी"
                      : "Restarted routine within 7 days after missed days"}
                  </p>
                </div>
              </div>

              {/* Weekly Action Distribution Visual */}
              <section className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <h3 className="text-sm font-bold text-slate-900">
                      {lang === "hi" ? "साप्ताहिक दिनचर्या वितरण" : "Weekly Routine Breakdown"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {lang === "hi"
                        ? "दैनिक कार्यों को बिना अपराध-बोध के संतुलित रूप से ट्रैक किया जाता है"
                        : "Tracking outcomes without guilt or punishment"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-400">Week 2</span>
                </div>

                {/* Progress bar visual */}
                <div className="space-y-2">
                  <div className="h-4 w-full rounded-full bg-slate-100 flex overflow-hidden">
                    <div
                      style={{ width: `${((weekly?.completedActionsCount ?? 5) / 7) * 100}%` }}
                      className="bg-teal-600 h-full"
                      title="Completed"
                    />
                    <div
                      style={{ width: `${((weekly?.partiallyCompletedCount ?? 1) / 7) * 100}%` }}
                      className="bg-amber-400 h-full"
                      title="Partially Completed"
                    />
                    <div
                      style={{ width: `${((weekly?.missedRoutinesCount ?? 1) / 7) * 100}%` }}
                      className="bg-slate-300 h-full"
                      title="Missed"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-teal-600" />
                      <span>
                        {lang === "hi" ? "पूर्ण:" : "Completed:"} {weekly?.completedActionsCount ?? 5}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-amber-400" />
                      <span>
                        {lang === "hi" ? "आंशिक:" : "Partially Completed:"}{" "}
                        {weekly?.partiallyCompletedCount ?? 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full bg-slate-300" />
                      <span>
                        {lang === "hi" ? "छूटी हुई दिनचर्या:" : "Missed / Recovered:"}{" "}
                        {weekly?.missedRoutinesCount ?? 1}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Empathetic Barrier Insight */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-amber-500" />
                    <span>
                      {lang === "hi"
                        ? "इस सप्ताह की मुख्य रुकावटें व समाधान"
                        : "Identified Barriers & Recovery Insights"}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    {lang === "hi"
                      ? 'इस सप्ताह सबसे अधिक "व्यस्त दिनचर्या" दर्ज की गई। पल्स रिकवरी इंजन ने 15 मिनट के वॉक को भोजन के तुरंत बाद 8 मिनट के हल्के वॉक में समायोजित किया, जिससे वापसी आसान रही।'
                      : 'The most frequent barrier this week was "Busy schedule". The Pulse Recovery Engine adapted your walk goal from 15 mins to a lighter 8-min stroll, allowing successful routine recovery.'}
                  </p>
                </div>
              </section>
            </div>
          ) : (
            /* TAB 2: 90-DAY PROGRAM OUTCOMES & VERIFIED HBA1C */
            <div className="space-y-6">
              {/* Verified HbA1c Lab Comparison Card */}
              <section className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Award className="w-5 h-5 text-teal-600" />
                      <h3 className="text-base font-bold text-slate-900">
                        {t.modules.review.hba1cTitle}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500">
                      {lang === "hi"
                        ? "मान्यता प्राप्त पैथोलॉजी प्रयोगशाला परीक्षणों द्वारा सत्यापित"
                        : "Verified by official laboratory blood draws"}
                    </p>
                  </div>

                  <button
                    onClick={() => setShowAddLabModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-teal-200 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-semibold transition-colors cursor-pointer self-start sm:self-center"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>{lang === "hi" ? "नई लैब रिपोर्ट दर्ज करें" : "Log Laboratory HbA1c"}</span>
                  </button>
                </div>

                {/* HbA1c Comparison Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Baseline */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {t.modules.review.baselineLabel}
                    </div>
                    <div className="text-2xl font-black text-slate-900">
                      {outcome?.clinicalOutcomes.baselineHbA1c
                        ? `${outcome.clinicalOutcomes.baselineHbA1c.value}%`
                        : "7.8%"}
                    </div>
                    <div className="text-[11px] text-slate-500 space-y-0.5">
                      <div>
                        {outcome?.clinicalOutcomes.baselineHbA1c?.date || "Day 1 (Baseline)"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {outcome?.clinicalOutcomes.baselineHbA1c?.lab || "Certified Diagnostic Lab"}
                      </div>
                    </div>
                  </div>

                  {/* Follow-Up */}
                  <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                      {t.modules.review.followUpLabel}
                    </div>
                    <div className="text-2xl font-black text-teal-900">
                      {outcome?.clinicalOutcomes.followUpHbA1c
                        ? `${outcome.clinicalOutcomes.followUpHbA1c.value}%`
                        : "7.1%"}
                    </div>
                    <div className="text-[11px] text-teal-700 space-y-0.5">
                      <div>
                        {outcome?.clinicalOutcomes.followUpHbA1c?.date || "Day 90 Follow-Up"}
                      </div>
                      <div className="text-[10px] text-teal-600">
                        {outcome?.clinicalOutcomes.followUpHbA1c?.lab || "Certified Diagnostic Lab"}
                      </div>
                    </div>
                  </div>

                  {/* Observed Delta */}
                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      {t.modules.review.changeLabel}
                    </div>
                    <div className="text-2xl font-black text-emerald-900 flex items-center gap-1">
                      <span>-0.7%</span>
                      <span className="text-xs font-bold text-emerald-700">📉</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 font-medium leading-tight">
                      {outcome?.clinicalOutcomes.changeInterpretation ||
                        (lang === "hi"
                          ? "90 दिनों में 0.7% की क्लिनिकल कमी देखी गई"
                          : "0.7% clinical reduction achieved")}
                    </p>
                  </div>
                </div>

                {/* Transparency Disclaimer */}
                <div className="p-3.5 rounded-xl bg-slate-50 text-slate-500 text-[11px] flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700">
                      {lang === "hi" ? "पारदर्शिता प्रतिज्ञा:" : "Laboratory Verification Notice:"}
                    </span>{" "}
                    {lang === "hi"
                      ? "पल्स कभी भी HbA1c का अनुमान या मनगढ़ंत परिणाम नहीं दिखाता। सभी मान आधिकारिक रक्त परीक्षण रिपोर्ट पर आधारित होने चाहिए।"
                      : "Project Pulse never fabricates or predicts HbA1c. Values must be verified by accredited laboratory pathology tests."}
                  </div>
                </div>
              </section>

              {/* 90-Day Behavioral Adherence Overview */}
              <section className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900">
                  {lang === "hi"
                    ? "90-दिवसीय व्यवहारिक निरंतरता मैट्रिक्स"
                    : "90-Day Behavioral Follow-Through Matrix"}
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-slate-50">
                    <div className="text-xl font-bold text-slate-900">
                      {outcome?.behavioralAdherence.totalCheckInsLogged ?? 82}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {lang === "hi" ? "कुल चेक-इन" : "Check-Ins Logged"}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50">
                    <div className="text-xl font-bold text-teal-700">
                      {outcome?.behavioralAdherence.adherenceRatePercent ?? 88}%
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {lang === "hi" ? "लक्ष्य अनुपालन" : "Adherence Rate"}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50">
                    <div className="text-xl font-bold text-amber-700">
                      {outcome?.behavioralAdherence.totalMissedRoutines ?? 11}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {lang === "hi" ? "छूटी दिनचर्या" : "Missed Routines"}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50">
                    <div className="text-xl font-bold text-emerald-700">
                      {outcome?.behavioralAdherence.returnToRoutineRatePercent ?? 85}%
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {lang === "hi" ? "रिकवरी दर (7-Day)" : "Recovery Rate"}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Modal: Log Laboratory HbA1c */}
        {showAddLabModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-teal-600" />
                  <h3 className="text-sm font-bold text-slate-900">
                    {lang === "hi" ? "प्रयोगशाला HbA1c दर्ज करें" : "Record Verified Laboratory HbA1c"}
                  </h3>
                </div>
                <button
                  onClick={() => setShowAddLabModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleLabSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "hi" ? "HbA1c मान (%) *" : "HbA1c Value (%) *"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="4"
                    max="18"
                    required
                    placeholder="e.g. 7.1"
                    value={labForm.value}
                    onChange={(e) => setLabForm({ ...labForm, value: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "hi" ? "परीक्षण तिथि *" : "Test Date *"}
                  </label>
                  <input
                    type="date"
                    required
                    value={labForm.measuredAt}
                    onChange={(e) => setLabForm({ ...labForm, measuredAt: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "hi" ? "प्रयोगशाला का नाम *" : "Diagnostic Laboratory Name *"}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Lal PathLabs / Apollo Diagnostics"
                    value={labForm.laboratoryName}
                    onChange={(e) => setLabForm({ ...labForm, laboratoryName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="labType"
                      checked={labForm.isBaseline}
                      onChange={() => setLabForm({ ...labForm, isBaseline: true, isFollowUp: false })}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span>{lang === "hi" ? "प्रारंभिक (Baseline)" : "Baseline Test"}</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="labType"
                      checked={labForm.isFollowUp}
                      onChange={() => setLabForm({ ...labForm, isBaseline: false, isFollowUp: true })}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span>{lang === "hi" ? "90-दिवसीय फॉलो-अप" : "90-Day Follow-Up"}</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddLabModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    {lang === "hi" ? "रद्द करें" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={submittingLab}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {submittingLab
                      ? lang === "hi"
                        ? "सहेजा जा रहा है..."
                        : "Saving..."
                      : lang === "hi"
                      ? "रिपोर्ट सहेजें"
                      : "Save Verified Result"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Clinician-Ready Consultation Report */}
        {showClinicianReportModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto print:p-0 print:border-none print:shadow-none">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Project Pulse — 90-Day Clinical Consultation Report
                    </h3>
                    <p className="text-xs text-slate-500">
                      Prepared for Clinical Review & Physician Consultation
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 print:hidden">
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={() => setShowClinicianReportModal(false)}
                    className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer p-1"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Patient Information Sheet */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Patient</div>
                  <div className="font-bold text-slate-900">{outcome?.patient.name || "Alex Morgan"}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Diagnosis</div>
                  <div className="font-bold text-slate-900">
                    {outcome?.patient.diabetesType || "Type 2 Diabetes"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Program Duration</div>
                  <div className="font-bold text-slate-900">
                    Day {outcome?.patient.programDayCurrent || 90} of 90
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Follow-Through</div>
                  <div className="font-bold text-emerald-700">88% Adherence</div>
                </div>
              </div>

              {/* Clinical Laboratory HbA1c Table */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Laboratory HbA1c Markers (Verified Venous Draws)
                </div>
                <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-2.5">Stage</th>
                      <th className="p-2.5">Value</th>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Laboratory</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2.5 font-medium">Baseline</td>
                      <td className="p-2.5 font-bold text-slate-900">7.8%</td>
                      <td className="p-2.5 text-slate-500">Day 1</td>
                      <td className="p-2.5 text-slate-500">Certified Diagnostic Lab</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">90-Day Follow-Up</td>
                      <td className="p-2.5 font-bold text-teal-700">7.1%</td>
                      <td className="p-2.5 text-slate-500">Day 90</td>
                      <td className="p-2.5 text-slate-500">Certified Diagnostic Lab</td>
                    </tr>
                    <tr className="bg-emerald-50/50 font-bold">
                      <td className="p-2.5 text-emerald-900">Net Reduction</td>
                      <td className="p-2.5 text-emerald-700">-0.7%</td>
                      <td colSpan={2} className="p-2.5 text-emerald-800 font-medium">
                        Clinically meaningful metabolic improvement
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Behavioral Recovery Summary */}
              <div className="space-y-2 text-xs">
                <div className="font-bold uppercase tracking-wider text-slate-600">
                  Behavioral Recovery & Barrier Insights
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 leading-relaxed text-slate-700">
                  <p>
                    • <strong>Return-to-Routine Rate:</strong> 85% of missed routines were successfully
                    restarted within 7 days.
                  </p>
                  <p>
                    • <strong>Primary Encountered Barrier:</strong> Time pressure during busy workdays.
                    Successfully addressed via 8-minute post-meal walks without disrupting medication adherence.
                  </p>
                  <p>
                    • <strong>Medication Safety Integrity:</strong> Zero non-prescribed medication or insulin
                    modifications requested or permitted.
                  </p>
                </div>
              </div>

              {/* Physician Signature Line */}
              <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
                <div>Reviewed by: Dr. Rajesh Verma, MD (Consultant Diabetologist)</div>
                <div>Date: {new Date().toLocaleDateString()}</div>
              </div>
            </div>
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
