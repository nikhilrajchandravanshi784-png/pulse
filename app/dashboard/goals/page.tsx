"use client";

import { useEffect, useState } from "react";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SafetyBanner } from "@/components/layout/SafetyBanner";
import { HealthGoalItem } from "@/types/health";
import {
  Target,
  Plus,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
} from "lucide-react";

export default function GoalsPage() {
  const [goals, setGoals] = useState<HealthGoalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("metabolic");
  const [isPrimary, setIsPrimary] = useState(false);
  const [adding, setAdding] = useState(false);

  const fetchGoals = async () => {
    try {
      const res = await fetch("/api/goals");
      const data = await res.json();
      if (data.goals) setGoals(data.goals);
    } catch (err) {
      console.error("Goals error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    setAdding(true);
    try {
      await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          category: newCategory,
          isPrimary,
        }),
      });
      setNewTitle("");
      await fetchGoals();
    } catch {
      // Handled
    } finally {
      setAdding(false);
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
              Metabolic Health Strategy
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Health & Vitality Goals
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Target objectives guiding your clinical care team and continuous telemetry algorithms.
            </p>
          </div>
        </header>

        <main className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6">
          {/* Active Goals List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Active Objectives
            </h3>

            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading goals...</div>
            ) : goals.length === 0 ? (
              <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-400">
                No goals set. Add a metabolic goal below.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {goals.map((g) => (
                  <div
                    key={g.id}
                    className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-3 hover:border-teal-200 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            g.isPrimary
                              ? "bg-teal-50 text-teal-800 border border-teal-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {g.isPrimary ? "PRIMARY TARGET" : "SECONDARY GOAL"}
                        </span>

                        <span className="text-[10px] font-mono text-emerald-700 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Tracking
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-slate-900">{g.title}</h4>
                      {g.targetValue && (
                        <p className="text-xs text-slate-500 mt-1">
                          Target: {g.targetValue} {g.targetUnit}
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                      <span className="capitalize">{g.category}</span>
                      <span>Continuous Passive Tracking</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Goal Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-teal-600" />
              Add a New Health Objective
            </h3>

            <form onSubmit={handleAddGoal} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Goal Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Lower fasting glucose to < 90 mg/dL"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-teal-500 bg-white"
                  >
                    <option value="metabolic">Metabolic & Glucose</option>
                    <option value="sleep">Sleep & Circadian</option>
                    <option value="activity">Activity & Movement</option>
                    <option value="nutrition">Nutrition & Fasting</option>
                    <option value="cardiovascular">Cardiovascular</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="primaryCheck"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <label htmlFor="primaryCheck" className="text-xs font-medium text-slate-700">
                  Set as Primary Priority Goal
                </label>
              </div>

              <button
                type="submit"
                disabled={adding}
                className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {adding ? "Saving..." : "Add Goal"}
              </button>
            </form>
          </div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
