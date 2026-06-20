import { useCallback, useRef, useState } from "react";
import { uploadProfileMedia } from "@/api/adminMedia";
import { FIGMA } from "../figma/figmaTokens";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml";

export function ImageDropUpload({
  profileId,
  value,
  onChange,
  label = "Перетащите изображение или нажмите для выбора",
}: {
  profileId: string;
  value?: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setError("Можно загружать только изображения");
        return;
      }
      setError("");
      setUploading(true);
      try {
        const result = await uploadProfileMedia(profileId, file);
        onChange(result.url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка загрузки");
      } finally {
        setUploading(false);
      }
    },
    [profileId, onChange],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) void uploadFile(file);
    },
    [uploadFile],
  );

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
        }}
        onDrop={onDrop}
        className="flex cursor-pointer flex-col items-center justify-center rounded border border-dashed px-3 py-4 text-center transition-colors"
        style={{
          borderColor: dragOver ? FIGMA.accent : "#555",
          background: dragOver ? FIGMA.accentSoft : FIGMA.inputBg,
          opacity: uploading ? 0.7 : 1,
        }}
      >
        {uploading ? (
          <span className="text-[11px] text-[#b3b3b3]">Загрузка…</span>
        ) : value ? (
          <>
            <img
              src={value}
              alt=""
              className="mb-2 max-h-20 w-full rounded object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-[10px] text-[#888]">Заменить — перетащите или нажмите</span>
          </>
        ) : (
          <>
            <span className="mb-1 text-lg text-[#666]">⬆</span>
            <span className="text-[11px] leading-snug text-[#b3b3b3]">{label}</span>
            <span className="mt-1 text-[10px] text-[#666]">PNG, JPG, WebP, GIF, SVG · до 5 МБ</span>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadFile(file);
          e.target.value = "";
        }}
      />
      {error ? <p className="text-[10px] text-red-400">{error}</p> : null}
    </div>
  );
}
