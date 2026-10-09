"use client";

import { useEffect, useState } from "react";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SafetyBanner } from "@/components/layout/SafetyBanner";
import { TimelineEvent } from "@/types/health";
import {
  Activity,
  Droplet,
  Heart,
  Moon,
  Footprints,
  Stethoscope,
  Clock,
  Filter,
  CheckCircle2,
  Calendar,
} from "lucide-react";

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/health/timeline")
      .then((res) => res.json())
      .then((data) => {
        if (data.events) setEvents(data.events);
      })
      .catch((err) => console.error("Timeline load error:", err))
      .finally(() => setLoading(false));
  }, []);

  const categories = [
    { key: "all", label: "All Sources" },
    { key: "glucose", label: "Glucose / CGM" },
    { key: "sleep", label: "Sleep" },
    { key: "heart", label: "Heart Rate" },
    { key: "activity", label: "Movement & Steps" },
  ];

  const filteredEvents =
    selectedCategory === "all"
      ? events
      : events.filter((e) => e.category === selectedCategory);

  const getEventIcon = (cat: string) => {
    switch (cat) {
      case "glucose":
        return <Droplet className="w-4 h-4 text-teal-600" />;
      case "sleep":
        return <Moon className="w-4 h-4 text-indigo-600" />;
      case "heart":
        return <Heart className="w-4 h-4 text-rose-600" />;
      case "activity":
        return <Footprints className="w-4 h-4 text-amber-600" />;
      default:
        return <Activity className="w-4 h-4 text-slate-600" />;
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
              Longitudinal Health Journal
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Continuous Health Timeline
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological log of passive sensor telemetry, nutritional windows, and care team checkpoints.
            </p>
          </div>
        </header>

        <main className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1 shrink-0 mr-1">
              <Filter className="w-3.5 h-3.5" />
              Filter by:
            </span>
            {categories.map((c) => (
              <button
                key={c.key}
                onClick={() => setSelectedCategory(c.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-colors ${
                  selectedCategory === c.key
                    ? "bg-teal-600 text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Timeline Feed */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
            {loading ? (
              <div className="py-12 text-center text-xs text-slate-400">
                Loading continuous health events...
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No events recorded for this category yet.
              </div>
            ) : (
              <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-8">
                {filteredEvents.map((evt) => (
                  <div key={evt.id} className="relative group">
                    {/* Timeline Node Point */}
                    <div className="absolute -left-[35px] top-1 w-6 h-6 rounded-full bg-white border-2 border-teal-500 flex items-center justify-center shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-teal-600" />
                    </div>

                    <div className="bg-slate-50/70 hover:bg-slate-50 p-4 rounded-2xl border border-slate-200/80 transition-all">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {evt.timeFormatted}
                          </span>
                          <h3 className="font-bold text-sm text-slate-900">{evt.title}</h3>
                        </div>

                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border self-start sm:self-auto ${evt.badgeColor}`}>
                          {evt.sourceLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600 mt-1">
                        {getEventIcon(evt.category)}
                        <span>{evt.subtitle}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
