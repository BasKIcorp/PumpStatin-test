import type { BlockConfig } from "@pumpstation/contracts";
import { getSchema, type BlockFieldSchema } from "./blockSchema";

function resolveValue(props: Record<string, unknown>, key: string): unknown {
  const parts = key.split(".");
  let val: unknown = props;
  for (const p of parts) {
    if (val === null || val === undefined) return undefined;
    val = (val as Record<string, unknown>)[p];
  }
  return val;
}

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

  switch (field.type) {
    case "color":
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="h-7 w-10 cursor-pointer rounded border"
            value={String(val)}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            className="flex-1 rounded border px-2 py-1 text-xs font-mono"
            value={String(val)}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "number":
      return (
        <input
          type="number"
          className="w-full rounded border px-2 py-1 text-sm"
          value={val as number}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      );
    case "textarea":
      return (
        <textarea
          className="min-h-[120px] w-full rounded border px-2 py-1 text-xs font-mono"
          value={String(val)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "json":
      return (
        <textarea
          className="min-h-[120px] w-full rounded border px-2 py-1 text-xs font-mono"
          value={JSON.stringify(val, null, 2)}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value));
            } catch {
              /* ignore */
            }
          }}
        />
      );
    case "checkbox":
      return (
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={Boolean(val)}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
    case "select":
      return (
        <select
          className="w-full rounded border px-2 py-1 text-sm"
          value={String(val)}
          onChange={(e) => onChange(e.target.value)}
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
          className="w-full rounded border px-2 py-1 text-sm"
          value={String(val)}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

const SECTION_LABELS: Record<string, string> = {
  style: "СТИЛИ",
  content: "КОНТЕНТ",
  behavior: "ПОВЕДЕНИЕ",
};

const SECTION_COLORS: Record<string, string> = {
  style: "text-purple-600",
  content: "text-blue-600",
  behavior: "text-green-600",
};

export function PropertiesPanel({
  block,
  onChangeType,
  onChangeProp,
}: {
  block: BlockConfig;
  onChangeType: (type: string) => void;
  onChangeProp: (key: string, value: unknown) => void;
}) {
  const schema = getSchema(block.type);
  if (!schema) {
    return (
      <div className="p-3 text-xs text-neutral-500">
        Нет схемы для блока "{block.type}"
      </div>
    );
  }

  const sections: Array<"style" | "content" | "behavior"> = [
    "style",
    "content",
    "behavior",
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="truncate text-xs font-semibold text-neutral-700">{block.id}</h3>
        <select
          className="w-28 rounded border px-1 py-0.5 text-[11px]"
          value={block.type}
          onChange={(e) => onChangeType(e.target.value)}
        >
          {["hero", "rich-text", "card-grid", "wizard"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {sections.map((section) => {
        const fields = schema.fields.filter((f: BlockFieldSchema) => f.section === section);
        if (fields.length === 0) return null;
        return (
          <div key={section}>
            <h4
              className={`mb-1 text-[11px] font-semibold uppercase tracking-wide ${SECTION_COLORS[section]}`}
            >
              {SECTION_LABELS[section]}
            </h4>
            <div className="space-y-2">
              {fields.map((field: BlockFieldSchema) => (
                <div key={field.key}>
                  <label className="mb-0.5 block text-[11px] text-neutral-600">
                    {field.label}
                  </label>
                  <FieldEditor
                    field={field}
                    value={resolveValue(block.props, field.key)}
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
