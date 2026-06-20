import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "wouter";
import { apiFetch } from "@/api/client";
import { VisualPageEditor } from "@/routes/admin/studio/canvas/VisualPageEditor";
import { SiteSettingsEditor } from "@/routes/admin/studio/frontend/SiteSettingsEditor";
import { WizardVisualEditor } from "@/routes/admin/studio/wizard/WizardVisualEditor";
import { navFromApi, type WizardNavState } from "@/routes/admin/studio/wizard/wizardTypes";
import { PdfStudioEditor } from "@/routes/admin/studio/pdf/PdfStudioEditor";
import { StudioEditorTopBar } from "@/routes/admin/studio/figma/StudioEditorTopBar";
import { FigmaEditorFrame } from "@/routes/admin/studio/figma/FigmaEditorFrame";
import type { ConstructorTab, FrontendMode } from "@/routes/admin/studio/studioTabs";
import {
  filterStudioPages,
  isStudioPagesEditorPage,
  listPagesForSelector,
  pickDefaultStudioPageId,
} from "@/routes/admin/studio/studioPages";
import type { SiteConfig, PageConfig, BlockConfig } from "@pumpstation/contracts";
import type { ProfileBundle } from "@/api/config";
import { StudioProfileProvider } from "@/providers/StudioProfileProvider";
import { DraftSitePreview } from "@/routes/admin/studio/preview/DraftSitePreview";
import type { StrelaAppearance } from "@/lib/strela/appearance";
import {
  siteConfigFingerprint,
  wizardNavFingerprint,
  wizardPageFramesFingerprint,
} from "@/routes/admin/studio/studioDraftUtils";

interface ProfileData {
  profile: Record<string, unknown>;
  branding: Record<string, unknown>;
  wizard: Record<string, unknown>;
  site?: SiteConfig;
}

function pickEditablePageId(pages: PageConfig[]): string | null {
  return pickDefaultStudioPageId(pages);
}

export function AdminProfileStudio() {
  const { profileId } = useParams<{ profileId: string }>();
  const [data, setData] = useState<ProfileData | null>(null);
  const [activeTab, setActiveTab] = useState<ConstructorTab>("frontend");
  const [frontendMode, setFrontendMode] = useState<FrontendMode>("pages");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveMsg, setSaveMsg] = useState("");
  const [pagePreview, setPagePreview] = useState(false);
  const [sitePreview, setSitePreview] = useState(false);
  const [pdfPreview, setPdfPreview] = useState(false);
  const pdfSaveRef = useRef<(() => Promise<void>) | null>(null);
  const wizardSaveRef = useRef<(() => Promise<void>) | null>(null);
  const savedSiteFpRef = useRef("");
  const savedWizardNavFpRef = useRef("");
  const savedWizardPageFpRef = useRef("");
  const [wizardDirty, setWizardDirty] = useState({ nav: false, frames: false, appearance: false });
  const [wizardDraftPage, setWizardDraftPage] = useState<PageConfig | null>(null);
  const [wizardDraftNav, setWizardDraftNav] = useState<WizardNavState | null>(null);

  const [pages, setPages] = useState<PageConfig[]>([]);
  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const [layout, setLayout] = useState<SiteConfig["layout"]>({
    header: { logo: { src: "/logo.svg", width: 180, link: "/" }, menu: [], loginButton: true },
    footer: { columns: [], copyright: "" },
  });
  const [routing, setRouting] = useState<SiteConfig["routing"]>({ landingPageId: "home" });

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
        setRouting(siteConfig.routing ?? { landingPageId: "home" });
        setSelectedPageId(pickEditablePageId(loadedPages));
        savedSiteFpRef.current = siteConfigFingerprint({
          layout: siteConfig.layout,
          pages: loadedPages,
          routing: siteConfig.routing ?? { landingPageId: "home" },
        });
        const nav = navFromApi(d.wizard);
        savedWizardNavFpRef.current = wizardNavFingerprint(nav);
        savedWizardPageFpRef.current = wizardPageFramesFingerprint(
          loadedPages.find((p) => p.type === "wizard"),
        );
        setWizardDirty({ nav: false, frames: false, appearance: false });
        setWizardDraftPage(null);
        setWizardDraftNav(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [profileId]);

  const saveSiteConfig = async (newSite: SiteConfig) => {
    if (!profileId) return;
    setSaveMsg("");
    try {
      await apiFetch(`/api/v1/admin/profiles/${encodeURIComponent(profileId)}/site`, {
        method: "PUT",
        body: JSON.stringify(newSite),
      });
      setSaveMsg("Сохранено");
      savedSiteFpRef.current = siteConfigFingerprint(newSite);
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
      setData((prev) => (prev ? { ...prev, branding } : prev));
      setSaveMsg("Стили сохранены");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  };

  const handleSaveSite = () =>
    saveSiteConfig({ layout, pages: pagesRef.current, routing });

  const handleSaveLayout = (nextLayout: SiteConfig["layout"]) => {
    setLayout(nextLayout);
    saveSiteConfig({ layout: nextLayout, pages: pagesRef.current, routing });
  };

  const handleSaveRouting = (nextRouting: NonNullable<SiteConfig["routing"]>) => {
    setRouting(nextRouting);
    saveSiteConfig({ layout, pages: pagesRef.current, routing: nextRouting });
  };

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
    setPages((prev) => [...prev, newPage]);
    setSelectedPageId(id);
    return id;
  }, []);

  useEffect(() => {
    setSelectedBlockId(null);
  }, [selectedPageId]);

  useEffect(() => {
    const editable = filterStudioPages(pages);
    if (selectedPageId && !editable.some((p) => p.id === selectedPageId)) {
      setSelectedPageId(pickDefaultStudioPageId(editable));
    }
  }, [pages, selectedPageId]);

  const deletePage = (pageId: string) => {
    setPages((prev) => {
      const updated = prev.filter((p) => p.id !== pageId);
      if (selectedPageId === pageId) {
        setSelectedPageId(pickEditablePageId(updated));
      }
      return updated;
    });
  };

  const updatePageBlocks = useCallback((pageId: string, blocks: BlockConfig[]) => {
    setPages((prev) => {
      const next = prev.map((p) => (p.id === pageId ? { ...p, blocks } : p));
      pagesRef.current = next;
      return next;
    });
  }, []);

  const handleSaveWizard = async (
    nav: WizardNavState,
    wizardPageDraft?: PageConfig,
    appearanceDraft?: StrelaAppearance,
  ) => {
    if (!profileId) return;
    setSaveMsg("");
    try {
      await apiFetch(`/api/v1/admin/profiles/${encodeURIComponent(profileId)}/wizard`, {
        method: "PUT",
        body: JSON.stringify({
          navigation: { steps: nav.steps, cards: nav.cards },
          flows: nav.flows ?? {},
        }),
      });
      let nextPages = pages;
      if (wizardPageDraft) {
        nextPages = pages.map((p) => (p.id === wizardPageDraft.id ? wizardPageDraft : p));
        setPages(nextPages);
        await apiFetch(`/api/v1/admin/profiles/${encodeURIComponent(profileId)}/site`, {
          method: "PUT",
          body: JSON.stringify({ layout, pages: nextPages, routing }),
        });
        savedSiteFpRef.current = siteConfigFingerprint({ layout, pages: nextPages, routing });
      }
      if (appearanceDraft && data?.branding) {
        const nextBranding = {
          ...data.branding,
          appearance: appearanceDraft,
        };
        await apiFetch(`/api/v1/admin/profiles/${encodeURIComponent(profileId)}/branding`, {
          method: "PUT",
          body: JSON.stringify({ branding: nextBranding }),
        });
        setData((prev) => (prev ? { ...prev, branding: nextBranding } : prev));
      }
      setData((prev) =>
        prev
          ? {
              ...prev,
              wizard: {
                navigation: { steps: nav.steps, cards: nav.cards },
                flows: nav.flows ?? {},
              },
            }
          : prev,
      );
      savedWizardNavFpRef.current = wizardNavFingerprint(nav);
      if (wizardPageDraft) {
        savedWizardPageFpRef.current = wizardPageFramesFingerprint(wizardPageDraft);
      }
      setWizardDirty({ nav: false, frames: false, appearance: false });
      setSaveMsg(
        wizardPageDraft && appearanceDraft
          ? "Визард, frames и оболочка сохранены"
          : wizardPageDraft
            ? "Визард и frames сохранены"
            : appearanceDraft
              ? "Визард и оболочка сохранены"
              : "Визард сохранён",
      );
      setTimeout(() => setSaveMsg(""), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения визарда");
    }
  };

  const handleWizardDraftPageChange = useCallback((pageDraft: PageConfig) => {
    setWizardDraftPage(pageDraft);
  }, []);

  const handleWizardDraftNavChange = useCallback((nav: WizardNavState) => {
    setWizardDraftNav(nav);
  }, []);

  const profileBundle: ProfileBundle | null = data
    ? {
        profile: data.profile as ProfileBundle["profile"],
        branding: data.branding as unknown as ProfileBundle["branding"],
        wizard: data.wizard as ProfileBundle["wizard"],
      }
    : null;

  const wizardInitialNav = data ? navFromApi(data.wizard) : null;

  const previewPages = useMemo(() => {
    if (!wizardDraftPage) return pages;
    return pages.map((p) => (p.id === wizardDraftPage.id ? wizardDraftPage : p));
  }, [pages, wizardDraftPage]);

  const previewSite = useMemo<SiteConfig>(
    () => ({ layout, pages: previewPages, routing }),
    [layout, previewPages, routing],
  );

  const previewBundle = useMemo((): ProfileBundle | null => {
    if (!profileBundle) return null;
    if (!wizardDraftNav) return profileBundle;
    return {
      ...profileBundle,
      wizard: {
        ...profileBundle.wizard,
        navigation: { steps: wizardDraftNav.steps, cards: wizardDraftNav.cards },
        flows: wizardDraftNav.flows ?? {},
      },
    };
  }, [profileBundle, wizardDraftNav]);

  const selectedPage = pages.find((p) => p.id === selectedPageId);
  const studioPages = filterStudioPages(pages);
  const selectorPages = listPagesForSelector(pages);
  const isWizardPageSelected = selectedPage?.type === "wizard";
  const pageBlocks = selectedPage?.blocks ?? [];
  const profileTitle = (data?.branding as { appTitle?: string })?.appTitle ?? profileId ?? "";

  const handleSelectPage = useCallback((pageId: string) => {
    setSelectedPageId(pageId);
    setPagePreview(false);
    setFrontendMode("pages");
  }, []);

  const siteDirty =
    savedSiteFpRef.current !== "" &&
    siteConfigFingerprint({ layout, pages, routing }) !== savedSiteFpRef.current;

  const dirtyHint =
    activeTab === "frontend" &&
    isWizardPageSelected &&
    (wizardDirty.nav || wizardDirty.frames || wizardDirty.appearance)
      ? `● ${[
          wizardDirty.nav && "навигация",
          wizardDirty.frames && "макет",
          wizardDirty.appearance && "оболочка",
        ]
          .filter(Boolean)
          .join(" + ")} не сохранены`
      : activeTab === "frontend" && siteDirty
        ? "● Сайт не сохранён"
        : undefined;

  const contextLabel =
    activeTab === "pdf"
      ? "PDF документ"
      : frontendMode === "settings"
        ? "Стили и меню"
        : undefined;

  if (loading) {
    return <div className="flex items-center justify-center p-12 text-neutral-500">Загрузка профиля...</div>;
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  if (!profileBundle) {
    return (
      <div className="flex items-center justify-center p-12 text-neutral-500">
        Не удалось загрузить профиль
      </div>
    );
  }

  return (
    <StudioProfileProvider bundle={profileBundle}>
      <FigmaEditorFrame>
        <StudioEditorTopBar
          profileTitle={profileTitle}
          pages={selectorPages}
          selectedPageId={
            selectedPageId && selectorPages.some((p) => p.id === selectedPageId)
              ? selectedPageId
              : pickDefaultStudioPageId(studioPages)
          }
          onSelectPage={handleSelectPage}
          onAddPage={addPage}
          onDeletePage={deletePage}
          activeTab={activeTab}
          onTabChange={(tab) => {
            setPagePreview(false);
            setSitePreview(false);
            setPdfPreview(false);
            setActiveTab(tab);
          }}
          frontendMode={frontendMode}
          onFrontendModeChange={(mode) => {
            setPagePreview(false);
            setSitePreview(false);
            setFrontendMode(mode);
          }}
          contextLabel={contextLabel}
          onSave={
            activeTab === "pdf"
              ? handleSavePdf
              : frontendMode === "pages" && isWizardPageSelected
                ? () => wizardSaveRef.current?.()
                : frontendMode === "pages"
                  ? handleSaveSite
                  : undefined
          }
          dirtyHint={dirtyHint}
          onPreview={
            activeTab === "pdf"
              ? () => setPdfPreview(true)
              : activeTab === "frontend" && frontendMode === "pages" && selectedPage
                ? isWizardPageSelected
                  ? () => {
                      setPagePreview(false);
                      setSitePreview(true);
                    }
                  : isStudioPagesEditorPage(selectedPage)
                    ? () => {
                        setSitePreview(false);
                        setPagePreview(true);
                      }
                    : undefined
                : undefined
          }
          saveMsg={saveMsg}
        />

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          {sitePreview && previewBundle ? (
            <DraftSitePreview
              site={previewSite}
              bundle={previewBundle}
              onClose={() => setSitePreview(false)}
            />
          ) : (
            <>
          {activeTab === "frontend" &&
            frontendMode === "pages" &&
            isWizardPageSelected &&
            selectedPage &&
            !wizardInitialNav && (
            <div className="flex flex-1 items-center justify-center text-sm text-[#888]">
              Не удалось загрузить конфигурацию визарда
            </div>
          )}

          {activeTab === "frontend" &&
            frontendMode === "pages" &&
            isWizardPageSelected &&
            selectedPage &&
            wizardInitialNav && (
            <WizardVisualEditor
              page={selectedPage}
              site={{ layout, pages, routing }}
              profileBundle={profileBundle}
              initialNav={wizardInitialNav}
              onSave={handleSaveWizard}
              onDirtyChange={setWizardDirty}
              onRegisterSave={(fn) => {
                wizardSaveRef.current = fn;
              }}
              onDraftPageChange={handleWizardDraftPageChange}
              onNavDraftChange={handleWizardDraftNavChange}
            />
          )}

          {activeTab === "frontend" &&
            frontendMode === "pages" &&
            selectedPage &&
            !isWizardPageSelected &&
            isStudioPagesEditorPage(selectedPage) && (
            <VisualPageEditor
              key={selectedPage.id}
              blocks={pageBlocks}
              page={selectedPage}
              site={{ layout, pages, routing }}
              previewMode={pagePreview}
              onPreviewClose={() => setPagePreview(false)}
              onPageChange={(patch) => {
                setPages((prev) => {
                  const next = prev.map((p) => {
                    if (p.id !== selectedPage.id) return p;
                    const latest = pagesRef.current.find((x) => x.id === p.id);
                    return { ...(latest ?? p), ...patch };
                  });
                  pagesRef.current = next;
                  return next;
                });
              }}
              onBlocksChange={(nextBlocks) => updatePageBlocks(selectedPage.id, nextBlocks)}
              selectedBlockId={selectedBlockId}
              onSelectBlock={setSelectedBlockId}
              profileId={profileId}
            />
          )}

          {activeTab === "frontend" && frontendMode === "pages" && !selectedPage && (
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

          {activeTab === "frontend" && frontendMode === "settings" && data?.branding && (
            <SiteSettingsEditor
              branding={data.branding}
              layout={layout}
              routing={routing}
              pages={pages}
              onSaveTheme={handleSaveTheme}
              onSaveLayout={handleSaveLayout}
              onSaveRouting={handleSaveRouting}
            />
          )}

          {activeTab === "pdf" && (
            <PdfStudioEditor
              profileId={profileId}
              branding={data?.branding}
              previewOpen={pdfPreview}
              onPreviewClose={() => setPdfPreview(false)}
              onRegisterSave={(fn) => {
                pdfSaveRef.current = fn;
              }}
            />
          )}
            </>
          )}
        </div>
      </FigmaEditorFrame>
    </StudioProfileProvider>
  );
}
