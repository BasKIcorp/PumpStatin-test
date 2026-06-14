import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { apiFetch } from "@/api/client";
import { StudioShell } from "@/routes/admin/studio/StudioShell";
import { ThemeEditor } from "@/routes/admin/studio/theme/ThemeEditor";
import { PageList } from "@/routes/admin/studio/pages/PageList";
import { BlockEditor } from "@/routes/admin/studio/pages/BlockEditor";
import { MenuEditor, FooterEditor } from "@/routes/admin/studio/layout/LayoutEditor";
import { WizardEditorShell } from "@/routes/admin/studio/wizard/WizardEditorShell";
import { PdfPlaceholder } from "@/routes/admin/studio/pdf/PdfPlaceholder";
import type { SiteConfig, PageConfig, BlockConfig } from "@pumpstation/contracts";

interface ProfileData {
  profile: Record<string, unknown>;
  branding: Record<string, unknown>;
  wizard: Record<string, unknown>;
  site?: SiteConfig;
}

export function AdminProfileStudio() {
  const { profileId } = useParams<{ profileId: string }>();
  const [data, setData] = useState<ProfileData | null>(null);
  const [activeTab, setActiveTab] = useState("theme");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveMsg, setSaveMsg] = useState("");

  // Состояние редактора страниц
  const [pages, setPages] = useState<PageConfig[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [pageBlocks, setPageBlocks] = useState<BlockConfig[]>([]);

  // Состояние редактора layout
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
        const siteConfig = (d.site ?? { layout: layout, pages: [] }) as SiteConfig;
        setPages(siteConfig.pages ?? []);
        setLayout(siteConfig.layout);
        if (siteConfig.pages.length > 0) {
          setSelectedPageId(siteConfig.pages[0].id);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [profileId]);

  // Когда выбирается страница — подгружаем её блоки
  useEffect(() => {
    if (!selectedPageId) return;
    const page = pages.find((p) => p.id === selectedPageId);
    setPageBlocks(page?.blocks ?? []);
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

  const handleSaveSite = () => {
    saveSiteConfig({ layout, pages });
  };

  const addPage = () => {
    const id = `page-${Date.now()}`;
    const newPage: PageConfig = {
      id,
      title: "Новая страница",
      route: `/${id}`,
      inMenu: true,
      type: "page",
      blocks: [],
    };
    const updated = [...pages, newPage];
    setPages(updated);
    setSelectedPageId(id);
    setPageBlocks([]);
  };

  const deletePage = (pageId: string) => {
    const updated = pages.filter((p) => p.id !== pageId);
    setPages(updated);
    if (selectedPageId === pageId) {
      setSelectedPageId(updated[0]?.id ?? null);
    }
  };

  const updatePageBlocks = (blocks: BlockConfig[]) => {
    setPageBlocks(blocks);
    setPages(pages.map((p) => (p.id === selectedPageId ? { ...p, blocks } : p)));
  };

  const selectedPage = pages.find((p) => p.id === selectedPageId);

  if (loading) {
    return <div className="flex items-center justify-center p-12 text-neutral-500">Загрузка профиля...</div>;
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Конструктор: {(data?.branding as any)?.appTitle ?? profileId}
        </h2>
        {saveMsg && (
          <span className="rounded bg-green-100 px-3 py-1 text-xs text-green-700">{saveMsg}</span>
        )}
      </div>

      <StudioShell
        profileId={profileId ?? ""}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        {activeTab === "theme" && data?.branding && (
          <ThemeEditor
            branding={data.branding}
            onSave={handleSaveTheme}
          />
        )}

        {activeTab === "pages" && (
          <div className="flex gap-6">
            <div className="w-64 shrink-0">
              <PageList
                pages={pages}
                selectedId={selectedPageId}
                onSelect={setSelectedPageId}
                onAdd={addPage}
                onDelete={deletePage}
              />
            </div>
            <div className="min-w-0 flex-1">
              {selectedPage ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <label className="block text-xs text-neutral-600">Название</label>
                      <input
                        className="rounded border border-neutral-300 px-2 py-1 text-sm"
                        value={selectedPage.title}
                        onChange={(e) => {
                          const updated = pages.map((p) =>
                            p.id === selectedPage.id ? { ...p, title: e.target.value } : p,
                          );
                          setPages(updated);
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-600">Роут</label>
                      <input
                        className="rounded border border-neutral-300 px-2 py-1 text-sm font-mono"
                        value={selectedPage.route}
                        onChange={(e) => {
                          const updated = pages.map((p) =>
                            p.id === selectedPage.id ? { ...p, route: e.target.value } : p,
                          );
                          setPages(updated);
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-1 pt-4">
                      <input
                        type="checkbox"
                        id="inMenu"
                        checked={selectedPage.inMenu}
                        onChange={(e) => {
                          const updated = pages.map((p) =>
                            p.id === selectedPage.id ? { ...p, inMenu: e.target.checked } : p,
                          );
                          setPages(updated);
                        }}
                      />
                      <label htmlFor="inMenu" className="text-xs text-neutral-600">
                        В меню
                      </label>
                    </div>
                    {selectedPage.type === "wizard" && (
                      <div className="pt-4">
                        <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                          Тип: Визард (wizardRef: {selectedPage.wizardRef ?? "navigation.yaml"})
                        </span>
                      </div>
                    )}
                  </div>
                  {selectedPage.type !== "wizard" && (
                    <BlockEditor
                      blocks={pageBlocks}
                      onChange={updatePageBlocks}
                    />
                  )}
                  {selectedPage.type === "wizard" && (
                    <p className="py-4 text-sm text-neutral-500">
                      Страница визарда не использует блоки. Шаги редактируются во вкладке «Визард».
                    </p>
                  )}
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-neutral-400">
                  Выберите страницу слева или создайте новую.
                </p>
              )}
            </div>
          </div>
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

        {activeTab === "wizard" && <WizardEditorShell />}

        {activeTab === "pdf" && <PdfPlaceholder />}
      </StudioShell>

      {/* Кнопка сохранения всего сайта (для вкладок Страницы и Layout) */}
      {(activeTab === "pages" || activeTab === "layout") && (
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
    </div>
  );
}
