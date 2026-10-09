import { PrismaClient } from "@prisma/client";
import {
  getVerifiedSpecialists,
  getAvailableSlots,
  bookAppointment,
  getUserAppointments,
  cancelAppointment,
} from "../services/support/appointmentService";

const prisma = new PrismaClient();

async function runTests() {
  console.log("=== RUNNING PULSE SUPPORT TEST SUITE ===");

  // 1. Verify Specialists
  console.log("\n[Test 1] Testing getVerifiedSpecialists()...");
  const specialists = await getVerifiedSpecialists();
  if (specialists.length < 5) {
    throw new Error(`Expected at least 5 specialists, found ${specialists.length}`);
  }
  console.log(`PASS: Found ${specialists.length} verified specialists:`);
  specialists.forEach((s) => console.log(`  - ${s.title || s.name} (${s.specialty})`));

  const drVerma = specialists.find((s) => s.name?.includes("Rajesh Verma") || s.title?.includes("Rajesh Verma"));
  if (!drVerma) throw new Error("Dr. Rajesh Verma not found in specialists list");

  // 2. Verify Availability Slots
  console.log("\n[Test 2] Testing getAvailableSlots()...");
  const testDate = new Date();
  testDate.setDate(testDate.getDate() + 2); // 2 days ahead
  const testDateStr = testDate.toISOString().split("T")[0];

  const slots = await getAvailableSlots(drVerma.id, testDateStr);
  if (slots.length === 0) {
    throw new Error(`No slots generated for ${testDateStr}`);
  }
  console.log(`PASS: Generated ${slots.length} slots for ${testDateStr}. Sample: ${slots[0].time} (${slots[0].label})`);

  // 3. Test Booking Appointment
  console.log("\n[Test 3] Testing bookAppointment()...");
  const patient = await prisma.user.findFirst({
    where: { email: "alex.morgan@pulsehealth.demo" },
  });
  if (!patient) throw new Error("Alex Morgan patient not found in DB");

  const bookedSlot = slots.find((s) => s.available);
  if (!bookedSlot) throw new Error("No available slot to book");

  const appt = await bookAppointment({
    patientId: patient.id,
    specialistId: drVerma.id,
    appointmentType: "VIDEO_CONSULTATION",
    reason: "Automated test: Glycemic checkup & insulin review",
    optionalPatientNote: "Automated test note",
    dateStr: testDateStr,
    timeStr: bookedSlot.time,
  });

  if (!appt || !appt.meetingRoomId) {
    throw new Error("Failed to book appointment or missing meetingRoomId");
  }
  console.log(`PASS: Booked appointment ${appt.id} with room code ${appt.meetingRoomId}`);

  // 4. Test Concurrency / Double-booking Prevention
  console.log("\n[Test 4] Testing double-booking protection...");
  let doubleBookingCaught = false;
  try {
    await bookAppointment({
      patientId: patient.id,
      specialistId: drVerma.id,
      appointmentType: "VIDEO_CONSULTATION",
      reason: "Attempt duplicate booking",
      dateStr: testDateStr,
      timeStr: bookedSlot.time,
    });
  } catch (err: any) {
    doubleBookingCaught = true;
    console.log(`PASS: Double-booking safely prevented with message: "${err.message}"`);
  }

  if (!doubleBookingCaught) {
    throw new Error("FAIL: Double-booking was allowed for same specialist and slot!");
  }

  // 5. Test getUserAppointments
  console.log("\n[Test 5] Testing getUserAppointments()...");
  const userAppts = await getUserAppointments(patient.id, testDateStr);
  if (userAppts.length === 0) {
    throw new Error("Booked appointment not found in user appointments list");
  }
  console.log(`PASS: Found ${userAppts.length} appointment(s) for patient on ${testDateStr}`);

  // 6. Test Cancellation
  console.log("\n[Test 6] Testing cancelAppointment()...");
  const cancelled = await cancelAppointment(appt.id, patient.id, "Testing cancellation workflow");
  if (cancelled.status !== "CANCELLED_BY_PATIENT") {
    throw new Error(`Expected status CANCELLED_BY_PATIENT, got ${cancelled.status}`);
  }
  console.log(`PASS: Appointment ${appt.id} successfully cancelled.`);

  // 7. Verify Audit Log
  const logs = await prisma.appointmentAuditLog.findMany({
    where: { appointmentId: appt.id },
  });
  if (logs.length < 2) {
    throw new Error(`Expected at least 2 audit logs (BOOKED, CANCELLED), found ${logs.length}`);
  }
  console.log(`PASS: Verified ${logs.length} audit logs recorded for appointment ${appt.id}`);

  console.log("\n=========================================");
  console.log(" ALL PULSE SUPPORT TESTS PASSED CLEANLY! ");
  console.log("=========================================");
}

runTests()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
