import React from "react";
import {
  SelectionHorizontalCardStrip,
  SelectionMockupCard,
  type SelectionCardImageHoverVariant,
} from "@/components/layout/SelectionFlowLayout";

const HOVER_VARIANTS: SelectionCardImageHoverVariant[] = ["lift", "zoomSubtle", "zoom"];

interface SubtypeCard {
  id: "хоз-пит" | "пнс";
  label: string;
  bullets: string[];
}

const SUBTYPES: SubtypeCard[] = [
  {
    id: "хоз-пит",
    label: "Хозяйственно-питьевая",
    bullets: ["Водоснабжение, повышение давления в тупиковой сети."],
  },
  {
    id: "пнс",
    label: "Пожарная насосная станция (ПНС)",
    bullets: ["Пожаротушение: ВПВ, дренчерная, спринклерная."],
  },
];

interface Props {
  onSelect: (st: "хоз-пит" | "пнс") => void;
}

export const PumpStationSubtypeSelector: React.FC<Props> = ({ onSelect }) => {
  return (
    <SelectionHorizontalCardStrip>
      {SUBTYPES.map((st, i) => (
        <SelectionMockupCard
          key={st.id}
          imageHoverVariant={HOVER_VARIANTS[i % HOVER_VARIANTS.length]}
          image={<div className="h-full w-full bg-[var(--funnel-card-media-bg)]" aria-hidden />}
          identifier={st.label}
          boxTitle={null}
          bullets={st.bullets}
          onClick={() => onSelect(st.id)}
        />
      ))}
    </SelectionHorizontalCardStrip>
  );
};
