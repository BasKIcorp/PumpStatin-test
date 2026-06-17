import type { PageConfig } from "@pumpstation/contracts";
import { Palette } from "@/routes/admin/studio/palette/Palette";
import { StudioLeftSidebar } from "./StudioLeftSidebar";
import { StudioRightSidebar } from "./StudioRightSidebar";
import { FIGMA } from "./figmaTokens";

export function WizardPageGate({
  page,
  onCreatePage,
  onCreatePageWithBlock,
}: {
  page: PageConfig;
  onCreatePage: () => void;
  onCreatePageWithBlock: (blockType: string) => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <StudioLeftSidebar
        layers={<p className="px-1 py-4 text-center text-[11px] text-[#666]">Нет слоёв</p>}
        assets={<Palette onAddBlock={onCreatePageWithBlock} />}
      />

      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: FIGMA.appBg,
            backgroundImage: `radial-gradient(circle, ${FIGMA.canvasDot} 1px, transparent 1px)`,
            backgroundSize: "16px 16px",
          }}
        />
        <div
          className="relative z-10 max-w-md rounded-lg p-8 text-center shadow-xl"
          style={{ background: FIGMA.panel, border: `1px solid ${FIGMA.panelBorder}` }}
        >
          <div className="mb-2 text-3xl">🧭</div>
          <h2 className="mb-2 text-lg font-medium text-white">{page.title}</h2>
          <p className="mb-6 text-sm leading-relaxed text-[#999]">
            Это страница <strong className="text-[#ccc]">визарда подбора</strong> — её шаги
            настраиваются во вкладке «Визард». Для лендингов, каталогов и других экранов
            создайте <strong className="text-[#ccc]">контентную страницу</strong> с блоками.
          </p>
          <button
            type="button"
            onClick={onCreatePage}
            className="mb-3 w-full rounded py-2.5 text-sm font-medium text-white"
            style={{ background: FIGMA.accent }}
          >
            + Создать контентную страницу
          </button>
          <p className="text-[11px] text-[#666]">
            Или кликните блок слева — страница создастся автоматически
          </p>
        </div>
      </div>

      <StudioRightSidebar>
        <div className="space-y-3 text-sm text-[#b3b3b3]">
          <div>
            <div className="mb-1 text-xs font-medium text-white">Страница визарда</div>
            <div className="font-mono text-[11px] text-[#666]">{page.route}</div>
          </div>
          <p className="text-[11px] leading-relaxed text-[#666]">
            Маршрут <code className="text-[#888]">/</code> зарезервирован за подбором насосов.
          </p>
        </div>
      </StudioRightSidebar>
    </div>
  );
}
