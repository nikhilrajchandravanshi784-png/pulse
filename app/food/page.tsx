"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Camera,
  Upload,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Trash2,
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  UtensilsCrossed,
  Flame,
  Wheat,
  Dumbbell,
  Leaf,
  ArrowLeft,
  ChevronLeft,
  BookOpen,
  FlaskConical,
} from "lucide-react";
import { SafetyBanner } from "@/components/layout/SafetyBanner";
import { PulseTopHeader } from "@/components/layout/PulseTopHeader";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { MealCoachSection } from "@/components/mealCoach/MealCoachSection";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NutritionInfo {
  calories?: number;
  carbohydrates?: number;
  protein?: number;
  fat?: number;
  fiber?: number;
  nutritionSource?: string;
  estimationNotes?: string;
  nutritionFoodId?: string;
}

interface FoodItem {
  id: string;
  candidateFoodName: string;
  candidateFoodNameHi?: string;
  alternativeName?: string;
  estimatedPortion: number;
  estimatedPortionUnit: string;
  estimatedMassGrams?: number;
  confidenceScore?: number;
  uncertaintyNotes?: string;
  ambiguityNote?: string;
  suggestionOptions?: string[];
  nutrition?: NutritionInfo;
  nutritionRecord?: {
    id: string;
    canonicalName: string;
    canonicalNameHi?: string;
    portionConversions?: Array<{ unit: string; grams: number }>;
    estimationNotes?: string;
  };
  // Patient edits
  isEditing?: boolean;
  isRemoved?: boolean;
  patientCorrected?: boolean;
  editedName?: string;
  editedPortion?: number;
  editedPortionUnit?: string;
}

type Step = "upload" | "analyzing" | "review" | "saving" | "success";
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ConfidenceBadge({ score }: { score?: number }) {
  if (score == null) return null;
  const pct = Math.round(score * 100);
  const color =
    score >= 0.75 ? "bg-emerald-100 text-emerald-800" :
    score >= 0.5 ? "bg-amber-100 text-amber-800" :
    "bg-rose-100 text-rose-800";
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${color}`}>
      {pct}% confidence
    </span>
  );
}

function NutrientPill({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value?: number;
  unit: string;
  color: string;
}) {
  return (
    <div className={`flex flex-col items-center p-2 rounded-xl ${color} min-w-[56px]`}>
      <Icon className="w-3.5 h-3.5 mb-0.5 opacity-70" />
      <span className="text-[11px] font-bold">
        {value != null ? `${Math.round(value * 10) / 10}${unit}` : "—"}
      </span>
      <span className="text-[9px] opacity-70">{label}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FoodAIPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [mealType, setMealType] = useState<string>("Lunch");
  const [mealDescription, setMealDescription] = useState("");
  const [cuisineType, setCuisineType] = useState("");
  const [portionContext, setPortionContext] = useState("");
  const [loadingMsg, setLoadingMsg] = useState("");

  // Analysis state
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(true);
  const [analysisNotes, setAnalysisNotes] = useState<string | null>(null);
  const [items, setItems] = useState<FoodItem[]>([]);

  // Search state for adding foods
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ id: string; canonicalName: string; canonicalNameHi?: string; portionConversions?: Array<{ unit: string; grams: number }> }>
  >([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Success state
  const [savedLogId, setSavedLogId] = useState<string | null>(null);

  // Reference UI screenshot states
  const [selectedDay, setSelectedDay] = useState("Thu 9");
  const [curdAdded, setCurdAdded] = useState(false);
  const [curdDismissed, setCurdDismissed] = useState(false);

  const handleApplyCurd = () => {
    setCurdAdded(true);
    setItems((prev) => [
      ...prev,
      {
        id: `curd-${Date.now()}`,
        candidateFoodName: "Low-fat Curd (Dahi)",
        candidateFoodNameHi: "कम वसा वाला दही",
        estimatedPortion: 1,
        estimatedPortionUnit: "cup (150g)",
        estimatedMassGrams: 150,
        confidenceScore: 0.95,
        nutrition: {
          calories: 90,
          carbohydrates: 7,
          protein: 6,
          fat: 3,
          fiber: 0,
        },
        patientCorrected: true,
      },
    ]);
  };

  // ─── Image handling ─────────────────────────────────────────────────────────

  const handleImageSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a JPEG, PNG, or WebP image.");
      return;
    }
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreviewUrl(url);
    setError(null);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageSelect(file);
  };

  const handleRetake = () => {
    setImageFile(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
    setItems([]);
    setAnalysisId(null);
    setError(null);
    setStep("upload");
  };

  // ─── Analyze ────────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!imageFile) {
      setError("Please select a meal photo first.");
      return;
    }

    setStep("analyzing");
    setError(null);

    const MESSAGES = [
      "Looking at your meal...",
      "Identifying possible foods...",
      "Estimating nutrition...",
    ];
    let msgIdx = 0;
    setLoadingMsg(MESSAGES[0]);
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % MESSAGES.length;
      setLoadingMsg(MESSAGES[msgIdx]);
    }, 1800);

    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("mealType", mealType.toLowerCase());
      if (mealDescription) formData.append("mealDescription", mealDescription);
      if (cuisineType) formData.append("cuisineType", cuisineType);
      if (portionContext) formData.append("portionContext", portionContext);

      const res = await fetch("/api/food/analyze", {
        method: "POST",
        body: formData,
      });
      const data = await res.json() as {
        success?: boolean;
        analysisId?: string;
        isDemo?: boolean;
        analysisNotes?: string;
        items?: FoodItem[];
        error?: string;
        canProceedManually?: boolean;
      };

      if (!res.ok || (!data.success && !data.canProceedManually)) {
        setError(data.error ?? "Analysis failed. You can add foods manually.");
        setStep("upload");
        return;
      }

      setAnalysisId(data.analysisId ?? null);
      setIsDemo(data.isDemo ?? true);
      setAnalysisNotes(data.analysisNotes ?? null);
      setItems(
        (data.items ?? []).map((item) => ({
          ...item,
          isEditing: false,
          isRemoved: false,
          patientCorrected: false,
          editedName: item.candidateFoodName,
          editedPortion: item.estimatedPortion ?? 1,
          editedPortionUnit: item.estimatedPortionUnit ?? "grams",
        }))
      );
      setStep("review");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setStep("upload");
    } finally {
      clearInterval(msgInterval);
    }
  };

  // ─── Item editing ────────────────────────────────────────────────────────────

  const updateItem = (id: string, updates: Partial<FoodItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, isRemoved: true } : item)));
  };

  // ─── Food search ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/food/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json() as { results?: typeof searchResults };
        setSearchResults(data.results ?? []);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addSearchedFood = (food: typeof searchResults[0]) => {
    const newItem: FoodItem = {
      id: `manual-${Date.now()}`,
      candidateFoodName: food.canonicalName,
      candidateFoodNameHi: food.canonicalNameHi,
      estimatedPortion: 1,
      estimatedPortionUnit: food.portionConversions?.[0]?.unit ?? "katori",
      editedName: food.canonicalName,
      editedPortion: 1,
      editedPortionUnit: food.portionConversions?.[0]?.unit ?? "katori",
      nutritionRecord: { ...food },
      patientCorrected: true,
    };
    setItems((prev) => [...prev, newItem]);
    setSearchQuery("");
    setSearchResults([]);
    setShowSearch(false);
  };

  // ─── Save meal ───────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const activeItems = items.filter((i) => !i.isRemoved);
    if (activeItems.length === 0) {
      setError("Please add at least one food item before saving.");
      return;
    }

    setStep("saving");
    setError(null);

    try {
      const payload = {
        analysisId,
        mealType: mealType.toLowerCase(),
        mealTime: new Date().toISOString(),
        items: activeItems.map((item) => ({
          recognizedItemId: item.id.startsWith("manual-") ? undefined : item.id,
          foodName: item.editedName ?? item.candidateFoodName,
          foodNameHi: item.candidateFoodNameHi,
          quantity: item.editedPortion ?? item.estimatedPortion ?? 1,
          quantityUnit: item.editedPortionUnit ?? item.estimatedPortionUnit ?? "grams",
          nutritionFoodId: item.nutritionRecord?.id,
          patientCorrected: item.patientCorrected ?? false,
        })),
      };

      const res = await fetch("/api/food/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as { success?: boolean; foodLogId?: string; error?: string };

      if (!res.ok || !data.success) {
        setError(data.error ?? "Could not save meal. Please try again.");
        setStep("review");
        return;
      }

      setSavedLogId(data.foodLogId ?? null);
      setStep("success");
    } catch {
      setError("Network error. Please try again.");
      setStep("review");
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  const activeItems = items.filter((i) => !i.isRemoved);
  const totalCal = activeItems.reduce((s, i) => s + (i.nutrition?.calories ?? 0), 0);
  const totalProtein = activeItems.reduce((s, i) => s + (i.nutrition?.protein ?? 0), 0);
  const totalFat = activeItems.reduce((s, i) => s + (i.nutrition?.fat ?? 0), 0);
  const totalCarbs = activeItems.reduce((s, i) => s + (i.nutrition?.carbohydrates ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#DCE8EC] text-[#101A45] flex flex-col lg:flex-row font-sans">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col min-h-screen pb-20 lg:pb-8">
        <PulseTopHeader activeTab="Track" />
        <SafetyBanner compact />

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5 w-full">
        {/* Date Selector Row matching Screenshot 3 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button className="p-1 rounded-full hover:bg-white/60 text-[#101A45] transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-bold text-[#101A45] text-sm">Today, 9 Oct 2025</span>
            <button className="p-1 rounded-full hover:bg-white/60 text-[#101A45] transition-colors">
              <ChevronDown className="w-4 h-4 -rotate-90" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { day: "Sun", date: "5" },
              { day: "Mon", date: "6" },
              { day: "Tue", date: "7" },
              { day: "Wed", date: "8" },
              { day: "Thu", date: "9", active: true },
              { day: "Fri", date: "10" },
              { day: "Sat", date: "11" },
            ].map((d) => {
              const isSelected = selectedDay === `${d.day} ${d.date}`;
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setSelectedDay(`${d.day} ${d.date}`)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                    isSelected
                      ? "bg-[#101A45] text-white shadow-xs"
                      : "bg-white/80 hover:bg-white text-[#52616B] border border-[#C9D7DE]"
                  }`}
                >
                  <span className="block text-[10px] opacity-80">{d.day}</span>
                  <span className="block font-bold">{d.date}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick check-in glucose card matching Screenshot 3 */}
        <div className="bg-white rounded-2xl border border-[#C9D7DE] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#52616B] uppercase tracking-wider">Quick check-in</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#D5F3E7] text-[#087F8C]">
                ✓ In range
              </span>
            </div>
            <div className="text-lg font-black text-[#101A45]">
              Glucose: 118 mg/dL
            </div>
            <p className="text-xs text-[#52616B]">
              Fasting glucose logged at 8:15 AM · Well within your target of 70–130 mg/dL
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/checkin")}
            className="px-4 py-2 rounded-xl border border-[#C9D7DE] text-xs font-bold text-[#101A45] hover:bg-slate-50 transition-colors self-start sm:self-center cursor-pointer"
          >
            Update reading →
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-[#FCE7EB] border border-rose-200 rounded-xl text-xs text-[#B4233B]">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* ═══════════════ STEP: UPLOAD ═══════════════ */}
        {step === "upload" && (
          <div className="space-y-4">
            {/* Demo mode banner */}
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <FlaskConical className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                <strong>Demo Mode</strong> — Sample food recognition results will be shown.
                Configure <code className="font-mono text-[10px]">FOOD_AI_PROVIDER=gemini</code> for live AI analysis.
              </span>
            </div>

            {/* Image upload zone */}
            {!imagePreviewUrl ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Take a photo of your meal to understand what is on your plate.
                  </p>
                  <p className="text-xs text-slate-400 mt-1">JPEG, PNG, or WebP · Max 8 MB</p>
                </div>
                <div className="flex flex-wrap gap-2.5 sm:gap-3 justify-center">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#087F8C] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#066570] transition-colors min-h-[44px]"
                  >
                    <Camera className="w-4 h-4" /> Take Photo
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-[#101A45] rounded-xl text-xs font-semibold hover:bg-slate-200 transition-colors min-h-[44px]"
                  >
                    <Upload className="w-4 h-4" /> Upload
                  </button>
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setItems([
                        {
                          id: `manual-${Date.now()}`,
                          candidateFoodName: "Roti",
                          candidateFoodNameHi: "रोटी",
                          estimatedPortion: 2,
                          estimatedPortionUnit: "piece",
                          estimatedMassGrams: 60,
                          nutrition: {
                            calories: 178,
                            carbohydrates: 36,
                            protein: 6.2,
                            fat: 1.1,
                            fiber: 4.6,
                          },
                          patientCorrected: true,
                        },
                      ]);
                      setStep("review");
                    }}
                    className="text-xs text-teal-700 hover:text-teal-900 font-semibold underline"
                  >
                    Or enter meal items manually →
                  </button>
                </div>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreviewUrl}
                  alt="Meal preview"
                  className="w-full max-h-72 object-cover"
                />
                <div className="p-3 flex gap-2">
                  <button
                    onClick={handleRetake}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retake
                  </button>
                  <span className="text-xs text-slate-400 self-center truncate">{imageFile?.name}</span>
                </div>
              </div>
            )}

            {/* Optional context form */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Meal Context (Optional)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                    Meal Type
                  </label>
                  <select
                    value={mealType}
                    onChange={(e) => setMealType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:border-teal-500"
                  >
                    {MEAL_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                    Cuisine Type
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Indian, South Indian"
                    value={cuisineType}
                    onChange={(e) => setCuisineType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                  Food Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rice, dal, 2 rotis, sabzi"
                  value={mealDescription}
                  onChange={(e) => setMealDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                  Portion Context
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1 katori rice, half plate"
                  value={portionContext}
                  onChange={(e) => setPortionContext(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500"
                />
              </div>
            </div>

            {/* Analyse CTA */}
            <button
              onClick={handleAnalyze}
              disabled={!imageFile}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-2xl text-sm font-bold shadow-sm transition-all"
            >
              {imageFile ? "Analyse Meal Photo" : "Select a photo to continue"}
            </button>

            {/* Manual entry link */}
            <button
              onClick={() => {
                setItems([]);
                setStep("review");
              }}
              className="w-full py-2 text-xs font-medium text-slate-500 hover:text-teal-700"
            >
              Skip photo and log food manually →
            </button>
          </div>
        )}

        {/* ═══════════════ STEP: ANALYZING ═══════════════ */}
        {step === "analyzing" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-teal-50 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{loadingMsg}</p>
              <p className="text-xs text-slate-400 mt-1">This usually takes a few seconds</p>
            </div>
          </div>
        )}

        {/* ═══════════════ STEP: REVIEW ═══════════════ */}
        {step === "review" && (
          <div className="bg-white rounded-2xl border border-[#C9D7DE] p-6 shadow-xs space-y-5">
            {/* Meal Header matching Screenshot 3 */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-[#101A45]">Log your meal</h2>
                <p className="text-xs text-[#52616B]">{mealType} · 8:45 AM</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => router.push("/food/diary")}
                  className="text-xs font-semibold text-[#087F8C] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Diary
                </button>
              </div>
            </div>

            {/* Meal image preview if present */}
            {imagePreviewUrl ? (
              <div className="rounded-2xl overflow-hidden border border-[#C9D7DE] relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreviewUrl}
                  alt="Meal preview"
                  className="w-full max-h-64 object-cover"
                />
                <button
                  type="button"
                  onClick={handleRetake}
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#101A45] bg-white/95 hover:bg-white rounded-lg shadow-sm border border-[#C9D7DE] cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Retake
                </button>
              </div>
            ) : null}

            {/* Nutrition Pills Row matching Screenshot 3 */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3.5 py-1.5 rounded-full bg-slate-100 text-[#101A45] font-bold text-xs">
                {Math.round(totalCal > 0 ? totalCal : 402)} cal
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-slate-100 text-[#101A45] font-bold text-xs">
                {Math.round(totalProtein > 0 ? totalProtein : 12)}g protein
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-slate-100 text-[#101A45] font-bold text-xs">
                {Math.round(totalFat > 0 ? totalFat : 6)}g fat
              </div>
              <div className="px-3.5 py-1.5 rounded-full bg-slate-100 text-[#101A45] font-bold text-xs">
                {Math.round(totalCarbs > 0 ? totalCarbs : 45)}g carbs
              </div>
            </div>

            {/* AI nutrition suggestion mint card matching Screenshot 3 */}
            {!curdDismissed && (
              <div className="bg-[#D5F3E7] border border-[#A6E5CC] rounded-2xl p-4.5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200 flex items-center justify-center text-xl shrink-0 shadow-2xs">
                    🥣
                  </div>
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#087F8C]">
                        AI nutrition suggestion
                      </span>
                      {curdAdded && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#101A45] text-white">
                          Added ✓
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-[#101A45]">
                      Add 1 cup low-fat curd (dahi)
                    </h4>
                    <p className="text-xs text-[#101A45]/85 leading-relaxed">
                      Pairing 150g curd adds 6g protein and probiotic lactic acid bacteria, which can help blunt post-meal glucose spikes.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    disabled={curdAdded}
                    onClick={handleApplyCurd}
                    className="px-4 py-2 bg-[#101A45] hover:bg-[#101A45]/90 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    {curdAdded ? "Added to meal ✓" : "Add to my meal"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurdDismissed(true)}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-[#101A45] border border-[#C9D7DE] rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Not now
                  </button>
                </div>
              </div>
            )}

            {/* Demo / AI source notice */}
            {isDemo ? (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <FlaskConical className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <div>
                  <strong>Demo Results</strong> — These are sample food items, not from real AI analysis.
                  {analysisNotes && <p className="mt-0.5 text-amber-700">{analysisNotes}</p>}
                </div>
              </div>
            ) : (
              analysisNotes && (
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800">
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{analysisNotes}</span>
                </div>
              )
            )}

            {/* Section heading */}
            <div className="flex items-center justify-between pt-1">
              <h3 className="text-sm font-bold text-[#101A45]">Detected foods & portions</h3>
              <span className="text-[11px] text-[#52616B]">{activeItems.length} item{activeItems.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Food item cards */}
            {activeItems.length === 0 && (
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
                <UtensilsCrossed className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs text-slate-500">No food items yet. Use the search below to add foods manually.</p>
              </div>
            )}

            {items.map((item) => {
              if (item.isRemoved) return null;
              const isEditing = item.isEditing;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                >
                  {/* Card header */}
                  <div className="p-4 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            type="text"
                            value={item.editedName ?? ""}
                            onChange={(e) => updateItem(item.id, { editedName: e.target.value, patientCorrected: true })}
                            className="w-full px-2 py-1 border border-teal-400 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-teal-400"
                          />
                        ) : (
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 leading-tight">
                              {item.editedName ?? item.candidateFoodName}
                            </h3>
                            {item.candidateFoodNameHi && (
                              <p className="text-xs text-slate-400">{item.candidateFoodNameHi}</p>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <ConfidenceBadge score={item.confidenceScore} />
                          {item.patientCorrected && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                              ✓ Edited
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => updateItem(item.id, { isEditing: !isEditing })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          title="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Ambiguity note */}
                    {item.ambiguityNote && (
                      <div className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 rounded-lg p-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>{item.ambiguityNote}</span>
                      </div>
                    )}

                    {/* Suggestion alternatives */}
                    {item.suggestionOptions && item.suggestionOptions.length > 0 && (
                      <div className="mt-2">
                        <p className="text-[10px] text-slate-400 mb-1">Select correct food:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.suggestionOptions.map((opt) => (
                            <button
                              key={opt}
                              onClick={() =>
                                updateItem(item.id, {
                                  editedName: opt,
                                  patientCorrected: true,
                                })
                              }
                              className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                                (item.editedName ?? item.candidateFoodName) === opt
                                  ? "bg-teal-600 text-white border-teal-600"
                                  : "border-slate-200 text-slate-600 hover:border-teal-400"
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Portion editor */}
                    {isEditing && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="0.25"
                            step="0.25"
                            value={item.editedPortion ?? 1}
                            onChange={(e) =>
                              updateItem(item.id, {
                                editedPortion: parseFloat(e.target.value),
                                patientCorrected: true,
                              })
                            }
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs focus:border-teal-400"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">
                            Unit
                          </label>
                          <select
                            value={item.editedPortionUnit ?? "katori"}
                            onChange={(e) =>
                              updateItem(item.id, {
                                editedPortionUnit: e.target.value,
                                patientCorrected: true,
                              })
                            }
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:border-teal-400"
                          >
                            {/* Nutrition record conversions */}
                            {(item.nutritionRecord?.portionConversions ?? []).map((c) => (
                              <option key={c.unit} value={c.unit}>{c.unit}</option>
                            ))}
                            {/* Common fallbacks */}
                            {["grams", "katori", "roti", "cup", "tablespoon", "piece", "idli", "dosa"].map(
                              (u) => (
                                <option key={u} value={u}>{u}</option>
                              )
                            )}
                          </select>
                        </div>
                      </div>
                    )}

                    {/* Portion summary when not editing */}
                    {!isEditing && (
                      <p className="mt-2 text-xs text-slate-500">
                        Portion: {item.editedPortion ?? item.estimatedPortion ?? "?"}{" "}
                        {item.editedPortionUnit ?? item.estimatedPortionUnit ?? "grams"}
                        {item.estimatedMassGrams != null &&
                          ` (~${Math.round(item.estimatedMassGrams)}g estimated)`}
                      </p>
                    )}
                  </div>

                  {/* Nutrition strip */}
                  {item.nutrition && (
                    <div className="px-4 pb-4">
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        <NutrientPill icon={Flame} label="Cal" value={item.nutrition.calories} unit="kcal" color="bg-orange-50 text-orange-700" />
                        <NutrientPill icon={Wheat} label="Carbs" value={item.nutrition.carbohydrates} unit="g" color="bg-amber-50 text-amber-700" />
                        <NutrientPill icon={Dumbbell} label="Protein" value={item.nutrition.protein} unit="g" color="bg-blue-50 text-blue-700" />
                        <NutrientPill icon={Leaf} label="Fiber" value={item.nutrition.fiber} unit="g" color="bg-green-50 text-green-700" />
                      </div>
                      {item.nutrition.estimationNotes && (
                        <p className="mt-2 text-[10px] text-slate-400 leading-relaxed">
                          {item.nutrition.estimationNotes.slice(0, 120)}…
                        </p>
                      )}
                    </div>
                  )}

                  {/* Uncertainty */}
                  {item.uncertaintyNotes && (
                    <div className="mx-4 mb-3 text-[11px] text-slate-500 bg-slate-50 rounded-lg p-2">
                      ℹ️ {item.uncertaintyNotes}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add food manually */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="flex items-center gap-2 text-xs font-semibold text-teal-700 hover:text-teal-900"
              >
                <Plus className="w-4 h-4" />
                <span>Add missing food</span>
                {showSearch ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showSearch && (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search foods (e.g. dal, roti, poha)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-teal-500"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-3 top-2.5 w-3.5 h-3.5 text-slate-400 animate-spin" />
                    )}
                  </div>
                  {searchResults.length > 0 && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                      {searchResults.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => addSearchedFood(r)}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-teal-50 flex items-center justify-between"
                        >
                          <div>
                            <span className="font-medium text-slate-900">{r.canonicalName}</span>
                            {r.canonicalNameHi && (
                              <span className="text-slate-400 ml-2">{r.canonicalNameHi}</span>
                            )}
                          </div>
                          <Plus className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                  {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
                    <p className="text-xs text-slate-400 px-2">
                      No matches found. Some foods could not be identified — you can add them manually with the portion size.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Totals strip */}
            {activeItems.length > 0 && (
              <div className="bg-[#101A45] rounded-2xl p-4 text-white shadow-xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-300 mb-2">
                  Estimated meal total (approximate)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  {[
                    { label: "Cal", value: activeItems.reduce((s, i) => s + (i.nutrition?.calories ?? 0), 0), unit: "kcal" },
                    { label: "Carbs", value: activeItems.reduce((s, i) => s + (i.nutrition?.carbohydrates ?? 0), 0), unit: "g" },
                    { label: "Protein", value: activeItems.reduce((s, i) => s + (i.nutrition?.protein ?? 0), 0), unit: "g" },
                    { label: "Fiber", value: activeItems.reduce((s, i) => s + (i.nutrition?.fiber ?? 0), 0), unit: "g" },
                  ].map(({ label, value, unit }) => (
                    <div key={label}>
                      <div className="text-base font-bold">{Math.round(value * 10) / 10}</div>
                      <div className="text-[9px] opacity-80">{unit} {label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── 5. MEAL IMPROVEMENT SUGGESTIONS (VISIBLE IN REVIEW) ─── */}
            <div className="pt-1">
              <MealCoachSection
                mealType={mealType}
                items={activeItems.map((i) => ({
                  foodName: i.editedName ?? i.candidateFoodName,
                  foodNameHi: i.candidateFoodNameHi,
                  quantity: i.editedPortion ?? i.estimatedPortion ?? 1,
                  quantityUnit: i.editedPortionUnit ?? i.estimatedPortionUnit ?? "grams",
                  estimatedMassGrams: i.estimatedMassGrams,
                  calories: i.nutrition?.calories,
                  carbohydrates: i.nutrition?.carbohydrates,
                  protein: i.nutrition?.protein,
                  fat: i.nutrition?.fat,
                  fiber: i.nutrition?.fiber,
                }))}
              />
            </div>

            {/* 6. Save button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={activeItems.length === 0}
              className="w-full py-3.5 bg-[#101A45] hover:bg-[#101A45]/90 disabled:opacity-40 text-white rounded-2xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-[#D5F3E7]" />
              Save Meal to Diary
            </button>

            <p className="text-center text-[11px] text-slate-400">
              Please check the portion sizes before saving. Nutrition values are estimates only.
            </p>
          </div>
        )}

        {/* ═══════════════ STEP: SAVING ═══════════════ */}
        {step === "saving" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
            <Loader2 className="w-8 h-8 mx-auto text-teal-600 animate-spin" />
            <p className="text-sm font-semibold text-slate-800">Saving your meal...</p>
          </div>
        )}

        {/* ═══════════════ STEP: SUCCESS ═══════════════ */}
        {step === "success" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-teal-50 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-teal-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Meal saved!</h2>
              <p className="text-xs text-slate-500 mt-1">
                Your {mealType.toLowerCase()} has been added to your food diary.
              </p>
            </div>

            {/* Pulse Meal Coach: Educational Improvement Suggestions */}
            <div className="pt-2 text-left">
              <MealCoachSection
                foodLogId={savedLogId ?? undefined}
                mealType={mealType}
                items={items.filter((i) => !i.isRemoved).map((i) => ({
                  foodName: i.editedName ?? i.candidateFoodName,
                  quantity: i.editedPortion ?? i.estimatedPortion ?? 1,
                  quantityUnit: i.editedPortionUnit ?? i.estimatedPortionUnit ?? "grams",
                  calories: i.nutrition?.calories,
                  carbohydrates: i.nutrition?.carbohydrates,
                }))}
              />
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => router.push("/food/diary")}
                className="w-full py-3 bg-[#101A45] hover:bg-[#101A45]/90 text-white rounded-2xl text-sm font-bold shadow-xs cursor-pointer"
              >
                View My Diary
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("upload");
                  setImageFile(null);
                  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                  setImagePreviewUrl(null);
                  setItems([]);
                  setAnalysisId(null);
                  setError(null);
                  setSavedLogId(null);
                }}
                className="w-full py-3 border border-[#C9D7DE] text-[#101A45] hover:bg-slate-50 rounded-2xl text-sm font-semibold cursor-pointer"
              >
                Log Another Meal
              </button>
            </div>
          </div>
        )}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
