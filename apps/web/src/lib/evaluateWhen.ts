import type { WhenRule } from "@pumpstation/contracts";

function getByPath(ctx: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let cur: unknown = ctx;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

function matchValue(actual: unknown, expected: unknown): boolean {
  if (expected && typeof expected === "object" && !Array.isArray(expected)) {
    const rule = expected as Record<string, unknown>;
    if ("not" in rule) return actual !== rule.not;
    if ("in" in rule && Array.isArray(rule.in)) return rule.in.includes(actual);
  }
  if (Array.isArray(expected)) return expected.includes(actual);
  return actual === expected;
}

/** Evaluate visibleWhen / when rules against form + wizard context */
export function evaluateWhen(
  ctx: Record<string, unknown>,
  rule?: WhenRule | null
): boolean {
  if (!rule || Object.keys(rule).length === 0) return true;
  return Object.entries(rule).every(([key, expected]) =>
    matchValue(getByPath(ctx, key) ?? ctx[key], expected)
  );
}

/** Map legacy wizard form values to v2 parameter names for API */
export function mapLegacyParameters(
  formValues: Record<string, unknown>,
  wizardCtx: Record<string, unknown> = {}
): Record<string, unknown> {
  const cardKey = wizardCtx.puLine ?? wizardCtx.hmLine;
  const cardMap: Record<string, { station_type: string; series: string }> = {
    "bps-w-pro": { station_type: "BPS-W", series: "Pro" },
    "bps-w-lite": { station_type: "BPS-W", series: "Lite" },
    "bps-c-pro": { station_type: "BPS-C", series: "Pro" },
    "bps-c-lite": { station_type: "BPS-C", series: "Lite" },
  };
  const mapped = cardKey ? cardMap[String(cardKey)] : undefined;
  const med = formValues.fluidType ?? formValues.med ?? "вода";
  return {
    ...formValues,
    flowRate: formValues.flowRate ?? formValues.Q,
    head: formValues.head ?? formValues.H,
    workingPumps: formValues.workingPumps ?? formValues.n1,
    reservePumps: formValues.reservePumps ?? formValues.n2,
    pumpType: formValues.pumpType ?? formValues.pump_type,
    temperature: formValues.temperature ?? formValues.t,
    concentration: formValues.concentration ?? formValues.c,
    station_type: formValues.station_type ?? mapped?.station_type,
    series: formValues.series ?? mapped?.series,
    puLine: wizardCtx.puLine,
    hmLine: wizardCtx.hmLine,
    productClass: wizardCtx.productClass,
    med,
    c: med === "вода" || med === "water" ? 100 : (formValues.c ?? formValues.concentration ?? 30),
  };
}
