"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { Droplet, Info, RefreshCw } from "lucide-react";

interface Point {
  timeFormatted: string;
  value: number;
  source: string;
}

export function GlucoseChart({ points = [] }: { points?: Point[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || points.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-100 text-xs text-slate-400">
        Loading glycemic curve telemetry...
      </div>
    );
  }

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#C9D7DE] shadow-[0_1px_3px_rgba(16,26,69,0.04)] space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-[#D5F3E7] text-[#087F8C]">
              <Droplet className="w-4 h-4 text-[#087F8C]" />
            </span>
            <h3 className="font-bold text-base text-[#101A45]">
              Glucose trend (mg/dL)
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-[#52616B] mt-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#101A45]" />
              Your readings
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-2 rounded bg-[#D5F3E7] border border-[#A7E6CE]" />
              Target range (70–140)
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs text-[#52616B]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#087F8C]" />
            Current: <strong className="text-[#101A45]">{points[points.length - 1]?.value ?? 96} mg/dL</strong>
          </span>
          <span className="px-2.5 py-1 rounded-full bg-[#D5F3E7] text-[#087F8C] font-semibold border border-[#C9D7DE]">
            ✓ In target
          </span>
        </div>
      </div>

      <div className="h-56 sm:h-60 w-full overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
            <defs>
              <linearGradient id="glucoseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#087F8C" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#087F8C" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timeFormatted"
              stroke="#52616B"
              fontSize={10}
              tickLine={false}
              interval="preserveStartEnd"
              minTickGap={12}
            />
            <YAxis
              domain={[60, 160]}
              stroke="#52616B"
              fontSize={11}
              tickLine={false}
              unit=""
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as Point;
                  return (
                    <div className="bg-[#101A45] text-white p-3 rounded-xl shadow-lg text-xs space-y-1 border border-[#C9D7DE]/30">
                      <div className="text-slate-300 font-medium">{data.timeFormatted}</div>
                      <div className="text-sm font-bold text-[#D5F3E7]">{data.value} mg/dL</div>
                      <div className="text-[10px] text-slate-300">{data.source || "Daily Average"}</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            {/* Target Corridor Reference Lines */}
            <ReferenceLine y={140} stroke="#C9D7DE" strokeDasharray="3 3" label={{ value: "Max (140)", fill: "#52616B", fontSize: 10, position: "insideTopRight" }} />
            <ReferenceLine y={70} stroke="#C9D7DE" strokeDasharray="3 3" label={{ value: "Min (70)", fill: "#52616B", fontSize: 10, position: "insideBottomRight" }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#087F8C"
              strokeWidth={2.5}
              dot={{ stroke: "#101A45", strokeWidth: 2, r: 3.5, fill: "#FFFFFF" }}
              activeDot={{ stroke: "#087F8C", strokeWidth: 2, r: 5, fill: "#D5F3E7" }}
              fillOpacity={1}
              fill="url(#glucoseGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
        <span className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          7-day glycemic stability with 96% in target range (70–140 mg/dL)
        </span>
        <span className="font-mono text-slate-500 font-semibold">DAY-WISE TREND</span>
      </div>
    </div>
  );
}
