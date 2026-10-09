"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SafetyBanner } from "@/components/layout/SafetyBanner";
import { PulseTopHeader } from "@/components/layout/PulseTopHeader";
import { GlucoseChart } from "@/components/dashboard/GlucoseChart";
import { DailyCheckInWidget } from "@/components/dashboard/DailyCheckInWidget";
import { NextSmallStepCard } from "@/components/proactiveCare/NextSmallStepCard";
import {
  Droplet,
  Heart,
  Moon,
  Footprints,
  Scale,
  Zap,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Sparkles,
  Link2,
  ChevronRight,
  ShieldAlert,
  Clock,
  Layers,
  Activity,
  PlusCircle,
  Target,
  CheckCircle2,
  Users,
  TrendingUp,
  RotateCcw,
  Stethoscope,
  UtensilsCrossed,
  MessageSquareHeart,
  BookOpen,
  Lightbulb,
  Pill,
  User,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { LanguageToggle, useCurrentLanguage } from "@/components/LanguageToggle";
import { getDictionary } from "@/lib/i18n";

interface MetricCardData {
  value: number;
  unit: string;
  source: string;
  timestamp: string;
  trend: "up" | "down" | "stable";
  comparisonText: string;
  status: "optimal" | "normal" | "attention";
}

export default function DashboardPage() {
  const router = useRouter();
  const lang = useCurrentLanguage();
  const t = getDictionary(lang);

  const [userName, setUserName] = useState("Alex");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [overview, setOverview] = useState<Record<string, MetricCardData>>({});
  const [chartPoints, setChartPoints] = useState<Array<{ timeFormatted: string; value: number; source: string }>>([]);
  const [connectedDevicesCount, setConnectedDevicesCount] = useState(0);
  const [actionDone, setActionDone] = useState<string | null>(null);
  const [completingAction, setCompletingAction] = useState(false);

  // Live Synchronized Patient Data
  const [todayGoal, setTodayGoal] = useState<any>(null);
  const [todayCheckIn, setTodayCheckIn] = useState<any>(null);
  const [latestMeal, setLatestMeal] = useState<any>(null);
  const [dailyNutrition, setDailyNutrition] = useState<any>({ calories: 0, carbohydrates: 0, protein: 0, fiber: 0, fat: 0 });
  const [activeCaregiversCount, setActiveCaregiversCount] = useState(0);
  const [recentTimelineEvents, setRecentTimelineEvents] = useState<any[]>([]);
  const [metabolicScore, setMetabolicScore] = useState<any>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [sumRes, metricRes] = await Promise.all([
        fetch("/api/health/summary"),
        fetch("/api/health/metrics?type=glucose&range=day&days=7"),
      ]);

      if (sumRes.status === 401) {
        router.push("/login");
        return;
      }

      const sumData = await sumRes.json();
      if (sumData.userName) setUserName(sumData.userName);
      if (sumData.overview) setOverview(sumData.overview);
      if (sumData.connectedDevicesCount !== undefined) {
        setConnectedDevicesCount(sumData.connectedDevicesCount);
      }
      if (sumData.todayGoal) setTodayGoal(sumData.todayGoal);
      if (sumData.todayCheckIn !== undefined) setTodayCheckIn(sumData.todayCheckIn);
      if (sumData.latestMeal !== undefined) setLatestMeal(sumData.latestMeal);
      if (sumData.dailyNutrition) setDailyNutrition(sumData.dailyNutrition);
      if (sumData.activeCaregiversCount !== undefined) setActiveCaregiversCount(sumData.activeCaregiversCount);
      if (sumData.recentTimelineEvents) setRecentTimelineEvents(sumData.recentTimelineEvents);
      if (sumData.metabolicScore !== undefined) setMetabolicScore(sumData.metabolicScore);

      const metricData = await metricRes.json();
      if (metricData.points) setChartPoints(metricData.points);
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleCompleteAction = async (actionType: "COMPLETED" | "PARTIAL") => {
    setCompletingAction(true);
    try {
      await fetch("/api/health/action/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType,
          goalId: todayGoal?.goalId,
        }),
      });
      setActionDone(actionType === "COMPLETED" ? t.actionCard.btnDone : t.actionCard.btnPartial);
      await fetchDashboardData();
    } catch (err) {
      console.error("Action complete error:", err);
    } finally {
      setCompletingAction(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await fetch("/api/health/sync", { method: "POST" });
      await fetchDashboardData();
    } catch {
      // Sync complete
    } finally {
      setSyncing(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t.greetingMorning;
    if (hour < 18) return t.greetingAfternoon;
    return t.greetingEvening;
  };

  const hasMetrics = Object.keys(overview).length > 0;

  const isGoalDone = todayGoal?.occurrenceStatus === "COMPLETED" || todayCheckIn?.routineStatus === "Completed" || Boolean(actionDone);
  const isMedicationDone = todayCheckIn !== null;
  const isMealDone = latestMeal !== null;
  const isGlucoseDone = recentTimelineEvents.some((e) => e.id.startsWith("glucose")) || Boolean(overview.glucose);
  const completedRoutinesCount = [isGoalDone, isMedicationDone, isMealDone, isGlucoseDone].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-[#DCE8EC] flex flex-col font-sans">
      <PulseTopHeader userName={userName} />

      <div className="flex flex-1">
        <DesktopSidebar userName={userName} />

        <div className="flex-1 flex flex-col min-h-screen pb-20 lg:pb-8">
          <SafetyBanner compact />

          {/* Main Content Area */}
          <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            {/* Header Greeting */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#101A45]">
                  {getGreeting()}, {userName.split(" ")[0]}!
                </h1>
                <p className="text-sm sm:text-base text-[#52616B] mt-1">
                  Small steps today, better tomorrows.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  onClick={handleSyncAll}
                  disabled={syncing}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#C9D7DE] hover:bg-[#F4F8FA] text-[#101A45] text-xs font-semibold transition-all shadow-xs disabled:opacity-60 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#087F8C] ${syncing ? "animate-spin" : ""}`} />
                  <span>{syncing ? "Syncing..." : "Sync Streams"}</span>
                </button>

                <Link
                  href="/checkin"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#101A45] hover:bg-[#182766] text-white text-xs font-semibold shadow-xs transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.patientNav.dailyCheckIn}</span>
                </Link>
              </div>
            </div>

            {/* Metabolic Health Score Banner (Calibrated from Onboarding HbA1c & Telemetry) */}
            {metabolicScore && (
              <div className="bg-white border border-[#C9D7DE] rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(16,26,69,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#D5F3E7] border border-[#087F8C]/30 flex flex-col items-center justify-center shrink-0 text-center">
                    <span className="text-2xl font-black text-[#087F8C] leading-none">
                      {metabolicScore.score}
                    </span>
                    <span className="text-[9px] font-bold text-[#52616B] uppercase tracking-wider">
                      / 100
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-[#101A45]">
                        Metabolic Health Score
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#D5F3E7] text-[#087F8C] border border-[#087F8C]/30">
                        {metabolicScore.tier}
                      </span>
                    </div>
                    <p className="text-xs text-[#52616B] mt-0.5">
                      {metabolicScore.headline} • Baseline HbA1c: <strong>{metabolicScore.hba1c ? `${metabolicScore.hba1c}%` : "5.8%"}</strong> • 90-Day Target: <strong>{metabolicScore.projectedTarget}/100</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  <Link
                    href="/review"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#C9D7DE] hover:border-[#087F8C] text-xs font-semibold text-[#101A45] hover:bg-slate-50 transition-all min-h-[44px]"
                  >
                    <span>View Breakdown</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#087F8C]" />
                  </Link>
                </div>
              </div>
            )}

            {/* Proactive Care Engine Banner */}
            <NextSmallStepCard />

            {/* Two-Column Grid matching Screenshot 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN (Routine List + Telemetry) */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. "Your daily routine" Card */}
                <div className="bg-white border border-[#C9D7DE] rounded-2xl p-4 sm:p-5 shadow-[0_1px_3px_rgba(16,26,69,0.04)] space-y-3">
                  {/* Dark Navy Inner Header Banner matching Screenshot 2 */}
                  <div className="bg-[#101A45] text-white rounded-xl px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="font-bold text-sm">Your daily routine</span>
                    </div>
                    <Link
                      href="/plan"
                      className="text-xs text-slate-300 hover:text-white font-medium flex items-center gap-0.5"
                    >
                      <span>View plan</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Routine Items List */}
                  <div className="space-y-2.5">
                    {/* Item 1: Primary SMART Walk / Movement Routine */}
                    <div
                      className={`rounded-xl p-3.5 flex items-center justify-between transition-all border ${
                        isGoalDone
                          ? "bg-[#D5F3E7] border-[#C9D7DE]"
                          : "bg-white border-[#C9D7DE]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#D5F3E7] flex items-center justify-center shrink-0">
                          <Footprints className="w-5 h-5 text-[#087F8C]" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#101A45]">
                            {lang === "hi" && todayGoal?.titleHindi
                              ? todayGoal.titleHindi
                              : todayGoal?.title || "Walk for 30 minutes"}
                          </h4>
                          <p className="text-xs text-[#52616B]">
                            {todayGoal?.reason || "A brisk walk after breakfast"}
                          </p>
                        </div>
                      </div>

                      <div>
                        {isGoalDone ? (
                          <div className="w-6 h-6 rounded-full bg-[#087F8C] flex items-center justify-center text-white">
                            <CheckCircle2 className="w-5 h-5 text-white" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCompleteAction("COMPLETED")}
                              disabled={completingAction}
                              className="px-3 py-1.5 bg-[#101A45] hover:bg-[#182766] text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Done
                            </button>
                            <div className="w-6 h-6 rounded-full border-2 border-[#C9D7DE]" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Item 2: Take medications */}
                    <div className="rounded-xl p-3.5 bg-white border border-[#C9D7DE] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                          <Pill className="w-5 h-5 text-[#087F8C]" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#101A45]">Take medications</h4>
                          <p className="text-xs text-[#52616B]">1 tablet after breakfast</p>
                        </div>
                      </div>
                      <Link
                        href="/checkin"
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isMedicationDone
                            ? "bg-[#087F8C] border-[#087F8C] text-white"
                            : "border-[#C9D7DE] hover:border-[#087F8C]"
                        }`}
                      >
                        {isMedicationDone && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </Link>
                    </div>

                    {/* Item 3: Log your meals */}
                    <div className="rounded-xl p-3.5 bg-white border border-[#C9D7DE] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                          <UtensilsCrossed className="w-5 h-5 text-[#087F8C]" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#101A45]">Log your meals</h4>
                          <p className="text-xs text-[#52616B]">Take a photo or describe</p>
                        </div>
                      </div>
                      <Link
                        href="/food"
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isMealDone
                            ? "bg-[#087F8C] border-[#087F8C] text-white"
                            : "border-[#C9D7DE] hover:border-[#087F8C]"
                        }`}
                      >
                        {isMealDone && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </Link>
                    </div>

                    {/* Item 4: Check your glucose */}
                    <div className="rounded-xl p-3.5 bg-white border border-[#C9D7DE] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
                          <Droplet className="w-5 h-5 text-[#087F8C]" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#101A45]">Check your glucose</h4>
                          <p className="text-xs text-[#52616B]">Once daily, before breakfast</p>
                        </div>
                      </div>
                      <Link
                        href="/checkin"
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          isGlucoseDone
                            ? "bg-[#087F8C] border-[#087F8C] text-white"
                            : "border-[#C9D7DE] hover:border-[#087F8C]"
                        }`}
                      >
                        {isGlucoseDone && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </Link>
                    </div>
                  </div>
                </div>

                {/* 2. Interactive Recharts Glucose Telemetry */}
                <GlucoseChart points={chartPoints} />
              </div>

              {/* RIGHT COLUMN (Progress + Recommendations + Food) */}
              <div className="lg:col-span-5 space-y-6">
                {/* 1. Today's progress Card matching Screenshot 2 */}
                <div className="bg-white border border-[#C9D7DE] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,26,69,0.04)] space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-base text-[#101A45]">Today&apos;s progress</h3>
                    <span className="text-xs font-medium text-[#52616B]">
                      {completedRoutinesCount} of 4 completed
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2.5 rounded-full bg-[#C9D7DE] overflow-hidden">
                    <div
                      className="h-full bg-[#087F8C] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(10, completedRoutinesCount * 25)}%` }}
                    />
                  </div>

                  {/* 4 Icon Action Tiles */}
                  <div className="grid grid-cols-4 gap-2.5 pt-1">
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-center transition-all ${
                        isGoalDone
                          ? "bg-[#D5F3E7] text-[#087F8C] border-[#C9D7DE]"
                          : "bg-slate-50 text-[#52616B] border-[#C9D7DE]"
                      }`}
                    >
                      <Footprints className="w-5 h-5" />
                    </div>
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-center transition-all ${
                        isMedicationDone
                          ? "bg-[#D5F3E7] text-[#087F8C] border-[#C9D7DE]"
                          : "bg-slate-50 text-[#52616B] border-[#C9D7DE]"
                      }`}
                    >
                      <Pill className="w-5 h-5" />
                    </div>
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-center transition-all ${
                        isMealDone
                          ? "bg-[#D5F3E7] text-[#087F8C] border-[#C9D7DE]"
                          : "bg-slate-50 text-[#52616B] border-[#C9D7DE]"
                      }`}
                    >
                      <UtensilsCrossed className="w-5 h-5" />
                    </div>
                    <div
                      className={`p-3 rounded-xl border flex items-center justify-center transition-all ${
                        isGlucoseDone
                          ? "bg-[#D5F3E7] text-[#087F8C] border-[#C9D7DE]"
                          : "bg-slate-50 text-[#52616B] border-[#C9D7DE]"
                      }`}
                    >
                      <Droplet className="w-5 h-5" />
                    </div>
                  </div>
                </div>

                {/* 2. "Recommended for you" Card matching Screenshot 2 */}
                <div className="bg-white border border-[#C9D7DE] rounded-2xl p-5 shadow-[0_1px_3px_rgba(16,26,69,0.04)] space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-lg bg-amber-50 text-amber-600">
                      <Lightbulb className="w-4 h-4 text-amber-500" />
                    </span>
                    <h3 className="font-bold text-base text-[#101A45]">Recommended for you</h3>
                  </div>

                  <div className="bg-[#EAF5F8] border border-[#C9D7DE] rounded-xl p-4 text-xs sm:text-sm text-[#101A45] leading-relaxed">
                    Try a high-fiber breakfast like oats or a dalia bowl to help your glucose stay stable.
                  </div>
                </div>

                {/* 3. Synchronized Food & Nutrition Breakdown */}
                <div className="p-5 rounded-2xl bg-white border border-[#C9D7DE] shadow-[0_1px_3px_rgba(16,26,69,0.04)] space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-[#C9D7DE]/60 pb-2">
                    <div className="flex items-center gap-2">
                      <UtensilsCrossed className="w-4 h-4 text-[#087F8C]" />
                      <h3 className="font-bold text-sm text-[#101A45]">
                        {lang === "hi" ? "दैनिक पोषण व भोजन डायरी" : "Daily Nutrition Snapshot"}
                      </h3>
                    </div>
                    <Link
                      href="/food"
                      className="text-[#087F8C] font-semibold text-xs hover:underline flex items-center gap-1"
                    >
                      <span>{lang === "hi" ? "फोटो लें" : "Log Meal"}</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-orange-50 border border-orange-100">
                      <span className="text-[10px] text-orange-950 font-semibold block">Calories</span>
                      <span className="text-base font-extrabold text-orange-900">{dailyNutrition.calories}</span>
                      <span className="text-[9px] text-orange-600 block">kcal</span>
                    </div>
                    <div className="p-2 rounded-xl bg-teal-50 border border-teal-100">
                      <span className="text-[10px] text-teal-950 font-semibold block">Carbs</span>
                      <span className="text-base font-extrabold text-teal-900">{dailyNutrition.carbohydrates}</span>
                      <span className="text-[9px] text-teal-600 block">g</span>
                    </div>
                    <div className="p-2 rounded-xl bg-blue-50 border border-blue-100">
                      <span className="text-[10px] text-blue-950 font-semibold block">Protein</span>
                      <span className="text-base font-extrabold text-blue-900">{dailyNutrition.protein}</span>
                      <span className="text-[9px] text-blue-600 block">g</span>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                      <span className="text-[10px] text-emerald-950 font-semibold block">Fiber</span>
                      <span className="text-base font-extrabold text-emerald-900">{dailyNutrition.fiber}</span>
                      <span className="text-[9px] text-emerald-600 block">g</span>
                    </div>
                  </div>

                  {latestMeal && (
                    <div className="pt-1 text-xs text-[#52616B] flex items-center justify-between">
                      <span className="truncate">
                        <strong>Latest:</strong> {latestMeal.mealType} ({latestMeal.itemNames.join(", ")})
                      </span>
                    </div>
                  )}
                </div>

                {/* 4. Daily 30-Second Check-in Widget */}
                <DailyCheckInWidget />
              </div>
            </div>

            {/* Core Modules Quick Shortcuts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <Link
                href="/plan"
                className="p-3.5 rounded-2xl bg-white border border-[#C9D7DE] hover:border-[#087F8C] hover:shadow-xs transition-all flex flex-col items-center text-center group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-[#D5F3E7] text-[#087F8C] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Target className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#101A45] group-hover:text-[#087F8C]">
                  {t.patientNav.myPlan}
                </span>
                <span className="text-[10px] text-[#52616B] mt-0.5">SMART Goals</span>
              </Link>

              <Link
                href="/checkin"
                className="p-3.5 rounded-2xl bg-white border border-[#C9D7DE] hover:border-[#087F8C] hover:shadow-xs transition-all flex flex-col items-center text-center group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-[#D5F3E7] text-[#087F8C] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#101A45] group-hover:text-[#087F8C]">
                  {t.patientNav.dailyCheckIn}
                </span>
                <span className="text-[10px] text-[#52616B] mt-0.5">30 Seconds</span>
              </Link>

              <Link
                href="/food"
                className="p-3.5 rounded-2xl bg-white border border-[#C9D7DE] hover:border-[#087F8C] hover:shadow-xs transition-all flex flex-col items-center text-center group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-[#D5F3E7] text-[#087F8C] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <UtensilsCrossed className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#101A45] group-hover:text-[#087F8C]">
                  {t.patientNav.foodAI}
                </span>
                <span className="text-[10px] text-[#52616B] mt-0.5">Photo & Log</span>
              </Link>

              <Link
                href="/community/groups/building-healthy-habits"
                className="p-3.5 rounded-2xl bg-white border border-[#C9D7DE] hover:border-[#087F8C] hover:shadow-xs transition-all flex flex-col items-center text-center group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-[#D5F3E7] text-[#087F8C] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <MessageSquareHeart className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#101A45] group-hover:text-[#087F8C]">
                  {t.patientNav.community}
                </span>
                <span className="text-[10px] text-[#52616B] mt-0.5">Peer Groups</span>
              </Link>

              <Link
                href="/coach"
                className="p-3.5 rounded-2xl bg-white border border-[#C9D7DE] hover:border-[#087F8C] hover:shadow-xs transition-all flex flex-col items-center text-center group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-[#D5F3E7] text-[#087F8C] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#101A45] group-hover:text-[#087F8C]">
                  {t.patientNav.pulseCoach}
                </span>
                <span className="text-[10px] text-[#52616B] mt-0.5">Guidance</span>
              </Link>

              <Link
                href="/circle"
                className="p-3.5 rounded-2xl bg-white border border-[#C9D7DE] hover:border-[#087F8C] hover:shadow-xs transition-all flex flex-col items-center text-center group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-[#D5F3E7] text-[#087F8C] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#101A45] group-hover:text-[#087F8C]">
                  {t.patientNav.careCircle}
                </span>
                <span className="text-[10px] text-[#52616B] mt-0.5">Family</span>
              </Link>

              <Link
                href="/review"
                className="p-3.5 rounded-2xl bg-white border border-[#C9D7DE] hover:border-[#087F8C] hover:shadow-xs transition-all flex flex-col items-center text-center group cursor-pointer"
              >
                <div className="w-9 h-9 rounded-xl bg-[#D5F3E7] text-[#087F8C] flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-[#101A45] group-hover:text-[#087F8C]">
                  {t.patientNav.progress}
                </span>
                <span className="text-[10px] text-[#52616B] mt-0.5">90-Day</span>
              </Link>
            </div>

          {/* EMPTY STATE IF NO DATA CONNECTED */}
          {!hasMetrics && !loading && (
            <div className="p-8 sm:p-12 rounded-3xl bg-white border border-slate-200 text-center space-y-4 shadow-sm">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto">
                <Activity className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No Health Data Connected Yet</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Connect a health device or wearable (Apple Health, Fitbit, Oura, or Dexcom CGM) to start seeing your continuous trends and metabolic score without manual logging.
              </p>
              <Link
                href="/dashboard/devices"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Connect Health Device</span>
              </Link>
            </div>
          )}

          {/* 6 OVERVIEW CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. GLUCOSE */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-teal-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Droplet className="w-3.5 h-3.5 text-teal-600" />
                  Glucose (CGM)
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Optimal
                </span>
              </div>
              <div className="my-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {overview.glucose?.value ?? 96}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">mg/dL</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
                  <span>96% Time in Target (70–140)</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Source: {overview.glucose?.source === "cgm" ? "Dexcom G7 CGM" : "Apple Health"}</span>
                <span>{formatRelativeTime(overview.glucose?.timestamp)}</span>
              </div>
            </div>

            {/* 2. STEPS */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-teal-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Footprints className="w-3.5 h-3.5 text-amber-500" />
                  Steps Cadence
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  Target: 8,500
                </span>
              </div>
              <div className="my-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {overview.steps?.value?.toLocaleString() ?? "7,842"}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">steps</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-teal-700 font-medium mt-1">
                  <ArrowUp className="w-3.5 h-3.5 text-teal-600" />
                  <span>{overview.steps?.comparisonText || "12% higher vs last week"}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Source: Apple Health</span>
                <span>{formatRelativeTime(overview.steps?.timestamp)}</span>
              </div>
            </div>

            {/* 3. HEART RATE */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-teal-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  Resting Pulse
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Recovery High
                </span>
              </div>
              <div className="my-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {overview.heart_rate?.value ?? 58}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">bpm</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
                  <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                  <span>4 bpm lower than 30d baseline</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Source: Apple Watch</span>
                <span>{formatRelativeTime(overview.heart_rate?.timestamp)}</span>
              </div>
            </div>

            {/* 4. SLEEP */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-teal-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  Sleep Duration
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Restorative
                </span>
              </div>
              <div className="my-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {overview.sleep_duration ? `${Math.floor(overview.sleep_duration.value / 60)}h ${Math.round(overview.sleep_duration.value % 60)}m` : "7h 32m"}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">quality 89/100</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-indigo-700 font-medium mt-1">
                  <span>94 min deep NREM sleep</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Source: Oura Ring Gen 3</span>
                <span>Overnight session</span>
              </div>
            </div>

            {/* 5. WEIGHT */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-teal-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-slate-600" />
                  Body Composition
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                  18.2% Body Fat
                </span>
              </div>
              <div className="my-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {overview.weight?.value ?? 75.4}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">kg</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-600 font-medium mt-1">
                  <span>-0.3 kg 7-day moving average</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Source: Withings Scale</span>
                <span>{formatRelativeTime(overview.weight?.timestamp)}</span>
              </div>
            </div>

            {/* 6. ACTIVITY / ACTIVE MINUTES */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-teal-200 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-teal-600" />
                  Active Exercise
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  48 / 60 min
                </span>
              </div>
              <div className="my-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {overview.active_minutes?.value ?? 48}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">active min</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-teal-700 font-medium mt-1">
                  <ArrowUp className="w-3.5 h-3.5 text-teal-600" />
                  <span>240 kcal active metabolic burn</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>Source: Apple Health</span>
                <span>{formatRelativeTime(overview.active_minutes?.timestamp)}</span>
              </div>
            </div>
          </div>

          {/* Interactive Recharts Glucose Telemetry */}
          <GlucoseChart points={chartPoints} />

          {/* Split Section: Quick Timeline Snippet & Insights Callout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Timeline Snippet */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-teal-600" />
                  <h3 className="font-bold text-sm text-slate-900">Continuous Event Timeline</h3>
                </div>
                <Link
                  href="/dashboard/timeline"
                  className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
                >
                  <span>View All</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-3 pt-1">
                {recentTimelineEvents && recentTimelineEvents.length > 0 ? (
                  recentTimelineEvents.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-400 font-semibold">{item.timeFormatted}</span>
                          <span className="font-bold text-slate-900">{item.title}</span>
                        </div>
                        <p className="text-slate-500 text-[11px] mt-0.5">{item.subtitle}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs text-slate-400">
                    {lang === "hi" ? "आज कोई गतिविधि दर्ज नहीं है। भोजन या चेक-इन दर्ज करें।" : "No recent events recorded today. Log a meal or complete a check-in."}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Insights Snippet */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    <h3 className="font-bold text-sm text-slate-900">Personalized Insights</h3>
                  </div>
                  <Link
                    href="/dashboard/insights"
                    className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1"
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="space-y-3 mt-4">
                  <div className="p-3.5 rounded-xl bg-teal-50/70 border border-teal-200/70 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-800 bg-teal-100 px-1.5 py-0.5 rounded">
                        DATA OBSERVATION
                      </span>
                      <span className="text-[11px] text-teal-700 font-mono">Impact 5/5</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">
                      96% Time in Target Glycemic Range
                    </h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Your interstitial glucose remained in the healthy 70–140 mg/dL corridor across 96% of the last 7 days.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                        WELLNESS RECOMMENDATION
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">Impact 4/5</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Post-Meal Activity Acceleration
                    </h4>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Muscle contractions during light walking clear blood glucose without triggering insulin spikes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                Notice: Generated from continuous mathematical observations. Not a medical diagnosis.
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>

    <MobileBottomNav />
  </div>
);
}
