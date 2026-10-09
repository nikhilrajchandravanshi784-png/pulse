"use client";

import { useEffect, useState, useRef } from "react";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SafetyBanner } from "@/components/layout/SafetyBanner";
import {
  Stethoscope,
  Send,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  User,
  Clock,
} from "lucide-react";
import { formatTime } from "@/lib/utils";

interface CareMessage {
  id: string;
  senderName: string;
  senderRole: string;
  content: string;
  isCarePlanNote: boolean;
  createdAt: string;
}

interface CareProgramData {
  id: string;
  name: string;
  description: string;
  currentWeek: number;
  totalWeeks: number;
  assignedCoach: string;
  weeklyFocus: string;
}

export default function CareProgramPage() {
  const [program, setProgram] = useState<CareProgramData | null>(null);
  const [messages, setMessages] = useState<CareMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchCareData = async () => {
    try {
      const res = await fetch("/api/messages");
      const data = await res.json();
      if (data.program) setProgram(data.program);
      if (data.messages) setMessages(data.messages);
    } catch (err) {
      console.error("Care data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCareData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage.trim() }),
      });

      if (res.ok) {
        setNewMessage("");
        await fetchCareData();
      }
    } catch (err) {
      console.error("Send message error:", err);
    } finally {
      setSending(false);
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
              Clinical Advisory & Protocol
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Care Program & Care Team
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Continuous metabolic coaching and asynchronous communication with your assigned clinical lead.
            </p>
          </div>
        </header>

        <main className="max-w-4xl mx-auto w-full px-4 sm:px-8 py-6 space-y-6">
          {/* Active Care Program Card */}
          {program && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 w-fit">
                  WEEK {program.currentWeek} OF {program.totalWeeks} ACTIVE
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  Care Lead: {program.assignedCoach}
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">{program.name}</h2>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {program.description}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Protocol Milestone Progress</span>
                  <span className="text-teal-700">
                    {Math.round((program.currentWeek / program.totalWeeks) * 100)}% Completed
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-600 rounded-full transition-all"
                    style={{ width: `${(program.currentWeek / program.totalWeeks) * 100}%` }}
                  />
                </div>
              </div>

              {/* Current Weekly Focus */}
              <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 text-xs text-teal-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">This Week&apos;s Clinical Focus:</span>
                  <p className="mt-0.5 text-teal-800">{program.weeklyFocus}</p>
                </div>
              </div>
            </div>
          )}

          {/* Secure Care Team Messaging Section */}
          <div id="chat" className="bg-white rounded-3xl border border-slate-200/80 shadow-xs flex flex-col h-[520px]">
            {/* Chat header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                  <Stethoscope className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Care Team Consultation</h3>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Dr. Sarah Lin, MD • Marcus Vance, RD</span>
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-mono text-slate-400 border border-slate-200 px-2 py-0.5 rounded">
                HIPAA-READY LOG
              </span>
            </div>

            {/* Message feed */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
              {messages.map((msg) => {
                const isPatient = msg.senderRole === "PATIENT";

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isPatient ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-600">{msg.senderName}</span>
                      <span>•</span>
                      <span>{formatTime(msg.createdAt)}</span>
                    </div>

                    <div
                      className={`max-w-[85%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                        isPatient
                          ? "bg-teal-600 text-white rounded-tr-xs"
                          : msg.isCarePlanNote
                          ? "bg-teal-50 border border-teal-200 text-teal-950 rounded-tl-xs"
                          : "bg-slate-100 text-slate-900 rounded-tl-xs"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Ask your metabolic coach a question or share a symptom..."
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-teal-500"
              />
              <button
                type="submit"
                disabled={sending || !newMessage.trim()}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
