import { cn } from "@/lib/cn";
import { StrelaFormField } from "../StrelaFormField";
import { WorkHeader } from "../WorkHeader";
import { panelClass, panelHeadClass, WorkPanel } from "../panels";
import { PumpCurveChart } from "../charts/PumpCurveChart";
import { PowerNpshChart } from "../charts/PowerNpshChart";
import { PumpCurvesChartV2 } from "@/components/charts/PumpCurvesChartV2";
import { useSelectionForm, type PumpCandidate } from "./SelectionFormContext";

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--funnel-primary)] focus-visible:ring-offset-2";

export function SelectionParamsPanel({ title }: { title?: string }) {
  const { flow, formValues, setFormValue } = useSelectionForm();
  return (
    <div className={cn(panelClass, "h-full")}>
      <div className={panelHeadClass}>{title ?? "Параметры подбора"}</div>
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

export function SelectionCurvesPanel({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  const { formValues, matchedPumps, selectedPumpId } = useSelectionForm();
  const selectedPump = matchedPumps.find((p) => p.id === selectedPumpId) ?? null;
  const flowRate = Number(formValues.flowRate ?? 0);
  const head = Number(formValues.head ?? 0);
  const guaranteedHead = Number(formValues.guaranteedHead ?? formValues.head ?? 0);

  const curvesV2 = selectedPump
    ? {
        qh_main: selectedPump.curve?.map((p) => ({ Q: p.Q, H: p.H })),
        system: selectedPump.parabola,
        eta: selectedPump.q_eta
          ?.map((q, i) =>
            q != null && selectedPump.eta_s?.[i] != null
              ? { Q: q, eta: selectedPump.eta_s![i]! }
              : null,
          )
          .filter((p): p is { Q: number; eta: number } => p != null),
        p2: selectedPump.q_p2
          ?.map((q, i) =>
            q != null && selectedPump.p2_s?.[i] != null
              ? { Q: q, P2: selectedPump.p2_s![i]! }
              : null,
          )
          .filter((p): p is { Q: number; P2: number } => p != null),
        npsh: selectedPump.q_npsh
          ?.map((q, i) =>
            q != null && selectedPump.npsh_s?.[i] != null
              ? { Q: q, NPSH: selectedPump.npsh_s![i]! }
              : null,
          )
          .filter((p): p is { Q: number; NPSH: number } => p != null),
      }
    : null;

  const wp = selectedPump?.parabola_intersection;

  return (
    <WorkPanel title={title ?? "Кривые характеристик"} className={cn("h-full", className)}>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-2">
        <div className="grid min-h-0 flex-1 grid-rows-2 overflow-hidden rounded-md border border-[var(--funnel-panel-border)] bg-white">
          {selectedPump ? (
            <>
              <div className="min-h-0 border-b border-[var(--funnel-panel-border)] bg-white">
                {curvesV2?.qh_main?.length ? (
                  <PumpCurvesChartV2
                    curves={curvesV2}
                    workingPoint={wp ? { Q: wp.Q, H: wp.H } : undefined}
                    guaranteedHead={guaranteedHead}
                    height={220}
                  />
                ) : (
                  <PumpCurveChart
                    pump={{
                      nominalFlow: selectedPump.nominal_flow,
                      nominalHead: selectedPump.nominal_head,
                      curve: selectedPump.curve,
                      q_eta: selectedPump.q_eta,
                      eta_s: selectedPump.eta_s,
                    }}
                    flowRate={Math.max(flowRate, 0)}
                    head={Math.max(head, 0)}
                  />
                )}
              </div>
              <div className="min-h-0 bg-white">
                <PowerNpshChart
                  pump={{
                    nominalFlow: selectedPump.nominal_flow,
                    powerKw: selectedPump.powerKw,
                    q_p2: selectedPump.q_p2,
                    p2_s: selectedPump.p2_s,
                    q_npsh: selectedPump.q_npsh,
                    npsh_s: selectedPump.npsh_s,
                  }}
                  flowRate={Math.max(flowRate, 0)}
                />
              </div>
            </>
          ) : (
            <div className="row-span-2 flex items-center justify-center text-center text-3xl font-medium text-[color:color-mix(in_srgb,var(--funnel-panel-border)_55%,black)]">
              Выберите насос
            </div>
          )}
        </div>
      </div>
    </WorkPanel>
  );
}

export function SelectionTechSpecsPanel({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  const { working, reserve, handlePdf } = useSelectionForm();
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
    <WorkPanel title={title ?? "Технические характеристики"} className={className}>
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
            onClick={() => void handlePdf("tkp", "tkp.pdf")}
            className={cn(
              "inline-flex items-center justify-center rounded-md px-2 py-2 text-center text-xs font-medium selection-work-btn-secondary",
              focusRing,
            )}
          >
            В ТКП
          </button>
          <button
            type="button"
            onClick={() => void handlePdf("techsheet", "techsheet.pdf")}
            className={cn(
              "inline-flex items-center justify-center rounded-md px-2 py-2 text-center text-xs font-medium selection-work-btn-secondary",
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

export function SelectionOptionsPanel({ title }: { title?: string }) {
  const { flow, formValues, setFormValue, busy, resetForm, handleMatch, handleBuild, canBuild } =
    useSelectionForm();

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col gap-2">
      <WorkPanel
        title={title ?? flow.options?.title ?? "Дополнительные опции"}
        className="min-h-0 min-w-0 flex-1"
      >
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
          onClick={resetForm}
          disabled={busy}
          className={cn("h-9 flex-1 rounded-md text-sm selection-work-btn-ghost", focusRing)}
        >
          {flow.actions.reset?.label ?? "Сбросить"}
        </button>
        <button
          type="button"
          onClick={() => void handleMatch()}
          disabled={busy}
          className={cn(
            "h-9 flex-1 rounded-md text-sm font-medium selection-work-btn-primary",
            focusRing,
          )}
        >
          {busy ? "Загрузка…" : (flow.actions.match?.label ?? "Подобрать")}
        </button>
      </div>
      <button
        type="button"
        onClick={() => void handleBuild()}
        disabled={busy || !canBuild}
        className={cn(
          "h-9 w-full rounded-md text-sm font-medium selection-work-btn-primary disabled:cursor-not-allowed disabled:opacity-50",
          focusRing,
        )}
      >
        {flow.actions.build?.label ?? "Сформировать станцию"}
      </button>
    </div>
  );
}

export function SelectionResultsPanel({ title }: { title?: string }) {
  const {
    flow,
    matchedPumps,
    selectedPumpId,
    setSelectedPumpId,
    summary,
    stationResult,
    handlePdf,
  } = useSelectionForm();
  const pumps = matchedPumps as PumpCandidate[];

  return (
    <WorkPanel title={title ?? flow.result.pumpsListTitle} className="h-full min-w-0 w-full">
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
            <p>{flow.result.emptyMatchHint}</p>
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
                    onChange={() => setSelectedPumpId(p.id)}
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
          <div className="mt-2 shrink-0 space-y-1 border-t border-zinc-200 pt-2 text-sm text-[var(--funnel-text)]">
            <p className="font-medium">{summary}</p>
            {flow.pdf?.enabled && stationResult ? (
              <button
                type="button"
                onClick={() => void handlePdf("selection", "selection.pdf")}
                className={cn(
                  "mt-1 inline-flex rounded-md px-3 py-1.5 text-xs selection-work-btn-secondary",
                  focusRing,
                )}
              >
                {flow.pdf.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </WorkPanel>
  );
}

export function SelectionWorkHeaderBlock({
  title,
  logoUrl,
}: {
  title?: string;
  logoUrl?: string;
}) {
  const { pageTitle, headerLogo, goBack, error } = useSelectionForm();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--funnel-page-bg)]">
      <WorkHeader
        pageTitle={title ?? pageTitle}
        pageTitleLogoSrc={logoUrl ?? headerLogo}
        leftSlot={
          <button
            type="button"
            onClick={() => goBack()}
            className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-[#E6E6E6] px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-[#d9d9d9]"
          >
            ← Назад
          </button>
        }
      />
      {error ? (
        <div className="mx-4 mb-1 shrink-0 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      ) : null}
    </div>
  );
}
