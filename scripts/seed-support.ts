import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Support specialists, availabilities, and appointments...");

  const patient = await prisma.user.findFirst({
    where: { email: "alex.morgan@pulsehealth.demo" },
  });

  if (!patient) {
    console.error("Alex Morgan patient not found!");
    return;
  }

  // Update existing specialist profiles to ensure name and titles are complete
  const specialistsData = [
    {
      email: "dr.verma@pulsehealth.demo",
      name: "Dr. Rajesh Verma, MD",
      title: "Dr. Rajesh Verma, MD, DM",
      role: "Endocrinologist",
      specialty: "Endocrinology & Diabetology",
      qualifications: "MD (Medicine), DM (Endocrinology), FACP",
      registrationNumber: "MCI-84729-DEL",
      hospitalClinic: "Pulse Diabetes & Metabolic Care Center",
      languages: JSON.stringify(["English", "Hindi", "Punjabi"]),
      bio: "Senior Endocrinologist with 18+ years of clinical experience specializing in intensive glycemic control, CGM interpretation, and preventing diabetic microvascular complications.",
      consultationTypes: JSON.stringify(["VIDEO_CONSULTATION", "FOLLOW_UP"]),
      rating: 4.9,
      reviewsCount: 142,
      avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80",
    },
    {
      email: "dr.priya@pulsehealth.demo",
      name: "Dr. Priya Sundaram, MD",
      title: "Dr. Priya Sundaram, MD",
      role: "Diabetologist",
      specialty: "Diabetology & Metabolic Care",
      qualifications: "MBBS, MD (General Medicine), PG Dip Diabetology (Boston)",
      registrationNumber: "KMC-41209-KAR",
      hospitalClinic: "Pulse Diabetes & Metabolic Care Center",
      languages: JSON.stringify(["English", "Hindi", "Tamil"]),
      bio: "Specialist in early Type 2 diabetes reversal, CGM-guided lifestyle therapy, and insulin sensitivity restoration.",
      consultationTypes: JSON.stringify(["VIDEO_CONSULTATION", "FOLLOW_UP"]),
      rating: 4.8,
      reviewsCount: 98,
      avatarUrl: "https://images.unsplash.com/photo-1594824813583-e18e38520ec7?w=300&auto=format&fit=crop&q=80",
    },
    {
      email: "neha.diet@pulsehealth.demo",
      name: "Neha Sen, RD, CDE",
      title: "Neha Sen, MSc, RD, CDE",
      role: "Dietitian & Nutritionist",
      specialty: "Clinical Diabetes Nutrition",
      qualifications: "MSc (Clinical Nutrition), Registered Dietitian (IDA), CDE",
      registrationNumber: "IDA-RD-9821",
      hospitalClinic: "Pulse Diabetes & Metabolic Care Center",
      languages: JSON.stringify(["English", "Hindi", "Bengali"]),
      bio: "Clinical dietitian specializing in practical Indian carbohydrate counting, glycemic index management, and culturally adaptable meal planning.",
      consultationTypes: JSON.stringify(["VIDEO_CONSULTATION", "FOLLOW_UP"]),
      rating: 4.9,
      reviewsCount: 112,
      avatarUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80",
    },
    {
      email: "dr.amitav@pulsehealth.demo",
      name: "Dr. Amitav Ghosh, MBBS, CDE",
      title: "Dr. Amitav Ghosh, MBBS, CDE",
      role: "Diabetes Educator",
      specialty: "Diabetes Education & Behavioral Change",
      qualifications: "MBBS, Certified Diabetes Educator (ADE), Sports Medicine Fellow",
      registrationNumber: "WBMC-62391",
      hospitalClinic: "Pulse Diabetes & Metabolic Care Center",
      languages: JSON.stringify(["English", "Hindi"]),
      bio: "Patient-centered diabetes educator helping individuals build sustainable exercise habits, prevent hypoglycemic events, and overcome emotional burnout.",
      consultationTypes: JSON.stringify(["VIDEO_CONSULTATION", "FOLLOW_UP"]),
      rating: 4.7,
      reviewsCount: 84,
      avatarUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80",
    },
    {
      email: "dr.sunita@pulsehealth.demo",
      name: "Dr. Sunita Mehra, MD",
      title: "Dr. Sunita Mehra, MD",
      role: "General Physician",
      specialty: "Internal Medicine & Cardiometabolic",
      qualifications: "MD (Internal Medicine), FICP",
      registrationNumber: "DMC-55102-DEL",
      hospitalClinic: "Pulse Diabetes & Metabolic Care Center",
      languages: JSON.stringify(["English", "Hindi"]),
      bio: "Comprehensive internal medicine clinician focused on multi-morbidity management, blood pressure, lipids, and holistic diabetic longevity.",
      consultationTypes: JSON.stringify(["VIDEO_CONSULTATION", "FOLLOW_UP"]),
      rating: 4.9,
      reviewsCount: 136,
      avatarUrl: "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=300&auto=format&fit=crop&q=80",
    },
  ];

  for (const s of specialistsData) {
    const user = await prisma.user.findFirst({ where: { email: s.email } });
    if (!user) continue;

    const profile = await prisma.specialistProfile.upsert({
      where: { userId: user.id },
      update: {
        name: s.name,
        title: s.title,
        role: s.role,
        specialty: s.specialty,
        qualifications: s.qualifications,
        registrationNumber: s.registrationNumber,
        hospitalClinic: s.hospitalClinic,
        languages: s.languages,
        bio: s.bio,
        consultationTypes: s.consultationTypes,
        rating: s.rating,
        reviewsCount: s.reviewsCount,
        avatarUrl: s.avatarUrl,
        isVerified: true,
        isActive: true,
      },
      create: {
        userId: user.id,
        name: s.name,
        title: s.title,
        role: s.role,
        specialty: s.specialty,
        qualifications: s.qualifications,
        registrationNumber: s.registrationNumber,
        hospitalClinic: s.hospitalClinic,
        languages: s.languages,
        bio: s.bio,
        consultationTypes: s.consultationTypes,
        rating: s.rating,
        reviewsCount: s.reviewsCount,
        avatarUrl: s.avatarUrl,
        isVerified: true,
        isActive: true,
      },
    });

    // Delete and recreate availability for Mon (1) through Sat (6)
    await prisma.doctorAvailability.deleteMany({
      where: { specialistId: profile.id },
    });

    for (let day = 0; day <= 6; day++) {
      await prisma.doctorAvailability.create({
        data: {
          specialistId: profile.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "18:00",
          slotDurationMinutes: 30,
          bufferMinutes: 10,
          isAvailable: true,
        },
      });
    }
  }

  // Create an appointment for Alex Morgan with Dr. Rajesh Verma for today
  const drVerma = await prisma.specialistProfile.findFirst({
    where: { name: { contains: "Rajesh Verma" } },
  });

  if (drVerma) {
    // Clean old test appointments
    await prisma.doctorAppointment.deleteMany({
      where: { patientId: patient.id },
    });

    // Set appointment today at 16:30
    const today = new Date();
    today.setHours(16, 30, 0, 0);

    const appt = await prisma.doctorAppointment.create({
      data: {
        patientId: patient.id,
        specialistId: drVerma.id,
        appointmentType: "VIDEO_CONSULTATION",
        reason: "Quarterly Glycemic Review & CGM Sensor Trend Assessment",
        optionalPatientNote: "Reviewed 14-day TIR (Time In Range). Fasting numbers have improved to 108 mg/dL.",
        scheduledAt: today,
        durationMinutes: 30,
        timezone: "Asia/Kolkata",
        status: "CONFIRMED",
        meetingRoomId: "pulse-meet-rv-982",
        meetingUrl: "/support/meeting/pulse-meet-rv-982",
        googleMeetUrl: "https://meet.google.com/xyz-pulse-med",
      },
    });

    await prisma.appointmentAuditLog.create({
      data: {
        appointmentId: appt.id,
        actorId: patient.id,
        action: "BOOKED",
        details: "Consultation booked via Pulse Support scheduler",
      },
    });

    console.log(`Created sample appointment for today: ${appt.id} at ${appt.scheduledAt}`);
  }

  console.log("Support seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
