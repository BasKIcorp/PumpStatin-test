import { useState, useRef, useEffect } from "react";
import { FIGMA } from "../figma/figmaTokens";

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
  const [size, setSize] = useState(SIZES[0]);
  const [key, setKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const refresh = () => setKey((k) => k + 1);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) doc.body.style.zoom = "1";
      } catch {
        /* cross-origin */
      }
    };
    iframe.addEventListener("load", handleLoad);
    return () => iframe.removeEventListener("load", handleLoad);
  }, [key]);

  return (
    <div className="flex h-full flex-col" style={{ background: FIGMA.appBg }}>
      <div
        className="flex shrink-0 items-center justify-between px-3 py-2"
        style={{ background: FIGMA.panel, borderBottom: `1px solid ${FIGMA.panelBorder}` }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#b3b3b3]">Превью сайта</span>
          {SIZES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSize(s)}
              className="rounded px-2 py-0.5 text-xs"
              style={
                size.width === s.width
                  ? { background: FIGMA.accentSoft, color: FIGMA.accent }
                  : { color: FIGMA.textMuted }
              }
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="rounded px-2 py-0.5 text-xs text-[#b3b3b3] hover:bg-[#383838]"
          >
            ⟳ Обновить
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-900/30"
          >
            ✕ Закрыть
          </button>
        </div>
      </div>

      <div className="flex flex-1 items-start justify-center overflow-auto p-6">
        <div
          className="overflow-hidden rounded-sm bg-white shadow-xl"
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
