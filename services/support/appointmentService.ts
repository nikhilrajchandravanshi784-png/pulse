import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export interface TimeSlot {
  time: string; // "09:30"
  label: string; // "09:30 AM"
  available: boolean;
  reason?: string;
}

export async function getCurrentUserOrDemo() {
  const session = await getSession();
  if (session && session.userId) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { patientProfile: true, clinicianProfile: true },
    });
    if (user) return user;
  }

  // Fallback to primary demo patient Alex Morgan
  const demoUser = await prisma.user.findFirst({
    where: { email: "alex.morgan@pulsehealth.demo" },
    include: { patientProfile: true, clinicianProfile: true },
  });

  if (demoUser) return demoUser;

  // Otherwise return any patient
  return prisma.user.findFirst({
    where: { role: "PATIENT" },
    include: { patientProfile: true, clinicianProfile: true },
  });
}

/**
 * Get all verified specialists
 */
export async function getVerifiedSpecialists() {
  const specialists = await prisma.specialistProfile.findMany({
    where: { isActive: true },
    orderBy: [{ rating: "desc" }, { reviewsCount: "desc" }],
    include: {
      availabilities: true,
    },
  });

  return specialists.map((s) => ({
    ...s,
    languages: safeParseJson(s.languages, ["English", "Hindi"]),
    consultationTypes: safeParseJson(s.consultationTypes, ["VIDEO_CONSULTATION"]),
  }));
}

/**
 * Get specialist by ID
 */
export async function getSpecialistById(id: string) {
  const specialist = await prisma.specialistProfile.findUnique({
    where: { id },
    include: {
      availabilities: true,
    },
  });

  if (!specialist) return null;

  return {
    ...specialist,
    languages: safeParseJson(specialist.languages, ["English", "Hindi"]),
    consultationTypes: safeParseJson(specialist.consultationTypes, ["VIDEO_CONSULTATION"]),
  };
}

/**
 * Calculate available slots for a specialist on a target date (YYYY-MM-DD)
 */
export async function getAvailableSlots(specialistId: string, dateStr: string): Promise<TimeSlot[]> {
  const targetDate = new Date(`${dateStr}T00:00:00`);
  const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, ...

  // Find availability rule for this day
  const availability = await prisma.doctorAvailability.findFirst({
    where: {
      specialistId,
      dayOfWeek,
      isAvailable: true,
    },
  });

  if (!availability) {
    return [];
  }

  // Get existing booked appointments on that day
  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

  const bookedAppointments = await prisma.doctorAppointment.findMany({
    where: {
      specialistId,
      scheduledAt: {
        gte: dayStart,
        lte: dayEnd,
      },
      status: {
        in: ["CONFIRMED", "PENDING", "IN_PROGRESS"],
      },
    },
  });

  const bookedTimes = new Set(
    bookedAppointments.map((a) => {
      const d = new Date(a.scheduledAt);
      const hours = d.getHours().toString().padStart(2, "0");
      const minutes = d.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    })
  );

  // Parse start and end time (e.g. "09:00" to "18:00")
  const [startHour, startMin] = availability.startTime.split(":").map(Number);
  const [endHour, endMin] = availability.endTime.split(":").map(Number);

  const slotDuration = availability.slotDurationMinutes || 30;
  const slots: TimeSlot[] = [];

  const now = new Date();
  const isToday = now.toISOString().split("T")[0] === dateStr;

  let currentTotalMin = startHour * 60 + startMin;
  const endTotalMin = endHour * 60 + endMin;

  while (currentTotalMin + slotDuration <= endTotalMin) {
    const h = Math.floor(currentTotalMin / 60);
    const m = currentTotalMin % 60;
    const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;

    // Format label (e.g., 09:30 AM)
    const period = h >= 12 ? "PM" : "AM";
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const label = `${displayH.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`;

    // Check if slot has already passed today
    let isPast = false;
    if (isToday) {
      const currentNowMin = now.getHours() * 60 + now.getMinutes();
      if (currentTotalMin <= currentNowMin) {
        isPast = true;
      }
    }

    const isBooked = bookedTimes.has(timeStr);
    const available = !isPast && !isBooked;

    slots.push({
      time: timeStr,
      label,
      available,
      reason: isBooked ? "Booked" : isPast ? "Passed" : undefined,
    });

    currentTotalMin += slotDuration;
  }

  return slots;
}

/**
 * Concurrency-safe appointment booking
 */
export async function bookAppointment({
  patientId,
  specialistId,
  appointmentType = "VIDEO_CONSULTATION",
  reason,
  optionalPatientNote,
  dateStr, // "2026-10-09"
  timeStr, // "14:30"
}: {
  patientId: string;
  specialistId: string;
  appointmentType?: string;
  reason: string;
  optionalPatientNote?: string;
  dateStr: string;
  timeStr: string;
}) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const scheduledAt = new Date(`${dateStr}T${timeStr}:00`);

  // Generate unique meeting code
  const randomSnippet = Math.random().toString(36).substring(2, 7);
  const roomCode = `pulse-${specialistId.substring(0, 4)}-${randomSnippet}`;

  // Use transaction to ensure slot uniqueness
  return prisma.$transaction(async (tx) => {
    // Check if specialist is already booked for this slot
    const existing = await tx.doctorAppointment.findFirst({
      where: {
        specialistId,
        scheduledAt,
        status: { in: ["CONFIRMED", "PENDING", "IN_PROGRESS"] },
      },
    });

    if (existing) {
      throw new Error("This consultation slot is no longer available. Please select another time.");
    }

    const appointment = await tx.doctorAppointment.create({
      data: {
        patientId,
        specialistId,
        appointmentType,
        reason,
        optionalPatientNote: optionalPatientNote || null,
        scheduledAt,
        durationMinutes: 30,
        timezone: "Asia/Kolkata",
        status: "CONFIRMED",
        meetingRoomId: roomCode,
        meetingUrl: `/support/meeting/${roomCode}`,
        googleMeetUrl: `https://meet.google.com/${roomCode}`,
      },
      include: {
        specialist: true,
      },
    });

    await tx.appointmentAuditLog.create({
      data: {
        appointmentId: appointment.id,
        actorId: patientId,
        action: "BOOKED",
        details: `Consultation booked with ${appointment.specialist.name} for ${dateStr} at ${timeStr}`,
      },
    });

    return appointment;
  });
}

/**
 * Fetch appointments for user (or filtered by date)
 */
export async function getUserAppointments(userId: string, dateStr?: string) {
  const where: any = {
    OR: [{ patientId: userId }, { specialist: { userId } }],
  };

  if (dateStr) {
    const dayStart = new Date(`${dateStr}T00:00:00.000`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999`);
    where.scheduledAt = {
      gte: dayStart,
      lte: dayEnd,
    };
  }

  const appointments = await prisma.doctorAppointment.findMany({
    where,
    orderBy: { scheduledAt: "asc" },
    include: {
      specialist: true,
      patient: {
        select: {
          id: true,
          name: true,
          email: true,
          phoneNumber: true,
        },
      },
    },
  });

  return appointments.map((a) => ({
    ...a,
    specialist: {
      ...a.specialist,
      languages: safeParseJson(a.specialist.languages, ["English", "Hindi"]),
      consultationTypes: safeParseJson(a.specialist.consultationTypes, ["VIDEO_CONSULTATION"]),
    },
  }));
}

/**
 * Cancel appointment
 */
export async function cancelAppointment(appointmentId: string, actorId: string, reason?: string) {
  const appointment = await prisma.doctorAppointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  const updated = await prisma.doctorAppointment.update({
    where: { id: appointmentId },
    data: {
      status: "CANCELLED_BY_PATIENT",
      cancellationReason: reason || "Cancelled by patient",
      cancelledAt: new Date(),
    },
  });

  await prisma.appointmentAuditLog.create({
    data: {
      appointmentId,
      actorId,
      action: "CANCELLED",
      details: reason || "Cancelled by patient",
    },
  });

  return updated;
}

/**
 * Reschedule appointment
 */
export async function rescheduleAppointment({
  appointmentId,
  actorId,
  newDateStr,
  newTimeStr,
}: {
  appointmentId: string;
  actorId: string;
  newDateStr: string;
  newTimeStr: string;
}) {
  const appointment = await prisma.doctorAppointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    throw new Error("Appointment not found");
  }

  const newScheduledAt = new Date(`${newDateStr}T${newTimeStr}:00`);

  // Check if slot available
  const existing = await prisma.doctorAppointment.findFirst({
    where: {
      specialistId: appointment.specialistId,
      scheduledAt: newScheduledAt,
      id: { not: appointmentId },
      status: { in: ["CONFIRMED", "PENDING", "IN_PROGRESS"] },
    },
  });

  if (existing) {
    throw new Error("The requested slot is already booked. Please choose another time.");
  }

  const updated = await prisma.doctorAppointment.update({
    where: { id: appointmentId },
    data: {
      scheduledAt: newScheduledAt,
      status: "RESCHEDULED",
    },
  });

  await prisma.appointmentAuditLog.create({
    data: {
      appointmentId,
      actorId,
      action: "RESCHEDULED",
      details: `Rescheduled to ${newDateStr} ${newTimeStr}`,
    },
  });

  return updated;
}

function safeParseJson(str: string, fallback: any) {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}
