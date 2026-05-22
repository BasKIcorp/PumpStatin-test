/**
 * Единый визуальный конструктор PDF.
 * Объединяет: фон страниц, настройки и тексты.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  adminGetPdfSettings,
  adminPatchPdfSettings,
  adminUploadFirstPagePdf,
  adminUploadSecondPagePdf,
  adminUploadThirdPagePdf,
  adminUploadLastPagePdf,
  adminClearPdfTemplate,
  adminGetPdfTexts,
  adminPatchPdfTexts,
  type AdminPdfSettings,
  type TextOverlayConfig,
} from "@/lib/api";
import { formatApiError } from "@/lib/api-error";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { Textarea } from "@/components/ui/textarea";
import { Save, Upload, Trash2, FileText, Image, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeUploadedAssetUrlForBrowser } from "@/lib/asset-url";
import { PdfOverlayEditor } from "@/components/PdfOverlayEditor";

type PageKey = "first" | "second" | "third" | "last";
type ActivePanel = PageKey | "texts";

interface PageDef {
  key: PageKey;
  label: string;
  subtitle?: string;
  defaultBgHint: string;
}

const PAGES: PageDef[] = [
  { key: "first",  label: "Открывающая",    subtitle: "Титульный лист пакета", defaultBgHint: "first_page.jpg" },
  { key: "second", label: "ТКП",            subtitle: "Коммерческое предложение и таблица подбора", defaultBgHint: "second_page.jpg" },
  { key: "third",  label: "Тех. лист",      subtitle: "Основная страница спецификации (повторяется на каждый подбор в составе документа)", defaultBgHint: "third_page.jpg" },
  { key: "last",   label: "Закрывающая",    subtitle: "Финальный лист", defaultBgHint: "last_page.pdf" },
];

const PDF_TEXT_KEYS: { key: string; label: string; hint?: string; multiline?: boolean }[] = [
  // Основные тексты
  { key: "pump_installation_title",   label: "Заголовок «Насосная установка»" },
  { key: "commercial_offer_prefix",   label: "Префикс заголовка КП" },
  { key: "price_on_request",          label: "Подпись «по запросу»" },
  { key: "executor_body",             label: "Блок «Исполнитель»",
    hint: "Оставьте пустым, чтобы не выводить блок.", multiline: true },
  // Контакты
  { key: "contact_website",           label: "Сайт" },
  { key: "contact_email",             label: "E-mail" },
  { key: "contact_phone",             label: "Телефон" },
  // Заголовки секций
  { key: "section_title_chart",       label: "Заголовок секции «График»" },
  { key: "section_title_specs",       label: "Заголовок секции «Характеристики»" },
  // Описания типов станций
  { key: "station_description_гм",        label: "Описание типа: Гидромодуль" },
  { key: "station_description_хоз-пит",   label: "Описание типа: Хоз-питьевой" },
  { key: "station_description_пнс",       label: "Описание типа: ПНС" },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

function getInclude(s: AdminPdfSettings, key: PageKey): boolean {
  if (key === "first")  return s.include_first_page;
  if (key === "second") return s.include_second_page ?? true;
  if (key === "third")  return s.include_third_page  ?? true;
  return s.include_last_page;
}

function withInclude(s: AdminPdfSettings, key: PageKey, val: boolean): AdminPdfSettings {
  return {
    ...s,
    include_first_page:  key === "first"  ? val : s.include_first_page,
    include_second_page: key === "second" ? val : (s.include_second_page ?? true),
    include_third_page:  key === "third"  ? val : (s.include_third_page  ?? true),
    include_last_page:   key === "last"   ? val : s.include_last_page,
  };
}

type OverlayPageId = "first" | "second" | "main";

function overlayPageForKey(key: PageKey): OverlayPageId | null {
  if (key === "first") return "first";
  if (key === "second") return "second";
  if (key === "third") return "main";
  return null;
}

function getBgUrl(s: AdminPdfSettings, key: PageKey): string | null {
  if (key === "first")  return s.first_page_pdf_url  ?? null;
  if (key === "second") return s.second_page_pdf_url ?? null;
  if (key === "third")  return s.third_page_pdf_url  ?? null;
  return s.last_page_pdf_url ?? null;
}

async function uploadBg(key: PageKey, file: File, siteSlug?: string): Promise<AdminPdfSettings> {
  if (key === "first")  return adminUploadFirstPagePdf(file, siteSlug);
  if (key === "second") return adminUploadSecondPagePdf(file, siteSlug);
  if (key === "third")  return adminUploadThirdPagePdf(file, siteSlug);
  return adminUploadLastPagePdf(file, siteSlug);
}

// ─── NumericField ──────────────────────────────────────────────────────────────

function NumericField({
  label, value, onChange, step = 1, min, max, unit,
}: {
  label: string; value: number; onChange: (v: number) => void;
  step?: number; min?: number; max?: number; unit?: string;
}) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1 mt-1">
        <Input
          type="number" step={step} min={min} max={max}
          value={value}
          onChange={e => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(v); }}
          className="h-8 max-w-[120px] text-sm"
        />
        {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

// ─── BackgroundPanel ──────────────────────────────────────────────────────────

function BackgroundPanel({
  pageKey, bgUrl, defaultHint, onUpload, onClear,
}: {
  pageKey: PageKey; bgUrl: string | null; defaultHint: string;
  onUpload: (f: File) => void; onClear: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-medium">Фон страницы</p>
        <p className="text-xs text-muted-foreground">
          {bgUrl ? "Пользовательский файл" : `Стандартный (${defaultHint})`}
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          {bgUrl ? "Заменить" : "Загрузить PDF / JPG"}
        </Button>
        {bgUrl && (
          <Button
            size="sm" variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={onClear}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Удалить
          </Button>
        )}
      </div>

      <input
        ref={fileRef} type="file"
        accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
        className="hidden"
        onChange={e => {
          if (e.target.files?.[0]) { onUpload(e.target.files[0]); e.target.value = ""; }
        }}
      />

      {bgUrl && (
        <div className="rounded border bg-muted/20 overflow-hidden">
          {/\.pdf(\?|$)/i.test(bgUrl) ? (
            <iframe src={bgUrl} title="Предпросмотр" className="w-full h-52 border-0" />
          ) : (
            <img src={bgUrl} alt="Предпросмотр" className="w-full object-contain max-h-52" />
          )}
        </div>
      )}
    </div>
  );
}

// ─── PageEditor ───────────────────────────────────────────────────────────────

function PageEditor({
  page, settings, overlayConfig, onSettingsChange, onOverlayChange, onUpload, onClear, siteSlug, pdfTexts,
  previewSelectionCount, onPreviewSelectionCountChange,
}: {
  page: PageDef;
  settings: AdminPdfSettings;
  overlayConfig: TextOverlayConfig;
  onSettingsChange: (fn: (s: AdminPdfSettings) => AdminPdfSettings) => void;
  onOverlayChange: (c: TextOverlayConfig) => void;
  onUpload: (f: File) => void;
  onClear: () => void;
  siteSlug?: string;
  pdfTexts?: Record<string, string>;
  previewSelectionCount: number;
  onPreviewSelectionCountChange: (n: number) => void;
}) {
  const included = getInclude(settings, page.key);
  const bgRaw = getBgUrl(settings, page.key);
  const bgUrl = useMemo(() => normalizeUploadedAssetUrlForBrowser(bgRaw), [bgRaw]);

  const sp = (overlayConfig?.second_page as Record<string, number> | undefined) ?? {};
  const overlayPage = overlayPageForKey(page.key);

  return (
    <div className="flex flex-col xl:flex-row min-h-0">
    <div className="p-6 space-y-6 w-full xl:max-w-md xl:shrink-0 xl:border-r border-border">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex flex-col gap-1 min-w-0">
          <h2 className="text-lg font-semibold">{page.label}</h2>
          {page.subtitle ? (
            <p className="text-sm text-muted-foreground max-w-xl">{page.subtitle}</p>
          ) : null}
        </div>
        <button
          onClick={() => onSettingsChange(s => withInclude(s, page.key, !included))}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors",
            included
              ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20"
              : "border-border bg-muted text-muted-foreground hover:bg-accent",
          )}
        >
          {included
            ? <><Eye className="h-3 w-3" /> Включён в PDF</>
            : <><EyeOff className="h-3 w-3" /> Выключен</>}
        </button>
      </div>

      {/* Background */}
      <BackgroundPanel
        pageKey={page.key}
        bgUrl={bgUrl}
        defaultHint={page.defaultBgHint}
        onUpload={onUpload}
        onClear={onClear}
      />

      {/* Second page extra settings */}
      {page.key === "second" && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-sm font-medium">Настройки КП</p>
          <div>
            <Label className="text-xs text-muted-foreground">
              Макс. ширина текста «Описание» (pt)
            </Label>
            <div className="flex items-center gap-1 mt-1">
              <Input
                type="number" step={10} min={50}
                className="h-8 max-w-[120px] text-sm"
                value={sp.description_max_width_pt ?? ""}
                placeholder="авто"
                onChange={e => {
                  const raw = e.target.value;
                  const next = { ...sp };
                  if (raw === "") delete next.description_max_width_pt;
                  else { const v = Number(raw); if (!isNaN(v)) next.description_max_width_pt = v; }
                  onOverlayChange({ ...overlayConfig, second_page: next });
                }}
              />
              <span className="text-xs text-muted-foreground">pt (пусто = авто)</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">
                Таблица ТКП: отступ слева
              </Label>
              <div className="flex items-center gap-1 mt-1">
                <Input
                  type="number" step={1} min={0}
                  className="h-8 max-w-[120px] text-sm"
                  value={sp.tkp_table_left_pt ?? ""}
                  placeholder="46"
                  onChange={e => {
                    const raw = e.target.value;
                    const next = { ...sp };
                    if (raw === "") delete next.tkp_table_left_pt;
                    else { const v = Number(raw); if (!isNaN(v)) next.tkp_table_left_pt = v; }
                    onOverlayChange({ ...overlayConfig, second_page: next });
                  }}
                />
                <span className="text-xs text-muted-foreground">pt</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Пусто — 46 pt</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Таблица ТКП: Y верхней границы
              </Label>
              <div className="flex items-center gap-1 mt-1">
                <Input
                  type="number" step={1} min={0}
                  className="h-8 max-w-[120px] text-sm"
                  value={sp.tkp_table_top_y ?? ""}
                  placeholder="312"
                  onChange={e => {
                    const raw = e.target.value;
                    const next = { ...sp };
                    if (raw === "") delete next.tkp_table_top_y;
                    else { const v = Number(raw); if (!isNaN(v)) next.tkp_table_top_y = v; }
                    onOverlayChange({ ...overlayConfig, second_page: next });
                  }}
                />
                <span className="text-xs text-muted-foreground">pt</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Пусто — 312 pt</p>
            </div>
          </div>
          <div className="space-y-2 pt-1 border-t border-border">
            <Label className="text-xs text-muted-foreground">Превью на макете</Label>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => onPreviewSelectionCountChange(1)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs transition-colors",
                  previewSelectionCount === 1
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border hover:bg-accent",
                )}
              >
                1 подбор
              </button>
              <button
                type="button"
                onClick={() => onPreviewSelectionCountChange(2)}
                className={cn(
                  "rounded-md border px-2.5 py-1 text-xs transition-colors",
                  previewSelectionCount >= 2
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border hover:bg-accent",
                )}
              >
                2+ подбора
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              При одном насосе — только основная таблица КП (одна строка). Сводная таблица №/Наименование/Q/H/Цена
              появляется при двух и более подборах. Координаты сводной таблицы — в pt (Y снизу вверх).
            </p>
          </div>
        </div>
      )}

      {/* Third page extra settings */}
      {page.key === "third" && (
        <div className="rounded-lg border border-border p-4 space-y-4">
          <div>
            <p className="text-sm font-medium">Технический лист</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              На превью справа цветные зоны — как в PDF: шапка, графики слева, таблица справа, схема и массогабариты внизу.
              Маркеры задают поля и высоту начала блока данных.
            </p>
          </div>
          <ul className="text-[11px] text-muted-foreground space-y-1 border border-border/80 rounded-md p-2.5 bg-muted/30">
            <li className="flex gap-2"><span className="w-2 h-2 rounded-sm bg-violet-500/70 shrink-0 mt-0.5" />Шапка — название и № ТКП</li>
            <li className="flex gap-2"><span className="w-2 h-2 rounded-sm bg-sky-500/70 shrink-0 mt-0.5" />Слева — графики подбора</li>
            <li className="flex gap-2"><span className="w-2 h-2 rounded-sm bg-amber-500/70 shrink-0 mt-0.5" />Справа — характеристики</li>
            <li className="flex gap-2"><span className="w-2 h-2 rounded-sm bg-emerald-500/70 shrink-0 mt-0.5" />Низ — схема и чертёж</li>
          </ul>
          <p className="text-xs font-medium text-foreground">Масштаб и смещения</p>
          <div className="grid grid-cols-2 gap-4">
            <NumericField
              label="Масштаб графиков" value={settings.graph_scale}
              step={0.05} min={0.1} max={1}
              onChange={v => onSettingsChange(s => ({ ...s, graph_scale: v }))}
            />
            <NumericField
              label="Смещение графиков по X" value={settings.graph_x_offset}
              step={10} unit="pt"
              onChange={v => onSettingsChange(s => ({ ...s, graph_x_offset: v }))}
            />
            <NumericField
              label="Смещение чертежа вниз" value={settings.mass_block_offset_pt ?? 58}
              step={5} min={0} unit="pt"
              onChange={v => onSettingsChange(s => ({ ...s, mass_block_offset_pt: v }))}
            />
            <NumericField
              label="Ширина чертежа (доля)" value={settings.drawing_width_ratio ?? 0.92}
              step={0.05} min={0.5} max={1}
              onChange={v => onSettingsChange(s => ({ ...s, drawing_width_ratio: v }))}
            />
          </div>
        </div>
      )}
    </div>

      {overlayPage && included ? (
        <div className="flex-1 min-w-0 p-4 xl:p-6 bg-muted/10 overflow-auto">
          <p className="text-sm font-medium mb-2">Позиции элементов на листе</p>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
            {page.key === "third" ? (
              <>
                Цветные зоны на листе — примерная вёрстка техлиста. Перетащите маркеры шапки, линии начала данных и полей.
                Масштаб графиков из настроек слева сразу отражается в зоне «Графики».
              </>
            ) : (
              <>
                На превью — примеры данных как в PDF. Для ТКП: «1 подбор» — одна строка в таблице КП; «2+ подбора» — сводная таблица.
                Перетащите элемент для смены позиции.
              </>
            )}
            {" "}
            Координаты в pt (A4, снизу слева) совпадают с генерацией.
            {page.key === "second" && settings.second_page_mode === "custom_pdf"
              ? " Режим загруженного PDF-шаблона."
              : page.key === "second"
                ? " Стандартный макет second_page.jpg."
                : page.key === "third"
                  ? " Фон — third_page.jpg или загруженный файл."
                  : ""}
          </p>
          <PdfOverlayEditor
            page={overlayPage}
            overlayConfig={overlayConfig}
            onOverlayConfigChange={onOverlayChange}
            templateUrl={bgUrl}
            siteSlug={siteSlug}
            previewWidth={595}
            pdfTexts={pdfTexts}
            previewSelectionCount={page.key === "second" ? previewSelectionCount : 1}
            techSheetSettings={
              page.key === "third"
                ? {
                    graph_scale: settings.graph_scale,
                    graph_x_offset: settings.graph_x_offset,
                    mass_block_offset_pt: settings.mass_block_offset_pt,
                    drawing_width_ratio: settings.drawing_width_ratio,
                  }
                : undefined
            }
          />
        </div>
      ) : null}
    </div>
  );
}

// ─── TextsPanel ───────────────────────────────────────────────────────────────

const TEXT_GROUPS = [
  { label: "Основные тексты", keys: ["pump_installation_title", "commercial_offer_prefix", "price_on_request", "executor_body"] },
  { label: "Контакты",        keys: ["contact_website", "contact_email", "contact_phone"] },
  { label: "Заголовки секций", keys: ["section_title_chart", "section_title_specs"] },
  { label: "Описания типов станций", keys: ["station_description_гм", "station_description_хоз-пит", "station_description_пнс"] },
];

function TextsPanel({
  texts, onChange,
}: {
  texts: Record<string, string>; onChange: (k: string, v: string) => void;
}) {
  const byKey = Object.fromEntries(PDF_TEXT_KEYS.map(f => [f.key, f]));
  return (
    <div className="p-6 max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Тексты PDF</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Строки подставляются в генерируемые PDF-документы. Пустое значение — поле скрывается.
        </p>
      </div>
      {TEXT_GROUPS.map(group => (
        <div key={group.label} className="rounded-lg border border-border p-4 space-y-4">
          <p className="text-sm font-medium text-foreground">{group.label}</p>
          {group.keys.map(key => {
            const spec = byKey[key];
            if (!spec) return null;
            return (
              <div key={key} className="space-y-1">
                <Label className="text-sm">{spec.label}</Label>
                {spec.hint && <p className="text-xs text-muted-foreground">{spec.hint}</p>}
                {spec.multiline ? (
                  <Textarea
                    value={texts[key] ?? ""}
                    onChange={e => onChange(key, e.target.value)}
                    placeholder={spec.label}
                    rows={3}
                    className="text-sm"
                  />
                ) : (
                  <Input
                    value={texts[key] ?? ""}
                    onChange={e => onChange(key, e.target.value)}
                    placeholder={spec.label}
                  />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── PdfConstructorTab ────────────────────────────────────────────────────────

export function PdfConstructorTab({ siteSlug }: { siteSlug?: string } = {}) {
  const { showNotification } = useToastNotification();
  const [settings, setSettings] = useState<AdminPdfSettings | null>(null);
  const [overlay, setOverlay] = useState<TextOverlayConfig>({});
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [active, setActive] = useState<ActivePanel>("first");
  const [previewSelectionCount, setPreviewSelectionCount] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([adminGetPdfSettings(siteSlug), adminGetPdfTexts(siteSlug)])
      .then(([s, items]) => {
        setSettings(s);
        if (s.text_overlay_config) setOverlay(s.text_overlay_config as TextOverlayConfig);
        const map: Record<string, string> = {};
        (items as { key: string; value: string }[]).forEach(i => {
          map[i.key] = i.value;
        });
        setTexts(map);
      })
      .catch((e) => {
        showNotification({
          title: "Не удалось загрузить настройки PDF",
          description: formatApiError(e),
          variant: "destructive",
        });
      })
      .finally(() => setLoading(false));
  }, [siteSlug, showNotification]);

  const handleSave = useCallback(async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await adminPatchPdfSettings({
        include_first_page:  settings.include_first_page,
        include_second_page: settings.include_second_page ?? true,
        include_third_page:  settings.include_third_page  ?? true,
        include_last_page:   settings.include_last_page,
        graph_scale:          settings.graph_scale,
        graph_x_offset:       settings.graph_x_offset,
        mass_block_offset_pt: settings.mass_block_offset_pt,
        drawing_width_ratio:  settings.drawing_width_ratio,
        text_overlay_config:  overlay,
      }, siteSlug);
      await adminPatchPdfTexts(texts, siteSlug);
      showNotification("Сохранено", "success");
    } catch (e) {
      showNotification({
        title: "Ошибка сохранения PDF",
        description: formatApiError(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }, [settings, overlay, texts, siteSlug, showNotification]);

  const handleUpload = useCallback(async (key: PageKey, file: File) => {
    try {
      const next = await uploadBg(key, file, siteSlug);
      setSettings(next);
      showNotification("Фон загружен", "success");
    } catch (e) {
      showNotification({
        title: "Не удалось загрузить файл фона",
        description: formatApiError(e),
        variant: "destructive",
      });
    }
  }, [siteSlug, showNotification]);

  const handleClear = useCallback(async (key: PageKey) => {
    try {
      const next = await adminClearPdfTemplate(key === "third" ? "third" : key, siteSlug);
      setSettings(next);
      showNotification("Фон удалён", "success");
    } catch (e) {
      showNotification({
        title: "Не удалось сбросить фон страницы",
        description: formatApiError(e),
        variant: "destructive",
      });
    }
  }, [siteSlug, showNotification]);

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Загрузка…</div>;
  }

  const activePage = PAGES.find(p => p.key === active);

  return (
    <div className="flex h-full min-h-0" style={{ minHeight: 600 }}>
      {/* ── Left sidebar ── */}
      <aside className="w-48 shrink-0 border-r border-border flex flex-col">
        <div className="px-3 py-3 border-b border-border">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            PDF Конструктор
          </p>
        </div>

        <nav className="flex-1 overflow-y-auto py-1">
          {PAGES.map(p => {
            const inc = settings ? getInclude(settings, p.key) : true;
            const hasBg = !!(settings && getBgUrl(settings, p.key));
            return (
              <button
                key={p.key}
                onClick={() => setActive(p.key)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-accent",
                  active === p.key && "bg-accent text-accent-foreground font-medium",
                )}
              >
                <span className="flex-1 truncate">{p.label}</span>
                <div className="flex gap-1 shrink-0">
                  {hasBg && <Image className="h-3 w-3 text-muted-foreground/60" />}
                  {!inc && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 leading-none">
                      выкл
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}

          <div className="mx-3 my-1 border-t border-border" />

          <button
            onClick={() => setActive("texts")}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-accent",
              active === "texts" && "bg-accent text-accent-foreground font-medium",
            )}
          >
            <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span>Тексты PDF</span>
          </button>
        </nav>

        <div className="p-3 border-t border-border">
          <Button
            onClick={handleSave}
            disabled={saving || !settings}
            size="sm"
            className="w-full"
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            {saving ? "Сохранение…" : "Сохранить всё"}
          </Button>
        </div>
      </aside>

      {/* ── Right content ── */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {active === "texts" ? (
          <TextsPanel
            texts={texts}
            onChange={(k, v) => setTexts(t => ({ ...t, [k]: v }))}
          />
        ) : settings && activePage ? (
          <PageEditor
            page={activePage}
            settings={settings}
            overlayConfig={overlay}
            onSettingsChange={fn => setSettings(s => s ? fn(s) : null)}
            onOverlayChange={setOverlay}
            onUpload={f => handleUpload(activePage.key, f)}
            onClear={() => handleClear(activePage.key)}
            siteSlug={siteSlug}
            pdfTexts={texts}
            previewSelectionCount={previewSelectionCount}
            onPreviewSelectionCountChange={setPreviewSelectionCount}
          />
        ) : null}
      </main>
    </div>
  );
}
