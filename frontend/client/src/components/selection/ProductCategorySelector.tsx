import React from "react";
import type { ProductCategory } from "@/lib/selectionRoute";
import {
  SelectionHorizontalCardStrip,
  SelectionMockupCard,
  useSelectionCardUi,
  type SelectionCardImageHoverVariant,
} from "@/components/layout/SelectionFlowLayout";

export interface ProductCategorySelectorProps {
  onSelect: (c: ProductCategory) => void;
  /** Только администраторы видят активную карточку «Насосы Simpel». */
  allowSimpelPumps?: boolean;
  /** Блоки столбцом на всю ширину (настройка из админки) */
  fullWidthLayout?: boolean;
}

interface CategoryCard {
  category: ProductCategory | null;
  label: string;
  description: string;
  disabled?: boolean;
}

const CATEGORIES: CategoryCard[] = [
  {
    category: "hydromodule",
    label: "Гидромодули",
    description:
      "Для закрытых систем вентиляции и кондиционирования. Циркуляция теплоносителя между чиллером и местными теплообменниками в схемах «чиллер — фанкойл».",
  },
  {
    category: "pump_unit",
    label: "Насосные установки",
    description:
      "Перекачка и повышение давления воды в системах хозяйственно-питьевого водоснабжения и пожаротушения жилых, административных и производственных зданий.",
  },
  {
    category: null,
    label: "АУПД и АУПДЗ",
    description: "В разработке",
    disabled: true,
  },
  {
    category: "simpel_pumps",
    label: "Насосы Simpel",
    description: "Подбор серийных насосов COMOS, CIVOS, VMIP, HMIP по параметрам.",
  },
];

const HOVER_VARIANTS: SelectionCardImageHoverVariant[] = ["zoom", "zoomSubtle", "lift"];

const HYDROMODULE_CATEGORY_IMAGE = "/selection-assets/hydromodule-category.png";
const PUMP_UNIT_CATEGORY_IMAGE = "/selection-assets/pump-unit-category.png";

export const ProductCategorySelector: React.FC<ProductCategorySelectorProps> = ({
  onSelect,
  allowSimpelPumps = false,
  fullWidthLayout = false,
}) => {
  const { stripGapClass } = useSelectionCardUi();

  const cards = CATEGORIES.map((c, i) => {
    const simpelLocked = c.category === "simpel_pumps" && !allowSimpelPumps;
    const disabled = Boolean(c.disabled || !c.category || simpelLocked);
    return (
      <SelectionMockupCard
        key={c.label}
        fullWidth={fullWidthLayout}
        image={
          c.category === "hydromodule" ? (
            <img
              src={HYDROMODULE_CATEGORY_IMAGE}
              alt=""
              className="max-h-full max-w-full object-contain"
              loading="lazy"
            />
          ) : c.category === "pump_unit" ? (
            <img
              src={PUMP_UNIT_CATEGORY_IMAGE}
              alt=""
              className="max-h-full max-w-full object-contain"
              loading="lazy"
            />
          ) : (
            <div className="h-full w-full bg-[var(--funnel-card-media-bg)]" aria-hidden />
          )
        }
        identifier={c.label}
        boxTitle={null}
        bullets={[c.description]}
        disabled={disabled}
        imageHoverVariant={HOVER_VARIANTS[i % HOVER_VARIANTS.length]}
        onClick={
          c.category && !c.disabled && !simpelLocked ? () => onSelect(c.category!) : undefined
        }
      />
    );
  });

  if (fullWidthLayout) {
    return (
      <div
        className={`flex min-h-0 w-full flex-1 flex-col items-stretch justify-start overflow-auto px-2 py-2 sm:px-4 sm:py-3 ${stripGapClass}`}
      >
        {cards}
      </div>
    );
  }

  return <SelectionHorizontalCardStrip>{cards}</SelectionHorizontalCardStrip>;
};
