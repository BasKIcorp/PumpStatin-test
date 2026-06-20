import type { BlockConfig, BlockGridLayout } from "@pumpstation/contracts";
import { getNested } from "@/routes/admin/studio/canvas/studioPropUtils";
import { getSchema, getBlockSchemas, type BlockFieldSchema } from "./blockSchema";
import { FIGMA } from "../figma/figmaTokens";

const inputClass =
  "w-full rounded border-0 px-2 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#0d99ff]";

function FieldEditor({
  field,
  value,
  onChange,
}: {
  field: BlockFieldSchema;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const val = value ?? field.defaultValue ?? "";
  const bg = { background: FIGMA.inputBg };

  switch (field.type) {
    case "color":
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="h-7 w-10 cursor-pointer rounded border-0"
            style={bg}
            value={String(val)}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            className={`${inputClass} font-mono text-xs`}
            style={bg}
            value={String(val)}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "number":
      return (
        <input
          type="number"
          className={inputClass}
          style={bg}
          value={val as number}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      );
    case "textarea":
    case "json":
      return (
        <textarea
          className={`${inputClass} min-h-[80px] font-mono text-xs`}
          style={bg}
          value={field.type === "json" ? JSON.stringify(val, null, 2) : String(val)}
          onChange={(e) => {
            if (field.type === "json") {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                /* ignore */
              }
            } else {
              onChange(e.target.value);
            }
          }}
        />
      );
    case "checkbox":
      return (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-[#555]"
          checked={Boolean(val)}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
    case "select":
      return (
        <select
          className={inputClass}
          style={bg}
          value={String(val)}
          onChange={(e) => onChange(e.target.value)}
          disabled={field.key === "_dataStub"}
        >
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    default:
      return (
        <input
          className={inputClass}
          style={bg}
          value={String(val)}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          readOnly={field.key === "_dataStub"}
        />
      );
  }
}

const SECTION_LABELS: Record<string, string> = {
  style: "Стили",
  content: "Контент",
  behavior: "Поведение",
  data: "Данные",
};

export function PropertiesPanel({
  block,
  onChangeType,
  onChangeProp,
  onChangeLayout,
  gridCols = 12,
}: {
  block: BlockConfig;
  onChangeType: (type: string) => void;
  onChangeProp: (key: string, value: unknown) => void;
  onChangeLayout?: (layout: BlockGridLayout) => void;
  gridCols?: number;
}) {
  const schema = getSchema(block.type);
  const allTypes = getBlockSchemas();
  if (!schema) {
    return <div className="text-xs text-[#888]">Нет схемы для «{block.type}»</div>;
  }

  const sections: Array<"style" | "content" | "behavior" | "data"> = [
    "style",
    "content",
    "behavior",
    "data",
  ];

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-xs font-medium text-white">
          {schema.label}
        </div>
        <select
          className={`${inputClass} text-xs`}
          style={{ background: FIGMA.inputBg }}
          value={block.type}
          onChange={(e) => onChangeType(e.target.value)}
        >
          {allTypes.map((t) => (
            <option key={t.type} value={t.type}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {onChangeLayout && block.layout ? (
        <div>
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#888]">
            Сетка
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {(["x", "y", "w", "h"] as const).map((key) => (
              <div key={key}>
                <label className="mb-1 block text-[10px] uppercase text-[#888]">{key}</label>
                <input
                  type="number"
                  min={key === "w" || key === "h" ? 1 : 0}
                  max={key === "x" || key === "w" ? gridCols : undefined}
                  className={`${inputClass} text-xs`}
                  style={{ background: FIGMA.inputBg }}
                  value={block.layout![key]}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isFinite(n)) return;
                    onChangeLayout({ ...block.layout!, [key]: n });
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {sections.map((section) => {
        const fields = schema.fields.filter((f: BlockFieldSchema) => f.section === section);
        if (fields.length === 0) return null;
        return (
          <div key={section}>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#888]">
              {SECTION_LABELS[section]}
            </h4>
            <div className="space-y-3">
              {fields.map((field: BlockFieldSchema) => (
                <div key={field.key}>
                  <label className="mb-1 block text-[11px] text-[#b3b3b3]">{field.label}</label>
                  <FieldEditor
                    field={field}
                    value={getNested(block.props, field.key)}
                    onChange={(v) => onChangeProp(field.key, v)}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
