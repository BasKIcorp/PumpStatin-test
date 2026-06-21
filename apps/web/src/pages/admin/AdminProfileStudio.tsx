import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "wouter";
import { apiFetch } from "@/api/client";
import { VisualPageEditor } from "@/routes/admin/studio/canvas/VisualPageEditor";
import { SiteSettingsEditor } from "@/routes/admin/studio/frontend/SiteSettingsEditor";
import { WizardUnifiedStudioEditor } from "@/routes/admin/studio/wizard/WizardUnifiedStudioEditor";
import {
  normalizeWizardPage,
  persistNormalizedWizardPage,
} from "@/routes/admin/studio/wizard/wizardUnifiedBlocks";
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
import { DraftPagePreview } from "@/routes/admin/studio/preview/DraftPagePreview";
import { WizardNavPanel } from "@/routes/admin/studio/wizard/panels/WizardNavPanel";
import type { StrelaAppearance } from "@/lib/strela/appearance";
import {
  siteConfigFingerprint,
  wizardAppearanceFingerprint,
  wizardBundleFingerprint,
  wizardNavFingerprint,
  wizardPageLayoutFingerprint,
} from "@/routes/admin/studio/studioDraftUtils";
import {
  saveWizardBundle,
  WizardSaveError,
  wizardSavePhaseLabel,
} from "@/routes/admin/studio/studioSaveUtils";

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
  const [wizardPreviewStep, setWizardPreviewStep] = useState("product-class");
  const [wizardAppearanceDraft, setWizardAppearanceDraft] = useState<StrelaAppearance | null>(null);
  const pdfSaveRef = useRef<(() => Promise<void>) | null>(null);
  const wizardSaveRef = useRef<(() => Promise<void>) | null>(null);
  const savedSiteFpRef = useRef("");
  const savedWizardNavFpRef = useRef("");
  const savedWizardPageFpRef = useRef("");
  const savedWizardAppearanceFpRef = useRef("");
  const savedWizardBundleFpRef = useRef("");
  const [savedWizardBundleFp, setSavedWizardBundleFp] = useState("");
  const [wizardDirty, setWizardDirty] = useState(false);
  const [pdfDirty, setPdfDirty] = useState(false);
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
        const loadedPages = (siteConfig.pages ?? []).map((p) =>
          p.type === "wizard" ? persistNormalizedWizardPage(normalizeWizardPage(p)) : p,
        );
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
        const wizardPage = loadedPages.find((p) => p.type === "wizard");
        savedWizardPageFpRef.current = wizardPageLayoutFingerprint(
          wizardPage ? normalizeWizardPage(wizardPage) : undefined,
        );
        savedWizardAppearanceFpRef.current = wizardAppearanceFingerprint(
          (d.branding as { appearance?: unknown })?.appearance,
        );
        savedWizardBundleFpRef.current = wizardBundleFingerprint(
          nav,
          wizardPage ? normalizeWizardPage(wizardPage) : undefined,
          (d.branding as { appearance?: unknown })?.appearance,
        );
        setSavedWizardBundleFp(savedWizardBundleFpRef.current);
        setWizardDirty(false);
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
      setPdfDirty(false);
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
    options?: { saveSite?: boolean; saveAppearance?: boolean },
  ) => {
    if (!profileId || !data?.branding) return;
    setSaveMsg("");
    setError("");
    const saveSite = options?.saveSite ?? Boolean(wizardPageDraft);
    const saveAppearance = options?.saveAppearance ?? Boolean(appearanceDraft);

    try {
      const { nav: savedNav } = await saveWizardBundle({
        profileId,
        nav,
        wizardPageDraft,
        appearanceDraft,
        layout,
        pages,
        routing,
        branding: data.branding,
        saveSite,
        saveAppearance,
      });

      let nextPages = pages;
      if (saveSite && wizardPageDraft) {
        const persisted = persistNormalizedWizardPage(wizardPageDraft);
        nextPages = pages.map((p) => (p.id === wizardPageDraft.id ? persisted : p));
        setPages(nextPages);
        savedSiteFpRef.current = siteConfigFingerprint({ layout, pages: nextPages, routing });
      }

      const nextBranding =
        saveAppearance && appearanceDraft
          ? { ...data.branding, appearance: appearanceDraft }
          : data.branding;

      setWizardDraftNav(savedNav);

      setData((prev) =>
        prev
          ? {
              ...prev,
              branding: nextBranding,
              wizard: {
                navigation: { steps: savedNav.steps, cards: savedNav.cards },
                flows: savedNav.flows ?? {},
              },
            }
          : prev,
      );

      savedWizardNavFpRef.current = wizardNavFingerprint(savedNav);
      if (wizardPageDraft) {
        savedWizardPageFpRef.current = wizardPageLayoutFingerprint(
          normalizeWizardPage(wizardPageDraft),
        );
      }
      if (saveAppearance && appearanceDraft) {
        savedWizardAppearanceFpRef.current = wizardAppearanceFingerprint(appearanceDraft);
      }
      savedWizardBundleFpRef.current = wizardBundleFingerprint(
        savedNav,
        wizardPageDraft
          ? normalizeWizardPage(wizardPageDraft)
          : pages.find((p) => p.type === "wizard")
            ? normalizeWizardPage(pages.find((p) => p.type === "wizard")!)
            : undefined,
        saveAppearance && appearanceDraft
          ? appearanceDraft
          : (data.branding as { appearance?: StrelaAppearance }).appearance,
      );
      setSavedWizardBundleFp(savedWizardBundleFpRef.current);
      setWizardDirty(false);
      setSaveMsg("Визард сохранён");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch (e) {
      if (e instanceof WizardSaveError) {
        setError(
          `${e.message} (этап: ${wizardSavePhaseLabel(e.phase)})`,
        );
      } else {
        setError(e instanceof Error ? e.message : "Ошибка сохранения визарда");
      }
    }
  };

  const handleWizardDraftPageChange = useCallback((pageDraft: PageConfig) => {
    setWizardDraftPage(persistNormalizedWizardPage(normalizeWizardPage(pageDraft)));
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

  const wizardInitialNav = useMemo(
    () => (data ? navFromApi(data.wizard) : null),
    [data?.wizard],
  );

  useEffect(() => {
    if (wizardInitialNav) setWizardDraftNav(wizardInitialNav);
  }, [wizardInitialNav]);

  const wizardPageNormalized = useMemo(() => {
    const raw = wizardDraftPage ?? pages.find((p) => p.type === "wizard");
    return raw ? normalizeWizardPage(raw) : null;
  }, [wizardDraftPage, pages]);

  const handleSelectedPageBlocksChange = useCallback(
    (nextBlocks: BlockConfig[]) => {
      if (selectedPageId) updatePageBlocks(selectedPageId, nextBlocks);
    },
    [selectedPageId, updatePageBlocks],
  );

  const previewPages = useMemo(() => {
    const draft = wizardPageNormalized;
    if (!draft) return pages;
    return pages.map((p) => (p.id === draft.id ? draft : p));
  }, [pages, wizardPageNormalized]);

  const previewSite = useMemo<SiteConfig>(
    () => ({ layout, pages: previewPages, routing }),
    [layout, previewPages, routing],
  );

  const previewBundle = useMemo((): ProfileBundle | null => {
    if (!profileBundle) return null;
    const withNav = wizardDraftNav
      ? {
          ...profileBundle,
          wizard: {
            ...profileBundle.wizard,
            navigation: { steps: wizardDraftNav.steps, cards: wizardDraftNav.cards },
            flows: wizardDraftNav.flows ?? {},
          },
        }
      : profileBundle;
    if (!wizardAppearanceDraft) return withNav;
    return {
      ...withNav,
      branding: {
        ...withNav.branding,
        appearance: wizardAppearanceDraft,
      },
    };
  }, [profileBundle, wizardDraftNav, wizardAppearanceDraft]);

  const selectedPage = pages.find((p) => p.id === selectedPageId);
  const studioPages = filterStudioPages(pages);
  const selectorPages = listPagesForSelector(pages);
  const isWizardPageSelected = selectedPage?.type === "wizard";
  /** Option C: unified editor for all wizard pages (legacy frames normalized at runtime). */
  const wizardUsesUnified = isWizardPageSelected;

  useEffect(() => {
    if (!isWizardPageSelected) setWizardDirty(false);
  }, [isWizardPageSelected]);

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
    activeTab === "pdf" && pdfDirty
      ? "● PDF шаблон не сохранён"
      : activeTab === "frontend" && isWizardPageSelected && wizardDirty
        ? "● Визард не сохранён (навигация + макет + оболочка)"
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
          wizardStepSwitcher={
            activeTab === "frontend" &&
            frontendMode === "pages" &&
            isWizardPageSelected &&
            wizardDraftNav ? (
              <WizardNavPanel
                nav={wizardDraftNav}
                selectedStepId={wizardPreviewStep}
                onSelectStep={setWizardPreviewStep}
                onRemoveStep={() => {}}
                canUndo={false}
                canRedo={false}
                onUndo={() => {}}
                onRedo={() => {}}
                compactStepSwitcher
              />
            ) : undefined
          }
          onPreview={
            activeTab === "pdf"
              ? () => setPdfPreview(true)
              : activeTab === "frontend" && frontendMode === "pages" && selectedPage
                ? isWizardPageSelected
                  ? () => {
                      setSitePreview(false);
                      setPagePreview(true);
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
              previewWizardStepId={wizardPreviewStep}
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
            wizardInitialNav &&
            wizardUsesUnified && (
            <WizardUnifiedStudioEditor
              page={selectedPage}
              site={{ layout, pages: previewPages, routing }}
              profileBundle={profileBundle}
              initialNav={wizardInitialNav}
              onSave={handleSaveWizard}
              onDirtyChange={setWizardDirty}
              previewStepId={wizardPreviewStep}
              savedBundleFingerprint={savedWizardBundleFp}
              onRegisterSave={(fn) => {
                wizardSaveRef.current = fn;
              }}
              onDraftPageChange={handleWizardDraftPageChange}
              onNavDraftChange={handleWizardDraftNavChange}
              onPreviewStepChange={setWizardPreviewStep}
              onAppearanceDraftChange={setWizardAppearanceDraft}
            />
          )}

          {pagePreview &&
            isWizardPageSelected &&
            selectedPage &&
            previewBundle && (
            <DraftPagePreview
              page={wizardPageNormalized ?? wizardDraftPage ?? selectedPage}
              site={previewSite}
              bundle={previewBundle}
              previewWizardStepId={wizardPreviewStep}
              onClose={() => setPagePreview(false)}
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
              onBlocksChange={handleSelectedPageBlocksChange}
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
              onDirtyChange={setPdfDirty}
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
