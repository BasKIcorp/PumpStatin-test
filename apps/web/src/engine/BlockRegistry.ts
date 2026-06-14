import type { BlockProps } from "@pumpstation/contracts";

import { HeroBlock } from "@/blocks/HeroBlock";
import { RichTextBlock } from "@/blocks/RichTextBlock";
import { CardGridBlock } from "@/blocks/CardGridBlock";
import { WizardBlock } from "@/blocks/WizardBlock";

export type BlockComponent = React.ComponentType<BlockProps>;

/**
 * Регистр компонентов-блоков: тип → React-компонент.
 * Добавляй новые блоки сюда по мере их создания.
 */
export const BLOCK_REGISTRY: Record<string, BlockComponent> = {
  hero: HeroBlock,
  "rich-text": RichTextBlock,
  "card-grid": CardGridBlock,
  wizard: WizardBlock,
};

/** Возвращает список зарегистрированных типов блоков */
export function getBlockTypes(): string[] {
  return Object.keys(BLOCK_REGISTRY);
}
