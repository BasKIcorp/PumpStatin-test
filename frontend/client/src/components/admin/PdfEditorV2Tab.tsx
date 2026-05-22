import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToastNotification } from "@/hooks/use-toast-notification";

const API_BASE = "/api/admin/pdf-templates2";

const ELEMENT_TYPES = [
  { type: "text",  label: "Текст",     icon: "T" },
  { type: "field", label: "Поле",      icon: "𝓕" },
  { type: "table", label: "Таблица",   icon: "⊞" },
  { type: "chart", label: "График",    icon: "📊" },
  { type: "image", label: "Изобр.",    icon: "🖼" },
  { type: "line",  label: "Линия",     icon: "—" },
];

interface PdfElement {
  id: string; type: string;
  x: number; y: number; w: number; h: number;
  props: Record<string, any>;
}

interface PageDef {
  id: string; background?: string;
  width: number; height: number;
  elements: PdfElement[];
}

interface TemplateDetail {
  id: number; key: string; name: string;
  pages: PageDef[]; is_published: boolean;
}

function useDrag(elRef: React.RefObject<HTMLDivElement | null>, onMove: (dx: number, dy: number) => void) {
  const pos = useRef({ x: 0, y: 0 });
  const onMouseDown = (e: React.MouseEvent) => {
    pos.current = { x: e.clientX, y: e.clientY };
    const onMove_ = (ev: MouseEvent) => {
      const dx = ev.clientX - pos.current.x;
      const dy = ev.clientY - pos.current.y;
      pos.current = { x: ev.clientX, y: ev.clientY };
      onMove(dx, dy);
    };
    const onUp = () => { window.removeEventListener("mousemove", onMove_); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove_);
    window.addEventListener("mouseup", onUp);
  };
  return { onMouseDown };
}

function PdfCanvas({ pages, selectedId, onSelect, onMoveElement, onResizeElement, onDrop }: {
  pages: PageDef[]; selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMoveElement: (id: string, dx: number, dy: number) => void;
  onResizeElement: (id: string, dw: number, dh: number) => void;
  onDrop: (type: string) => void;
}) {
  const page = pages[0] || { id: "p1", width: 595, height: 842, elements: [] };
  const scale = 0.6;
  const cw = page.width * scale;
  const ch = page.height * scale;

  return (
    <div
      className="relative bg-white shadow-md mx-auto"
      style={{ width: cw, height: ch }}
      onDragOver={e => e.preventDefault()}
      onDrop={e => {
        const type = e.dataTransfer.getData("text/plain");
        if (type) {
          const rect = (e.target as HTMLElement).closest('[class*="relative"]')?.getBoundingClientRect();
          if (rect) {
            const x = (e.clientX - rect.left) / scale;
            const y = (e.clientY - rect.top) / scale;
            // handled outside
          }
        }
      }}
    >
      {/* Background hint */}
      <div className="absolute inset-0 border border-gray-200 bg-gray-50 flex items-center justify-center text-muted-foreground text-xs">
        A4 {page.width}×{page.height} pt
      </div>

      {page.elements.map(el => (
        <DraggableElement key={el.id} el={el} scale={scale}
          isSelected={el.id === selectedId}
          onSelect={() => onSelect(el.id)}
          onMove={(dx, dy) => onMoveElement(el.id, dx / scale, dy / scale)}
          onResize={(dw, dh) => onResizeElement(el.id, dw / scale, dh / scale)}
        />
      ))}
    </div>
  );
}

function DraggableElement({ el, scale, isSelected, onSelect, onMove, onResize }: {
  el: PdfElement; scale: number; isSelected: boolean;
  onSelect: () => void; onMove: (dx: number, dy: number) => void; onResize: (dw: number, dh: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useDrag(ref, onMove);

  const handleResize = (corner: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    const start = { x: e.clientX, y: e.clientY };
    const onMove_ = (ev: MouseEvent) => {
      const dw = corner.includes("r") ? ev.clientX - start.x : corner.includes("l") ? start.x - ev.clientX : 0;
      const dh = corner.includes("b") ? ev.clientY - start.y : corner.includes("t") ? start.y - ev.clientY : 0;
      onResize(dw, dh);
    };
    const onUp = () => { window.removeEventListener("mousemove", onMove_); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove_);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div ref={ref} {...drag}
      onClick={e => { e.stopPropagation(); onSelect(); }}
      className={`absolute cursor-move border text-xs overflow-hidden ${isSelected ? "border-blue-500 bg-blue-50/50 ring-1 ring-blue-400" : "border-gray-300 hover:border-gray-400 bg-white/80"}`}
      style={{ left: el.x * scale, top: el.y * scale, width: (el.w || 100) * scale, height: (el.h || 30) * scale, zIndex: isSelected ? 10 : 1 }}
    >
      <div className="p-0.5 truncate font-medium text-[9px]">{ELEMENT_TYPES.find(t => t.type === el.type)?.label || el.type}</div>
      {el.props.content && <div className="truncate text-[8px] text-muted-foreground px-0.5">{el.props.content}</div>}
      {isSelected && <>
        <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full cursor-nw-resize" onMouseDown={handleResize("tl")} />
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full cursor-ne-resize" onMouseDown={handleResize("tr")} />
        <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-full cursor-sw-resize" onMouseDown={handleResize("bl")} />
        <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-full cursor-se-resize" onMouseDown={handleResize("br")} />
      </>}
    </div>
  );
}

function ElementPropEditor({ el, onChange }: { el: PdfElement; onChange: (e: PdfElement) => void }) {
  const update = (key: string, val: any) => onChange({ ...el, props: { ...el.props, [key]: val } });
  const coord = (key: string, val: number) => onChange({ ...el, [key]: Math.round(val) });
  return (
    <div className="space-y-2 text-xs">
      <Label>Содержимое (content)</Label>
      <Input value={el.props.content || ""} onChange={e => update("content", e.target.value)} placeholder={el.type === "field" ? "summary.price" : "Текст"} />
      <div className="grid grid-cols-2 gap-2">
        <div><Label>X</Label><Input type="number" value={el.x} onChange={e => coord("x", +e.target.value)} /></div>
        <div><Label>Y</Label><Input type="number" value={el.y} onChange={e => coord("y", +e.target.value)} /></div>
        <div><Label>W</Label><Input type="number" value={el.w || 100} onChange={e => coord("w", +e.target.value)} /></div>
        <div><Label>H</Label><Input type="number" value={el.h || 30} onChange={e => coord("h", +e.target.value)} /></div>
      </div>
      {el.type === "table" && <>
        <Label>dataSource</Label>
        <Input value={el.props.dataSource || ""} onChange={e => update("dataSource", e.target.value)} placeholder="equipment_spec" />
      </>}
      {el.type === "text" && <>
        <Label>Размер шрифта</Label>
        <Input type="number" value={el.props.fontSize || 12} onChange={e => update("fontSize", +e.target.value)} />
        <Label>Цвет (#rrggbb)</Label>
        <Input value={el.props.color || "#000000"} onChange={e => update("color", e.target.value)} placeholder="#000000" />
      </>}
      {el.type === "image" && <>
        <Label>dataSource / src</Label>
        <Input value={el.props.dataSource || ""} onChange={e => update("dataSource", e.target.value)} placeholder="logo / principialka" />
      </>}
    </div>
  );
}

export function PdfEditorV2Tab() {
  const { showNotification: toast } = useToastNotification();
  const [templates, setTemplates] = useState<any[]>([]);
  const [mode, setMode] = useState<"list" | "edit">("list");
  const [current, setCurrent] = useState<TemplateDetail | null>(null);
  const [pages, setPages] = useState<PageDef[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");

  const loadList = useCallback(async () => {
    try { const r = await fetch(API_BASE); if (r.ok) setTemplates(await r.json()); } catch {}
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const handleCreate = async () => {
    if (!newKey.trim() || !newName.trim()) return;
    const r = await fetch(API_BASE, { method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify({ key: newKey, name: newName, pages: [{ id: "p1", width: 595, height: 842, elements: [] }] }),
    });
    if (r.ok) { toast("Создан", "success"); setNewKey(""); setNewName(""); await loadList(); }
    else toast("Ошибка", "error");
  };

  const handlePublish = async (id: number) => {
    const r = await fetch(`${API_BASE}/${id}/publish/`, { method: "POST", headers: { "X-CSRFToken": getCsrf() } });
    if (r.ok) { toast("Опубликован", "success"); await loadList(); }
  };

  const handleOpenEdit = async (id: number) => {
    const r = await fetch(`${API_BASE}/${id}/`);
    if (!r.ok) { toast("Ошибка загрузки", "error"); return; }
    const data: TemplateDetail = await r.json();
    setCurrent(data);
    setPages(data.pages?.length ? data.pages : [{ id: "p1", width: 595, height: 842, elements: [] }]);
    setSelectedId(null);
    setMode("edit");
  };

  const handleSave = async () => {
    if (!current) return;
    const r = await fetch(`${API_BASE}/${current.id}/`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify({ pages }),
    });
    if (r.ok) { toast("Сохранено", "success"); await loadList(); }
    else toast("Ошибка", "error");
  };

  const addElement = (type: string) => {
    const el: PdfElement = {
      id: `el${Date.now()}`,
      type,
      x: 50, y: 50, w: type === "line" ? 200 : 150, h: type === "line" ? 2 : 30,
      props: { content: type === "text" ? "Текст" : type === "field" ? "summary.price" : "", dataSource: "" },
    };
    setPages(prev => prev.map(p => ({ ...p, elements: [...p.elements, el] })));
    setSelectedId(el.id);
  };

  const moveEl = (id: string, dx: number, dy: number) => {
    setPages(prev => prev.map(p => ({ ...p, elements: p.elements.map(e => e.id === id ? { ...e, x: e.x + dx, y: e.y + dy } : e) })));
  };

  const resizeEl = (id: string, dw: number, dh: number) => {
    setPages(prev => prev.map(p => ({ ...p, elements: p.elements.map(e => e.id === id ? { ...e, w: Math.max(10, (e.w || 100) + dw), h: Math.max(5, (e.h || 30) + dh) } : e) })));
  };

  const deleteElement = () => {
    if (!selectedId) return;
    setPages(prev => prev.map(p => ({ ...p, elements: p.elements.filter(e => e.id !== selectedId) })));
    setSelectedId(null);
  };

  const selectedEl = pages[0]?.elements.find(e => e.id === selectedId) || null;

  if (mode === "edit" && current) {
    return (
      <div className="flex gap-4 h-[calc(100vh-12rem)]">
        {/* Element palette */}
        <Card className="w-36 shrink-0 overflow-auto">
          <CardHeader><CardTitle className="text-sm">Элементы</CardTitle></CardHeader>
          <CardContent className="space-y-1 p-2">
            {ELEMENT_TYPES.map(et => (
              <div key={et.type} draggable onDragStart={e => e.dataTransfer.setData("text/plain", et.type)}
                onClick={() => addElement(et.type)}
                className="flex items-center gap-2 p-2 rounded border cursor-pointer text-xs hover:bg-accent"
              >
                <span>{et.icon}</span><span>{et.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Canvas */}
        <div className="flex-1 flex flex-col overflow-auto">
          <div className="flex gap-2 mb-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => setMode("list")}>← Назад</Button>
            <Button size="sm" onClick={handleSave}>Сохранить</Button>
            {selectedEl && <Button size="sm" variant="destructive" onClick={deleteElement}>Удалить</Button>}
            <span className="text-xs text-muted-foreground self-center ml-2">{current.name} ({current.key})</span>
          </div>
          <div className="flex-1 overflow-auto p-4 bg-gray-100 rounded-lg" onClick={() => setSelectedId(null)}>
            <PdfCanvas pages={pages} selectedId={selectedId} onSelect={setSelectedId}
              onMoveElement={moveEl} onResizeElement={resizeEl} onDrop={() => {}} />
          </div>
        </div>

        {/* Properties */}
        <Card className="w-60 shrink-0 overflow-auto">
          <CardHeader><CardTitle className="text-sm">Свойства</CardTitle></CardHeader>
          <CardContent>
            {selectedEl ? <ElementPropEditor el={selectedEl} onChange={c => setPages(prev => prev.map(p => ({ ...p, elements: p.elements.map(e => e.id === c.id ? c : e) })))} /> : <p className="text-xs text-muted-foreground">Выберите элемент на холсте</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="card-industrial">
        <CardHeader><CardTitle>Визуальный редактор PDF</CardTitle></CardHeader>
        <CardContent className="flex gap-2 max-w-lg items-end">
          <div className="flex-1"><Label>Ключ</Label><Input value={newKey} onChange={e => setNewKey(e.target.value)} placeholder="tkp-default" /></div>
          <div className="flex-1"><Label>Название</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="ТКП по умолчанию" /></div>
          <Button onClick={handleCreate} disabled={!newKey.trim()}>Создать</Button>
        </CardContent>
      </Card>
      <Card><CardHeader><CardTitle>Шаблоны</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr><th className="py-2 text-left">Ключ</th><th>Название</th><th>Статус</th><th>Действия</th></tr></thead>
            <tbody>
              {templates.map((t: any) => (
                <tr key={t.id} className="border-b hover:bg-muted/20">
                  <td className="py-2 font-mono text-xs">{t.key}</td>
                  <td className="py-2">{t.name}</td>
                  <td className="py-2">{t.is_published ? "✅" : "—"}</td>
                  <td className="py-2">
                    <Button size="sm" variant="outline" onClick={() => handleOpenEdit(t.id)}>Редактировать</Button>{" "}
                    {!t.is_published && <Button size="sm" variant="outline" onClick={() => handlePublish(t.id)}>Опубликовать</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function getCsrf(): string { const m = document.cookie.match(/csrftoken=([^;]+)/); return m ? m[1] : ""; }
