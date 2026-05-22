import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pump } from "@/lib/types";

function connectionLabel(pump: Pump): string {
  const raw = pump.naimenovanie ?? "";
  const dnMatches = raw.match(/\bDN\s*(\d+)\b/gi) ?? [];
  if (dnMatches.length >= 2) {
    return `${dnMatches[0].toUpperCase().replace(/\s/g, "")}/${dnMatches[1].toUpperCase().replace(/\s/g, "")}`;
  }
  if (dnMatches.length === 1) {
    const u = dnMatches[0].toUpperCase().replace(/\s/g, "");
    return `${u}/${u}`;
  }
  return "—";
}

function fmtPricePlaceholder(): string {
  return "—";
}

interface PumpsListProps {
  pumps: Pump[];
  isLoading: boolean;
  selectedPumpId: number | null;
  onSelectPump: (id: number) => void;
  hasSearched?: boolean;
  /** Таблица в стиле макета Simpel */
  variant?: "default" | "simpel";
  /**
   * Родитель задаёт высоту (flex/grid); таблица заполняет остаток и скроллится внутри.
   * Для десктопной сетки подбора на один экран.
   */
  fillAvailableHeight?: boolean;
}

const PumpsList: React.FC<PumpsListProps> = ({ 
  pumps, 
  isLoading, 
  selectedPumpId, 
  onSelectPump,
  hasSearched = false,
  variant = "default",
  fillAvailableHeight = false,
}) => {
  const headClass =
    variant === "simpel"
      ? "flex items-center justify-between border-b border-zinc-200 bg-[var(--funnel-panel-header-bg)] px-3 py-1.5"
      : "p-3 sm:p-4 border-b border-border bg-gradient-to-r from-secondary to-secondary/50 rounded-t-lg flex items-center justify-between";

  const wrapClass =
    variant === "simpel"
      ? fillAvailableHeight
        ? "flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-[var(--funnel-surface)]"
        : "flex h-full min-h-[120px] w-full min-w-0 flex-col overflow-hidden bg-[var(--funnel-surface)]"
      : "h-full";

  const idleStateWrapClass =
    fillAvailableHeight
      ? "flex flex-1 min-h-[100px] flex-col items-center justify-center p-4 text-center sm:p-6"
      : "flex flex-col items-center justify-center h-48 sm:h-64 text-center p-4 sm:p-6";

  const tableScrollClass =
    variant === "simpel"
      ? fillAvailableHeight
        ? "min-h-0 flex-1 overflow-auto"
        : "max-h-[min(300px,42vh)] min-h-[100px] flex-1 overflow-auto"
      : "overflow-auto max-h-[180px] sm:max-h-[240px] md:max-h-[320px]";

  return (
    <div className={wrapClass}>
      <div className={headClass}>
        <h2
          className={`font-semibold text-foreground ${
            variant === "simpel"
              ? "text-[11px] font-semibold uppercase tracking-wide text-[var(--funnel-panel-header-text)]"
              : "text-sm sm:text-base lg:text-lg"
          }`}
        >
          {variant === "simpel" ? "Результаты подбора" : "Подходящие насосы"}
        </h2>
        
        {/* Small badge showing count on mobile */}
        {!isLoading && pumps.length > 0 && (
          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium">
            {pumps.length}
          </span>
        )}
      </div>
      
      {isLoading ? (
        <div className={fillAvailableHeight ? "flex flex-1 min-h-[120px] items-center justify-center" : "flex items-center justify-center h-48 sm:h-64"}>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : !hasSearched ? (
        <div className={idleStateWrapClass}>
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground mb-3">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <p className="text-muted-foreground text-sm">
            Нажмите «Подобрать»<br />для поиска подходящих насосов
          </p>
        </div>
      ) : pumps.length === 0 ? (
        <div className={idleStateWrapClass}>
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground mb-3">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          <p className="text-muted-foreground text-sm">
            Нет насосов, удовлетворяющих<br />заданным параметрам
          </p>
        </div>
      ) : (
        <div className={tableScrollClass}>
          <Table id="pump-table" aria-label={variant === "simpel" ? "Результаты подбора насосов" : "Подходящие насосы"}>
            <TableHeader
              className={
                variant === "simpel"
                  ? "sticky top-0 z-10 border-b border-zinc-200 bg-[var(--funnel-panel-header-bg)] backdrop-blur-sm"
                  : "sticky top-0 z-10 bg-secondary/50 backdrop-blur-sm"
              }
            >
              <TableRow>
                <TableHead
                  scope="col"
                  className={
                    variant === "simpel"
                      ? "text-xs font-semibold text-[var(--funnel-panel-header-text)]"
                      : "text-xs font-semibold text-zinc-600"
                  }
                >
                  Наименование
                </TableHead>
                {variant === "simpel" && (
                  <>
                    <TableHead scope="col" className="whitespace-nowrap text-xs font-semibold text-[var(--funnel-panel-header-text)]">
                      Ном. мощн., кВт
                    </TableHead>
                    <TableHead scope="col" className="whitespace-nowrap text-xs font-semibold text-[var(--funnel-panel-header-text)]">
                      Подключение
                    </TableHead>
                    <TableHead
                      scope="col"
                      className="whitespace-nowrap text-right text-xs font-semibold text-[var(--funnel-panel-header-text)]"
                    >
                      Стоимость с НДС, ₽
                    </TableHead>
                  </>
                )}
                {variant === "default" && (
                  <TableHead scope="col" className="w-16 text-right text-xs font-semibold sm:w-20 sm:text-sm" />
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pumps.map((pump, idx) => (
                <TableRow
                  key={pump.id}
                  tabIndex={0}
                  aria-selected={pump.id === selectedPumpId}
                  className={`cursor-pointer transition-colors focus-visible:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--funnel-primary)] ${
                    pump.id === selectedPumpId
                      ? variant === "simpel"
                        ? "bg-[var(--funnel-table-row-selected-bg)]"
                        : "bg-primary/10"
                      : variant === "simpel"
                        ? idx % 2 === 1
                          ? "bg-[var(--funnel-table-row-alt-bg)] hover:opacity-95"
                          : "bg-[var(--funnel-surface)] hover:bg-black/[0.03]"
                        : "hover:bg-secondary/50"
                  }`}
                  onClick={() => onSelectPump(pump.id)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" && e.key !== " ") return;
                    e.preventDefault();
                    onSelectPump(pump.id);
                  }}
                >
                  <TableCell className="py-1.5 sm:py-2">
                    {variant === "simpel" ? (
                      <span className="text-xs leading-snug text-[var(--funnel-text)]">{pump.naimenovanie}</span>
                    ) : (
                      <div className="flex items-center">
                        <div
                          className={`w-1 sm:w-2 h-6 sm:h-8 rounded-full mr-2 sm:mr-3 shrink-0 ${pump.id === selectedPumpId ? "bg-primary" : "bg-muted"}`}
                        ></div>
                        <div className="truncate max-w-[110px] sm:max-w-full min-w-0">
                          <p className="font-medium text-xs sm:text-sm truncate text-black">{pump.naimenovanie}</p>
                          {pump.id === selectedPumpId && (
                            <Badge variant="secondary" className="mt-1 text-[10px] px-1 py-0">
                              Выбран
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </TableCell>
                {variant === "simpel" && (
                    <>
                      <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums text-zinc-900 sm:text-sm">
                        {pump.moschnost != null ? pump.moschnost.toLocaleString("ru-RU", { maximumFractionDigits: 2 }) : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-zinc-900 sm:text-sm">{connectionLabel(pump)}</TableCell>
                      <TableCell className="whitespace-nowrap text-right font-mono text-xs tabular-nums text-zinc-900 sm:text-sm">
                        {fmtPricePlaceholder()}
                      </TableCell>
                    </>
                  )}
                  {variant === "default" && (
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="text-xs sm:text-sm font-medium"></div>
                      <div className="text-xs sm:text-sm text-muted-foreground"></div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {variant === "default" && selectedPumpId && !isLoading && pumps.length > 0 && (
        <div className="p-3 m-3 border border-accent/20 rounded-md bg-secondary/30">
          <div className="flex items-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <div>
              <p className="text-xs text-muted-foreground">Выбранный насос</p>
              <p className="text-sm font-medium">{pumps.find(p => p.id === selectedPumpId)?.naimenovanie}</p>
            </div>
          </div>
          
          {/* Отображение значений parabola_intersection */}
          {(() => {
            const selectedPump = pumps.find(p => p.id === selectedPumpId);
            if (!selectedPump?.parabola_intersection) return null;
            
            return (
              <div className="mt-2 space-y-1 text-xs">
                <div>
                  <span className="text-muted-foreground">Расход:</span>
                  <span className="ml-1 font-medium">{selectedPump.parabola_intersection.Q.toFixed(2)} м³/ч</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Напор:</span>
                  <span className="ml-1 font-medium">{selectedPump.parabola_intersection.H.toFixed(2)} м</span>
                </div>
                
                {selectedPump.npsh_at_parabola !== null && selectedPump.npsh_at_parabola !== undefined && (
                  <div>
                    <span className="text-muted-foreground">NPSH:</span>
                    <span className="ml-1 font-medium">{selectedPump.npsh_at_parabola.toFixed(2)} м</span>
                  </div>
                )}
                
                {selectedPump.p2_at_parabola !== null && selectedPump.p2_at_parabola !== undefined && (
                  <div>
                    <span className="text-muted-foreground">Мощность на валу P2:</span>
                    <span className="ml-1 font-medium">{selectedPump.p2_at_parabola.toFixed(2)} кВт</span>
                  </div>
                )}
                
                {selectedPump.moschnost !== null && selectedPump.moschnost !== undefined && (
                  <div>
                    <span className="text-muted-foreground">Ном. мощность:</span>
                    <span className="ml-1 font-medium">{selectedPump.moschnost.toFixed(2)} кВт</span>
                  </div>
                )}
                
                {selectedPump.eta_at_parabola !== null && selectedPump.eta_at_parabola !== undefined && (
                  <div>
                    <span className="text-muted-foreground">КПД:</span>
                    <span className="ml-1 font-medium">{selectedPump.eta_at_parabola.toFixed(2)} %</span>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default PumpsList;
