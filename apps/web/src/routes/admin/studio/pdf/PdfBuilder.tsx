import { useState } from "react";
import { PdfCanvas, type PdfBlock } from "./PdfCanvas";
import { apiFetch } from "@/api/client";

const PDF_BLOCK_TYPES = [
  { type: "header", label: "Шапка", icon: "📋" },
  { type: "footer", label: "Подвал", icon: "📄" },
  { type: "text", label: "Текст", icon: "📝" },
  { type: "image", label: "Изображение", icon: "🖼️" },
  { type: "divider", label: "Разделитель", icon: "➖" },
  { type: "equipment-table", label: "Таблица оборудования", icon: "📊" },
  { type: "spec-sheet", label: "Характеристики", icon: "📋" },
  { type: "customer-info", label: "Информация о клиенте", icon: "👤" },
  { type: "signature", label: "Подпись", icon: "✍️" },
];

function defaultProps(type: string): Record<string, unknown> {
  switch (type) {
    case "header": return { title: "Подбор насосного оборудования", subtitle: "Стрела" };
    case "footer": return { text: "© Стрела. Все права защищены." };
    case "text": return { content: "Текст документа..." };
    case "image": return { caption: "Изображение", src: "" };
    case "equipment-table": return {};
    case "spec-sheet": return {};
    case "customer-info": return { organization: "ООО «Заказчик»", date: new Date().toLocaleDateString("ru-RU") };
    case "signature": return { name: "ФИО" };
    default: return {};
  }
}

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

export interface PdfTemplate {
  profileId: string;
  blocks: PdfBlock[];
}

export function PdfBuilder({ profileId }: { profileId?: string }) {
  const [blocks, setBlocks] = useState<PdfBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState("");
  const [error, setError] = useState("");
  const [templateName, setTemplateName] = useState("custom");

  const addBlock = (type: string) => {
    const id = `pdf-${Date.now()}`;
    const size = BLOCK_SIZES[type] ?? { w: 300, h: 100 };
    const y = blocks.length > 0 ? blocks.reduce((max, b) => Math.max(max, b.y + b.h), 0) + 10 : 10;
    setBlocks([...blocks, { id, type, x: 20, y, ...size, props: defaultProps(type) }]);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveBlock = (id: string, x: number, y: number) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, x, y } : b)));
  };

  const resizeBlock = (id: string, w: number, h: number) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, w, h } : b)));
  };

  const updateProp = (id: string, key: string, value: unknown) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, props: { ...b.props, [key]: value } } : b)));
  };

  const handleSave = async () => {
    if (!profileId) return;
    setSaveMsg("");
    setError("");
    try {
      await apiFetch(`/api/v1/admin/profiles/${encodeURIComponent(profileId)}/pdf/template`, {
        method: "PUT",
        body: JSON.stringify({ templateName, blocks }),
      });
      setSaveMsg("Сохранено");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    }
  };

  const selectedBlock = blocks.find((b) => b.id === selectedId) ?? null;

  return (
    <div className="flex h-full gap-4">
      {/* PDF Palette */}
      <div className="w-48 shrink-0 space-y-2">
        <h3 className="text-xs font-semibold uppercase text-neutral-500">PDF Блоки</h3>
        <div className="space-y-1">
          {PDF_BLOCK_TYPES.map((bt) => (
            <button
              key={bt.type}
              type="button"
              onClick={() => addBlock(bt.type)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-100"
            >
              <span>{bt.icon}</span>
              <span>{bt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="min-w-0 flex-1">
        <PdfCanvas
          blocks={blocks}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={moveBlock}
          onResize={resizeBlock}
        />
      </div>

      {/* Properties + Save */}
      <div className="w-64 shrink-0 space-y-3 overflow-y-auto">
        {selectedBlock && (
          <div className="rounded-lg border bg-white p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-neutral-700">{selectedBlock.type}</h3>
              <button type="button" onClick={() => removeBlock(selectedBlock.id)} className="rounded px-1 text-xs text-red-500 hover:bg-red-50">✕</button>
            </div>
            {selectedBlock.type === "header" && (
              <>
                <PropField label="Заголовок" value={String(selectedBlock.props.title ?? "")} onChange={(v) => updateProp(selectedBlock.id, "title", v)} />
                <PropField label="Подзаголовок" value={String(selectedBlock.props.subtitle ?? "")} onChange={(v) => updateProp(selectedBlock.id, "subtitle", v)} />
              </>
            )}
            {selectedBlock.type === "footer" && (
              <PropField label="Текст" value={String(selectedBlock.props.text ?? "")} onChange={(v) => updateProp(selectedBlock.id, "text", v)} />
            )}
            {selectedBlock.type === "text" && (
              <div>
                <label className="mb-0.5 block text-xs text-neutral-600">Содержимое</label>
                <textarea className="min-h-[100px] w-full rounded border px-2 py-1 text-xs" value={String(selectedBlock.props.content ?? "")} onChange={(e) => updateProp(selectedBlock.id, "content", e.target.value)} />
              </div>
            )}
            {selectedBlock.type === "customer-info" && (
              <>
                <PropField label="Организация" value={String(selectedBlock.props.organization ?? "")} onChange={(v) => updateProp(selectedBlock.id, "organization", v)} />
                <PropField label="Дата" value={String(selectedBlock.props.date ?? "")} onChange={(v) => updateProp(selectedBlock.id, "date", v)} />
              </>
            )}
            {selectedBlock.type === "signature" && (
              <PropField label="ФИО" value={String(selectedBlock.props.name ?? "")} onChange={(v) => updateProp(selectedBlock.id, "name", v)} />
            )}
          </div>
        )}

        {/* Save section */}
        <div className="rounded-lg border bg-white p-3">
          <div className="mb-2">
            <label className="mb-0.5 block text-xs text-neutral-600">Название шаблона</label>
            <input className="w-full rounded border px-2 py-1 text-xs font-mono" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
          </div>
          {saveMsg && <div className="mb-2 rounded bg-green-100 px-2 py-1 text-xs text-green-700">{saveMsg}</div>}
          {error && <div className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-600">{error}</div>}
          <button
            type="button"
            onClick={handleSave}
            disabled={blocks.length === 0}
            className="w-full rounded bg-[#13347f] py-1.5 text-sm text-white hover:bg-[#0f2866] disabled:opacity-50"
          >
            Сохранить шаблон
          </button>
          {blocks.length === 0 && <p className="mt-1 text-center text-[10px] text-neutral-400">Добавьте блоки слева</p>}
        </div>
      </div>
    </div>
  );
}

function PropField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="mb-2">
      <label className="mb-0.5 block text-xs text-neutral-600">{label}</label>
      <input className="w-full rounded border px-2 py-1 text-sm" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
