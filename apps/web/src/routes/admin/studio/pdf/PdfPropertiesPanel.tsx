import type { PdfBlock } from "./PdfCanvas";
import { FIGMA } from "../figma/figmaTokens";

const DATA_SOURCES = [
  { path: "selection.input.flowRate", desc: "Расход из формы" },
  { path: "selection.input.head", desc: "Напор из формы" },
  { path: "selection.result.pumps[].model", desc: "Модель насоса" },
  { path: "profile.displayName", desc: "Название профиля" },
  { path: "selection.date", desc: "Дата" },
];

const inputClass =
  "w-full rounded border-0 px-2 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#0d99ff]";

function BindingField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const hasBinding = value.includes("{{");
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-[11px] text-[#b3b3b3]">{label}</label>
        {hasBinding && <span className="text-[9px] text-[#0d99ff]">binding</span>}
      </div>
      <input
        className={`${inputClass} font-mono text-xs ${hasBinding ? "ring-1 ring-[#0d99ff]/40" : ""}`}
        style={{ background: FIGMA.inputBg }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

export function PdfPropertiesPanel({
  block,
  templateName,
  mode,
  onModeChange,
  onTemplateNameChange,
  onChangeProp,
  onInsertBinding,
}: {
  block: PdfBlock | null;
  templateName: string;
  mode: "auto" | "free";
  onModeChange: (m: "auto" | "free") => void;
  onTemplateNameChange: (v: string) => void;
  onChangeProp: (key: string, value: unknown) => void;
  onInsertBinding: (path: string) => void;
}) {
  if (!block) {
    return (
      <div className="space-y-4">
        <div>
          <div className="mb-2 text-xs font-medium text-white">PDF шаблон</div>
          <label className="mb-1 block text-[11px] text-[#b3b3b3]">Название</label>
          <input
            className={inputClass}
            style={{ background: FIGMA.inputBg }}
            value={templateName}
            onChange={(e) => onTemplateNameChange(e.target.value)}
          />
        </div>
        <div>
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#888]">Режим</div>
          <div className="flex gap-1">
            {(["auto", "free"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange(m)}
                className="flex-1 rounded py-1.5 text-[11px]"
                style={
                  mode === m
                    ? { background: FIGMA.accentSoft, color: FIGMA.accent }
                    : { background: FIGMA.inputBg, color: FIGMA.textMuted }
                }
              >
                {m === "auto" ? "Поток" : "Свободный"}
              </button>
            ))}
          </div>
        </div>
        <p className="text-[11px] leading-relaxed text-[#666]">
          Выберите блок на холсте или добавьте из панели «Блоки».
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-xs font-medium text-white">{block.type}</div>

      <p className="text-[10px] text-[#888]">
        Используйте <code className="text-[#0d99ff]">{`{{путь}}`}</code> для подстановки данных
      </p>

      {block.type === "header" && (
        <>
          <BindingField
            label="Заголовок"
            value={String(block.props.title ?? "")}
            onChange={(v) => onChangeProp("title", v)}
          />
          <BindingField
            label="Подзаголовок"
            value={String(block.props.subtitle ?? "")}
            onChange={(v) => onChangeProp("subtitle", v)}
          />
        </>
      )}
      {block.type === "footer" && (
        <BindingField
          label="Текст"
          value={String(block.props.text ?? "")}
          onChange={(v) => onChangeProp("text", v)}
        />
      )}
      {block.type === "text" && (
        <div>
          <label className="mb-1 block text-[11px] text-[#b3b3b3]">Содержимое</label>
          <textarea
            className={`${inputClass} min-h-[100px] font-mono text-xs`}
            style={{ background: FIGMA.inputBg }}
            value={String(block.props.content ?? "")}
            onChange={(e) => onChangeProp("content", e.target.value)}
          />
        </div>
      )}
      {block.type === "customer-info" && (
        <>
          <BindingField
            label="Организация"
            value={String(block.props.organization ?? "")}
            onChange={(v) => onChangeProp("organization", v)}
          />
          <BindingField
            label="Дата"
            value={String(block.props.date ?? "")}
            onChange={(v) => onChangeProp("date", v)}
          />
        </>
      )}
      {block.type === "signature" && (
        <BindingField
          label="ФИО"
          value={String(block.props.name ?? "")}
          onChange={(v) => onChangeProp("name", v)}
        />
      )}

      <details>
        <summary className="cursor-pointer text-[10px] text-[#888] hover:text-[#bbb]">
          Источники данных
        </summary>
        <div className="mt-2 space-y-1">
          {DATA_SOURCES.map((ds) => (
            <button
              key={ds.path}
              type="button"
              onClick={() => onInsertBinding(ds.path)}
              className="block w-full rounded px-1.5 py-1 text-left text-[10px] hover:bg-[#383838]"
              style={{ color: FIGMA.accent }}
            >
              <code>{`{{${ds.path}}}`}</code>
              <span className="ml-1 text-[#666]">— {ds.desc}</span>
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
