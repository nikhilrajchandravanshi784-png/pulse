"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Video,
  Plus,
  Calendar as CalendarIcon,
  MonitorUp,
  Sparkles,
  Info,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Clock,
  User,
  CheckCircle2,
  AlertCircle,
  FileText,
  Copy,
  ExternalLink,
  ShieldCheck,
  Stethoscope,
  Star,
  RefreshCw,
  Phone,
  CalendarCheck,
  Users,
  HeartHandshake,
} from "lucide-react";
import { DesktopSidebar } from "@/components/layout/DesktopSidebar";
import { PulseTopHeader } from "@/components/layout/PulseTopHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";

interface Specialist {
  id: string;
  name: string;
  title: string;
  role: string;
  specialty: string;
  qualifications: string;
  hospitalClinic: string;
  languages: string[];
  bio: string;
  rating: number;
  reviewsCount: number;
  avatarUrl: string;
}

interface Appointment {
  id: string;
  specialistId: string;
  appointmentType: string;
  reason: string;
  optionalPatientNote?: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  meetingRoomId: string;
  meetingUrl: string;
  specialist: Specialist;
}

interface Slot {
  time: string;
  label: string;
  available: boolean;
  reason?: string;
}

export default function SupportPage() {
  const router = useRouter();

  // 1. Live Clock & Current Date
  const [currentTime, setCurrentTime] = useState({
    timeStr: "15:19",
    dateStr: "Friday, October 9, 2026",
    isoDate: "2026-10-09",
  });

  // 2. Selected Day in Calendar Viewer
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarBannerDismissed, setCalendarBannerDismissed] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);

  // 3. Appointments & Specialists Data
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 4. Modals State
  const [newMeetingMenuOpen, setNewMeetingMenuOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [shareScreenModalOpen, setShareScreenModalOpen] = useState(false);
  const [notesDrawerOpen, setNotesDrawerOpen] = useState(false);
  const [recordingsModalOpen, setRecordingsModalOpen] = useState(false);
  const [shareableLinkModalOpen, setShareableLinkModalOpen] = useState(false);
  const [createdShareLink, setCreatedShareLink] = useState("");

  // Join meeting code input
  const [meetingCodeInput, setMeetingCodeInput] = useState("");

  // 5. Scheduling Wizard State
  const [scheduleStep, setScheduleStep] = useState<number>(1);
  const [selectedSpecialist, setSelectedSpecialist] = useState<Specialist | null>(null);
  const [selectedConsultType, setSelectedConsultType] = useState("VIDEO_CONSULTATION");
  const [bookingDateStr, setBookingDateStr] = useState<string>("");
  const [bookingTimeSlot, setBookingTimeSlot] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [consultReason, setConsultReason] = useState("");
  const [patientNotes, setPatientNotes] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  // 6. Reschedule / Cancel appointment state
  const [actionAppointment, setActionAppointment] = useState<Appointment | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // Ticking Clock effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const timeStr = `${hours}:${minutes}`;

      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      };
      const dateStr = now.toLocaleDateString("en-US", options);
      const isoDate = now.toISOString().split("T")[0];

      setCurrentTime({ timeStr, dateStr, isoDate });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Set default booking date to today
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setBookingDateStr(today);
  }, []);

  // Fetch verified specialists
  useEffect(() => {
    const fetchSpecialists = async () => {
      try {
        const res = await fetch("/api/support/specialists");
        const data = await res.json();
        if (data.success && data.specialists) {
          setSpecialists(data.specialists);
          if (data.specialists.length > 0 && !selectedSpecialist) {
            setSelectedSpecialist(data.specialists[0]);
          }
        }
      } catch (err) {
        console.error("Failed to load specialists:", err);
      }
    };
    fetchSpecialists();
  }, []);

  // Fetch appointments for selected date
  const fetchAppointmentsForDate = async (date: Date) => {
    setLoadingAppointments(true);
    try {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;

      const res = await fetch(`/api/support/appointments?date=${dateStr}`);
      const data = await res.json();
      if (data.success) {
        setAppointments(data.appointments || []);
      }
    } catch (err) {
      console.error("Failed to load appointments:", err);
    } finally {
      setLoadingAppointments(false);
    }
  };

  useEffect(() => {
    fetchAppointmentsForDate(selectedDate);
  }, [selectedDate]);

  // Fetch available slots when specialist or booking date changes
  useEffect(() => {
    if (!selectedSpecialist || !bookingDateStr) return;

    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const res = await fetch(
          `/api/support/availability?specialistId=${selectedSpecialist.id}&date=${bookingDateStr}`
        );
        const data = await res.json();
        if (data.success && data.slots) {
          setAvailableSlots(data.slots);
          const firstAvailable = data.slots.find((s: Slot) => s.available);
          if (firstAvailable) {
            setBookingTimeSlot(firstAvailable.time);
          } else {
            setBookingTimeSlot("");
          }
        } else {
          setAvailableSlots([]);
          setBookingTimeSlot("");
        }
      } catch (err) {
        console.error("Failed to fetch slots:", err);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [selectedSpecialist, bookingDateStr]);

  // Date Navigation
  const handlePrevDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() - 1);
    setSelectedDate(next);
  };

  const handleNextDay = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const formatHeaderDate = (date: Date) => {
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();

    if (isToday) {
      return `Today, ${month} ${day}`;
    }

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear();

    if (isTomorrow) {
      return `Tomorrow, ${month} ${day}`;
    }

    return `${month} ${day}, ${date.getFullYear()}`;
  };

  // Instant Consultation
  const handleStartInstantMeeting = () => {
    const roomCode = `pulse-instant-${Math.random().toString(36).substring(2, 8)}`;
    router.push(`/support/meeting/${roomCode}`);
  };

  const handleCreateShareableLink = () => {
    const roomCode = `pulse-meet-${Math.random().toString(36).substring(2, 8)}`;
    const fullUrl = `${window.location.origin}/support/meeting/${roomCode}`;
    setCreatedShareLink(fullUrl);
    setNewMeetingMenuOpen(false);
    setShareableLinkModalOpen(true);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Submit appointment booking
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpecialist || !bookingDateStr || !bookingTimeSlot || !consultReason.trim()) {
      showToast("Please select doctor, date, time slot, and enter consultation reason.");
      return;
    }

    setBookingSubmitting(true);
    try {
      const res = await fetch("/api/support/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specialistId: selectedSpecialist.id,
          appointmentType: selectedConsultType,
          reason: consultReason,
          optionalPatientNote: patientNotes,
          dateStr: bookingDateStr,
          timeStr: bookingTimeSlot,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showToast("Consultation scheduled successfully! Added to your schedule.");
        setScheduleModalOpen(false);
        setScheduleStep(1);
        setConsultReason("");
        setPatientNotes("");
        // Reload appointments
        fetchAppointmentsForDate(selectedDate);
      } else {
        showToast(data.error || "Failed to schedule consultation.");
      }
    } catch (err: any) {
      showToast(err.message || "An unexpected error occurred.");
    } finally {
      setBookingSubmitting(false);
    }
  };

  // Cancel appointment
  const handleConfirmCancel = async () => {
    if (!actionAppointment) return;
    try {
      const res = await fetch(`/api/support/appointments/${actionAppointment.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json();
      if (data.success) {
        showToast("Consultation cancelled.");
        setCancelModalOpen(false);
        setActionAppointment(null);
        fetchAppointmentsForDate(selectedDate);
      } else {
        showToast(data.error || "Failed to cancel.");
      }
    } catch (err) {
      showToast("Failed to cancel appointment.");
    }
  };

  return (
    <div className="min-h-screen bg-[#DCE8EC] text-[#101A45] flex flex-col lg:flex-row font-sans">
      <DesktopSidebar />

      <div className="flex-1 flex flex-col min-h-screen pb-20 lg:pb-8">
        <PulseTopHeader activeTab="Support" />

        <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#101A45] text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-fade-in border border-slate-700">
          <CheckCircle2 className="w-5 h-5 text-[#087F8C]" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Container - Centered max-w-2xl matching screenshot layout */}
      <div className="max-w-2xl mx-auto space-y-7">
        {/* Top Header Sparkle Button & Brand Indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#D5F3E7] text-[#087F8C] border border-[#A6E8D1]">
              <ShieldCheck className="w-3.5 h-3.5" />
              Pulse Support & Telehealth
            </span>
          </div>
          <button
            title="AI Clinical Assist & Preferences"
            onClick={() => showToast("Pulse AI Consultation Assistant is active.")}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition"
          >
            <Sparkles className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Live Clock & Date */}
        <div className="text-center pt-2">
          <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight text-[#101A45]">
            {currentTime.timeStr}
          </h1>
          <p className="text-slate-500 font-normal text-base sm:text-lg mt-1">
            {currentTime.dateStr}
          </p>
        </div>

        {/* 5 Squircles Quick Action Buttons */}
        <div className="grid grid-cols-5 gap-2 sm:gap-4 max-w-lg mx-auto text-center pt-2">
          {/* 1. New meeting */}
          <div className="relative flex flex-col items-center">
            <button
              onClick={() => setNewMeetingMenuOpen(!newMeetingMenuOpen)}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-[22px] bg-[#FF5A1F] hover:bg-[#E54F19] text-white flex items-center justify-center shadow-sm hover:shadow-md transition active:scale-95"
              aria-label="New meeting options"
            >
              <Video className="w-7 h-7" />
            </button>
            <button
              onClick={() => setNewMeetingMenuOpen(!newMeetingMenuOpen)}
              className="mt-2 text-xs sm:text-sm font-medium text-slate-700 flex items-center justify-center gap-0.5 hover:text-slate-900"
            >
              <span>New meeting</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            </button>

            {/* Dropdown Menu for New meeting */}
            {newMeetingMenuOpen && (
              <div
                className="absolute top-20 left-0 sm:left-1/2 sm:-translate-x-1/2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-40 text-left animate-in fade-in zoom-in-95"
                onMouseLeave={() => setNewMeetingMenuOpen(false)}
              >
                <button
                  onClick={handleStartInstantMeeting}
                  className="w-full px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition"
                >
                  <Video className="w-4 h-4 text-[#FF5A1F]" />
                  <div>
                    <div className="font-medium text-[#101A45]">Start instant consultation</div>
                    <div className="text-xs text-slate-500">Connect with on-duty clinician</div>
                  </div>
                </button>
                <button
                  onClick={handleCreateShareableLink}
                  className="w-full px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition"
                >
                  <Copy className="w-4 h-4 text-[#087F8C]" />
                  <div>
                    <div className="font-medium text-[#101A45]">Create a link for later</div>
                    <div className="text-xs text-slate-500">Generate meeting link to share</div>
                  </div>
                </button>
                <div className="border-t border-slate-100 my-1"></div>
                <button
                  onClick={() => {
                    setNewMeetingMenuOpen(false);
                    setScheduleModalOpen(true);
                  }}
                  className="w-full px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition"
                >
                  <CalendarIcon className="w-4 h-4 text-[#0E71EB]" />
                  <div>
                    <div className="font-medium text-[#101A45]">Schedule in Calendar</div>
                    <div className="text-xs text-slate-500">Book specialist with custom slot</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* 2. Join */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setJoinModalOpen(true)}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-[22px] bg-[#0E71EB] hover:bg-[#0C63D0] text-white flex items-center justify-center shadow-sm hover:shadow-md transition active:scale-95"
              aria-label="Join meeting"
            >
              <Plus className="w-7 h-7" />
            </button>
            <span className="mt-2 text-xs sm:text-sm font-medium text-slate-700">Join</span>
          </div>

          {/* 3. Schedule */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => {
                setScheduleStep(1);
                setScheduleModalOpen(true);
              }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-[22px] bg-[#0E71EB] hover:bg-[#0C63D0] text-white flex items-center justify-center shadow-sm hover:shadow-md transition active:scale-95 relative"
              aria-label="Schedule consultation"
            >
              <div className="relative flex flex-col items-center justify-center">
                <CalendarIcon className="w-7 h-7" />
                <span className="absolute text-[9px] font-bold top-[8px] text-white">31</span>
              </div>
            </button>
            <span className="mt-2 text-xs sm:text-sm font-medium text-slate-700">Schedule</span>
          </div>

          {/* 4. Share screen */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setShareScreenModalOpen(true)}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-[22px] bg-[#0E71EB] hover:bg-[#0C63D0] text-white flex items-center justify-center shadow-sm hover:shadow-md transition active:scale-95"
              aria-label="Share screen"
            >
              <MonitorUp className="w-7 h-7" />
            </button>
            <span className="mt-2 text-xs sm:text-sm font-medium text-slate-700">Share screen</span>
          </div>

          {/* 5. My Notes */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setNotesDrawerOpen(true)}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-[22px] bg-[#0E71EB] hover:bg-[#0C63D0] text-white flex items-center justify-center shadow-sm hover:shadow-md transition active:scale-95"
              aria-label="My Notes"
            >
              <Sparkles className="w-7 h-7" />
            </button>
            <span className="mt-2 text-xs sm:text-sm font-medium text-slate-700">My Notes</span>
          </div>
        </div>

        {/* Calendar Banner */}
        {!calendarBannerDismissed && (
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-2xl p-4 flex items-center justify-between text-slate-700 shadow-sm transition">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-full bg-blue-100 text-[#0E71EB] shrink-0">
                <Info className="w-5 h-5" />
              </div>
              <p className="text-sm">
                You haven&apos;t connected your calendar yet.{" "}
                <button
                  onClick={() => {
                    setCalendarConnected(true);
                    showToast("Calendar synchronized with Pulse Healthcare Schedule.");
                  }}
                  className="text-[#0E71EB] font-medium hover:underline inline"
                >
                  {calendarConnected ? "Calendar Connected ✓" : "Connect now"}
                </button>{" "}
                to manage all your meetings and events in one place.
              </p>
            </div>
            <button
              onClick={() => setCalendarBannerDismissed(true)}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Daily Meeting Schedule Card - Matching Reference Image */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Card Top Sub-Header: + on left, Today Date in Center, Menu on Right */}
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setScheduleModalOpen(true)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition"
              title="Schedule Consultation"
            >
              <Plus className="w-5 h-5" />
            </button>

            <button
              onClick={handleToday}
              className="text-sm font-semibold text-[#101A45] flex items-center gap-1 hover:text-[#087F8C] transition"
            >
              <span>{formatHeaderDate(selectedDate)}</span>
              <ChevronDown className="w-4 h-4 text-slate-500" />
            </button>

            <button
              onClick={() => fetchAppointmentsForDate(selectedDate)}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition"
              title="Refresh schedule"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Secondary Controls Bar: Today pill, < > navigation, options */}
          <div className="px-5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <button
                onClick={handleToday}
                className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs flex items-center gap-1.5 transition"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>Today</span>
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevDay}
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextDay}
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              onClick={() => setRecordingsModalOpen(true)}
              className="text-slate-400 hover:text-slate-600 p-1"
              title="View consultation records"
            >
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Appointments Content Area */}
          <div className="p-6 min-h-[220px] flex flex-col justify-center">
            {loadingAppointments ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-[#087F8C]" />
                <span className="text-xs">Loading consultations...</span>
              </div>
            ) : appointments.length === 0 ? (
              /* Empty State: Matching beach umbrella illustration in reference */
              <div className="py-8 flex flex-col items-center justify-center text-center">
                <div className="w-48 h-32 flex items-center justify-center">
                  <svg className="w-40 h-28" viewBox="0 0 200 130" fill="none">
                    {/* Shadow oval */}
                    <ellipse cx="102" cy="108" rx="55" ry="12" fill="#EBF0F8" />
                    {/* Lounge chair */}
                    <path
                      d="M96 102 L124 102 L116 88 L88 88 Z"
                      fill="#D8E2F0"
                    />
                    <line
                      x1="92"
                      y1="102"
                      x2="120"
                      y2="88"
                      stroke="#A6B8D4"
                      strokeWidth="2"
                      strokeDasharray="3 3"
                    />
                    {/* Umbrella pole */}
                    <line
                      x1="105"
                      y1="44"
                      x2="95"
                      y2="108"
                      stroke="#8E9EBA"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                    {/* Umbrella canopy */}
                    <path
                      d="M48 64 Q100 28 152 64 L100 44 Z"
                      fill="#BDCDE6"
                    />
                    <path
                      d="M48 64 Q76 36 100 44 L100 44 Z"
                      fill="#A4B9D8"
                    />
                    <path
                      d="M100 44 Q124 36 152 64 L100 44 Z"
                      fill="#D4E0F2"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-600 mt-2">
                  No meetings scheduled.
                </p>
                <button
                  onClick={() => setScheduleModalOpen(true)}
                  className="mt-3 text-xs font-semibold text-[#087F8C] hover:text-[#066570] hover:underline"
                >
                  + Schedule a consultation
                </button>
              </div>
            ) : (
              /* Populated State: Scheduled Appointments List */
              <div className="space-y-3">
                {appointments.map((appt) => {
                  const scheduledDate = new Date(appt.scheduledAt);
                  const timeFormatted = scheduledDate.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  });

                  return (
                    <div
                      key={appt.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-[#087F8C]/40 bg-white transition hover:shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <img
                          src={
                            appt.specialist?.avatarUrl ||
                            "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&auto=format&fit=crop&q=80"
                          }
                          alt={appt.specialist?.name || "Specialist"}
                          className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-[#101A45]">
                              {appt.specialist?.title || appt.specialist?.name}
                            </h4>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#D5F3E7] text-[#087F8C]">
                              {appt.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {appt.specialist?.specialty} • {appt.appointmentType.replace("_", " ")}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-[#087F8C]" />
                            <span className="font-medium text-slate-800">{timeFormatted}</span>
                            <span>({appt.durationMinutes} mins)</span>
                          </div>
                          {appt.reason && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic">
                              &ldquo;{appt.reason}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Link
                          href={`/support/meeting/${appt.meetingRoomId}`}
                          className="px-4 py-2 bg-[#0E71EB] hover:bg-[#0C63D0] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-95"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Meeting</span>
                        </Link>
                        <button
                          onClick={() => {
                            setActionAppointment(appt);
                            setCancelModalOpen(true);
                          }}
                          className="px-2.5 py-2 text-slate-400 hover:text-red-600 text-xs font-medium rounded-xl hover:bg-red-50 transition"
                          title="Cancel appointment"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Bar: Open recordings > */}
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <button
              onClick={() => setRecordingsModalOpen(true)}
              className="text-xs font-medium text-slate-600 hover:text-[#087F8C] flex items-center gap-1 transition"
            >
              <span>Open recordings</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <span className="text-[11px] text-slate-400">
              HIPAA & Telehealth Encrypted
            </span>
          </div>
        </div>

        {/* Quick Access to Care Circle & Community Support */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <Link
            href="/circle"
            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-[#087F8C]/40 transition shadow-xs flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#D5F3E7] text-[#087F8C] rounded-xl shrink-0">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Care Team</div>
                <div className="text-sm font-semibold text-[#101A45] group-hover:text-[#087F8C] transition">
                  Family & Care Circle
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
          </Link>

          <Link
            href="/community/groups/building-healthy-habits"
            className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-[#087F8C]/40 transition shadow-xs flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-[#0E71EB] rounded-xl shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-slate-500">Peer Support</div>
                <div className="text-sm font-semibold text-[#101A45] group-hover:text-[#087F8C] transition">
                  Diabetes Community
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
          </Link>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 1. SCHEDULE CONSULTATION MODAL (FULL BOOKING WIZARD)     */}
      {/* ========================================================= */}
      {scheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-semibold text-lg text-[#101A45]">
                  Schedule Doctor Consultation
                </h3>
                <p className="text-xs text-slate-500">
                  Step {scheduleStep} of 3:{" "}
                  {scheduleStep === 1
                    ? "Choose Specialist"
                    : scheduleStep === 2
                    ? "Select Date & Time"
                    : "Clinical Notes & Confirmation"}
                </p>
              </div>
              <button
                onClick={() => setScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* STEP 1: SELECT SPECIALIST */}
              {scheduleStep === 1 && (
                <div className="space-y-4">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Select Healthcare Professional
                  </label>
                  <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                    {specialists.map((doc) => {
                      const isSelected = selectedSpecialist?.id === doc.id;
                      return (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedSpecialist(doc)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3.5 ${
                            isSelected
                              ? "border-[#087F8C] bg-[#D5F3E7]/30 ring-1 ring-[#087F8C]"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <img
                            src={doc.avatarUrl}
                            alt={doc.name}
                            className="w-12 h-12 rounded-xl object-cover shrink-0 border border-slate-200"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-sm text-[#101A45] truncate">
                                {doc.title}
                              </h4>
                              <span className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                {doc.rating}
                              </span>
                            </div>
                            <p className="text-xs text-[#087F8C] font-medium mt-0.5">
                              {doc.specialty}
                            </p>
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                              {doc.bio}
                            </p>
                            <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                              <span>🗣 {doc.languages?.join(", ")}</span>
                              <span>•</span>
                              <span>🏥 {doc.hospitalClinic}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setScheduleStep(2)}
                    disabled={!selectedSpecialist}
                    className="w-full py-2.5 bg-[#087F8C] hover:bg-[#066570] disabled:bg-slate-300 text-white rounded-xl text-sm font-semibold transition"
                  >
                    Continue to Date & Time →
                  </button>
                </div>
              )}

              {/* STEP 2: SELECT DATE & TIME SLOT */}
              {scheduleStep === 2 && (
                <div className="space-y-4">
                  {selectedSpecialist && (
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <img
                        src={selectedSpecialist.avatarUrl}
                        alt={selectedSpecialist.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div>
                        <div className="font-semibold text-xs text-[#101A45]">
                          {selectedSpecialist.title}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {selectedSpecialist.specialty} • 30 mins
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Consultation Type */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Consultation Format
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedConsultType("VIDEO_CONSULTATION")}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-2 transition ${
                          selectedConsultType === "VIDEO_CONSULTATION"
                            ? "bg-[#D5F3E7] border-[#087F8C] text-[#087F8C]"
                            : "bg-white border-slate-200 text-slate-700"
                        }`}
                      >
                        <Video className="w-4 h-4" />
                        <span>Video Consultation</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedConsultType("FOLLOW_UP")}
                        className={`py-2 px-3 rounded-xl text-xs font-medium border flex items-center justify-center gap-2 transition ${
                          selectedConsultType === "FOLLOW_UP"
                            ? "bg-[#D5F3E7] border-[#087F8C] text-[#087F8C]"
                            : "bg-white border-slate-200 text-slate-700"
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        <span>Follow-up Review</span>
                      </button>
                    </div>
                  </div>

                  {/* Date Input */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Consultation Date
                    </label>
                    <input
                      type="date"
                      value={bookingDateStr}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setBookingDateStr(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#087F8C]"
                    />
                  </div>

                  {/* Time Slots */}
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Available Time Slots
                    </label>
                    {loadingSlots ? (
                      <div className="py-6 flex items-center justify-center text-xs text-slate-400">
                        <RefreshCw className="w-4 h-4 animate-spin mr-2 text-[#087F8C]" />
                        Checking doctor schedule...
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="py-4 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
                        No available slots for this date. Please pick another date.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => setBookingTimeSlot(slot.time)}
                            className={`py-2 px-2 rounded-xl text-xs font-medium border transition ${
                              !slot.available
                                ? "bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed"
                                : bookingTimeSlot === slot.time
                                ? "bg-[#087F8C] text-white border-[#087F8C] shadow-xs"
                                : "bg-white text-slate-700 border-slate-200 hover:border-[#087F8C]"
                            }`}
                          >
                            {slot.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setScheduleStep(1)}
                      className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50"
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleStep(3)}
                      disabled={!bookingTimeSlot}
                      className="flex-1 py-2.5 bg-[#087F8C] hover:bg-[#066570] disabled:bg-slate-300 text-white rounded-xl text-sm font-semibold transition"
                    >
                      Continue to Notes →
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: REASON & CONFIRMATION */}
              {scheduleStep === 3 && (
                <form onSubmit={handleBookAppointment} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Consultation Reason / Chief Symptoms *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HbA1c review, insulin dosage titration, high fasting sugar"
                      value={consultReason}
                      onChange={(e) => setConsultReason(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#087F8C]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                      Additional Notes for Doctor (Optional)
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Share recent CGM readings, medication changes, or specific dietary challenges..."
                      value={patientNotes}
                      onChange={(e) => setPatientNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#087F8C]"
                    />
                  </div>

                  {/* Summary Box */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-600">
                    <div className="font-semibold text-slate-800 text-sm">
                      Appointment Summary
                    </div>
                    <div>
                      <span className="text-slate-400">Doctor:</span>{" "}
                      <span className="font-medium text-slate-800">
                        {selectedSpecialist?.title}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Date & Time:</span>{" "}
                      <span className="font-medium text-slate-800">
                        {bookingDateStr} at {bookingTimeSlot} (30 mins)
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400">Format:</span>{" "}
                      <span className="font-medium text-slate-800">
                        Online Encrypted Video Consultation
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setScheduleStep(2)}
                      className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50"
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      disabled={bookingSubmitting || !consultReason.trim()}
                      className="flex-1 py-2.5 bg-[#087F8C] hover:bg-[#066570] disabled:bg-slate-300 text-white rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
                    >
                      {bookingSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Booking...</span>
                        </>
                      ) : (
                        <span>Confirm & Schedule Consultation</span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. JOIN CONSULTATION MODAL                                */}
      {/* ========================================================= */}
      {joinModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg text-[#101A45]">
                Join Consultation
              </h3>
              <button
                onClick={() => setJoinModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Meeting Code or Link
              </label>
              <input
                type="text"
                placeholder="e.g. pulse-rv-982 or paste link"
                value={meetingCodeInput}
                onChange={(e) => setMeetingCodeInput(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#0E71EB]"
              />
            </div>

            {/* Quick Join Upcoming if today */}
            {appointments.length > 0 && (
              <div>
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Or Join Scheduled Consultation
                </label>
                <div className="space-y-2">
                  {appointments.slice(0, 2).map((a) => (
                    <button
                      key={a.id}
                      onClick={() => router.push(`/support/meeting/${a.meetingRoomId}`)}
                      className="w-full p-3 rounded-xl border border-slate-200 hover:border-[#0E71EB] bg-slate-50 hover:bg-blue-50/50 flex items-center justify-between text-left transition group"
                    >
                      <div>
                        <div className="text-xs font-semibold text-[#101A45] group-hover:text-[#0E71EB]">
                          {a.specialist?.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {new Date(a.scheduledAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-[#0E71EB] flex items-center gap-1">
                        Join Now →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setJoinModalOpen(false)}
                className="px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!meetingCodeInput.trim()) return;
                  const code = meetingCodeInput
                    .replace(/^https?:\/\/[^/]+\/support\/meeting\//, "")
                    .trim();
                  router.push(`/support/meeting/${code}`);
                }}
                disabled={!meetingCodeInput.trim()}
                className="flex-1 py-2.5 bg-[#0E71EB] hover:bg-[#0C63D0] disabled:bg-slate-300 text-white rounded-xl text-sm font-semibold transition"
              >
                Join Consultation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. SHARE SCREEN MODAL                                     */}
      {/* ========================================================= */}
      {shareScreenModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-[#0E71EB] rounded-xl">
                  <MonitorUp className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-lg text-[#101A45]">
                  Share Screen in Meeting
                </h3>
              </div>
              <button
                onClick={() => setShareScreenModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Share your lab reports, CGM glucose graphs, or medical documents directly with your doctor during the consultation.
            </p>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="text-xs font-semibold text-[#101A45]">
                How to share during consultation:
              </div>
              <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
                <li>Join or start your consultation call</li>
                <li>Click the &ldquo;Present Screen&rdquo; icon on the bottom toolbar</li>
                <li>Select the window containing your PDF reports or glucose dashboard</li>
              </ul>
            </div>

            <button
              onClick={async () => {
                try {
                  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
                    await navigator.mediaDevices.getDisplayMedia({ video: true });
                    showToast("Screen capture test successful!");
                    setShareScreenModalOpen(false);
                  } else {
                    showToast("Screen sharing is supported inside the consultation room.");
                  }
                } catch {
                  // User cancelled share test
                }
              }}
              className="w-full py-2.5 bg-[#0E71EB] hover:bg-[#0C63D0] text-white rounded-xl text-sm font-semibold transition"
            >
              Test Screen Share Permissions
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MY NOTES & CLINICAL SUMMARIES DRAWER                   */}
      {/* ========================================================= */}
      {notesDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white max-w-md w-full h-full p-6 shadow-2xl flex flex-col space-y-5 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-[#0E71EB] rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-[#101A45]">
                    My Consultation Notes
                  </h3>
                  <p className="text-xs text-slate-500">
                    Doctor summaries & health observations
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNotesDrawerOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Note 1 */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#101A45]">
                    Dr. Rajesh Verma, MD
                  </span>
                  <span className="text-slate-400">Oct 2, 2026</span>
                </div>
                <div className="text-xs text-[#087F8C] font-medium">
                  Glycemic Control & Insulin Titration Review
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Fast-acting insulin routine adjusted before dinner. Target fasting glucose 90–110 mg/dL. Continue daily post-lunch 15-minute brisk walk. Re-check HbA1c in 6 weeks.
                </p>
              </div>

              {/* Note 2 */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#101A45]">
                    Neha Sen, RD, CDE
                  </span>
                  <span className="text-slate-400">Sep 24, 2026</span>
                </div>
                <div className="text-xs text-[#087F8C] font-medium">
                  Carbohydrate Substitution & Fiber Optimization
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Substituted white rice with multigrain dalia and steamed vegetables. Observed significant flattening of 2-hour post-prandial glycemic excursions.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                showToast("Notes exported to your Pulse Patient Health Record.");
              }}
              className="w-full py-2.5 bg-[#101A45] hover:bg-[#1A286B] text-white rounded-xl text-sm font-semibold transition"
            >
              Export Notes to PDF
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. SHAREABLE LINK MODAL                                   */}
      {/* ========================================================= */}
      {shareableLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg text-[#101A45]">
                Here&apos;s your joining info
              </h3>
              <button
                onClick={() => setShareableLinkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Send this link to people you want to meet with. Be sure to save it so you can use it later, too.
            </p>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-slate-700 truncate">
                {createdShareLink}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdShareLink);
                  showToast("Meeting link copied to clipboard!");
                }}
                className="p-2 text-[#087F8C] hover:bg-slate-200 rounded-lg transition shrink-0"
                title="Copy link"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShareableLinkModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition"
              >
                Done
              </button>
              <button
                onClick={() => {
                  setShareableLinkModalOpen(false);
                  const code = createdShareLink.split("/").pop();
                  router.push(`/support/meeting/${code}`);
                }}
                className="flex-1 py-2.5 bg-[#087F8C] hover:bg-[#066570] text-white rounded-xl text-sm font-semibold transition"
              >
                Join Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 6. RECORDINGS & HISTORY MODAL                             */}
      {/* ========================================================= */}
      {recordingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90dvh] overflow-y-auto p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg text-[#101A45]">
                Consultation Records
              </h3>
              <button
                onClick={() => setRecordingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Past consultation summaries, audio-video transcripts, and prescriptions are securely stored under clinical privacy rules.
            </p>

            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-[#101A45]">
                    Dr. Rajesh Verma • 30 Mins
                  </div>
                  <div className="text-[11px] text-slate-500">Oct 2, 2026 • Video Meeting</div>
                </div>
                <span className="text-[#087F8C] font-semibold text-[11px]">
                  Summary Ready
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-[#101A45]">
                    Neha Sen, RD • 30 Mins
                  </div>
                  <div className="text-[11px] text-slate-500">Sep 24, 2026 • Nutrition Review</div>
                </div>
                <span className="text-[#087F8C] font-semibold text-[11px]">
                  Summary Ready
                </span>
              </div>
            </div>

            <button
              onClick={() => setRecordingsModalOpen(false)}
              className="w-full py-2.5 bg-[#087F8C] hover:bg-[#066570] text-white rounded-xl text-sm font-semibold transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 7. CANCEL APPOINTMENT CONFIRMATION MODAL                  */}
      {/* ========================================================= */}
      {cancelModalOpen && actionAppointment && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-[90dvh] overflow-y-auto p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                <AlertCircle className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-base text-[#101A45]">
                Cancel Consultation?
              </h3>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to cancel your consultation with{" "}
              <strong className="text-slate-800">
                {actionAppointment.specialist?.name}
              </strong>
              ?
            </p>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                Reason for cancellation
              </label>
              <input
                type="text"
                placeholder="e.g. Schedule conflict, feeling better"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCancelModalOpen(false)}
                className="flex-1 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Keep Meeting
              </button>
              <button
                onClick={handleConfirmCancel}
                className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
        </main>

        <MobileBottomNav />
      </div>
    </div>
  );
}
