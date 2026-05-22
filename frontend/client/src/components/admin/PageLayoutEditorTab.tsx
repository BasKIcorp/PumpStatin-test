import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToastNotification } from "@/hooks/use-toast-notification";
import {
  SELECTION_WORK_CANVAS,
  WORK_SLOT_COMPONENT_TYPES,
  defaultAbsoluteGrid,
  type SelectionWorkSlotType,
} from "@/lib/selectionLayoutCanvas";
import { SelectionWorkSlotPreview } from "@/components/admin/selectionWorkPreviewMocks";

const API_BASE = "/api/admin/page-layouts";
const DND_TYPE = "application/x-pump-work-slot";

interface ComponentDef {
  id: string;
  type: string;
  position: { x: number; y: number; w: number; h: number };
  props: Record<string, unknown>;
}

interface LayoutDetail {
  id: number;
  slug: string;
  name: string;
  description: string;
  grid: Record<string, unknown>;
  components: ComponentDef[];
  theme: Record<string, unknown>;
  is_active: boolean;
  revision: number;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function CanvasBlock({
  comp,
  canvasW,
  canvasH,
  selected,
  onSelect,
  onPositionChange,
}: {
  comp: ComponentDef;
  canvasW: number;
  canvasH: number;
  selected: boolean;
  onSelect: () => void;
  onPositionChange: (patch: Partial<ComponentDef["position"]>) => void;
}) {
  const dragRef = useRef<{ mode: "move" | "resize"; sx: number; sy: number; px: number; py: number; pw: number; ph: number } | null>(
    null,
  );

  const meta = WORK_SLOT_COMPONENT_TYPES.find((w) => w.type === comp.type);
  const label = ((comp.props.label as string) || meta?.label || comp.type).trim();
  const slotType = (
    WORK_SLOT_COMPONENT_TYPES.some((w) => w.type === comp.type) ? comp.type : meta?.type ?? "work_pump_search"
  ) as SelectionWorkSlotType;

  const onPointerDownMove = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      mode: "move",
      sx: e.clientX,
      sy: e.clientY,
      px: comp.position.x,
      py: comp.position.y,
      pw: comp.position.w,
      ph: comp.position.h,
    };
    onSelect();
  };

  const onPointerDownResize = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      mode: "resize",
      sx: e.clientX,
      sy: e.clientY,
      px: comp.position.x,
      py: comp.position.y,
      pw: comp.position.w,
      ph: comp.position.h,
    };
    onSelect();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (d.mode === "move") {
      const nx = clamp(d.px + dx, 0, canvasW - d.pw);
      const ny = clamp(d.py + dy, 0, canvasH - d.ph);
      onPositionChange({ x: round2(nx), y: round2(ny) });
    } else {
      const nw = clamp(d.pw + dx, 80, canvasW - d.px);
      const nh = clamp(d.ph + dy, 48, canvasH - d.py);
      onPositionChange({ w: round2(nw), h: round2(nh) });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  };

  const headerDragProps = {
    onPointerDown: onPointerDownMove,
    onPointerMove: onPointerMove,
    onPointerUp: onPointerUp,
    onPointerCancel: onPointerUp,
  };

  const st: React.CSSProperties = {
    position: "absolute",
    left: comp.position.x,
    top: comp.position.y,
    width: comp.position.w,
    height: comp.position.h,
    boxSizing: "border-box",
  };

  return (
    <div
      style={st}
      className={`relative overflow-hidden rounded-lg ${selected ? "ring-2 ring-primary ring-offset-2 ring-offset-white" : "shadow-sm ring-1 ring-zinc-300/90"}`}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <div className="pointer-events-auto h-full min-h-0">
        <SelectionWorkSlotPreview slotType={slotType} title={label} headerDragProps={headerDragProps} />
      </div>
      {selected && (
        <div
          className="absolute bottom-0.5 right-0.5 z-30 h-3 w-3 cursor-se-resize rounded-sm bg-primary shadow"
          onPointerDown={onPointerDownResize}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
      )}
    </div>
  );
}

function PropEditor({
  comp,
  canvasW,
  canvasH,
  onChange,
}: {
  comp: ComponentDef;
  canvasW: number;
  canvasH: number;
  onChange: (c: ComponentDef) => void;
}) {
  const meta = WORK_SLOT_COMPONENT_TYPES.find((w) => w.type === comp.type);
  const upd = (patch: Partial<ComponentDef["position"]>) => {
    const next = { ...comp.position, ...patch };
    next.w = clamp(next.w, 80, canvasW - next.x);
    next.h = clamp(next.h, 48, canvasH - next.y);
    next.x = clamp(next.x, 0, canvasW - next.w);
    next.y = clamp(next.y, 0, canvasH - next.h);
    onChange({ ...comp, position: next });
  };
  const pu = (key: string, val: unknown) =>
    onChange({ ...comp, props: { ...comp.props, [key]: val } });

  return (
    <div className="space-y-3">
      <Label>Подпись в редакторе</Label>
      <Input
        value={(comp.props.label as string) || ""}
        onChange={(e) => pu("label", e.target.value)}
        placeholder={meta?.label || ""}
      />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">X (px)</Label>
          <Input
            type="number"
            step={1}
            value={Math.round(comp.position.x)}
            onChange={(e) => upd({ x: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Y (px)</Label>
          <Input
            type="number"
            step={1}
            value={Math.round(comp.position.y)}
            onChange={(e) => upd({ y: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Ширина</Label>
          <Input
            type="number"
            step={1}
            value={Math.round(comp.position.w)}
            onChange={(e) => upd({ w: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label className="text-xs">Высота</Label>
          <Input
            type="number"
            step={1}
            value={Math.round(comp.position.h)}
            onChange={(e) => upd({ h: Number(e.target.value) })}
          />
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Канва {canvasW}×{canvasH} px. Перетаскивание — за шапку карточки (как на сайте). Координаты совпадают с
        этапом «Работа» на десктопе. Превью статичное (типовые поля и подписи).
      </p>
    </div>
  );
}

export function PageLayoutEditorTab() {
  const { showNotification: toast } = useToastNotification();
  const [layouts, setLayouts] = useState<any[]>([]);
  const [mode, setMode] = useState<"list" | "edit">("list");
  const [current, setCurrent] = useState<LayoutDetail | null>(null);
  const [components, setComponents] = useState<ComponentDef[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const canvasRef = useRef<HTMLDivElement>(null);

  const cw =
    Number((current?.grid as { canvasWidth?: number })?.canvasWidth) || SELECTION_WORK_CANVAS.width;
  const ch =
    Number((current?.grid as { canvasHeight?: number })?.canvasHeight) || SELECTION_WORK_CANVAS.height;

  const loadList = useCallback(async () => {
    try {
      const r = await fetch(API_BASE);
      if (r.ok) setLayouts(await r.json());
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const handleCreate = async () => {
    if (!newSlug.trim() || !newName.trim()) return;
    const grid = defaultAbsoluteGrid();
    const r = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify({
        slug: newSlug,
        name: newName,
        components: [],
        grid,
        theme: {},
      }),
    });
    if (r.ok) {
      toast("Создан", "success");
      setNewSlug("");
      setNewName("");
      await loadList();
    } else toast("Ошибка", "error");
  };

  const handlePublish = async (id: number) => {
    const r = await fetch(`${API_BASE}/${id}/publish/`, {
      method: "POST",
      headers: { "X-CSRFToken": getCsrf() },
    });
    if (r.ok) {
      toast("Опубликован", "success");
      await loadList();
    }
  };

  const handleOpenEdit = async (id: number) => {
    const r = await fetch(`${API_BASE}/${id}/`);
    if (!r.ok) {
      toast("Ошибка загрузки", "error");
      return;
    }
    const data: LayoutDetail = await r.json();
    let grid = data.grid && typeof data.grid === "object" ? { ...data.grid } : {};
    if (!(grid as { absolute?: boolean }).absolute) {
      grid = { ...defaultAbsoluteGrid(), ...grid, absolute: true };
    }
    setCurrent({ ...data, grid });
    const comps = data.components || [];
    const migrated = comps.map((c, i) => {
      const pos = c.position || { x: 0, y: 0, w: 280, h: 160 };
      const hasGeom =
        typeof pos.x === "number" &&
        typeof pos.y === "number" &&
        pos.x >= 0 &&
        pos.y >= 0 &&
        (pos.x > 12 || pos.y > 12 || i === 0);
      if (hasGeom && pos.x !== undefined) return { ...c, position: { ...pos, w: pos.w || 280, h: pos.h || 160 } };
      const meta = WORK_SLOT_COMPONENT_TYPES.find((w) => w.type === c.type);
      const stagger = i * 24;
      return {
        ...c,
        position: {
          x: 24 + stagger,
          y: 24 + stagger,
          w: meta?.defaultW ?? 320,
          h: meta?.defaultH ?? 200,
        },
      };
    });
    setComponents(migrated);
    setSelectedId(null);
    setMode("edit");
  };

  const handleSave = async () => {
    if (!current) return;
    const r = await fetch(`${API_BASE}/${current.id}/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRFToken": getCsrf() },
      body: JSON.stringify({
        components,
        grid: { ...defaultAbsoluteGrid(), ...current.grid, absolute: true },
        theme: current.theme,
      }),
    });
    if (r.ok) {
      toast("Сохранено", "success");
      await loadList();
    } else toast("Ошибка", "error");
  };

  const addComponent = (slotType: SelectionWorkSlotType, clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const meta = WORK_SLOT_COMPONENT_TYPES.find((w) => w.type === slotType)!;
    let x = 32;
    let y = 32;
    if (rect) {
      x = clamp(clientX - rect.left - meta.defaultW / 2, 0, cw - meta.defaultW);
      y = clamp(clientY - rect.top - meta.defaultH / 2, 0, ch - meta.defaultH);
    }
    const exists = components.some((c) => c.type === slotType);
    if (exists) {
      toast("Этот блок уже добавлен", "error");
      return;
    }
    const newComp: ComponentDef = {
      id: `c${Date.now()}`,
      type: slotType,
      position: { x: round2(x), y: round2(y), w: meta.defaultW, h: meta.defaultH },
      props: { label: meta.label, slotKey: slotType },
    };
    setComponents((prev) => [...prev, newComp]);
    setSelectedId(newComp.id);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setComponents((prev) => prev.filter((c) => c.id !== selectedId));
    setSelectedId(null);
  };

  const selectedComp = components.find((c) => c.id === selectedId) || null;

  if (mode === "edit" && current) {
    return (
      <div className="flex gap-4">
        <Card className="w-52 shrink-0 overflow-auto">
          <CardHeader>
            <CardTitle className="text-sm">Блоки этапа «Работа»</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2">
            <p className="mb-2 text-[10px] text-muted-foreground">
              Перетащите на канву. Каждый тип — один экземпляр.
            </p>
            {WORK_SLOT_COMPONENT_TYPES.map((ct) => (
              <div
                key={ct.type}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(DND_TYPE, ct.type);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                className="flex cursor-grab items-center gap-2 rounded border p-2 text-xs hover:bg-accent active:cursor-grabbing"
              >
                <span>{ct.icon}</span>
                <span>{ct.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="mb-2 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setMode("list")}>
              ← Назад
            </Button>
            <Button size="sm" onClick={handleSave}>
              Сохранить
            </Button>
            <span className="self-center text-xs text-muted-foreground">
              {current.name} ({current.slug})
            </span>
          </div>

          <div
            ref={canvasRef}
            className="relative mx-auto rounded-lg border-2 border-dashed border-border bg-muted/40"
            style={{ width: cw, height: ch }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }}
            onDrop={(e) => {
              e.preventDefault();
              const t = e.dataTransfer.getData(DND_TYPE) as SelectionWorkSlotType;
              if (t && WORK_SLOT_COMPONENT_TYPES.some((w) => w.type === t)) addComponent(t, e.clientX, e.clientY);
            }}
            onClick={() => setSelectedId(null)}
          >
            {components.length === 0 && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Перетащите блоки из палитры
              </div>
            )}
            {components.map((comp) => (
              <CanvasBlock
                key={comp.id}
                comp={comp}
                canvasW={cw}
                canvasH={ch}
                selected={comp.id === selectedId}
                onSelect={() => setSelectedId(comp.id)}
                onPositionChange={(patch) =>
                  setComponents((prev) =>
                    prev.map((p) =>
                      p.id === comp.id ? { ...p, position: { ...p.position, ...patch } } : p,
                    ),
                  )
                }
              />
            ))}
          </div>

          {selectedComp && (
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="destructive" onClick={deleteSelected}>
                Удалить блок
              </Button>
            </div>
          )}
        </div>

        <Card className="w-64 shrink-0 overflow-auto">
          <CardHeader>
            <CardTitle className="text-sm">Свойства</CardTitle>
          </CardHeader>
          <CardContent>
            {selectedComp ? (
              <PropEditor
                comp={selectedComp}
                canvasW={cw}
                canvasH={ch}
                onChange={(c) => setComponents((prev) => prev.map((p) => (p.id === c.id ? c : p)))}
              />
            ) : (
              <p className="text-xs text-muted-foreground">Выберите блок на канве</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="card-industrial">
        <CardHeader>
          <CardTitle>Макет страницы подбора (этап «Работа»)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="max-w-2xl text-sm text-muted-foreground">
            Опубликуйте макет и привяжите slug к сайту в разделе «Сайты», либо используйте резолв по умолчанию
            (см. подсказку под таблицей). На канве блоки можно свободно перетаскивать и менять размер.
          </p>
          <div className="flex max-w-lg flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[140px]">
              <Label>Slug</Label>
              <Input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="my-brand-work" />
            </div>
            <div className="flex-1 min-w-[140px]">
              <Label>Название</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Мой макет" />
            </div>
            <Button onClick={handleCreate} disabled={!newSlug.trim()}>
              Создать
            </Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Макеты</CardTitle>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2">Slug</th>
                <th>Название</th>
                <th>Статус</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {layouts.map((l: any) => (
                <tr key={l.id} className="border-b hover:bg-muted/20">
                  <td className="py-2 font-mono text-xs">{l.slug}</td>
                  <td className="py-2">{l.name}</td>
                  <td className="py-2">{l.is_active ? "активен" : "—"}</td>
                  <td className="py-2">
                    <Button size="sm" variant="outline" onClick={() => handleOpenEdit(l.id)}>
                      Редактировать
                    </Button>{" "}
                    {!l.is_active && (
                      <Button size="sm" variant="outline" onClick={() => handlePublish(l.id)}>
                        Опубликовать
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-muted-foreground">
            Для автоматической подстановки: задайте slug макета в карточке сайта или опубликуйте макет с slug{" "}
            <code className="rounded bg-muted px-1">default-selection-work</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function getCsrf(): string {
  const m = document.cookie.match(/csrftoken=([^;]+)/);
  return m ? m[1] : "";
}
