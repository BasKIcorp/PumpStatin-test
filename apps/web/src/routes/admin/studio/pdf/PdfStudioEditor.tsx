import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/api/client";
import { StudioLeftSidebar } from "@/routes/admin/studio/figma/StudioLeftSidebar";
import { StudioRightSidebar } from "@/routes/admin/studio/figma/StudioRightSidebar";
import { PdfCanvas, type PdfBlock } from "./PdfCanvas";
import { PdfPalette } from "./PdfPalette";
import { PdfLayersPanel } from "./PdfLayersPanel";
import { PdfPropertiesPanel } from "./PdfPropertiesPanel";

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
    case "signature":
      return { name: "ФИО" };
    default:
      return {};
  }
}

export function PdfStudioEditor({
  profileId,
  onRegisterSave,
  previewOpen,
  onPreviewClose,
}: {
  profileId?: string;
  onRegisterSave?: (save: () => Promise<void>) => void;
  previewOpen?: boolean;
  onPreviewClose?: () => void;
}) {
  const [blocks, setBlocks] = useState<PdfBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("custom");
  const [mode, setMode] = useState<"auto" | "free">("auto");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    apiFetch<{ templateName?: string; blocks?: PdfBlock[] }>(
      `/api/v1/admin/profiles/${encodeURIComponent(profileId)}/pdf/template`,
    )
      .then((data) => {
        if (data.blocks?.length) setBlocks(data.blocks);
        if (data.templateName) setTemplateName(data.templateName);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [profileId]);

  const addBlock = useCallback(
    (type: string) => {
      const id = `pdf-${Date.now()}`;
      const size = BLOCK_SIZES[type] ?? { w: 300, h: 100 };
      const y =
        blocks.length > 0 ? blocks.reduce((max, b) => Math.max(max, b.y + b.h), 0) + 10 : 10;
      const newBlock: PdfBlock = { id, type, x: 20, y, ...size, props: defaultProps(type) };
      setBlocks((prev) => [...prev, newBlock]);
      setSelectedId(id);
    },
    [blocks],
  );

  const removeBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
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
    await apiFetch(`/api/v1/admin/profiles/${encodeURIComponent(profileId)}/pdf/template`, {
      method: "PUT",
      body: JSON.stringify({ templateName, blocks }),
    });
  }, [profileId, templateName, blocks]);

  useEffect(() => {
    onRegisterSave?.(handleSave);
  }, [handleSave, onRegisterSave]);

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
          <span className="text-xs font-medium text-[#b3b3b3]">Превью PDF</span>
          <div className="flex gap-2">
            <a
              href={`/api/v1/admin/profiles/${encodeURIComponent(profileId)}/pdf/preview`}
              target="_blank"
              rel="noreferrer"
              className="rounded px-3 py-1 text-xs text-white"
              style={{ background: "#0d99ff" }}
            >
              Открыть PDF
            </a>
            <button
              type="button"
              onClick={onPreviewClose}
              className="rounded px-3 py-1 text-xs text-[#b3b3b3] hover:bg-[#383838]"
            >
              Закрыть
            </button>
          </div>
        </div>
        <iframe
          title="PDF Preview"
          src={`/api/v1/admin/profiles/${encodeURIComponent(profileId)}/pdf/preview`}
          className="min-h-0 flex-1 border-0 bg-[#1e1e1e]"
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <StudioLeftSidebar
        layers={
          <PdfLayersPanel
            blocks={blocks}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDelete={removeBlock}
          />
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
          templateName={templateName}
          mode={mode}
          onModeChange={setMode}
          onTemplateNameChange={setTemplateName}
          onChangeProp={(key, value) => selectedId && updateProp(selectedId, key, value)}
          onInsertBinding={insertBinding}
        />
      </StudioRightSidebar>
    </div>
  );
}
