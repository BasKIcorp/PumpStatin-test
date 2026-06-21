import type { BlockProps } from "@pumpstation/contracts";

import { HeroBlock } from "@/blocks/HeroBlock";
import { RichTextBlock } from "@/blocks/RichTextBlock";
import { CardGridBlock } from "@/blocks/CardGridBlock";
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
import {
  AuthAdminEntryBlock,
  AuthBackLinkBlock,
  AuthBrandPanelBlock,
  AuthLoginFormBlock,
  AuthQuickLoginBlock,
} from "@/blocks/auth/AuthBlocks";
import {
  WizardCardGridSimpleBlock,
  WizardCardGridStrelaBlock,
  WizardEmbedBlock,
  WizardFunnelHeadingBlock,
  WizardFunnelSidebarBlock,
  WizardLegacySelectionBlock,
  WizardSelectionCardBlock,
  WizardSelectionCurvesPanelBlock,
  WizardSelectionOptionsPanelBlock,
  WizardSelectionParamsPanelBlock,
  WizardSelectionResultsPanelBlock,
  WizardSelectionTechSpecsPanelBlock,
  WizardSelectionWorkHeaderBlock,
  WizardStepHeadingBlock,
} from "@/blocks/wizard/WizardBlocks";
import { CabinetPageTitleBlock, CabinetWorkspaceBlock } from "@/blocks/cabinet/CabinetPageBlocks";

export type BlockComponent = React.ComponentType<BlockProps>;

export const BLOCK_REGISTRY: Record<string, BlockComponent> = {
  hero: HeroBlock,
  "rich-text": RichTextBlock,
  "card-grid": CardGridBlock,
  "product-grid": ProductGridBlock,
  "contact-form": ContactFormBlock,
  map: MapBlock,
  gallery: GalleryBlock,
  accordion: AccordionBlock,
  tabs: TabsBlock,
  divider: DividerBlock,
  image: ImageBlock,
  video: VideoBlock,
  "auth/brand-panel": AuthBrandPanelBlock,
  "auth/login-form": AuthLoginFormBlock,
  "auth/quick-login": AuthQuickLoginBlock,
  "auth/admin-entry": AuthAdminEntryBlock,
  "auth/back-link": AuthBackLinkBlock,
  "cabinet/page-title": CabinetPageTitleBlock,
  "cabinet/workspace": CabinetWorkspaceBlock,
  "wizard/step-heading": WizardStepHeadingBlock,
  "wizard/funnel-sidebar": WizardFunnelSidebarBlock,
  "wizard/funnel-heading": WizardFunnelHeadingBlock,
  "wizard/selection-card": WizardSelectionCardBlock,
  "wizard/selection-work-header": WizardSelectionWorkHeaderBlock,
  "wizard/selection-params-panel": WizardSelectionParamsPanelBlock,
  "wizard/selection-curves-panel": WizardSelectionCurvesPanelBlock,
  "wizard/selection-tech-specs-panel": WizardSelectionTechSpecsPanelBlock,
  "wizard/selection-options-panel": WizardSelectionOptionsPanelBlock,
  "wizard/selection-results-panel": WizardSelectionResultsPanelBlock,
  "wizard/card-grid-strela": WizardCardGridStrelaBlock,
  "wizard/card-grid-simple": WizardCardGridSimpleBlock,
  "wizard/legacy-selection": WizardLegacySelectionBlock,
  "wizard/embed": WizardEmbedBlock,
};

/** Aliases for content/* and layout/* types */
const ALIASES: Record<string, string> = {
  "content/hero": "hero",
  "content/rich-text": "rich-text",
  "content/divider": "divider",
  "content/card-grid": "card-grid",
  "data/product-grid": "product-grid",
  "data/contact-form": "contact-form",
  "data/map": "map",
  wizard: "wizard/embed",
};

export function resolveBlockType(type: string): string {
  return ALIASES[type] ?? type;
}

export function getBlockComponent(type: string): BlockComponent | undefined {
  const resolved = resolveBlockType(type);
  return BLOCK_REGISTRY[resolved];
}

/** Возвращает список зарегистрированных типов блоков */
export function getBlockTypes(): string[] {
  return Object.keys(BLOCK_REGISTRY);
}
