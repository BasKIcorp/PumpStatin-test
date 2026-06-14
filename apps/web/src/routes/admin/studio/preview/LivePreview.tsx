import { useState, useRef, useEffect } from "react";

const SIZES = [
  { id: "desktop", label: "Desktop", width: 1024 },
  { id: "tablet", label: "Планшет", width: 768 },
  { id: "mobile", label: "Мобильный", width: 375 },
];

export function LivePreview({
  profileId,
  onClose,
}: {
  profileId: string;
  onClose: () => void;
}) {
  const [size, setSize] = useState<{ width: number }>(SIZES[0]);
  const [key, setKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Refresh preview when switching
  const refresh = () => setKey((k) => k + 1);

  // Re-apply size after iframe loads
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          doc.body.style.zoom = "1";
        }
      } catch {
        // Cross-origin restrictions - ignore
      }
    };
    iframe.addEventListener("load", handleLoad);
    return () => iframe.removeEventListener("load", handleLoad);
  }, [key]);

  return (
    <div className="flex h-full flex-col">
      {/* Preview toolbar */}
      <div className="flex items-center justify-between border-b bg-white px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500">ПРЕВЬЮ</span>
          {SIZES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSize(s)}
              className={`rounded px-2 py-0.5 text-xs ${
                size.width === s.width
                  ? "bg-[#13347f] text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="rounded px-2 py-0.5 text-xs text-neutral-600 hover:bg-neutral-100"
          >
            ⟳ Обновить
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
          >
            ✕ Закрыть
          </button>
        </div>
      </div>

      {/* Preview frame */}
      <div className="flex flex-1 items-start justify-center overflow-auto bg-neutral-100 p-4">
        <div
          className="overflow-hidden rounded-lg border border-neutral-300 bg-white shadow-lg transition-all"
          style={{ width: size.width, maxWidth: "100%" }}
        >
          <iframe
            key={key}
            ref={iframeRef}
            src={`/?profilePreview=${profileId}`}
            className="block w-full"
            style={{ height: 800, border: "none" }}
            title="Preview"
          />
        </div>
      </div>
    </div>
  );
}
