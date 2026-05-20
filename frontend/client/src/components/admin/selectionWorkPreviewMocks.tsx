/**
 * Статичное превью блоков этапа «Работа» для редактора макета (WYSIWYG).
 * Визуально совпадает с панелями Home (WORK_DESKTOP_*), без данных и запросов к API.
 */
import React from "react";
import { cn } from "@/lib/utils";
import type { SelectionWorkSlotType } from "@/lib/selectionLayoutCanvas";

const WORK_STAGE_ACCENT =
  "border-l-[3px] border-l-transparent transition-[border-left-color] duration-200 ease-out hover:border-l-[#13347f]";
const PANEL = cn(
  "flex min-h-0 h-full flex-col overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm",
  WORK_STAGE_ACCENT,
);
const CARD_HEAD =
  "selection-work-panel-head shrink-0 cursor-move select-none";

function FakeField() {
  return <div className="h-6 w-full rounded border border-zinc-200 bg-zinc-50/90 shadow-inner" />;
}

function FakeRow({ label }: { label: string }) {
  return (
    <div className="flex min-h-0 items-center gap-1.5">
      <span className="w-[44%] shrink-0 truncate text-[9px] leading-tight text-zinc-500">{label}</span>
      <FakeField />
    </div>
  );
}

function MiniButton({ children, primary }: { children: React.ReactNode; primary?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-7 flex-1 items-center justify-center rounded border text-[9px] font-medium",
        primary
          ? "border-[#13347f] bg-[#13347f] text-white"
          : "border-zinc-300 bg-white text-zinc-800",
      )}
    >
      {children}
    </div>
  );
}

/** Путь кривой для мини-превью графика */
function FakeChartSvg() {
  return (
    <svg className="h-full w-full text-zinc-400" viewBox="0 0 200 120" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgb(59 130 246 / 0.25)" />
          <stop offset="100%" stopColor="rgb(59 130 246 / 0)" />
        </linearGradient>
      </defs>
      <rect x="24" y="8" width="168" height="96" fill="rgb(250 250 250)" stroke="rgb(228 228 231)" strokeWidth="1" rx="4" />
      <path d="M 32 96 L 52 72 L 88 56 L 124 44 L 168 36" fill="none" stroke="rgb(59 130 246)" strokeWidth="2" />
      <path d="M 32 96 L 52 72 L 88 56 L 124 44 L 168 36 V 96 H 32 Z" fill="url(#chGrad)" stroke="none" />
      <line x1="32" y1="36" x2="32" y2="96" stroke="rgb(161 161 170)" strokeWidth="1" />
      <line x1="32" y1="96" x2="176" y2="96" stroke="rgb(161 161 170)" strokeWidth="1" />
    </svg>
  );
}

export type SlotPreviewHeaderProps = Pick<
  React.HTMLAttributes<HTMLDivElement>,
  | "onPointerDown"
  | "onPointerMove"
  | "onPointerUp"
  | "onPointerCancel"
>;

export function SelectionWorkSlotPreview({
  slotType,
  title,
  headerDragProps,
}: {
  slotType: SelectionWorkSlotType;
  title: string;
  headerDragProps?: SlotPreviewHeaderProps;
}) {
  switch (slotType) {
    case "work_pump_search":
      return (
        <div className={PANEL}>
          <div className={CARD_HEAD} {...headerDragProps}>
            {title}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden px-2 pb-2 pt-1.5">
            <FakeRow label="Тип насоса" />
            <FakeRow label="Расход Q (м³/ч)" />
            <FakeRow label="Напор H (м)" />
            <FakeRow label="Мощность N (кВт)" />
            <FakeRow label="DN патрубка" />
            <FakeRow label="Частота" />
            <div className="mt-1 flex shrink-0 gap-2 pt-1">
              <MiniButton>Подобрать</MiniButton>
            </div>
          </div>
        </div>
      );

    case "work_curves":
      return (
        <div className={PANEL}>
          <div className={CARD_HEAD} {...headerDragProps}>
            {title}
          </div>
          <div className="min-h-0 flex-1 overflow-hidden p-1.5">
            <div className="h-[42%] min-h-[48px] rounded border border-zinc-200 bg-white p-1">
              <FakeChartSvg />
            </div>
            <div className="mt-1 h-[42%] min-h-[48px] rounded border border-zinc-200 bg-white p-1">
              <FakeChartSvg />
            </div>
          </div>
        </div>
      );

    case "work_tech_specs":
      return (
        <div className={PANEL}>
          <div className={CARD_HEAD} {...headerDragProps}>
            {title}
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pb-1 pt-1.5">
            <ul className="min-h-0 flex-1 space-y-1 overflow-hidden text-[9px] leading-tight">
              <li className="flex justify-between gap-1 border-b border-zinc-100 pb-0.5">
                <span className="text-zinc-500">Количество насосов</span>
                <span className="shrink-0 font-medium tabular-nums text-zinc-800">2 раб. + 1 рез.</span>
              </li>
              <li className="flex justify-between gap-1 border-b border-zinc-100 pb-0.5">
                <span className="text-zinc-500">Мощность</span>
                <span className="font-mono tabular-nums text-zinc-800">45 кВт</span>
              </li>
              <li className="flex justify-between gap-1 border-b border-zinc-100 pb-0.5">
                <span className="text-zinc-500">Макс. давление</span>
                <span className="text-zinc-800">PN16</span>
              </li>
              <li className="flex justify-between gap-1 border-b border-zinc-100 pb-0.5">
                <span className="text-zinc-500">Масса</span>
                <span className="font-mono tabular-nums text-zinc-800">128 кг</span>
              </li>
            </ul>
            <div className="mt-auto grid shrink-0 grid-cols-2 gap-1 border-t border-zinc-200 pt-1">
              <MiniButton>В ТКП</MiniButton>
              <MiniButton>Тех. лист</MiniButton>
            </div>
          </div>
        </div>
      );

    case "work_station_config":
      return (
        <div className={cn(PANEL, "gap-1")}>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-zinc-300 bg-white shadow-sm">
            <div className={CARD_HEAD} {...headerDragProps}>
              {title}
            </div>
            <div className="space-y-1 overflow-hidden px-2 py-1.5">
              <FakeRow label="Тип станции" />
              <FakeRow label="Управление" />
              <FakeRow label="Исполнение" />
              <div className="h-10 rounded border border-dashed border-zinc-200 bg-zinc-50/60" />
            </div>
          </div>
          <div className="flex shrink-0 gap-2 rounded-lg border border-zinc-300 bg-zinc-50/80 px-2 py-1.5">
            <MiniButton>Сбросить</MiniButton>
            <MiniButton primary>Подобрать</MiniButton>
          </div>
        </div>
      );

    case "work_pumps_list":
      return (
        <div className={PANEL}>
          <div className={CARD_HEAD} {...headerDragProps}>
            {title}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden p-1.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  "shrink-0 rounded-md border px-2 py-1.5",
                  i === 1 ? "border-[#13347f] bg-blue-50/40 ring-1 ring-[#13347f]/25" : "border-zinc-200 bg-white",
                )}
              >
                <div className="text-[10px] font-semibold text-zinc-800">BPS‑X · модель #{i}</div>
                <div className="mt-0.5 text-[9px] text-zinc-500">50 м³/ч · 42 м · одновинтовой</div>
              </div>
            ))}
          </div>
        </div>
      );

    case "work_station_results":
      return (
        <div className={PANEL}>
          <div className={CARD_HEAD} {...headerDragProps}>
            {title}
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-hidden px-2 py-1.5 text-[9px]">
            <div className="rounded border border-zinc-200 bg-zinc-50/80 px-2 py-1 font-semibold text-zinc-700">
              Результат расчёта станции
            </div>
            <div className="flex justify-between border-b border-zinc-100 py-0.5">
              <span className="text-zinc-500">Наименование</span>
              <span className="truncate font-medium text-zinc-900">Насосная станция …</span>
            </div>
            <div className="flex justify-between border-b border-zinc-100 py-0.5">
              <span className="text-zinc-500">Стоимость</span>
              <span className="font-mono font-medium tabular-nums text-zinc-900">по запросу</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-zinc-500">Габариты</span>
              <span className="tabular-nums text-zinc-800">1200×800×1600 мм</span>
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className={cn(PANEL, "items-center justify-center p-2 text-[10px] text-zinc-400")}>
          Неизвестный блок
        </div>
      );
  }
}
