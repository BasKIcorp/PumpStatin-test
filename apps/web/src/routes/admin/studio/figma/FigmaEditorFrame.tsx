import type { ReactNode } from "react";
import { FIGMA } from "./figmaTokens";

export function FigmaEditorFrame({ children }: { children: ReactNode }) {
  return (
    <div
      className="fixed inset-y-0 left-56 right-0 z-30 flex flex-col overflow-hidden"
      style={{ background: FIGMA.appBg }}
    >
      {children}
    </div>
  );
}
