import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { apiFetch } from "@/api/client";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { StudioLeftSidebar } from "@/routes/admin/studio/figma/StudioLeftSidebar";
import { StudioRightSidebar } from "@/routes/admin/studio/figma/StudioRightSidebar";
import { UndoRedoButtons } from "@/routes/admin/studio/components/UndoRedoButtons";
import { STUDIO_CANVAS_DROP_ZONE_ID } from "@/routes/admin/studio/canvas/studioCanvasContext";
import { pdfTemplateFingerprint } from "@/routes/admin/studio/studioDraftUtils";
import {
  flattenPdfBlocks,
  newPdfPage,
  normalizePdfTemplate,
  pdfTemplatePayload,
  type PdfPage,
} from "./pdfTemplateUtils";
import { PdfCanvas, type PdfBlock } from "./PdfCanvas";
import { PdfPalette } from "./PdfPalette";
import { PdfLayersPanel } from "./PdfLayersPanel";
import { PdfPropertiesPanel } from "./PdfPropertiesPanel";
import { fetchPdfPreviewBlob } from "./pdfPreviewFetch";

const BLOCK_SIZES: Record<string, { w: number; h: number }> = {
  header: { w: 595, h: 60 },
  footer: { w: 595, h: 30 },
  text: { w: 500, h: 100 },
  image: { w: 300, h: 200 },
  divider: { w: 500, h: 20 },
  "equipment-table": { w: 500, h: 180 },
  "spec-sheet": { w: 500, h: 120 },
  "customer-info": { w: 250, h: 40 },
  signature: { w: 200, h: 40 },
  "bom-table": { w: 500, h: 180 },
  "dn-info": { w: 200, h: 40 },
  "curves-chart": { w: 500, h: 200 },
};

function defaultProps(type: string): Record<string, unknown> {
  switch (type) {
    case "header":
      return { title: "Подбор насосного оборудования", subtitle: "Стрела" };
    case "footer":
      return { text: "© Стрела. Все права защищены." };
    case "text":
      return { content: "Текст документа..." };
    case "image":
      return { caption: "Изображение", src: "" };
    case "customer-info":
      return { organization: "{{profile.displayName}}", date: "{{selection.date}}" };
    case "curves-chart":
      return { dataPath: "{{curves.qh_main}}", chartPreset: "qh-five-curves" };
    case "signature":
      return { name: "ФИО" };
    default:
      return {};
  }
}

export function PdfStudioEditor({
  profileId,
  branding,
  onRegisterSave,
  onDirtyChange,
  previewOpen,
  onPreviewClose,
}: {
  profileId?: string;
  branding?: Record<string, unknown>;
  onRegisterSave?: (save: () => Promise<void>) => void;
  onDirtyChange?: (dirty: boolean) => void;
  previewOpen?: boolean;
  onPreviewClose?: () => void;
}) {
  const { state: pages, setState: setPages, undo, redo, reset, canUndo, canRedo } =
    useUndoRedo<PdfPage[]>([{ id: "page-1", label: "Страница 1", blocks: [] }]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const currentPageIndexRef = useRef(currentPageIndex);
  currentPageIndexRef.current = currentPageIndex;
  const blocks = pages[currentPageIndex]?.blocks ?? [];
  const setBlocks = useCallback(
    (updater: PdfBlock[] | ((prev: PdfBlock[]) => PdfBlock[])) => {
      setPages((prevPages) => {
        const idx = currentPageIndexRef.current;
        const page = prevPages[idx];
        if (!page) return prevPages;
        const nextBlocks = typeof updater === "function" ? updater(page.blocks) : updater;
        const next = [...prevPages];
        next[idx] = { ...page, blocks: nextBlocks };
        return next;
      });
    },
    [setPages],
  );
  const modeRef = useRef<"auto" | "free">("auto");
  const templateNameRef = useRef("custom");
  const savedFpRef = useRef("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("custom");
  const [mode, setMode] = useState<"auto" | "free">("auto");
  modeRef.current = mode;
  templateNameRef.current = templateName;
  const [loaded, setLoaded] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!profileId) return;
    apiFetch<{ templateName?: string; mode?: string; blocks?: PdfBlock[]; pages?: PdfPage[] }>(
      `/api/v1/admin/profiles/${encodeURIComponent(profileId)}/pdf/template`,
    )
      .then((data) => {
        const normalized = normalizePdfTemplate(data);
        const loadedMode = normalized.mode;
        const loadedName = normalized.templateName;
        reset(normalized.pages);
        setCurrentPageIndex(0);
        setTemplateName(loadedName);
        setMode(loadedMode);
        savedFpRef.current = pdfTemplateFingerprint({
          templateName: loadedName,
          mode: loadedMode,
          pages: normalized.pages,
          blocks: flattenPdfBlocks(normalized.pages),
        });
        onDirtyChange?.(false);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [profileId, reset, onDirtyChange]);

  useEffect(() => {
    if (!loaded) return;
    const dirty =
      savedFpRef.current !== "" &&
      pdfTemplateFingerprint({
        templateName,
        mode,
        pages,
        blocks: flattenPdfBlocks(pages),
      }) !== savedFpRef.current;
    onDirtyChange?.(dirty);
  }, [pages, templateName, mode, loaded, onDirtyChange]);

  const addBlock = useCallback(
    (type: string) => {
      const id = `pdf-${Date.now()}`;
      const size = BLOCK_SIZES[type] ?? { w: 300, h: 100 };
      setBlocks((prev) => {
        const y =
          prev.length > 0 ? prev.reduce((max, b) => Math.max(max, b.y + b.h), 0) + 10 : 10;
        const newBlock: PdfBlock = { id, type, x: 20, y, ...size, props: defaultProps(type) };
        return [...prev, newBlock];
      });
      setSelectedId(id);
    },
    [setBlocks],
  );


  const addPage = useCallback(() => {
    setPages((prev) => {
      const next = [...prev, newPdfPage(prev.length + 1)];
      setCurrentPageIndex(next.length - 1);
      setSelectedId(null);
      return next;
    });
  }, [setPages]);

  const removePage = useCallback(() => {
    setPages((prev) => {
      if (prev.length <= 1) return prev;
      const idx = currentPageIndexRef.current;
      const next = prev.filter((_, i) => i !== idx);
      setCurrentPageIndex(Math.max(0, idx - 1));
      setSelectedId(null);
      return next;
    });
  }, [setPages]);

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const reorderBlocks = (from: number, to: number) => {
    if (from === to) return;
    setBlocks((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const updateProp = (id: string, key: string, value: unknown) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, props: { ...b.props, [key]: value } } : b)),
    );
  };

  const insertBinding = useCallback(
    (path: string) => {
      if (!selectedId) return;
      const block = blocks.find((b) => b.id === selectedId);
      if (!block) return;
      const firstTextKey = Object.keys(block.props).find((k) => typeof block.props[k] === "string");
      if (firstTextKey) {
        const current = String(block.props[firstTextKey] ?? "");
        updateProp(selectedId, firstTextKey, current + `{{${path}}}`);
      }
    },
    [selectedId, blocks],
  );

  const handleSave = useCallback(async () => {
    if (!profileId) return;
    const payload = pdfTemplatePayload({
      templateName: templateNameRef.current,
      mode: modeRef.current,
      pages: pagesRef.current,
    });
    await apiFetch(`/api/v1/admin/profiles/${encodeURIComponent(profileId)}/pdf/template`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    savedFpRef.current = pdfTemplateFingerprint(payload as {
      templateName: string;
      mode: string;
      pages: PdfPage[];
      blocks: PdfBlock[];
    });
    onDirtyChange?.(false);
  }, [profileId, onDirtyChange]);

  useEffect(() => {
    if (!previewOpen || !profileId) {
      setPreviewUrl(null);
      setPreviewError("");
      return;
    }

    let revoked: string | null = null;
    let cancelled = false;
    setPreviewLoading(true);
    setPreviewError("");

    fetchPdfPreviewBlob(profileId, {
      templateName,
      mode,
      pages,
      blocks: flattenPdfBlocks(pages),
      branding,
    })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        revoked = url;
        setPreviewUrl(url);
      })
      .catch((e) => {
        if (!cancelled) {
          setPreviewError(e instanceof Error ? e.message : "Ошибка генерации PDF");
        }
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false);
      });

    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [previewOpen, profileId, templateName, mode, pages, branding]);

  useEffect(() => {
    onRegisterSave?.(handleSave);
  }, [handleSave, onRegisterSave]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    if (!activeId.startsWith("palette-")) return;

    const type = (active.data.current as { blockType?: string })?.blockType;
    if (!type) return;

    const overId = String(over.id);
    if (overId === STUDIO_CANVAS_DROP_ZONE_ID) {
      addBlock(type);
      return;
    }

    const overIndex = blocks.findIndex((b) => b.id === overId);
    if (overIndex >= 0) {
      const id = `pdf-${Date.now()}`;
      const size = BLOCK_SIZES[type] ?? { w: 300, h: 100 };
      setBlocks((prev) => {
        const y =
          prev.length > 0 ? prev.reduce((max, b) => Math.max(max, b.y + b.h), 0) + 10 : 10;
        const newBlock: PdfBlock = { id, type, x: 20, y, ...size, props: defaultProps(type) };
        const next = [...prev];
        next.splice(overIndex, 0, newBlock);
        return next;
      });
      setSelectedId(id);
    } else {
      addBlock(type);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === "Escape") setSelectedId(null);
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        setBlocks((prev) => prev.filter((b) => b.id !== selectedId));
        setSelectedId(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, setBlocks, undo, redo]);

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  if (!loaded) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[#888]">
        Загрузка PDF шаблона...
      </div>
    );
  }

  if (previewOpen && profileId) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <div
          className="flex shrink-0 items-center justify-between px-3 py-2"
          style={{ background: "#2c2c2c", borderBottom: "1px solid #3d3d3d" }}
        >
          <span className="text-xs font-medium text-[#b3b3b3]">
            Превью PDF (черновик)
            {previewLoading ? " — генерация…" : ""}
          </span>
          <div className="flex gap-2">
            {previewUrl ? (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded px-3 py-1 text-xs text-white"
                style={{ background: "#0d99ff" }}
              >
                Открыть PDF
              </a>
            ) : null}
            <button
              type="button"
              onClick={onPreviewClose}
              className="rounded px-3 py-1 text-xs text-[#b3b3b3] hover:bg-[#383838]"
            >
              Закрыть
            </button>
          </div>
        </div>
        {previewError ? (
          <div className="flex flex-1 items-center justify-center p-6 text-sm text-red-400">{previewError}</div>
        ) : previewUrl ? (
          <iframe title="PDF Preview" src={previewUrl} className="min-h-0 flex-1 border-0 bg-[#1e1e1e]" />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-[#888]">Генерация PDF…</div>
        )}
      </div>
    );
  }

  const activePaletteType = activeDragId?.startsWith("palette-")
    ? activeDragId.replace("palette-", "")
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full min-h-0 flex-1 overflow-hidden">
        <StudioLeftSidebar
          layers={
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-semibold uppercase text-[#666]">Слои</span>
                <UndoRedoButtons canUndo={canUndo} canRedo={canRedo} onUndo={undo} onRedo={redo} />
              </div>
              <PdfLayersPanel
                blocks={blocks}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onReorder={reorderBlocks}
                onDelete={removeBlock}
              />
            </div>
          }
          assets={<PdfPalette onAddBlock={addBlock} />}
        />

        <PdfCanvas
          blocks={blocks}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={(id, x, y) =>
            setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, x, y } : b)))
          }
          onResize={(id, w, h) =>
            setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, w, h } : b)))
          }
          onDropBlock={addBlock}
          mode={mode}
        />

        <StudioRightSidebar>
          <PdfPropertiesPanel
            block={selectedBlock}
            pageCount={pages.length}
            currentPageIndex={currentPageIndex}
            onAddPage={addPage}
            onRemovePage={removePage}
            onSelectPage={setCurrentPageIndex}
            templateName={templateName}
            mode={mode}
            onModeChange={setMode}
            onTemplateNameChange={setTemplateName}
            onChangeProp={(key, value) => selectedId && updateProp(selectedId, key, value)}
            onInsertBinding={insertBinding}
          />
        </StudioRightSidebar>
      </div>

      <DragOverlay>
        {activePaletteType ? (
          <div className="rounded bg-[#383838] px-3 py-2 text-xs text-white shadow-lg">
            + {activePaletteType}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
