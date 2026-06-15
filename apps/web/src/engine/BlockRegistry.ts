import type { BlockProps } from "@pumpstation/contracts";

import { HeroBlock } from "@/blocks/HeroBlock";
import { RichTextBlock } from "@/blocks/RichTextBlock";
import { CardGridBlock } from "@/blocks/CardGridBlock";
import { WizardBlock } from "@/blocks/WizardBlock";
import {
  ProductGridBlock,
  ContactFormBlock,
  MapBlock,
  GalleryBlock,
  AccordionBlock,
  TabsBlock,
  DividerBlock,
  ImageBlock,
  VideoBlock,
} from "@/blocks/MoreBlocks";

export type BlockComponent = React.ComponentType<BlockProps>;

export const BLOCK_REGISTRY: Record<string, BlockComponent> = {
  hero: HeroBlock,
  "rich-text": RichTextBlock,
  "card-grid": CardGridBlock,
  wizard: WizardBlock,
  "product-grid": ProductGridBlock,
  "contact-form": ContactFormBlock,
  map: MapBlock,
  gallery: GalleryBlock,
  accordion: AccordionBlock,
  tabs: TabsBlock,
  divider: DividerBlock,
  image: ImageBlock,
  video: VideoBlock,
};

/** Возвращает список зарегистрированных типов блоков */
export function getBlockTypes(): string[] {
  return Object.keys(BLOCK_REGISTRY);
}
