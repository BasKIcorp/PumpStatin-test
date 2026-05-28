import { useEffect, useState } from "react";
import { fetchCatalog, type CatalogItem } from "@/api/catalog";
import type { FlowField } from "@/types/wizard";

interface Props {
  field: FlowField;
  value: unknown;
  onChange: (value: unknown) => void;
}

export function FormField({ field, value, onChange }: Props) {
  const [options, setOptions] = useState<CatalogItem[]>([]);

  useEffect(() => {
    if (field.type !== "select" || !field.source) return;
    fetchCatalog(field.source)
      .then((r) => setOptions(r.items))
      .catch(() => setOptions([]));
  }, [field.type, field.source]);

  if (field.type === "readonly") {
    return (
      <label className="flex flex-col gap-1 text-sm">
        <span>{field.label}</span>
        <input
          className="rounded border border-neutral-300 bg-neutral-50 px-2 py-1.5"
          value={String(value ?? field.default ?? "—")}
          readOnly
        />
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="flex flex-col gap-1 text-sm">
        <span>{field.label}</span>
        <select
          className="rounded border border-neutral-300 px-2 py-1.5"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— выберите —</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "number") {
    return (
      <label className="flex flex-col gap-1 text-sm">
        <span>{field.label}</span>
        <input
          type="number"
          min={field.min}
          max={field.max}
          className="rounded border border-neutral-300 px-2 py-1.5"
          value={Number(value ?? field.default ?? 0)}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>{field.label}</span>
      <input
        className="rounded border border-neutral-300 px-2 py-1.5"
        value={String(value ?? field.default ?? "")}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
