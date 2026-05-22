import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  SelectionHorizontalCardStrip,
  SelectionMockupCard,
  type SelectionCardImageHoverVariant,
} from "@/components/layout/SelectionFlowLayout";

const HOVER_VARIANTS: SelectionCardImageHoverVariant[] = ["zoomSubtle", "zoom", "lift"];

const PUMP_FALLBACK_IMAGES: Record<string, string> = {
  COMOS: "/assets/pump-types/COMOS.png",
  CIVOS: "/assets/pump-types/CIVOS.png",
  VMIP: "/assets/pump-types/VMIP.png",
  HMIP: "/assets/pump-types/HMIP.png",
};

function pumpTypeImageSrc(apiUrl: string | null | undefined, code: string): string {
  const fb = PUMP_FALLBACK_IMAGES[code] || "";
  const raw = apiUrl?.trim();
  if (!raw) return fb;
  try {
    const u = new URL(raw, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    if (u.hostname === "127.0.0.1" || u.hostname === "localhost") {
      return `${u.pathname}${u.search}`;
    }
    return raw;
  } catch {
    return raw;
  }
}

export type PumpTypeInfo = {
  id: number;
  code: string;
  name: string;
  full_name: string;
  description: string;
  features: string[];
  image_url: string | null;
  sort_order: number;
};

interface PumpTypeSelectorProps {
  onSelect: (code: string) => void;
}

const PumpTypeSelector: React.FC<PumpTypeSelectorProps> = ({ onSelect }) => {
  const [types, setTypes] = useState<PumpTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get<PumpTypeInfo[]>("/api/pump-types")
      .then((r) => setTypes(r.data))
      .catch(() => {
        setTypes([
          {
            id: 1,
            code: "COMOS",
            sort_order: 1,
            name: "Консольно-моноблочный насос",
            full_name: "Консольно-моноблочный насос COMOS",
            description: "",
            features: [
              "Для систем отопления, вентиляции, холодоснабжения, пожаротушения, технологии",
              "Корпус двигателя, проточная часть, рабочее колесо — чугун HT200 / нерж. сталь AISI 304; вал — нерж. сталь AISI 304",
              "Оптимальное решение для перекачивания гликолевых растворов",
            ],
            image_url: null,
          },
          {
            id: 2,
            code: "CIVOS",
            sort_order: 2,
            name: "Вертикальный одноступенчатый насос типа «in-line»",
            full_name: "Вертикальный одноступенчатый насос CIVOS типа «in-line»",
            description: "",
            features: [
              "Для систем отопления, вентиляции, холодоснабжения, пожаротушения, технологии",
              "Корпус двигателя, проточная часть, рабочее колесо — чугун HT200; вал — нерж. сталь AISI 304",
              "Оптимальное решение для перекачивания гликолевых растворов",
            ],
            image_url: null,
          },
          {
            id: 3,
            code: "VMIP",
            sort_order: 3,
            name: "Вертикальный многоступенчатый центробежный насос",
            full_name: "Вертикальный многоступенчатый центробежный насос VMIP",
            description: "",
            features: [
              "Для систем водоснабжения, ГВС, пожаротушения, технологии",
              "Корпус двигателя, основание насоса — чугун; рабочие камеры, рабочие колеса, вал — нерж. сталь AISI 304",
              "Класс эффективности двигателя: IE3",
            ],
            image_url: null,
          },
          {
            id: 4,
            code: "HMIP",
            sort_order: 4,
            name: "Горизонтальный многоступенчатый центробежный насос",
            full_name: "Горизонтальный многоступенчатый центробежный насос HMIP",
            description: "",
            features: [
              "Для систем водоснабжения, ГВС, пожаротушения, технологии",
              "Корпус двигателя, основание насоса — чугун; проточная, рабочие колеса, вал — нерж. сталь AISI 304",
              "Класс эффективности двигателя: IE2 / IE3",
            ],
            image_url: null,
          },
        ]);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[min(50dvh,20rem)] flex-1 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#13347f]" />
      </div>
    );
  }

  return (
    <SelectionHorizontalCardStrip>
      {types.map((t, i) => {
        const imgSrc = pumpTypeImageSrc(t.image_url, t.code);
        return (
          <SelectionMockupCard
            key={t.code}
            imageHoverVariant={HOVER_VARIANTS[i % HOVER_VARIANTS.length]}
            image={
              imgSrc ? (
                <img
                  src={imgSrc}
                  alt=""
                  className="max-h-full max-w-full object-contain"
                  loading="lazy"
                  onError={(e) => {
                    const el = e.currentTarget;
                    const fb = PUMP_FALLBACK_IMAGES[t.code];
                    if (!fb || el.dataset.fallback === "1") return;
                    el.dataset.fallback = "1";
                    el.src = fb;
                  }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-slate-400">
                  {t.code}
                </div>
              )
            }
            identifier={t.code}
            identifierUppercase
            boxTitle={t.name}
            bullets={t.features || []}
            onClick={() => onSelect(t.code)}
          />
        );
      })}
    </SelectionHorizontalCardStrip>
  );
};

export default PumpTypeSelector;
