"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Clock,
  Compass,
  AlertTriangle,
  CheckCircle2,
  X,
  ChevronRight,
  ShieldAlert,
  HeartHandshake,
  RefreshCw,
  Sliders,
  Send,
} from "lucide-react";
import { useCurrentLanguage } from "@/components/LanguageToggle";
import { InterventionDTO, BARRIER_CATALOG, BarrierCategory } from "@/services/proactiveCare/types";

interface NextSmallStepCardProps {
  onInterventionUpdated?: () => void;
}

export function NextSmallStepCard({ onInterventionUpdated }: NextSmallStepCardProps) {
  const lang = useCurrentLanguage();
  const [intervention, setIntervention] = useState<InterventionDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBarrierModal, setShowBarrierModal] = useState(false);
  const [selectedBarrier, setSelectedBarrier] = useState<BarrierCategory | "">("");
  const [freeText, setFreeText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const fetchCurrentIntervention = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/proactive-care/current");
      if (res.ok) {
        const data = await res.json();
        setIntervention(data.intervention || null);
      }
    } catch (err) {
      console.warn("Failed to load active intervention:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentIntervention();
  }, []);

  const handleDismiss = async () => {
    if (!intervention) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/proactive-care/${intervention.id}/dismiss`, {
        method: "POST",
      });
      if (res.ok) {
        setIntervention(null);
        setActionNotice(lang === "hi" ? "कोई बात नहीं! आप जब तैयार हों, तब कदम उठाएं।" : "No problem! Take your step whenever you're ready.");
        setTimeout(() => setActionNotice(null), 4000);
        onInterventionUpdated?.();
      }
    } catch (err) {
      console.error("Dismiss failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptOption = async (option: any) => {
    if (!intervention) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/proactive-care/${intervention.id}/accept-suggestion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          optionId: option.id,
          payload: option.payload,
        }),
      });

      if (res.ok) {
        setActionNotice(
          lang === "hi"
            ? "बहुत बढ़िया! आपकी योजना को आपके अनुकूल बना दिया गया है।"
            : "Great! Your plan has been adjusted to your needs."
        );
        fetchCurrentIntervention();
        setTimeout(() => setActionNotice(null), 5000);
        onInterventionUpdated?.();
      }
    } catch (err) {
      console.error("Option accept failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBarrier = async () => {
    if (!intervention || !selectedBarrier) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/proactive-care/${intervention.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barrier: selectedBarrier,
          freeText,
        }),
      });

      if (res.ok) {
        setShowBarrierModal(false);
        setSelectedBarrier("");
        setFreeText("");
        fetchCurrentIntervention();
        onInterventionUpdated?.();
      }
    } catch (err) {
      console.error("Barrier submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestHelp = async () => {
    if (!intervention) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/proactive-care/${intervention.id}/request-help`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Patient requested assistance via dashboard" }),
      });
      if (res.ok) {
        setActionNotice(
          lang === "hi"
            ? "केयर टीम को सूचित कर दिया गया है। वे आपसे जल्द संपर्क करेंगे।"
            : "Your care team has been notified for follow-up support."
        );
        fetchCurrentIntervention();
        setTimeout(() => setActionNotice(null), 5000);
      }
    } catch (err) {
      console.error("Request help failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center text-xs text-slate-400 gap-2">
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-600" />
        <span>Checking for personalized routine adjustments...</span>
      </div>
    );
  }

  if (actionNotice && !intervention) {
    return (
      <div className="p-4 rounded-2xl bg-teal-50/80 border border-teal-200 text-teal-900 text-xs font-semibold flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      </div>
    );
  }

  if (!intervention) {
    // If no active intervention, show gentle status
    return null;
  }

  const isSafety = intervention.interventionType === "SAFETY_ESCALATION";
  const title = lang === "hi" && intervention.titleHi ? intervention.titleHi : intervention.title;
  const message = lang === "hi" && intervention.messageHi ? intervention.messageHi : intervention.message;

  return (
    <>
      <section
        className={`relative overflow-hidden rounded-2xl border p-5 transition-all shadow-[0_1px_3px_rgba(16,26,69,0.04)] ${
          isSafety
            ? "bg-[#FCE7EB] border-[#F8B4C0] text-[#B4233B]"
            : "bg-[#D5F3E7] border-[#C9D7DE] text-[#101A45]"
        }`}
      >
        {/* Top Header Tag */}
        <div className="flex items-center justify-between gap-3 flex-wrap pb-3 border-b border-[#C9D7DE]/60 mb-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                isSafety ? "bg-[#B4233B] text-white" : "bg-[#087F8C] text-white shadow-xs"
              }`}
            >
              {isSafety ? <ShieldAlert className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div>
              <span className={`text-xs uppercase font-bold tracking-wider ${isSafety ? "text-[#B4233B]" : "text-[#101A45]"}`}>
                {isSafety
                  ? (lang === "hi" ? "सुरक्षा चेतावनी" : "Safety Alert")
                  : (lang === "hi" ? "आपके लिए एक सुझाव" : "Here's a suggestion for you")}
              </span>
              <span className="text-[10px] text-[#52616B] ml-2">
                • {intervention.triggerType.replace(/_/g, " ").toLowerCase()}
              </span>
            </div>
          </div>

          {!isSafety && (
            <button
              onClick={handleDismiss}
              disabled={submitting}
              className="text-xs text-[#52616B] hover:text-[#101A45] px-2.5 py-1 rounded-lg hover:bg-white/60 transition-colors cursor-pointer"
            >
              {lang === "hi" ? "अभी नहीं" : "Not now"}
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="space-y-2">
          <h3 className="text-base font-bold text-[#101A45] leading-snug">{title}</h3>
          <p className="text-sm text-[#52616B] leading-relaxed font-normal">{message}</p>

          {/* Explainable Reason Badge */}
          <div className="flex items-center gap-1.5 text-xs text-[#52616B] pt-1">
            <Compass className="w-4 h-4 text-[#087F8C] shrink-0" />
            <span className="italic">{intervention.explainableReason}</span>
          </div>
        </div>

        {/* Action Options */}
        <div className="flex items-center gap-3 pt-4 flex-wrap">
          {isSafety ? (
            <div className="w-full space-y-2">
              <div className="p-3 bg-white rounded-xl border border-[#F8B4C0] text-xs text-[#B4233B] space-y-1">
                <strong>{lang === "hi" ? "आपातकालीन संपर्क:" : "Emergency Contact:"}</strong>
                <div>{lang === "hi" ? "• भारत में 108 या 112 पर कॉल करें।" : "• Dial 108 or 112 emergency services in India."}</div>
                <div>{lang === "hi" ? "• किसी परिजन या डॉक्टर को तुरंत सूचित करें।" : "• Alert a caregiver or visit your nearest hospital."}</div>
              </div>
              <button
                onClick={handleRequestHelp}
                className="w-full py-2.5 bg-[#B4233B] hover:bg-[#8F1B2F] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                {lang === "hi" ? "केयर टीम को संदेश भेजें" : "Message Care Team Immediately"}
              </button>
            </div>
          ) : (
            <>
              {intervention.options.map((opt) => {
                if (opt.type === "EXPLAIN_BARRIER") {
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setShowBarrierModal(true)}
                      disabled={submitting}
                      className="px-4 py-2.5 bg-white border border-[#C9D7DE] hover:bg-[#F4F8FA] text-[#101A45] rounded-xl text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5 text-[#087F8C]" />
                      <span>{lang === "hi" && opt.labelHi ? opt.labelHi : opt.labelEn}</span>
                    </button>
                  );
                }

                if (opt.type === "REQUEST_HELP") {
                  return (
                    <button
                      key={opt.id}
                      onClick={handleRequestHelp}
                      disabled={submitting}
                      className="px-4 py-2.5 bg-white border border-[#C9D7DE] hover:bg-[#F4F8FA] text-[#101A45] rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <HeartHandshake className="w-3.5 h-3.5 text-[#087F8C]" />
                      <span>{lang === "hi" && opt.labelHi ? opt.labelHi : opt.labelEn}</span>
                    </button>
                  );
                }

                if (opt.type === "DISMISS") {
                  return (
                    <button
                      key={opt.id}
                      onClick={handleDismiss}
                      disabled={submitting}
                      className="px-3.5 py-2.5 text-[#52616B] hover:text-[#101A45] text-xs font-medium transition-colors cursor-pointer"
                    >
                      {lang === "hi" && opt.labelHi ? opt.labelHi : opt.labelEn}
                    </button>
                  );
                }

                // Default primary action: Navy button matching screenshot
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleAcceptOption(opt)}
                    disabled={submitting}
                    className="px-5 py-2.5 bg-[#101A45] hover:bg-[#182766] text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4 text-[#D5F3E7]" />
                    <span>{lang === "hi" && opt.labelHi ? opt.labelHi : opt.labelEn}</span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* 5-Step Workflow Footer Bar (Detect, Understand, Adjust, Support, Recover) */}
        <div className="pt-4 mt-3 border-t border-[#C9D7DE]/60 flex items-center justify-around text-[10px] text-[#52616B] font-medium">
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#087F8C]" /> Detect</span>
          <span className="text-[#C9D7DE]">›</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#087F8C]" /> Understand</span>
          <span className="text-[#C9D7DE]">›</span>
          <span className="flex items-center gap-1 font-bold text-[#101A45]"><span className="w-2 h-2 rounded-full bg-[#087F8C]" /> Adjust</span>
          <span className="text-[#C9D7DE]">›</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#52616B]" /> Support</span>
          <span className="text-[#C9D7DE]">›</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#52616B]" /> Recover</span>
        </div>
      </section>

      {/* Barrier Explanation Modal */}
      {showBarrierModal && (
        <div className="fixed inset-0 z-50 bg-[#101A45]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-[#C9D7DE]">
            <div className="flex items-center justify-between pb-3 border-b border-[#C9D7DE]/60">
              <div>
                <h3 className="text-base font-bold text-[#101A45]">
                  {lang === "hi" ? "आज क्या बात आड़े आई?" : "What got in the way today?"}
                </h3>
                <p className="text-xs text-[#52616B] mt-0.5">
                  {lang === "hi"
                    ? "दैनिक जीवन में व्यस्तता स्वाभाविक है। हम कोई दोष या अंक नहीं घटाते।"
                    : "Life gets busy sometimes. We never judge or penalize your progress."}
                </p>
              </div>
              <button
                onClick={() => setShowBarrierModal(false)}
                className="p-1.5 rounded-lg text-[#52616B] hover:text-[#101A45] hover:bg-[#DCE8EC]/50 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Barrier Chips */}
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {BARRIER_CATALOG.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBarrier(b.id)}
                  type="button"
                  className={`p-3 rounded-xl text-left border text-xs transition-all cursor-pointer ${
                    selectedBarrier === b.id
                      ? "bg-[#DCE8EC] border-[#087F8C] text-[#101A45] font-bold shadow-xs"
                      : "bg-white border-[#C9D7DE] hover:bg-[#F4F8FA] text-[#52616B]"
                  }`}
                >
                  <div className="leading-tight">{lang === "hi" ? b.labelHi : b.labelEn}</div>
                </button>
              ))}
            </div>

            {/* Optional Free Text Note */}
            <div>
              <label className="block text-xs font-semibold text-[#101A45] mb-1">
                {lang === "hi" ? "वैकल्पिक विवरण (यदि साझा करना चाहें):" : "Optional details (if you'd like to share):"}
              </label>
              <textarea
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                rows={2}
                placeholder={lang === "hi" ? "जैसे: आज ऑफिस में देर हो गई थी..." : "e.g. Worked late today..."}
                className="w-full text-xs p-3 rounded-xl border border-[#C9D7DE] focus:outline-none focus:ring-2 focus:ring-[#087F8C] text-[#101A45] placeholder-[#52616B]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#C9D7DE]/60">
              <button
                onClick={() => setShowBarrierModal(false)}
                className="px-4 py-2 text-xs font-medium text-[#52616B] hover:text-[#101A45] rounded-xl hover:bg-[#DCE8EC]/40 cursor-pointer"
              >
                {lang === "hi" ? "रद्द करें" : "Cancel"}
              </button>
              <button
                onClick={handleSubmitBarrier}
                disabled={!selectedBarrier || submitting}
                className="px-5 py-2.5 bg-[#101A45] hover:bg-[#182766] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{lang === "hi" ? "साझा करें और समायोजन देखें" : "Share & See Adjustments"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
