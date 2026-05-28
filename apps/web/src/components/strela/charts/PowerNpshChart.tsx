import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

type Point = { q: number; p2: number; npsh: number };

export interface PowerNpshInput {
  nominalFlow?: number;
  powerKw?: number;
  q_p2?: Array<number | null>;
  p2_s?: Array<number | null>;
  q_npsh?: Array<number | null>;
  npsh_s?: Array<number | null>;
}

function buildPowerData(pump: PowerNpshInput, flowRate: number): Point[] {
  if (pump.q_p2?.length && pump.p2_s?.length && pump.q_npsh?.length && pump.npsh_s?.length) {
    const allQ = Array.from(
      new Set([
        ...pump.q_p2.filter((q): q is number => q != null),
        ...pump.q_npsh.filter((q): q is number => q != null),
      ]),
    ).sort((a, b) => a - b);
    return allQ.map((q) => {
      const p2Idx = pump.q_p2?.findIndex((qv) => qv != null && Math.abs(qv - q) < 0.0001) ?? -1;
      const npshIdx =
        pump.q_npsh?.findIndex((qv) => qv != null && Math.abs(qv - q) < 0.0001) ?? -1;
      return {
        q,
        p2: p2Idx >= 0 ? Number(pump.p2_s?.[p2Idx] ?? 0) : 0,
        npsh: npshIdx >= 0 ? Number(pump.npsh_s?.[npshIdx] ?? 0) : 0,
      };
    });
  }
  const qNom = Math.max(Number(pump.nominalFlow ?? flowRate ?? 20), 1);
  const pNom = Math.max(Number(pump.powerKw ?? 1.5), 0.1);
  const maxQ = qNom * 1.45;
  const points: Point[] = [];
  for (let i = 0; i <= 24; i += 1) {
    const q = (maxQ / 24) * i;
    const qr = q / qNom;
    points.push({
      q,
      p2: Math.max(pNom * (0.25 + 0.8 * qr), 0),
      npsh: Math.max(0.8 + 2.6 * qr * qr, 0),
    });
  }
  return points;
}

function roundStep(max: number): number {
  if (max <= 5) return 0.5;
  if (max <= 15) return 1;
  if (max <= 40) return 2;
  return 5;
}

export function PowerNpshChart({
  pump,
  flowRate,
}: {
  pump: PowerNpshInput;
  flowRate: number;
}) {
  const data = buildPowerData(pump, flowRate);
  const qMaxRaw = Math.max(...data.map((d) => d.q), flowRate, 1);
  const pMaxRaw = Math.max(...data.map((d) => d.p2), 1);
  const npshMaxRaw = Math.max(...data.map((d) => d.npsh), 1);
  const qStep = roundStep(qMaxRaw);
  const pStep = roundStep(pMaxRaw);
  const npshStep = 0.5;
  const qMax = Math.ceil(qMaxRaw / qStep) * qStep;
  const pMax = Math.ceil(pMaxRaw / pStep) * pStep;
  const npshMax = Math.ceil(npshMaxRaw / npshStep) * npshStep;

  const qTicks = Array.from({ length: Math.floor(qMax / qStep) + 1 }, (_, i) => i * qStep);
  const pTicks = Array.from({ length: Math.floor(pMax / pStep) + 1 }, (_, i) => i * pStep);
  const npshTicks = Array.from(
    { length: Math.floor(npshMax / npshStep) + 1 },
    (_, i) => Number((i * npshStep).toFixed(1)),
  );

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 4, right: 6, left: 4, bottom: 8 }}>
        {pTicks.map((y) => (
          <ReferenceLine key={`p-${y}`} y={y} stroke="#d1d5db" strokeWidth={1} yAxisId="left" />
        ))}
        {qTicks.map((x) => (
          <ReferenceLine key={`q2-${x}`} x={x} stroke="#d1d5db" strokeWidth={1} yAxisId="left" />
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
          dataKey="p2"
          domain={[0, pMax]}
          ticks={pTicks}
          width={56}
          tick={{ fontSize: 10, fill: "#111827" }}
          tickFormatter={(value) => (Math.abs(value - pMax) < 0.001 ? "P2, кВт" : String(value))}
        />
        <YAxis
          yAxisId="right"
          type="number"
          dataKey="npsh"
          orientation="right"
          domain={[0, npshMax]}
          ticks={npshTicks}
          width={56}
          tick={{ fontSize: 10, fill: "#111827" }}
          tickFormatter={(value) => (Math.abs(value - npshMax) < 0.001 ? "NPSH, м" : String(value))}
        />
        <Line yAxisId="left" type="monotone" dataKey="p2" stroke="#13347F" strokeWidth={2.6} dot={false} />
        <Line yAxisId="right" type="monotone" dataKey="npsh" stroke="#111827" strokeWidth={2.3} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
