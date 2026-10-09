"use client";

import { useState } from "react";
import { X, ShieldAlert, CheckCircle2 } from "lucide-react";
import { ReportCategory } from "@/services/community/types";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  contentType: "POST" | "COMMENT";
  contentId: string;
  lang?: "hi" | "en";
}

export function ReportModal({ isOpen, onClose, contentType, contentId, lang = "hi" }: ReportModalProps) {
  const [category, setCategory] = useState<ReportCategory>("DANGEROUS_MEDICAL_ADVICE");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/community/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          contentId,
          category,
          description,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to submit report");
      }

      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1800);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {lang === "hi" ? "सामग्री रिपोर्ट करें" : "Report Content"}
              </h3>
              <p className="text-[11px] text-slate-500">
                {lang === "hi" ? "समुदाय को सुरक्षित और सहायक बनाए रखने में मदद करें" : "Help keep our community safe and supportive"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-slate-800">
              {lang === "hi" ? "रिपोर्ट दर्ज कर ली गई है" : "Report Submitted"}
            </h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {lang === "hi"
                ? "धन्यवाद। एक मॉडरेटर जल्द ही इसकी समीक्षा करेगा। आपकी पहचान अन्य सदस्यों को नहीं दिखाई जाएगी।"
                : "Thank you. A moderator will review this shortly. Your identity remains private from peers."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {lang === "hi" ? "चिंता का कारण चुनें" : "Reason for Concern"}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ReportCategory)}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              >
                <option value="DANGEROUS_MEDICAL_ADVICE">
                  {lang === "hi" ? "खतरनाक मेडिकल सलाह या दवा बदलाव" : "Potentially dangerous medical advice"}
                </option>
                <option value="MISINFORMATION">
                  {lang === "hi" ? "भ्रामक दावे या गारंटीड इलाज का दावा" : "Misinformation presented as fact / Cure claims"}
                </option>
                <option value="HARASSMENT">
                  {lang === "hi" ? "उत्पीड़न, गाली-गलौज या अपमानजनक भाषा" : "Harassment or bullying"}
                </option>
                <option value="SPAM">
                  {lang === "hi" ? "स्पैम, विज्ञापन या पैसे की मांग" : "Spam or commercial promotion"}
                </option>
                <option value="PRIVACY_VIOLATION">
                  {lang === "hi" ? "व्यक्तिगत जानकारी या गोपनीयता का उल्लंघन" : "Privacy violation"}
                </option>
                <option value="OTHER">
                  {lang === "hi" ? "अन्य चिंता" : "Other concern"}
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {lang === "hi" ? "अतिरिक्त विवरण (वैकल्पिक)" : "Additional Details (Optional)"}
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={lang === "hi" ? "कृपया संक्षेप में बताएं कि यह सामग्री क्यों अनुचित है..." : "Briefly explain why this content seems inappropriate..."}
                rows={3}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                maxLength={500}
              />
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-[11px] text-slate-500 leading-relaxed border border-slate-100">
              🔒 {lang === "hi"
                ? "आपकी रिपोर्ट पूरी तरह गोपनीय है। अन्य समूह सदस्यों को यह नहीं पता चलेगा कि रिपोर्ट किसने की है।"
                : "Your report is completely confidential. Other members will never see who reported this."}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                {lang === "hi" ? "रद्द करें" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors disabled:opacity-50"
              >
                {submitting ? (lang === "hi" ? "भेज रहे हैं..." : "Submitting...") : (lang === "hi" ? "रिपोर्ट भेजें" : "Submit Report")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
