import type { BlockProps } from "@pumpstation/contracts";
import { CabinetPageContent } from "./CabinetBlocks";

export function CabinetWorkspaceBlock({ block: _block }: BlockProps) {
  return <CabinetPageContent />;
}

export function CabinetPageTitleBlock({ block }: BlockProps) {
  const title = String(block.props.title ?? "Личный кабинет");
  return <h1 className="px-4 pt-4 text-2xl font-semibold">{title}</h1>;
}
