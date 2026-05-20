/**
 * White-Label Manager — единый раздел для настройки витрин.
 * Левая панель: список витрин + создание.
 * Правая панель: вкладки «Внешний вид», «Страница подбора», «PDF».
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { PdfConstructorTab } from "@/components/admin/PdfConstructorTab";
import { PageLayoutEditorTab } from "@/components/admin/PageLayoutEditorTab";
import { AppearanceSiteEditor } from "@/components/admin/AppearanceSiteEditor";
import axios from "@/lib/csrf";
import type { AdminAppearance } from "@/lib/api";
import { formatApiError } from "@/lib/api-error";
import { bustAppearanceMediaUrls } from "@/lib/appearanceMedia";
import { ADMIN_PRESENTATION } from "@/config/adminPresentation";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Site {
  id: number;
  slug: string;
  name: string;
  domain: string;
  is_active: boolean;
  appearance_id: number | null;
  page_layout_slug: string;
}

type ActiveTab = "appearance" | "layout" | "pdf";

const SITES_API = "/api/admin/sites";
const TABS: { id: ActiveTab; label: string }[] = [
  { id: "appearance", label: "Внешний вид" },
  { id: "layout",     label: "Страница подбора" },
  { id: "pdf",        label: "PDF" },
];

function getVisibleWhiteLabelTabs() {
  return TABS.filter(
    (t) => !(ADMIN_PRESENTATION.hideWhiteLabelLayoutTab && t.id === "layout"),
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ColorSwatch({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-4 h-4 rounded-sm border border-border align-middle mr-1.5"
      style={{ background: color }}
    />
  );
}

function AppearancePdfLogos({ siteSlug }: { siteSlug: string }) {
  const { showNotification } = useToastNotification();
  const [app, setApp] = useState<AdminAppearance | null>(null);
  const [saving, setSaving] = useState(false);
  const cpRef = useRef<HTMLInputElement>(null);
  const techRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    axios
      .get<AdminAppearance>(`/api/admin/appearance?site=${encodeURIComponent(siteSlug)}`)
      .then(({ data }) => {
        const v = data.appearance_version ?? data.updated_at ?? null;
        setApp(bustAppearanceMediaUrls(data, v));
      })
      .catch(() => showNotification("Ошибка загрузки PDF-логотипов", "error"));
  }, [siteSlug, showNotification]);

  const upload = async (field: string, file: File) => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append(field, file);
      const { data } = await axios.post<AdminAppearance>(
        `/api/admin/appearance?site=${encodeURIComponent(siteSlug)}`,
        fd,
      );
      const v = data.appearance_version ?? data.updated_at ?? null;
      setApp(bustAppearanceMediaUrls(data, v));
      showNotification("Логотип PDF обновлён", "success");
    } catch (e) {
      showNotification({
        title: "Ошибка загрузки",
        description: formatApiError(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="card-industrial mb-4">
      <CardHeader>
        <CardTitle className="text-base">Логотипы PDF</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Логотип КП (2-й лист)</Label>
          {app?.cp_logo_url ? (
            <img src={app.cp_logo_url} alt="" className="h-12 object-contain rounded border p-1" />
          ) : null}
          <input ref={cpRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload("cp_logo", f);
          }} />
          <Button size="sm" variant="outline" disabled={saving} onClick={() => cpRef.current?.click()}>
            Загрузить КП
          </Button>
        </div>
        <div className="space-y-2">
          <Label>Логотип тех. листа</Label>
          {app?.tech_specs_logo_url ? (
            <img src={app.tech_specs_logo_url} alt="" className="h-12 object-contain rounded border p-1" />
          ) : null}
          <input ref={techRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload("tech_specs_logo", f);
          }} />
          <Button size="sm" variant="outline" disabled={saving} onClick={() => techRef.current?.click()}>
            Загрузить тех. лист
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function duplicateAppearanceIds(sites: Site[]): Set<number> {
  const counts = new Map<number, number>();
  for (const s of sites) {
    if (s.appearance_id != null) {
      counts.set(s.appearance_id, (counts.get(s.appearance_id) ?? 0) + 1);
    }
  }
  return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([id]) => id));
}

// ─── LayoutPanel ─────────────────────────────────────────────────────────────

function LayoutPanel({ site, onSiteUpdate }: { site: Site; onSiteUpdate: () => void }) {
  const { showNotification } = useToastNotification();
  const [layoutSlug, setLayoutSlug] = useState(site.page_layout_slug || "");
  const [saving, setSaving] = useState(false);

  const assignLayout = async () => {
    setSaving(true);
    try {
      await axios.patch(`/api/admin/sites/${site.id}/`, { page_layout_slug: layoutSlug });
      showNotification("Макет назначен", "success");
      onSiteUpdate();
    } catch (e) {
      showNotification({
        title: "Не удалось назначить макет",
        description: formatApiError(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="card-industrial">
        <CardHeader>
          <CardTitle className="text-base">Текущий макет страницы подбора</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Slug макета, который используется для витрины <code className="font-mono text-xs bg-muted px-1 rounded">{site.slug}</code>.
            Пусто — используется макет по умолчанию.
          </p>
          <div className="flex items-center gap-2">
            <Input
              value={layoutSlug}
              onChange={e => setLayoutSlug(e.target.value)}
              placeholder="Slug макета (напр.: site-client-a)"
              className="max-w-xs font-mono text-sm"
            />
            <Button onClick={assignLayout} disabled={saving} size="sm">
              Назначить
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="card-industrial">
        <CardHeader>
          <CardTitle className="text-base">Редактор макетов</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <PageLayoutEditorTab />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── CreateSiteForm ───────────────────────────────────────────────────────────

function CreateSiteForm({ onCreate }: { onCreate: (slug: string) => void }) {
  const { showNotification } = useToastNotification();
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!slug.trim() || !name.trim()) {
      showNotification("Заполните slug и название", "error");
      return;
    }
    setSaving(true);
    try {
      const normalizedSlug = slug.trim().toLowerCase();
      await axios.post(SITES_API, {
        slug: normalizedSlug,
        name: name.trim(),
        domain: domain.trim(),
        clone_appearance_from: "default",
        page_layout_slug: `site-${normalizedSlug}`,
      });
      showNotification(`Витрина «${normalizedSlug}» создана`, "success");
      onCreate(normalizedSlug);
      setSlug(""); setName(""); setDomain(""); setOpen(false);
    } catch (e) {
      showNotification({
        title: "Ошибка создания витрины",
        description: formatApiError(e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <Button size="sm" variant="outline" className="w-full" onClick={() => setOpen(true)}>
        + Новая витрина
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
      <p className="text-xs font-semibold text-primary">Новая витрина</p>
      <Input placeholder="slug (латиница, -)" value={slug} onChange={e => setSlug(e.target.value)} className="font-mono text-sm h-8" />
      <Input placeholder="Название" value={name} onChange={e => setName(e.target.value)} className="text-sm h-8" />
      <Input placeholder="Домен (напр.: client.site.ru)" value={domain} onChange={e => setDomain(e.target.value)} className="text-sm h-8" />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleCreate} disabled={saving} className="flex-1">Создать</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Отмена</Button>
      </div>
    </div>
  );
}

// ─── WhiteLabelManagerTab ────────────────────────────────────────────────────

export function WhiteLabelManagerTab() {
  const visibleTabs = getVisibleWhiteLabelTabs();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("appearance");

  useEffect(() => {
    if (ADMIN_PRESENTATION.hideWhiteLabelLayoutTab && activeTab === "layout") {
      setActiveTab("appearance");
    }
  }, [activeTab]);

  const loadSites = useCallback(async () => {
    try {
      const { data } = await axios.get<Site[]>(SITES_API);
      setSites(data);
      if (!selectedSlug && data.length > 0) setSelectedSlug(data[0].slug);
    } catch {
      /* список витрин недоступен без сессии staff */
    }
    setLoading(false);
  }, [selectedSlug]);

  useEffect(() => { loadSites(); }, []);

  const selectedSite = sites.find(s => s.slug === selectedSlug) ?? null;
  const sharedAppearanceIds = duplicateAppearanceIds(sites);

  const handleCreate = (slug: string) => {
    loadSites();
    setSelectedSlug(slug);
  };

  return (
    <div className="flex gap-0 min-h-[600px]">
      {/* ── Левая панель: список витрин ── */}
      <div className="w-56 flex-shrink-0 border-r border-border pr-0 flex flex-col gap-1 pt-1 pb-4 px-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1">Витрины</p>

        {loading ? (
          <div className="text-xs text-muted-foreground px-1">Загрузка…</div>
        ) : (
          sites.map(site => (
            <button
              key={site.slug}
              onClick={() => { setSelectedSlug(site.slug); setActiveTab("appearance"); }}
              className={cn(
                "w-full text-left px-2 py-2 rounded-md text-sm transition-colors",
                selectedSlug === site.slug
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted text-foreground",
              )}
            >
              <div className="font-medium truncate">{site.name || site.slug}</div>
              <div className={cn("text-xs truncate", selectedSlug === site.slug ? "text-primary-foreground/70" : "text-muted-foreground")}>
                {site.domain || `/${site.slug}`}
              </div>
              {site.appearance_id != null && (
                <div className={cn("text-[10px] font-mono mt-0.5", selectedSlug === site.slug ? "text-primary-foreground/60" : "text-muted-foreground")}>
                  appearance #{site.appearance_id}
                </div>
              )}
              {site.appearance_id != null && sharedAppearanceIds.has(site.appearance_id) && (
                <Badge variant="destructive" className="text-[10px] px-1 py-0 mt-0.5">общий appearance</Badge>
              )}
              {!site.is_active && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 mt-0.5">неактивна</Badge>
              )}
            </button>
          ))
        )}

        <div className="mt-3">
          <CreateSiteForm onCreate={handleCreate} />
        </div>
      </div>

      {/* ── Правая панель: редакторы ── */}
      <div className="flex-1 min-w-0 pl-4">
        {selectedSite ? (
          <>
            {/* Заголовок */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-semibold">{selectedSite.name || selectedSite.slug}</h2>
              {selectedSite.domain && (
                <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                  {selectedSite.domain}
                </span>
              )}
              <span className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded">
                slug: {selectedSite.slug}
              </span>
              {selectedSite.appearance_id != null && (
                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                  appearance #{selectedSite.appearance_id}
                </span>
              )}
              {selectedSite.appearance_id != null && sharedAppearanceIds.has(selectedSite.appearance_id) && (
                <Badge variant="destructive">Общий appearance с другой витриной</Badge>
              )}
            </div>

            {/* Вкладки */}
            <div className="flex gap-1 mb-5 border-b border-border pb-2">
              {visibleTabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={cn(
                    "px-4 py-1.5 text-sm rounded-t-md transition-colors",
                    activeTab === t.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Контент вкладок */}
            {activeTab === "appearance" && (
              <AppearanceSiteEditor key={selectedSite.slug} siteSlug={selectedSite.slug} />
            )}
            {activeTab === "layout" && !ADMIN_PRESENTATION.hideWhiteLabelLayoutTab && (
              <LayoutPanel key={selectedSite.slug} site={selectedSite} onSiteUpdate={loadSites} />
            )}
            {activeTab === "pdf" && (
              <>
                <AppearancePdfLogos key={`${selectedSite.slug}-pdf-logos`} siteSlug={selectedSite.slug} />
                <PdfConstructorTab key={selectedSite.slug} siteSlug={selectedSite.slug} />
              </>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            {loading ? "Загрузка…" : "Выберите витрину слева"}
          </div>
        )}
      </div>
    </div>
  );
}
