import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { DEFAULT_CHART_STYLE, type ChartStyle } from "@pumpstation/contracts";

export interface CurvePoint {
  Q: number;
  H?: number;
  eta?: number;
  P2?: number;
  NPSH?: number;
}

export interface PumpCurvesChartV2Props {
  curves: {
    qh_main?: CurvePoint[];
    qh_viscosity?: CurvePoint[];
    system?: CurvePoint[];
    eta?: CurvePoint[];
    p2?: CurvePoint[];
    npsh?: CurvePoint[];
  };
  workingPoint?: { Q: number; H: number };
  guaranteedHead?: number;
  style?: ChartStyle;
  height?: number;
}

function dashArray(dash?: "solid" | "long" | "short"): string | undefined {
  if (dash === "long") return "8 4";
  if (dash === "short") return "3 3";
  return undefined;
}

function mergeQ(curves: PumpCurvesChartV2Props["curves"]): Array<Record<string, number>> {
  const qSet = new Set<number>();
  for (const series of Object.values(curves)) {
    series?.forEach((p) => qSet.add(p.Q));
  }
  const qs = [...qSet].sort((a, b) => a - b);
  const findH = (arr: CurvePoint[] | undefined, q: number) =>
    arr?.find((p) => Math.abs(p.Q - q) < 0.01)?.H;
  const findVal = (arr: CurvePoint[] | undefined, q: number, key: keyof CurvePoint) => {
    const p = arr?.find((pt) => Math.abs(pt.Q - q) < 0.01);
    return p?.[key] as number | undefined;
  };

  return qs.map((q) => ({
    q,
    qh_main: findH(curves.qh_main, q) ?? 0,
    qh_viscosity: findH(curves.qh_viscosity, q) ?? 0,
    system: findH(curves.system, q) ?? 0,
    eta: findVal(curves.eta, q, "eta") ?? 0,
    p2: findVal(curves.p2, q, "P2") ?? 0,
    npsh: findVal(curves.npsh, q, "NPSH") ?? 0,
  }));
}

export function PumpCurvesChartV2({
  curves,
  workingPoint,
  guaranteedHead,
  style = DEFAULT_CHART_STYLE,
  height = 280,
}: PumpCurvesChartV2Props) {
  const data = mergeQ(curves);
  const maxQ = Math.max(...data.map((d) => d.q), workingPoint?.Q ?? 0, 1);
  const maxH = Math.max(
    ...data.flatMap((d) => [d.qh_main, d.qh_viscosity, d.system]),
    guaranteedHead ?? 0,
    workingPoint?.H ?? 0,
    1,
  );

  const c = style.curves;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 12, right: 48, left: 8, bottom: 8 }}>
        <CartesianGrid
          stroke={style.grid.color}
          strokeWidth={style.grid.width}
          strokeDasharray={dashArray(style.grid.dash)}
        />
        <XAxis
          dataKey="q"
          type="number"
          domain={[0, maxQ * 1.05]}
          tick={{ fontSize: style.fontSize - 2, fill: style.axesLabels.Q.color ?? "#333" }}
          label={{
            value: style.axesLabels.Q.title,
            position: "insideBottom",
            offset: -4,
            style: { fontSize: style.fontSize, fontFamily: style.fontFamily },
          }}
          stroke={style.axes.color}
          strokeWidth={style.axes.width}
        />
        <YAxis
          yAxisId="H"
          domain={[0, maxH * 1.1]}
          tick={{ fontSize: style.fontSize - 2 }}
          label={{
            value: style.axesLabels.H.title,
            angle: -90,
            position: "insideLeft",
            style: { fontSize: style.fontSize, fontFamily: style.fontFamily },
          }}
          stroke={style.axes.color}
        />
        <YAxis yAxisId="eta" orientation="right" domain={[0, 100]} hide />
        <Line
          yAxisId="H"
          type="monotone"
          dataKey="qh_main"
          name="Q-H"
          stroke={c.qh_main.color}
          strokeWidth={c.qh_main.width}
          dot={false}
          isAnimationActive={false}
        />
        {curves.qh_viscosity?.length ? (
          <Line
            yAxisId="H"
            type="monotone"
            dataKey="qh_viscosity"
            name="Q-H вязк."
            stroke={c.qh_viscosity.color}
            strokeWidth={c.qh_viscosity.width}
            dot={false}
            isAnimationActive={false}
          />
        ) : null}
        {curves.system?.length ? (
          <Line
            yAxisId="H"
            type="monotone"
            dataKey="system"
            name="Система"
            stroke={c.system.color}
            strokeWidth={c.system.width}
            strokeDasharray={dashArray(c.system.dash)}
            dot={false}
            isAnimationActive={false}
          />
        ) : null}
        {curves.eta?.length ? (
          <Line
            yAxisId="eta"
            type="monotone"
            dataKey="eta"
            name="η"
            stroke={c.eta.color}
            strokeWidth={c.eta.width}
            dot={false}
            isAnimationActive={false}
          />
        ) : null}
        {guaranteedHead != null && guaranteedHead > 0 ? (
          <ReferenceLine
            yAxisId="H"
            y={guaranteedHead}
            stroke={c.h_guaranteed.color}
            strokeWidth={c.h_guaranteed.width}
            strokeDasharray={dashArray(c.h_guaranteed.dash)}
            label={{ value: "Hгар", position: "insideTopRight", fontSize: 10 }}
          />
        ) : null}
        {workingPoint ? (
          <ReferenceDot
            yAxisId="H"
            x={workingPoint.Q}
            y={workingPoint.H}
            r={5}
            fill={c.working_point.fill}
            stroke={c.working_point.stroke ?? c.working_point.fill}
          />
        ) : null}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
