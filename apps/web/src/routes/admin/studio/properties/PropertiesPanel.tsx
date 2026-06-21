import type { BlockConfig, BlockGridLayout } from "@pumpstation/contracts";
import { getNested } from "@/routes/admin/studio/canvas/studioPropUtils";
import { getSchema, getBlockSchemas, type BlockFieldSchema } from "./blockSchema";
import { ImageDropUpload } from "../components/ImageDropUpload";
import { FIGMA } from "../figma/figmaTokens";
import {
  clampCropInset,
  emptyCrop,
  hasCrop,
  layoutRotation,
  snapRotation,
} from "@/lib/blockTransform";

const inputClass =
  "w-full rounded border-0 px-2 py-1.5 text-sm text-white outline-none focus:ring-1 focus:ring-[#0d99ff]";

function FieldEditor({
  field,
  value,
  onChange,
}: {
  field: BlockFieldSchema;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const val = value ?? field.defaultValue ?? "";
  const bg = { background: FIGMA.inputBg };

  switch (field.type) {
    case "color":
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            className="h-7 w-10 cursor-pointer rounded border-0"
            style={bg}
            value={String(val)}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            className={`${inputClass} font-mono text-xs`}
            style={bg}
            value={String(val)}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      );
    case "number":
      return (
        <input
          type="number"
          className={inputClass}
          style={bg}
          value={val as number}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      );
    case "textarea":
    case "json":
      return (
        <textarea
          className={`${inputClass} min-h-[80px] font-mono text-xs`}
          style={bg}
          value={field.type === "json" ? JSON.stringify(val, null, 2) : String(val)}
          onChange={(e) => {
            if (field.type === "json") {
              try {
                onChange(JSON.parse(e.target.value));
              } catch {
                /* ignore */
              }
            } else {
              onChange(e.target.value);
            }
          }}
        />
      );
    case "checkbox":
      return (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-[#555]"
          checked={Boolean(val)}
          onChange={(e) => onChange(e.target.checked)}
        />
      );
    case "select":
      return (
        <select
          className={inputClass}
          style={bg}
          value={String(val)}
          onChange={(e) => onChange(e.target.value)}
          disabled={field.key === "_dataStub"}
        >
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    default:
      return (
        <input
          className={inputClass}
          style={bg}
          value={String(val)}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          readOnly={field.key === "_dataStub"}
        />
      );
  }
}

const SECTION_LABELS: Record<string, string> = {
  style: "Стили",
  content: "Контент",
  behavior: "Поведение",
  data: "Данные",
};

/** Поля URL изображений wizard-блоков — ImageDropUpload + ручной ввод URL. */
function wizardImageUploadField(
  blockType: string,
  fieldKey: string,
): { dropLabel: string } | null {
  if (blockType === "wizard/funnel-sidebar" && fieldKey === "wordmarkUrl") {
    return { dropLabel: "Перетащите логотип сайдбара" };
  }
  if (blockType === "wizard/selection-work-header" && fieldKey === "logoUrl") {
    return { dropLabel: "Перетащите логотип шапки" };
  }
  if (blockType === "wizard/selection-card" && fieldKey === "image") {
    return { dropLabel: "Перетащите изображение карточки" };
  }
  return null;
}

function TransformSection({
  block,
  onChangeLayout,
}: {
  block: BlockConfig;
  onChangeLayout: (layout: BlockGridLayout) => void;
}) {
  const layout = block.layout!;
  const rotation = layoutRotation(layout);
  const crop = layout.crop ?? emptyCrop();

  const patchLayout = (patch: Partial<BlockGridLayout>) => {
    onChangeLayout({ ...layout, ...patch });
  };

  const setRotation = (deg: number) => {
    patchLayout({ rotation: snapRotation(deg) });
  };

  const setCropSide = (side: keyof typeof crop, value: number) => {
    const next = { ...crop, [side]: clampCropInset(value) };
    patchLayout({ crop: hasCrop(next) ? next : null });
  };

  const chipClass = (active: boolean) =>
    `rounded px-2 py-1 text-[10px] ${active ? "bg-[#0d99ff] text-white" : "bg-[#333] text-[#ccc] hover:bg-[#444]"}`;

  return (
    <div>
      <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#888]">
        Трансформация
      </h4>
      <div className="space-y-3">
        <div>
          <span className="mb-1 block text-[10px] text-[#888]">Поворот</span>
          <div className="flex flex-wrap gap-1">
            {[0, -90, 90, 180].map((deg) => (
              <button
                key={deg}
                type="button"
                className={chipClass(rotation === deg || (deg === 0 && rotation === 360))}
                onClick={() => setRotation(deg)}
              >
                {deg}°
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[10px] text-[#888]">Угол (°)</label>
          <input
            type="number"
            className={`${inputClass} text-xs`}
            style={{ background: FIGMA.inputBg }}
            value={rotation}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n)) patchLayout({ rotation: snapRotation(n) });
            }}
          />
        </div>
        {block.type === "wizard/funnel-sidebar" ? (
          <button
            type="button"
            className="w-full rounded bg-[#333] px-2 py-1.5 text-[10px] text-[#ccc] hover:bg-[#444]"
            onClick={() => patchLayout({ rotation: -90, crop: null })}
          >
            Пресет: боковая панель (−90°)
          </button>
        ) : null}
        <button
          type="button"
          className="text-[10px] text-[#0d99ff] hover:underline"
          onClick={() => patchLayout({ rotation: 0 })}
        >
          Сбросить поворот
        </button>

        <div className="border-t border-[#333] pt-3">
          <span className="mb-2 block text-[10px] text-[#888]">Обрезка (inset, %)</span>
          <div className="grid grid-cols-2 gap-2">
            {(["top", "right", "bottom", "left"] as const).map((side) => (
              <div key={side}>
                <label className="mb-1 block text-[10px] uppercase text-[#666]">{side}</label>
                <input
                  type="number"
                  min={0}
                  max={49}
                  className={`${inputClass} text-xs`}
                  style={{ background: FIGMA.inputBg }}
                  value={crop[side]}
                  onChange={(e) => setCropSide(side, Number(e.target.value))}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-2 text-[10px] text-[#0d99ff] hover:underline"
            onClick={() => patchLayout({ crop: null })}
          >
            Сбросить обрезку
          </button>
        </div>
      </div>
    </div>
  );
}

export function PropertiesPanel({
  block,
  onChangeType,
  onChangeProp,
  onChangeBinding,
  onChangeLayout,
  gridCols = 12,
  profileId,
}: {
  block: BlockConfig;
  onChangeType: (type: string) => void;
  onChangeProp: (key: string, value: unknown) => void;
  onChangeBinding?: (key: string, value: unknown) => void;
  onChangeLayout?: (layout: BlockGridLayout) => void;
  gridCols?: number;
  profileId?: string;
}) {
  const schema = getSchema(block.type);
  const allTypes = getBlockSchemas();
  if (!schema) {
    return <div className="text-xs text-[#888]">Нет схемы для «{block.type}»</div>;
  }

  const sections: Array<"style" | "content" | "behavior" | "data"> = [
    "style",
    "content",
    "behavior",
    "data",
  ];

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 text-xs font-medium text-white">
          {schema.label}
        </div>
        <select
          className={`${inputClass} text-xs`}
          style={{ background: FIGMA.inputBg }}
          value={block.type}
          onChange={(e) => onChangeType(e.target.value)}
        >
          {allTypes.map((t) => (
            <option key={t.type} value={t.type}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {onChangeLayout && block.layout ? (
        <div>
          <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#888]">
            Сетка
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {(["x", "y", "w", "h"] as const).map((key) => (
              <div key={key}>
                <label className="mb-1 block text-[10px] uppercase text-[#888]">{key}</label>
                <input
                  type="number"
                  min={key === "w" || key === "h" ? 1 : 0}
                  max={key === "x" || key === "w" ? gridCols : undefined}
                  className={`${inputClass} text-xs`}
                  style={{ background: FIGMA.inputBg }}
                  value={block.layout![key]}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (!Number.isFinite(n)) return;
                    onChangeLayout({ ...block.layout!, [key]: n });
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {onChangeLayout && block.layout ? (
        <TransformSection block={block} onChangeLayout={onChangeLayout} />
      ) : null}

      {sections.map((section) => {
        const fields = schema.fields.filter((f: BlockFieldSchema) => f.section === section);
        if (fields.length === 0) return null;
        return (
          <div key={section}>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#888]">
              {SECTION_LABELS[section]}
            </h4>
            <div className="space-y-3">
              {fields.map((field: BlockFieldSchema) => {
                const bindingField = field.source === "bindings";
                const value = bindingField
                  ? getNested((block.bindings ?? {}) as Record<string, unknown>, field.key)
                  : getNested(block.props, field.key);
                const imageUpload = profileId
                  ? wizardImageUploadField(block.type, field.key)
                  : null;
                return (
                  <div key={field.key}>
                    <label className="mb-1 block text-[11px] text-[#b3b3b3]">{field.label}</label>
                    {imageUpload && profileId ? (
                      <>
                        <ImageDropUpload
                          profileId={profileId}
                          value={value as string | undefined}
                          onChange={(url) => onChangeProp(field.key, url || undefined)}
                          label={imageUpload.dropLabel}
                        />
                        <input
                          className={`${inputClass} mt-2 font-mono text-xs`}
                          style={{ background: FIGMA.inputBg }}
                          placeholder="/attached_assets/..."
                          value={String(value ?? "")}
                          onChange={(e) => {
                            const fn = bindingField ? onChangeBinding : onChangeProp;
                            fn?.(field.key, e.target.value || undefined);
                          }}
                        />
                      </>
                    ) : (
                      <FieldEditor
                        field={field}
                        value={value}
                        onChange={(v) =>
                          bindingField
                            ? onChangeBinding?.(field.key, v)
                            : onChangeProp(field.key, v)
                        }
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
