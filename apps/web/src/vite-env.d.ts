/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "@pumpstation/theme-strela/tokens.css";
declare module "@pumpstation/theme-acme/tokens.css";
declare module "@pumpstation/theme-nord/tokens.css";
declare module "@pumpstation/theme-aqua/tokens.css";
