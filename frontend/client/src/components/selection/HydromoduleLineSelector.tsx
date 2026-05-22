import React from "react";
import type { HydromoduleLineId } from "@/lib/selectionRoute";
import { HYDROMODULE_LINE_LABELS, HYDROMODULE_SERIES_ORDER } from "@/lib/selectionRoute";

const HM_CARD_IMG_FALLBACK =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320"><rect fill="#eff0f9" width="100%" height="100%"/></svg>',
  );
import {
  SelectionHorizontalCardStrip,
  SelectionMockupCard,
  type SelectionCardImageHoverVariant,
} from "@/components/layout/SelectionFlowLayout";

const HOVER_VARIANTS: SelectionCardImageHoverVariant[] = ["zoomSubtle", "zoom", "lift"];
import { strelaHmCardImage } from "@/lib/figmaStrelaHmCardAssets";

const LINES: { id: HydromoduleLineId; bullets: string[] }[] = [
  {
    id: "bps-c-pro",
    bullets: [
      "Автоматический и ручной режимы работы",
      "Шкаф управления с сенсорным контроллером и встроенной диспетчеризацией",
      "Защита от «сухого хода» по датчику давления",
      "Максимальное количество насосов: 6 шт.",
      "Максимальная мощность используемых насосов: 130 кВт.",
      "Широкий спектр опционального исполнения",
    ],
  },
  {
    id: "bps-c-lite",
    bullets: [
      "Автоматический и ручной режимы работы",
      "Шкаф управления с сенсорным экраном управления и ПЧ по кол-ву насосов",
      "Защита от «сухого хода» по датчику давления",
      "Максимальное количество насосов: 3 шт.",
      "Максимальная мощность используемых насосов: 22 кВт.",
    ],
  },
  {
    id: "bps-c-e",
    bullets: [
      "Автоматический режим работы",
      "Интеллектуальные частотные преобразователи со встроенной диспетчеризацией по кол-ву насосов",
      "Защита от «сухого хода» по реле давления",
      "Максимальное количество насосов: 3 шт.",
      "Максимальная мощность используемых насосов: 18,5 кВт.",
    ],
  },
  {
    id: "bps-c-mini",
    bullets: [
      "Автоматический и ручной режимы работы",
      "Шкаф управления со встроенной диспетчеризацией, сенсорным экраном управления и ПЧ по кол-ву насосов",
      "Защита от «сухого хода» по датчику давления",
      "Максимальное количество насосов: 2 шт.",
      "Для моноблочных чиллеров мощность холодоснабжения: 66, 130, 150, 260 кВт.",
    ],
  },
  {
    id: "bps-c-j",
    bullets: [
      "Автоматический и ручной режимы работы",
      "Шкаф управления со встроенной диспетчеризацией, сенсорным контроллером",
      "Защита от «сухого хода» по реле протока",
    ],
  },
  {
    id: "bps-c-huynya",
    bullets: [
      "Автоматический и ручной режимы работы",
      "Шкаф управления со встроенной диспетчеризацией",
      "Защита от «сухого хода» по датчику давления",
    ],
  },
];

interface Props {
  onSelect: (id: HydromoduleLineId) => void;
  /** Абсолютные URL из /api/appearance (hydromodule_card_urls), приоритет над статикой и Figma */
  cardImageUrls?: Partial<Record<HydromoduleLineId, string | null>>;
}

const LINES_BY_ID = new Map(LINES.map((line) => [line.id, line]));

export const HydromoduleLineSelector: React.FC<Props> = ({ onSelect, cardImageUrls }) => {
  const seriesLines = HYDROMODULE_SERIES_ORDER.map((id) => LINES_BY_ID.get(id)).filter(
    (line): line is (typeof LINES)[number] => line != null,
  );

  return (
    <SelectionHorizontalCardStrip>
      {seriesLines.map((line, i) => (
        <SelectionMockupCard
          key={line.id}
          imageHoverVariant={HOVER_VARIANTS[i % HOVER_VARIANTS.length]}
          image={
            <img
              src={strelaHmCardImage(line.id, cardImageUrls?.[line.id])}
              alt=""
              className="max-h-full max-w-full object-contain"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = HM_CARD_IMG_FALLBACK;
              }}
            />
          }
          identifier={HYDROMODULE_LINE_LABELS[line.id]}
          boxTitle={null}
          bullets={line.bullets}
          onClick={() => onSelect(line.id)}
        />
      ))}
    </SelectionHorizontalCardStrip>
  );
};
