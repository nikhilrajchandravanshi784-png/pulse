"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Heart,
  Droplet,
  Moon,
  Sparkles,
  Zap,
  Lock,
  AlertCircle,
  TrendingUp,
  Info,
} from "lucide-react";
import { SafetyBanner } from "@/components/layout/SafetyBanner";
import { LanguageToggle } from "@/components/LanguageToggle";
import {
  calculateMetabolicScore,
  MetabolicScoreResult,
} from "@/services/pulse/metabolicScoreService";

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Personal Info
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("1990-01-01");
  const [biologicalSex, setBiologicalSex] = useState("male");
  const [heightCm, setHeightCm] = useState("175");
  const [weightKg, setWeightKg] = useState("72");
  const [country, setCountry] = useState("United States");

  // Step 2: Glycemic Baseline (HbA1c Only)
  const [hba1c, setHba1c] = useState<string>("5.8");
  const [hba1cTiming, setHba1cTiming] = useState<string>("Within last 3 months");
  const [hba1cTestDate, setHba1cTestDate] = useState<string>("");

  // Generated Metabolic Score out of 100
  const [generatedScore, setGeneratedScore] = useState<MetabolicScoreResult | null>(null);

  // Step 3: Health Goals
  const [primaryGoals, setPrimaryGoals] = useState<string[]>([
    "Improve glucose control",
  ]);
  const [secondaryGoals, setSecondaryGoals] = useState<string[]>([
    "Improve sleep",
    "Increase physical activity",
  ]);

  // Step 4: Food & Lifestyle
  const [dietaryPreference, setDietaryPreference] = useState("Mediterranean");
  const [typicalMeals, setTypicalMeals] = useState("3 meals + light snack");
  const [mealTiming, setMealTiming] = useState("12-hour eating window (08:00 - 20:00)");
  const [exerciseFrequency, setExerciseFrequency] = useState("3-4 days/week");
  const [sleepSchedule, setSleepSchedule] = useState("23:00 - 07:00 (approx 8 hours)");
  const [workActivityPattern, setWorkActivityPattern] = useState("desk worker / lightly active");
  const [smokingStatus, setSmokingStatus] = useState("never");
  const [alcoholConsumption, setAlcoholConsumption] = useState("occasional");

  // Step 5: Data Sources
  const [selectedProviders, setSelectedProviders] = useState<string[]>([
    "apple_health",
    "dexcom",
  ]);

  // Step 6: Consent (Strictly NO pre-checked boxes)
  const [consentTelemetry, setConsentTelemetry] = useState(false);
  const [consentCareTeam, setConsentCareTeam] = useState(false);
  const [consentStorage, setConsentStorage] = useState(false);

  // Fetch pre-existing name or session
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user?.name) {
          setFullName(data.user.name);
        }
      })
      .catch(() => {});
  }, []);

  const standardGoals = [
    "Improve metabolic health",
    "Improve glucose control",
    "Lose weight",
    "Improve sleep",
    "Increase physical activity",
    "Improve cardiovascular health",
    "Build healthier eating habits",
    "General wellness",
  ];

  const providerCatalog = [
    {
      key: "apple_health",
      name: "Apple Health",
      category: "WEARABLES",
      desc: "Steps, continuous heart rate, sleep duration, and active energy.",
      mockLabel: "Ready in Demo Mode",
    },
    {
      key: "dexcom",
      name: "Dexcom CGM (G7 / ONE)",
      category: "GLUCOSE",
      desc: "Interstitial glucose readings every 5 minutes with glycemic curve.",
      mockLabel: "Simulated Interstitial Sensor",
    },
    {
      key: "oura",
      name: "Oura Ring",
      category: "WEARABLES",
      desc: "Nocturnal heart rate variability, sleep stages, and readiness.",
      mockLabel: "Ready in Demo Mode",
    },
    {
      key: "fitbit",
      name: "Fitbit",
      category: "WEARABLES",
      desc: "Steps, continuous resting pulse, and SpO2 levels.",
      mockLabel: "Ready in Demo Mode",
    },
    {
      key: "garmin",
      name: "Garmin Health",
      category: "WEARABLES",
      desc: "Training load, body battery, stress levels, and VO2 max.",
      mockLabel: "Ready in Demo Mode",
    },
    {
      key: "google_health",
      name: "Google Health Connect",
      category: "WEARABLES",
      desc: "Android wearable sensor synchronization via Health Connect API.",
      mockLabel: "Ready in Demo Mode",
    },
    {
      key: "withings",
      name: "Withings Smart Scale",
      category: "BODY DATA",
      desc: "Longitudinal weight, body fat %, and vascular age.",
      mockLabel: "Simulated Scale",
    },
  ];

  const handleNext = async () => {
    setError(null);

    if (currentStep === 1) {
      if (!fullName) {
        setError("Please enter your name");
        return;
      }
    } else if (currentStep === 2) {
      const parsed = parseFloat(hba1c);
      if (isNaN(parsed) || parsed < 3.5 || parsed > 18.0) {
        setError("Please enter a valid HbA1c value between 3.5% and 18.0%");
        return;
      }
    } else if (currentStep === 6) {
      if (!consentTelemetry || !consentCareTeam || !consentStorage) {
        setError("Please check each required explicit consent item to continue");
        return;
      }

      // Submit complete onboarding and calculate Metabolic Score
      setSaving(true);
      try {
        const parsedHba1c = parseFloat(hba1c) || 5.8;
        const parsedHeight = parseFloat(heightCm) || 170;
        const parsedWeight = parseFloat(weightKg) || 70;

        // Local instant preview calculation
        const localScore = calculateMetabolicScore({
          hba1c: parsedHba1c,
          heightCm: parsedHeight,
          weightKg: parsedWeight,
          dateOfBirth,
          biologicalSex,
          exerciseFrequency,
          sleepSchedule,
          dietaryPreference,
          smokingStatus,
          primaryGoals,
        });

        const payload = {
          step: 6,
          isFinal: true,
          personal: {
            fullName,
            dateOfBirth,
            biologicalSex,
            heightCm,
            weightKg,
            country,
          },
          medical: {
            hba1c: parsedHba1c,
            testTiming: hba1cTiming,
            testDate: hba1cTestDate || undefined,
            preferNotToSay: false,
          },
          goals: {
            primaryGoals,
            secondaryGoals,
          },
          lifestyle: {
            dietaryPreference,
            typicalMeals,
            mealTiming,
            exerciseFrequency,
            sleepSchedule,
            workActivityPattern,
            smokingStatus,
            alcoholConsumption,
          },
          connectedProviders: selectedProviders,
          consent: {
            categories: [
              "wearable_telemetry",
              "glucose_monitoring",
              "lifestyle_history",
              "clinical_care_program",
            ],
            explicitConsent: true,
            purpose: "Metabolic health optimization & care team guidance",
          },
        };

        const res = await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          throw new Error("Failed to save health profile");
        }

        const data = await res.json();
        setGeneratedScore(data.metabolicScore || localScore);
        setSaving(false);
        setCurrentStep(7);
        return;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error saving profile");
        setSaving(false);
        return;
      }
    } else if (currentStep === 7) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 6));
  };

  const handlePrev = () => {
    setError(null);
    if (currentStep === 7) {
      setCurrentStep(6);
      return;
    }
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const toggleProvider = (key: string) => {
    setSelectedProviders((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const togglePrimaryGoal = (goal: string) => {
    setPrimaryGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
    setSecondaryGoals((prev) => prev.filter((g) => g !== goal));
  };

  const toggleSecondaryGoal = (goal: string) => {
    if (primaryGoals.includes(goal)) return;
    setSecondaryGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal]
    );
  };

  const currentHba1cNum = parseFloat(hba1c) || 5.8;

  return (
    <div className="min-h-screen bg-[#DCE8EC] text-[#101A45] flex flex-col justify-between font-sans">
      <SafetyBanner compact />

      {/* Top Header */}
      <div className="bg-white border-b border-[#C9D7DE] py-3.5 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#087F8C] flex items-center justify-center text-white">
              <Activity className="w-4 h-4" />
            </div>
            <span className="font-black text-lg text-[#101A45]">
              Pulse
            </span>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <div className="text-xs font-bold text-[#52616B]">
              {currentStep <= 6 ? `Step ${currentStep} of 6` : "Metabolic Score Generated"}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="max-w-4xl mx-auto mt-3 h-1.5 bg-[#D5F3E7] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#087F8C] transition-all duration-500 rounded-full"
            style={{ width: currentStep === 7 ? "100%" : `${(currentStep / 6) * 100}%` }}
          />
        </div>
      </div>

      {/* Main Form Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8 flex flex-col justify-center">
        <div className="bg-white rounded-3xl border border-[#C9D7DE] p-6 sm:p-10 shadow-xs space-y-6">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ================= STEP 1: PERSONAL INFORMATION ================= */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#101A45]">Personal Information</h2>
                <p className="text-xs text-[#52616B] mt-1">
                  We use your physical parameters to calibrate metabolic baseline calculations and energy expenditure.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#101A45] uppercase tracking-wider mb-1">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jordan Smith"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#087F8C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#101A45] uppercase tracking-wider mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    required
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#087F8C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#101A45] uppercase tracking-wider mb-1">
                    Biological Sex
                  </label>
                  <select
                    value={biologicalSex}
                    onChange={(e) => setBiologicalSex(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#087F8C] bg-white text-[#101A45]"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#101A45] uppercase tracking-wider mb-1">
                    Country of Residence
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. United States, India, UK"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#087F8C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#101A45] uppercase tracking-wider mb-1">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                    placeholder="175"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#087F8C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#101A45] uppercase tracking-wider mb-1">
                    Current Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="72.5"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-[#087F8C]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 2: GLYCEMIC BASELINE (HbA1c ONLY) ================= */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#D5F3E7] text-[#087F8C] text-[11px] font-bold mb-2">
                  <Droplet className="w-3.5 h-3.5" />
                  Primary Metabolic Biomarker
                </div>
                <h2 className="text-2xl font-bold text-[#101A45]">Glycemic Baseline: HbA1c</h2>
                <p className="text-xs text-[#52616B] mt-1">
                  Instead of lengthy medical surveys, Pulse only asks for your HbA1c to establish your clinical baseline and calculate your Metabolic Score.
                </p>
              </div>

              {/* Primary HbA1c Input Card */}
              <div className="p-6 rounded-2xl bg-slate-50/70 border border-[#C9D7DE] space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#101A45] uppercase tracking-wider">
                      Most Recent HbA1c Value
                    </label>
                    <span className="text-[11px] text-[#52616B]">
                      Glycated hemoglobin level from your recent laboratory blood report
                    </span>
                  </div>

                  {/* Dynamic Status Pill */}
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto ${
                      currentHba1cNum < 5.7
                        ? "bg-[#D5F3E7] text-[#087F8C] border border-[#087F8C]/30"
                        : currentHba1cNum <= 6.4
                        ? "bg-amber-50 text-amber-800 border border-amber-300"
                        : "bg-rose-50 text-rose-800 border border-rose-300"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{
                        backgroundColor:
                          currentHba1cNum < 5.7
                            ? "#087F8C"
                            : currentHba1cNum <= 6.4
                            ? "#D97706"
                            : "#E11D48",
                      }}
                    />
                    {currentHba1cNum < 5.7
                      ? "Normal / Optimal (< 5.7%)"
                      : currentHba1cNum <= 6.4
                      ? "Pre-diabetes Range (5.7–6.4%)"
                      : "Elevated / Diabetes (≥ 6.5%)"}
                  </div>
                </div>

                {/* Stepper + Big Value Input */}
                <div className="flex items-center justify-center gap-4 py-2">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(4.0, Math.round((currentHba1cNum - 0.1) * 10) / 10);
                      setHba1c(next.toFixed(1));
                    }}
                    className="w-12 h-12 rounded-2xl bg-white border border-[#C9D7DE] hover:border-[#087F8C] text-[#101A45] text-xl font-bold flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105"
                  >
                    -
                  </button>

                  <div className="relative flex items-center">
                    <input
                      type="number"
                      step="0.1"
                      min="4.0"
                      max="16.0"
                      value={hba1c}
                      onChange={(e) => setHba1c(e.target.value)}
                      className="w-40 sm:w-48 text-center text-4xl sm:text-5xl font-black text-[#101A45] py-2.5 px-4 bg-white border-2 border-[#087F8C] rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#087F8C]/20 shadow-xs"
                    />
                    <span className="absolute right-4 text-xl font-bold text-[#52616B] pointer-events-none">
                      %
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(15.0, Math.round((currentHba1cNum + 0.1) * 10) / 10);
                      setHba1c(next.toFixed(1));
                    }}
                    className="w-12 h-12 rounded-2xl bg-white border border-[#C9D7DE] hover:border-[#087F8C] text-[#101A45] text-xl font-bold flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105"
                  >
                    +
                  </button>
                </div>

                {/* Visual Clinical Spectrum Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[10px] font-bold text-[#52616B]">
                    <span>Optimal (&lt; 5.7%)</span>
                    <span>Pre-diabetes (5.7–6.4%)</span>
                    <span>Elevated (&ge; 6.5%)</span>
                  </div>
                  <div className="h-3 w-full rounded-full flex overflow-hidden border border-slate-200 p-0.5 bg-slate-100">
                    <div className="h-full w-[28%] bg-emerald-400 rounded-l-full" title="Optimal" />
                    <div className="h-full w-[24%] bg-amber-400" title="Pre-diabetes" />
                    <div className="h-full w-[48%] bg-rose-400 rounded-r-full" title="Elevated" />
                  </div>
                </div>

                {/* Quick Preset Selector Buttons */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#52616B] uppercase tracking-wider mb-2">
                    Or Quick Select by Clinical Category:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: "Optimal / Normal", val: "5.4" },
                      { label: "Borderline", val: "5.8" },
                      { label: "Pre-diabetes", val: "6.2" },
                      { label: "Type 2 Diabetes", val: "6.8" },
                    ].map((preset) => {
                      const isSelected = Math.abs(currentHba1cNum - parseFloat(preset.val)) < 0.2;
                      return (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => setHba1c(preset.val)}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[#D5F3E7] border-[#087F8C] text-[#101A45] font-bold shadow-2xs scale-102"
                              : "bg-white border-[#C9D7DE] text-[#52616B] hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="text-xs font-bold">{preset.val}%</div>
                          <div className="text-[10px] opacity-80">{preset.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Recency Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200/80">
                  <div>
                    <label className="block text-xs font-semibold text-[#101A45] mb-1">
                      Test Recency / Timing
                    </label>
                    <select
                      value={hba1cTiming}
                      onChange={(e) => setHba1cTiming(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-[#087F8C] bg-white text-[#101A45]"
                    >
                      <option value="Within last 3 months">Within the last 3 months (Fresh laboratory draw)</option>
                      <option value="3-6 months ago">3 to 6 months ago</option>
                      <option value="Over 6 months ago">More than 6 months ago</option>
                      <option value="Estimated / Not tested recently">Estimated / Not tested recently (5.6% default)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#101A45] mb-1">
                      Approximate Test Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={hba1cTestDate}
                      onChange={(e) => setHba1cTestDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-[#087F8C] bg-white text-[#101A45]"
                    />
                  </div>
                </div>
              </div>

              {/* Information banner on why only HbA1c */}
              <div className="p-4 rounded-2xl bg-[#D5F3E7]/50 border border-[#087F8C]/20 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white border border-[#087F8C]/30 text-[#087F8C] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="text-xs text-[#101A45] space-y-1">
                  <span className="font-bold">Why does Pulse only ask about HbA1c?</span>
                  <p className="text-[#52616B] text-[11px] leading-relaxed">
                    HbA1c captures your 90-day average blood glucose with gold-standard laboratory precision. Instead of answering dozens of tedious medical questions, this single biomarker calibrated with your height and weight gives our clinical engine everything needed to generate your initial Metabolic Score and tailor safe glycemic recovery paths.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 3: HEALTH GOALS ================= */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#101A45]">Health Goals</h2>
                <p className="text-xs text-[#52616B] mt-1">
                  Select your primary objective and secondary lifestyle targets. Your care team tracks progress against these priorities.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#087F8C] uppercase tracking-wider mb-2">
                  Primary Metabolic Focus (Select 1-2 priorities)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {standardGoals.map((goal) => {
                    const isPrimary = primaryGoals.includes(goal);
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => togglePrimaryGoal(goal)}
                        className={`p-3.5 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                          isPrimary
                            ? "bg-[#087F8C] text-white border-[#087F8C] shadow-xs"
                            : "bg-white border-[#C9D7DE] text-[#101A45] hover:bg-slate-50"
                        }`}
                      >
                        <span>{goal}</span>
                        {isPrimary && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-semibold text-[#52616B] uppercase tracking-wider mb-2">
                  Secondary Wellness Goals (Optional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {standardGoals
                    .filter((g) => !primaryGoals.includes(g))
                    .map((goal) => {
                      const isSecondary = secondaryGoals.includes(goal);
                      return (
                        <button
                          key={goal}
                          type="button"
                          onClick={() => toggleSecondaryGoal(goal)}
                          className={`p-3 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                            isSecondary
                              ? "bg-[#D5F3E7] border-[#087F8C] text-[#101A45] font-semibold"
                              : "bg-slate-50/50 border-[#C9D7DE] text-[#52616B] hover:bg-slate-50"
                          }`}
                        >
                          <span>{goal}</span>
                          {isSecondary && <CheckCircle2 className="w-4 h-4 text-[#087F8C]" />}
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 4: FOOD & LIFESTYLE ================= */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#101A45]">Food & Lifestyle Rhythm</h2>
                <p className="text-xs text-[#52616B] mt-1">
                  Understanding your natural schedule allows passive algorithms to contextualize glycemic spikes without tedious food calorie weighing.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#101A45] uppercase tracking-wider mb-1">
                    Dietary Pattern
                  </label>
                  <select
                    value={dietaryPreference}
                    onChange={(e) => setDietaryPreference(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-[#087F8C] bg-white text-[#101A45]"
                  >
                    <option value="Mediterranean">Mediterranean / Whole Foods</option>
                    <option value="Low Carb">Low Carbohydrate / Ketogenic</option>
                    <option value="Omnivore">Standard Omnivore</option>
                    <option value="Plant-Based">Plant-Based / Vegetarian</option>
                    <option value="Intermittent Fasting">Intermittent Fasting (16:8)</option>
                    <option value="Other">Other / Individual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#101A45] uppercase tracking-wider mb-1">
                    Meal Frequency & Cadence
                  </label>
                  <input
                    type="text"
                    value={typicalMeals}
                    onChange={(e) => setTypicalMeals(e.target.value)}
                    placeholder="e.g. 3 meals daily, no snacking"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-[#087F8C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#101A45] uppercase tracking-wider mb-1">
                    Exercise Frequency
                  </label>
                  <select
                    value={exerciseFrequency}
                    onChange={(e) => setExerciseFrequency(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-[#087F8C] bg-white text-[#101A45]"
                  >
                    <option value="0-1 days/week">0–1 days/week (Sedentary)</option>
                    <option value="2-3 days/week">2–3 days/week (Light)</option>
                    <option value="3-4 days/week">3–4 days/week (Moderate)</option>
                    <option value="5+ days/week">5+ days/week (High activity)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#101A45] uppercase tracking-wider mb-1">
                    Typical Sleep Window
                  </label>
                  <input
                    type="text"
                    value={sleepSchedule}
                    onChange={(e) => setSleepSchedule(e.target.value)}
                    placeholder="e.g. 23:00 - 07:00 (approx 8 hours)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-[#087F8C]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#101A45] uppercase tracking-wider mb-1">
                    Smoking Status
                  </label>
                  <select
                    value={smokingStatus}
                    onChange={(e) => setSmokingStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-[#087F8C] bg-white text-[#101A45]"
                  >
                    <option value="never">Never smoked</option>
                    <option value="former">Former smoker</option>
                    <option value="current">Current smoker</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#101A45] uppercase tracking-wider mb-1">
                    Alcohol Consumption
                  </label>
                  <select
                    value={alcoholConsumption}
                    onChange={(e) => setAlcoholConsumption(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-[#087F8C] bg-white text-[#101A45]"
                  >
                    <option value="none">None / Abstinent</option>
                    <option value="occasional">Occasional (1–2 drinks/week)</option>
                    <option value="moderate">Moderate (3–6 drinks/week)</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ================= STEP 5: HEALTH DATA SOURCES ================= */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#101A45]">Health Data Integrations</h2>
                <p className="text-xs text-[#52616B] mt-1">
                  Connect your devices to enable passive continuous data collection. Selected providers automatically synchronize telemetry into your unified twin.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {providerCatalog.map((prov) => {
                  const isSelected = selectedProviders.includes(prov.key);
                  return (
                    <div
                      key={prov.key}
                      onClick={() => toggleProvider(prov.key)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                        isSelected
                          ? "bg-[#D5F3E7]/60 border-[#087F8C] shadow-2xs"
                          : "bg-white border-[#C9D7DE] hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-mono font-bold uppercase text-[#52616B]">
                            {prov.category}
                          </span>
                          <span className="text-[10px] font-semibold text-[#087F8C] bg-[#D5F3E7] px-2 py-0.5 rounded">
                            {prov.mockLabel}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-[#101A45]">{prov.name}</h4>
                        <p className="text-xs text-[#52616B] mt-1">{prov.desc}</p>
                      </div>

                      <div className="mt-4 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-xs font-medium text-[#52616B]">
                          {isSelected ? "Selected for Sync" : "Tap to Connect"}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-xs ${
                            isSelected ? "bg-[#087F8C]" : "border border-slate-300"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ================= STEP 6: CONSENT & SAFETY ================= */}
          {currentStep === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#101A45]">Explicit Data Consent</h2>
                <p className="text-xs text-[#52616B] mt-1">
                  Health data is deeply personal. Pulse requires explicit, opt-in consent before calculating your metabolic model.
                </p>
              </div>

              {/* Explanatory table */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-[#C9D7DE] space-y-3 text-xs text-[#52616B]">
                <div className="font-semibold text-[#101A45] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#087F8C]" />
                  Your Health Data Rights & Revocability
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px] pt-1">
                  <div>
                    <span className="font-bold text-[#101A45]">What is collected:</span>
                    <p className="text-[#52616B]">Continuous glucose, HbA1c, heart rate, sleep metrics, and activity.</p>
                  </div>
                  <div>
                    <span className="font-bold text-[#101A45]">Why it is collected:</span>
                    <p className="text-[#52616B]">To compute your Metabolic Health Score and calibrate glycemic routines.</p>
                  </div>
                  <div>
                    <span className="font-bold text-[#101A45]">How to disconnect:</span>
                    <p className="text-[#52616B]">Revoke permissions instantly anytime in your Connected Data dashboard settings.</p>
                  </div>
                </div>
              </div>

              {/* Required Non-prechecked checkboxes */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-[#C9D7DE] hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentTelemetry}
                    onChange={(e) => setConsentTelemetry(e.target.checked)}
                    className="rounded text-[#087F8C] focus:ring-[#087F8C] w-4 h-4 mt-0.5 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-[#101A45]">
                      I consent to the collection and analysis of passive health telemetry
                    </span>
                    <p className="text-[#52616B] text-[11px] mt-0.5">
                      Includes continuous metrics from authorized devices (glucose, steps, heart rate, sleep).
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-[#C9D7DE] hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentCareTeam}
                    onChange={(e) => setConsentCareTeam(e.target.checked)}
                    className="rounded text-[#087F8C] focus:ring-[#087F8C] w-4 h-4 mt-0.5 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-[#101A45]">
                      I consent to care team review and clinical advisory communications
                    </span>
                    <p className="text-[#52616B] text-[11px] mt-0.5">
                      Permits assigned metabolic coaches and clinicians to review physiological trends and message suggestions.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-xl border border-[#C9D7DE] hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={consentStorage}
                    onChange={(e) => setConsentStorage(e.target.checked)}
                    className="rounded text-[#087F8C] focus:ring-[#087F8C] w-4 h-4 mt-0.5 cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-[#101A45]">
                      I acknowledge the wellness scope and compliance advisories
                    </span>
                    <p className="text-[#52616B] text-[11px] mt-0.5">
                      I understand this platform does not replace emergency medical care or autonomous clinical diagnosis.
                    </p>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* ================= STEP 7: GENERATED METABOLIC SCORE ================= */}
          {currentStep === 7 && generatedScore && (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center max-w-xl mx-auto space-y-2">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D5F3E7] text-[#087F8C] text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  Metabolic Health Score Generated
                </div>
                <h2 className="text-3xl font-extrabold text-[#101A45]">
                  Your Initial Metabolic Score
                </h2>
                <p className="text-xs text-[#52616B]">
                  Calibrated from your HbA1c ({hba1c}%), body mass index, movement rhythm, and metabolic priorities.
                </p>
              </div>

              {/* Main Hero Score Gauge Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-white to-slate-50 border border-[#C9D7DE] shadow-xs text-center space-y-6">
                {/* Radial / Circular Score Dial */}
                <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      className="stroke-slate-100"
                      strokeWidth="8"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke={generatedScore.tierColor.ring}
                      strokeWidth="8"
                      strokeDasharray={2 * Math.PI * 40}
                      strokeDashoffset={2 * Math.PI * 40 * (1 - generatedScore.totalScore / 100)}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>

                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-black text-[#101A45] tracking-tight">
                      {generatedScore.totalScore}
                    </span>
                    <span className="text-xs font-bold text-[#52616B] uppercase tracking-wider">
                      out of 100
                    </span>
                  </div>
                </div>

                {/* Tier Classification Badge */}
                <div className="space-y-2">
                  <div
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-extrabold border shadow-2xs"
                    style={{
                      backgroundColor:
                        generatedScore.totalScore >= 85
                          ? "#D5F3E7"
                          : generatedScore.totalScore >= 70
                          ? "#E0F2FE"
                          : generatedScore.totalScore >= 50
                          ? "#FEF3C7"
                          : "#FCE7EB",
                      borderColor: generatedScore.tierColor.ring,
                      color:
                        generatedScore.totalScore >= 85
                          ? "#087F8C"
                          : generatedScore.totalScore >= 70
                          ? "#0369A1"
                          : generatedScore.totalScore >= 50
                          ? "#B45309"
                          : "#B4233B",
                    }}
                  >
                    <Activity className="w-4 h-4" />
                    <span>{generatedScore.tier}: {generatedScore.headline}</span>
                  </div>
                  <p className="text-xs text-[#52616B] max-w-lg mx-auto leading-relaxed">
                    {generatedScore.summary}
                  </p>
                </div>

                {/* 4-Part Clinical Biomarker Breakdown Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-200/80 text-left">
                  {/* 1. Glycemic / HbA1c */}
                  <div className="p-3.5 rounded-2xl bg-white border border-[#C9D7DE] space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#101A45] flex items-center gap-1.5">
                        <Droplet className="w-3.5 h-3.5 text-[#087F8C]" />
                        HbA1c Glycemic Stability
                      </span>
                      <span className="font-black text-[#087F8C]">
                        {generatedScore.breakdown.glycemicScore} / 40 pts
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-[#087F8C] h-1.5 rounded-full"
                        style={{ width: `${(generatedScore.breakdown.glycemicScore / 40) * 100}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-[#52616B]">
                      HbA1c: <strong>{hba1c}%</strong> • {generatedScore.breakdown.glycemicLabel}
                    </div>
                  </div>

                  {/* 2. BMI / Body Composition */}
                  <div className="p-3.5 rounded-2xl bg-white border border-[#C9D7DE] space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#101A45] flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-[#087F8C]" />
                        Body Composition (BMI)
                      </span>
                      <span className="font-black text-[#087F8C]">
                        {generatedScore.breakdown.bmiScore} / 25 pts
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-[#087F8C] h-1.5 rounded-full"
                        style={{ width: `${(generatedScore.breakdown.bmiScore / 25) * 100}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-[#52616B]">
                      BMI: <strong>{generatedScore.breakdown.bmiValue}</strong> ({heightCm}cm / {weightKg}kg)
                    </div>
                  </div>

                  {/* 3. Movement & Rest Rhythm */}
                  <div className="p-3.5 rounded-2xl bg-white border border-[#C9D7DE] space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#101A45] flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-[#087F8C]" />
                        Movement & Sleep Cadence
                      </span>
                      <span className="font-black text-[#087F8C]">
                        {generatedScore.breakdown.lifestyleScore} / 20 pts
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-[#087F8C] h-1.5 rounded-full"
                        style={{ width: `${(generatedScore.breakdown.lifestyleScore / 20) * 100}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-[#52616B]">
                      Exercise: {exerciseFrequency} • Sleep: {sleepSchedule}
                    </div>
                  </div>

                  {/* 4. Metabolic Focus & Diet */}
                  <div className="p-3.5 rounded-2xl bg-white border border-[#C9D7DE] space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#101A45] flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-[#087F8C]" />
                        Nutrition & Goals Alignment
                      </span>
                      <span className="font-black text-[#087F8C]">
                        {generatedScore.breakdown.intentionScore} / 15 pts
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5">
                      <div
                        className="bg-[#087F8C] h-1.5 rounded-full"
                        style={{ width: `${(generatedScore.breakdown.intentionScore / 15) * 100}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-[#52616B]">
                      Diet: {dietaryPreference} • Focus: {primaryGoals.slice(0, 1).join(", ")}
                    </div>
                  </div>
                </div>

                {/* 90-Day Projected Gain Card */}
                <div className="p-4 rounded-2xl bg-[#D5F3E7] border border-[#087F8C]/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#087F8C] text-white flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-[#101A45]">
                        90-Day Metabolic Potential Target: <span className="text-[#087F8C] font-black text-sm">{generatedScore.projectedTargetScore} / 100</span>
                      </div>
                      <div className="text-[11px] text-[#52616B]">
                        Members with your starting profile gain an average +{generatedScore.potentialGain} points through daily routine adherence and post-meal pacing.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actionable Clinical Recommendations */}
                <div className="text-left space-y-2 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#101A45]">
                    Your 3 Calibrated Starting Actions:
                  </span>
                  <div className="space-y-1.5">
                    {generatedScore.clinicalRecommendations.map((rec, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-[#52616B] bg-white p-2.5 rounded-xl border border-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-[#087F8C] shrink-0" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            {currentStep > 1 && currentStep <= 6 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl border border-[#C9D7DE] text-xs font-semibold text-[#101A45] hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : currentStep === 7 ? (
              <button
                type="button"
                onClick={handlePrev}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl border border-[#C9D7DE] text-xs font-semibold text-[#101A45] hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Review Details</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="button"
              disabled={saving}
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-[#101A45] hover:bg-[#101A45]/90 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <span>Generating Metabolic Score...</span>
              ) : currentStep === 7 ? (
                <>
                  <span>Enter Pulse Dashboard</span>
                  <CheckCircle2 className="w-4 h-4 text-[#D5F3E7]" />
                </>
              ) : currentStep === 6 ? (
                <>
                  <span>Generate Metabolic Score</span>
                  <Sparkles className="w-4 h-4 text-teal-300" />
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-3.5 h-3.5 text-teal-300" />
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      <div className="py-4 text-center text-xs text-slate-400">
        Pulse Health Platform • Encrypted & Isolated Tenant Architecture
      </div>
    </div>
  );
}
