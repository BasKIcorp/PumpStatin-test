import type { BlockConfig } from "@pumpstation/contracts";
import { BLOCK_REGISTRY } from "@/engine/BlockRegistry";
import { FIGMA } from "../figma/figmaTokens";

function SelectionHandles() {
  const pos = [
    "left-0 top-0 -translate-x-1/2 -translate-y-1/2",
    "right-0 top-0 translate-x-1/2 -translate-y-1/2",
    "left-0 bottom-0 -translate-x-1/2 translate-y-1/2",
    "right-0 bottom-0 translate-x-1/2 translate-y-1/2",
  ];
  return (
    <>
      {pos.map((p) => (
        <span
          key={p}
          className={`absolute z-10 h-2 w-2 border border-[#0d99ff] bg-white ${p}`}
        />
      ))}
    </>
  );
}

export function CanvasBlock({
  block,
  isSelected,
  onSelect,
}: {
  block: BlockConfig;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const Component = BLOCK_REGISTRY[block.type];

  return (
    <div
      className="relative"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      {isSelected && (
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{ boxShadow: `inset 0 0 0 2px ${FIGMA.accent}` }}
        >
          <SelectionHandles />
        </div>
      )}
      {!isSelected && (
        <div className="pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity hover:opacity-100 hover:shadow-[inset_0_0_0_1px_rgba(13,153,255,0.5)]" />
      )}
      <div className={isSelected ? "pointer-events-none" : "cursor-pointer"}>
        {Component ? (
          <Component block={block} profile={{}} />
        ) : (
          <div className="flex items-center justify-center bg-yellow-50 p-4 text-sm text-yellow-700">
            Неизвестный блок: {block.type}
          </div>
        )}
      </div>
    </div>
  );
}
