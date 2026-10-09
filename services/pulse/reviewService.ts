import { prisma } from "@/lib/db";

export async function getPatientWeeklyReview(patientId: string, weekNumber: number = 2) {
  // Aggregate check-ins over past 7 days
  const checkIns = await prisma.dailyCheckIn.findMany({
    where: { userId: patientId },
    orderBy: { date: "desc" },
    take: 7,
  });

  const completed = checkIns.filter((c) => c.routineStatus === "Completed").length;
  const partial = checkIns.filter((c) => c.routineStatus === "Partially completed").length;
  const missed = checkIns.filter((c) => c.routineStatus === "Not completed").length;
  const barriers = checkIns.filter((c) => c.barrier).map((c) => c.barrier as string);

  // Recovery events
  const recoveries = await prisma.recoveryEvent.findMany({
    where: { patientId },
  });
  const recoverySuccessCount = recoveries.filter((r) => r.subsequentActionDone === true).length;

  const checkInRate = Math.round((checkIns.length / 7) * 100);

  // Persist or update WeeklyReview record
  const weekly = await prisma.weeklyReview.upsert({
    where: {
      userId_weekNumber: {
        userId: patientId,
        weekNumber,
      },
    },
    update: {
      plannedActionsCount: 7,
      completedActionsCount: completed,
      partiallyCompletedCount: partial,
      missedRoutinesCount: missed,
      recoverySuccessCount,
      checkInRatePercent: checkInRate,
      reportedBarriersList: JSON.stringify(barriers),
    },
    create: {
      userId: patientId,
      weekNumber,
      startDate: new Date(Date.now() - 7 * 86400 * 1000).toISOString().split("T")[0],
      endDate: new Date().toISOString().split("T")[0],
      plannedActionsCount: 7,
      completedActionsCount: completed,
      partiallyCompletedCount: partial,
      missedRoutinesCount: missed,
      recoverySuccessCount,
      checkInRatePercent: checkInRate,
      reportedBarriersList: JSON.stringify(barriers),
    },
  });

  return { weekly, checkIns, recoveries };
}

export async function get90DayProgramOutcome(patientId: string) {
  const patient = await prisma.user.findUnique({
    where: { id: patientId },
    include: {
      patientProfile: true,
      clinicalMeasurements: {
        where: { measurementType: "HBA1C" },
        orderBy: { measuredAt: "asc" },
      },
      goals: true,
      recoveryEvents: true,
      dailyCheckIns: true,
    },
  });

  if (!patient) throw new Error("Patient not found");

  const baselineHbA1c = patient.clinicalMeasurements.find((m) => m.isBaseline) || patient.clinicalMeasurements[0];
  const followUpHbA1c = patient.clinicalMeasurements.find((m) => m.isFollowUp) || (patient.clinicalMeasurements.length > 1 ? patient.clinicalMeasurements[patient.clinicalMeasurements.length - 1] : null);

  let hba1cChange: number | null = null;
  if (baselineHbA1c && followUpHbA1c) {
    hba1cChange = Math.round((followUpHbA1c.value - baselineHbA1c.value) * 10) / 10;
  }

  const totalCheckIns = patient.dailyCheckIns.length;
  const totalCompleted = patient.dailyCheckIns.filter((c) => c.routineStatus === "Completed").length;
  const adherenceRate = totalCheckIns > 0 ? Math.round((totalCompleted / totalCheckIns) * 100) : 0;

  const totalMissed = patient.recoveryEvents.length;
  const successfulRecoveries = patient.recoveryEvents.filter((r) => r.subsequentActionDone === true).length;
  const recoveryRate = totalMissed > 0 ? Math.round((successfulRecoveries / totalMissed) * 100) : 100;

  return {
    patient: {
      id: patient.id,
      name: patient.name,
      email: patient.email,
      diabetesType: patient.patientProfile?.diabetesType || "Type 2 Diabetes",
      programDayCurrent: patient.patientProfile?.programDayCurrent || 90,
      programStatus: patient.patientProfile?.programStatus || "ACTIVE",
    },
    clinicalOutcomes: {
      baselineHbA1c: baselineHbA1c
        ? {
            value: baselineHbA1c.value,
            unit: baselineHbA1c.unit,
            date: baselineHbA1c.measuredAt.toISOString().split("T")[0],
            source: baselineHbA1c.source,
            lab: baselineHbA1c.laboratoryName,
          }
        : null,
      followUpHbA1c: followUpHbA1c
        ? {
            value: followUpHbA1c.value,
            unit: followUpHbA1c.unit,
            date: followUpHbA1c.measuredAt.toISOString().split("T")[0],
            source: followUpHbA1c.source,
            lab: followUpHbA1c.laboratoryName,
          }
        : null,
      hba1cChange,
      changeInterpretation:
        hba1cChange !== null
          ? hba1cChange < 0
            ? `${Math.abs(hba1cChange)}% reduction observed over 90-day clinical period`
            : "No significant reduction"
          : "Follow-up HbA1c pending laboratory draw",
    },
    behavioralAdherence: {
      totalCheckInsLogged: totalCheckIns,
      adherenceRatePercent: adherenceRate,
      totalMissedRoutines: totalMissed,
      returnToRoutineRatePercent: recoveryRate,
    },
    goalsSummary: patient.goals.map((g) => ({
      title: g.title,
      status: g.status,
      patientStatus: g.patientStatus,
      clinicianStatus: g.clinicianStatus,
    })),
  };
}
