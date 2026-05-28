import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { STRELA_SIDEBAR_WIDTH } from "@/lib/strela/cardUi";
import { FunnelHeading } from "./FunnelHeading";
import { SidebarWordmark } from "./SidebarWordmark";

interface Props {
  sidebarWordmarkSrc?: string | null;
  sidebarText?: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  headerRight?: ReactNode;
  stageBackgroundSrc?: string | null;
  bodyClassName?: string;
  children: ReactNode;
}

export function SelectionFlowFunnel({
  sidebarWordmarkSrc = "/attached_assets/strela-wordmark.svg",
  sidebarText,
  title,
  subtitle,
  onBack,
  backLabel,
  headerRight,
  stageBackgroundSrc,
  bodyClassName,
  children,
}: Props) {
  return (
    <div
      className="selection-flow-funnel-root relative flex min-h-0 flex-1 items-stretch"
      style={{ fontFamily: "var(--funnel-font-body)" }}
    >
      <div
        className="fixed bottom-0 left-0 top-0 z-30 flex flex-col overflow-x-visible border-r border-neutral-200 bg-white"
        style={{ width: STRELA_SIDEBAR_WIDTH }}
      >
        <SidebarWordmark wordmarkSrc={sidebarWordmarkSrc ?? null} sidebarText={sidebarText} />
      </div>

      <div
        className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--funnel-page-bg)]"
        style={{ marginLeft: STRELA_SIDEBAR_WIDTH }}
      >
        <header className="flex-shrink-0 border-0 px-2 py-2 sm:px-4 sm:py-2.5 lg:px-5">
          <div className="flex min-h-[44px] flex-col gap-2 sm:hidden">
            <FunnelHeading title={title} subtitle={subtitle} />
            <div className="flex min-h-[40px] items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                {onBack && backLabel ? (
                  <button
                    type="button"
                    onClick={onBack}
                    className="max-w-full truncate text-left text-sm font-semibold text-[var(--funnel-primary)] hover:underline"
                  >
                    {backLabel}
                  </button>
                ) : (
                  <span />
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2">{headerRight}</div>
            </div>
          </div>

          <div className="hidden min-h-[48px] grid-cols-[1fr_minmax(0,3fr)_1fr] items-center gap-3 sm:grid">
            <div className="flex min-w-0 justify-start">
              {onBack && backLabel ? (
                <button
                  type="button"
                  onClick={onBack}
                  className="text-left text-sm font-semibold text-[var(--funnel-primary)] hover:opacity-80 hover:underline lg:text-base"
                >
                  {backLabel}
                </button>
              ) : null}
            </div>
            <div className="min-w-0 px-1">
              <FunnelHeading title={title} subtitle={subtitle} />
            </div>
            <div className="flex min-w-0 items-center justify-end gap-2">{headerRight}</div>
          </div>
        </header>

        <div
          className={cn(
            "selection-funnel-content-scroll relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto",
            bodyClassName,
          )}
          data-selection-backdrop={stageBackgroundSrc ? "true" : undefined}
        >
          {stageBackgroundSrc ? (
            <div
              className="pointer-events-none absolute inset-0 z-0 bg-top bg-no-repeat opacity-95"
              style={{
                backgroundImage: `url(${stageBackgroundSrc})`,
                backgroundSize: "min(100%, 1920px) auto",
              }}
              aria-hidden
            />
          ) : null}
          <div className="relative z-10 flex min-h-0 min-w-0 w-full flex-1 flex-col justify-start overflow-visible pt-1 sm:pt-2">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
