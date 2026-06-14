import { useState } from "react";
import type { BlockConfig } from "@pumpstation/contracts";

/** Дефолтные props для каждого типа блока */
const BLOCK_DEFAULTS: Record<string, Record<string, unknown>> = {
  hero: {
    heading: "Заголовок",
    subheading: "Подзаголовок",
    cta: { label: "Подобрать", pageId: "wizard" },
    background: "#1e4a8c",
  },
  "rich-text": { content: "<p>Текст страницы</p>" },
  "card-grid": {
    columns: 3,
    cards: [{ icon: "settings", title: "Особенность", text: "Описание" }],
  },
  wizard: {},
};

export function useBlockManager(initialBlocks: BlockConfig[]) {
  const [blocks, setBlocks] = useState<BlockConfig[]>(initialBlocks);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const addBlock = (type: string) => {
    const id = `block-${Date.now()}`;
    const defaults = BLOCK_DEFAULTS[type] ?? {};
    const newBlocks = [...blocks, { id, type, props: { ...defaults } }];
    setBlocks(newBlocks);
    setSelectedId(id);
    return newBlocks;
  };

  const removeBlock = (id: string) => {
    const newBlocks = blocks.filter((b) => b.id !== id);
    setBlocks(newBlocks);
    if (selectedId === id) setSelectedId(null);
    return newBlocks;
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return blocks;
    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[target]] = [newBlocks[target], newBlocks[index]];
    setBlocks(newBlocks);
    return newBlocks;
  };

  const updateBlockProps = (id: string, key: string, value: unknown) => {
    setBlocks(
      blocks.map((b) =>
        b.id === id ? { ...b, props: { ...b.props, [key]: value } } : b,
      ),
    );
  };

  const updateBlockType = (id: string, type: string) => {
    const defaults = BLOCK_DEFAULTS[type] ?? {};
    setBlocks(
      blocks.map((b) =>
        b.id === id ? { ...b, type, props: { ...defaults } } : b,
      ),
    );
  };

  const selected = blocks.find((b) => b.id === selectedId) ?? null;

  return {
    blocks,
    selectedId,
    selected,
    setSelectedId,
    setBlocks,
    addBlock,
    removeBlock,
    moveBlock,
    updateBlockProps,
    updateBlockType,
  };
}
