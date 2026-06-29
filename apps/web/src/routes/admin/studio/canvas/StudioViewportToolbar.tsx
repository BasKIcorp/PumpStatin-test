import {
  STUDIO_VIEWPORT_PRESETS,
  viewportPresetById,
  type StudioViewportPresetId,
} from "./studioViewport";
import type { ReactNode } from "react";

export function StudioViewportToolbar({
  value,
  onChange,
  extra,
}: {
  value: StudioViewportPresetId;
  onChange: (id: StudioViewportPresetId) => void;
  extra?: ReactNode;
}) {
  const active = viewportPresetById(value);

  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-1.5"
      style={{ background: "#2c2c2c", borderColor: "#3d3d3d" }}
      data-testid="studio-viewport-toolbar"
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[#666]">Viewport</span>
      {STUDIO_VIEWPORT_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onChange(preset.id)}
          aria-pressed={value === preset.id}
          data-testid={`viewport-preset-${preset.id}`}
          className="rounded px-2 py-0.5 text-[10px]"
          style={
            value === preset.id
              ? { background: "rgba(13,153,255,0.2)", color: "#0d99ff" }
              : { background: "#383838", color: "#b3b3b3" }
          }
        >
          {preset.label}
        </button>
      ))}
      <span className="ml-auto font-mono text-[10px] text-[#666]">
        {active.width} × {active.height}
      </span>
      {extra}
    </div>
  );
}
