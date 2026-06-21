import type { PdfBlock } from "./PdfCanvas";

export interface PdfPage {
  id: string;
  label: string;
  blocks: PdfBlock[];
}

export interface PdfTemplateDraft {
  templateName: string;
  mode: "auto" | "free";
  pages: PdfPage[];
}

export function newPdfPage(index: number): PdfPage {
  return {
    id: `page-${Date.now()}-${index}`,
    label: `Страница ${index}`,
    blocks: [],
  };
}


function inferPdfMode(data: { mode?: string; blocks?: PdfBlock[] }): "auto" | "free" {
  if (data.mode === "auto" || data.mode === "free") return data.mode;
  const blocks = data.blocks ?? [];
  if (blocks.some((b) => (b.y ?? 0) > 0 || (b.x ?? 0) > 0)) return "free";
  return "auto";
}

/** Legacy templates with top-level `blocks` → single page. */
export function normalizePdfTemplate(data: {
  templateName?: string;
  mode?: string;
  pages?: PdfPage[];
  blocks?: PdfBlock[];
}): PdfTemplateDraft {
  const mode = inferPdfMode(data);
  const templateName = data.templateName ?? "custom";
  if (Array.isArray(data.pages) && data.pages.length > 0) {
    return {
      templateName,
      mode,
      pages: data.pages.map((p, i) => ({
        id: p.id ?? `page-${i + 1}`,
        label: p.label ?? `Страница ${i + 1}`,
        blocks: p.blocks ?? [],
      })),
    };
  }
  return {
    templateName,
    mode,
    pages: [
      {
        id: "page-1",
        label: "Страница 1",
        blocks: data.blocks ?? [],
      },
    ],
  };
}

export function flattenPdfBlocks(pages: PdfPage[]): PdfBlock[] {
  return pages.flatMap((p) => p.blocks);
}

export function pdfTemplatePayload(draft: PdfTemplateDraft): Record<string, unknown> {
  return {
    templateName: draft.templateName,
    mode: draft.mode,
    pages: draft.pages,
    blocks: flattenPdfBlocks(draft.pages),
  };
}
