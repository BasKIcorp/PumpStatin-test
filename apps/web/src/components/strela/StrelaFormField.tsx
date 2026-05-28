import { useEffect, useState } from "react";
import { fetchCatalog, type CatalogItem } from "@/api/catalog";
import type { FlowField } from "@/types/wizard";
import { cn } from "@/lib/cn";

interface Props {
  field: FlowField;
  value: unknown;
  onChange: (value: unknown) => void;
  compact?: boolean;
}

const inputClass = cn(
  "h-8 w-full rounded-md border border-[var(--funnel-input-border)] bg-[var(--funnel-input-bg)] px-2 text-sm text-[var(--funnel-text)]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--funnel-primary)] focus-visible:ring-offset-2",
);

export function StrelaFormField({ field, value, onChange, compact }: Props) {
  const [options, setOptions] = useState<CatalogItem[]>([]);

  useEffect(() => {
    if (field.type !== "select" || !field.source) return;
    fetchCatalog(field.source)
      .then((r) => setOptions(r.items))
      .catch(() => setOptions([]));
  }, [field.type, field.source]);

  const labelClass = cn(
    "text-xs leading-snug text-[var(--funnel-text-muted)]",
    compact ? "max-sm:pb-0.5" : "",
  );

  if (field.type === "readonly") {
    return (
      <label className={cn("flex flex-col gap-1", compact && "sm:contents")}>
        <span className={labelClass}>{field.label}</span>
        <input className={cn(inputClass, "font-medium")} value={String(value ?? field.default ?? "—")} readOnly />
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="flex flex-col gap-1">
        <span className={labelClass}>{field.label}</span>
        <select className={inputClass} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
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
      <label className="flex flex-col gap-1">
        <span className={labelClass}>{field.label}</span>
        <input
          type="number"
          min={field.min}
          max={field.max}
          step="any"
          className={cn(inputClass, "font-mono text-right tabular-nums")}
          value={Number(value ?? field.default ?? 0)}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </label>
    );
  }

  return (
    <label className="flex flex-col gap-1">
      <span className={labelClass}>{field.label}</span>
      <input
        className={inputClass}
        value={String(value ?? field.default ?? "")}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
