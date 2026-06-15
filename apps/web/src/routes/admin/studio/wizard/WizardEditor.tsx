import { useState, useRef } from "react";

interface WizardStep {
  id: string;
  type: string;
  title?: string;
  subtitle?: string;
  titleKey?: string;
  subtitleKey?: string;
  parent?: string;
  when?: Record<string, string>;
  flowRef?: string;
}

interface CardItem {
  id: string;
  title: string;
  image?: string;
  description?: string;
  enabled: boolean;
  next?: string;
  flow?: string;
}

interface FlowField {
  id: string;
  type: string;
  label: string;
  source?: string;
  required?: boolean;
  default?: string | number;
  min?: number;
  max?: number;
}

interface FlowSection {
  id: string;
  title: string;
  fields: FlowField[];
}

interface FlowConfig {
  id: string;
  productLine: string;
  installationType: string;
  sections: FlowSection[];
}

const STEP_TYPES: Record<string, string> = {
  "card-grid": "Выбор карточек",
  "selection-form": "Форма подбора",
};

const STEP_ICONS: Record<string, string> = {
  "card-grid": "📋",
  "selection-form": "📝",
};

/** Flow diagram component showing step navigation */
function StepFlow({
  steps,
  selectedStepId,
  onSelectStep,
  onReorder,
}: {
  steps: WizardStep[];
  selectedStepId: string | null;
  onSelectStep: (id: string) => void;
  onReorder: (steps: WizardStep[]) => void;
}) {
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const newSteps = [...steps];
    const [removed] = newSteps.splice(dragItem.current, 1);
    newSteps.splice(dragOverItem.current, 0, removed);
    onReorder(newSteps);
    dragItem.current = null;
    dragOverItem.current = null;
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase text-neutral-500">Поток шагов</h3>
      <div className="space-y-1">
        {steps.map((step, i) => (
          <div
            key={step.id}
            draggable
            onDragStart={() => handleDragStart(i)}
            onDragEnter={() => handleDragEnter(i)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => onSelectStep(step.id)}
            className={`flex cursor-grab items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
              selectedStepId === step.id
                ? "border-[#13347f] bg-blue-50"
                : "border-neutral-200 bg-white hover:border-neutral-300"
            }`}
          >
            <span className="cursor-grab text-neutral-400">⠿</span>
            <span>{STEP_ICONS[step.type] ?? "🔹"}</span>
            <div className="flex-1">
              <div className="text-sm font-medium">{step.title ?? step.titleKey ?? step.id}</div>
              <div className="text-[10px] text-neutral-500">
                {STEP_TYPES[step.type] ?? step.type}
                {step.when && ` · при: ${Object.values(step.when).join(", ")}`}
              </div>
            </div>
            {step.when && (
              <span className="rounded bg-yellow-100 px-1 py-0.5 text-[10px] text-yellow-700">
                conditional
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Card editor for card-grid steps */
function CardEditor({
  items,
  onChange,
}: {
  items: CardItem[];
  onChange: (items: CardItem[]) => void;
}) {
  const updateCard = (index: number, patch: Partial<CardItem>) => {
    onChange(items.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const addCard = () => {
    const id = `card-${Date.now()}`;
    onChange([...items, { id, title: "Новая карточка", description: "", enabled: true }]);
  };

  const removeCard = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-neutral-700">Карточки ({items.length})</h3>
        <button type="button" onClick={addCard} className="rounded bg-[#13347f] px-2 py-0.5 text-xs text-white">+ Карточка</button>
      </div>
      <div className="space-y-2">
        {items.map((card, i) => (
          <div key={card.id} className="rounded-lg border border-neutral-200 bg-white p-3">
            <div className="flex items-center justify-between">
              <input
                className="flex-1 rounded border px-2 py-1 text-sm font-medium"
                value={card.title}
                onChange={(e) => updateCard(i, { title: e.target.value })}
                placeholder="Название"
              />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={card.enabled} onChange={(e) => updateCard(i, { enabled: e.target.checked })} />
                  активно
                </label>
                <button type="button" onClick={() => removeCard(i)} className="rounded px-1 py-0.5 text-xs text-red-500 hover:bg-red-50">✕</button>
              </div>
            </div>
            <input
              className="mt-1 w-full rounded border px-2 py-1 text-xs font-mono text-neutral-500"
              value={card.image ?? ""}
              onChange={(e) => updateCard(i, { image: e.target.value })}
              placeholder="URL изображения"
            />
            <textarea
              className="mt-1 min-h-[60px] w-full rounded border px-2 py-1 text-xs"
              value={card.description ?? ""}
              onChange={(e) => updateCard(i, { description: e.target.value })}
              placeholder="Описание"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Field editor for selection-form steps */
function FieldEditor({
  flow,
  onChange,
}: {
  flow: FlowConfig | null;
  onChange: (flow: FlowConfig) => void;
}) {
  if (!flow) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-neutral-400">
        Выберите форму подбора
      </div>
    );
  }

  const updateSection = (sectionIndex: number, fieldIndex: number | null, patch: Partial<FlowField>) => {
    const newFlow = { ...flow, sections: [...flow.sections] };
    const section = { ...newFlow.sections[sectionIndex], fields: [...newFlow.sections[sectionIndex].fields] };
    if (fieldIndex !== null) {
      section.fields[fieldIndex] = { ...section.fields[fieldIndex], ...patch };
    } else {
      section.fields.push({ id: `field-${Date.now()}`, type: "text", label: "Новое поле", ...patch });
    }
    newFlow.sections[sectionIndex] = section;
    onChange(newFlow);
  };

  const removeField = (sectionIndex: number, fieldIndex: number) => {
    const newFlow = { ...flow, sections: [...flow.sections] };
    newFlow.sections[sectionIndex] = {
      ...newFlow.sections[sectionIndex],
      fields: newFlow.sections[sectionIndex].fields.filter((_, i) => i !== fieldIndex),
    };
    onChange(newFlow);
  };

  const addSection = () => {
    onChange({
      ...flow,
      sections: [...flow.sections, { id: `section-${Date.now()}`, title: "Новый раздел", fields: [] }],
    });
  };

  const fieldTypes = ["text", "number", "select", "checkbox", "readonly"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-neutral-700">Поля формы: {flow.id}</h3>
        <button type="button" onClick={addSection} className="rounded bg-[#13347f] px-2 py-0.5 text-xs text-white">+ Раздел</button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-0.5 block text-xs text-neutral-600">Product Line</label>
          <input className="w-full rounded border px-2 py-1 text-xs font-mono" value={flow.productLine} onChange={(e) => onChange({ ...flow, productLine: e.target.value })} />
        </div>
        <div>
          <label className="mb-0.5 block text-xs text-neutral-600">Installation Type</label>
          <input className="w-full rounded border px-2 py-1 text-xs font-mono" value={flow.installationType} onChange={(e) => onChange({ ...flow, installationType: e.target.value })} />
        </div>
      </div>

      {flow.sections.map((section, si) => (
        <div key={section.id} className="rounded-lg border border-neutral-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <input
              className="flex-1 rounded border px-2 py-1 text-sm font-medium"
              value={section.title}
              onChange={(e) => {
                const newFlow = { ...flow };
                newFlow.sections[si] = { ...section, title: e.target.value };
                onChange(newFlow);
              }}
            />
            <span className="ml-2 text-[10px] text-neutral-400">{section.fields.length} полей</span>
          </div>

          <div className="space-y-2">
            {section.fields.map((field, fi) => (
              <div key={field.id} className="flex items-start gap-2 rounded border border-neutral-100 bg-neutral-50 p-2">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded border px-2 py-0.5 text-xs"
                      value={field.label}
                      onChange={(e) => updateSection(si, fi, { label: e.target.value })}
                      placeholder="Подпись"
                    />
                    <select className="rounded border px-1 py-0.5 text-xs" value={field.type} onChange={(e) => updateSection(si, fi, { type: e.target.value })}>
                      {fieldTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded border px-2 py-0.5 text-xs font-mono"
                      value={field.id}
                      onChange={(e) => updateSection(si, fi, { id: e.target.value })}
                      placeholder="field id"
                    />
                    <label className="flex items-center gap-1 text-[10px]">
                      <input type="checkbox" checked={field.required ?? false} onChange={(e) => updateSection(si, fi, { required: e.target.checked })} />
                      обязательно
                    </label>
                    <button type="button" onClick={() => removeField(si, fi)} className="rounded px-1 py-0.5 text-xs text-red-500 hover:bg-red-50">✕</button>
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => updateSection(si, null, { id: `field-${Date.now()}`, type: "text", label: "Новое поле" })} className="w-full rounded border border-dashed border-neutral-300 py-1 text-xs text-neutral-500 hover:bg-neutral-50">+ Поле</button>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WizardEditor({
  initialNav,
  onSave,
}: {
  initialNav: Record<string, unknown> | null;
  onSave: (nav: Record<string, unknown>) => void;
}) {
  const [nav, setNav] = useState<any>(() => initialNav ?? { steps: [], cards: {} });
  const [selectedStepId, setSelectedStepId] = useState<string | null>(nav.steps[0]?.id ?? null);

  const selectedStep = nav.steps.find((s: any) => s.id === selectedStepId);
  const isCardStep = selectedStep?.type === "card-grid";
  const isFormStep = selectedStep?.type === "selection-form";

  const currentCards = selectedStepId ? (nav.cards[selectedStepId] ?? []) : [];
  const currentFlow = selectedStep?.flowRef && nav.flows ? nav.flows[selectedStep.flowRef.replace("flows/", "").replace(".yaml", "")] ?? null : null;

  const updateCards = (items: CardItem[]) => {
    if (!selectedStepId) return;
    setNav({ ...nav, cards: { ...nav.cards, [selectedStepId]: items } });
  };

  const updateFlow = (flow: FlowConfig) => {
    setNav({ ...nav, flows: { ...(nav.flows ?? {}), [flow.id]: flow } });
  };

  const reorderSteps = (steps: WizardStep[]) => {
    setNav({ ...nav, steps });
  };

  const updateStep = (id: string, patch: Partial<WizardStep>) => {
    setNav({
      ...nav,
      steps: nav.steps.map((s: any) => (s.id === id ? { ...s, ...patch } : s)),
    });
  };

  return (
    <div className="flex h-full gap-4">
      {/* Левая панель — список шагов */}
      <div className="w-64 shrink-0 space-y-4 overflow-y-auto">
        <StepFlow steps={nav.steps} selectedStepId={selectedStepId} onSelectStep={setSelectedStepId} onReorder={reorderSteps} />

        {selectedStep && (
          <div className="space-y-2 rounded-lg border bg-white p-3">
            <h3 className="text-xs font-semibold text-neutral-700">Свойства шага</h3>
            <div>
              <label className="mb-0.5 block text-xs text-neutral-600">ID</label>
              <input className="w-full rounded border px-2 py-1 text-xs font-mono" value={selectedStep.id} disabled />
            </div>
            <div>
              <label className="mb-0.5 block text-xs text-neutral-600">Заголовок</label>
              <input className="w-full rounded border px-2 py-1 text-sm" value={selectedStep.title ?? ""} onChange={(e) => updateStep(selectedStep.id, { title: e.target.value })} />
            </div>
            <div>
              <label className="mb-0.5 block text-xs text-neutral-600">Подзаголовок</label>
              <input className="w-full rounded border px-2 py-1 text-sm" value={selectedStep.subtitle ?? ""} onChange={(e) => updateStep(selectedStep.id, { subtitle: e.target.value })} />
            </div>
            <div>
              <label className="mb-0.5 block text-xs text-neutral-600">Тип</label>
              <select className="w-full rounded border px-2 py-1 text-sm" value={selectedStep.type} onChange={(e) => updateStep(selectedStep.id, { type: e.target.value })}>
                <option value="card-grid">card-grid (выбор карточек)</option>
                <option value="selection-form">selection-form (форма подбора)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Центр — редактор контента */}
      <div className="min-w-0 flex-1 overflow-y-auto">
        {!selectedStep ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral-400">
            Выберите шаг слева
          </div>
        ) : isCardStep ? (
          <CardEditor items={currentCards} onChange={updateCards} />
        ) : isFormStep ? (
          <FieldEditor flow={currentFlow} onChange={updateFlow} />
        ) : (
          <div className="flex items-center justify-center py-10 text-sm text-neutral-400">
            Неизвестный тип шага: {selectedStep.type}
          </div>
        )}
      </div>

      {/* Правая панель — Save */}
      <div className="w-32 shrink-0">
          <button
            type="button"
            onClick={() => onSave(nav)}
            className="w-full rounded bg-[#13347f] px-4 py-2 text-sm text-white hover:bg-[#0f2866]"
          >
            Сохранить
          </button>
      </div>
    </div>
  );
}
