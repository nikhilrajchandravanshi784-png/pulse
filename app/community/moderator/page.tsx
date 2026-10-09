"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  UserX,
  FileText,
  Clock,
  Shield,
} from "lucide-react";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { LanguageToggle, useCurrentLanguage } from "@/components/LanguageToggle";
import { ReportDTO, HeldContentDTO, ModeratorActionType } from "@/services/community/types";
import { formatRelativeTime } from "@/lib/utils";

export default function ModeratorDashboardPage() {
  const lang = useCurrentLanguage();
  const [reports, setReports] = useState<ReportDTO[]>([]);
  const [heldContent, setHeldContent] = useState<HeldContentDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action dialog state
  const [actionTarget, setActionTarget] = useState<{
    targetType: "POST" | "COMMENT" | "USER";
    targetId: string;
    reportId?: string;
    defaultAction: ModeratorActionType;
  } | null>(null);
  const [actionType, setActionType] = useState<ModeratorActionType>("APPROVE");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/community/moderation");
      if (res.status === 403) {
        setError(lang === "hi" ? "इस पृष्ठ को देखने के लिए मॉडरेटर अनुमतियां आवश्यक हैं।" : "Moderator permissions required to access this dashboard.");
        return;
      }
      const data = await res.json();
      setReports(data.reports || []);
      setHeldContent(data.heldContent || []);
    } catch (err) {
      setError("Failed to load queue");
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionTarget) return;

    if (!reason.trim() || reason.trim().length < 5) {
      alert(lang === "hi" ? "कृपया न्यूनतम 5 अक्षरों का स्पष्टीकरण कारण दर्ज करें।" : "Please provide a valid explanation (min 5 characters).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/community/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: actionTarget.targetType,
          targetId: actionTarget.targetId,
          actionType,
          reason,
          reportId: actionTarget.reportId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Action failed");
      }

      setActionTarget(null);
      setReason("");
      fetchQueue();
    } catch (err: any) {
      alert(err.message || "Failed to execute moderation action");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <DesktopSidebar userName="Admin" userRole="ADMIN" />

      <div className="flex-1 flex flex-col min-w-0 pb-20 lg:pb-8">
        <header className="bg-white border-b border-slate-200/80 px-4 lg:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            <Link
              href="/community/groups/building-healthy-habits"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
              title="Back to Community"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight flex items-center gap-2">
                <Shield className="w-4 h-4 text-teal-600" />
                <span>{lang === "hi" ? "पल्स समुदाय मॉडरेटर डैशबोर्ड" : "Pulse Community Moderator Dashboard"}</span>
              </h1>
              <p className="text-[11px] text-slate-500">
                {lang === "hi" ? "सुरक्षा समीक्षा कतार एवं ऑडिट लॉग" : "Safety review queue, held content, and audit logs"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchQueue}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              title="Refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <LanguageToggle />
          </div>
        </header>

        <main className="max-w-5xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* SECTION 1: HELD CONTENT (INTERCEPTED BY AUTOMATED SAFETY SCREENER) */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>{lang === "hi" ? "स्वचालित सुरक्षा द्वारा रोकी गई सामग्री" : "Content Held by Safety Screener"}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                    {heldContent.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {lang === "hi"
                    ? "संभावित दवा बदलाव, अमान्य दावों या नियमों के उल्लंघन के कारण रोकी गई पोस्ट्स।"
                    : "Posts held prior to publication due to potential clinical dosing or rule conflicts."}
                </p>
              </div>
            </div>

            {heldContent.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                {lang === "hi" ? "कोई रोकी गई सामग्री नहीं है। सभी चर्चाएं सुरक्षित हैं।" : "No held content pending review. All clear."}
              </div>
            ) : (
              <div className="space-y-3">
                {heldContent.map((hc) => (
                  <div key={hc.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">{hc.authorDisplayName}</span>
                        {hc.groupName && <span className="text-slate-400 text-[11px]">• in {hc.groupName}</span>}
                      </div>
                      <span className="text-[11px] text-slate-400">{formatRelativeTime(hc.createdAt)}</span>
                    </div>

                    <p className="text-xs text-slate-800 leading-relaxed bg-white p-3 rounded-lg border border-amber-100 font-mono">
                      {hc.content}
                    </p>

                    <div className="text-[11px] text-amber-900 bg-amber-100/60 p-2 rounded-lg font-medium">
                      ⚠️ <strong>{lang === "hi" ? "कारण:" : "Flag reason:"}</strong> {hc.flagReason || "Flagged by safety classifier"}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => {
                          setActionTarget({ targetType: hc.type, targetId: hc.id, defaultAction: "APPROVE" });
                          setActionType("APPROVE");
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        {lang === "hi" ? "मंजूर करें (Approve)" : "Approve Post"}
                      </button>
                      <button
                        onClick={() => {
                          setActionTarget({ targetType: hc.type, targetId: hc.id, defaultAction: "REMOVE" });
                          setActionType("REMOVE");
                        }}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        {lang === "hi" ? "हटाएं (Remove)" : "Remove Post"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 2: MEMBER REPORTS */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>{lang === "hi" ? "सदस्य रिपोर्ट कतार (Pending Reports)" : "Pending Member Reports"}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900">
                    {reports.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {lang === "hi"
                    ? "सदस्यों द्वारा रिपोर्ट की गई सामग्री। रिपोर्टर की पहचान सुरक्षित रखी जाती है।"
                    : "Content flagged by peer members. Reporter identity is strictly confidential."}
                </p>
              </div>
            </div>

            {reports.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                {lang === "hi" ? "कोई लंबित रिपोर्ट नहीं है।" : "No pending reports in queue."}
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((r) => (
                  <div key={r.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          {r.category}
                        </span>
                        <span className="text-slate-500 text-[11px]">• Author: {r.authorDisplayName}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">{formatRelativeTime(r.createdAt)}</span>
                    </div>

                    <p className="text-xs text-slate-800 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                      &quot;{r.contentSnippet}&quot;
                    </p>

                    {r.description && (
                      <div className="text-[11px] text-slate-600 italic">
                        <strong>Reporter note:</strong> {r.description}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80">
                      <button
                        onClick={() => {
                          setActionTarget({
                            targetType: r.contentType,
                            targetId: r.contentId,
                            reportId: r.id,
                            defaultAction: "DISMISS_REPORT",
                          });
                          setActionType("DISMISS_REPORT");
                        }}
                        className="px-3 py-1.5 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold"
                      >
                        {lang === "hi" ? "खारिज करें" : "Dismiss Report"}
                      </button>
                      <button
                        onClick={() => {
                          setActionTarget({
                            targetType: r.contentType,
                            targetId: r.contentId,
                            reportId: r.id,
                            defaultAction: "REMOVE",
                          });
                          setActionType("REMOVE");
                        }}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
                      >
                        {lang === "hi" ? "सामग्री हटाएं" : "Remove Content"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <MobileBottomNav />

      {/* Moderation Decision Modal with Mandatory Explanation */}
      {actionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">
                {lang === "hi" ? "मॉडरेशन कार्रवाई की पुष्टि करें" : "Confirm Moderation Decision"}
              </h3>
            </div>

            <form onSubmit={handleExecuteAction} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === "hi" ? "कार्रवाई प्रकार" : "Action Type"}
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value as ModeratorActionType)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white"
                >
                  <option value="APPROVE">Approve (Publish to group)</option>
                  <option value="REMOVE">Remove (Soft-delete with audit)</option>
                  <option value="WARN_USER">Issue Warning to User</option>
                  <option value="RESTRICT_USER">Restrict User Participation</option>
                  <option value="DISMISS_REPORT">Dismiss Report as False Alarm</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {lang === "hi" ? "ऑडिट स्पष्टीकरण (अनिवार्य)" : "Audit Explanation / Clinical Rationale (Mandatory)"}
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why this action is being taken according to community guidelines..."
                  rows={3}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5"
                  required
                  minLength={5}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActionTarget(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl disabled:opacity-50"
                >
                  {submitting ? "Executing..." : "Confirm & Log Action"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
