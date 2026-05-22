/**
 * Редактор внешнего вида витрины (White-Label) по зонам экрана подбора.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToastNotification } from "@/hooks/use-toast-notification";
import axios from "@/lib/csrf";
import type { AdminAppearance, SelectionStageTitles } from "@/lib/api";
import { adminApplyBrandPreset } from "@/lib/api";
import {
  APPEARANCE_ZONE_LABELS,
  APPEARANCE_ZONE_ORDER,
  manifestEntriesForZone,
  type AppearanceUiZone,
} from "@/lib/appearanceManifest";
import { bustAppearanceMediaUrls } from "@/lib/appearanceMedia";
import {
  HYDROMODULE_CARD_FORM_FIELD,
  HYDROMODULE_LINE_LABELS,
  HYDROMODULE_LINE_ORDER,
} from "@/lib/selectionRoute";
import type { SelectionCardSettings } from "@/lib/selectionCardSettings";
import { SELECTION_MOCKUP_CARD_WIDTH_PX } from "@/lib/selectionAssets";
import type { FunnelFontKey } from "@/lib/funnelTheme";

const FUNNEL_FONT_OPTIONS: { value: FunnelFontKey; label: string }[] = [
  { value: "oswald", label: "Oswald (заголовки)" },
  { value: "jetbrains_mono", label: "JetBrains Mono" },
  { value: "segoe", label: "Segoe UI" },
  { value: "open_sans", label: "Open Sans" },
  { value: "system", label: "Системный" },
];

const STAGE_KEYS = [
  { key: "category" as const, label: "Класс продукции" },
  { key: "hm_line" as const, label: "Линейка гидромодуля" },
  { key: "pu_line" as const, label: "Линейка НУ" },
  { key: "pu_subtype" as const, label: "Тип НУ" },
  { key: "simpel_series" as const, label: "Серии Simpel" },
] as const;

const HEADING_KEYS = [
  { key: "category" as const, label: "Класс продукции" },
  { key: "hm_line" as const, label: "Линейка ГМ" },
  { key: "pu_line" as const, label: "Линейка НУ" },
  { key: "pu_subtype" as const, label: "Тип НУ" },
] as const;

function apiUrl(siteSlug: string) {
  return `/api/admin/appearance?site=${encodeURIComponent(siteSlug)}`;
}

function ZoneCard({ zone, children }: { zone: AppearanceUiZone; children: React.ReactNode }) {
  const hint = manifestEntriesForZone(zone).map((e) => e.description).join(" · ");
  return (
    <Card className="card-industrial">
      <CardHeader>
        <CardTitle className="text-base">{APPEARANCE_ZONE_LABELS[zone]}</CardTitle>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function UploadField({
  label,
  hint,
  previewUrl,
  onUpload,
  saving,
}: {
  label: string;
  hint?: string;
  previewUrl?: string | null;
  onUpload: (f: File) => void;
  saving: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2">
      {label ? <Label>{label}</Label> : null}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <div className="flex min-h-[72px] items-center justify-center rounded border bg-muted/30 p-2">
        {previewUrl ? (
          <img src={previewUrl} alt="" className="max-h-20 object-contain" />
        ) : (
          <span className="text-xs text-muted-foreground">Не задано — на сайте пусто</span>
        )}
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*,.svg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onUpload(f);
          e.target.value = "";
        }}
      />
      <Button type="button" size="sm" variant="outline" disabled={saving} onClick={() => ref.current?.click()}>
        {previewUrl ? "Заменить" : "Загрузить"}
      </Button>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <input
          type="color"
          value={value}
          className="h-9 w-12 cursor-pointer rounded border"
          onChange={(e) => onChange(e.target.value)}
        />
        <Input value={value} className="font-mono text-sm" onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

export function AppearanceSiteEditor({ siteSlug }: { siteSlug: string }) {
  const { showNotification } = useToastNotification();
  const [app, setApp] = useState<AdminAppearance | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get<AdminAppearance>(apiUrl(siteSlug));
      const version = data.appearance_version ?? data.updated_at ?? null;
      setApp(bustAppearanceMediaUrls(data, version));
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { error?: string } } })?.response?.data?.error
        ?? "Ошибка загрузки внешнего вида";
      showNotification(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [siteSlug, showNotification]);

  useEffect(() => {
    void load();
  }, [load]);

  const mergeResponse = (data: AdminAppearance) => {
    const version = data.appearance_version ?? data.updated_at ?? null;
    setApp(bustAppearanceMediaUrls(data, version));
  };

  const save = async (patch: Record<string, unknown>) => {
    setSaving(true);
    try {
      const { data } = await axios.patch<AdminAppearance>(apiUrl(siteSlug), patch);
      mergeResponse(data);
      showNotification("Сохранено", "success");
    } catch {
      showNotification("Ошибка сохранения", "error");
    } finally {
      setSaving(false);
    }
  };

  const upload = async (field: string, file: File) => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append(field, file);
      const { data } = await axios.post<AdminAppearance>(apiUrl(siteSlug), fd);
      mergeResponse(data);
      showNotification("Файл загружен", "success");
    } catch {
      showNotification("Ошибка загрузки", "error");
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = async (preset: "strela" | "simpel") => {
    setApplyingPreset(preset);
    try {
      mergeResponse(await adminApplyBrandPreset(siteSlug, preset));
      showNotification(`Пресет «${preset}» применён`, "success");
    } catch {
      showNotification("Не удалось применить пресет", "error");
    } finally {
      setApplyingPreset(null);
    }
  };

  const patchStageTitle = (key: keyof SelectionStageTitles, field: "title" | "subtitle", value: string) => {
    setApp((a) => {
      if (!a) return a;
      const prev = a.selection_stage_titles ?? {};
      return {
        ...a,
        selection_stage_titles: { ...prev, [key]: { ...prev[key], [field]: value } },
      };
    });
  };

  if (loading) return <div className="p-4 text-sm text-muted-foreground">Загрузка…</div>;
  if (!app) return <div className="p-4 text-sm text-destructive">Не удалось загрузить данные</div>;

  const cardSettings: SelectionCardSettings = app.selection_card_settings ?? {};

  return (
    <div className="space-y-6 pb-8">
      {APPEARANCE_ZONE_ORDER.filter((z) => z !== "pdf").map((zone) => {
        if (zone === "colors") {
          return (
            <ZoneCard key={zone} zone={zone}>
              <p className="text-sm text-muted-foreground">
                Эти настройки применяются на публичных страницах подбора (категория, этапы воронки, «Работа»).
              </p>
              <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
                <ColorField label="Основной" value={app.primary_color} onChange={(v) => setApp((a) => (a ? { ...a, primary_color: v } : a))} />
                <ColorField label="Акцентный" value={app.accent_color} onChange={(v) => setApp((a) => (a ? { ...a, accent_color: v } : a))} />
                <ColorField
                  label="Фон страницы"
                  value={app.funnel_page_background_color ?? "#ffffff"}
                  onChange={(v) => setApp((a) => (a ? { ...a, funnel_page_background_color: v } : a))}
                />
                <ColorField
                  label="Фон карточек и сайдбара"
                  value={app.funnel_surface_color ?? "#ffffff"}
                  onChange={(v) => setApp((a) => (a ? { ...a, funnel_surface_color: v } : a))}
                />
                <ColorField
                  label="Фон зоны фото на карточке"
                  value={app.funnel_card_media_background_color ?? "#eff0f9"}
                  onChange={(v) => setApp((a) => (a ? { ...a, funnel_card_media_background_color: v } : a))}
                />
                <p className="col-span-full text-xs font-medium text-muted-foreground">Экран «Работа» (подбор установки)</p>
                <ColorField
                  label="Основной текст"
                  value={app.funnel_text_color ?? "#18181b"}
                  onChange={(v) => setApp((a) => (a ? { ...a, funnel_text_color: v } : a))}
                />
                <ColorField
                  label="Вторичный текст"
                  value={app.funnel_text_muted_color ?? "#71717a"}
                  onChange={(v) => setApp((a) => (a ? { ...a, funnel_text_muted_color: v } : a))}
                />
                <ColorField
                  label="Фон шапки панели"
                  value={app.funnel_panel_header_background_color ?? "#f4f4f5"}
                  onChange={(v) => setApp((a) => (a ? { ...a, funnel_panel_header_background_color: v } : a))}
                />
                <ColorField
                  label="Текст шапки панели"
                  value={app.funnel_panel_header_text_color ?? "#52525b"}
                  onChange={(v) => setApp((a) => (a ? { ...a, funnel_panel_header_text_color: v } : a))}
                />
                <ColorField
                  label="Фон кнопки «Подобрать»"
                  value={app.funnel_button_background_color || app.primary_color}
                  onChange={(v) =>
                    setApp((a) =>
                      a
                        ? {
                            ...a,
                            funnel_button_background_color:
                              v.toLowerCase() === (a.primary_color || "").toLowerCase() ? "" : v,
                          }
                        : a,
                    )
                  }
                />
                <ColorField
                  label="Текст основной кнопки"
                  value={app.funnel_button_text_color ?? "#ffffff"}
                  onChange={(v) => setApp((a) => (a ? { ...a, funnel_button_text_color: v } : a))}
                />
                <ColorField
                  label="Фон вторичной кнопки"
                  value={app.funnel_button_secondary_background_color || app.funnel_surface_color || "#ffffff"}
                  onChange={(v) =>
                    setApp((a) =>
                      a
                        ? {
                            ...a,
                            funnel_button_secondary_background_color:
                              v.toLowerCase() === (a.funnel_surface_color || "#ffffff").toLowerCase()
                                ? ""
                                : v,
                          }
                        : a,
                    )
                  }
                />
                <ColorField
                  label="Текст вторичной кнопки"
                  value={app.funnel_button_secondary_text_color || app.funnel_text_color || "#18181b"}
                  onChange={(v) =>
                    setApp((a) =>
                      a
                        ? {
                            ...a,
                            funnel_button_secondary_text_color:
                              v.toLowerCase() === (a.funnel_text_color || "#18181b").toLowerCase() ? "" : v,
                          }
                        : a,
                    )
                  }
                />
                <ColorField
                  label="Чередующиеся строки таблицы"
                  value={app.funnel_table_row_alt_background_color ?? "#f4f4f5"}
                  onChange={(v) => setApp((a) => (a ? { ...a, funnel_table_row_alt_background_color: v } : a))}
                />
                <ColorField
                  label="Выбранная строка таблицы"
                  value={app.funnel_table_row_selected_background_color ?? "#dbeafe"}
                  onChange={(v) => setApp((a) => (a ? { ...a, funnel_table_row_selected_background_color: v } : a))}
                />
                <div className="space-y-1.5">
                  <Label>Шрифт заголовков</Label>
                  <Select
                    value={app.funnel_font_heading ?? "oswald"}
                    onValueChange={(v) => setApp((a) => (a ? { ...a, funnel_font_heading: v as FunnelFontKey } : a))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FUNNEL_FONT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Шрифт текста</Label>
                  <Select
                    value={app.funnel_font_body ?? "jetbrains_mono"}
                    onValueChange={(v) => setApp((a) => (a ? { ...a, funnel_font_body: v as FunnelFontKey } : a))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FUNNEL_FONT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                disabled={saving}
                onClick={() =>
                  save({
                    primary_color: app.primary_color,
                    accent_color: app.accent_color,
                    funnel_page_background_color: app.funnel_page_background_color,
                    funnel_surface_color: app.funnel_surface_color,
                    funnel_card_media_background_color: app.funnel_card_media_background_color,
                    funnel_text_color: app.funnel_text_color,
                    funnel_text_muted_color: app.funnel_text_muted_color,
                    funnel_panel_header_background_color: app.funnel_panel_header_background_color,
                    funnel_panel_header_text_color: app.funnel_panel_header_text_color,
                    funnel_button_background_color: app.funnel_button_background_color ?? "",
                    funnel_button_text_color: app.funnel_button_text_color,
                    funnel_button_secondary_background_color: app.funnel_button_secondary_background_color ?? "",
                    funnel_button_secondary_text_color: app.funnel_button_secondary_text_color ?? "",
                    funnel_table_row_alt_background_color: app.funnel_table_row_alt_background_color,
                    funnel_table_row_selected_background_color: app.funnel_table_row_selected_background_color,
                    funnel_font_heading: app.funnel_font_heading,
                    funnel_font_body: app.funnel_font_body,
                  })
                }
              >
                Сохранить тему
              </Button>
            </ZoneCard>
          );
        }
        if (zone === "funnel_left") {
          return (
            <ZoneCard key={zone} zone={zone}>
              <UploadField label="Вертикальный wordmark" hint="Левая колонка воронки" previewUrl={app.funnel_sidebar_wordmark_url} saving={saving} onUpload={(f) => upload("funnel_sidebar_wordmark", f)} />
              <div className="max-w-md space-y-2">
                <Label>Текст под логотипом</Label>
                <Input value={app.sidebar_text} onChange={(e) => setApp((a) => (a ? { ...a, sidebar_text: e.target.value } : a))} />
                <Button disabled={saving} onClick={() => save({ sidebar_text: app.sidebar_text })}>Сохранить текст</Button>
              </div>
            </ZoneCard>
          );
        }
        if (zone === "funnel_header") {
          return (
            <ZoneCard key={zone} zone={zone}>
              <UploadField label="Логотип в шапке" previewUrl={app.selection_flow_header_logo_url} saving={saving} onUpload={(f) => upload("selection_flow_header_logo", f)} />
              <UploadField label="Общий логотип (запасной)" hint="Если шапка пуста" previewUrl={app.logo_url} saving={saving} onUpload={(f) => upload("logo", f)} />
            </ZoneCard>
          );
        }
        if (zone === "funnel_cards") {
          return (
            <ZoneCard key={zone} zone={zone}>
              <UploadField label="Значок на карточках" previewUrl={app.selection_card_caption_logo_url} saving={saving} onUpload={(f) => upload("selection_card_caption_logo", f)} />
              <div className="flex items-center gap-2">
                <Checkbox id="fw" checked={Boolean(app.selection_category_full_width)} onCheckedChange={(c) => setApp((a) => (a ? { ...a, selection_category_full_width: Boolean(c) } : a))} />
                <Label htmlFor="fw">Карточки класса на всю ширину</Label>
              </div>
              <Button variant="secondary" size="sm" disabled={saving} onClick={() => save({ selection_category_full_width: app.selection_category_full_width })}>Сохранить раскладку</Button>
              <div className="max-w-md space-y-3 border-t pt-4">
                <p className="text-sm font-medium">Размеры карточек</p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Ширина (px)</Label>
                  <Input type="number" min={200} max={520} value={cardSettings.card_width_px ?? SELECTION_MOCKUP_CARD_WIDTH_PX} onChange={(e) => setApp((a) => (a ? { ...a, selection_card_settings: { ...cardSettings, card_width_px: Number(e.target.value) || undefined } } : a))} />
                </div>
                <Button size="sm" variant="secondary" disabled={saving} onClick={() => save({ selection_card_settings: app.selection_card_settings })}>Сохранить настройки карточек</Button>
              </div>
            </ZoneCard>
          );
        }
        if (zone === "hm_cards") {
          return (
            <ZoneCard key={zone} zone={zone}>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {HYDROMODULE_LINE_ORDER.map((lineId) => (
                  <div key={lineId} className="rounded border p-2">
                    <p className="mb-2 text-sm font-medium">{HYDROMODULE_LINE_LABELS[lineId]}</p>
                    <UploadField label="" previewUrl={app.hydromodule_card_urls?.[lineId]} saving={saving} onUpload={(f) => upload(HYDROMODULE_CARD_FORM_FIELD[lineId], f)} />
                  </div>
                ))}
              </div>
            </ZoneCard>
          );
        }
        if (zone === "stage_texts") {
          return (
            <ZoneCard key={zone} zone={zone}>
              {STAGE_KEYS.map(({ key, label }) => (
                <div key={key}>
                  <p className="text-sm font-medium text-muted-foreground">{label}</p>
                  <div className="mt-2 grid max-w-2xl gap-2 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Заголовок</Label>
                      <Input className="mt-1" value={app.selection_stage_titles?.[key]?.title ?? ""} onChange={(e) => patchStageTitle(key, "title", e.target.value)} />
                    </div>
                    <div>
                      <Label className="text-xs">Подзаголовок</Label>
                      <Input className="mt-1" value={app.selection_stage_titles?.[key]?.subtitle ?? ""} onChange={(e) => patchStageTitle(key, "subtitle", e.target.value)} />
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="secondary" disabled={saving} onClick={() => save({ selection_stage_titles: app.selection_stage_titles ?? null })}>Сохранить заголовки воронки</Button>
              <div className="max-w-xl space-y-2 border-t pt-4">
                <p className="text-sm font-medium">Короткие заголовки</p>
                {HEADING_KEYS.map(({ key, label }) => (
                  <div key={key}>
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    <Input className="mt-1" value={app.stage_headings?.[key] ?? ""} onChange={(e) => setApp((a) => (a ? { ...a, stage_headings: { ...a.stage_headings, [key]: e.target.value } } : a))} />
                  </div>
                ))}
                <Button variant="secondary" disabled={saving} onClick={() => save({ stage_headings: app.stage_headings ?? null })}>Сохранить короткие заголовки</Button>
              </div>
            </ZoneCard>
          );
        }
        if (zone === "presets") {
          return (
            <ZoneCard key={zone} zone={zone}>
              <p className="text-sm text-muted-foreground">Копирует файлы selection-assets в поля витрины.</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={Boolean(applyingPreset)} onClick={() => applyPreset("strela")}>{applyingPreset === "strela" ? "…" : "Пресет Стрела"}</Button>
                <Button type="button" variant="secondary" disabled={Boolean(applyingPreset)} onClick={() => applyPreset("simpel")}>{applyingPreset === "simpel" ? "…" : "Пресет Simpel"}</Button>
              </div>
              <div className="max-w-xs space-y-2 pt-2">
                <Label>brand_key</Label>
                <Select value={app.brand_key === "simpel" ? "simpel" : "strela"} onValueChange={(v) => setApp((a) => (a ? { ...a, brand_key: v as "strela" | "simpel" } : a))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strela">Стрела</SelectItem>
                    <SelectItem value="simpel">Simpel</SelectItem>
                  </SelectContent>
                </Select>
                <Button disabled={saving} onClick={() => save({ brand_key: app.brand_key })}>Сохранить brand_key</Button>
              </div>
            </ZoneCard>
          );
        }
        return null;
      })}
    </div>
  );
}
