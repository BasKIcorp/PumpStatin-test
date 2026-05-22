import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  SelectionHorizontalCardStrip,
  SelectionMockupCard,
  type SelectionCardImageHoverVariant,
} from "@/components/layout/SelectionFlowLayout";

const HOVER_VARIANTS: SelectionCardImageHoverVariant[] = ["zoom", "zoomSubtle", "lift"];

export interface PumpUnitLineOptionDTO {
  code: string;
  label: string;
  bullets: string[];
  sort_order?: number;
}

const FALLBACK_LINES: PumpUnitLineOptionDTO[] = [
  {
    code: "bps-w",
    label: "BPS-W",
    bullets: [
      "Установки повышения давления для водоснабжения и пожаротушения.",
      "Далее — выбор типа сети (хоз-пит / ПНС).",
    ],
  },
];

async function fetchPumpUnitLines(): Promise<PumpUnitLineOptionDTO[]> {
  const { data } = await axios.get<PumpUnitLineOptionDTO[]>("/api/pump-unit-lines");
  if (Array.isArray(data) && data.length > 0) return data;
  return FALLBACK_LINES;
}

interface Props {
  onSelect: (line: { code: string; label: string }) => void;
}

export const PumpUnitLineSelector: React.FC<Props> = ({ onSelect }) => {
  const { data: lines, isPending, isError } = useQuery({
    queryKey: ["pump_unit_lines"],
    queryFn: fetchPumpUnitLines,
    staleTime: 5 * 60 * 1000,
  });

  const displayLines = isError || !lines?.length ? FALLBACK_LINES : lines;

  if (isPending) {
    return (
      <div className="flex min-h-[120px] items-center justify-center text-sm text-muted-foreground">
        Загрузка линеек…
      </div>
    );
  }

  return (
    <SelectionHorizontalCardStrip>
      {displayLines.map((line, i) => (
        <SelectionMockupCard
          key={line.code}
          imageHoverVariant={HOVER_VARIANTS[i % HOVER_VARIANTS.length]}
          image={<div className="h-full w-full bg-[var(--funnel-card-media-bg)]" aria-hidden />}
          identifier={line.label}
          boxTitle={null}
          bullets={Array.isArray(line.bullets) && line.bullets.length > 0 ? line.bullets : ["—"]}
          onClick={() => onSelect({ code: line.code, label: line.label })}
        />
      ))}
    </SelectionHorizontalCardStrip>
  );
};
