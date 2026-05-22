/**
 * Визуальный редактор позиций текста на шаблонах PDF.
 * Превью A4 (595.28×841.89 pt), координаты в PDF: origin снизу слева.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPdfTemplatePreviewUrl } from "@/lib/api";
import type { TextOverlayConfig } from "@/lib/api";
import {
  WysiwygCenterRectBlock,
  WysiwygHandle,
  WysiwygTkpSummaryTable,
} from "@/components/PdfOverlayWysiwygChrome";
import {
  buildPdfPreviewSamples,
  type PdfPreviewTexts,
} from "@/lib/pdf-preview-samples";
import { TechSheetLayoutZones } from "@/components/TechSheetLayoutZones";
import type { TechSheetZoneId } from "@/lib/tech-sheet-layout";
import { normalizeUploadedAssetUrlForBrowser } from "@/lib/asset-url";
import {
  A4_PT,
  CM_TO_PT,
  cssToPtBottomLeft,
  ptBottomLeftToCss,
} from "@/lib/pdf-coordinates";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// pdf.js worker (нужно для рендера PDF в Canvas без iframe-скейлинга).
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.mjs", import.meta.url).toString();
} catch {
  // Если workerSrc не удалось установить — pdf.js попытается использовать дефолт.
}

// Высота блока шапки на основной странице (pt). Совпадает с api/pdf/config.py MAIN_PAGE_HEADER_BLOCK_HEIGHT_PT.
const MAIN_PAGE_HEADER_BLOCK_HEIGHT_PT = 36;

type PageId = "first" | "second" | "main";

const PAGE_LABELS: Record<PageId, string> = {
  first: "Первая страница (титул)",
  second: "Вторая страница (КП)",
  main: "Основная страница (спецификация)",
};

// Значения по умолчанию из api/pdf/config.py (second_page и main_page — полный набор ключей для корректного наложения)
const DEFAULTS = {
  first_page: { tkp_right_x: 570.47, tkp_top_y: 507.2, font_size: 20 },
  second_page: {
    // overlay-only (режим custom_pdf: наложение поверх загруженного PDF)
    commercial_offer_font_size: 14,
    pump_text_font_size: 8,
    pump_text_line_height: 12,
    offer_center_x: 297.64,
    offer_center_y: 715,
    offer_width: 200,
    desc_center_x: 170,
    desc_center_y: 385,
    desc_width: 170,
    price_retail_center_x: 350,
    price_retail_center_y: 370,
    price_retail_width: 100,
    sum_center_x: 420,
    sum_center_y: 370,
    sum_width: 90,
    date_center_x: 40,
    date_center_y: 520,
    date_width: 80,
    totals_center_x: 70,
    totals_center_y: 322,
    totals_width: 120,

    // template-mode (фон second_page.jpg + отрисовка таблиц/блоков кодом)
    title_x: 297.64,
    title_y: 660,
    customer_table_left: 14,
    customer_table_top: 620,
    date_x: 14,
    date_y: 520,
    prices_label_x: 14,
    prices_label_y: 500,
    table_left: 14,
    table_top: 460,
    totals_x: 14,
    totals_first_line_y: 322,
    tkp_table_left_pt: 46,
    tkp_table_top_y: 312,

    // исполнительный блок (Frame в ReportLab). Координаты: bottom-left в pt.
    executor_left_pt: 21.7,
    executor_bottom_pt: 507.98,
    executor_width_pt: 551.88,
    executor_height_pt: 119.07,
    executor_font_size_pt: 10,
    executor_leading_pt: 12,
  },
  main_page: {
    content_top_cm: 2.5,
    header_top_cm: 1,
    header_font_size: 10,
    tkp_font_size: 7.5,
    left_margin_cm: 8,
    right_margin_cm: 1.5,
  },
} as const;

function getPageConfig(config: TextOverlayConfig | null | undefined, page: PageId) {
  const key = page === "first" ? "first_page" : page === "second" ? "second_page" : "main_page";
  const def = DEFAULTS[key] as Record<string, number>;
  const cur = (config ?? {})[key] as Record<string, number> | undefined;
  return { ...def, ...cur };
}

interface PdfOverlayEditorProps {
  page: PageId;
  overlayConfig: TextOverlayConfig | null | undefined;
  onOverlayConfigChange: (config: TextOverlayConfig) => void;
  /** URL загруженного шаблона (PDF или картинка) — если задан, в превью показывается он вместо шаблона по умолчанию */
  templateUrl?: string | null;
  /** Slug витрины для превью фона из /api/admin/pdf-template-preview */
  siteSlug?: string;
  previewWidth?: number;
  /** Тексты PDF из админки — для живого превью в конструкторе */
  pdfTexts?: PdfPreviewTexts;
  /** Сколько подборов симулировать на превью ТКП (1 = одна строка, без сводной таблицы) */
  previewSelectionCount?: number;
  /** Параметры техлиста из настроек PDF (масштаб графиков и т.д.) */
  techSheetSettings?: {
    graph_scale?: number;
    graph_x_offset?: number;
    mass_block_offset_pt?: number;
    drawing_width_ratio?: number;
  };
}

export const PdfOverlayEditor: React.FC<PdfOverlayEditorProps> = ({
  page,
  overlayConfig,
  onOverlayConfigChange,
  templateUrl,
  siteSlug,
  previewWidth,
  pdfTexts,
  previewSelectionCount = 1,
  techSheetSettings,
}) => {
  const samples = useMemo(
    () => buildPdfPreviewSamples(pdfTexts, { selectionCount: previewSelectionCount }),
    [pdfTexts, previewSelectionCount],
  );
  const resolvedTemplateUrl = useMemo(
    () => normalizeUploadedAssetUrlForBrowser(templateUrl ?? null),
    [templateUrl],
  );
  const isCustomPdfPreview = !!(resolvedTemplateUrl && /\.pdf(\?|$)/i.test(resolvedTemplateUrl));
  const resolvedPreviewWidth =
    previewWidth ??
    (resolvedTemplateUrl && /\.pdf(\?|$)/i.test(resolvedTemplateUrl) ? A4_PT.width : 420);

  const scale = resolvedPreviewWidth / A4_PT.width;
  const previewHeight = A4_PT.height * scale;
  const containerRef = useRef<HTMLDivElement>(null);
  const configRef = useRef<TextOverlayConfig | null | undefined>(overlayConfig);
  configRef.current = overlayConfig;
  const [dragging, setDragging] = useState<string | null>(null);
  const activeTechZone = useMemo((): TechSheetZoneId | null => {
    if (page !== "main" || !dragging) return null;
    if (dragging === "header") return "header";
    if (dragging === "content") return "charts";
    if (dragging === "left_margin") return "charts";
    if (dragging === "right_margin") return "specs";
    return null;
  }, [dragging, page]);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; startValues: Record<string, number> } | null>(null);

  const pageConfig = getPageConfig(overlayConfig, page);

  const ptToDiv = useCallback(
    (ptX: number, ptY: number) => ptBottomLeftToCss(ptX, ptY, scale, A4_PT.height),
    [scale],
  );

  const divToPt = useCallback(
    (motionlessDivX: number, divY: number) => cssToPtBottomLeft(motionlessDivX, divY, scale, A4_PT.height),
    [scale],
  );

  const updatePageConfig = useCallback(
    (updates: Record<string, number>) => {
      const key = page === "first" ? "first_page" : page === "second" ? "second_page" : "main_page";
      const curConfig = configRef.current ?? {};
      const curPage = (curConfig[key as keyof TextOverlayConfig] as Record<string, number>) ?? {};
      const next = {
        ...curConfig,
        [key]: { ...curPage, ...updates },
      };
      onOverlayConfigChange(next);
    },
    [page, onOverlayConfigChange]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, elementId: string, startValues: Record<string, number>) => {
      e.preventDefault();
      setDragging(elementId);
      setDragStart({ x: e.clientX, y: e.clientY, startValues: { ...startValues } });
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !containerRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const rect = containerRef.current.getBoundingClientRect();
      const divX = e.clientX - rect.left;
      const divY = e.clientY - rect.top;
      let { x: ptX, y: ptY } = divToPt(divX, divY);
      ptX = Math.max(0, Math.min(A4_PT.width, ptX));
      ptY = Math.max(0, Math.min(A4_PT.height, ptY));

      if (page === "first" && dragging === "tkp") {
        updatePageConfig({ tkp_right_x: Math.round(ptX * 100) / 100, tkp_top_y: Math.round(ptY * 100) / 100 });
      } else if (page === "second") {
        const r = (v: number) => Math.round(v * 100) / 100;
        // overlay-only (custom_pdf)
        if (dragging === "offer") updatePageConfig({ offer_center_x: r(ptX), offer_center_y: r(ptY) });
        else if (dragging === "offer_resize") updatePageConfig({ offer_width: Math.max(60, r(2 * (ptX - pageConfig.offer_center_x))) });
        else if (dragging === "desc") updatePageConfig({ desc_center_x: r(ptX), desc_center_y: r(ptY) });
        else if (dragging === "desc_resize") {
          const halfW = Math.max(20, Math.min((A4_PT.width - 40) / 2, ptX - pageConfig.desc_center_x));
          updatePageConfig({ desc_width: r(2 * halfW) });
        } else if (dragging === "price_retail") updatePageConfig({ price_retail_center_x: r(ptX), price_retail_center_y: r(ptY) });
        else if (dragging === "price_retail_resize") updatePageConfig({ price_retail_width: Math.max(40, r(2 * (ptX - pageConfig.price_retail_center_x))) });
        else if (dragging === "sum") updatePageConfig({ sum_center_x: r(ptX), sum_center_y: r(ptY) });
        else if (dragging === "sum_resize") updatePageConfig({ sum_width: Math.max(40, r(2 * (ptX - pageConfig.sum_center_x))) });
        else if (dragging === "executor") updatePageConfig({ executor_left_pt: r(ptX), executor_bottom_pt: r(ptY) });
        else if (dragging === "date") updatePageConfig({ date_center_x: r(ptX), date_center_y: r(ptY) });
        else if (dragging === "date_resize") updatePageConfig({ date_width: Math.max(50, r(2 * (ptX - pageConfig.date_center_x))) });
        else if (dragging === "totals") updatePageConfig({ totals_center_x: r(ptX), totals_center_y: r(ptY) });
        else if (dragging === "totals_resize") updatePageConfig({ totals_width: Math.max(60, r(2 * (ptX - pageConfig.totals_center_x))) });

        // template-mode (default: background second_page.jpg)
        else if (dragging === "title") updatePageConfig({ title_x: r(ptX), title_y: r(ptY) });
        else if (dragging === "customer_table") updatePageConfig({ customer_table_left: r(ptX), customer_table_top: r(ptY) });
        else if (dragging === "date") updatePageConfig({ date_x: r(ptX), date_y: r(ptY) });
        else if (dragging === "prices") updatePageConfig({ prices_label_x: r(ptX), prices_label_y: r(ptY) });
        else if (dragging === "table") updatePageConfig({ table_left: r(ptX), table_top: r(ptY) });
        else if (dragging === "tkp_summary_table") {
          updatePageConfig({ tkp_table_left_pt: r(ptX), tkp_table_top_y: r(ptY) });
        } else if (dragging === "totals") updatePageConfig({ totals_x: r(ptX), totals_first_line_y: r(ptY) });
      } else if (page === "main") {
        if (dragging === "header") {
          const left_margin_cm = Math.round((ptX / CM_TO_PT) * 100) / 100;
          const header_top_cm = Math.round(((A4_PT.height - ptY - MAIN_PAGE_HEADER_BLOCK_HEIGHT_PT) / CM_TO_PT) * 100) / 100;
          updatePageConfig({ left_margin_cm, header_top_cm });
        } else if (dragging === "content") updatePageConfig({ content_top_cm: Math.round(((A4_PT.height - ptY) / CM_TO_PT) * 100) / 100 });
        else if (dragging === "left_margin") updatePageConfig({ left_margin_cm: Math.round((ptX / CM_TO_PT) * 100) / 100 });
        else if (dragging === "right_margin") updatePageConfig({ right_margin_cm: Math.round((A4_PT.width - ptX) / CM_TO_PT * 100) / 100 });
      }
    },
    [dragging, page, divToPt, updatePageConfig]
  );

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setDragStart(null);
  }, []);

  React.useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      handleMouseMove(e as unknown as React.MouseEvent);
      e.preventDefault();
    };
    const onUp = () => handleMouseUp();
    window.addEventListener("mousemove", onMove, { passive: false });
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, handleMouseMove, handleMouseUp]);

  const [previewSrc, setPreviewSrc] = useState<string>("");
  const [previewIsPdf, setPreviewIsPdf] = useState(false);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfRenderFailed, setPdfRenderFailed] = useState(false);
  useEffect(() => {
    const isPdfTemplate = (u: string) => /\.pdf(\?|$)/i.test(u) || u.toLowerCase().includes("pdf");

    if (resolvedTemplateUrl) {
      if (isPdfTemplate(resolvedTemplateUrl)) {
        // Рендерируем PDF через pdf.js, поэтому загружаем с credentials и используем blob URL (без iframe-скейлинга).
        let cancelled = false;
        let blobUrl: string | null = null;
        setPreviewIsPdf(true);
        fetch(resolvedTemplateUrl, { credentials: "include" })
          .then((r) => (r.ok ? r.blob() : null))
          .then((blob) => {
            if (cancelled) return;
            if (blob) {
              blobUrl = URL.createObjectURL(blob);
              setPreviewSrc(blobUrl);
            } else {
              setPreviewSrc(resolvedTemplateUrl);
            }
          })
          .catch(() => {
            if (cancelled) return;
            setPreviewSrc(resolvedTemplateUrl);
          });
        return () => {
          cancelled = true;
          if (blobUrl) URL.revokeObjectURL(blobUrl);
        };
      }

      setPreviewSrc(resolvedTemplateUrl);
      setPreviewIsPdf(false);
      setPdfRenderFailed(false);
      return;
    }
    let cancelled = false;
    let blobUrl: string | null = null;
    setPreviewIsPdf(false);
    setPdfRenderFailed(false);
    const url = getPdfTemplatePreviewUrl(page, siteSlug);
    fetch(url, { credentials: "include" })
      .then((r) => {
        if (!r.ok) return null;
        const ct = (r.headers.get("content-type") || "").toLowerCase();
        return r.blob().then((blob) => ({ blob, ct }));
      })
      .then((result) => {
        if (cancelled || !result?.blob) {
          if (!cancelled) setPreviewSrc(url);
          return;
        }
        const { blob, ct } = result;
        blobUrl = URL.createObjectURL(blob);
        setPreviewSrc(blobUrl);
        setPreviewIsPdf(ct.includes("pdf") || /\.pdf(\?|$)/i.test(url));
        setPdfRenderFailed(false);
      })
      .catch(() => {
        if (!cancelled) setPreviewSrc(url);
      });
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [page, templateUrl, siteSlug]);

  // pdf.js: рендерим PDF в Canvas, чтобы превью масштабировалось 1:1 с координатами PT.
  useEffect(() => {
    if (!previewIsPdf || !previewSrc) return;
    const canvas = pdfCanvasRef.current;
    if (!canvas) return;
    setPdfRenderFailed(false);

    let cancelled = false;
    (async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(previewSrc);
        const pdf = await loadingTask.promise;
        const pageNum = 1;
        const page = await pdf.getPage(pageNum);
        const baseViewport = page.getViewport({ scale: 1 });
        const scaleFactor = resolvedPreviewWidth / baseViewport.width;
        const viewport = page.getViewport({ scale: scaleFactor });

        if (cancelled) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Внутреннее разрешение округляем, но CSS-габариты задаём контейнером/inline-style.
        const cssW = resolvedPreviewWidth;
        const cssH = previewHeight;
        const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
        canvas.width = Math.max(1, Math.round(cssW * dpr));
        canvas.height = Math.max(1, Math.round(cssH * dpr));
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        await page.render({ canvasContext: ctx, viewport }).promise;
      } catch {
        // Если рендер не удался, просто оставим пустой холст — маркеры всё равно покажутся.
        if (!cancelled) setPdfRenderFailed(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [previewIsPdf, previewSrc, resolvedPreviewWidth, previewHeight]);
  const isFirst = page === "first";
  const isSecond = page === "second";
  const isMain = page === "main";

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-lg border bg-muted/20 select-none ${dragging ? "touch-none" : ""}`}
        style={{ width: resolvedPreviewWidth, height: previewHeight, userSelect: dragging ? "none" : undefined }}
      >
        {!previewSrc ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            Загрузка превью…
          </div>
        ) : previewIsPdf ? (
          pdfRenderFailed ? (
            // Фоллбек: чтобы не было "пустого" превью, если pdf.js рендер не прошёл.
            <iframe
              src={previewSrc}
              title={`Шаблон ${PAGE_LABELS[page]}`}
              className="absolute inset-0 h-full w-full border-0 pointer-events-none"
              style={{ width: resolvedPreviewWidth, height: previewHeight }}
            />
          ) : (
            <canvas
              ref={pdfCanvasRef}
              className="absolute inset-0 pointer-events-none"
              style={{ width: resolvedPreviewWidth, height: previewHeight }}
            />
          )
        ) : (
          <img
            src={previewSrc}
            alt={`Шаблон ${PAGE_LABELS[page]}`}
            className="absolute inset-0 h-full w-full pointer-events-none"
            style={{ width: resolvedPreviewWidth, height: previewHeight, objectFit: "fill" }}
            draggable={false}
            title="Превью растянуто под A4 — позиции блоков совпадают с PDF"
          />
        )}
        {isFirst && (
          <WysiwygHandle
            label="Номер ТКП"
            sampleText={samples.tkpNumber}
            anchor="top-right"
            ptX={pageConfig.tkp_right_x}
            ptY={pageConfig.tkp_top_y}
            fontSizePt={pageConfig.font_size}
            scale={scale}
            pageHeightPt={A4_PT.height}
            onMouseDown={(e) => handleMouseDown(e, "tkp", { tkp_right_x: pageConfig.tkp_right_x, tkp_top_y: pageConfig.tkp_top_y })}
            active={dragging === "tkp"}
            fontWeight={700}
            textAlign="right"
            maxWidthPx={320}
          />
        )}
        {isSecond && (
          <>
            {isCustomPdfPreview ? (
              <>
                {/* custom_pdf: заголовок/описание поверх загруженного PDF */}
                <WysiwygCenterRectBlock
                  label="Заголовок КП (overlay)"
                  sampleText={samples.commercialOfferTitle}
                  centerX={pageConfig.offer_center_x}
                  centerY={pageConfig.offer_center_y}
                  widthPt={pageConfig.offer_width}
                  heightPt={18}
                  scale={scale}
                  pageHeightPt={A4_PT.height}
                  dragging={dragging === "offer"}
                  onMouseDown={(e) => handleMouseDown(e, "offer", { offer_center_x: pageConfig.offer_center_x, offer_center_y: pageConfig.offer_center_y })}
                  resizable
                  resizeDragging={dragging === "offer_resize"}
                  onResizeMouseDown={(e) => handleMouseDown(e, "offer_resize", { offer_center_x: pageConfig.offer_center_x, offer_width: pageConfig.offer_width })}
                  fontSizePx={pageConfig.commercial_offer_font_size * scale}
                  fontWeight={700}
                  uppercase
                />
                <WysiwygCenterRectBlock
                  label="Описание (overlay)"
                  sampleText={samples.description}
                  centerX={pageConfig.desc_center_x}
                  centerY={pageConfig.desc_center_y}
                  widthPt={pageConfig.desc_width}
                  heightPt={36}
                  scale={scale}
                  pageHeightPt={A4_PT.height}
                  dragging={dragging === "desc"}
                  onMouseDown={(e) => handleMouseDown(e, "desc", { desc_center_x: pageConfig.desc_center_x, desc_center_y: pageConfig.desc_center_y })}
                  resizable
                  resizeDragging={dragging === "desc_resize"}
                  onResizeMouseDown={(e) => handleMouseDown(e, "desc_resize", { desc_center_x: pageConfig.desc_center_x, desc_width: pageConfig.desc_width })}
                  fontSizePx={pageConfig.pump_text_font_size * scale}
                  fontWeight={400}
                />
                <WysiwygCenterRectBlock
                  label="Розничная цена"
                  sampleText={samples.priceRetail}
                  centerX={pageConfig.price_retail_center_x}
                  centerY={pageConfig.price_retail_center_y}
                  widthPt={pageConfig.price_retail_width}
                  heightPt={14}
                  scale={scale}
                  pageHeightPt={A4_PT.height}
                  dragging={dragging === "price_retail"}
                  onMouseDown={(e) => handleMouseDown(e, "price_retail", { price_retail_center_x: pageConfig.price_retail_center_x, price_retail_center_y: pageConfig.price_retail_center_y })}
                  resizable
                  resizeDragging={dragging === "price_retail_resize"}
                  onResizeMouseDown={(e) => handleMouseDown(e, "price_retail_resize", { price_retail_center_x: pageConfig.price_retail_center_x, price_retail_width: pageConfig.price_retail_width })}
                  fontSizePx={11 * scale}
                  fontWeight={600}
                />
                <WysiwygCenterRectBlock
                  label="Сумма"
                  sampleText={samples.sum}
                  centerX={pageConfig.sum_center_x}
                  centerY={pageConfig.sum_center_y}
                  widthPt={pageConfig.sum_width}
                  heightPt={14}
                  scale={scale}
                  pageHeightPt={A4_PT.height}
                  dragging={dragging === "sum"}
                  onMouseDown={(e) => handleMouseDown(e, "sum", { sum_center_x: pageConfig.sum_center_x, sum_center_y: pageConfig.sum_center_y })}
                  resizable
                  resizeDragging={dragging === "sum_resize"}
                  onResizeMouseDown={(e) => handleMouseDown(e, "sum_resize", { sum_center_x: pageConfig.sum_center_x, sum_width: pageConfig.sum_width })}
                  fontSizePx={10 * scale}
                  fontWeight={600}
                />
                <WysiwygCenterRectBlock
                  label="Дата"
                  sampleText={samples.date}
                  centerX={pageConfig.date_center_x}
                  centerY={pageConfig.date_center_y}
                  widthPt={pageConfig.date_width}
                  heightPt={14}
                  scale={scale}
                  pageHeightPt={A4_PT.height}
                  dragging={dragging === "date"}
                  onMouseDown={(e) => handleMouseDown(e, "date", { date_center_x: pageConfig.date_center_x, date_center_y: pageConfig.date_center_y })}
                  resizable
                  resizeDragging={dragging === "date_resize"}
                  onResizeMouseDown={(e) => handleMouseDown(e, "date_resize", { date_center_x: pageConfig.date_center_x, date_width: pageConfig.date_width })}
                  fontSizePx={10 * scale}
                  fontWeight={500}
                />
                <WysiwygCenterRectBlock
                  label="Итого (цена)"
                  sampleText={samples.totalsPrice.replace(/^Итого, с НДС:\s*/, "")}
                  centerX={pageConfig.totals_center_x}
                  centerY={pageConfig.totals_center_y}
                  widthPt={pageConfig.totals_width}
                  heightPt={14}
                  scale={scale}
                  pageHeightPt={A4_PT.height}
                  dragging={dragging === "totals"}
                  onMouseDown={(e) => handleMouseDown(e, "totals", { totals_center_x: pageConfig.totals_center_x, totals_center_y: pageConfig.totals_center_y })}
                  resizable
                  resizeDragging={dragging === "totals_resize"}
                  onResizeMouseDown={(e) => handleMouseDown(e, "totals_resize", { totals_center_x: pageConfig.totals_center_x, totals_width: pageConfig.totals_width })}
                  fontSizePx={10 * scale}
                  fontWeight={600}
                />
                <WysiwygHandle
                  label="Исполнитель"
                  sampleText={samples.executor}
                  anchor="bottom-left"
                  variant="executor"
                  ptX={pageConfig.executor_left_pt}
                  ptY={pageConfig.executor_bottom_pt}
                  scale={scale}
                  pageHeightPt={A4_PT.height}
                  maxWidthPx={Math.min(440, pageConfig.executor_width_pt * scale)}
                  onMouseDown={(e) =>
                    handleMouseDown(e, "executor", {
                      executor_left_pt: pageConfig.executor_left_pt,
                      executor_bottom_pt: pageConfig.executor_bottom_pt,
                    })
                  }
                  active={dragging === "executor"}
                />
              </>
            ) : (
              <>
                <WysiwygCenterRectBlock
                  label="Заголовок КП"
                  sampleText={samples.commercialOfferTitle}
                  centerX={pageConfig.title_x}
                  centerY={pageConfig.title_y}
                  widthPt={480}
                  heightPt={20}
                  scale={scale}
                  pageHeightPt={A4_PT.height}
                  dragging={dragging === "title"}
                  onMouseDown={(e) => handleMouseDown(e, "title", { title_x: pageConfig.title_x, title_y: pageConfig.title_y })}
                  fontSizePx={13 * scale}
                  fontWeight={700}
                  uppercase
                />
                <WysiwygHandle
                  label="Реквизиты заказчика"
                  sampleText=""
                  anchor="top-left"
                  variant="compact_table"
                  customerRows={samples.customerRows}
                  ptX={pageConfig.customer_table_left}
                  ptY={pageConfig.customer_table_top}
                  scale={scale}
                  pageHeightPt={A4_PT.height}
                  maxWidthPx={260}
                  onMouseDown={(e) => handleMouseDown(e, "customer_table", { customer_table_left: pageConfig.customer_table_left, customer_table_top: pageConfig.customer_table_top })}
                  active={dragging === "customer_table"}
                />
                <WysiwygHandle
                  label="Дата"
                  sampleText={samples.date}
                  anchor="baseline-left"
                  ptX={pageConfig.date_x}
                  ptY={pageConfig.date_y}
                  fontSizePt={10}
                  scale={scale}
                  pageHeightPt={A4_PT.height}
                  onMouseDown={(e) => handleMouseDown(e, "date", { date_x: pageConfig.date_x, date_y: pageConfig.date_y })}
                  active={dragging === "date"}
                  fontWeight={600}
                />
                <WysiwygHandle
                  label="Цены и условия оплаты"
                  sampleText={samples.pricesLabel}
                  anchor="baseline-left"
                  ptX={pageConfig.prices_label_x}
                  ptY={pageConfig.prices_label_y}
                  fontSizePt={9}
                  scale={scale}
                  pageHeightPt={A4_PT.height}
                  onMouseDown={(e) => handleMouseDown(e, "prices", { prices_label_x: pageConfig.prices_label_x, prices_label_y: pageConfig.prices_label_y })}
                  active={dragging === "prices"}
                  fontWeight={700}
                />
                <WysiwygHandle
                  label="Таблица КП"
                  sampleText=""
                  anchor="top-left"
                  variant="kp_table"
                  kpTable={samples.kpTable}
                  ptX={pageConfig.table_left}
                  ptY={pageConfig.table_top}
                  scale={scale}
                  pageHeightPt={A4_PT.height}
                  maxWidthPx={540}
                  onMouseDown={(e) => handleMouseDown(e, "table", { table_left: pageConfig.table_left, table_top: pageConfig.table_top })}
                  active={dragging === "table"}
                />
                {samples.showTkpSummaryTable ? (
                  <WysiwygTkpSummaryTable
                    label="Сводная таблица подборов (2+ насоса)"
                    leftPt={pageConfig.tkp_table_left_pt ?? 46}
                    topPt={pageConfig.tkp_table_top_y ?? 312}
                    scale={scale}
                    rows={samples.tkpSummaryRows}
                    pageHeightPt={A4_PT.height}
                    onMouseDown={(e) =>
                      handleMouseDown(e, "tkp_summary_table", {
                        tkp_table_left_pt: pageConfig.tkp_table_left_pt ?? 46,
                        tkp_table_top_y: pageConfig.tkp_table_top_y ?? 312,
                      })
                    }
                    active={dragging === "tkp_summary_table"}
                  />
                ) : null}
                <WysiwygHandle
                  label="Исполнитель"
                  sampleText={samples.executor}
                  anchor="bottom-left"
                  variant="executor"
                  ptX={pageConfig.executor_left_pt}
                  ptY={pageConfig.executor_bottom_pt}
                  scale={scale}
                  pageHeightPt={A4_PT.height}
                  maxWidthPx={Math.min(440, pageConfig.executor_width_pt * scale)}
                  onMouseDown={(e) => handleMouseDown(e, "executor", { executor_left_pt: pageConfig.executor_left_pt, executor_bottom_pt: pageConfig.executor_bottom_pt })}
                  active={dragging === "executor"}
                />
                <WysiwygHandle
                  label="Итого, с НДС"
                  sampleText={`${samples.totalsLine}\n${samples.totalsPrice}`}
                  anchor="baseline-left"
                  ptX={pageConfig.totals_x}
                  ptY={pageConfig.totals_first_line_y}
                  fontSizePt={9}
                  scale={scale}
                  pageHeightPt={A4_PT.height}
                  onMouseDown={(e) => handleMouseDown(e, "totals", { totals_x: pageConfig.totals_x, totals_first_line_y: pageConfig.totals_first_line_y })}
                  active={dragging === "totals"}
                  fontWeight={600}
                />
              </>
            )}
          </>
        )}
        {isMain && (
          <>
            <TechSheetLayoutZones
              pageConfig={pageConfig}
              scale={scale}
              samples={samples}
              graphScale={techSheetSettings?.graph_scale ?? 0.525}
              graphXOffset={techSheetSettings?.graph_x_offset ?? -150}
              activeZone={activeTechZone}
            />
            {/* Область шапки: левый-низ блока совпадает с текстом при наложении */}
            <div
              className="absolute border border-primary/50 bg-primary/10 pointer-events-none"
              style={{
                ...ptToDiv(pageConfig.left_margin_cm * CM_TO_PT, A4_PT.height - pageConfig.header_top_cm * CM_TO_PT),
                width: (A4_PT.width - pageConfig.left_margin_cm * CM_TO_PT - pageConfig.right_margin_cm * CM_TO_PT) * scale,
                height: MAIN_PAGE_HEADER_BLOCK_HEIGHT_PT * scale,
              }}
            />
            <WysiwygHandle
              label="Шапка техлиста"
              sampleText={samples.mainHeader}
              anchor="bottom-left"
              variant="executor"
              ptX={pageConfig.left_margin_cm * CM_TO_PT}
              ptY={A4_PT.height - pageConfig.header_top_cm * CM_TO_PT - MAIN_PAGE_HEADER_BLOCK_HEIGHT_PT}
              scale={scale}
              pageHeightPt={A4_PT.height}
              onMouseDown={(e) =>
                handleMouseDown(e, "header", {
                  header_top_cm: pageConfig.header_top_cm,
                  left_margin_cm: pageConfig.left_margin_cm,
                })
              }
              active={dragging === "header"}
              fontSizePt={pageConfig.header_font_size}
              fontWeight={600}
              maxWidthPx={(A4_PT.width - pageConfig.left_margin_cm * CM_TO_PT - pageConfig.right_margin_cm * CM_TO_PT) * scale}
            />
            <WysiwygHandle
              label="Верх блока графиков и таблицы"
              sampleText="Линия начала данных (Q–H слева, характеристики справа)"
              anchor="center"
              ptX={A4_PT.width / 2}
              ptY={A4_PT.height - pageConfig.content_top_cm * CM_TO_PT}
              scale={scale}
              pageHeightPt={A4_PT.height}
              onMouseDown={(e) => handleMouseDown(e, "content", { content_top_cm: pageConfig.content_top_cm })}
              active={dragging === "content"}
              fontSizePt={9}
              textAlign="center"
              maxWidthPx={260}
            />
            <WysiwygHandle
              label="Левое поле (графики)"
              sampleText={`${pageConfig.left_margin_cm.toFixed(1)} см · зона графиков`}
              anchor="top-left"
              ptX={pageConfig.left_margin_cm * CM_TO_PT}
              ptY={A4_PT.height / 2}
              scale={scale}
              pageHeightPt={A4_PT.height}
              onMouseDown={(e) => handleMouseDown(e, "left_margin", { left_margin_cm: pageConfig.left_margin_cm })}
              active={dragging === "left_margin"}
              fontSizePt={8}
              fontWeight={600}
              maxWidthPx={96}
            />
            <WysiwygHandle
              label="Правое поле (таблица)"
              sampleText={`${pageConfig.right_margin_cm.toFixed(1)} см · таблица характеристик`}
              anchor="top-right"
              ptX={A4_PT.width - pageConfig.right_margin_cm * CM_TO_PT}
              ptY={A4_PT.height / 2}
              scale={scale}
              pageHeightPt={A4_PT.height}
              onMouseDown={(e) => handleMouseDown(e, "right_margin", { right_margin_cm: pageConfig.right_margin_cm })}
              active={dragging === "right_margin"}
              fontSizePt={8}
              fontWeight={600}
              textAlign="right"
              maxWidthPx={96}
            />
          </>
        )}
      </div>
      {isFirst && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Размер шрифта ТКП:</label>
          <input
            type="number"
            min={8}
            max={36}
            value={pageConfig.font_size}
            onChange={(e) => updatePageConfig({ font_size: Number(e.target.value) || 20 })}
            className="h-8 w-16 rounded border bg-background px-2 text-sm"
          />
        </div>
      )}
    </div>
  );
};

export default PdfOverlayEditor;
