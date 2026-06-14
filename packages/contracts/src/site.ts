/** Конфигурация сайта — все страницы, layout, навигация */

export interface SiteConfig {
  layout: LayoutConfig;
  pages: PageConfig[];
}

export interface LayoutConfig {
  header: HeaderConfig;
  footer: FooterConfig;
}

export interface HeaderConfig {
  logo: {
    src: string;
    width: number;
    link: string;
  };
  menu: MenuItem[];
  loginButton: boolean;
}

export interface MenuItem {
  label: string;
  pageId: string;
}

export interface FooterConfig {
  columns: FooterColumn[];
  copyright: string;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface FooterLink {
  label: string;
  pageId: string;
}

export interface PageConfig {
  id: string;
  title: string;
  route: string;
  inMenu: boolean;
  type?: 'page' | 'wizard';
  blocks?: BlockConfig[];
  wizardRef?: string;
}

export interface BlockConfig {
  id: string;
  type: string;
  props: Record<string, unknown>;
}

/** Props, которые получает каждый компонент-блок */
export interface BlockProps {
  block: BlockConfig;
  profile: Record<string, unknown>;
}

/** Регистр блоков: тип → компонент */
export type BlockRegistry = Record<string, React.ComponentType<BlockProps>>;
