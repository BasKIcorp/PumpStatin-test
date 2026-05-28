import { useEffect, useMemo, useState } from "react";
import { useProfile } from "@/providers/ProfileProvider";
import { useWizardStore } from "@/stores/wizardStore";
import { matchPumps, buildStation, generatePdf } from "@/api/selection";
import { FormField } from "@/components/wizard/FormField";
import type { FlowConfig } from "@/types/wizard";

interface PumpCandidate {
  id: string;
  name: string;
  score?: number;
  powerKw?: number;
}

export function SelectionFormStep() {
  const { wizard } = useProfile();
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
        if (field.default !== undefined) {
          defaults[field.id] = field.default;
        }
      }
    }
    if (flow.options) {
      for (const field of flow.options.fields) {
        if (field.default !== undefined) {
          defaults[field.id] = field.default;
        }
      }
    }
    for (const [k, v] of Object.entries(defaults)) {
      setFormValue(k, v);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- только при смене flow
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

  const handlePdf = async () => {
    const id = (stationResult as { selectionId?: string })?.selectionId;
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      const blob = await generatePdf(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "selection.pdf";
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

  return (
    <div>
      <button
        type="button"
        onClick={goBack}
        className="mb-4 text-sm text-neutral-600 hover:text-[var(--color-primary)]"
      >
        Назад
      </button>
      <h1 className="mb-6 text-2xl font-bold">
        Подбор насосной установки {productLine?.toUpperCase()}
      </h1>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          {flow.sections.map((section) => (
            <section
              key={section.id}
              className="rounded-lg border border-neutral-200 bg-[var(--color-surface,white)] p-4"
            >
              <h3 className="mb-3 font-semibold">{section.title}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {section.fields.map((field) => (
                  <FormField
                    key={field.id}
                    field={field}
                    value={formValues[field.id]}
                    onChange={(v) => setFormValue(field.id, v)}
                  />
                ))}
              </div>
            </section>
          ))}

          {flow.options && (
            <section className="rounded-lg border border-neutral-200 bg-[var(--color-surface,white)] p-4">
              <h3 className="mb-3 font-semibold">{flow.options.title}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {flow.options.fields.map((field) =>
                  field.type === "checkbox" ? (
                    <label key={field.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={Boolean(formValues[field.id] ?? field.default)}
                        onChange={(e) => setFormValue(field.id, e.target.checked)}
                      />
                      {field.label}
                    </label>
                  ) : (
                    <FormField
                      key={field.id}
                      field={field}
                      value={formValues[field.id]}
                      onChange={(v) => setFormValue(field.id, v)}
                    />
                  ),
                )}
              </div>
            </section>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setSelectedPumpId(null);
                setError("");
              }}
              className="rounded border border-neutral-300 px-4 py-2 text-sm"
              disabled={busy}
            >
              {flow.actions.reset?.label}
            </button>
            <button
              type="button"
              onClick={handleMatch}
              disabled={busy}
              className="rounded bg-[var(--color-primary)] px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {busy ? "…" : flow.actions.match?.label}
            </button>
            <button
              type="button"
              onClick={handleBuild}
              disabled={busy || !selectedPumpId}
              className="rounded bg-[var(--color-accent)] px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {flow.actions.build?.label}
            </button>
            {flow.pdf?.enabled && stationResult != null && (
              <button
                type="button"
                onClick={handlePdf}
                disabled={busy}
                className="rounded border border-[var(--color-primary)] px-4 py-2 text-sm text-[var(--color-primary)]"
              >
                {flow.pdf.label}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <ResultPanel title={flow.result.pumpsListTitle} empty={flow.result.emptyMatchHint}>
            {pumps.length > 0 ? (
              <ul className="space-y-2">
                {pumps.map((p) => (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-start gap-2 rounded border border-neutral-200 p-2 text-sm hover:border-[var(--color-primary)]">
                      <input
                        type="radio"
                        name="selectedPump"
                        checked={selectedPumpId === p.id}
                        onChange={() => setSelectedPumpId(p.id)}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-medium">{p.name}</span>
                        {p.score != null && (
                          <span className="ml-2 text-neutral-500">
                            score {p.score}
                            {p.powerKw != null ? ` · ${p.powerKw} kW` : ""}
                          </span>
                        )}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : null}
          </ResultPanel>
          <ResultPanel
            title={flow.result.configurationTitle}
            empty={flow.result.emptyBuildHint}
          >
            {summary ? (
              <div className="space-y-2 text-sm">
                <p className="font-medium">{summary}</p>
                <pre className="max-h-64 overflow-auto rounded bg-neutral-50 p-2 text-xs">
                  {JSON.stringify(stationResult, null, 2)}
                </pre>
              </div>
            ) : null}
          </ResultPanel>
        </div>
      </div>
    </div>
  );
}

function ResultPanel({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-neutral-200 bg-[var(--color-surface,white)] p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      {children || <p className="text-sm text-neutral-500">{empty}</p>}
    </section>
  );
}
