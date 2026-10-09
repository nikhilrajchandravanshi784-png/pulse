"use client";

import { useState, useEffect } from "react";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { LanguageToggle, useCurrentLanguage } from "@/components/LanguageToggle";
import { getDictionary } from "@/lib/i18n";
import {
  Users,
  UserPlus,
  ShieldCheck,
  Lock,
  Copy,
  Check,
  AlertTriangle,
  HeartHandshake,
  Clock,
  Trash2,
  Share2,
  Info,
} from "lucide-react";
import { PulseTopHeader } from "@/components/layout/PulseTopHeader";

interface CaregiverInvitation {
  id: string;
  caregiverName: string;
  caregiverEmail: string;
  relationship: string;
  invitationToken: string;
  status: "PENDING" | "ACCEPTED" | "REVOKED";
  expiresAt: string;
  shareGoals: boolean;
  shareCompletedActions: boolean;
  shareReminders: boolean;
  shareEducation: boolean;
  shareWeeklySummary: boolean;
  shareGlucose: boolean;
  createdAt: string;
}

export default function CareCirclePage() {
  const lang = useCurrentLanguage();
  const t = getDictionary(lang);

  const [caregivers, setCaregivers] = useState<CaregiverInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  // Invite Form State
  const [form, setForm] = useState({
    caregiverName: "",
    caregiverEmail: "",
    relationship: "Spouse / Partner",
    shareGoals: true,
    shareCompletedActions: true,
    shareReminders: true,
    shareEducation: true,
    shareWeeklySummary: true,
    shareGlucose: false, // Default false: explicit opt-in only
  });

  const fetchCaregivers = async () => {
    try {
      const res = await fetch("/api/pulse/circle");
      if (res.ok) {
        const data = await res.json();
        setCaregivers(data.caregivers || []);
      }
    } catch (err) {
      console.error("Error loading care circle:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaregivers();
  }, []);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.caregiverName || !form.caregiverEmail) return;

    setSubmitting(true);
    setFeedbackMsg(null);
    try {
      const res = await fetch("/api/pulse/circle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (res.ok) {
        setFeedbackMsg({
          text:
            lang === "hi"
              ? "केयरगिवर को सफलतापूर्वक आमंत्रित किया गया।"
              : "Caregiver successfully invited with patient-controlled permissions.",
        });
        setShowInviteModal(false);
        setForm({
          caregiverName: "",
          caregiverEmail: "",
          relationship: "Spouse / Partner",
          shareGoals: true,
          shareCompletedActions: true,
          shareReminders: true,
          shareEducation: true,
          shareWeeklySummary: true,
          shareGlucose: false,
        });
        fetchCaregivers();
      } else {
        setFeedbackMsg({ text: data.error || "Failed to invite caregiver", isError: true });
      }
    } catch {
      setFeedbackMsg({
        text: lang === "hi" ? "त्रुटि हुई। कृपया पुनः प्रयास करें।" : "Failed to invite. Please retry.",
        isError: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string, name: string) => {
    const confirmText =
      lang === "hi"
        ? `क्या आप वास्तव में ${name} की पहुँच समाप्त (revoke) करना चाहते हैं?`
        : `Are you sure you want to revoke access for ${name}?`;

    if (!confirm(confirmText)) return;

    try {
      const res = await fetch(`/api/pulse/circle/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setFeedbackMsg({
          text:
            lang === "hi"
              ? `${name} की पहुँच तुरंत समाप्त कर दी गई।`
              : `Access for ${name} was immediately revoked.`,
        });
        fetchCaregivers();
      }
    } catch {
      alert("Failed to revoke access.");
    }
  };

  const handleCopyLink = (token: string) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const inviteUrl = `${origin}/circle/view/${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  return (
    <div className="flex min-h-screen bg-[#DCE8EC] text-[#101A45]">
      <DesktopSidebar />

      <main className="flex-1 min-w-0 pb-24 lg:pb-12">
        <PulseTopHeader activeTab="Support" />

        <div className="bg-white border-b border-[#C9D7DE] px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D5F3E7] border border-[#A6E5CC] flex items-center justify-center text-[#087F8C]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black text-[#101A45] leading-tight">
                {t.modules.circle.title}
              </h1>
              <p className="text-xs text-[#52616B] hidden sm:block">
                {t.modules.circle.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button
              type="button"
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#101A45] hover:bg-[#101A45]/90 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-teal-300" />
              <span>{t.modules.circle.inviteBtn}</span>
            </button>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-6">
          {/* Patient Autonomy & Privacy Notice Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3.5">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-xs sm:text-sm font-bold text-emerald-950">
                {lang === "hi"
                  ? "रोगी-नियंत्रित गोपनीयता प्रतिज्ञा (Patient-Controlled Privacy)"
                  : "Patient-Controlled Caregiver Support"}
              </h3>
              <p className="text-xs text-emerald-800/90 leading-relaxed">
                {t.modules.circle.familyNotice}
              </p>
              <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-emerald-900 font-medium">
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  {lang === "hi" ? "कोई दवा या डॉक्टर नोट साझा नहीं" : "No prescription details shared"}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  {lang === "hi" ? "14 दिन बाद लिंक स्वतः निष्प्रभावी" : "14-day token expiration"}
                </span>
                <span className="flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5 text-emerald-600" />
                  {lang === "hi" ? "किसी भी क्षण एक-क्लिक में रद्दीकरण" : "Instant 1-click revocation"}
                </span>
              </div>
            </div>
          </div>

          {/* Toast / Feedback Notice */}
          {feedbackMsg && (
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between ${
                feedbackMsg.isError
                  ? "bg-rose-50 text-rose-800 border border-rose-200"
                  : "bg-teal-50 text-teal-800 border border-teal-200"
              }`}
            >
              <span>{feedbackMsg.text}</span>
              <button
                onClick={() => setFeedbackMsg(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>
          )}

          {/* Active Care Circle List */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-teal-600" />
                <span>{t.modules.circle.activeMembers}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                  {caregivers.length}
                </span>
              </h2>
            </div>

            {loading ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
                {lang === "hi" ? "केयरगिवर लोड हो रहे हैं..." : "Loading caregivers..."}
              </div>
            ) : caregivers.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300 space-y-3">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-700">
                    {lang === "hi"
                      ? "अभी कोई केयरगिवर नहीं जोड़ा गया है"
                      : "No family members or caregivers connected yet"}
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                    {lang === "hi"
                      ? "परिवार के किसी सदस्य को जोड़ें जो आपकी दैनिक दिनचर्या में सकारात्मक प्रोत्साहन दे सके।"
                      : "Invite a loved one to cheer you on and walk with you without seeing private medical records."}
                  </p>
                </div>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t.modules.circle.inviteBtn}</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {caregivers.map((cg) => {
                  const isRevoked = cg.status === "REVOKED";
                  const isPending = cg.status === "PENDING";

                  return (
                    <div
                      key={cg.id}
                      className={`p-4 sm:p-5 rounded-2xl bg-white border transition-all ${
                        isRevoked
                          ? "border-slate-200 opacity-60 bg-slate-50/50"
                          : "border-slate-200/90 shadow-2xs hover:border-teal-200"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                              isRevoked
                                ? "bg-slate-100 text-slate-400"
                                : "bg-teal-50 text-teal-700 border border-teal-100"
                            }`}
                          >
                            {cg.caregiverName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-slate-900">
                                {cg.caregiverName}
                              </h4>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  isRevoked
                                    ? "bg-rose-50 text-rose-700"
                                    : isPending
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-emerald-50 text-emerald-700"
                                }`}
                              >
                                {isRevoked
                                  ? lang === "hi"
                                    ? "पहुँच समाप्त (Revoked)"
                                    : "Revoked"
                                  : isPending
                                  ? lang === "hi"
                                    ? "लिंक सक्रिय (Active Link)"
                                    : "Active Link"
                                  : "Accepted"}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2">
                              <span>{cg.relationship}</span>
                              <span>•</span>
                              <span>{cg.caregiverEmail}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {!isRevoked && (
                            <>
                              <button
                                onClick={() => handleCopyLink(cg.invitationToken)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 text-xs font-medium transition-colors cursor-pointer"
                                title="Copy secure caregiver link"
                              >
                                {copiedToken === cg.invitationToken ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span className="text-emerald-700 font-bold">
                                      {lang === "hi" ? "कॉपी हुआ!" : "Copied!"}
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>{lang === "hi" ? "लिंक कॉपी करें" : "Copy Link"}</span>
                                  </>
                                )}
                              </button>

                              <button
                                onClick={() => handleRevoke(cg.id, cg.caregiverName)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{t.modules.circle.revokeAccess}</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Permissions Breakdown */}
                      <div className="pt-3">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                          {lang === "hi" ? "स्वीकृत अनुमतियाँ:" : "Granted Permissions:"}
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {cg.shareGoals && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium">
                              <Check className="w-3 h-3 text-emerald-600" />
                              {t.modules.circle.permissions.goals}
                            </span>
                          )}
                          {cg.shareCompletedActions && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium">
                              <Check className="w-3 h-3 text-emerald-600" />
                              {t.modules.circle.permissions.actions}
                            </span>
                          )}
                          {cg.shareReminders && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium">
                              <Check className="w-3 h-3 text-emerald-600" />
                              {t.modules.circle.permissions.reminders}
                            </span>
                          )}
                          {cg.shareEducation && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-medium">
                              <Check className="w-3 h-3 text-emerald-600" />
                              {t.modules.circle.permissions.education}
                            </span>
                          )}
                          {cg.shareGlucose ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              {t.modules.circle.permissions.glucose}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-400 text-[11px]">
                              <Lock className="w-3 h-3 text-slate-400" />
                              {lang === "hi" ? "ग्लूकोज छिपा हुआ है" : "Glucose values hidden"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Supportive Caregiver Messaging Prompts Section */}
          <section className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-teal-600" />
              <h3 className="text-sm font-bold text-slate-900">
                {lang === "hi"
                  ? "सहानुभूतिपूर्ण पारिवारिक संवाद के उदाहरण"
                  : "Empathetic Caregiver Support Templates"}
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              {lang === "hi"
                ? "पल्स परिवार के सदस्यों को बिना दोष या दबाव के, सकारात्मक साथ देने के लिए प्रेरित करता है:"
                : "Pulse provides family members with supportive, non-critical encouragement ideas:"}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-100 space-y-1">
                <div className="text-xs font-bold text-teal-950">
                  {lang === "hi" ? "टहलने का आमंत्रण 🚶" : "Walk Invitation 🚶"}
                </div>
                <p className="text-xs text-teal-800 italic">
                  {lang === "hi"
                    ? '"क्या आप आज शाम 10 मिनट टहलने के लिए साथ चलना चाहेंगे?"'
                    : '"Would you like me to join you for a gentle 10-minute walk after dinner?"'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-1">
                <div className="text-xs font-bold text-emerald-950">
                  {lang === "hi" ? "सकारात्मक प्रोत्साहन 🌿" : "Positive Reinforcement 🌿"}
                </div>
                <p className="text-xs text-emerald-800 italic">
                  {lang === "hi"
                    ? '"आपकी निरंतरता देखकर बहुत खुशी हुई। एक छोटा कदम भी बहुत मायने रखता है!"'
                    : '"Proud of your daily consistency. Every small step counts!"'}
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Modal: Invite Caregiver */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90dvh] overflow-y-auto p-6 shadow-xl border border-slate-200 space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                    <UserPlus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {t.modules.circle.inviteBtn}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {lang === "hi"
                        ? "परिवार या देखभाल करने वाले को सुरक्षित रूप से जोड़ें"
                        : "Grant controlled, revocable viewing access"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg leading-none cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {lang === "hi" ? "नाम *" : "Caregiver Name *"}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Priya Sharma"
                      value={form.caregiverName}
                      onChange={(e) => setForm({ ...form, caregiverName: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {lang === "hi" ? "ईमेल *" : "Email Address *"}
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. priya@family.com"
                      value={form.caregiverEmail}
                      onChange={(e) => setForm({ ...form, caregiverEmail: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {lang === "hi" ? "संबंध (Relationship)" : "Relationship"}
                  </label>
                  <select
                    value={form.relationship}
                    onChange={(e) => setForm({ ...form, relationship: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="Spouse / Partner">Spouse / Partner (जीवनसाथी)</option>
                    <option value="Child / Daughter / Son">Child / Daughter / Son (बेटा / बेटी)</option>
                    <option value="Parent">Parent (माता-पिता)</option>
                    <option value="Sibling">Sibling (भाई / बहन)</option>
                    <option value="Trusted Friend">Trusted Friend (विश्वस्त मित्र)</option>
                    <option value="Professional Caregiver">Caregiver (देखभालकर्ता)</option>
                  </select>
                </div>

                {/* Granular Permissions Section */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    <span>{lang === "hi" ? "साझा करने की अनुमतियाँ चुनें:" : "Select Sharing Permissions:"}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {lang === "hi"
                      ? "आप जो चुनेंगे, केवल वही जानकारी दिखाई देगी।"
                      : "Only checked categories will be visible on their dashboard link."}
                  </p>

                  <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.shareGoals}
                        onChange={(e) => setForm({ ...form, shareGoals: e.target.checked })}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span>{t.modules.circle.permissions.goals}</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.shareCompletedActions}
                        onChange={(e) => setForm({ ...form, shareCompletedActions: e.target.checked })}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span>{t.modules.circle.permissions.actions}</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.shareReminders}
                        onChange={(e) => setForm({ ...form, shareReminders: e.target.checked })}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span>{t.modules.circle.permissions.reminders}</span>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.shareEducation}
                        onChange={(e) => setForm({ ...form, shareEducation: e.target.checked })}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span>{t.modules.circle.permissions.education}</span>
                    </label>

                    {/* Explicit Opt-in for Glucose */}
                    <div className="pt-2 border-t border-slate-200">
                      <label className="flex items-start gap-2.5 text-xs text-amber-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.shareGlucose}
                          onChange={(e) => setForm({ ...form, shareGlucose: e.target.checked })}
                          className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                        />
                        <div className="space-y-0.5">
                          <span className="font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            {t.modules.circle.permissions.glucose}
                          </span>
                          <p className="text-[10px] text-amber-700">
                            {lang === "hi"
                              ? "केवल तभी सक्षम करें जब आप अपने हालिया रक्त शर्करा के आंकड़े साझा करना चाहते हों।"
                              : "Optional sensitive metric: share recent blood sugar readings with this person."}
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    {lang === "hi" ? "रद्द करें" : "Cancel"}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    {submitting
                      ? lang === "hi"
                        ? "आमंत्रण भेजा जा रहा है..."
                        : "Sending Invite..."
                      : t.modules.circle.inviteBtn}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
}
