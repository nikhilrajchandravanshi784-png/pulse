import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getTimeSeriesData,
  getDayWiseTimeSeriesData,
} from "@/services/health/healthDataService";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const metricType = searchParams.get("type") || "glucose";
    const hours = parseInt(searchParams.get("hours") || "24", 10);
    const range = searchParams.get("range");
    const interval = searchParams.get("interval");
    const days = parseInt(searchParams.get("days") || "7", 10);

    const isDayWise = range === "day" || interval === "day";
    const data = isDayWise
      ? await getDayWiseTimeSeriesData(session.userId, metricType, days)
      : await getTimeSeriesData(session.userId, metricType, hours);

    return NextResponse.json({
      success: true,
      metricType,
      range: isDayWise ? "day" : "hour",
      hours,
      days,
      points: data,
    });
  } catch (error) {
    console.error("Metric time series error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metric data points" },
      { status: 500 }
    );
  }
}
