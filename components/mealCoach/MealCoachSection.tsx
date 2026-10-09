"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Sparkles,
  CheckCircle2,
  Bookmark,
  XCircle,
  RefreshCw,
  Info,
  ChevronDown,
  ChevronUp,
  Settings2,
  ShieldCheck,
  Loader2,
  ExternalLink,
  Plus,
  Flame,
  ArrowRight,
  Eye,
  HelpCircle,
  RotateCcw,
} from "lucide-react";
import { SingleSuggestion, PatientPreferencesData } from "@/services/mealCoach/types";
import { useCurrentLanguage } from "@/components/LanguageToggle";

interface MealCoachSectionProps {
  foodLogId?: string;
  mealType?: string;
  items?: Array<{
    foodName: string;
    foodNameHi?: string | null;
    quantity: number;
    quantityUnit: string;
    estimatedMassGrams?: number | null;
    calories?: number | null;
    carbohydrates?: number | null;
    protein?: number | null;
    fat?: number | null;
    fiber?: number | null;
  }>;
  onDismiss?: () => void;
  compact?: boolean;
}

export function MealCoachSection({
  foodLogId,
  mealType = "Lunch",
  items = [],
  onDismiss,
  compact = false,
}: MealCoachSectionProps) {
  const lang = useCurrentLanguage();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SingleSuggestion[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showAlternativesIds, setShowAlternativesIds] = useState<Set<string>>(new Set());

  const [disclaimer, setDisclaimer] = useState("");
  const [disclaimerHi, setDisclaimerHi] = useState("");
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [modeLabel, setModeLabel] = useState<string | null>(null);

  const [activeFeedbackId, setActiveFeedbackId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<PatientPreferencesData | null>(null);
  const [allergiesInput, setAllergiesInput] = useState("");
  const [dietaryPatternInput, setDietaryPatternInput] = useState("vegetarian");

  const [showUnsuitableReasonFor, setShowUnsuitableReasonFor] = useState<string | null>(null);
  const [unsuitableReason, setUnsuitableReason] = useState("");
  const [isAllDismissed, setIsAllDismissed] = useState(false);

  // Serialized key representing items to detect changes
  const itemsKey = useMemo(() => {
    return items
      .map((i) => `${i.foodName.trim().toLowerCase()}:${i.quantity}:${i.quantityUnit}`)
      .sort()
      .join("|");
  }, [items]);

  // Load patient preferences
  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch("/api/meal-coach/preferences");
      const data = await res.json();
      if (data.preferences) {
        setPreferences(data.preferences);
        setAllergiesInput((data.preferences.allergies || []).join(", "));
        setDietaryPatternInput(data.preferences.dietaryPattern || "vegetarian");
      }
    } catch {
      // Preferences load fallback
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  // Fetch suggestions from API
  const fetchSuggestions = useCallback(async (isRefresh = false) => {
    setLoading(true);
    setError(null);
    setActionNotice(null);

    try {
      const res = await fetch("/api/meal-coach/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodLogId,
          mealType: mealType.toLowerCase(),
          items: items.map((i) => ({
            foodName: i.foodName,
            foodNameHi: i.foodNameHi,
            quantity: i.quantity,
            quantityUnit: i.quantityUnit,
            estimatedMassGrams: i.estimatedMassGrams,
            calories: i.calories,
            carbohydrates: i.carbohydrates,
            protein: i.protein,
            fiber: i.fiber,
          })),
          language: lang,
        }),
      });

      const data = await res.json();

      if (!res.ok && !data.suggestions) {
        throw new Error(data.error || "Could not load suggestions.");
      }

      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        setDisclaimer(data.disclaimer ?? "");
        setDisclaimerHi(data.disclaimerHi ?? "");
        setIsFallbackMode(Boolean(data.isFallbackMode));
        setModeLabel(data.modeLabel || (data.isFallbackMode ? "General food education" : "Personalized suggestions"));
        if (!isRefresh) {
          setIsAllDismissed(false);
        }
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.warn("[MealCoachSection] Fetch error:", err);
      setError(
        lang === "hi"
          ? "व्यक्तिगत सुझाव अस्थायी रूप से अनुपलब्ध हैं। आप सामान्य विचार देख सकते हैं।"
          : "Personalized suggestions are temporarily unavailable. You can still explore general meal ideas."
      );
    } finally {
      setLoading(false);
    }
  }, [foodLogId, mealType, items, lang]);

  // Initial and reactive auto-fetch with debounce
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(false);
    }, 400);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [itemsKey, fetchSuggestions]);

  // Action feedback handler
  const handleFeedback = async (
    suggestionId: string,
    response: "TRY_IDEA" | "ANOTHER_OPTION" | "SAVE_FOR_LATER" | "NOT_SUITABLE" | "DISMISSED",
    reason?: string
  ) => {
    setActiveFeedbackId(suggestionId);
    try {
      const res = await fetch("/api/meal-coach/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestionId, response, reason }),
      });
      const data = await res.json();

      if (response === "DISMISSED") {
        setDismissedIds((prev) => new Set(prev).add(suggestionId));
        setActionNotice(
          lang === "hi"
            ? "विचार हटा दिया गया। आपकी थाली जैसी है वैसी ही सुरक्षित है।"
            : "Suggestion dismissed. Your meal is kept exactly as it is."
        );
      } else if (response === "NOT_SUITABLE") {
        setDismissedIds((prev) => new Set(prev).add(suggestionId));
        setActionNotice(
          lang === "hi"
            ? "धन्यवाद। हम आगे ऐसे सुझावों से बचेंगे।"
            : "Thank you. We'll avoid similar ideas for your meals."
        );
      } else if (response === "TRY_IDEA") {
        setActionNotice(
          lang === "hi"
            ? "विचार सहेजा गया! आपकी मौजूदा भोजन डायरी में कोई स्वतः बदलाव नहीं होगा।"
            : "Idea saved for meal planning! Your current food diary remains untouched."
        );
        setSuggestions((prev) =>
          prev.map((s) => (s.id === suggestionId ? { ...s, status: "ACCEPTED" } : s))
        );
      } else if (response === "SAVE_FOR_LATER") {
        setActionNotice(
          lang === "hi"
            ? "भविष्य की थाली के लिए विचार सहेजा गया।"
            : "Saved for future meal planning."
        );
        setSuggestions((prev) =>
          prev.map((s) => (s.id === suggestionId ? { ...s, status: "SAVED_FOR_LATER" } : s))
        );
      }
    } catch {
      // Local graceful fallback
      if (response === "NOT_SUITABLE" || response === "DISMISSED") {
        setDismissedIds((prev) => new Set(prev).add(suggestionId));
      }
    } finally {
      setActiveFeedbackId(null);
      setShowUnsuitableReasonFor(null);
      setUnsuitableReason("");
    }
  };

  const handleSavePreferences = async () => {
    const allergyList = allergiesInput
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    try {
      const res = await fetch("/api/meal-coach/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dietaryPattern: dietaryPatternInput,
          allergies: allergyList,
        }),
      });
      const data = await res.json();
      if (data.preferences) {
        setPreferences(data.preferences);
        setShowPreferences(false);
        setActionNotice(
          lang === "hi"
            ? "प्राथमिकताएं अपडेट हुईं। नए सुझाव लोड हो रहे हैं..."
            : "Preferences updated. Refreshing suggestions..."
        );
        fetchSuggestions(true);
      }
    } catch {
      // Preference save error handling
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAlternatives = (id: string) => {
    setShowAlternativesIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filter out suggestions that were marked unsuitable or dismissed
  const activeSuggestions = suggestions.filter((s) => !dismissedIds.has(s.id || ""));

  // If patient explicitly kept meal as it is
  if (isAllDismissed) {
    return (
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-900 transition-all">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {lang === "hi"
              ? "आपकी थाली जैसी है वैसी ही रहेगी। आपके स्कोर पर कोई प्रभाव नहीं पड़ेगा।"
              : "Keeping your meal as it is. No impact on your health score or plan."}
          </span>
        </div>
        <button
          onClick={() => {
            setIsAllDismissed(false);
            setDismissedIds(new Set());
            fetchSuggestions(true);
          }}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline ml-2 shrink-0"
        >
          {lang === "hi" ? "सुझाव दोबारा देखें" : "Explore suggestions"}
        </button>
      </div>
    );
  }

  return (
    <div
      className={`bg-white border border-emerald-100 rounded-3xl p-5 shadow-xs space-y-4 transition-all ${
        compact ? "text-xs" : ""
      }`}
    >
      {/* ─── Header: Section Title & Educational Subtitle ─── */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0 shadow-2xs mt-0.5">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {lang === "hi" ? "भोजन सुधार के सुझाव" : "Meal Improvement Suggestions"}
              </h3>
              {/* Fallback vs AI Badge */}
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {modeLabel ?? (lang === "hi" ? "सामान्य पोषण शिक्षा" : "General food education")}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {lang === "hi"
                ? "अपनी थाली को अधिक संतुलित बनाने के लिए आसान बदलाव। वही चुनें जो आपके अनुकूल हो।"
                : "Small changes you can explore to make your meals more balanced. Choose what works for you."}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowPreferences(!showPreferences)}
          className="p-2 rounded-xl text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-colors shrink-0"
          title="Dietary Preferences & Allergies"
          aria-label="Dietary Preferences"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      </div>

      {/* ─── Notice / Status Message ─── */}
      {actionNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-slate-600 text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── Temporary Error / Unavailability Note ─── */}
      {error && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchSuggestions(true)}
            className="text-xs font-semibold text-amber-800 underline shrink-0 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            {lang === "hi" ? "पुनः प्रयास" : "Retry"}
          </button>
        </div>
      )}

      {/* ─── Voluntary Preferences Drawer ─── */}
      {showPreferences && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-emerald-600" />
              {lang === "hi" ? "खान-पान की प्राथमिकताएं व एलर्जी" : "Dietary Preferences & Allergies"}
            </span>
            <button
              onClick={() => setShowPreferences(false)}
              className="text-slate-400 hover:text-slate-700 text-xs p-1"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                {lang === "hi" ? "आहार प्रकार" : "Dietary Pattern"}
              </label>
              <select
                value={dietaryPatternInput}
                onChange={(e) => setDietaryPatternInput(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-white focus:border-emerald-400"
              >
                <option value="vegetarian">शाकाहारी (Vegetarian)</option>
                <option value="eggetarian">अंडा-शाकाहारी (Eggetarian)</option>
                <option value="non_vegetarian">मांसाहारी (Non-Vegetarian)</option>
                <option value="jain">जैन (No root vegetables)</option>
                <option value="vegan">वीगन (Plant-based)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase block mb-1">
                {lang === "hi" ? "एलर्जी (कोमा से अलग करें)" : "Allergies (comma separated)"}
              </label>
              <input
                type="text"
                placeholder="e.g. peanuts, dairy, mustard"
                value={allergiesInput}
                onChange={(e) => setAllergiesInput(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:border-emerald-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setShowPreferences(false)}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
            >
              {lang === "hi" ? "रद्द करें" : "Cancel"}
            </button>
            <button
              onClick={handleSavePreferences}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs"
            >
              {lang === "hi" ? "सुरक्षित करें" : "Save Preferences"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Loading Skeleton ─── */}
      {loading && activeSuggestions.length === 0 && (
        <div className="p-6 bg-slate-50/70 border border-slate-100 rounded-2xl text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
          <p className="text-xs text-slate-600 font-medium">
            {lang === "hi"
              ? "आपकी थाली के अनुसार पोषण विचार तैयार किए जा रहे हैं..."
              : "Reviewing approved nutrition guidance for your meal..."}
          </p>
        </div>
      )}

      {/* ─── Suggestion Cards ─── */}
      {activeSuggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span className="font-medium text-slate-600">
              {lang === "hi" ? "विचार जिन पर आप विचार कर सकते हैं:" : "Options you could consider:"}
            </span>
            <div className="flex items-center gap-2">
              {loading && <Loader2 className="w-3 h-3 text-emerald-600 animate-spin" />}
              <button
                onClick={() => fetchSuggestions(true)}
                className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold text-[11px]"
              >
                <RefreshCw className="w-3 h-3" />
                {lang === "hi" ? "ताज़ा करें" : "Refresh"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {activeSuggestions.map((suggestion, idx) => {
              const suggId = suggestion.id || `sugg-${idx}`;
              const isAccepted = suggestion.status === "ACCEPTED";
              const isSaved = suggestion.status === "SAVED_FOR_LATER";
              const isExpanded = expandedIds.has(suggId);
              const showAlternatives = showAlternativesIds.has(suggId);

              // Category mapping
              let categoryLabel = lang === "hi" ? "थाली में जोड़ें" : "Add";
              let categoryBadgeColor = "bg-emerald-50 text-emerald-800 border-emerald-200";

              if (suggestion.suggestionType === "SUBSTITUTION") {
                categoryLabel = lang === "hi" ? "सरल संतुलन" : "Substitute";
                categoryBadgeColor = "bg-blue-50 text-blue-800 border-blue-200";
              } else if (suggestion.suggestionType === "PREPARATION") {
                categoryLabel = lang === "hi" ? "पकाने का आसान तरीका" : "Preparation idea";
                categoryBadgeColor = "bg-amber-50 text-amber-800 border-amber-200";
              }

              return (
                <div
                  key={suggId}
                  className={`p-4 rounded-2xl bg-white border transition-all ${
                    isAccepted
                      ? "border-emerald-300 bg-emerald-50/30"
                      : isSaved
                      ? "border-blue-300 bg-blue-50/30"
                      : "border-slate-200 hover:border-emerald-300 shadow-2xs"
                  }`}
                >
                  {/* Category Badge & Citation */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${categoryBadgeColor}`}
                    >
                      {categoryLabel}
                    </span>

                    {suggestion.evidenceReference && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span className="truncate max-w-[190px]">{suggestion.evidenceReference}</span>
                      </span>
                    )}
                  </div>

                  {/* Short Title */}
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    {lang === "hi" && suggestion.titleHi ? suggestion.titleHi : suggestion.title}
                  </h4>

                  {/* Practical Suggestion Text */}
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                    {lang === "hi" && suggestion.suggestionTextHi
                      ? suggestion.suggestionTextHi
                      : suggestion.suggestionText}
                  </p>

                  {/* Why this may help */}
                  <div className="mt-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-700">
                      {lang === "hi" ? "यह क्यों सहायक हो सकता है: " : "Why this may help: "}
                    </span>
                    <span>
                      {lang === "hi" && suggestion.explanationHi
                        ? suggestion.explanationHi
                        : suggestion.explanation}
                    </span>
                  </div>

                  {/* Expanded content when "Explore this idea" is active */}
                  {isExpanded && (
                    <div className="mt-2.5 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 text-[11px] text-emerald-950 space-y-1.5 animate-in fade-in">
                      <p className="font-semibold text-emerald-900">
                        {lang === "hi" ? "तैयारी का आसान तरीका:" : "Preparation tip:"}
                      </p>
                      <p className="leading-relaxed">
                        {lang === "hi"
                          ? "इसे अपनी पसंदीदा सामग्री के साथ आसानी से तैयार करें। तेल और नमक की मात्रा सामान्य रखें।"
                          : "Incorporate with familiar pantry ingredients. Keep cooking oils and added salts moderate."}
                      </p>
                      {suggestion.alternatives && suggestion.alternatives.length > 0 && (
                        <div className="pt-1 text-slate-700">
                          <span className="font-medium text-slate-900">
                            {lang === "hi" ? "अन्य विकल्प: " : "Alternatives: "}
                          </span>
                          <span>{suggestion.alternatives.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Alternatives Section if toggled */}
                  {showAlternatives && !isExpanded && suggestion.alternatives && suggestion.alternatives.length > 0 && (
                    <div className="mt-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-700">
                      <span className="font-semibold text-slate-800">
                        {lang === "hi" ? "विकल्प: " : "Alternatives: "}
                      </span>
                      <span>{suggestion.alternatives.join(", ")}</span>
                    </div>
                  )}

                  {/* Uncertainty note */}
                  {suggestion.uncertaintyNotes && (
                    <p className="mt-2 text-[10px] text-slate-400 italic">
                      ℹ️ {suggestion.uncertaintyNotes}
                    </p>
                  )}

                  {/* ─── Functional Action Buttons ─── */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Explore this idea button */}
                      <button
                        onClick={() => toggleExpand(suggId)}
                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>
                          {isExpanded
                            ? lang === "hi"
                              ? "कम देखें"
                              : "Show less"
                            : lang === "hi"
                            ? "यह विचार देखें"
                            : "Explore this idea"}
                        </span>
                      </button>

                      {/* See alternatives button */}
                      {suggestion.alternatives && suggestion.alternatives.length > 0 && (
                        <button
                          onClick={() => toggleAlternatives(suggId)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1 transition-colors"
                        >
                          <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {showAlternatives
                              ? lang === "hi"
                                ? "विकल्प छुपाएं"
                                : "Hide options"
                              : lang === "hi"
                              ? "विकल्प देखें"
                              : "See alternatives"}
                          </span>
                        </button>
                      )}

                      {/* Try idea */}
                      <button
                        onClick={() => handleFeedback(suggId, "TRY_IDEA")}
                        disabled={activeFeedbackId === suggId || isAccepted}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors ${
                          isAccepted
                            ? "bg-emerald-700 text-white"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>
                          {isAccepted
                            ? lang === "hi"
                              ? "स्वीकृत"
                              : "Saved to Plan"
                            : lang === "hi"
                            ? "यह विचार आज़माएं"
                            : "Try this idea"}
                        </span>
                      </button>
                    </div>

                    {/* Not suitable for me button */}
                    <button
                      onClick={() => setShowUnsuitableReasonFor(suggId)}
                      className="text-[11px] text-slate-400 hover:text-rose-600 underline"
                    >
                      {lang === "hi" ? "मेरे अनुकूल नहीं" : "Not suitable for me"}
                    </button>
                  </div>

                  {/* Unsuitable feedback prompt */}
                  {showUnsuitableReasonFor === suggId && (
                    <div className="mt-2.5 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-in fade-in">
                      <label className="text-[10px] text-slate-600 font-medium block">
                        {lang === "hi"
                          ? "कारण बताएं (वैकल्पिक, ताकि आगे ऐसे सुझाव न आएं):"
                          : "Optional reason (so we avoid similar ideas in future):"}
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Too expensive, don't like taste, allergic"
                        value={unsuitableReason}
                        onChange={(e) => setUnsuitableReason(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => setShowUnsuitableReasonFor(null)}
                          className="px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-700"
                        >
                          {lang === "hi" ? "रद्द करें" : "Cancel"}
                        </button>
                        <button
                          onClick={() => handleFeedback(suggId, "NOT_SUITABLE", unsuitableReason)}
                          className="px-3 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-[11px] font-semibold"
                        >
                          {lang === "hi" ? "हटाएं" : "Dismiss"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ─── Footer Controls: Show another suggestion & Keep meal as it is ─── */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchSuggestions(true)}
                className="px-3 py-1.5 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                <span>{lang === "hi" ? "अन्य सुझाव देखें" : "Show another suggestion"}</span>
              </button>

              <button
                onClick={() => {
                  setIsAllDismissed(true);
                  if (onDismiss) onDismiss();
                }}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 font-medium"
              >
                {lang === "hi" ? "थाली जैसी है वैसी रखें" : "Keep my meal as it is"}
              </button>
            </div>

            <span className="text-[10px] text-slate-400">
              {lang === "hi" ? "स्वास्थ्य स्कोर पर कोई प्रभाव नहीं" : "No impact on health score or plan"}
            </span>
          </div>

          {/* Clinical Disclaimer */}
          <p className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-100 pt-2">
            {lang === "hi" && disclaimerHi ? disclaimerHi : disclaimer}
          </p>
        </div>
      )}

      {/* ─── Empty state when suggestions are finished or dismissed ─── */}
      {!loading && activeSuggestions.length === 0 && (
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-2">
          <p className="text-xs text-slate-600">
            {lang === "hi"
              ? "सभी सुझावों की समीक्षा हो चुकी है। क्या आप और विकल्प देखना चाहते हैं?"
              : "All suggestions have been explored. Would you like to refresh new ideas?"}
          </p>
          <div className="flex justify-center gap-2 pt-1">
            <button
              onClick={() => {
                setDismissedIds(new Set());
                fetchSuggestions(true);
              }}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{lang === "hi" ? "नए विचार देखें" : "Explore new ideas"}</span>
            </button>
            <button
              onClick={() => setIsAllDismissed(true)}
              className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-medium"
            >
              {lang === "hi" ? "थाली जैसी है वैसी रखें" : "Keep meal as it is"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
