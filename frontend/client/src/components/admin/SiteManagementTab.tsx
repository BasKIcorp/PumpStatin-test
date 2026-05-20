import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToastNotification } from "@/hooks/use-toast-notification";

const SITES_API = "/api/admin/sites";
const LAYOUT_API = "/api/admin/page-layouts";

interface Site {
  id: number; slug: string; name: string; domain: string;
  pdf_template_key: string;
  page_layout_slug?: string;
  is_active: boolean;
  appearance_id: number | null;
  selection_data_flow_id: number | null;
  station_data_flow_id: number | null;
}

interface LayoutDetail {
  id: number; slug: string; name: string;
  components: any[]; grid: any; theme: any;
  is_active: boolean; revision: number;
}

const COMPONENT_TYPES = [
  { type: "input_field", label: "Поле ввода" },
  { type: "select_dropdown", label: "Список" },
  { type: "pump_table", label: "Таблица насосов" },
  { type: "station_result", label: "Результат" },
  { type: "chart_block", label: "График" },
  { type: "action_button", label: "Кнопка" },
  { type: "section_header", label: "Заголовок" },
  { type: "equipment_table", label: "Спецификация" },
];

export function SiteManagementTab() {
  const { showNotification: toast } = useToastNotification();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit state
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [editName, setEditName] = useState("");
  const [editDomain, setEditDomain] = useState("");
  const [editPdfKey, setEditPdfKey] = useState("");
  const [editPageLayoutSlug, setEditPageLayoutSlug] = useState("");

  // Layout state
  const [layout, setLayout] = useState<LayoutDetail | null>(null);
  const [layoutComponents, setLayoutComponents] = useState<any[]>([]);
  const [layoutJson, setLayoutJson] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");

  const loadSites = useCallback(async () => {
    setLoading(true);
    try { const r = await fetch(SITES_API); if (r.ok) setSites(await r.json()); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadSites(); }, [loadSites]);

  const loadLayoutForSite = async (siteSlug: string) => {
    const layoutSlug = `site-${siteSlug}`;
    try {
      const r = await fetch(`${LAYOUT_API}/?slug=${layoutSlug}`);
      if (r.ok) {
        const list = await r.json();
        const found = list.find((l: any) => l.slug === layoutSlug);
        if (found) {
          const rd = await fetch(`${LAYOUT_API}/${found.id}/`);
          if (rd.ok) {
            const data: LayoutDetail = await rd.json();
            setLayout(data);
            setLayoutComponents(data.components || []);
            setLayoutJson(JSON.stringify({ components: data.components, grid: data.grid, theme: data.theme }, null, 2));
            return;
          }
        }
      }
    } catch {}
    setLayout(null);
    setLayoutComponents([]);
    setLayoutJson(JSON.stringify({ components: [], grid: { columns: 12 }, theme: {} }, null, 2));
  };

  const handleSiteClick = async (site: Site) => {
    setEditingSite(site);
    setEditName(site.name);
    setEditDomain(site.domain);
    setEditPdfKey(site.pdf_template_key || "");
    setEditPageLayoutSlug(site.page_layout_slug?.trim() || "");
    await loadLayoutForSite(site.slug);
  };

  const handleSaveSite = async () => {
    if (!editingSite) return;
    const r = await fetch(`${SITES_API}/${editingSite.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify({
        name: editName,
        domain: editDomain,
        pdf_template_key: editPdfKey,
        page_layout_slug: editPageLayoutSlug.trim(),
      }),
    });
    if (r.ok) { toast("Сайт сохранён", "success"); await loadSites(); }
    else toast("Ошибка", "error");
  };

  const handleSaveLayout = async () => {
    if (!editingSite) return;
    const layoutSlug = `site-${editingSite.slug}`;
    try {
      const parsed = JSON.parse(layoutJson);
      const payload = {
        slug: layoutSlug,
        name: `Макет сайта ${editingSite.slug}`,
        components: parsed.components || [],
        grid: parsed.grid || {},
        theme: parsed.theme || {},
      };

      if (layout?.id) {
        const r = await fetch(`${LAYOUT_API}/${layout.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
          body: JSON.stringify({ components: payload.components, grid: payload.grid, theme: payload.theme }),
        });
        if (r.ok) { toast("Макет сохранён", "success"); setLayoutComponents(payload.components); }
        else toast("Ошибка сохранения макета", "error");
      } else {
        const r = await fetch(LAYOUT_API, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
          body: JSON.stringify(payload),
        });
        if (r.ok) { toast("Макет создан", "success"); const data = await r.json(); setLayout({ id: data.id, ...payload, is_active: false, revision: 1 }); setLayoutComponents(payload.components); }
        else toast("Ошибка создания макета", "error");
      }
    } catch { toast("Ошибка JSON", "error"); }
  };

  const addComponent = (type: string) => {
    const ct = COMPONENT_TYPES.find(t => t.type === type);
    const newComp = { id: `c${Date.now()}`, type, position: { x: 0, y: 0, w: 6, h: 1 }, props: { label: ct?.label || type, fieldKey: "" } };
    const updated = [...layoutComponents, newComp];
    setLayoutComponents(updated);
    setLayoutJson(JSON.stringify({ components: updated, grid: { columns: 12 }, theme: {} }, null, 2));
  };

  const removeComponent = (id: string) => {
    const updated = layoutComponents.filter((c: any) => c.id !== id);
    setLayoutComponents(updated);
    setLayoutJson(JSON.stringify({ components: updated, grid: { columns: 12 }, theme: {} }, null, 2));
  };

  const backToList = () => {
    setEditingSite(null);
    setLayout(null);
  };

  if (editingSite) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={backToList}>← Все сайты</Button>
          <Button size="sm" onClick={handleSaveSite}>Сохранить сайт</Button>
          <span className="text-sm font-medium ml-2">{editingSite.name} ({editingSite.slug})</span>
        </div>

        {/* Site settings */}
        <Card>
          <CardHeader><CardTitle>Настройки сайта</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 max-w-lg">
            <div><Label>Название</Label><Input value={editName} onChange={e => setEditName(e.target.value)} /></div>
            <div><Label>Домен</Label><Input value={editDomain} onChange={e => setEditDomain(e.target.value)} placeholder="example.com" /></div>
            <div><Label>PDF шаблон (key)</Label><Input value={editPdfKey} onChange={e => setEditPdfKey(e.target.value)} placeholder="tkp-default" /></div>
            <div className="col-span-2 max-w-xl">
              <Label>Slug макета этапа «Работа»</Label>
              <Input
                value={editPageLayoutSlug}
                onChange={e => setEditPageLayoutSlug(e.target.value)}
                placeholder="например default-selection-work или slug из Дизайн → Макет страницы подбора"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Пусто — общий порядок резолва по API <code className="text-[10px]">/api/page-layout/resolve/</code>.
              </p>
            </div>
            <div><Label>Appearance ID</Label><Input value={editingSite.appearance_id || ""} disabled placeholder="Создайте через Дизайн → Внешний вид" /></div>
          </CardContent>
        </Card>

        {/* Page layout editor */}
        <Card>
          <CardHeader>
            <CardTitle>Макет страницы подбора</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              {COMPONENT_TYPES.map(ct => (
                <Button key={ct.type} size="sm" variant="outline" onClick={() => addComponent(ct.type)}>
                  + {ct.label}
                </Button>
              ))}
            </div>

            {layoutComponents.length > 0 ? (
              <div className="border rounded-lg divide-y max-h-60 overflow-auto">
                {layoutComponents.map((comp: any, i: number) => (
                  <div key={comp.id} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-accent/30">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
                      <span className="font-medium">{COMPONENT_TYPES.find(t => t.type === comp.type)?.label || comp.type}</span>
                      {comp.props.label && <span className="text-muted-foreground text-xs">— {comp.props.label}</span>}
                      {comp.props.fieldKey && <code className="text-[10px] bg-muted px-1 rounded">{comp.props.fieldKey}</code>}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-xs"
                        onClick={() => {
                          const c = [...layoutComponents];
                          if (i > 0) { [c[i-1], c[i]] = [c[i], c[i-1]]; setLayoutComponents(c); }
                        }} disabled={i === 0}>↑</Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-xs"
                        onClick={() => {
                          const c = [...layoutComponents];
                          if (i < c.length - 1) { [c[i], c[i+1]] = [c[i+1], c[i]]; setLayoutComponents(c); }
                        }} disabled={i === layoutComponents.length - 1}>↓</Button>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-xs text-red-500"
                        onClick={() => removeComponent(comp.id)}>✕</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">Макет пуст. Добавьте компоненты кнопками выше.</p>
            )}

            <div>
              <Label>JSON макета (редактирование)</Label>
              <Textarea value={layoutJson} onChange={e => setLayoutJson(e.target.value)} className="font-mono text-xs min-h-[200px]" />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveLayout}>Сохранить макет</Button>
              {layout?.id && (
                <Button variant="outline" onClick={async () => {
                  setLayoutComponents([]);
                  setLayoutJson(JSON.stringify({ components: [], grid: { columns: 12 }, theme: {} }, null, 2));
                  toast("Макет сброшен. Сохраните чтобы применить.", "info");
                }}>
                  Сбросить к дефолту
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Сайты</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p>Загрузка...</p> : (
            <table className="w-full text-sm">
              <thead><tr className="text-left border-b"><th className="py-2 pr-2">Slug</th><th className="py-2 pr-2">Название</th><th className="py-2 pr-2">Домен</th><th className="py-2 pr-2">Статус</th><th className="py-2 pr-2">Действия</th></tr></thead>
              <tbody>
                {sites.map(s => (
                  <tr key={s.id} className="border-b hover:bg-muted/20">
                    <td className="py-2 font-mono text-xs">{s.slug}</td>
                    <td className="py-2">{s.name}</td>
                    <td className="py-2 text-xs text-muted-foreground">{s.domain || "—"}</td>
                    <td className="py-2">{s.is_active ? "✅" : "—"}</td>
                    <td className="py-2">
                      <Button size="sm" variant="outline" onClick={() => handleSiteClick(s)}>
                        Редактировать
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getCsrf(): string { const m = document.cookie.match(/csrftoken=([^;]+)/); return m ? m[1] : ""; }
