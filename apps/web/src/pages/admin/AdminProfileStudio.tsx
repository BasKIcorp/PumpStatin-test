import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { apiFetch } from "@/api/client";
import { StudioShell } from "@/routes/admin/studio/StudioShell";
import { ThemeEditor } from "@/routes/admin/studio/theme/ThemeEditor";
import { VisualPageEditor } from "@/routes/admin/studio/canvas/VisualPageEditor";
import { MenuEditor, FooterEditor } from "@/routes/admin/studio/layout/LayoutEditor";
import { WizardEditorShell } from "@/routes/admin/studio/wizard/WizardEditorShell";
import { PdfStudioEditor } from "@/routes/admin/studio/pdf/PdfStudioEditor";
import { VersionPanel } from "@/routes/admin/studio/versioning/VersionPanel";
import { StudioEditorTopBar } from "@/routes/admin/studio/figma/StudioEditorTopBar";
import { FigmaEditorFrame } from "@/routes/admin/studio/figma/FigmaEditorFrame";
import { WizardPageGate } from "@/routes/admin/studio/figma/WizardPageGate";
import { getSchema } from "@/routes/admin/studio/properties/blockSchema";
import { setNested } from "@/routes/admin/studio/canvas/studioPropUtils";
import type { SiteConfig, PageConfig, BlockConfig } from "@pumpstation/contracts";

interface ProfileData {
  profile: Record<string, unknown>;
  branding: Record<string, unknown>;
  wizard: Record<string, unknown>;
  site?: SiteConfig;
}

function defaultBlockProps(type: string): Record<string, unknown> {
  const schema = getSchema(type);
  if (!schema) return {};
  let result: Record<string, unknown> = {};
  for (const field of schema.fields) {
    if (field.defaultValue !== undefined) {
      result = setNested(result, field.key, field.defaultValue);
    }
  }
  return result;
}

function pickEditablePageId(pages: PageConfig[]): string | null {
  const editable = pages.find((p) => p.type !== "wizard");
  return editable?.id ?? pages[0]?.id ?? null;
}

export function AdminProfileStudio() {
  const { profileId } = useParams<{ profileId: string }>();
  const [data, setData] = useState<ProfileData | null>(null);
  const [activeTab, setActiveTab] = useState("pages");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [pagePreview, setPagePreview] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(false);
  const pdfSaveRef = useRef<(() => Promise<void>) | null>(null);

  const [pages, setPages] = useState<PageConfig[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [pageBlocks, setPageBlocks] = useState<BlockConfig[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const [layout, setLayout] = useState<SiteConfig["layout"]>({
    header: { logo: { src: "/logo.svg", width: 180, link: "/" }, menu: [], loginButton: true },
    footer: { columns: [], copyright: "" },
  });

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    setError("");
    apiFetch<ProfileData>(`/api/v1/admin/profiles/${encodeURIComponent(profileId)}/preview`)
      .then((d) => {
        setData(d);
        const siteConfig = (d.site ?? { layout, pages: [] }) as SiteConfig;
        const loadedPages = siteConfig.pages ?? [];
        setPages(loadedPages);
        setLayout(siteConfig.layout);
        setSelectedPageId(pickEditablePageId(loadedPages));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [profileId]);

  useEffect(() => {
    if (!selectedPageId) return;
    const page = pages.find((p) => p.id === selectedPageId);
    setPageBlocks(page?.blocks ?? []);
    setSelectedBlockId(null);
  }, [selectedPageId, pages]);

  const saveSiteConfig = async (newSite: SiteConfig) => {
    if (!profileId) return;
    setSaveMsg("");
    try {
      await apiFetch(`/api/v1/admin/profiles/${encodeURIComponent(profileId)}/site`, {
        method: "PUT",
        body: JSON.stringify(newSite),
      });
      setSaveMsg("Сохранено");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    }
  };

  const handleSaveTheme = async (branding: Record<string, unknown>) => {
    if (!profileId) return;
    try {
      await apiFetch(`/api/v1/admin/profiles/${encodeURIComponent(profileId)}/branding`, {
        method: "PUT",
        body: JSON.stringify({ branding }),
      });
      setSaveMsg("Стили сохранены");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const handleSaveSite = () => saveSiteConfig({ layout, pages });

  const handleSavePdf = async () => {
    setSaveMsg("");
    try {
      await pdfSaveRef.current?.();
      setSaveMsg("PDF сохранён");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения PDF");
    }
  };

  const addPage = useCallback(() => {
    const id = `page-${Date.now()}`;
    const newPage: PageConfig = {
      id,
      title: "Новая страница",
      route: `/${id}`,
      inMenu: true,
      type: "page",
      blocks: [],
    };
    setPages((prev) => {
      const updated = [...prev, newPage];
      return updated;
    });
    setSelectedPageId(id);
    setPageBlocks([]);
    return id;
  }, []);

  const addPageWithBlock = useCallback(
    (blockType: string) => {
      const id = `page-${Date.now()}`;
      const blockId = `block-${Date.now()}`;
      const newPage: PageConfig = {
        id,
        title: "Новая страница",
        route: `/${id}`,
        inMenu: true,
        type: "page",
        blocks: [{ id: blockId, type: blockType, props: defaultBlockProps(blockType) }],
      };
      setPages((prev) => [...prev, newPage]);
      setSelectedPageId(id);
      setPageBlocks(newPage.blocks ?? []);
      setSelectedBlockId(blockId);
    },
    [],
  );

  const deletePage = (pageId: string) => {
    setPages((prev) => {
      const updated = prev.filter((p) => p.id !== pageId);
      if (selectedPageId === pageId) {
        setSelectedPageId(pickEditablePageId(updated));
      }
      return updated;
    });
  };

  const updatePageBlocks = (blocks: BlockConfig[]) => {
    setPageBlocks(blocks);
    setPages((prev) => prev.map((p) => (p.id === selectedPageId ? { ...p, blocks } : p)));
  };

  const selectedPage = pages.find((p) => p.id === selectedPageId);
  const profileTitle = (data?.branding as { appTitle?: string })?.appTitle ?? profileId ?? "";
  const isImmersive = activeTab === "pages" || activeTab === "pdf";

  if (loading) {
    return <div className="flex items-center justify-center p-12 text-neutral-500">Загрузка профиля...</div>;
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  if (isImmersive) {
    return (
      <FigmaEditorFrame>
        <StudioEditorTopBar
          profileTitle={profileTitle}
          pages={activeTab === "pages" ? pages : undefined}
          selectedPageId={activeTab === "pages" ? selectedPageId : undefined}
          onSelectPage={activeTab === "pages" ? setSelectedPageId : undefined}
          onAddPage={activeTab === "pages" ? addPage : undefined}
          onDeletePage={activeTab === "pages" ? deletePage : undefined}
          contextLabel={activeTab === "pdf" ? "PDF документ" : undefined}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setPagePreview(false);
            setPdfPreview(false);
            setActiveTab(tab);
          }}
          onSave={activeTab === "pdf" ? handleSavePdf : handleSaveSite}
          onPreview={
            activeTab === "pdf"
              ? () => setPdfPreview(true)
              : selectedPage && selectedPage.type !== "wizard"
                ? () => setPagePreview(true)
                : undefined
          }
          saveMsg={saveMsg}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {activeTab === "pages" && selectedPage?.type === "wizard" && (
            <WizardPageGate
              page={selectedPage}
              onCreatePage={addPage}
              onCreatePageWithBlock={addPageWithBlock}
            />
          )}

          {activeTab === "pages" && selectedPage && selectedPage.type !== "wizard" && (
            <VisualPageEditor
              key={selectedPage.id}
              blocks={pageBlocks}
              page={selectedPage}
              previewMode={pagePreview}
              onPreviewClose={() => setPagePreview(false)}
              onPageChange={(patch) => {
                setPages((prev) =>
                  prev.map((p) => (p.id === selectedPage.id ? { ...p, ...patch } : p)),
                );
              }}
              onBlocksChange={updatePageBlocks}
              selectedBlockId={selectedBlockId}
              onSelectBlock={setSelectedBlockId}
              profileId={profileId}
            />
          )}

          {activeTab === "pages" && !selectedPage && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[#888]">
              <p className="text-sm">Нет страниц</p>
              <button
                type="button"
                onClick={addPage}
                className="rounded px-4 py-2 text-sm text-white"
                style={{ background: "#0d99ff" }}
              >
                Создать страницу
              </button>
            </div>
          )}

          {activeTab === "pdf" && (
            <PdfStudioEditor
              profileId={profileId}
              previewOpen={pdfPreview}
              onPreviewClose={() => setPdfPreview(false)}
              onRegisterSave={(fn) => {
                pdfSaveRef.current = fn;
              }}
            />
          )}
        </div>
      </FigmaEditorFrame>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Конструктор: {profileTitle}</h2>
        {saveMsg && (
          <span className="rounded bg-green-100 px-3 py-1 text-xs text-green-700">{saveMsg}</span>
        )}
      </div>

      <StudioShell profileId={profileId ?? ""} activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === "theme" && data?.branding && (
          <ThemeEditor branding={data.branding} onSave={handleSaveTheme} />
        )}

        {activeTab === "layout" && (
          <div className="space-y-8">
            <MenuEditor
              menu={layout.header.menu}
              pageOptions={pages.map((p) => ({ id: p.id, title: p.title }))}
              onChange={(menu) => setLayout({ ...layout, header: { ...layout.header, menu } })}
            />
            <hr className="border-neutral-200" />
            <FooterEditor
              footer={layout.footer}
              pageOptions={pages.map((p) => ({ id: p.id, title: p.title }))}
              onChange={(footer) => setLayout({ ...layout, footer })}
            />
            <button
              type="button"
              onClick={handleSaveSite}
              className="rounded bg-[#13347f] px-4 py-1.5 text-sm text-white hover:bg-[#0f2866]"
            >
              Сохранить layout
            </button>
          </div>
        )}

        {activeTab === "wizard" && <WizardEditorShell profileId={profileId} />}
      </StudioShell>

      {activeTab === "layout" && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSaveSite}
            className="rounded bg-[#13347f] px-6 py-2 text-sm font-medium text-white hover:bg-[#0f2866]"
          >
            Сохранить сайт
          </button>
        </div>
      )}

      <div className="mt-6">
        <VersionPanel profileId={profileId} />
      </div>
    </div>
  );
}
