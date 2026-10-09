import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUserOrDemo } from "@/services/support/appointmentService";

export async function GET(
  request: Request,
  { params }: { params: { roomCode: string } }
) {
  try {
    const user = await getCurrentUserOrDemo();
    const { roomCode } = params;

    // Search for appointment matching roomCode
    const appointment = await prisma.doctorAppointment.findFirst({
      where: {
        meetingRoomId: roomCode,
      },
      include: {
        specialist: true,
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!appointment) {
      // If roomCode is an instant room code created via "Start instant meeting",
      // we can return a valid generic room state
      return NextResponse.json({
        success: true,
        isInstantRoom: true,
        roomCode,
        doctor: {
          name: "Pulse Duty Specialist",
          title: "Dr. On-Duty Specialist, MD",
          specialty: "Clinical Diabetology & Emergency Consultation",
          avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80",
        },
        currentUser: user ? { id: user.id, name: user.name, role: user.role } : null,
      });
    }

    // Record audit log for room joined
    if (user) {
      await prisma.appointmentAuditLog.create({
        data: {
          appointmentId: appointment.id,
          actorId: user.id,
          action: "MEETING_JOINED",
          details: `User joined meeting room ${roomCode}`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      appointment,
      doctor: appointment.specialist,
      patient: appointment.patient,
      currentUser: user ? { id: user.id, name: user.name, role: user.role } : null,
    });
  } catch (error: any) {
    console.error("Error verifying meeting room:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load meeting room" },
      { status: 500 }
    );
  }
}
