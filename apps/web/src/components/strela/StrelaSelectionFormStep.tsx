import { useEffect, useMemo, useState } from "react";
import { useProfile } from "@/providers/ProfileProvider";
import { useWizardStore } from "@/stores/wizardStore";
import { matchPumps, buildStation, generatePdf } from "@/api/selection";
import type { FlowConfig } from "@/types/wizard";
import { cn } from "@/lib/cn";
import { SELECTION_FLOW_HEADER_BRAND_DEFAULT_SRC } from "@/lib/strela/selectionAssets";
import { WorkHeader } from "./WorkHeader";
import { StrelaFormField } from "./StrelaFormField";
import { panelClass, panelHeadClass, WorkPanel } from "./panels";

interface PumpCandidate {
  id: string;
  name: string;
  score?: number;
  powerKw?: number;
  nominal_flow?: number;
  nominal_head?: number;
}

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--funnel-primary)] focus-visible:ring-offset-2";

export function StrelaSelectionFormStep() {
  const { wizard, branding } = useProfile();
  const appearance = branding.appearance;
  const flowId = useWizardStore((s) => s.flowId) ?? "bps-w-domestic";
  const productLine = useWizardStore((s) => s.productLine);
  const formValues = useWizardStore((s) => s.formValues);
  const matchedPumps = useWizardStore((s) => s.matchedPumps);
  const stationResult = useWizardStore((s) => s.stationResult);
  const setFormValue = useWizardStore((s) => s.setFormValue);
  const resetForm = useWizardStore((s) => s.resetForm);
  const setMatchResult = useWizardStore((s) => s.setMatchResult);
  const setStationResult = useWizardStore((s) => s.setStationResult);
  const goBack = useWizardStore((s) => s.goBack);

  const [selectedPumpId, setSelectedPumpId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const flow = useMemo(() => {
    const flows = wizard.flows as Record<string, FlowConfig>;
    return flows[flowId] ?? flows["bps-w-domestic"];
  }, [wizard.flows, flowId]);

  useEffect(() => {
    const defaults: Record<string, unknown> = {};
    for (const section of flow.sections) {
      for (const field of section.fields) {
        if (field.default !== undefined) defaults[field.id] = field.default;
      }
    }
    if (flow.options) {
      for (const field of flow.options.fields) {
        if (field.default !== undefined) defaults[field.id] = field.default;
      }
    }
    for (const [k, v] of Object.entries(defaults)) {
      setFormValue(k, v);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flowId]);

  const handleMatch = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await matchPumps({
        productLine: productLine ?? "bps-w",
        flowId,
        parameters: formValues,
      });
      const pumps = res.pumps as PumpCandidate[];
      setMatchResult(pumps);
      setSelectedPumpId(pumps[0]?.id ?? null);
      setStationResult(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка подбора");
    } finally {
      setBusy(false);
    }
  };

  const handleBuild = async () => {
    if (!selectedPumpId) return;
    setBusy(true);
    setError("");
    try {
      const res = await buildStation({
        productLine: productLine ?? "bps-w",
        flowId,
        parameters: formValues,
        selectedPumpId,
      });
      setStationResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка формирования станции");
    } finally {
      setBusy(false);
    }
  };

  const handlePdf = async (docType: "selection" | "tkp" | "techsheet", fileName: string) => {
    const id = (stationResult as { selectionId?: string })?.selectionId;
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      const blob = await generatePdf(id, docType);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка генерации PDF");
    } finally {
      setBusy(false);
    }
  };

  const pumps = (matchedPumps ?? []) as PumpCandidate[];
  const summary = (stationResult as { summary?: string })?.summary;
  const working = Number(formValues.workingPumps ?? 1);
  const reserve = Number(formValues.reservePumps ?? 1);
  const headerLogo =
    appearance?.selection_flow_header_logo_url ?? SELECTION_FLOW_HEADER_BRAND_DEFAULT_SRC;
  const pageTitle = `Подбор насосной установки ${(productLine ?? "BPS-W").toUpperCase()}`;

  return (
    <div
      className="selection-work-root flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[var(--funnel-page-bg)]"
      style={{ fontFamily: "var(--funnel-font-body)" }}
    >
      <WorkHeader
        pageTitle={pageTitle}
        pageTitleLogoSrc={headerLogo}
        leftSlot={
          <button
            type="button"
            onClick={goBack}
            className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-[#E6E6E6] px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-[#d9d9d9]"
          >
            ← Назад
          </button>
        }
      />

      {error ? (
        <div className="mx-4 mb-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-2 sm:px-4 lg:px-6">
        {/* Mobile stack */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto lg:hidden">
          <ParamsPanel flow={flow} formValues={formValues} setFormValue={setFormValue} />
          <CurvesPanel
            selectedPump={pumps.find((p) => p.id === selectedPumpId) ?? null}
            flowRate={Number(formValues.flowRate ?? 0)}
            head={Number(formValues.head ?? 0)}
          />
          <TechSpecsPanel
            working={working}
            reserve={reserve}
            onTkp={stationResult ? () => void handlePdf("tkp", "tkp.pdf") : undefined}
            onTechsheet={stationResult ? () => void handlePdf("techsheet", "techsheet.pdf") : undefined}
          />
          <OptionsPanel
            flow={flow}
            formValues={formValues}
            setFormValue={setFormValue}
            busy={busy}
            onReset={() => {
              resetForm();
              setSelectedPumpId(null);
              setError("");
            }}
            onMatch={handleMatch}
            onBuild={handleBuild}
            canBuild={Boolean(selectedPumpId)}
            matchLabel={flow.actions.match?.label ?? "Подобрать"}
            buildLabel={flow.actions.build?.label ?? "Сформировать станцию"}
            resetLabel={flow.actions.reset?.label ?? "Сбросить"}
          />
          <ResultsPanel
            title={flow.result.pumpsListTitle}
            empty={flow.result.emptyMatchHint}
            pumps={pumps}
            selectedPumpId={selectedPumpId}
            onSelect={setSelectedPumpId}
            summary={summary}
            onPdf={
              flow.pdf?.enabled && stationResult
                ? () => void handlePdf("selection", "selection.pdf")
                : undefined
            }
            pdfLabel={flow.pdf?.label}
          />
        </div>

        {/* Desktop grid — reference layout */}
        <div className="hidden min-h-0 flex-1 flex-col font-sans text-[var(--funnel-text)] lg:flex">
          <div
            className="grid h-full min-h-0 w-full max-w-[1440px] grid-rows-[minmax(0,1.06fr)_minmax(0,0.94fr)] items-stretch gap-x-3 gap-y-2 xl:mx-auto [grid-template-columns:minmax(0,1.95fr)_minmax(0,2.75fr)]"
          >
            <ParamsPanel flow={flow} formValues={formValues} setFormValue={setFormValue} />

            <div className="flex h-full min-h-0 min-w-0 items-stretch gap-3">
              <CurvesPanel
                className="min-h-0 min-w-0 flex-[1.71]"
                selectedPump={pumps.find((p) => p.id === selectedPumpId) ?? null}
                flowRate={Number(formValues.flowRate ?? 0)}
                head={Number(formValues.head ?? 0)}
              />
              <TechSpecsPanel
                working={working}
                reserve={reserve}
                className="h-full min-w-0 flex-[1]"
                onTkp={stationResult ? () => void handlePdf("tkp", "tkp.pdf") : undefined}
                onTechsheet={stationResult ? () => void handlePdf("techsheet", "techsheet.pdf") : undefined}
              />
            </div>

            <OptionsPanel
              flow={flow}
              formValues={formValues}
              setFormValue={setFormValue}
              busy={busy}
              onReset={() => {
                resetForm();
                setSelectedPumpId(null);
                setError("");
              }}
              onMatch={handleMatch}
              onBuild={handleBuild}
              canBuild={Boolean(selectedPumpId)}
              matchLabel={flow.actions.match?.label ?? "Подобрать"}
              buildLabel={flow.actions.build?.label ?? "Сформировать станцию"}
              resetLabel={flow.actions.reset?.label ?? "Сбросить"}
            />

            <ResultsPanel
              title={flow.result.pumpsListTitle}
              empty={flow.result.emptyMatchHint}
              pumps={pumps}
              selectedPumpId={selectedPumpId}
              onSelect={setSelectedPumpId}
              summary={summary}
              onPdf={
                flow.pdf?.enabled && stationResult
                  ? () => void handlePdf("selection", "selection.pdf")
                  : undefined
              }
              pdfLabel={flow.pdf?.label}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ParamsPanel({
  flow,
  formValues,
  setFormValue,
}: {
  flow: FlowConfig;
  formValues: Record<string, unknown>;
  setFormValue: (id: string, value: unknown) => void;
}) {
  return (
    <div className={cn(panelClass, "h-full")}>
      <div className={panelHeadClass}>Параметры подбора</div>
      <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3 pb-3 pt-2">
        <div className="space-y-4">
          {flow.sections.map((section) => (
            <section key={section.id}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--funnel-text-muted)]">
                {section.title}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {section.fields.map((field) => (
                  <StrelaFormField
                    key={field.id}
                    field={field}
                    value={formValues[field.id]}
                    onChange={(v) => setFormValue(field.id, v)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

interface CurvePoint {
  x: number;
  y: number;
}

function toPolyline(points: CurvePoint[], width: number, height: number, pad: number): string {
  const safeW = Math.max(width - pad * 2, 1);
  const safeH = Math.max(height - pad * 2, 1);
  const minX = Math.min(...points.map((p) => p.x));
  const maxX = Math.max(...points.map((p) => p.x));
  const minY = Math.min(...points.map((p) => p.y));
  const maxY = Math.max(...points.map((p) => p.y));
  const xRange = Math.max(maxX - minX, 1);
  const yRange = Math.max(maxY - minY, 1);
  return points
    .map((p) => {
      const px = pad + ((p.x - minX) / xRange) * safeW;
      const py = pad + (1 - (p.y - minY) / yRange) * safeH;
      return `${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(" ");
}

function mapPointInBounds(
  point: CurvePoint,
  bounds: CurvePoint[],
  width: number,
  height: number,
  pad: number,
): { x: number; y: number } {
  const safeW = Math.max(width - pad * 2, 1);
  const safeH = Math.max(height - pad * 2, 1);
  const minX = Math.min(...bounds.map((p) => p.x));
  const maxX = Math.max(...bounds.map((p) => p.x));
  const minY = Math.min(...bounds.map((p) => p.y));
  const maxY = Math.max(...bounds.map((p) => p.y));
  const xRange = Math.max(maxX - minX, 1);
  const yRange = Math.max(maxY - minY, 1);
  const px = pad + ((point.x - minX) / xRange) * safeW;
  const py = pad + (1 - (point.y - minY) / yRange) * safeH;
  return {
    x: Math.min(Math.max(px, pad), width - pad),
    y: Math.min(Math.max(py, pad), height - pad),
  };
}

function curveFromPump(pump: PumpCandidate, flowRate: number, head: number) {
  const qNom = Math.max(Number(pump.nominal_flow ?? flowRate ?? 20), 1);
  const hNom = Math.max(Number(pump.nominal_head ?? head ?? 25), 1);
  const pNom = Math.max(Number(pump.powerKw ?? 1.5), 0.1);
  const flowEnd = qNom * 1.45;
  const headCurve: CurvePoint[] = [];
  const powerCurve: CurvePoint[] = [];
  for (let i = 0; i <= 20; i += 1) {
    const q = (flowEnd / 20) * i;
    const qRel = q / qNom;
    headCurve.push({
      x: q,
      y: Math.max(hNom * (1 - 0.58 * qRel * qRel), 0),
    });
    powerCurve.push({
      x: q,
      y: Math.max(pNom * (0.28 + 0.78 * qRel), 0),
    });
  }
  return { headCurve, powerCurve };
}

function CurvesPanel({
  className,
  selectedPump,
  flowRate,
  head,
}: {
  className?: string;
  selectedPump: PumpCandidate | null;
  flowRate: number;
  head: number;
}) {
  const chartWidth = 520;
  const chartHeight = 220;
  const chartPad = 20;
  const curveData = selectedPump ? curveFromPump(selectedPump, flowRate, head) : null;
  const dutyPoint = selectedPump
    ? {
        x: Math.max(flowRate, 0),
        y: Math.max(head, 0),
      }
    : null;
  const dutySvgPoint =
    curveData && dutyPoint
      ? mapPointInBounds(dutyPoint, curveData.headCurve, chartWidth, chartHeight, chartPad)
      : null;

  return (
    <WorkPanel title="Кривые характеристик" className={cn("h-full", className)}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2">
        <div className="grid min-h-0 flex-1 grid-rows-2 overflow-hidden rounded-md border border-[var(--funnel-panel-border)] bg-white">
          {curveData ? (
            <>
              <div className="relative border-b border-[var(--funnel-panel-border)] bg-white">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="h-full w-full"
                  preserveAspectRatio="none"
                  aria-label="Кривая напора"
                >
                  <rect x="0" y="0" width={chartWidth} height={chartHeight} fill="#ffffff" />
                  <polyline
                    points={toPolyline(curveData.headCurve, chartWidth, chartHeight, chartPad)}
                    fill="none"
                    stroke="#13347f"
                    strokeWidth="2.5"
                  />
                  {dutySvgPoint ? (
                    <circle
                      cx={dutySvgPoint.x}
                      cy={dutySvgPoint.y}
                      r="4.2"
                      fill="#0b132f"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  ) : null}
                </svg>
              </div>
              <div className="relative bg-white">
                <svg
                  viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                  className="h-full w-full"
                  preserveAspectRatio="none"
                  aria-label="Кривая мощности"
                >
                  <rect x="0" y="0" width={chartWidth} height={chartHeight} fill="#ffffff" />
                  <polyline
                    points={toPolyline(curveData.powerCurve, chartWidth, chartHeight, chartPad)}
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="2.5"
                  />
                </svg>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-center border-b border-[var(--funnel-panel-border)] bg-white text-center text-3xl font-medium text-black/85">
                Выберите насос
              </div>
              <div className="flex items-center justify-center bg-white text-center text-3xl font-medium text-[color:color-mix(in_srgb,var(--funnel-panel-border)_55%,black)]">
                Выберите насос
              </div>
            </>
          )}
        </div>
      </div>
    </WorkPanel>
  );
}

function TechSpecsPanel({
  working,
  reserve,
  className,
  onTkp,
  onTechsheet,
}: {
  working: number;
  reserve: number;
  className?: string;
  onTkp?: () => void;
  onTechsheet?: () => void;
}) {
  const rows = [
    ["Количество насосов", `${working} раб. + ${reserve} рез.`],
    ["Номинальная мощность насоса", "—"],
    ["Номинальное напряжение", "3×380 В; 50 Гц"],
    ["Номинальный ток насоса", "—"],
    ["Макс. рабочее давление", "—"],
    ["Присоединение", "—"],
    ["Масса", "—"],
  ];

  return (
    <WorkPanel title="Технические характеристики" className={className}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-1.5 pt-2">
        <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain text-xs leading-snug">
          {rows.map(([label, value]) => (
            <li key={label} className="flex justify-between gap-2">
              <span className="text-[var(--funnel-text-muted)]">{label}</span>
              <span className="text-right font-medium tabular-nums text-[var(--funnel-text)]">{value}</span>
            </li>
          ))}
        </ul>
        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-zinc-200 p-2">
          <button
            type="button"
            onClick={onTkp}
            disabled={!onTkp}
            className={cn(
              "inline-flex items-center justify-center rounded-md px-2 py-2 text-center text-xs font-medium selection-work-btn-secondary disabled:cursor-not-allowed disabled:opacity-50",
              focusRing,
            )}
          >
            В ТКП
          </button>
          <button
            type="button"
            onClick={onTechsheet}
            disabled={!onTechsheet}
            className={cn(
              "inline-flex items-center justify-center rounded-md px-2 py-2 text-center text-xs font-medium selection-work-btn-secondary disabled:cursor-not-allowed disabled:opacity-50",
              focusRing,
            )}
          >
            Тех. лист
          </button>
        </div>
      </div>
    </WorkPanel>
  );
}

function OptionsPanel({
  flow,
  formValues,
  setFormValue,
  busy,
  onReset,
  onMatch,
  onBuild,
  canBuild,
  matchLabel,
  buildLabel,
  resetLabel,
}: {
  flow: FlowConfig;
  formValues: Record<string, unknown>;
  setFormValue: (id: string, value: unknown) => void;
  busy: boolean;
  onReset: () => void;
  onMatch: () => void;
  onBuild: () => void;
  canBuild: boolean;
  matchLabel: string;
  buildLabel: string;
  resetLabel: string;
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-2">
      <WorkPanel title={flow.options?.title ?? "Дополнительные опции"} className="min-h-0 min-w-0 flex-1">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
          {flow.options ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {flow.options.fields.map((field) =>
                field.type === "checkbox" ? (
                  <label
                    key={field.id}
                    className="flex items-center gap-2 text-sm text-[var(--funnel-text)]"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-zinc-300"
                      checked={Boolean(formValues[field.id] ?? field.default)}
                      onChange={(e) => setFormValue(field.id, e.target.checked)}
                    />
                    {field.label}
                  </label>
                ) : (
                  <StrelaFormField
                    key={field.id}
                    field={field}
                    value={formValues[field.id]}
                    onChange={(v) => setFormValue(field.id, v)}
                  />
                ),
              )}
            </div>
          ) : null}
        </div>
      </WorkPanel>
      <div
        className={cn(
          "selection-work-actions-bar flex shrink-0 gap-2 rounded-lg px-3 py-2",
          "border-l-[3px] border-l-transparent transition-[border-left-color] duration-200",
          "hover:border-l-[var(--funnel-primary)] focus-within:border-l-[var(--funnel-primary)]",
        )}
      >
        <button
          type="button"
          onClick={onReset}
          disabled={busy}
          className={cn("h-9 flex-1 rounded-md text-sm selection-work-btn-ghost", focusRing)}
        >
          {resetLabel}
        </button>
        <button
          type="button"
          onClick={onMatch}
          disabled={busy}
          className={cn(
            "h-9 flex-1 rounded-md text-sm font-medium selection-work-btn-primary",
            focusRing,
          )}
        >
          {busy ? "Загрузка…" : matchLabel}
        </button>
      </div>
      <button
        type="button"
        onClick={onBuild}
        disabled={busy || !canBuild}
        className={cn(
          "h-9 w-full rounded-md text-sm font-medium selection-work-btn-primary disabled:cursor-not-allowed disabled:opacity-50",
          focusRing,
        )}
      >
        {buildLabel}
      </button>
    </div>
  );
}

function ResultsPanel({
  title,
  empty,
  pumps,
  selectedPumpId,
  onSelect,
  summary,
  onPdf,
  pdfLabel,
}: {
  title: string;
  empty: string;
  pumps: PumpCandidate[];
  selectedPumpId: string | null;
  onSelect: (id: string) => void;
  summary?: string;
  onPdf?: () => void;
  pdfLabel?: string;
}) {
  return (
    <WorkPanel title={title} className="h-full min-w-0 w-full">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
        {pumps.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-[var(--funnel-text-muted)]">
            <svg
              className="h-10 w-10 opacity-40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <p>{empty}</p>
          </div>
        ) : (
          <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto">
            {pumps.map((p, i) => (
              <li key={p.id}>
                <label
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    selectedPumpId === p.id
                      ? "bg-[var(--funnel-table-row-selected-bg)]"
                      : i % 2 === 1
                        ? "bg-[var(--funnel-table-row-alt-bg)]"
                        : "",
                  )}
                >
                  <input
                    type="radio"
                    name="selectedPump"
                    className="mt-1"
                    checked={selectedPumpId === p.id}
                    onChange={() => onSelect(p.id)}
                  />
                  <span className="text-[var(--funnel-text)]">
                    <span className="font-medium">{p.name}</span>
                    {p.powerKw != null ? (
                      <span className="ml-2 text-[var(--funnel-text-muted)]">{p.powerKw} kW</span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}

        {summary ? (
          <div className="mt-2 shrink-0 border-t border-zinc-200 pt-2 space-y-1 text-sm text-[var(--funnel-text)]">
            <p className="font-medium">{summary}</p>
            {onPdf && pdfLabel ? (
              <button
                type="button"
                onClick={onPdf}
                className={cn(
                  "mt-1 inline-flex rounded-md px-3 py-1.5 text-xs selection-work-btn-secondary",
                  focusRing,
                )}
              >
                {pdfLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </WorkPanel>
  );
}
