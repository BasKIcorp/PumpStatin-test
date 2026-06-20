import type { StrelaAppearance } from "@/lib/strela/appearance";
import { STRELA_SIDEBAR_WIDTH } from "@/lib/strela/cardUi";
import { ImageDropUpload } from "../components/ImageDropUpload";
import { FIGMA } from "../figma/figmaTokens";

const inputClass =
  "w-full rounded border-0 px-2 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#0d99ff]";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] text-[#b3b3b3]">{label}</label>
      {children}
    </div>
  );
}

export function WizardFunnelLayoutPanel({
  profileId,
  appearance,
  onChange,
}: {
  profileId: string;
  appearance: StrelaAppearance;
  onChange: (patch: Partial<StrelaAppearance>) => void;
}) {
  return (
    <div className="space-y-3 border-b border-[#333] pb-4">
      <div className="text-xs font-medium text-white">Оболочка Strela (сайдбар)</div>
      <p className="text-[10px] leading-relaxed text-[#666]">
        Сайдбар не grid-блок — настраивается здесь. Блоки шага (карточки, заголовок) перетаскивайте на
        canvas в режиме «Сетка».
      </p>
      <Field label="Ширина сайдбара (CSS)">
        <input
          className={`${inputClass} font-mono text-xs`}
          style={{ background: FIGMA.inputBg }}
          placeholder={STRELA_SIDEBAR_WIDTH}
          value={appearance.funnel_sidebar_width ?? ""}
          onChange={(e) => onChange({ funnel_sidebar_width: e.target.value || undefined })}
        />
      </Field>
      <Field label="Текст под логотипом">
        <input
          className={inputClass}
          style={{ background: FIGMA.inputBg }}
          value={appearance.sidebar_text ?? ""}
          onChange={(e) => onChange({ sidebar_text: e.target.value || undefined })}
        />
      </Field>
      <Field label="Wordmark (SVG/PNG)">
        <ImageDropUpload
          profileId={profileId}
          value={appearance.funnel_sidebar_wordmark_url}
          onChange={(url) => onChange({ funnel_sidebar_wordmark_url: url })}
          label="Перетащите логотип сайдбара"
        />
        <input
          className={`${inputClass} mt-2 font-mono text-xs`}
          style={{ background: FIGMA.inputBg }}
          placeholder="/attached_assets/..."
          value={appearance.funnel_sidebar_wordmark_url ?? ""}
          onChange={(e) =>
            onChange({ funnel_sidebar_wordmark_url: e.target.value || undefined })
          }
        />
      </Field>
    </div>
  );
}
