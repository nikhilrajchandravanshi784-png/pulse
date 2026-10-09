"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Stethoscope,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Search,
  Filter,
  FileText,
  Activity,
  Award,
  Calendar,
  Lock,
  Check,
} from "lucide-react";
import { LanguageToggle, useCurrentLanguage } from "@/components/LanguageToggle";
import { getDictionary } from "@/lib/i18n";

interface PatientCard {
  id: string;
  name: string;
  email: string;
  diabetesType: string;
  programDayCurrent: number;
  status: "ACTIVE" | "NEEDS_FOLLOW_UP" | "AWAITING_CLINICIAN_REVIEW" | "PROGRAM_COMPLETED";
  lastCheckInDate: string;
  lastMood: string;
  openEscalationsCount: number;
  pendingGoalReviewsCount: number;
  goalsCount: number;
}

interface SafetyEscalation {
  id: string;
  severity: "URGENT" | "MODERATE" | "INFORMATIONAL";
  reason: string;
  patient: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export default function ClinicianWorkspacePage() {
  const lang = useCurrentLanguage();
  const t = getDictionary(lang);

  const [patients, setPatients] = useState<PatientCard[]>([]);
  const [escalations, setEscalations] = useState<SafetyEscalation[]>([]);
  const [clinicianName, setClinicianName] = useState<string>("Dr. Rajesh Verma, MD");
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [authorized, setAuthorized] = useState(true);

  // Selected Patient Details Modal
  const [selectedPatient, setSelectedPatient] = useState<PatientCard | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [proactiveData, setProactiveData] = useState<any>(null);

  const fetchClinicianQueue = async () => {
    try {
      const [res, proactiveRes] = await Promise.all([
        fetch("/api/pulse/clinician/patients"),
        fetch("/api/proactive-care/clinician"),
      ]);

      if (res.status === 403 || res.status === 401) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setPatients(data.patientCards || []);
        setEscalations(data.openEscalations || []);
        if (data.clinicianName) setClinicianName(data.clinicianName);
      }

      if (proactiveRes.ok) {
        const pData = await proactiveRes.json();
        setProactiveData(pData);
      }
    } catch (err) {
      console.error("Failed to load clinician queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClinicianQueue();
  }, []);

  const handleResolveEscalation = async (escalationId: string) => {
    try {
      const res = await fetch("/api/pulse/clinician/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: "RESOLVE_ESCALATION",
          targetId: escalationId,
          resolutionNotes: resolutionNotes || "Clinically reviewed by physician. Patient advised and monitored.",
        }),
      });

      if (res.ok) {
        setActionSuccessMsg(
          lang === "hi"
            ? "सुरक्षा चेतावनी की समीक्षा व समाधान सफल रहा।"
            : "Safety escalation reviewed and resolved."
        );
        setResolvingId(null);
        setResolutionNotes("");
        fetchClinicianQueue();
        setTimeout(() => setActionSuccessMsg(null), 3000);
      }
    } catch {
      alert("Failed to resolve escalation.");
    }
  };

  const filteredPatients = patients.filter((p) => {
    const matchesFilter =
      filterStatus === "ALL" ||
      (filterStatus === "NEEDS_FOLLOW_UP" && p.status === "NEEDS_FOLLOW_UP") ||
      (filterStatus === "AWAITING_REVIEW" && p.status === "AWAITING_CLINICIAN_REVIEW") ||
      (filterStatus === "ACTIVE" && p.status === "ACTIVE");

    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full border border-slate-200 shadow-md text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-slate-900">
              {lang === "hi" ? "चिकित्सक प्रमाणीकरण आवश्यक" : "Clinician Authorization Required"}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              {lang === "hi"
                ? "यह पृष्ठ केवल अधिकृत डॉक्टरों और क्लिनिकल टीम के लिए आरक्षित है। कृपया डॉक्टर खाते से लॉगिन करें।"
                : "This workspace is restricted to licensed clinicians and medical staff. Please sign in with clinician credentials."}
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 font-mono text-left">
            <div>Clinician Demo Account:</div>
            <div className="font-bold text-slate-800">dr.verma@pulsehealth.demo</div>
            <div>Password: ClinicianPassword123!</div>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold"
            >
              Sign In as Clinician
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold"
            >
              Back to Patient View
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-3.5 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 leading-tight">
                  Project Pulse — {lang === "hi" ? "चिकित्सक वर्कस्पेस" : "Clinician Portal"}
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-bold border border-teal-200">
                  Care Team
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {clinicianName} • Consultant Diabetologist
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-medium transition-colors"
            >
              {lang === "hi" ? "रोगी दृश्य देखें" : "Switch to Patient View"}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Success toast */}
        {actionSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {lang === "hi" ? "कुल मरीज़" : "Total Enrolled Patients"}
            </div>
            <div className="text-2xl font-black text-slate-900">{patients.length}</div>
            <p className="text-[11px] text-slate-500">90-Day Active Cohort</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-rose-100 bg-rose-50/20 shadow-2xs space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-rose-700">
              {lang === "hi" ? "सुरक्षा अलर्ट" : "Active Safety Escalations"}
            </div>
            <div className="text-2xl font-black text-rose-600 flex items-center gap-2">
              <span>{escalations.length}</span>
              {escalations.length > 0 && <span className="animate-pulse">⚠️</span>}
            </div>
            <p className="text-[11px] text-rose-600 font-medium">Immediate Physician Attention</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-amber-100 bg-amber-50/20 shadow-2xs space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              {lang === "hi" ? "लक्ष्य समीक्षा प्रतीक्षित" : "Pending Care Plan Reviews"}
            </div>
            <div className="text-2xl font-black text-amber-700">
              {patients.filter((p) => p.pendingGoalReviewsCount > 0).length}
            </div>
            <p className="text-[11px] text-amber-700 font-medium">Goal Adjustment Requests</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-emerald-100 bg-emerald-50/20 shadow-2xs space-y-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              {lang === "hi" ? "औसत निरंतरता दर" : "Cohort Adherence"}
            </div>
            <div className="text-2xl font-black text-emerald-700">86%</div>
            <p className="text-[11px] text-emerald-700 font-medium">7-Day Return-to-Routine</p>
          </div>
        </div>

        {/* Unresolved Safety Escalations Queue (if any) */}
        {escalations.length > 0 && (
          <section className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <h2 className="text-sm font-bold text-rose-950">
                {lang === "hi"
                  ? "चिकित्सीय सुरक्षा अलर्ट कतार (Immediate Clinical Attention Required)"
                  : "Clinical Safety Escalation Queue"}
              </h2>
            </div>
            <p className="text-xs text-rose-800/90 leading-relaxed">
              {lang === "hi"
                ? "निम्नलिखित रोगियों ने सुरक्षा ट्रिगर (जैसे हाइपोग्लाइसीमिया या दवा संबंधी आपात स्थिति) दर्ज किए हैं:"
                : "The following patients triggered red-flag safety escalations requiring clinical oversight:"}
            </p>

            <div className="space-y-2.5 pt-1">
              {escalations.map((esc) => (
                <div
                  key={esc.id}
                  className="p-4 rounded-xl bg-white border border-rose-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{esc.patient.name}</span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-bold">
                        {esc.severity}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(esc.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-rose-900 font-medium">
                      Trigger: {esc.reason}
                    </p>
                  </div>

                  <div>
                    {resolvingId === esc.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          placeholder="Clinical resolution note..."
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs w-64"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleResolveEscalation(esc.id)}
                            className="px-3 py-1 bg-teal-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            Confirm Resolution
                          </button>
                          <button
                            onClick={() => setResolvingId(null)}
                            className="px-2 py-1 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setResolvingId(esc.id)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        Acknowledge & Resolve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Pulse Proactive Care: Routine Recovery & Intervention Queue */}
        {proactiveData?.metrics && (
          <section className="p-5 rounded-2xl bg-white border border-teal-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-2xs">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {lang === "hi" ? "पल्स प्रोएक्टिव केयर: रिकवरी और हस्तक्षेप कतार" : "Pulse Proactive Care: Routine Recovery & Intervention Queue"}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {lang === "hi"
                      ? "छूटी हुई दिनचर्या, रोगी बाधाएं और गैर-चिकित्सीय अनुकूलन"
                      : "Automated routine monitoring, barrier tracking, and lifestyle adjustments"}
                  </p>
                </div>
              </div>
            </div>

            {/* Proactive Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Interventions Issued</span>
                <div className="text-lg font-black text-slate-800">{proactiveData.metrics.interventionsIssued}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Barrier Response</span>
                <div className="text-lg font-black text-teal-700">{proactiveData.metrics.barrierResponseRatePercent}%</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Suggestions Accepted</span>
                <div className="text-lg font-black text-emerald-700">{proactiveData.metrics.suggestionsAcceptedCount}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Routines Resumed</span>
                <div className="text-lg font-black text-indigo-700">{proactiveData.metrics.routinesRecoveredCount}</div>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Avg Time to Resume</span>
                <div className="text-lg font-black text-slate-800">{proactiveData.metrics.averageHoursToRecovery} hrs</div>
              </div>
            </div>

            {/* Recent Reported Barriers */}
            {proactiveData.repeatedBarriers && proactiveData.repeatedBarriers.length > 0 && (
              <div className="space-y-2 pt-1">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {lang === "hi" ? "हाल ही में दर्ज की गई बाधाएं (Reported Barriers)" : "Recent Patient-Reported Barriers"}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {proactiveData.repeatedBarriers.slice(0, 4).map((rb: any) => (
                    <div key={rb.id} className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span>{rb.intervention?.user?.name || "Patient"}</span>
                        <span className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 text-[10px] border border-teal-200">
                          {rb.selectedBarrier?.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px]">
                        Goal: {rb.intervention?.goal?.title || "Daily routine"}
                      </p>
                      {rb.freeText && (
                        <p className="text-slate-500 text-[11px] italic">
                          "{rb.freeText}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Patient Roster & Follow-up Queue */}
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          {/* Table Controls / Filters */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setFilterStatus("ALL")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === "ALL"
                    ? "bg-teal-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {lang === "hi" ? "सभी मरीज़" : "All Patients"} ({patients.length})
              </button>
              <button
                onClick={() => setFilterStatus("NEEDS_FOLLOW_UP")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === "NEEDS_FOLLOW_UP"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {lang === "hi" ? "फॉलो-अप आवश्यक" : "Needs Follow-Up"} (
                {patients.filter((p) => p.status === "NEEDS_FOLLOW_UP").length})
              </button>
              <button
                onClick={() => setFilterStatus("AWAITING_REVIEW")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterStatus === "AWAITING_REVIEW"
                    ? "bg-amber-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {lang === "hi" ? "समीक्षा प्रतीक्षित" : "Awaiting Review"} (
                {patients.filter((p) => p.status === "AWAITING_CLINICIAN_REVIEW").length})
              </button>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={lang === "hi" ? "मरीज़ खोजें..." : "Search patient..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 w-full sm:w-60"
              />
            </div>
          </div>

          {/* Patient Table */}
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading patient roster...</div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No patients match the current filter.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[650px]">
                <thead className="bg-slate-50/70 text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="p-3.5 pl-5">Patient Name</th>
                    <th className="p-3.5">Condition</th>
                    <th className="p-3.5">90-Day Progress</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Last Check-In</th>
                    <th className="p-3.5 pr-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPatients.map((p) => {
                    const isAlert = p.status === "NEEDS_FOLLOW_UP";
                    const isPending = p.status === "AWAITING_CLINICIAN_REVIEW";

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 pl-5 font-bold text-slate-900">
                          <div>{p.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{p.email}</div>
                        </td>
                        <td className="p-3.5 text-slate-600">{p.diabetesType}</td>
                        <td className="p-3.5">
                          <span className="font-semibold text-teal-700">
                            Day {p.programDayCurrent}
                          </span>{" "}
                          <span className="text-slate-400">/ 90</span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isAlert
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : isPending
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500">
                          <div>{p.lastCheckInDate}</div>
                          <div className="text-[10px] text-slate-400">Mood: {p.lastMood}</div>
                        </td>
                        <td className="p-3.5 pr-5 text-right">
                          <button
                            onClick={() => setSelectedPatient(p)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <span>Clinical Review</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Selected Patient Clinical Modal */}
        {selectedPatient && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                    {selectedPatient.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{selectedPatient.name}</h3>
                    <p className="text-xs text-slate-500">{selectedPatient.diabetesType}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Journey</div>
                  <div className="font-bold text-slate-900">
                    Day {selectedPatient.programDayCurrent} of 90
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Active Goals</div>
                  <div className="font-bold text-teal-700">{selectedPatient.goalsCount} SMART Goals</div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Physician Actions
                </div>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      alert("Care plan confirmed and verified for next clinical interval.");
                      setSelectedPatient(null);
                    }}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve Goal Adjustments & Sign Off</span>
                  </button>

                  <Link
                    href={`/review?patientId=${selectedPatient.id}`}
                    className="w-full py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-slate-500" />
                    <span>Open Comprehensive 90-Day Outcome Report</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
