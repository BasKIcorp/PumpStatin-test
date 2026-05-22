import React, {useState, useCallback, useMemo, useEffect, useRef} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import Header from "@/components/layout/Header";
import { SelectionFlowLayout } from "@/components/layout/SelectionFlowLayout";
import { SelectionStageProgress } from "@/components/selection/SelectionStageProgress";
import PumpSearchForm, {
  PumpSearchFormValues,
  PumpOperatingPointDisplay,
  PUMP_SEARCH_FORM_DESKTOP_ID,
  type PumpSearchFormHandle,
} from "@/components/PumpSearchForm";
import StationConfigForm, {StationConfigFormValues} from "@/components/StationConfigForm";
import PumpsList from "@/components/PumpsList";
import PumpCurveGraph from "@/components/PumpCurveGraph";
import SecondGraph from "@/components/SecondGraph";
import StationResults from "@/components/StationResults";
import { ProductCategorySelector } from "@/components/selection/ProductCategorySelector";
import { HydromoduleLineSelector } from "@/components/selection/HydromoduleLineSelector";
import type { ProductCategory, HydromoduleLineId, PumpUnitLineCode } from "@/lib/selectionRoute";
import { parametersPageTitle } from "@/lib/selectionRoute";
import { useApiSiteSlug, useSiteSlug } from "@/lib/site";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { getMatchingPumps, getStationResult, downloadTechSheetPdf, downloadStationPdf } from "@/lib/api";
import { Pump, StationResult } from "@/lib/types";
import { ensureCsrf } from "@/lib/csrf";
import axiosInstance from "@/lib/csrf";
import { FUNNEL_SIDEBAR_WORDMARK_DEFAULT, selectionSlidePng } from "@/lib/selectionAssets";
import { bustAppearanceMediaUrls } from "@/lib/appearanceMedia";
import { applyFunnelTheme, type FunnelFontKey } from "@/lib/funnelTheme";
import type { SelectionStageTitles } from "@/lib/api";
import type { SelectionCardSettings } from "@/lib/selectionCardSettings";
import {
  resolvedSelectionTitle,
  type SelectionFunnelStep,
  type StageHeadingsFlat,
} from "@/lib/selectionFlowCopy";
import "@/lib/serverTest"; // Импортируем утилиту для тестирования серверов
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  SelectionWorkLayoutGate,
  type SelectionWorkLayoutData,
  type SelectionWorkSlots,
} from "@/components/SelectionWorkLayout";

/** Десктопный этап подбора: панели и шапки карточек */
/** Акцентная левая линия у блока под курсором или при фокусе внутри (экран параметров) */
const WORK_STAGE_ACCENT_HOVER =
  "border-l-[3px] border-l-transparent transition-[border-left-color] duration-200 ease-out hover:border-l-[var(--funnel-primary)] focus-within:border-l-[var(--funnel-primary)]";
const WORK_DESKTOP_PANEL = cn(
  "selection-work-panel flex min-h-0 flex-col overflow-hidden rounded-lg",
  WORK_STAGE_ACCENT_HOVER,
);
const WORK_DESKTOP_CARD_HEAD = "selection-work-panel-head";
const WORK_BTN_SECONDARY = cn(
  "inline-flex items-center justify-center rounded-md border-0 px-2 py-2 text-center text-xs font-medium transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 selection-work-btn-secondary",
);
const WORK_BTN_PRIMARY = cn(
  "h-9 flex-1 border-0 text-sm font-medium shadow-sm transition-colors hover:opacity-90 selection-work-btn-primary",
);
const WORK_DESKTOP_FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--funnel-primary)] focus-visible:ring-offset-2";

type FlowStep = "cards" | "hm_line" | "parameters";

const Home: React.FC = () => {
  const { showNotification } = useToastNotification();
  const siteSlug = useSiteSlug();
  const apiSiteSlug = useApiSiteSlug();
  const { user, loading: authLoading } = useAuth();
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  const pendingSelectionSnapshotIdRef = useRef<number | null>(null);

  const [flowStep, setFlowStep] = useState<FlowStep>("cards");
  const [productCategory, setProductCategory] = useState<ProductCategory | null>(null);
  const [hydromoduleLine, setHydromoduleLine] = useState<HydromoduleLineId | null>(null);
  const [pumpUnitLine, setPumpUnitLine] = useState<PumpUnitLineCode | null>(null);
  const [pumpUnitLineLabel, setPumpUnitLineLabel] = useState<string | null>(null);
  const [puStationSubtype, setPuStationSubtype] = useState<"хоз-пит" | "пнс" | null>(null);
  const [selectedPumpTypeCode, setSelectedPumpTypeCode] = useState<string | null>(null);

  const [appearance, setAppearance] = useState({
    primary_color: "#13347f",
    accent_color: "#0ea5e9",
    funnel_page_background_color: "#ffffff",
    funnel_surface_color: "#ffffff",
    funnel_card_media_background_color: "#eff0f9",
    funnel_font_heading: "segoe" as FunnelFontKey,
    funnel_font_body: "open_sans" as FunnelFontKey,
    sidebar_text: "",
    brand_key: "strela" as "strela" | "simpel",
    hydromodule_card_urls: {} as Partial<Record<HydromoduleLineId, string | null>>,
    logo_url: null as string | null,
    funnel_sidebar_wordmark_url: null as string | null,
    appearance_version: null as string | null,
    selection_card_caption_logo_url: null as string | null,
    selection_flow_header_logo_url: null as string | null,
    selection_stage_titles: null as SelectionStageTitles | null,
    selection_category_full_width: false,
    selection_card_settings: null as SelectionCardSettings | null,
    stage_headings: {} as StageHeadingsFlat,
  });

  useEffect(() => {
    if (authLoading) return;
    if (productCategory === "simpel_pumps" && (!user || user.role !== "admin")) {
      setProductCategory(null);
      setSelectedPumpTypeCode(null);
      setFlowStep("cards");
    }
  }, [productCategory, user, authLoading]);

  useEffect(() => {
    axiosInstance
      .get<{
        primary_color?: string;
        accent_color?: string;
        sidebar_text?: string;
        brand_key?: string;
        logo_url?: string | null;
        hydromodule_card_urls?: Partial<Record<string, string | null>>;
        funnel_sidebar_wordmark_url?: string | null;
        appearance_version?: string;
        updated_at?: string | null;
        selection_card_caption_logo_url?: string | null;
        selection_flow_header_logo_url?: string | null;
        selection_stage_titles?: SelectionStageTitles | null;
        selection_category_full_width?: boolean;
        selection_card_settings?: SelectionCardSettings | null;
        stage_headings?: StageHeadingsFlat | null;
        funnel_page_background_color?: string;
        funnel_surface_color?: string;
        funnel_card_media_background_color?: string;
        funnel_font_heading?: string;
        funnel_font_body?: string;
        funnel_text_color?: string;
        funnel_text_muted_color?: string;
        funnel_panel_header_background_color?: string;
        funnel_panel_header_text_color?: string;
        funnel_button_background_color?: string;
        funnel_button_text_color?: string;
        funnel_button_secondary_background_color?: string;
        funnel_button_secondary_text_color?: string;
        funnel_table_row_alt_background_color?: string;
        funnel_table_row_selected_background_color?: string;
      }>("/api/appearance")
      .then((r) => {
        const version = r.data.appearance_version ?? r.data.updated_at ?? null;
        const busted = bustAppearanceMediaUrls(r.data, version);
        const hm = busted.hydromodule_card_urls;
        setAppearance((a) => ({
          primary_color: busted.primary_color || a.primary_color,
          accent_color: busted.accent_color || a.accent_color,
          funnel_page_background_color:
            busted.funnel_page_background_color || a.funnel_page_background_color,
          funnel_surface_color: busted.funnel_surface_color || a.funnel_surface_color,
          funnel_card_media_background_color:
            busted.funnel_card_media_background_color || a.funnel_card_media_background_color,
          funnel_font_heading:
            (busted.funnel_font_heading as FunnelFontKey) || a.funnel_font_heading,
          funnel_font_body: (busted.funnel_font_body as FunnelFontKey) || a.funnel_font_body,
          sidebar_text: busted.sidebar_text ?? a.sidebar_text,
          brand_key: busted.brand_key === "simpel" ? "simpel" : "strela",
          logo_url: busted.logo_url ?? null,
          hydromodule_card_urls:
            hm && typeof hm === "object"
              ? (hm as Partial<Record<HydromoduleLineId, string | null>>)
              : a.hydromodule_card_urls,
          funnel_sidebar_wordmark_url: busted.funnel_sidebar_wordmark_url ?? null,
          selection_card_caption_logo_url: busted.selection_card_caption_logo_url ?? null,
          selection_flow_header_logo_url: busted.selection_flow_header_logo_url ?? null,
          selection_stage_titles:
            busted.selection_stage_titles && typeof busted.selection_stage_titles === "object"
              ? busted.selection_stage_titles
              : a.selection_stage_titles,
          selection_category_full_width: Boolean(busted.selection_category_full_width),
          selection_card_settings:
            busted.selection_card_settings != null &&
            typeof busted.selection_card_settings === "object"
              ? busted.selection_card_settings
              : busted.selection_card_settings === null
                ? null
                : a.selection_card_settings,
          stage_headings:
            busted.stage_headings && typeof busted.stage_headings === "object"
              ? {
                  category: busted.stage_headings.category,
                  hm_line: busted.stage_headings.hm_line,
                  pu_line: busted.stage_headings.pu_line,
                  pu_subtype: busted.stage_headings.pu_subtype,
                }
              : a.stage_headings,
          appearance_version: version,
        }));
        applyFunnelTheme(busted);
      })
      .catch(() => {});
  }, [apiSiteSlug]);

  const lockedStationType = useMemo((): "гм" | "хоз-пит" | "пнс" | null => {
    if (productCategory === "hydromodule") return "гм";
    if (productCategory === "pump_unit" && puStationSubtype) return puStationSubtype;
    return null;
  }, [productCategory, puStationSubtype]);

  const headerPageTitle = useMemo(
    () =>
      parametersPageTitle(
        productCategory,
        hydromoduleLine,
        pumpUnitLine,
        selectedPumpTypeCode,
        pumpUnitLineLabel,
      ),
    [productCategory, hydromoduleLine, pumpUnitLine, selectedPumpTypeCode, pumpUnitLineLabel],
  );

  const configSectionTitle =
    productCategory === "hydromodule"
      ? "Дополнительные опции гидромодуля"
      : productCategory === "pump_unit"
        ? "Дополнительные опции насосной установки"
        : "Конфигурация станции";

  const handleProductCategory = (c: ProductCategory) => {
    if (c === "simpel_pumps" && user?.role !== "admin") return;
    setProductCategory(c);
    setHasSearched(false);
    setSelectedPumpId(null);

    if (c === "hydromodule") {
      setHydromoduleLine(null);
      setPumpUnitLine(null);
      setPumpUnitLineLabel(null);
      setPuStationSubtype(null);
      setSelectedPumpTypeCode(null);
      setFlowStep("hm_line");
      return;
    } else if (c === "pump_unit") {
      setHydromoduleLine(null);
      setPumpUnitLine("bps-w");
      setPumpUnitLineLabel("BPS-W");
      setPuStationSubtype("хоз-пит");
      setSelectedPumpTypeCode(null);
    } else if (c === "simpel_pumps") {
      setHydromoduleLine(null);
      setPumpUnitLine(null);
      setPumpUnitLineLabel(null);
      setPuStationSubtype(null);
      setSelectedPumpTypeCode("CIVOS");
    } else {
      setHydromoduleLine(null);
      setPumpUnitLine(null);
      setPumpUnitLineLabel(null);
      setPuStationSubtype(null);
      setSelectedPumpTypeCode(null);
    }

    setFlowStep("parameters");
  };

  const handleHydromoduleLineSelect = useCallback((id: HydromoduleLineId) => {
    setHydromoduleLine(id);
    setHasSearched(false);
    setSelectedPumpId(null);
    setFlowStep("parameters");
  }, []);

  const goBackToCategoryCards = useCallback(() => {
    setProductCategory(null);
    setHydromoduleLine(null);
    setPumpUnitLine(null);
    setPumpUnitLineLabel(null);
    setPuStationSubtype(null);
    setSelectedPumpTypeCode(null);
    setFlowStep("cards");
  }, []);

  // State for search parameters
  const [searchParams, setSearchParams] = useState<PumpSearchFormValues>({
    Q: 15,
    H: 20,
    H_stat: 20,
    H_garant: 20,
    n1: 1,
    n2: 1,
    T: 1,
    pump_type: ["CIVOS", "COMOS", "VMIP", "HMIP"] as [string, ...string[]],
    medium_type: "вода",
    concentration: "",
    external_vfd: "",
  });

  // State for selected pump
  const [selectedPumpId, setSelectedPumpId] = useState<number | null>(null);

  // State to track if search has been performed
  const [hasSearched, setHasSearched] = useState(false);
  /** Чтобы не показывать «Найдено N насосов» повторно при лишних перерисовках с тем же снимком данных */
  const pumpSearchToastForUpdatedAtRef = useRef<number>(0);
  const pumpSearchErrorToastForUpdatedAtRef = useRef<number>(0);

  const goBackFromWork = useCallback(() => {
    setHasSearched(false);
    setSelectedPumpId(null);
    pumpSearchToastForUpdatedAtRef.current = 0;
    pumpSearchErrorToastForUpdatedAtRef.current = 0;
    if (productCategory === "hydromodule") {
      setHydromoduleLine(null);
      setFlowStep("hm_line");
      return;
    }
    setProductCategory(null);
    setHydromoduleLine(null);
    setPumpUnitLine(null);
    setPumpUnitLineLabel(null);
    setPuStationSubtype(null);
    setSelectedPumpTypeCode(null);
    setFlowStep("cards");
  }, [productCategory]);

  const workBackLabel =
    productCategory === "hydromodule" ? "К сериям" : "К карточкам";

  const lastStationSuccessToastKeyRef = useRef<string>("");

  // Ref for graphs container
  const graphsRef = useRef<HTMLDivElement>(null);
  const pumpSearchFormDesktopRef = useRef<PumpSearchFormHandle>(null);

  // State for synchronized mouse position across graphs
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  
  // State for manual slider control
  const [manualSliderValue, setManualSliderValue] = useState<number | null>(null);
  const [isManualControl, setIsManualControl] = useState(false);
  
  // State for tracking active graph to prevent conflicts
  const [activeGraph, setActiveGraph] = useState<'curve' | 'second' | null>(null);

  // Query for matching pumps - only enabled after search
  const {
    data: pumpsData,
    dataUpdatedAt,
    errorUpdatedAt,
    isLoading: isPumpsLoading,
    isError: isPumpsError,
    error: pumpsError,
    refetch: refetchPumps,
  } = useQuery({
    queryKey: [
      "get_matching_pumps",
      searchParams.Q,
      searchParams.H,
      searchParams.n1,
      searchParams.n2,
      searchParams.pump_type,
      searchParams.medium_type,
      searchParams.T,
      searchParams.concentration,
    ],
    queryFn: () =>
      getMatchingPumps(
        searchParams.Q,
        searchParams.H,
        searchParams.n1,
        searchParams.n2,
        searchParams.pump_type,
        searchParams.medium_type,
        searchParams.T,
        searchParams.concentration,
      ),
    enabled: hasSearched, // Only run query after user has searched
  });

  const pumps = Array.isArray(pumpsData) ? pumpsData : [];

  // Один тост на каждое новое успешное получение списка (dataUpdatedAt)
  useEffect(() => {
    if (!hasSearched || !dataUpdatedAt) return;
    const list = Array.isArray(pumpsData) ? pumpsData : [];
    if (list.length === 0) return;
    if (pumpSearchToastForUpdatedAtRef.current === dataUpdatedAt) return;
    pumpSearchToastForUpdatedAtRef.current = dataUpdatedAt;
    setSelectedPumpId(list[0]?.id ?? null);
    showNotification(`Найдено ${list.length} насосов`, "success");
  }, [hasSearched, dataUpdatedAt, pumpsData, showNotification]);

  // Ошибка поиска — один раз на неудачный запрос (errorUpdatedAt)
  useEffect(() => {
    if (!hasSearched || !isPumpsError || !errorUpdatedAt) return;
    if (pumpSearchErrorToastForUpdatedAtRef.current === errorUpdatedAt) return;
    pumpSearchErrorToastForUpdatedAtRef.current = errorUpdatedAt;
    let msg = "Ошибка при поиске насосов";
    if (pumpsError && typeof pumpsError === "object") {
      const err: any = pumpsError;
      if (err?.response?.data) {
        const d = err.response.data;
        msg = typeof d === "string" ? d : (d.detail || d.error || d.message || JSON.stringify(d).slice(0, 200));
      } else if (err?.message) {
        msg = err.message;
      }
    }
    showNotification(msg, "error");
  }, [hasSearched, isPumpsError, pumpsError, errorUpdatedAt, showNotification]);

// Initialize CSRF token on app load
useEffect(() => {
  const initCsrf = async () => {
    try {
      console.log('🚀 Инициализируем CSRF токен при загрузке приложения...');
      await ensureCsrf();
      console.log('✅ CSRF токен инициализирован');
    } catch (error) {
      console.error('❌ Ошибка инициализации CSRF токена:', error);
    }
  };
  
  initCsrf();
}, []);

  // Generate pump curve data for selected pump
  const selectedPump = useMemo(() => {
    // Ensure pumps is always an array before calling find
    const pumpsArray = Array.isArray(pumps) ? pumps : [];
    return pumpsArray.find(pump => pump.id === selectedPumpId) || null;
  }, [pumps, selectedPumpId]);

  // Calculate maximum Q value across all data sources for synchronization
  const maxQValue = useMemo(() => {
    if (!selectedPump) return null;
    
    const allQValues = [
      ...(selectedPump.curve?.map(p => p.Q) || []),
      ...(selectedPump.q_p2 || []),
      ...(selectedPump.q_eta || []),
      ...(selectedPump.q_npsh || []),
      ...(selectedPump.additional_curves?.flat().map(p => p.Q) || [])
    ];
    
    return allQValues.length > 0 ? Math.max(...allQValues.filter(q => q != null)) : 100;
  }, [selectedPump]);

  // Mutation for station configuration
  const {
    data: stationResult,
    isPending: isStationLoading,
    mutate: submitStationConfig,
  } = useMutation({
    mutationFn: getStationResult,
    onSuccess: (data, variables) => {
      const key = JSON.stringify(variables ?? {});
      if (lastStationSuccessToastKeyRef.current !== key) {
        lastStationSuccessToastKeyRef.current = key;
        showNotification("Конфигурация станции успешно сформирована", "success");
      }
      const u = userRef.current;
      const sid = pendingSelectionSnapshotIdRef.current;
      if (
        u &&
        sid != null &&
        data &&
        typeof data === "object" &&
        (data as StationResult).schema_version === "station_result.v1"
      ) {
        const rf = { ...(variables || {}) } as Record<string, unknown>;
        delete rf.graphs_image;
        axiosInstance
          .patch(`/api/user/selections/${sid}/snapshot/`, {
            station_result: data,
            request_flat: rf,
            site_slug: siteSlug,
          })
          .catch(() => {});
      }
    },
    onError: (error: any) => {
      let msg = "Неизвестная ошибка";
      if (error?.response?.data) {
        const data = error.response.data;
        if (typeof data === "string") msg = data;
        else if (data.error) msg = data.error;
        else if (data.detail) msg = data.detail;
        else if (data.message) msg = data.message;
        else msg = JSON.stringify(data).slice(0, 300);
      } else if (error?.message) {
        msg = error.message;
      }
      showNotification(`Ошибка: ${msg}`, "error");
    },
  });
  // Handle pump search form submission
  const handlePumpSearchSubmit = async (values: PumpSearchFormValues) => {
    console.log("🛠 handlePumpSearchSubmit получил:", values);
    // Тип насоса берём из выбора на шаге 1
    const pumpType = selectedPumpTypeCode
      ? ([selectedPumpTypeCode] as [string, ...string[]])
      : values.pump_type;
    const finalValues = { ...values, pump_type: pumpType };
    setHasSearched(true);
    setSearchParams(finalValues);
    pumpSearchToastForUpdatedAtRef.current = 0;
    pumpSearchErrorToastForUpdatedAtRef.current = 0;
    showNotification("Поиск насосов...", "info");
  };

  const handlePumpSearchReset = useCallback(() => {
    setHasSearched(false);
    setSelectedPumpId(null);
    pumpSearchToastForUpdatedAtRef.current = 0;
    pumpSearchErrorToastForUpdatedAtRef.current = 0;
  }, []);

  const [lastParams, setLastParams] = useState<Record<string, any> | null>(null);
  const [selectionWorkLayout, setSelectionWorkLayout] = useState<SelectionWorkLayoutData | null>(null);
  const [techSheetLoading, setTechSheetLoading] = useState(false);

  const [stationPdfLoading, setStationPdfLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get("/api/page-layout/resolve/")
      .then((r) => r.data)
      .then((data) => {
        if (cancelled || !data || !Array.isArray(data.components)) return;
        setSelectionWorkLayout({
          grid: data.grid ?? {},
          components: data.components,
          theme: data.theme ?? {},
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [siteSlug]);

  const handleStationPdfDownload = useCallback(async () => {
    if (!lastParams) {
      showNotification("Сначала нажмите «Рассчитать» в блоке конфигурации станции", "error");
      return;
    }
    setStationPdfLoading(true);
    try {
      const { blob, filename, pdfWarnings } = await downloadStationPdf(lastParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showNotification("PDF станции скачан", "success");
      if (pdfWarnings.length) {
        showNotification(pdfWarnings.join(" · "), "info");
      }
    } catch (e: any) {
      let errMsg = "Не удалось сформировать PDF станции";
      if (e?.response?.data) {
        const d = e.response.data;
        errMsg = typeof d === "string" ? d.slice(0, 200) : (d.error || d.detail || d.message || JSON.stringify(d).slice(0, 200));
      } else if (e?.message) {
        errMsg = e.message;
      }
      showNotification(errMsg, "error");
    } finally {
      setStationPdfLoading(false);
    }
  }, [lastParams, showNotification]);

  const handleTechSheetDownload = useCallback(async () => {
    if (!lastParams) {
      showNotification("Сначала нажмите «Рассчитать» в блоке конфигурации станции", "error");
      return;
    }
    setTechSheetLoading(true);
    try {
      const { blob, filename, pdfWarnings } = await downloadTechSheetPdf(lastParams);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showNotification("Технический лист скачан", "success");
      if (pdfWarnings.length) {
        showNotification(pdfWarnings.join(" · "), "info");
      }
    } catch (e: any) {
      let errMsg = "Не удалось сформировать технический лист";
      if (e?.response?.data) {
        const d = e.response.data;
        errMsg = typeof d === "string" ? d.slice(0, 200) : (d.error || d.detail || d.message || JSON.stringify(d).slice(0, 200));
      } else if (e?.message) {
        errMsg = e.message;
      }
      showNotification(errMsg, "error");
    } finally {
      setTechSheetLoading(false);
    }
  }, [lastParams, showNotification]);

  const operatingPoint: PumpOperatingPointDisplay | null = useMemo(() => {
    if (!selectedPump?.parabola_intersection) return null;
    return {
      Q: selectedPump.parabola_intersection.Q,
      H: selectedPump.parabola_intersection.H,
      p2Kw: selectedPump.p2_at_parabola ?? null,
      npshM: selectedPump.npsh_at_parabola ?? null,
      etaPct: selectedPump.eta_at_parabola ?? null,
    };
  }, [selectedPump]);

  // Handle station config form submission
  const handleStationConfigSubmit = useCallback(
  (formValues: StationConfigFormValues) => {
    if (!selectedPumpId) {
      showNotification("Сначала выберите насос", "error");
      return;
    }

    /* 👉 ВЕРНУТЬ это: */
    const params = {
      ...formValues,
      Q: searchParams.Q,
      H: searchParams.H,
      n1: searchParams.n1,
      n2: searchParams.n2,
      T: searchParams.T,
      pump_type: searchParams.pump_type,
      medium_type: searchParams.medium_type,
      chosen_id: selectedPumpId,
      concentration: searchParams.concentration
    };

    setLastParams(params);        // теперь params существует
    submitStationConfig(params);  // и здесь тоже
  },
  [selectedPumpId, searchParams, submitStationConfig]
);


  // Handle pump selection
  const handleSelectPump = useCallback((id: number) => {
    setSelectedPumpId(id);
    const pumpsArray = Array.isArray(pumps) ? pumps : [];
    const pump = pumpsArray.find(p => p.id === id);
    showNotification(`Выбран насос: ${pump?.naimenovanie}`, "success");

    // Автосохранение в историю подборов (только для авторизованных)
    if (user && pump) {
      axiosInstance
        .post("/api/user/selections/", {
          Q: searchParams.Q,
          H: searchParams.H,
          n1: searchParams.n1,
          n2: searchParams.n2,
          pump_types: searchParams.pump_type.join(","),
          fluid_type: searchParams.medium_type,
          temperature: searchParams.T,
          pump_name: pump.naimenovanie,
        })
        .then((res) => {
          pendingSelectionSnapshotIdRef.current = typeof res.data?.id === "number" ? res.data.id : null;
        })
        .catch(() => {
          pendingSelectionSnapshotIdRef.current = null;
        });
    }
  }, [pumps, user, searchParams]);

  // Set slider to parabola intersection point when pump is selected
  useEffect(() => {
    console.log('🔄 useEffect selectedPump изменился:', selectedPump?.naimenovanie);
    if (selectedPump?.parabola_intersection) {
      const parabolaQ = selectedPump.parabola_intersection.Q;
      console.log('📍 Устанавливаем слайдер в parabola_intersection:', parabolaQ);
      setManualSliderValue(parabolaQ);
      setMousePosition({ x: parabolaQ, y: 0 });
      setIsManualControl(false); // Allow mouse control to override
    } else {
      console.log('❌ Нет selectedPump или parabola_intersection, сбрасываем');
      // Reset to default when no pump selected
      setManualSliderValue(null);
      setMousePosition(null);
    }
  }, [selectedPump]);

  // Handle mouse move for curve graph
  const handleCurveMouseMove = useCallback((position: { x: number; y: number } | null) => {
    console.log('📊 handleCurveMouseMove:', position);
    setActiveGraph('curve');
    setMousePosition(position);
    if (position?.x) {
      setManualSliderValue(position.x);
    }
  }, []);

  // Handle mouse move for second graph
  const handleSecondMouseMove = useCallback((position: { x: number; y: number } | null) => {
    console.log('📈 handleSecondMouseMove:', position);
    setActiveGraph('second');
    setMousePosition(position);
    if (position?.x) {
      setManualSliderValue(position.x);
    }
  }, []);

  // Handle mouse leave for both graphs
  const handleMouseLeave = useCallback(() => {
    console.log('🖱️ handleMouseLeave вызван, isManualControl:', isManualControl);
    if (!isManualControl) {
      setActiveGraph(null);
      // Always return to parabola intersection point when mouse leaves (if available)
      if (selectedPump?.parabola_intersection) {
        const parabolaQ = selectedPump.parabola_intersection.Q;
        console.log('🔄 Возвращаемся к parabola_intersection:', parabolaQ);
        setMousePosition({ x: parabolaQ, y: 0 });
        setManualSliderValue(parabolaQ);
      } else {
        console.log('❌ Нет parabola_intersection, сбрасываем позицию');
        setMousePosition(null);
        setManualSliderValue(null);
      }
    } else {
      console.log('🔒 Ручной режим активен, не возвращаемся к parabola_intersection');
    }
  }, [isManualControl, selectedPump]);

  const funnelStepVisuals = useCallback(
    (step: SelectionFunnelStep) => {
      const brandSimpel = appearance.brand_key === "simpel";
      const { title, subtitle } = resolvedSelectionTitle(
        step,
        appearance.selection_stage_titles,
        brandSimpel,
        appearance.stage_headings,
      );
      /* Значок слева от названия карточки: только поле админки или общий PNG (одинаковый на всех шагах) */
      const cardCaptionLogo = appearance.selection_card_caption_logo_url ?? null;
      return { title, subtitle, cardCaptionLogo };
    },
    [appearance],
  );

  const selectionHeaderRight =
    user ? (
      <>
        {user.role === "admin" && (
          <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-medium hidden sm:inline">
            Администратор
          </span>
        )}
        <a
          href="/account"
          className="flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
          title={user.name || user.email}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </a>
      </>
    ) : (
      <a
        href="/account"
        className="flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors shrink-0"
        title="Войти"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </a>
    );

  const sidebarWordmarkSrc = appearance.funnel_sidebar_wordmark_url ?? FUNNEL_SIDEBAR_WORDMARK_DEFAULT;

  const selectionFlowHeaderLogoSrc = useMemo(
    () => appearance.selection_flow_header_logo_url ?? appearance.logo_url ?? null,
    [appearance.selection_flow_header_logo_url, appearance.logo_url],
  );

  const editablePumpSeries = productCategory === "hydromodule" || productCategory === "pump_unit";

  const selectionWorkSlots = useMemo((): SelectionWorkSlots => {
    return {
      work_pump_search: (
        <div className={cn(WORK_DESKTOP_PANEL, "h-full min-h-0")}>
          <div className={WORK_DESKTOP_CARD_HEAD}>Параметры подбора</div>
          <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3 pb-3 pt-2">
            <PumpSearchForm
              ref={pumpSearchFormDesktopRef}
              formDomId={PUMP_SEARCH_FORM_DESKTOP_ID}
              stretchToFill
              desktopActionsOutside
              onSubmit={handlePumpSearchSubmit}
              isLoading={isPumpsLoading}
              defaultValues={searchParams}
              selectedPumpType={selectedPumpTypeCode}
              operatingPoint={operatingPoint}
              onReset={handlePumpSearchReset}
              editablePumpSeries={editablePumpSeries}
            />
          </div>
        </div>
      ),
      work_curves: (
        <div className={cn(WORK_DESKTOP_PANEL, "h-full min-h-0")} ref={graphsRef}>
          <div className={WORK_DESKTOP_CARD_HEAD}>Кривые характеристик</div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <PumpCurveGraph
              selectedPump={selectedPump}
              mousePosition={mousePosition}
              onMouseMove={handleCurveMouseMove}
              onMouseLeave={handleMouseLeave}
              manualSliderValue={manualSliderValue}
              isManualControl={isManualControl}
              onManualControl={setIsManualControl}
              maxQValue={maxQValue}
              hideChrome
            />
            <SecondGraph
              selectedPump={selectedPump}
              mousePosition={mousePosition}
              onMouseMove={handleSecondMouseMove}
              onMouseLeave={handleMouseLeave}
              manualSliderValue={manualSliderValue}
              isManualControl={isManualControl}
              onManualControl={setIsManualControl}
              maxQValue={maxQValue}
              axesMode="both"
              hideChrome
            />
          </div>
        </div>
      ),
      work_tech_specs: (
        <div className={cn(WORK_DESKTOP_PANEL, "h-full min-h-0")}>
          <div className={WORK_DESKTOP_CARD_HEAD}>Технические характеристики</div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-1.5 pt-2">
            <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain text-xs leading-snug">
              <li className="flex justify-between gap-2">
                <span className="text-[var(--funnel-text-muted)]">Количество насосов</span>
                <span className="font-medium tabular-nums text-right text-[var(--funnel-text)]">
                  {searchParams.n1} раб. + {searchParams.n2} рез.
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-[var(--funnel-text-muted)]">Номинальная мощность насоса</span>
                <span className="font-mono text-sm font-medium tabular-nums text-[var(--funnel-text)]">
                  {selectedPump?.moschnost != null
                    ? `${selectedPump.moschnost.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} кВт`
                    : "—"}
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-[var(--funnel-text-muted)]">Номинальное напряжение</span>
                <span className="text-sm font-medium tabular-nums text-right text-[var(--funnel-text)]">3×380 В; 50 Гц</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-[var(--funnel-text-muted)]">Номинальный ток насоса</span>
                <span className="font-mono text-sm tabular-nums text-[var(--funnel-text)]">—</span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-[var(--funnel-text-muted)]">Макс. рабочее давление</span>
                <span className="text-sm font-medium text-[var(--funnel-text)]">
                  {(lastParams as { PN?: string } | null)?.PN
                    ? `PN${(lastParams as { PN?: string }).PN}`
                    : "—"}
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-[var(--funnel-text-muted)]">Присоединение</span>
                <span className="text-sm font-medium text-right text-[var(--funnel-text)]">
                  {selectedPump
                    ? (() => {
                        const raw = selectedPump.naimenovanie ?? "";
                        const dn = raw.match(/\bDN\s*(\d+)\b/gi) ?? [];
                        if (dn.length >= 2)
                          return `${dn[0].replace(/\s/gi, "").toUpperCase()}/${dn[1].replace(/\s/gi, "").toUpperCase()}`;
                        if (dn.length === 1) {
                          const u = dn[0].replace(/\s/gi, "").toUpperCase();
                          return `${u}/${u}`;
                        }
                        return "—";
                      })()
                    : "—"}
                </span>
              </li>
              <li className="flex justify-between gap-2">
                <span className="text-[var(--funnel-text-muted)]">Масса</span>
                <span className="font-mono text-sm font-medium tabular-nums text-[var(--funnel-text)]">
                  {stationResult != null &&
                  typeof stationResult === "object" &&
                  !Array.isArray(stationResult) &&
                  (stationResult as StationResult).weight != null
                    ? `${Number((stationResult as StationResult).weight).toLocaleString("ru-RU", {
                        maximumFractionDigits: 2,
                      })} кг`
                    : "—"}
                </span>
              </li>
            </ul>
          </div>
          <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-zinc-200 p-2">
            <button
              type="button"
              disabled={stationPdfLoading}
              onClick={() => void handleStationPdfDownload()}
              title="Скачать полный PDF станции (ТКП)"
              className={cn(
                WORK_BTN_SECONDARY,
                WORK_DESKTOP_FOCUS_RING,
              )}
            >
              {stationPdfLoading ? "Формируем…" : "В ТКП"}
            </button>
            <button
              type="button"
              disabled={techSheetLoading}
              onClick={() => void handleTechSheetDownload()}
              title="Скачать PDF технического листа (3-я страница полного ТКП)"
              className={cn(
                WORK_BTN_SECONDARY,
                WORK_DESKTOP_FOCUS_RING,
              )}
            >
              {techSheetLoading ? "Формируем…" : "Тех. лист"}
            </button>
          </div>
        </div>
      ),
      work_station_config: (
        <div className="flex h-full min-h-0 min-w-0 flex-col gap-2">
          <div id="station-config-section" className={cn(WORK_DESKTOP_PANEL, "min-h-0 min-w-0 flex-1")}>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <StationConfigForm
                onSubmit={handleStationConfigSubmit}
                isLoading={isStationLoading}
                selectedPumpId={selectedPumpId}
                Q={searchParams.Q}
                H={searchParams.H}
                lockedStationType={lockedStationType}
                sectionTitle={configSectionTitle}
              />
            </div>
          </div>
          <div
            className={cn(
              "flex shrink-0 gap-2 rounded-lg border-0 bg-[var(--funnel-panel-header-bg)] px-3 py-2",
              WORK_STAGE_ACCENT_HOVER,
            )}
          >
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "h-9 flex-1 text-sm hover:opacity-90 selection-work-btn-secondary",
                WORK_DESKTOP_FOCUS_RING,
              )}
              onClick={() => pumpSearchFormDesktopRef.current?.resetForm()}
            >
              Сбросить
            </Button>
            <Button
              type="submit"
              form={PUMP_SEARCH_FORM_DESKTOP_ID}
              className={cn(
                WORK_BTN_PRIMARY,
                WORK_DESKTOP_FOCUS_RING,
              )}
              disabled={isPumpsLoading}
            >
              {isPumpsLoading ? "Загрузка…" : "Подобрать"}
            </Button>
          </div>
        </div>
      ),
      work_pumps_list: (
        <div className={cn(WORK_DESKTOP_PANEL, "h-full min-h-0 min-w-0 w-full")}>
          <PumpsList
            pumps={Array.isArray(pumps) ? pumps : []}
            isLoading={isPumpsLoading}
            selectedPumpId={selectedPumpId}
            onSelectPump={handleSelectPump}
            hasSearched={hasSearched}
            variant="simpel"
            fillAvailableHeight
          />
        </div>
      ),
      work_station_results: (
        <div className={cn(WORK_DESKTOP_PANEL, "h-full min-h-0 overflow-auto")}>
          <StationResults result={stationResult as StationResult} isLoading={isStationLoading} hideWorkflow />
        </div>
      ),
    };
  }, [
    editablePumpSeries,
    selectedPump,
    pumps,
    isPumpsLoading,
    selectedPumpId,
    hasSearched,
    searchParams,
    operatingPoint,
    selectedPumpTypeCode,
    handlePumpSearchSubmit,
    handlePumpSearchReset,
    mousePosition,
    handleCurveMouseMove,
    handleSecondMouseMove,
    handleMouseLeave,
    manualSliderValue,
    isManualControl,
    maxQValue,
    stationResult,
    isStationLoading,
    handleStationConfigSubmit,
    lockedStationType,
    configSectionTitle,
    lastParams,
    stationPdfLoading,
    techSheetLoading,
    handleStationPdfDownload,
    handleTechSheetDownload,
    handleSelectPump,
  ]);

  if (flowStep === "cards") {
    const v = funnelStepVisuals("category");
    return (
      <SelectionFlowLayout
        sidebarWordmarkSrc={sidebarWordmarkSrc}
        sidebarText={appearance.sidebar_text}
        cardCaptionLogoSrc={v.cardCaptionLogo}
        title={v.title}
        subtitle={v.subtitle}
        stageIndicator={<SelectionStageProgress variant="two" current={1} />}
        headerRight={selectionHeaderRight}
        bodyClassName="overflow-hidden"
        stageBackgroundSrc={selectionSlidePng(1)}
        cardUiSettings={appearance.selection_card_settings}
      >
        <ProductCategorySelector
          onSelect={handleProductCategory}
          allowSimpelPumps={user?.role === "admin"}
          fullWidthLayout={appearance.selection_category_full_width}
        />
      </SelectionFlowLayout>
    );
  }

  if (flowStep === "hm_line") {
    const v = funnelStepVisuals("hm_line");
    return (
      <SelectionFlowLayout
        sidebarWordmarkSrc={sidebarWordmarkSrc}
        sidebarText={appearance.sidebar_text}
        cardCaptionLogoSrc={v.cardCaptionLogo}
        title={v.title}
        subtitle={v.subtitle}
        onBack={goBackToCategoryCards}
        backLabel="← Класс продукции"
        stageIndicator={<SelectionStageProgress variant="three" current={2} />}
        headerRight={selectionHeaderRight}
        bodyClassName="overflow-hidden"
        stageBackgroundSrc={selectionSlidePng(2)}
        cardUiSettings={appearance.selection_card_settings}
      >
        <HydromoduleLineSelector
          onSelect={handleHydromoduleLineSelect}
          cardImageUrls={appearance.hydromodule_card_urls}
        />
      </SelectionFlowLayout>
    );
  }

  // ── Экран параметров (work) — второй этап без изменений ─────────────────────

  return (
    <div
      className="selection-work-root flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-[var(--funnel-page-bg)]"
      style={{ fontFamily: "var(--funnel-font-body)" }}
    >
      <div className="mx-auto w-full max-w-[1440px] px-4 pt-2 sm:px-6 lg:px-8">
        <SelectionStageProgress
          variant={productCategory === "hydromodule" ? "three" : "two"}
          current={productCategory === "hydromodule" ? 3 : 2}
        />
      </div>
      <Header
        variant="simpel"
        pageTitle={headerPageTitle}
        pageTitleLogoSrc={selectionFlowHeaderLogoSrc ?? undefined}
        brandKey={appearance.brand_key}
        leftSlot={
          <button
            type="button"
            onClick={goBackFromWork}
            className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-[#E6E6E6] px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-[#d9d9d9]"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
                clipRule="evenodd"
              />
            </svg>
            <span className="truncate">{workBackLabel}</span>
            {selectedPumpTypeCode && (
              <span className="ml-0.5 shrink-0 text-xs font-semibold opacity-70">{selectedPumpTypeCode}</span>
            )}
          </button>
        }
      />

      <main className="selection-funnel-content-scroll mx-auto flex max-w-[1440px] flex-1 min-h-0 w-full flex-col overflow-y-auto bg-[var(--funnel-page-bg)] px-4 sm:px-6 lg:overflow-hidden lg:px-8 py-2 sm:py-3">
        {/* Mobile navigation hint */}
        <div className="shrink-0 md:hidden text-xs text-muted-foreground mb-2 flex items-center justify-center p-2 bg-secondary/30 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 text-primary">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="16"></line>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
          <span>Формы поиска, список насосов и кривая ниже</span>
        </div>

        {/* MOBILE LAYOUT (Small screens) */}
        <div className="selection-funnel-content-scroll md:hidden flex-1 min-h-0 overflow-y-auto space-y-3">
          {/* Search Form */}
          <div
            className={cn(
              "rounded-lg overflow-hidden selection-work-panel rounded-lg",
              WORK_STAGE_ACCENT_HOVER,
            )}
          >
            <div className="p-2">
              <PumpSearchForm
                formDomId="pump-search-form-mobile"
                onSubmit={handlePumpSearchSubmit}
                isLoading={isPumpsLoading}
                defaultValues={searchParams}
                selectedPumpType={selectedPumpTypeCode}
                operatingPoint={operatingPoint}
                onReset={handlePumpSearchReset}
                editablePumpSeries={editablePumpSeries}
              />
            </div>
          </div>

          {/* Pump List */}
          <div
            className={cn(
              "overflow-hidden rounded-lg selection-work-panel rounded-lg",
              WORK_STAGE_ACCENT_HOVER,
            )}
          >
            <PumpsList
              pumps={Array.isArray(pumps) ? pumps : []}
              isLoading={isPumpsLoading}
              selectedPumpId={selectedPumpId}
              onSelectPump={handleSelectPump}
              hasSearched={hasSearched}
            />
          </div>

          {/* Curves */}
          <div
            className={cn(
              "overflow-hidden rounded-lg selection-work-panel rounded-lg p-0",
              WORK_STAGE_ACCENT_HOVER,
            )}
            ref={graphsRef}
          >
            <div>
              <PumpCurveGraph
                selectedPump={selectedPump}
                mousePosition={mousePosition}
                onMouseMove={handleCurveMouseMove}
                onMouseLeave={handleMouseLeave}
                manualSliderValue={manualSliderValue}
                isManualControl={isManualControl}
                onManualControl={setIsManualControl}
                maxQValue={maxQValue}
              />

              {/* Manual Slider Control */}
              {selectedPump && (
                <div className="p-4 bg-gray-50">
                  <div className="flex items-center gap-4">
                    <label className="text-sm font-medium text-gray-700">
                      Расход (м³/ч):
                    </label>
                    <input
                      type="range"
                      min="0"
                      max={maxQValue || 100}
                      step="0.1"
                      value={manualSliderValue || 0}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setManualSliderValue(value);
                        setIsManualControl(true);
                        setMousePosition({ x: value, y: 0 });
                      }}
                      className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm font-bold text-gray-900 min-w-[60px]">
                      {manualSliderValue?.toFixed(1) || '0.0'} м³/ч
                    </span>
                    <button
                      onClick={() => {
                        setIsManualControl(false);
                        setManualSliderValue(null);
                        setMousePosition(null);
                      }}
                      className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                    >
                      Сброс
                    </button>
                  </div>
                </div>
              )}

              {/* Second Graph directly below */}
              <div>
                <SecondGraph
                  selectedPump={selectedPump}
                  mousePosition={mousePosition}
                  onMouseMove={handleSecondMouseMove}
                  onMouseLeave={handleMouseLeave}
                  manualSliderValue={manualSliderValue}
                  isManualControl={isManualControl}
                  onManualControl={setIsManualControl}
                  maxQValue={maxQValue}
                />
              </div>
            </div>
          </div>

          {/* Config */}
          <div
            className={cn(
              "flex max-h-[min(560px,62dvh)] flex-col overflow-hidden rounded-lg selection-work-panel rounded-lg",
              WORK_STAGE_ACCENT_HOVER,
            )}
          >
            <StationConfigForm
              className="min-h-0 flex-1"
              onSubmit={handleStationConfigSubmit}
              isLoading={isStationLoading}
              selectedPumpId={selectedPumpId}
              Q={searchParams.Q}
              H={searchParams.H}
              lockedStationType={lockedStationType}
              sectionTitle={configSectionTitle}
            />
          </div>

          {/* Results */}
          <div
            className={cn(
              "overflow-hidden rounded-lg selection-work-panel rounded-lg",
              WORK_STAGE_ACCENT_HOVER,
            )}
          >
            <StationResults result={stationResult as StationResult} isLoading={isStationLoading} hideWorkflow />
          </div>

        </div>

        {/* TABLET LAYOUT (Medium screens) */}
        <div className="selection-funnel-content-scroll hidden md:grid lg:hidden flex-1 min-h-0 overflow-y-auto grid-cols-2 gap-3">
          <div className="space-y-3">
            {/* Search Form */}
            <div
              className={cn(
                "overflow-hidden rounded-lg selection-work-panel rounded-lg",
                WORK_STAGE_ACCENT_HOVER,
              )}
            >
              <div className="p-2">
                <PumpSearchForm
                  formDomId="pump-search-form-tablet"
                  onSubmit={handlePumpSearchSubmit}
                  isLoading={isPumpsLoading}
                  defaultValues={searchParams}
                  selectedPumpType={selectedPumpTypeCode}
                  operatingPoint={operatingPoint}
                  onReset={handlePumpSearchReset}
                  editablePumpSeries={editablePumpSeries}
                />
              </div>
            </div>

            {/* Pump List */}
            <div
              className={cn(
                "overflow-hidden rounded-lg selection-work-panel rounded-lg",
                WORK_STAGE_ACCENT_HOVER,
              )}
            >
              <PumpsList
                pumps={Array.isArray(pumps) ? pumps : []}
                isLoading={isPumpsLoading}
                selectedPumpId={selectedPumpId}
                onSelectPump={handleSelectPump}
                hasSearched={hasSearched}
                variant="simpel"
              />
            </div>
          </div>

          <div
            className={cn(
              "overflow-hidden rounded-lg selection-work-panel rounded-lg p-0",
              WORK_STAGE_ACCENT_HOVER,
            )}
          >
            <div>
              <PumpCurveGraph
                selectedPump={selectedPump}
                mousePosition={mousePosition}
                onMouseMove={handleCurveMouseMove}
                onMouseLeave={handleMouseLeave}
                manualSliderValue={manualSliderValue}
                isManualControl={isManualControl}
                onManualControl={setIsManualControl}
                maxQValue={maxQValue}
              />

              {/* Second Graph directly below */}
              <div>
                <SecondGraph
                  selectedPump={selectedPump}
                  mousePosition={mousePosition}
                  onMouseMove={handleSecondMouseMove}
                  onMouseLeave={handleMouseLeave}
                  manualSliderValue={manualSliderValue}
                  isManualControl={isManualControl}
                  onManualControl={setIsManualControl}
                  maxQValue={maxQValue}
                />
              </div>
            </div>
          </div>

          {/* Config and Results side by side */}
          <div className="grid grid-cols-1 gap-4">
            <div
              className={cn(
                "flex max-h-[min(560px,62dvh)] flex-col overflow-hidden rounded-lg selection-work-panel rounded-lg",
                WORK_STAGE_ACCENT_HOVER,
              )}
            >
              <StationConfigForm
                className="min-h-0 flex-1"
                onSubmit={handleStationConfigSubmit}
                isLoading={isStationLoading}
                selectedPumpId={selectedPumpId}
                Q={searchParams.Q}
                H={searchParams.H}
                lockedStationType={lockedStationType}
                sectionTitle={configSectionTitle}
              />
            </div>

            <div
              className={cn(
                "overflow-hidden rounded-lg selection-work-panel rounded-lg",
                WORK_STAGE_ACCENT_HOVER,
              )}
            >
              <StationResults result={stationResult as StationResult} isLoading={isStationLoading} hideWorkflow />
            </div>
          </div>

        </div>

        {/* DESKTOP: 2×2 на один экран; лишнее — прокрутка внутри каждого блока */}
        <div className="hidden min-h-0 flex-1 flex-col font-sans text-[var(--funnel-text)] lg:flex">
          <SelectionWorkLayoutGate layout={selectionWorkLayout} slots={selectionWorkSlots}>
          <div className="grid h-full min-h-0 w-full max-w-[1440px] grid-rows-[minmax(0,1.06fr)_minmax(0,0.94fr)] gap-x-3 gap-y-2 [grid-template-columns:minmax(0,1.95fr)_minmax(0,2.75fr)] items-stretch xl:mx-auto">

            {/* ─── Строка 1, кол.1: параметры подбора ─── */}
            <div className="flex h-full min-h-0 min-w-0 flex-col">
              <div className={cn(WORK_DESKTOP_PANEL, "h-full")}>
                <div className={WORK_DESKTOP_CARD_HEAD}>Параметры подбора</div>
                <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3 pb-3 pt-2">
                  <PumpSearchForm
                    ref={pumpSearchFormDesktopRef}
                    formDomId={PUMP_SEARCH_FORM_DESKTOP_ID}
                    stretchToFill
                    desktopActionsOutside
                    onSubmit={handlePumpSearchSubmit}
                    isLoading={isPumpsLoading}
                    defaultValues={searchParams}
                    selectedPumpType={selectedPumpTypeCode}
                    operatingPoint={operatingPoint}
                    onReset={handlePumpSearchReset}
                    editablePumpSeries={editablePumpSeries}
                  />
                </div>
              </div>
            </div>

            {/* ─── Строка 1, кол.2: графики | техблок ─── */}
            <div className="flex h-full min-h-0 min-w-0 items-stretch gap-3">
              <div className={cn(WORK_DESKTOP_PANEL, "h-full min-h-0 min-w-0 flex-[1.71]")} ref={graphsRef}>
                <div className={WORK_DESKTOP_CARD_HEAD}>Кривые характеристик</div>
                <div className="min-h-0 flex-1 overflow-y-auto p-2">
                  <PumpCurveGraph
                    selectedPump={selectedPump}
                    mousePosition={mousePosition}
                    onMouseMove={handleCurveMouseMove}
                    onMouseLeave={handleMouseLeave}
                    manualSliderValue={manualSliderValue}
                    isManualControl={isManualControl}
                    onManualControl={setIsManualControl}
                    maxQValue={maxQValue}
                    hideChrome
                  />
                  <SecondGraph
                    selectedPump={selectedPump}
                    mousePosition={mousePosition}
                    onMouseMove={handleSecondMouseMove}
                    onMouseLeave={handleMouseLeave}
                    manualSliderValue={manualSliderValue}
                    isManualControl={isManualControl}
                    onManualControl={setIsManualControl}
                    maxQValue={maxQValue}
                    axesMode="both"
                    hideChrome
                  />
                </div>
              </div>

              <div className={cn(WORK_DESKTOP_PANEL, "h-full min-w-0 flex-[1]")}>
              <div className={WORK_DESKTOP_CARD_HEAD}>Технические характеристики</div>
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-1.5 pt-2">
                <ul className="min-h-0 flex-1 space-y-1.5 overflow-y-auto overscroll-contain text-xs leading-snug">
                  <li className="flex justify-between gap-2">
                    <span className="text-[var(--funnel-text-muted)]">Количество насосов</span>
                    <span className="font-medium tabular-nums text-right text-[var(--funnel-text)]">
                      {searchParams.n1} раб. + {searchParams.n2} рез.
                    </span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-[var(--funnel-text-muted)]">Номинальная мощность насоса</span>
                    <span className="font-mono text-sm font-medium tabular-nums text-[var(--funnel-text)]">
                      {selectedPump?.moschnost != null
                        ? `${selectedPump.moschnost.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} кВт`
                        : "—"}
                    </span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-[var(--funnel-text-muted)]">Номинальное напряжение</span>
                    <span className="text-sm font-medium tabular-nums text-right text-[var(--funnel-text)]">3×380 В; 50 Гц</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-[var(--funnel-text-muted)]">Номинальный ток насоса</span>
                    <span className="font-mono text-sm tabular-nums text-[var(--funnel-text)]">—</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-[var(--funnel-text-muted)]">Макс. рабочее давление</span>
                    <span className="text-sm font-medium text-[var(--funnel-text)]">
                      {(lastParams as { PN?: string } | null)?.PN
                        ? `PN${(lastParams as { PN?: string }).PN}`
                        : "—"}
                    </span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-[var(--funnel-text-muted)]">Присоединение</span>
                    <span className="text-sm font-medium text-right text-[var(--funnel-text)]">
                      {selectedPump
                        ? (() => {
                            const raw = selectedPump.naimenovanie ?? "";
                            const dn = raw.match(/\bDN\s*(\d+)\b/gi) ?? [];
                            if (dn.length >= 2)
                              return `${dn[0].replace(/\s/gi, "").toUpperCase()}/${dn[1].replace(/\s/gi, "").toUpperCase()}`;
                            if (dn.length === 1) {
                              const u = dn[0].replace(/\s/gi, "").toUpperCase();
                              return `${u}/${u}`;
                            }
                            return "—";
                          })()
                        : "—"}
                    </span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-[var(--funnel-text-muted)]">Масса</span>
                    <span className="font-mono text-sm font-medium tabular-nums text-[var(--funnel-text)]">
                      {stationResult != null &&
                      typeof stationResult === "object" &&
                      !Array.isArray(stationResult) &&
                      (stationResult as StationResult).weight != null
                        ? `${Number((stationResult as StationResult).weight).toLocaleString("ru-RU", {
                            maximumFractionDigits: 2,
                          })} кг`
                        : "—"}
                    </span>
                  </li>
                </ul>
              </div>
              <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-zinc-200 p-2">
                <button
                  type="button"
                  disabled={stationPdfLoading}
                  onClick={() => void handleStationPdfDownload()}
                  title="Скачать полный PDF станции (ТКП)"
                  className={cn(
                    WORK_BTN_SECONDARY,
                    WORK_DESKTOP_FOCUS_RING,
                  )}
                >
                  {stationPdfLoading ? "Формируем…" : "В ТКП"}
                </button>
                <button
                  type="button"
                  disabled={techSheetLoading}
                  onClick={() => void handleTechSheetDownload()}
                  title="Скачать PDF технического листа (3-я страница полного ТКП)"
                  className={cn(
                    WORK_BTN_SECONDARY,
                    WORK_DESKTOP_FOCUS_RING,
                  )}
                >
                  {techSheetLoading ? "Формируем…" : "Тех. лист"}
                </button>
              </div>
              </div>
            </div>

            {/* ─── Строка 2, кол.1: конфигурация станции + кнопки подбора ─── */}
            <div className="flex h-full min-h-0 min-w-0 flex-col gap-2">
              <div
                id="station-config-section"
                className={cn(WORK_DESKTOP_PANEL, "min-h-0 min-w-0 flex-1")}
              >
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                  <StationConfigForm
                    onSubmit={handleStationConfigSubmit}
                    isLoading={isStationLoading}
                    selectedPumpId={selectedPumpId}
                    Q={searchParams.Q}
                    H={searchParams.H}
                    lockedStationType={lockedStationType}
                    sectionTitle={configSectionTitle}
                  />
                </div>
              </div>
              <div
                className={cn(
                  "flex shrink-0 gap-2 rounded-lg border-0 bg-[var(--funnel-panel-header-bg)] px-3 py-2",
                  WORK_STAGE_ACCENT_HOVER,
                )}
              >
                <Button
                  type="button"
                  variant="ghost"
                  className={cn(
                    "h-9 flex-1 text-sm hover:opacity-90 selection-work-btn-secondary",
                    WORK_DESKTOP_FOCUS_RING,
                  )}
                  onClick={() => pumpSearchFormDesktopRef.current?.resetForm()}
                >
                  Сбросить
                </Button>
                <Button
                  type="submit"
                  form={PUMP_SEARCH_FORM_DESKTOP_ID}
                  className={cn(
                    WORK_BTN_PRIMARY,
                    WORK_DESKTOP_FOCUS_RING,
                  )}
                  disabled={isPumpsLoading}
                >
                  {isPumpsLoading ? "Загрузка…" : "Подобрать"}
                </Button>
              </div>
            </div>

            {/* ─── Строка 2, кол.2: результаты подбора ─── */}
            <div className={cn(WORK_DESKTOP_PANEL, "h-full min-w-0 w-full")}>
              <PumpsList
                pumps={Array.isArray(pumps) ? pumps : []}
                isLoading={isPumpsLoading}
                selectedPumpId={selectedPumpId}
                onSelectPump={handleSelectPump}
                hasSearched={hasSearched}
                variant="simpel"
                fillAvailableHeight
              />
            </div>
          </div>
          </SelectionWorkLayoutGate>

        </div>
      </main>
    </div>
  );
};

export default Home;
