import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

type Point = { q: number; h: number; eta: number };

export interface PumpCurveInput {
  nominalFlow?: number;
  nominalHead?: number;
  curve?: Array<{ Q: number; H: number }>;
  q_eta?: Array<number | null>;
  eta_s?: Array<number | null>;
}

function toFiniteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildCurveData(pump: PumpCurveInput, flowRate: number, head: number): Point[] {
  if (pump.curve?.length && pump.q_eta?.length && pump.eta_s?.length) {
    const allQ = Array.from(
      new Set([
        ...pump.curve.map((p) => toFiniteNumber(p.Q)).filter((q): q is number => q != null),
        ...pump.q_eta.map((q) => toFiniteNumber(q)).filter((q): q is number => q != null),
      ]),
    ).sort((a, b) => a - b);
    if (!allQ.length) return [];
    return allQ.map((q) => {
      const h = toFiniteNumber(
        pump.curve?.find((p) => {
          const pointQ = toFiniteNumber(p.Q);
          return pointQ != null && Math.abs(pointQ - q) < 0.0001;
        })?.H,
      );
      const idx = pump.q_eta?.findIndex((qv) => qv != null && Math.abs(qv - q) < 0.0001) ?? -1;
      const eta = idx >= 0 ? toFiniteNumber(pump.eta_s?.[idx]) : null;
      return { q, h: h ?? 0, eta: eta ?? 0 };
    });
  }
  const qNom = Math.max(Number(pump.nominalFlow ?? flowRate ?? 20), 1);
  const hNom = Math.max(Number(pump.nominalHead ?? head ?? 25), 1);
  const maxQ = qNom * 1.45;
  const points: Point[] = [];
  for (let i = 0; i <= 24; i += 1) {
    const q = (maxQ / 24) * i;
    const qr = q / qNom;
    points.push({
      q,
      h: Math.max(hNom * (1 - 0.58 * qr * qr), 0),
      eta: Math.max(76 - 40 * Math.pow(qr - 1, 2), 20),
    });
  }
  return points;
}

function roundStep(max: number): number {
  if (max <= 15) return 1;
  if (max <= 40) return 2;
  if (max <= 90) return 5;
  if (max <= 150) return 10;
  return 20;
}

export function PumpCurveChart({
  pump,
  flowRate,
  head,
}: {
  pump: PumpCurveInput;
  flowRate: number;
  head: number;
}) {
  const data = buildCurveData(pump, flowRate, head);
  const fallbackData = data.length > 0 ? data : buildCurveData({}, flowRate, head);
  const qMaxRaw = Math.max(...fallbackData.map((d) => d.q), flowRate, 1);
  const hMaxRaw = Math.max(...fallbackData.map((d) => d.h), head, 1);
  const qStep = roundStep(qMaxRaw);
  const hStep = roundStep(hMaxRaw);
  const qMax = Math.ceil(qMaxRaw / qStep) * qStep;
  const hMax = Math.ceil(hMaxRaw / hStep) * hStep;

  const qTicks = Array.from({ length: Math.floor(qMax / qStep) + 1 }, (_, i) => i * qStep);
  const hTicks = Array.from({ length: Math.floor(hMax / hStep) + 1 }, (_, i) => i * hStep);
  const etaTicks = [0, 20, 40, 60, 80, 100];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={fallbackData} margin={{ top: 4, right: 6, left: 4, bottom: 8 }}>
        {hTicks.map((y) => (
          <ReferenceLine key={`h-${y}`} y={y} stroke="#d1d5db" strokeWidth={1} yAxisId="left" />
        ))}
        {qTicks.map((x) => (
          <ReferenceLine key={`q-${x}`} x={x} stroke="#d1d5db" strokeWidth={1} yAxisId="left" />
        ))}
        <CartesianGrid strokeDasharray="0" vertical={false} horizontal={false} />
        <XAxis
          type="number"
          dataKey="q"
          domain={[0, qMax]}
          ticks={qTicks}
          allowDecimals={false}
          tick={{ fontSize: 10, fill: "#111827" }}
          tickFormatter={(value) => (Math.abs(value - qMax) < 0.001 ? "Q, м³/ч" : String(value))}
        />
        <YAxis
          yAxisId="left"
          type="number"
          dataKey="h"
          domain={[0, hMax]}
          ticks={hTicks}
          allowDecimals={false}
          width={56}
          tick={{ fontSize: 10, fill: "#111827" }}
          tickFormatter={(value) => (Math.abs(value - hMax) < 0.001 ? "H, м" : String(value))}
        />
        <YAxis
          yAxisId="right"
          type="number"
          dataKey="eta"
          orientation="right"
          domain={[0, 100]}
          ticks={etaTicks}
          width={56}
          tick={{ fontSize: 10, fill: "#111827" }}
          tickFormatter={(value) => (value === 100 ? "η, %" : String(value))}
        />
        <Line yAxisId="left" type="monotone" dataKey="h" stroke="#13347F" strokeWidth={2.6} dot={false} />
        <Line yAxisId="right" type="monotone" dataKey="eta" stroke="#111827" strokeWidth={2.3} dot={false} />
        <ReferenceDot x={flowRate} y={head} yAxisId="left" r={4.5} fill="#C40808" stroke="none" />
      </LineChart>
    </ResponsiveContainer>
  );
}
