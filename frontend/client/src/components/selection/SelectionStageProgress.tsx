import { cn } from "@/lib/utils";

const STAGES = [
  { step: 1 as const, label: "Выбор из карточек" },
  { step: 2 as const, label: "Ввод параметров" },
];

export function SelectionStageProgress({ current }: { current: 1 | 2 }) {
  return (
    <nav
      className="selection-stage-progress flex flex-wrap items-center gap-2 sm:gap-3"
      aria-label="Этапы подбора"
    >
      {STAGES.map((s, i) => {
        const active = s.step === current;
        const done = s.step < current;
        return (
          <div key={s.step} className="flex items-center gap-2 sm:gap-3">
            {i > 0 ? (
              <span
                className={cn(
                  "hidden h-px w-6 sm:block sm:w-10",
                  done || active ? "bg-[var(--funnel-primary)]" : "bg-[var(--funnel-border)]",
                )}
                aria-hidden
              />
            ) : null}
            <div
              className={cn(
                "flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium sm:px-3 sm:text-sm",
                active &&
                  "bg-[color-mix(in_srgb,var(--funnel-primary)_12%,var(--funnel-surface))] text-[var(--funnel-primary)] ring-1 ring-[color-mix(in_srgb,var(--funnel-primary)_35%,transparent)]",
                done && !active && "text-[var(--funnel-primary)]",
                !active && !done && "text-[var(--funnel-text-muted)]",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold sm:h-7 sm:w-7",
                  active && "bg-[var(--funnel-primary)] text-white",
                  done && !active && "bg-[var(--funnel-primary)] text-white",
                  !active && !done && "bg-[var(--funnel-border)] text-[var(--funnel-text-muted)]",
                )}
              >
                {done && !active ? "✓" : s.step}
              </span>
              <span className="whitespace-nowrap">{s.label}</span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
