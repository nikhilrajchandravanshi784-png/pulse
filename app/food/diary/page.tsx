"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Flame,
  Wheat,
  Dumbbell,
  Leaf,
  Camera,
  Edit2,
  Trash2,
  Plus,
  BarChart3,
  Info,
  AlertCircle,
  FlaskConical,
  UtensilsCrossed,
  Sparkles,
} from "lucide-react";
import { MealCoachSection } from "@/components/mealCoach/MealCoachSection";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PulseTopHeader } from "@/components/layout/PulseTopHeader";
import { SafetyBanner } from "@/components/layout/SafetyBanner";

// ─── Types ─────────────────────────────────────────────────────────────────

interface FoodLogItem {
  id: string;
  foodName: string;
  foodNameHi?: string;
  quantity: number;
  quantityUnit: string;
  calories?: number;
  carbohydrates?: number;
  protein?: number;
  fat?: number;
  fiber?: number;
  nutritionSource?: string;
  estimationNotes?: string;
  patientConfirmed: boolean;
}

interface FoodLog {
  id: string;
  mealType: string;
  mealTime: string;
  status: string;
  notes?: string;
  hasPhoto: boolean;
  isDemo: boolean;
  analysisNotes?: string;
  imageRef?: string;
  items: FoodLogItem[];
  totals: {
    calories: number;
    carbohydrates: number;
    protein: number;
    fat: number;
    fiber: number;
  };
}

interface NutritionSummary {
  loggedCalories: number;
  loggedCarbohydrates: number;
  loggedProtein: number;
  loggedFat: number;
  loggedFiber: number;
  mealsLogged: number;
  completenessStatus: string;
}

const MEAL_ORDER = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};
const MEAL_EMOJI: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🥜",
};

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function NutritionBar({ label, value, max, color, unit }: {
  label: string; value: number; max: number; color: string; unit: string;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="text-slate-500">{Math.round(value * 10) / 10} {unit}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function FoodDiaryPage() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [summary, setSummary] = useState<NutritionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(true);
  const [expandedCoachLogId, setExpandedCoachLogId] = useState<string | null>(null);

  const dateStr = formatDate(selectedDate);

  const fetchDiary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [diaryRes, summaryRes] = await Promise.all([
        fetch(`/api/food/diary?date=${dateStr}`),
        fetch(`/api/food/nutrition-summary?date=${dateStr}`),
      ]);
      const diaryData = await diaryRes.json() as { logs?: FoodLog[]; error?: string };
      const summaryData = await summaryRes.json() as {
        summary?: NutritionSummary;
        disclaimer?: string;
        error?: string;
      };

      if (!diaryRes.ok) setError(diaryData.error ?? "Failed to load diary.");
      else setLogs(diaryData.logs ?? []);

      if (summaryRes.ok && summaryData.summary) setSummary(summaryData.summary);
    } catch {
      setError("Could not load your food diary. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  useEffect(() => {
    fetchDiary();
  }, [fetchDiary]);

  const handleDelete = async (logId: string) => {
    if (!confirm("Remove this meal from your diary?")) return;
    setDeletingId(logId);
    try {
      await fetch(`/api/food/diary/${logId}`, { method: "DELETE" });
      await fetchDiary();
    } finally {
      setDeletingId(null);
    }
  };

  const prevDay = () => setSelectedDate((d) => new Date(d.getTime() - 86400000));
  const nextDay = () => setSelectedDate((d) => new Date(d.getTime() + 86400000));
  const isToday = formatDate(new Date()) === dateStr;

  const groupedLogs = MEAL_ORDER.map((mealType) => ({
    mealType,
    logs: logs.filter((l) => l.mealType === mealType),
  }));

  const totalCalories = summary?.loggedCalories ?? 0;

  return (
    <div className="min-h-screen bg-[#DCE8EC] text-[#101A45] flex flex-col lg:flex-row font-sans">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col min-h-screen pb-20 lg:pb-8">
        <PulseTopHeader activeTab="Track" />
        <SafetyBanner compact />

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4 w-full">
          {/* Header */}
          <div className="bg-white rounded-2xl border border-[#C9D7DE] p-4 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-sm font-bold text-slate-900">Food Diary</h1>
            <p className="text-[10px] text-slate-400">
              Estimated nutrition from logged meals only
            </p>
          </div>
          <button
            onClick={() => router.push("/food")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white rounded-xl text-xs font-bold"
          >
            <Camera className="w-3.5 h-3.5" /> Log Meal
          </button>
        </div>

        {/* Date navigator */}
        <div className="max-w-2xl mx-auto px-4 pb-3 flex items-center justify-between">
          <button onClick={prevDay} className="p-1.5 rounded-lg hover:bg-slate-100">
            <ChevronLeft className="w-4 h-4 text-slate-500" />
          </button>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-900">
              {isToday ? "Today" : selectedDate.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
            </p>
            <p className="text-[10px] text-slate-400">{dateStr}</p>
          </div>
          <button onClick={nextDay} disabled={isToday} className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30">
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* ─── Daily Summary Card ─────────────────────────────────────── */}
        {summary && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => setShowSummary(!showSummary)}
              className="w-full px-4 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-teal-600" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-900">Daily Nutrition Estimate</p>
                  <p className="text-[10px] text-slate-400">
                    {summary.mealsLogged} meal{summary.mealsLogged !== 1 ? "s" : ""} logged · estimates only
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-lg font-bold text-teal-700">{Math.round(totalCalories)}</span>
                  <span className="text-xs text-slate-400"> kcal</span>
                </div>
                <span className="text-slate-400 text-xs">{showSummary ? "▲" : "▼"}</span>
              </div>
            </button>

            {showSummary && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">
                {/* Nutrient bars */}
                <div className="space-y-3">
                  <NutritionBar label="Carbohydrates" value={summary.loggedCarbohydrates} max={300} color="bg-amber-400" unit="g" />
                  <NutritionBar label="Protein" value={summary.loggedProtein} max={80} color="bg-blue-400" unit="g" />
                  <NutritionBar label="Fiber" value={summary.loggedFiber} max={30} color="bg-green-400" unit="g" />
                  <NutritionBar label="Fat" value={summary.loggedFat} max={70} color="bg-rose-300" unit="g" />
                </div>

                {/* Disclaimer */}
                <div className="flex items-start gap-1.5 text-[10px] text-slate-400 bg-slate-50 rounded-lg p-2">
                  <Info className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>
                    Estimates cover logged meals only. Unlogged meals are <strong>not</strong> counted as zero.
                    Values are approximate and should not be used for clinical decisions.
                    {summary.completenessStatus === "PARTIAL" && " Some meals may be missing."}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Loading state ──────────────────────────────────────────── */}
        {loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading diary...</p>
          </div>
        )}

        {/* ─── Meal groups ─────────────────────────────────────────────── */}
        {!loading && groupedLogs.map(({ mealType, logs: mealLogs }) => (
          <div key={mealType} className="space-y-2">
            {/* Meal type header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5">
                <span className="text-base">{MEAL_EMOJI[mealType]}</span>
                <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {MEAL_LABELS[mealType]}
                </h2>
              </div>
              <button
                onClick={() => router.push(`/food?mealType=${mealType}`)}
                className="flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-800 font-medium"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            {mealLogs.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-slate-200 p-4 text-center">
                <p className="text-xs text-slate-400">No {MEAL_LABELS[mealType].toLowerCase()} logged yet</p>
              </div>
            ) : (
              mealLogs.map((log) => (
                <div key={log.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  {/* Meal header */}
                  <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {log.hasPhoto && (
                        <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Camera className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-semibold text-slate-900">
                          {new Date(log.mealTime).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {log.isDemo && (
                          <div className="flex items-center gap-1">
                            <FlaskConical className="w-2.5 h-2.5 text-amber-500" />
                            <span className="text-[9px] text-amber-600 font-semibold">Demo data</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-teal-700">
                        ~{Math.round(log.totals.calories)} kcal
                      </span>
                      <button
                        onClick={() => router.push(`/food?duplicate=${log.id}`)}
                        title="Duplicate"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(log.id)}
                        disabled={deletingId === log.id}
                        title="Delete meal"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Food items */}
                  <div className="px-4 pb-3 space-y-1.5">
                    {log.items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <div className="min-w-0">
                          <span className="font-medium text-slate-800">{item.foodName}</span>
                          {item.foodNameHi && (
                            <span className="text-slate-400 ml-1 text-[10px]">({item.foodNameHi})</span>
                          )}
                          <span className="text-slate-400 ml-1">
                            · {item.quantity} {item.quantityUnit}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          {item.calories != null && (
                            <span className="text-slate-500">{Math.round(item.calories)} kcal</span>
                          )}
                          {item.carbohydrates != null && (
                            <span className="text-amber-600">{Math.round(item.carbohydrates)}g C</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Totals strip */}
                  <div className="border-t border-slate-100 px-4 py-2 flex gap-3">
                    {[
                      { icon: Flame, value: log.totals.calories, unit: "kcal", color: "text-orange-600" },
                      { icon: Wheat, value: log.totals.carbohydrates, unit: "g C", color: "text-amber-600" },
                      { icon: Dumbbell, value: log.totals.protein, unit: "g P", color: "text-blue-600" },
                      { icon: Leaf, value: log.totals.fiber, unit: "g F", color: "text-green-600" },
                    ].map(({ icon: Icon, value, unit, color }) => (
                      <div key={unit} className={`flex items-center gap-1 text-[11px] font-semibold ${color}`}>
                        <Icon className="w-3 h-3" />
                        <span>{Math.round(value * 10) / 10}{unit}</span>
                      </div>
                    ))}
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">~estimate</span>
                      <button
                        onClick={() => setExpandedCoachLogId(expandedCoachLogId === log.id ? null : log.id)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 transition-colors ${
                          expandedCoachLogId === log.id
                            ? "bg-teal-600 text-white"
                            : "bg-teal-50 text-teal-800 hover:bg-teal-100"
                        }`}
                      >
                        <Sparkles className="w-2.5 h-2.5" />
                        <span>Coach Ideas</span>
                      </button>
                    </div>
                  </div>

                  {/* Collapsible Meal Coach Section */}
                  {expandedCoachLogId === log.id && (
                    <div className="p-3 border-t border-slate-100 bg-slate-50/50">
                      <MealCoachSection
                        foodLogId={log.id}
                        mealType={log.mealType}
                        items={log.items.map((i) => ({
                          foodName: i.foodName,
                          foodNameHi: i.foodNameHi,
                          quantity: i.quantity,
                          quantityUnit: i.quantityUnit,
                          calories: i.calories,
                          carbohydrates: i.carbohydrates,
                        }))}
                        compact
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        ))}

        {/* Empty state */}
        {!loading && logs.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-50 flex items-center justify-center">
              <UtensilsCrossed className="w-7 h-7 text-teal-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">No meals logged {isToday ? "today" : "on this day"}</p>
              <p className="text-xs text-slate-400 mt-1">
                Take a photo or log your food manually.
              </p>
            </div>
            <button
              onClick={() => router.push("/food")}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl text-xs font-bold"
            >
              <Camera className="w-3.5 h-3.5" /> Log Meal
            </button>
          </div>
        )}

        {/* Educational insight */}
        {!loading && logs.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-emerald-900">📚 Food & Nutrition Notes</p>
            <ul className="space-y-1.5 text-[11px] text-emerald-800 list-disc list-inside">
              <li>Portion size significantly affects nutrition estimates. Adjust quantities if your serving differs.</li>
              <li>For composite dishes (curries, dals), recipe and oil amount can substantially change actual values.</li>
              <li>These estimates are not laboratory-measured. For clinical nutrition planning, consult your dietitian.</li>
            </ul>
          </div>
        )}
        </div>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
