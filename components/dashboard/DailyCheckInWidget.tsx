"use client";

import { useState } from "react";
import { Smile, CheckCircle2, Sparkles, ArrowRight, Heart } from "lucide-react";

interface DailyCheckInWidgetProps {
  onCheckInComplete?: () => void;
  initialMood?: string | null;
}

export function DailyCheckInWidget({
  onCheckInComplete,
  initialMood = null,
}: DailyCheckInWidgetProps) {
  const [selectedMood, setSelectedMood] = useState<string | null>(initialMood);
  const [submitted, setSubmitted] = useState(Boolean(initialMood));
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");

  const moods = [
    { label: "Great", emoji: "⚡", color: "hover:border-emerald-500 hover:bg-emerald-50 text-emerald-700" },
    { label: "Good", emoji: "🌿", color: "hover:border-teal-500 hover:bg-teal-50 text-teal-700" },
    { label: "Okay", emoji: "🌤️", color: "hover:border-amber-500 hover:bg-amber-50 text-amber-700" },
    { label: "Low", emoji: "🌧️", color: "hover:border-blue-500 hover:bg-blue-50 text-blue-700" },
    { label: "Bad", emoji: "🛑", color: "hover:border-rose-500 hover:bg-rose-50 text-rose-700" },
  ];

  const handleSelectMood = async (mood: string) => {
    setSelectedMood(mood);
    setSubmitting(true);
    try {
      await fetch("/api/health/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, note }),
      });
      setSubmitted(true);
      if (onCheckInComplete) onCheckInComplete();
    } catch {
      // Graceful
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#C9D7DE] shadow-[0_1px_3px_rgba(16,26,69,0.04)] space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#087F8C]" />
            <h3 className="font-bold text-base text-[#101A45]">Daily Health Rhythm</h3>
            <span className="text-[10px] uppercase font-bold text-[#087F8C] bg-[#D5F3E7] px-2.5 py-0.5 rounded-full border border-[#C9D7DE]">
              30-Second Check
            </span>
          </div>
          <p className="text-xs text-[#52616B]">
            Passive sleep & steps data are in. How is your energy and vitality feeling right now?
          </p>
        </div>

        {submitted ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#D5F3E7] text-[#101A45] border border-[#C9D7DE] rounded-full text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#087F8C]" />
            Logged as {selectedMood}
          </span>
        ) : (
          <span className="text-xs text-[#52616B] font-medium">Quick 1-tap entry</span>
        )}
      </div>

      {/* Mood choices */}
      {!submitted ? (
        <div className="grid grid-cols-5 gap-2 pt-1">
          {moods.map((m) => (
            <button
              key={m.label}
              disabled={submitting}
              onClick={() => handleSelectMood(m.label)}
              className="p-3 rounded-xl border border-[#C9D7DE] bg-white hover:bg-[#F4F8FA] hover:border-[#087F8C] flex flex-col items-center justify-center transition-all group cursor-pointer"
            >
              <span className="text-xl group-hover:scale-110 transition-transform mb-1">
                {m.emoji}
              </span>
              <span className="text-xs font-semibold text-[#101A45]">{m.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="p-4 bg-[#D5F3E7] rounded-xl border border-[#C9D7DE] flex items-center justify-between text-xs text-[#101A45]">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#087F8C] shrink-0" />
            <span>
              <strong>Recommended Action:</strong> You achieved 72% of your activity target. A light 12-minute post-meal walk will optimize your afternoon glucose clearance.
            </span>
          </div>
          <button
            onClick={() => setSubmitted(false)}
            className="text-xs text-[#087F8C] hover:underline font-bold shrink-0 ml-3 cursor-pointer"
          >
            Change
          </button>
        </div>
      )}
    </div>
  );
}
