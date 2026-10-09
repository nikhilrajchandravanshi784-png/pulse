"use client";

import { useEffect, useState } from "react";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SafetyBanner } from "@/components/layout/SafetyBanner";
import { HealthInsight } from "@/types/health";
import {
  Sparkles,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Stethoscope,
  Info,
} from "lucide-react";

export default function InsightsPage() {
  const [insights, setInsights] = useState<HealthInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/insights")
      .then((res) => res.json())
      .then((data) => {
        if (data.insights) setInsights(data.insights);
      })
      .catch((err) => console.error("Insights load error:", err))
      .finally(() => setLoading(false));
  }, []);

  const getTypeBadge = (type: HealthInsight["type"]) => {
    switch (type) {
      case "OBSERVATION":
        return {
          label: "DATA OBSERVATION",
          style: "bg-teal-50 text-teal-800 border-teal-200",
          icon: TrendingUp,
        };
      case "RECOMMENDATION":
        return {
          label: "WELLNESS RECOMMENDATION",
          style: "bg-indigo-50 text-indigo-800 border-indigo-200",
          icon: Sparkles,
        };
      case "MILESTONE":
        return {
          label: "HEALTH MILESTONE",
          style: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: CheckCircle2,
        };
      case "SAFETY_ALERT":
        return {
          label: "MEDICAL SAFETY ADVISORY",
          style: "bg-amber-50 text-amber-800 border-amber-200",
          icon: AlertCircle,
        };
      default:
        return {
          label: "INSIGHT",
          style: "bg-slate-50 text-slate-700 border-slate-200",
          icon: Info,
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row font-sans">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col min-h-screen pb-20 lg:pb-8">
        <SafetyBanner compact />

        <header className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-5">
          <div className="max-w-4xl mx-auto">
            <span className="text-xs font-semibold text-teal-700 uppercase tracking-wider">
              Algorithmic Telemetry Synthesis
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Personalized Health Insights
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Grounded in continuous physiological observations. Clearly segregated between data observations and wellness recommendations.
            </p>
          </div>
        </header>

        <main className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6">
          {/* Clinical Classification Legend */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              Insight Classification Standards:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 font-semibold border border-teal-200 text-[11px]">
                Data Observation
              </span>
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 font-semibold border border-indigo-200 text-[11px]">
                Wellness Recommendation
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200 text-[11px]">
                Medical Safety Advisory
              </span>
            </div>
          </div>

          {/* Insights Cards List */}
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Synthesizing latest telemetry insights...
            </div>
          ) : insights.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200 p-8">
              No insights generated yet. Connect a health data stream to begin receiving continuous observations.
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight) => {
                const badge = getTypeBadge(insight.type);
                const BadgeIcon = badge.icon;

                return (
                  <div
                    key={insight.id}
                    className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3 hover:border-teal-200 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border w-fit ${badge.style}`}>
                        <BadgeIcon className="w-3.5 h-3.5" />
                        <span>{badge.label}</span>
                      </span>

                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                        <span>Relevance Impact:</span>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span
                              key={star}
                              className={`w-2 h-2 rounded-full ${
                                star <= insight.impactScore ? "bg-teal-500" : "bg-slate-200"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{insight.title}</h3>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {insight.description}
                    </p>

                    {/* Non-diagnostic Disclaimer per Section 29 */}
                    <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-400">
                      <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{insight.disclaimer}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Clinical Care Escalation Box */}
          <div className="p-5 rounded-2xl bg-teal-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-teal-300" />
                Need Personalized Clinical Guidance?
              </h4>
              <p className="text-xs text-teal-100 max-w-xl">
                Observations from wearable sensors are purely informational. For medication adjustments or clinical diagnosis, your care team is available via secure messaging.
              </p>
            </div>
            <a
              href="/dashboard/care"
              className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-xl shrink-0 transition-colors"
            >
              Contact Care Team
            </a>
          </div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
