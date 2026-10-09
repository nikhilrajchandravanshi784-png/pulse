"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  PhoneOff,
  MonitorUp,
  MessageSquare,
  FileText,
  ShieldCheck,
  Clock,
  Send,
  X,
  User,
  CheckCircle2,
  AlertCircle,
  Copy,
  ChevronLeft,
  Sparkles,
} from "lucide-react";

interface DoctorData {
  id?: string;
  name?: string;
  title?: string;
  specialty?: string;
  avatarUrl?: string;
}

interface Message {
  sender: "doctor" | "patient";
  text: string;
  time: string;
}

export default function MeetingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params?.roomCode as string) || "pulse-meet";

  // Pre-join state
  const [hasJoined, setHasJoined] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Doctor & meeting details
  const [doctor, setDoctor] = useState<DoctorData>({
    name: "Dr. Rajesh Verma, MD",
    title: "Dr. Rajesh Verma, MD, DM",
    specialty: "Senior Diabetologist & Endocrinologist",
    avatarUrl:
      "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80",
  });
  const [appointmentTopic, setAppointmentTopic] = useState(
    "Glycemic Management & CGM Trends Review"
  );
  const [loadingRoom, setLoadingRoom] = useState(true);

  // Video streams
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const prejoinVideoRef = useRef<HTMLVideoElement | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  // Side drawers
  const [activeDrawer, setActiveDrawer] = useState<"chat" | "notes" | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "doctor",
      text: "Hello Alex! I am reviewing your recent 14-day CGM glucose log. How have you been feeling after dinners?",
      time: "16:30",
    },
  ]);

  // Elapsed Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Leave confirmation modal
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Fetch room details
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const res = await fetch(`/api/support/meeting/${roomCode}`);
        const data = await res.json();
        if (data.success) {
          if (data.doctor) {
            setDoctor(data.doctor);
          }
          if (data.appointment?.reason) {
            setAppointmentTopic(data.appointment.reason);
          }
        }
      } catch (err) {
        console.error("Room fetch failed:", err);
      } finally {
        setLoadingRoom(false);
      }
    };
    fetchRoom();
  }, [roomCode]);

  // Request camera and microphone
  useEffect(() => {
    let localStream: MediaStream | null = null;

    async function setupCamera() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          setMediaStream(localStream);

          if (prejoinVideoRef.current) {
            prejoinVideoRef.current.srcObject = localStream;
          }
        }
      } catch (err) {
        console.warn("Camera/Mic access not granted or unavailable, using placeholder mode:", err);
      }
    }

    setupCamera();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Sync video element when joining
  useEffect(() => {
    if (hasJoined && localVideoRef.current && mediaStream) {
      localVideoRef.current.srcObject = mediaStream;
    }
  }, [hasJoined, mediaStream]);

  // Ticking meeting timer
  useEffect(() => {
    if (!hasJoined) return;
    const interval = setInterval(() => {
      setElapsedSeconds((sec) => sec + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [hasJoined]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, "0");
    const secs = (totalSec % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  // Toggle mic
  const toggleMic = () => {
    if (mediaStream) {
      mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMicOn;
      });
    }
    setIsMicOn(!isMicOn);
  };

  // Toggle video
  const toggleVideo = () => {
    if (mediaStream) {
      mediaStream.getVideoTracks().forEach((track) => {
        track.enabled = !isVideoOn;
      });
    }
    setIsVideoOn(!isVideoOn);
  };

  // Screen share
  const handleToggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = displayStream;
          }
          setIsScreenSharing(true);

          displayStream.getVideoTracks()[0].onended = () => {
            if (localVideoRef.current && mediaStream) {
              localVideoRef.current.srcObject = mediaStream;
            }
            setIsScreenSharing(false);
          };
        }
      } catch {
        // User cancelled display capture
      }
    } else {
      if (localVideoRef.current && mediaStream) {
        localVideoRef.current.srcObject = mediaStream;
      }
      setIsScreenSharing(false);
    }
  };

  // Send in-call chat message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newMsg: Message = { sender: "patient", text: chatInput.trim(), time };
    setMessages((prev) => [...prev, newMsg]);
    setChatInput("");

    // Simulated doctor response after 2 seconds
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: "doctor",
          text: "Noted. I am documenting this in your medical notes and will update your daily target range.",
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }, 2000);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // =========================================================================
  // VIEW 1: PRE-JOIN CHECK SCREEN (Google Meet Style)
  // =========================================================================
  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-[#101A45] flex flex-col justify-between p-6 sm:p-10">
        {/* Top Header */}
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/support"
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition flex items-center gap-1 text-xs font-semibold"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back to Pulse Support</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[#087F8C] bg-[#D5F3E7] px-3 py-1.5 rounded-full border border-[#A6E8D1]">
            <ShieldCheck className="w-4 h-4" />
            <span>Encrypted Consultation Room</span>
          </div>
        </div>

        {/* Main Pre-join Grid */}
        <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center py-6">
          {/* Left: Camera Preview Box (md:col-span-7) */}
          <div className="md:col-span-7 space-y-4">
            <div className="relative aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-200 flex items-center justify-center">
              {isVideoOn ? (
                <video
                  ref={prejoinVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-2xl">
                    AM
                  </div>
                  <span className="text-xs">Camera is off</span>
                </div>
              )}

              {/* Bottom Quick Controls in preview */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-full border border-slate-700">
                <button
                  onClick={toggleMic}
                  className={`p-3 rounded-full transition ${
                    isMicOn ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-red-600 text-white"
                  }`}
                  title={isMicOn ? "Mute mic" : "Unmute mic"}
                >
                  {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
                <button
                  onClick={toggleVideo}
                  className={`p-3 rounded-full transition ${
                    isVideoOn ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-red-600 text-white"
                  }`}
                  title={isVideoOn ? "Turn off camera" : "Turn on camera"}
                >
                  {isVideoOn ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <p className="text-xs text-center text-slate-500">
              Check your camera and microphone settings before entering.
            </p>
          </div>

          {/* Right: Join Info Box (md:col-span-5) */}
          <div className="md:col-span-5 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-[#101A45]">Ready to join?</h2>
              <p className="text-xs text-slate-500 mt-1">
                Room Code: <span className="font-mono text-slate-700">{roomCode}</span>
              </p>
            </div>

            {/* Doctor Info Card */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3.5">
              <img
                src={doctor.avatarUrl}
                alt={doctor.name || "Doctor"}
                className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
              />
              <div className="min-w-0">
                <div className="font-semibold text-sm text-[#101A45] truncate">
                  {doctor.title || doctor.name}
                </div>
                <div className="text-xs text-[#087F8C] font-medium truncate">
                  {doctor.specialty}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 truncate">
                  {appointmentTopic}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => setHasJoined(true)}
                className="w-full py-3.5 bg-[#087F8C] hover:bg-[#066570] text-white rounded-xl text-sm font-semibold shadow-md hover:shadow-lg transition active:scale-95 flex items-center justify-center gap-2"
              >
                <VideoIcon className="w-4 h-4" />
                <span>Join Consultation Now</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  showToast("Meeting link copied to clipboard!");
                }}
                className="w-full py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Invitation Link</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="max-w-5xl mx-auto w-full text-center text-[11px] text-slate-400">
          Pulse Telehealth consultation is strictly confidential and protected by healthcare privacy regulations.
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: IN-CALL CONSULTATION (Google Meet Layout)
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#1E293B] text-white flex flex-col justify-between overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#101A45] text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 border border-slate-700">
          <CheckCircle2 className="w-5 h-5 text-[#087F8C]" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Floating Header */}
      <header className="px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm tracking-tight text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {doctor.name} • Consultation
          </span>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            ({roomCode})
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 rounded-full text-xs font-mono text-emerald-300 border border-slate-700">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 rounded-full text-xs text-slate-300 border border-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-[#087F8C]" />
            <span>Secure Video</span>
          </div>
        </div>
      </header>

      {/* Center Main Video Stage */}
      <main className="flex-1 px-4 sm:px-6 pb-24 pt-2 flex items-center justify-center relative">
        <div className="w-full max-w-6xl h-full flex flex-col lg:flex-row gap-4 items-center justify-center">
          {/* Main Feed: Clinician Video Card */}
          <div className="relative flex-1 w-full h-[60vh] lg:h-[72vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 flex items-center justify-center group">
            {/* Simulated Live Doctor Video Feed */}
            <img
              src={doctor.avatarUrl}
              alt={doctor.name || "Doctor"}
              className="w-full h-full object-cover filter brightness-95"
            />

            {/* Speaking Audio Indicator */}
            <div className="absolute top-4 left-4 bg-slate-900/70 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-slate-700">
              <div className="flex items-center gap-1">
                <span className="w-1 h-3 bg-emerald-400 rounded-full animate-bounce"></span>
                <span className="w-1 h-4 bg-emerald-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-1 h-2 bg-emerald-400 rounded-full animate-bounce delay-150"></span>
              </div>
              <span className="text-xs font-medium text-white">{doctor.title}</span>
            </div>

            {/* Specialty Badge */}
            <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs text-slate-300 border border-slate-700">
              {doctor.specialty}
            </div>
          </div>

          {/* Picture-in-Picture / Patient Feed */}
          <div className="relative w-full lg:w-72 h-44 lg:h-52 bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-700 shrink-0 flex items-center justify-center">
            {isVideoOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 space-y-1">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-sm">
                  You
                </div>
                <span className="text-[10px]">Camera off</span>
              </div>
            )}

            <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] text-white">
              You {isMicOn ? "" : "(Muted)"}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* SIDE DRAWER: IN-CALL CHAT & NOTES                          */}
        {/* ========================================================= */}
        {activeDrawer && (
          <div className="absolute inset-x-2 sm:inset-auto sm:right-6 top-2 bottom-20 sm:bottom-24 sm:w-96 bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl flex flex-col z-30 animate-in slide-in-from-right duration-200">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="font-semibold text-sm text-white flex items-center gap-2">
                {activeDrawer === "chat" ? (
                  <>
                    <MessageSquare className="w-4 h-4 text-[#087F8C]" />
                    <span>In-Call Messages</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 text-[#087F8C]" />
                    <span>Consultation Notes</span>
                  </>
                )}
              </h4>
              <button
                onClick={() => setActiveDrawer(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeDrawer === "chat" ? (
              <>
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {messages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex flex-col ${
                        m.sender === "patient" ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                          m.sender === "patient"
                            ? "bg-[#087F8C] text-white rounded-br-none"
                            : "bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700"
                        }`}
                      >
                        {m.text}
                      </div>
                      <span className="text-[10px] text-slate-500 mt-1 px-1">
                        {m.time}
                      </span>
                    </div>
                  ))}
                </div>

                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-slate-800 flex gap-2"
                >
                  <input
                    type="text"
                    placeholder="Send a message to doctor..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 bg-slate-800 text-white placeholder-slate-400 text-xs px-3 py-2 rounded-xl border border-slate-700 focus:outline-hidden focus:border-[#087F8C]"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-[#087F8C] hover:bg-[#066570] text-white rounded-xl transition"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs text-slate-300">
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1.5">
                  <div className="font-semibold text-white">Chief Complaint:</div>
                  <p className="text-slate-400">{appointmentTopic}</p>
                </div>
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1.5">
                  <div className="font-semibold text-white">Clinical Assessment:</div>
                  <p className="text-slate-400">
                    Patient maintaining steady glycemic time-in-range (TIR &gt; 74%). Evening post-prandial excursions are well managed.
                  </p>
                </div>
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-1.5">
                  <div className="font-semibold text-white">Action Plan:</div>
                  <ul className="list-disc list-inside text-slate-400 space-y-1">
                    <li>Maintain current Metformin dose with dinner.</li>
                    <li>Continue daily 15-min post-meal walk.</li>
                    <li>Next scheduled follow-up in 4 weeks.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Bottom Toolbar (Google Meet Inspired) */}
      <footer className="fixed bottom-0 left-0 right-0 py-3 sm:py-4 px-3 sm:px-6 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex items-center justify-between z-20 gap-2">
        <div className="hidden md:block text-xs text-slate-400 font-mono truncate max-w-[120px]">
          {roomCode}
        </div>

        {/* Center Control Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 mx-auto">
          {/* Mic Button */}
          <button
            onClick={toggleMic}
            className={`p-2.5 sm:p-3.5 rounded-full transition shadow-md min-h-[44px] min-w-[44px] flex items-center justify-center ${
              isMicOn
                ? "bg-slate-700 text-white hover:bg-slate-600"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
            title={isMicOn ? "Mute mic" : "Unmute mic"}
          >
            {isMicOn ? <Mic className="w-4 sm:w-5 h-4 sm:h-5" /> : <MicOff className="w-4 sm:w-5 h-4 sm:h-5" />}
          </button>

          {/* Camera Button */}
          <button
            onClick={toggleVideo}
            className={`p-2.5 sm:p-3.5 rounded-full transition shadow-md min-h-[44px] min-w-[44px] flex items-center justify-center ${
              isVideoOn
                ? "bg-slate-700 text-white hover:bg-slate-600"
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
            title={isVideoOn ? "Turn off camera" : "Turn on camera"}
          >
            {isVideoOn ? <VideoIcon className="w-4 sm:w-5 h-4 sm:h-5" /> : <VideoOff className="w-4 sm:w-5 h-4 sm:h-5" />}
          </button>

          {/* Screen Share Button */}
          <button
            onClick={handleToggleScreenShare}
            className={`p-2.5 sm:p-3.5 rounded-full transition shadow-md min-h-[44px] min-w-[44px] flex items-center justify-center ${
              isScreenSharing
                ? "bg-[#087F8C] text-white"
                : "bg-slate-700 text-white hover:bg-slate-600"
            }`}
            title="Share screen"
          >
            <MonitorUp className="w-4 sm:w-5 h-4 sm:h-5" />
          </button>

          {/* End Call Button */}
          <button
            onClick={() => setLeaveModalOpen(true)}
            className="p-2.5 px-3.5 sm:p-3.5 sm:px-6 rounded-full bg-red-600 hover:bg-red-700 text-white transition shadow-lg flex items-center gap-1.5 sm:gap-2 min-h-[44px]"
            title="Leave consultation"
          >
            <PhoneOff className="w-4 sm:w-5 h-4 sm:h-5" />
            <span className="text-xs font-semibold hidden sm:inline">Leave Call</span>
          </button>
        </div>

        {/* Right Tools (Chat & Notes) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setActiveDrawer(activeDrawer === "chat" ? null : "chat")}
            className={`p-2.5 sm:p-3 rounded-full transition relative min-h-[44px] min-w-[44px] flex items-center justify-center ${
              activeDrawer === "chat"
                ? "bg-[#087F8C] text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
            title="In-call chat"
          >
            <MessageSquare className="w-4 sm:w-5 h-4 sm:h-5" />
          </button>

          <button
            onClick={() => setActiveDrawer(activeDrawer === "notes" ? null : "notes")}
            className={`p-2.5 sm:p-3 rounded-full transition min-h-[44px] min-w-[44px] flex items-center justify-center ${
              activeDrawer === "notes"
                ? "bg-[#087F8C] text-white"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
            title="Consultation notes"
          >
            <FileText className="w-4 sm:w-5 h-4 sm:h-5" />
          </button>
        </div>
      </footer>

      {/* Leave Call Confirmation Modal */}
      {leaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-[90dvh] overflow-y-auto p-6 shadow-2xl border border-slate-200 text-[#101A45] animate-in fade-in zoom-in-95 space-y-4">
            <h3 className="font-semibold text-base">Leave Consultation?</h3>
            <p className="text-xs text-slate-600">
              Are you sure you want to exit the video call? Your clinical notes will be saved to your consultation history.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setLeaveModalOpen(false)}
                className="flex-1 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Stay in Call
              </button>
              <button
                onClick={() => {
                  if (mediaStream) {
                    mediaStream.getTracks().forEach((track) => track.stop());
                  }
                  router.push("/support");
                }}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Leave Consultation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
