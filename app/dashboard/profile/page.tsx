"use client";

import { useEffect, useState } from "react";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SafetyBanner } from "@/components/layout/SafetyBanner";
import {
  User,
  ShieldCheck,
  CheckCircle2,
  Settings,
  Bell,
  UtensilsCrossed,
  Clock,
  Globe,
  Save,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useCurrentLanguage } from "@/components/LanguageToggle";
import { getDictionary } from "@/lib/i18n";

export default function ProfilePage() {
  const currentLang = useCurrentLanguage();
  const t = getDictionary(currentLang);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"personal" | "lifestyle" | "notifications" | "consent">("personal");

  // Editable Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [preferredLang, setPreferredLang] = useState<"hi" | "en">("hi");
  const [country, setCountry] = useState("India");
  const [heightCm, setHeightCm] = useState("178");
  const [weightKg, setWeightKg] = useState("75.4");

  // Lifestyle / Dietary Preferences
  const [dietaryPreference, setDietaryPreference] = useState("Mediterranean/Indian balanced");
  const [mealTiming, setMealTiming] = useState("Lunch 13:00, Dinner 20:30");
  const [typicalMeals, setTypicalMeals] = useState("Whole wheat roti, dal, sabzi, low GI grains");
  const [exerciseFrequency, setExerciseFrequency] = useState("5 days/week post-meal walking");

  // Notification Preferences
  const [preferredReminderTime, setPreferredReminderTime] = useState("13:30");
  const [quietHoursStart, setQuietHoursStart] = useState("22:00");
  const [quietHoursEnd, setQuietHoursEnd] = useState("07:00");
  const [pushEnabled, setPushEnabled] = useState(true);

  // Medical and Consents (Read-only clinical)
  const [medical, setMedical] = useState<any>(null);
  const [consents, setConsents] = useState<any[]>([]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/profile");
      const data = await res.json();
      if (data.profile) {
        const p = data.profile;
        setName(p.name || "");
        setEmail(p.email || "");
        if (p.preferredLang === "hi" || p.preferredLang === "en") {
          setPreferredLang(p.preferredLang);
        }
        if (p.details) {
          setCountry(p.details.country || "India");
          if (p.details.heightCm) setHeightCm(String(p.details.heightCm));
          if (p.details.weightKg) setWeightKg(String(p.details.weightKg));
        }
        if (p.patientProfile) {
          if (p.patientProfile.preferredReminderTime) {
            setPreferredReminderTime(p.patientProfile.preferredReminderTime);
          }
        }
        if (p.lifestyle) {
          setDietaryPreference(p.lifestyle.dietaryPreference || "Mediterranean/Indian balanced");
          setMealTiming(p.lifestyle.mealTiming || "Lunch 13:00, Dinner 20:30");
          setTypicalMeals(p.lifestyle.typicalMeals || "Whole wheat roti, dal, sabzi, low GI grains");
          setExerciseFrequency(p.lifestyle.exerciseFrequency || "5 days/week post-meal walking");
        }
        if (p.proactivePreference) {
          setQuietHoursStart(p.proactivePreference.quietHoursStart || "22:00");
          setQuietHoursEnd(p.proactivePreference.quietHoursEnd || "07:00");
          setPushEnabled(p.proactivePreference.pushEnabled ?? true);
        }
        setMedical(p.medical);
        setConsents(p.consents || []);
      }
    } catch (err) {
      console.error("Profile load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          preferredLang,
          country,
          heightCm: parseFloat(heightCm) || undefined,
          weightKg: parseFloat(weightKg) || undefined,
          preferredReminderTime,
          dietaryPreference,
          mealTiming,
          typicalMeals,
          exerciseFrequency,
          quietHoursStart,
          quietHoursEnd,
          pushEnabled,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSaveMessage(currentLang === "hi" ? "प्राथमिकताएं सफलतापूर्वक सहेजी गईं!" : "Preferences updated successfully!");

        // Update local language if changed
        if (typeof window !== "undefined") {
          localStorage.setItem("pulse_lang", preferredLang);
          window.dispatchEvent(new Event("pulse_language_changed"));
        }

        setTimeout(() => setSaveMessage(null), 3500);
      } else {
        setSaveMessage("Error updating preferences. Please try again.");
      }
    } catch (err) {
      setSaveMessage("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      <DesktopSidebar userName={name} />

      <div className="flex-1 flex flex-col min-h-screen pb-20 lg:pb-8">
        <SafetyBanner compact />

        <header className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-5">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5" />
                {currentLang === "hi" ? "प्रोफ़ाइल व प्राथमिकताएं" : "Profile & Preferences"}
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
                {currentLang === "hi" ? "व्यक्तिगत स्वास्थ्य प्रोफ़ाइल" : "Unified Health Profile"}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentLang === "hi"
                  ? "अपनी भाषा, आहार वरीयता, रिमाइंडर समय और साझाकरण प्राथमिकताओं को प्रबंधित करें।"
                  : "Manage your language, dietary preferences, reminder times, and synchronized health settings."}
              </p>
            </div>

            {saveMessage && (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>{saveMessage}</span>
              </div>
            )}
          </div>
        </header>

        <main className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
            {[
              { key: "personal", label: currentLang === "hi" ? "व्यक्तिगत व भाषा" : "Personal & Language" },
              { key: "lifestyle", label: currentLang === "hi" ? "आहार व दिनचर्या" : "Food & Lifestyle" },
              { key: "notifications", label: currentLang === "hi" ? "रिमाइंडर व अलर्ट" : "Reminders & Alerts" },
              { key: "consent", label: currentLang === "hi" ? "सहमति व नैदानिक रिकॉर्ड" : "Consents & Medical" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                  activeTab === tab.key
                    ? "bg-teal-600 text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading profile data...</div>
          ) : (
            <form onSubmit={handleSavePreferences} className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
              {/* TAB 1: PERSONAL & LANGUAGE */}
              {activeTab === "personal" && (
                <div className="space-y-5">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-teal-600" />
                    <span>{currentLang === "hi" ? "व्यक्तिगत जानकारी व भाषा" : "Personal Baseline & Language"}</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        {currentLang === "hi" ? "पूरा नाम" : "Full Name"}
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        {currentLang === "hi" ? "ईमेल खाता (अपरिवर्तनीय)" : "Email Account (Read-only)"}
                      </label>
                      <input
                        type="email"
                        value={email}
                        disabled
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-xs cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-teal-600" />
                        <span>{currentLang === "hi" ? "प्राथमिक भाषा (App Language)" : "Preferred App Language"}</span>
                      </label>
                      <select
                        value={preferredLang}
                        onChange={(e) => setPreferredLang(e.target.value as "hi" | "en")}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500 focus:outline-hidden bg-white"
                      >
                        <option value="hi">हिंदी (Hindi-First)</option>
                        <option value="en">English</option>
                      </select>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {currentLang === "hi"
                          ? "भाषा बदलने पर सभी नेविगेशन और शैक्षिक मॉड्यूल तुरंत अपडेट हो जाएंगे।"
                          : "Changing language immediately updates navigation labels and educational modules."}
                      </p>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        {currentLang === "hi" ? "देश / क्षेत्र" : "Country / Region"}
                      </label>
                      <input
                        type="text"
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        {currentLang === "hi" ? "ऊंचाई (सेमी)" : "Height (cm)"}
                      </label>
                      <input
                        type="number"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        {currentLang === "hi" ? "वजन (किलो)" : "Weight (kg)"}
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={weightKg}
                        onChange={(e) => setWeightKg(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: LIFESTYLE & FOOD */}
              {activeTab === "lifestyle" && (
                <div className="space-y-5">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-teal-600" />
                    <span>{currentLang === "hi" ? "आहार व दिनचर्या प्राथमिकताएं" : "Dietary & Lifestyle Context"}</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        {currentLang === "hi" ? "आहार शैली (Dietary Pattern)" : "Dietary Pattern"}
                      </label>
                      <input
                        type="text"
                        value={dietaryPreference}
                        onChange={(e) => setDietaryPreference(e.target.value)}
                        placeholder="e.g. Vegetarian, Diabetic plate, Low carb"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500 focus:outline-hidden"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        {currentLang === "hi"
                          ? "पल्स फूड एआई और मील कोच इसका उपयोग संतुलित भोजन सुझाव देने में करेंगे।"
                          : "Pulse Food AI uses this to tailor balanced plate suggestions."}
                      </p>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        {currentLang === "hi" ? "भोजन समय (Meal Timing)" : "Meal Timing Window"}
                      </label>
                      <input
                        type="text"
                        value={mealTiming}
                        onChange={(e) => setMealTiming(e.target.value)}
                        placeholder="e.g. Lunch 13:00, Dinner 20:30"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500 focus:outline-hidden"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-semibold text-slate-700 block mb-1">
                        {currentLang === "hi" ? "विशिष्ट दैनिक भोजन" : "Typical Everyday Meals"}
                      </label>
                      <input
                        type="text"
                        value={typicalMeals}
                        onChange={(e) => setTypicalMeals(e.target.value)}
                        placeholder="e.g. Whole wheat roti, dal, sabzi, low GI grains"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500 focus:outline-hidden"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="font-semibold text-slate-700 block mb-1">
                        {currentLang === "hi" ? "शारीरिक गतिविधि दिनचर्या" : "Physical Activity Habits"}
                      </label>
                      <input
                        type="text"
                        value={exerciseFrequency}
                        onChange={(e) => setExerciseFrequency(e.target.value)}
                        placeholder="e.g. 5 days/week post-meal walking"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500 focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: REMINDERS & NOTIFICATIONS */}
              {activeTab === "notifications" && (
                <div className="space-y-5">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Bell className="w-4 h-4 text-teal-600" />
                    <span>{currentLang === "hi" ? "रिमाइंडर व अलर्ट सेटिंग्स" : "Reminders & Proactive Care Policy"}</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="font-semibold text-slate-700 block mb-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        <span>{currentLang === "hi" ? "दैनिक मुख्य लक्ष्य समय" : "Primary Scheduled Action Time"}</span>
                      </label>
                      <input
                        type="text"
                        value={preferredReminderTime}
                        onChange={(e) => setPreferredReminderTime(e.target.value)}
                        placeholder="13:30"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500 focus:outline-hidden"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        {currentLang === "hi" ? "होम स्क्रीन और चेक-इन कार्ड पर यह समय दिखेगा।" : "Displayed on your Home primary action card."}
                      </p>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        {currentLang === "hi" ? "शांत घंटे (Quiet Hours Start)" : "Quiet Hours Start (No Reminders)"}
                      </label>
                      <input
                        type="text"
                        value={quietHoursStart}
                        onChange={(e) => setQuietHoursStart(e.target.value)}
                        placeholder="22:00"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 block mb-1">
                        {currentLang === "hi" ? "शांत घंटे समाप्ति (Quiet Hours End)" : "Quiet Hours End"}
                      </label>
                      <input
                        type="text"
                        value={quietHoursEnd}
                        onChange={(e) => setQuietHoursEnd(e.target.value)}
                        placeholder="07:00"
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500 focus:outline-hidden"
                      />
                    </div>

                    <div className="flex items-center gap-3 pt-4">
                      <input
                        type="checkbox"
                        id="pushEnabled"
                        checked={pushEnabled}
                        onChange={(e) => setPushEnabled(e.target.checked)}
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                      />
                      <label htmlFor="pushEnabled" className="font-semibold text-slate-700 cursor-pointer">
                        {currentLang === "hi" ? "इन-ऐप व पुश रिमाइंडर सक्षम करें" : "Enable In-App & Push Routine Reminders"}
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: MEDICAL & CONSENTS */}
              {activeTab === "consent" && (
                <div className="space-y-5">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    <span>{currentLang === "hi" ? "नैदानिक पृष्ठभूमि व कानूनी सहमति" : "Clinical Context & Consents"}</span>
                  </h3>

                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900">
                    <strong>{currentLang === "hi" ? "क्लिनिकल सुरक्षा सीमा:" : "Clinical Authority Note:"}</strong>{" "}
                    {currentLang === "hi"
                      ? "दवाएं, इंसुलिन खुराक और नैदानिक निदान केवल आपके डॉक्टर द्वारा प्रबंधित किए जाते हैं।"
                      : "Prescribed medications, insulin dosing, and clinical diagnoses are managed exclusively by your care team."}
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="font-semibold text-slate-700 mb-1">
                        {currentLang === "hi" ? "निगरानी की जाने वाली स्थितियाँ:" : "Monitored Conditions:"}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(medical?.existingConditions || ["Type 2 Diabetes"]).map((c: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 font-medium text-slate-800">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="font-semibold text-slate-700 mb-1">
                        {currentLang === "hi" ? "वर्तमान दवाएं:" : "Current Medications:"}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(medical?.currentMedications || ["Metformin 500mg BID"]).map((m: string, i: number) => (
                          <span key={i} className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 font-medium text-slate-800">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="font-semibold text-slate-700 mb-2">
                        {currentLang === "hi" ? "सक्रिय कानूनी व डेटा सहमति:" : "Active Data Consents:"}
                      </div>
                      <div className="space-y-2">
                        {consents.map((c) => (
                          <div
                            key={c.id}
                            className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                              <div>
                                <span className="font-bold text-slate-900 capitalize">
                                  {c.providerKey.replace("_", " ")}
                                </span>
                                <p className="text-[11px] text-slate-500 mt-0.5">{c.purpose}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                              {formatDate(c.consentedAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Form Footer Save Button */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  {currentLang === "hi" ? "परिवर्तन सहेजने पर सभी मॉड्यूल में लागू होंगे।" : "Changes will propagate across all relevant modules."}
                </p>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? (currentLang === "hi" ? "सहेजा जा रहा है..." : "Saving...") : (currentLang === "hi" ? "प्राथमिकताएं सहेजें" : "Save Preferences")}</span>
                </button>
              </div>
            </form>
          )}
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
