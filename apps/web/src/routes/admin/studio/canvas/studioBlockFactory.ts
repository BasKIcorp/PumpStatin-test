import type { BlockConfig } from "@pumpstation/contracts";
import { defaultBlockLayout as blockDefaultLayout } from "@pumpstation/contracts";
import { getSchema } from "@/routes/admin/studio/properties/blockSchema";
import { setNested } from "@/routes/admin/studio/canvas/studioPropUtils";
import { findFreeLayout, nextAvailableY } from "@/lib/gridLayout";

export function defaultBlockProps(type: string): Record<string, unknown> {
  const schema = getSchema(type);
  if (!schema) return {};
  let result: Record<string, unknown> = {};
  for (const field of schema.fields) {
    if (field.defaultValue !== undefined) {
      result = setNested(result, field.key, field.defaultValue);
    }
  }
  return result;
}

export function createStudioBlock(
  type: string,
  options?: {
    y?: number;
    cols?: number;
    existing?: BlockConfig[];
    extraProps?: Record<string, unknown>;
  },
): BlockConfig {
  const y = options?.y ?? (options?.existing ? nextAvailableY(options.existing) : 0);
  const base = blockDefaultLayout(type, 0);
  const props = { ...defaultBlockProps(type), ...options?.extraProps };
  const layout =
    options?.existing && options.cols
      ? findFreeLayout(options.existing, base.w, base.h, options.cols, y)
      : { ...base, y };
  return {
    id: `block-${Date.now()}`,
    type,
    props,
    layout,
  };
}
