import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import Header from "@/components/layout/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminGetUsers, adminCreateUser, adminGetUser, adminUpdateUser,
  adminDeleteUser, adminSetUserPassword,
  type AdminUser, type AdminUserDetail,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToastNotification } from "@/hooks/use-toast-notification";
import {
  adminLogin,
  adminLogout,
  adminWhoami,
  adminGetAppearance,
  adminPatchAppearance,
  adminUploadLogo,
  adminUploadCpLogo,
  adminUploadTechSpecsLogo,
  adminUploadHydromoduleCard,
  adminUploadFunnelSidebarLogo,
  adminUploadFunnelSidebarWordmark,
  adminUploadSelectionCardCaptionLogo,
  adminUploadSelectionFlowHeaderLogo,

  adminDrawingsList,
  adminDrawingsUpload,
  adminDrawingsDelete,
  adminGetEmailSettings,
  adminPatchEmailSettings,
  adminPublicDataListTables,
  adminPublicDataRows,
  adminPublicDataCreate,
  adminPublicDataUpdate,
  adminPublicDataDelete,
  adminGetStats,
  type AdminStats,
  type PublicDataTableInfo,
  type AdminDrawingsFile,
  type AdminAppearance,
  type SelectionStageTitles,
  type AdminEmailSettings,
} from "@/lib/api";

import { AdminDbConstructor } from "@/components/admin/AdminDbConstructor";
import { DataFlowStudio } from "@/components/admin/DataFlowStudio";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminSelectionSettings } from "@/components/admin/AdminSelectionSettings";
import { PdfConstructorTab } from "@/components/admin/PdfConstructorTab";
import { PageLayoutEditorTab } from "@/components/admin/PageLayoutEditorTab";
import { WhiteLabelManagerTab } from "@/components/admin/WhiteLabelManagerTab";
import { AdminMovedToWhiteLabel } from "@/components/admin/AdminMovedToWhiteLabel";
import { ensureCsrf } from "@/lib/csrf";
import { canAccessAdminPanel, isPublicDataTableEditable } from "@/config/adminAccessPolicy";
import { adminCurrentSection, isAdminLeafVisible, normalizeAdminLeaf } from "@/config/adminNav";
import type { HydromoduleLineId } from "@/lib/selectionRoute";
import {
  HYDROMODULE_CARD_FORM_FIELD,
  HYDROMODULE_LINE_LABELS,
  HYDROMODULE_LINE_ORDER,
} from "@/lib/selectionRoute";
import { KeyRound, Trash2, Upload } from "lucide-react";
import {
  parseFirstSheetAsTableRows,
  assertExcelColumnsMatchTable,
  buildCreatePayloadFromRow,
  isRowVisuallyEmpty,
} from "@/lib/excelPublicTableImport";
import { Checkbox } from "@/components/ui/checkbox";
import type { SelectionCardSettings } from "@/lib/selectionCardSettings";

const DATA_TAB_TABLE_NONE = "__none__";

function normalizeAdminAppearance(a: AdminAppearance): AdminAppearance {
  return {
    ...a,
    brand_key: a.brand_key === "simpel" ? "simpel" : "strela",
    hydromodule_card_urls:
      a.hydromodule_card_urls && typeof a.hydromodule_card_urls === "object" ? a.hydromodule_card_urls : {},
    funnel_sidebar_logo_urls:
      a.funnel_sidebar_logo_urls && typeof a.funnel_sidebar_logo_urls === "object"
        ? a.funnel_sidebar_logo_urls
        : {},
    funnel_sidebar_wordmark_url: a.funnel_sidebar_wordmark_url ?? null,
    selection_card_caption_logo_url: a.selection_card_caption_logo_url ?? null,
    selection_flow_header_logo_url: a.selection_flow_header_logo_url ?? null,
    selection_category_full_width: Boolean(a.selection_category_full_width),
    selection_card_settings:
      a.selection_card_settings && typeof a.selection_card_settings === "object"
        ? a.selection_card_settings
        : null,
  };
}

const SELECTION_STAGE_FORM_KEYS = [
  { key: "category" as const, label: "Класс продукции (слайд 1)" },
  { key: "hm_line" as const, label: "Линейка гидромодуля (слайд 2)" },
  { key: "pu_line" as const, label: "Линейка насосной установки (слайд 3)" },
  { key: "pu_subtype" as const, label: "Тип НУ / подтип (слайд 3)" },
  { key: "simpel_series" as const, label: "Серии Simpel (слайд 4)" },
];

interface AppAdminProps {
  /** Встроенный режим: без заголовка, без формы входа — управление вкладкой снаружи */
  embedded?: boolean;
  activeTab?: string;
  /** Кабинет: переключить на «Данные БД» и выбрать таблицу (из конструктора) */
  onNavigateToPublicData?: (tableName: string) => void;
  /** Одноразовое намерение выбрать таблицу на вкладке данных */
  publicDataIntent?: { table: string; id: number } | null;
  onPublicDataIntentHandled?: () => void;
}

function AdminDashboard({ onNavigate }: { onNavigate: (leaf: string) => void }) {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: adminGetStats,
    staleTime: 60_000,
  });

  const statCards = [
    { label: "Пользователей", value: stats?.users_total ?? "—", color: "text-blue-600" },
    { label: "Подборов за 7 дней", value: stats?.selections_7d ?? "—", color: "text-emerald-600" },
    { label: "Проектов", value: stats?.projects_total ?? "—", color: "text-violet-600" },
  ];

  const quickLinks = [
    { label: "White-Label", leaf: "white-label" },
    { label: "Пользователи", leaf: "users" },
    { label: "Схема Подбора", leaf: "data-flow-studio" },
    { label: "Данные БД", leaf: "data" },
    { label: "Конструктор схемы", leaf: "db-constructor" },
    { label: "Настройки подбора", leaf: "selection-settings" },
    { label: "White-Label", leaf: "white-label" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Дашборд</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statCards.map(c => (
          <Card key={c.label} className="card-industrial">
            <CardContent className="pt-6">
              <div className={`text-3xl font-bold ${c.color}`}>
                {isLoading ? <span className="animate-pulse">…</span> : c.value}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {stats?.recent_selections && stats.recent_selections.length > 0 && (
        <Card className="card-industrial">
          <CardHeader><CardTitle className="text-base">Последние подборы</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y divide-border text-sm">
              {stats.recent_selections.map(s => (
                <div key={s.id} className="py-2 flex justify-between items-center gap-4">
                  <span className="font-medium truncate">{s.username}</span>
                  <span className="text-muted-foreground shrink-0">Q={s.Q} / H={s.H}</span>
                  {s.pump_name && <span className="truncate text-xs text-muted-foreground hidden md:block">{s.pump_name}</span>}
                  <span className="text-xs text-muted-foreground shrink-0">
                    {s.created_at ? new Date(s.created_at).toLocaleDateString("ru-RU") : ""}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Быстрый переход</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {quickLinks.map(item => (
            <Button
              key={item.leaf}
              variant="outline"
              className="h-16 flex-col gap-1"
              onClick={() => onNavigate(item.leaf)}
            >
              <span className="text-sm font-medium">{item.label}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

const AppAdmin: React.FC<AppAdminProps> = ({
  embedded = false,
  activeTab,
  onNavigateToPublicData,
  publicDataIntent,
  onPublicDataIntentHandled,
}) => {
  const { user } = useAuth();
  const { showNotification } = useToastNotification();
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  const [appearance, setAppearance] = useState<AdminAppearance | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [recordOffset, setRecordOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [newRow, setNewRow] = useState<Record<string, string> | null>(null);
  const [savingRecord, setSavingRecord] = useState(false);
  const [dataSearchQuery, setDataSearchQuery] = useState("");
  const [dataSortColumn, setDataSortColumn] = useState<string | null>(null);
  const [dataSortDirection, setDataSortDirection] = useState<"asc" | "desc">("asc");
  const [dataColumnFilters, setDataColumnFilters] = useState<Record<string, string>>({});
  const [excelImportBusy, setExcelImportBusy] = useState(false);
  const excelImportInputRef = useRef<HTMLInputElement>(null);
  const [dataTablePickerSearch, setDataTablePickerSearch] = useState("");
  const [extTables, setExtTables] = useState<PublicDataTableInfo[]>([]);
  const [publicDataTablesLoading, setPublicDataTablesLoading] = useState(false);
  const [publicDataTablesLoadError, setPublicDataTablesLoadError] = useState<string | null>(null);
  const [drawingsFiles, setDrawingsFiles] = useState<AdminDrawingsFile[]>([]);
  const [loadingDrawings, setLoadingDrawings] = useState(false);
  const [uploadingDrawings, setUploadingDrawings] = useState(false);
  const [drawingsUploadFolder, setDrawingsUploadFolder] = useState("");
  const [savingAppearance, setSavingAppearance] = useState(false);

  // Email settings state
  const [emailSettings, setEmailSettings] = useState<AdminEmailSettings | null>(null);
  const [emailForm, setEmailForm] = useState<AdminEmailSettings>({
    EMAIL_HOST: "smtp.yandex.ru",
    EMAIL_PORT: "465",
    EMAIL_USE_SSL: "True",
    EMAIL_USE_TLS: "False",
    EMAIL_HOST_USER: "",
    EMAIL_HOST_PASSWORD: "",
    DEFAULT_FROM_EMAIL: "",
  });
  const [savingEmail, setSavingEmail] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<string | null>(null);

  const [standaloneLeaf, setStandaloneLeaf] = useState<string>(() => {
    try {
      const raw = localStorage.getItem("adminLastTab") ?? "dashboard";
      return normalizeAdminLeaf(raw);
    } catch {
      return "dashboard";
    }
  });
  const [activeDataTable, setActiveDataTable] = useState<string | undefined>(undefined);
  const displayLeaf = embedded ? (activeTab ?? "users") : standaloneLeaf;

  const handleSidebarNavigate = (leafId: string, tableLink?: string) => {
    const target = normalizeAdminLeaf(leafId);
    setStandaloneLeaf(target);
    if (tableLink) setActiveDataTable(tableLink);
    else setActiveDataTable(undefined);
    try { localStorage.setItem("adminLastTab", target); } catch { /* ignore */ }
  };

  /** После первого открытия «Конструктор БД» держим компонент смонтированным — иначе при каждом переключении вкладки снова грузится схема. */
  const [dbConstructorRetained, setDbConstructorRetained] = useState(false);
  useEffect(() => {
    if (displayLeaf === "db-constructor") setDbConstructorRetained(true);
  }, [displayLeaf]);
  const currentAdminSection = useMemo(
    () => adminCurrentSection(standaloneLeaf),
    [standaloneLeaf],
  );

  const filteredDataTabTables = useMemo(() => {
    const q = dataTablePickerSearch.trim().toLowerCase();
    const base = !q ? extTables : extTables.filter((t) => t.name.toLowerCase().includes(q));
    if (!selectedModel) return base;
    if (base.some((t) => t.name === selectedModel)) return base;
    const selectedMeta = extTables.find((t) => t.name === selectedModel);
    return selectedMeta ? [selectedMeta, ...base] : base;
  }, [extTables, dataTablePickerSearch, selectedModel]);

  const loadAppearance = useCallback(async () => {
    try {
      const data = await adminGetAppearance();
      setAppearance(normalizeAdminAppearance(data));
      setAuthError(null);
      setLoginError(null);
      try {
        const who = await adminWhoami();
        setCurrentUser(who.username);
      } catch {
        setCurrentUser(null);
      }
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      const msg = e && typeof e === "object" && "response" in e
        ? (e as { response?: { data?: { error?: string } } }).response?.data?.error
        : null;
      if (status === 401 || status === 403) {
        setAuthError(msg || "Требуется вход в админ-панель");
      } else {
        setAppearance(null);
        setAuthError(msg || "Не удалось подключиться к серверу. Попробуйте войти.");
      }
    }
  }, []);

  const loadExtTables = useCallback(async () => {
    setPublicDataTablesLoading(true);
    setPublicDataTablesLoadError(null);
    try {
      await ensureCsrf();
      const list = await adminPublicDataListTables();
      setExtTables(list);
      setPublicDataTablesLoadError(null);
    } catch (e: unknown) {
      setExtTables([]);
      const resp = e as {
        response?: { status?: number; data?: { error?: string; detail?: unknown } };
        message?: string;
      };
      const detailRaw = resp.response?.data?.error ?? resp.response?.data?.detail;
      const detail = typeof detailRaw === "string" ? detailRaw : null;
      const msg =
        detail ??
        (resp.response?.status === 401
            ? "Требуется вход"
            : "Не удалось загрузить список таблиц (public)");
      setPublicDataTablesLoadError(msg);
      showNotification(msg, "error");
    } finally {
      setPublicDataTablesLoading(false);
    }
  }, [showNotification]);

  const loadExtRecords = useCallback(async (table: string, offset: number) => {
    setLoading(true);
    try {
      const { rows, total } = await adminPublicDataRows(table, { limit: 50, offset });
      setRecords(rows);
      setTotalRecords(total);
    } catch {
      setRecords([]);
      setTotalRecords(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEmailSettings = useCallback(async () => {
    try {
      const data = await adminGetEmailSettings();
      setEmailSettings(data);
      setEmailForm(data);
    } catch {
      // ignore
    }
  }, []);

  const loadDrawings = useCallback(async () => {
    setLoadingDrawings(true);
    try {
      const files = await adminDrawingsList();
      setDrawingsFiles(files);
    } catch {
      setDrawingsFiles([]);
      showNotification("Не удалось загрузить список изображений", "error");
    } finally {
      setLoadingDrawings(false);
    }
  }, [showNotification]);

  useEffect(() => {
    ensureCsrf().then(() => {
      loadAppearance();
      loadEmailSettings();
    }).catch(() => setAuthError("Ошибка инициализации"));
  }, [loadAppearance, loadEmailSettings]);

  useEffect(() => {
    if (!selectedModel) return;
    void loadExtRecords(selectedModel, recordOffset);
  }, [selectedModel, recordOffset, loadExtRecords]);

  useEffect(() => {
    if (displayLeaf === "data") void loadExtTables();
  }, [displayLeaf, loadExtTables]);

  useEffect(() => {
    if (!publicDataIntent || displayLeaf !== "data") return;
    const { table } = publicDataIntent;
    setSelectedModel(table);
    setRecordOffset(0);
    setNewRow(null);
    setDataSearchQuery("");
    setDataSortColumn(null);
    setDataColumnFilters({});
    setDataTablePickerSearch("");
    onPublicDataIntentHandled?.();
  }, [publicDataIntent, displayLeaf, onPublicDataIntentHandled]);

  const handleOpenPublicDataEditor = useCallback(
    (tableName: string) => {
      if (embedded && onNavigateToPublicData) {
        onNavigateToPublicData(tableName);
        return;
      }
      setStandaloneLeaf("data");
      setSelectedModel(tableName);
      setRecordOffset(0);
      setNewRow(null);
      setDataSearchQuery("");
      setDataSortColumn(null);
      setDataColumnFilters({});
      setDataTablePickerSearch("");
    },
    [embedded, onNavigateToPublicData],
  );

  const handleSaveAppearance = async (payload: {
    primary_color?: string;
    accent_color?: string;
    sidebar_text?: string;
    brand_key?: "strela" | "simpel";
    selection_stage_titles?: SelectionStageTitles | null;
    selection_category_full_width?: boolean;
    selection_card_settings?: SelectionCardSettings | null;
  }) => {
    if (!appearance) return;
    setSavingAppearance(true);
    try {
      const next = await adminPatchAppearance(payload);
      setAppearance(normalizeAdminAppearance(next));
      showNotification("Внешний вид сохранён", "success");
    } catch (e) {
      showNotification("Ошибка сохранения", "error");
    } finally {
      setSavingAppearance(false);
    }
  };

  const logoInputRef = useRef<HTMLInputElement>(null);
  const cpLogoInputRef = useRef<HTMLInputElement>(null);
  const techSpecsLogoInputRef = useRef<HTMLInputElement>(null);
  const hmCardInputRef = useRef<HTMLInputElement>(null);
  const hmCardFieldRef = useRef<string | null>(null);
  const funnelLogoInputRef = useRef<HTMLInputElement>(null);
  const funnelLogoSlideRef = useRef<1 | 2 | 3 | 4 | null>(null);
  const funnelWordmarkInputRef = useRef<HTMLInputElement>(null);
  const selectionCardCaptionLogoInputRef = useRef<HTMLInputElement>(null);
  const selectionFlowHeaderLogoInputRef = useRef<HTMLInputElement>(null);

  const uploadLogoFile = async (file: File) => {
    if (!file?.type.startsWith("image/")) {
      showNotification("Выберите файл изображения (PNG, JPG и т.д.)", "error");
      return;
    }
    setSavingAppearance(true);
    try {
      const next = await adminUploadLogo(file);
      setAppearance(normalizeAdminAppearance(next));
      showNotification("Логотип загружен", "success");
    } catch {
      showNotification("Ошибка загрузки логотипа", "error");
    } finally {
      setSavingAppearance(false);
    }
  };

  const uploadCpLogoFile = async (file: File) => {
    if (!file?.type.startsWith("image/")) {
      showNotification("Выберите файл изображения (PNG, JPG и т.д.)", "error");
      return;
    }
    setSavingAppearance(true);
    try {
      const next = await adminUploadCpLogo(file);
      setAppearance(normalizeAdminAppearance(next));
      showNotification("Логотип КП загружен", "success");
    } catch {
      showNotification("Ошибка загрузки логотипа КП", "error");
    } finally {
      setSavingAppearance(false);
    }
  };

  const uploadTechSpecsLogoFile = async (file: File) => {
    if (!file?.type.startsWith("image/")) {
      showNotification("Выберите файл изображения (PNG, JPG и т.д.)", "error");
      return;
    }
    setSavingAppearance(true);
    try {
      const next = await adminUploadTechSpecsLogo(file);
      setAppearance(normalizeAdminAppearance(next));
      showNotification("Логотип тех. характеристик загружен", "success");
    } catch {
      showNotification("Ошибка загрузки логотипа тех. характеристик", "error");
    } finally {
      setSavingAppearance(false);
    }
  };

  const uploadHydromoduleCardFile = async (formFieldName: string, file: File) => {
    if (!file?.type.startsWith("image/")) {
      showNotification("Выберите файл изображения (PNG, JPG и т.д.)", "error");
      return;
    }
    setSavingAppearance(true);
    try {
      const next = await adminUploadHydromoduleCard(formFieldName, file);
      setAppearance(normalizeAdminAppearance(next));
      showNotification("Изображение карточки гидромодуля загружено", "success");
    } catch {
      showNotification("Ошибка загрузки изображения карточки", "error");
    } finally {
      setSavingAppearance(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadLogoFile(file);
    e.target.value = "";
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) uploadLogoFile(file);
  };

  const handleLogoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleCpLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadCpLogoFile(file);
    e.target.value = "";
  };

  const handleCpLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) uploadCpLogoFile(file);
  };

  const handleCpLogoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleTechSpecsLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadTechSpecsLogoFile(file);
    e.target.value = "";
  };

  const handleTechSpecsLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) uploadTechSpecsLogoFile(file);
  };

  const handleTechSpecsLogoDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleHmCardUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const field = hmCardFieldRef.current;
    const file = e.target.files?.[0];
    if (field && file) void uploadHydromoduleCardFile(field, file);
    hmCardFieldRef.current = null;
    e.target.value = "";
  };

  const openHmCardPicker = (lineId: HydromoduleLineId) => {
    hmCardFieldRef.current = HYDROMODULE_CARD_FORM_FIELD[lineId];
    hmCardInputRef.current?.click();
  };

  const uploadFunnelLogoFile = async (slide: 1 | 2 | 3 | 4, file: File) => {
    if (!file?.type.startsWith("image/")) {
      showNotification("Выберите файл изображения (PNG, JPG и т.д.)", "error");
      return;
    }
    setSavingAppearance(true);
    try {
      const next = await adminUploadFunnelSidebarLogo(slide, file);
      setAppearance(normalizeAdminAppearance(next));
      showNotification(`Логотип слайда ${slide} загружен`, "success");
    } catch {
      showNotification("Ошибка загрузки логотипа воронки", "error");
    } finally {
      setSavingAppearance(false);
    }
  };

  const handleFunnelLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const slide = funnelLogoSlideRef.current;
    const file = e.target.files?.[0];
    if (slide && file) void uploadFunnelLogoFile(slide, file);
    funnelLogoSlideRef.current = null;
    e.target.value = "";
  };

  const openFunnelLogoPicker = (slide: 1 | 2 | 3 | 4) => {
    funnelLogoSlideRef.current = slide;
    funnelLogoInputRef.current?.click();
  };

  const uploadFunnelWordmarkFile = async (file: File) => {
    const ok =
      file.type.startsWith("image/") ||
      file.type === "image/svg+xml" ||
      /\.svg$/i.test(file.name);
    if (!ok) {
      showNotification("Выберите SVG или изображение (PNG, JPG)", "error");
      return;
    }
    setSavingAppearance(true);
    try {
      const next = await adminUploadFunnelSidebarWordmark(file);
      setAppearance(normalizeAdminAppearance(next));
      showNotification("Вертикальный логотип воронки загружен", "success");
    } catch {
      showNotification("Ошибка загрузки логотипа", "error");
    } finally {
      setSavingAppearance(false);
    }
  };

  const handleFunnelWordmarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadFunnelWordmarkFile(file);
    e.target.value = "";
  };

  const uploadSelectionCardCaptionLogoFile = async (file: File) => {
    const ok =
      file.type.startsWith("image/") ||
      file.type === "image/svg+xml" ||
      /\.svg$/i.test(file.name);
    if (!ok) {
      showNotification("Выберите SVG или изображение (PNG, JPG)", "error");
      return;
    }
    setSavingAppearance(true);
    try {
      const next = await adminUploadSelectionCardCaptionLogo(file);
      setAppearance(normalizeAdminAppearance(next));
      showNotification("Значок у названия карточки загружен", "success");
    } catch {
      showNotification("Ошибка загрузки значка", "error");
    } finally {
      setSavingAppearance(false);
    }
  };

  const handleSelectionCardCaptionLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadSelectionCardCaptionLogoFile(file);
    e.target.value = "";
  };

  const uploadSelectionFlowHeaderLogoFile = async (file: File) => {
    if (!file?.type.startsWith("image/") && !/\.svg$/i.test(file.name)) {
      showNotification("Выберите изображение или SVG", "error");
      return;
    }
    setSavingAppearance(true);
    try {
      const next = await adminUploadSelectionFlowHeaderLogo(file);
      setAppearance(normalizeAdminAppearance(next));
      showNotification("Логотип шапки подбора загружен", "success");
    } catch {
      showNotification("Ошибка загрузки логотипа шапки", "error");
    } finally {
      setSavingAppearance(false);
    }
  };

  const handleSelectionFlowHeaderLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void uploadSelectionFlowHeaderLogoFile(file);
    e.target.value = "";
  };

  const patchSelectionStageTitle = (
    stageKey: keyof SelectionStageTitles,
    field: "title" | "subtitle",
    value: string,
  ) => {
    setAppearance((a) => {
      if (!a) return null;
      const prev = a.selection_stage_titles ?? {};
      const cur = prev[stageKey] ?? {};
      return {
        ...a,
        selection_stage_titles: {
          ...prev,
          [stageKey]: { ...cur, [field]: value },
        },
      };
    });
  };

  const patchSelectionCardSettings = (patch: Partial<SelectionCardSettings>) => {
    setAppearance((a) => {
      if (!a) return null;
      const cur: Record<string, unknown> = { ...(a.selection_card_settings ?? {}) };
      for (const [key, val] of Object.entries(patch)) {
        if (val === undefined || val === null) {
          delete cur[key];
        } else {
          cur[key] = val;
        }
      }
      const hasKeys = Object.keys(cur).length > 0;
      return {
        ...a,
        selection_card_settings: hasKeys ? (cur as SelectionCardSettings) : null,
      };
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    if (!loginUsername.trim() || !loginPassword) {
      setLoginError("Введите логин и пароль");
      return;
    }
    setLoggingIn(true);
    try {
      await adminLogin(loginUsername.trim(), loginPassword);
      setAuthError(null);
      setLoginError(null);
      await ensureCsrf();
      setCurrentUser(loginUsername.trim());
      const [rApp, rExtTables, rDrawings] = await Promise.allSettled([
        loadAppearance(),
        loadExtTables(),
        loadDrawings(),
      ]);
      if (rApp.status === "rejected") {
        setAppearance(null);
        showNotification("Не удалось загрузить настройки внешнего вида", "error");
      }
      if (rExtTables.status === "rejected") {
        setExtTables([]);
        showNotification("Не удалось загрузить список таблиц каталога", "error");
      }
      if (rDrawings.status === "rejected") {
        setDrawingsFiles([]);
      }
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : "Неверный логин или пароль";
      setLoginError(msg || "Неверный логин или пароль");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await adminLogout();
      setAppearance(null);
      setCurrentUser(null);
      setAuthError("Выход выполнен. Войдите снова.");
    } catch {
      setAppearance(null);
      setAuthError("Выход выполнен. Войдите снова.");
    }
  };

  // В embedded-режиме: если пользователь не является администратором — ничего не рендерим
  if (embedded && !canAccessAdminPanel(user)) return null;

  if (!embedded && authError && !appearance) {
    return (
      <div className="min-h-screen bg-tech-pattern">
        <Header showLogo={false} />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Card className="card-industrial max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Вход в админ-панель</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{authError}</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-username">Логин</Label>
                  <Input
                    id="login-username"
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="mt-1"
                    autoComplete="username"
                    disabled={loggingIn}
                  />
                </div>
                <div>
                  <Label htmlFor="login-password">Пароль</Label>
                  <Input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="mt-1"
                    autoComplete="current-password"
                    disabled={loggingIn}
                  />
                </div>
                {loginError && (
                  <p className="text-sm text-destructive">{loginError}</p>
                )}
                <div className="flex gap-2">
                  <Button type="submit" disabled={loggingIn}>
                    {loggingIn ? "Вход…" : "Войти"}
                  </Button>
                  <Link href="/">
                    <Button type="button" variant="outline">На главную</Button>
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const tabsNode = (
    <div className={embedded ? "space-y-4" : "flex min-h-[calc(100vh-10rem)] gap-0 rounded-lg border border-border overflow-hidden"}>
      {!embedded && (
        <AdminSidebar
          activeLeaf={displayLeaf}
          activeTable={activeDataTable}
          onNavigate={handleSidebarNavigate}
        />
      )}
      <div className={embedded ? "" : "flex-1 overflow-auto p-4 space-y-4"}>

          {/* ── Настройки Email ──────────────────────────────────────────── */}
          {displayLeaf === "email" && (
          <div className="space-y-4">
            <Card className="card-industrial">
              <CardHeader>
                <CardTitle>Настройки Email (SMTP)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 max-w-lg">
                <div className="space-y-3">
                  <div>
                    <Label>SMTP сервер</Label>
                    <Input
                      value={emailForm.EMAIL_HOST}
                      onChange={e => setEmailForm(f => ({ ...f, EMAIL_HOST: e.target.value }))}
                      placeholder="smtp.yandex.ru"
                    />
                  </div>
                  <div>
                    <Label>Порт</Label>
                    <Input
                      value={emailForm.EMAIL_PORT}
                      onChange={e => setEmailForm(f => ({ ...f, EMAIL_PORT: e.target.value }))}
                      placeholder="465"
                    />
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailForm.EMAIL_USE_SSL === "True"}
                        onChange={e => setEmailForm(f => ({ ...f, EMAIL_USE_SSL: e.target.checked ? "True" : "False" }))}
                      />
                      <span className="text-sm">Использовать SSL (порт 465)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailForm.EMAIL_USE_TLS === "True"}
                        onChange={e => setEmailForm(f => ({ ...f, EMAIL_USE_TLS: e.target.checked ? "True" : "False" }))}
                      />
                      <span className="text-sm">Использовать TLS (порт 587)</span>
                    </label>
                  </div>
                  <div>
                    <Label>Email отправителя (логин)</Label>
                    <Input
                      value={emailForm.EMAIL_HOST_USER}
                      onChange={e => setEmailForm(f => ({ ...f, EMAIL_HOST_USER: e.target.value }))}
                      placeholder="noreply@example.com"
                    />
                  </div>
                  <div>
                    <Label>Пароль приложения</Label>
                    <Input
                      type="password"
                      value={emailForm.EMAIL_HOST_PASSWORD}
                      onChange={e => setEmailForm(f => ({ ...f, EMAIL_HOST_PASSWORD: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <Label>Адрес «От кого» (DEFAULT_FROM_EMAIL)</Label>
                    <Input
                      value={emailForm.DEFAULT_FROM_EMAIL}
                      onChange={e => setEmailForm(f => ({ ...f, DEFAULT_FROM_EMAIL: e.target.value }))}
                      placeholder="noreply@example.com"
                    />
                  </div>
                </div>

                {emailTestResult && (
                  <div className={`text-sm p-2 rounded ${emailTestResult === "ok" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {emailTestResult === "ok" ? "Соединение успешно." : `Ошибка: ${emailTestResult}`}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Button
                    disabled={savingEmail}
                    onClick={async () => {
                      setSavingEmail(true);
                      setEmailTestResult(null);
                      try {
                        await adminPatchEmailSettings(emailForm);
                        showNotification("Настройки email сохранены", "success");
                        await loadEmailSettings();
                      } catch {
                        showNotification("Ошибка сохранения", "error");
                      } finally {
                        setSavingEmail(false);
                      }
                    }}
                  >
                    {savingEmail ? "Сохранение..." : "Сохранить"}
                  </Button>
                  <Button
                    variant="outline"
                    disabled={testingEmail}
                    onClick={async () => {
                      setTestingEmail(true);
                      setEmailTestResult(null);
                      try {
                        const res = await adminPatchEmailSettings({ ...emailForm, test_connection: true });
                        setEmailTestResult(res.test_result ?? "ok");
                      } catch {
                        setEmailTestResult("Ошибка запроса");
                      } finally {
                        setTestingEmail(false);
                      }
                    }}
                  >
                    {testingEmail ? "Проверка..." : "Проверить соединение"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          )}

          {displayLeaf === "data" && (
          <div className="space-y-4">
            <Card className="card-industrial">
              <CardHeader>
                <CardTitle>Данные в схеме public</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-w-md">
                  <div>
                    <Label htmlFor="admin-public-data-table-search">Фильтр таблиц</Label>
                    <Input
                      id="admin-public-data-table-search"
                      placeholder="Введите часть имени таблицы…"
                      value={dataTablePickerSearch}
                      disabled={publicDataTablesLoading}
                      onChange={(e) => setDataTablePickerSearch(e.target.value)}
                      className="mt-1 font-mono text-sm"
                      autoComplete="off"
                    />
                    {extTables.length > 0 && dataTablePickerSearch.trim() ? (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        В списке выбора: {filteredDataTabTables.length} из {extTables.length}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <Label htmlFor="admin-public-data-table">Таблица</Label>
                    {publicDataTablesLoading ? (
                      <div className="mt-2 space-y-1.5" aria-busy="true" aria-live="polite">
                        <Progress value={45} className="h-1.5 w-full animate-pulse" />
                        <p className="text-xs text-muted-foreground">Загрузка списка таблиц…</p>
                      </div>
                    ) : null}
                    <Select
                      disabled={publicDataTablesLoading}
                      value={selectedModel ?? DATA_TAB_TABLE_NONE}
                      onValueChange={(v) => {
                        setSelectedModel(v === DATA_TAB_TABLE_NONE ? null : v);
                        setRecordOffset(0);
                        setNewRow(null);
                        setDataSearchQuery("");
                        setDataSortColumn(null);
                        setDataColumnFilters({});
                      }}
                    >
                      <SelectTrigger id="admin-public-data-table" className="mt-1 w-full">
                        <SelectValue placeholder="— Выберите —" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[min(60vh,360px)]">
                        <SelectItem value={DATA_TAB_TABLE_NONE}>— Выберите —</SelectItem>
                        {filteredDataTabTables.map((t) => (
                          <SelectItem key={t.name} value={t.name} className="font-mono text-xs">
                            {t.name}
                          </SelectItem>
                        ))}
                        {extTables.length > 0 && filteredDataTabTables.length === 0 ? (
                          <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                            Нет таблиц по фильтру — смените текст выше
                          </div>
                        ) : null}
                      </SelectContent>
                    </Select>
                  </div>
                  {!publicDataTablesLoading && publicDataTablesLoadError ? (
                    <p className="text-xs text-destructive">
                      {publicDataTablesLoadError}{" "}
                      <button
                        type="button"
                        className="text-primary underline underline-offset-2 hover:no-underline"
                        onClick={() => void loadExtTables()}
                      >
                        Повторить загрузку
                      </button>
                    </p>
                  ) : null}
                  {!publicDataTablesLoading && !publicDataTablesLoadError && extTables.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      В схеме public нет таблиц для этой панели (кроме служебных auth_* и системных).{" "}
                      <button
                        type="button"
                        className="text-primary underline underline-offset-2 hover:no-underline"
                        onClick={() => void loadExtTables()}
                      >
                        Обновить
                      </button>
                    </p>
                  ) : null}
                </div>
                {selectedModel && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Записей: {totalRecords}. Показано с {recordOffset + 1} по {Math.min(recordOffset + 50, totalRecords)}.
                    </p>
                    {(() => {
                      const extTable = extTables.find((t) => t.name === selectedModel);
                      if (!extTable) {
                        return (
                          <p className="text-sm text-muted-foreground">
                            Таблица не в списке загруженных. Откройте вкладку «Данные» снова или выберите другую таблицу.
                          </p>
                        );
                      }
                      const columns =
                        records.length > 0
                          ? Object.keys(records[0])
                          : (extTable.columns?.map((c) => c.name) ?? []);
                      const pkField = columns.includes("id") ? "id" : columns[0];
                      const editableColumns = columns.filter((c) => c !== pkField);
                      const tableEditable = isPublicDataTableEditable(extTable.editable);

                      const searchLower = dataSearchQuery.trim().toLowerCase();
                      const hasSearch = searchLower.length > 0;
                      const hasColumnFilters = Object.values(dataColumnFilters).some((v) => v.trim() !== "");

                      let filteredAndSortedRecords = records;
                      if (hasSearch || hasColumnFilters) {
                        filteredAndSortedRecords = records.filter((row) => {
                          if (hasSearch) {
                            const matchSearch = columns.some((col) =>
                              String(row[col] ?? "").toLowerCase().includes(searchLower)
                            );
                            if (!matchSearch) return false;
                          }
                          if (hasColumnFilters) {
                            for (const [col, filterVal] of Object.entries(dataColumnFilters)) {
                              const v = filterVal.trim();
                              if (v === "") continue;
                              if (!String(row[col] ?? "").toLowerCase().includes(v.toLowerCase()))
                                return false;
                            }
                          }
                          return true;
                        });
                      }
                      if (dataSortColumn && columns.includes(dataSortColumn)) {
                        filteredAndSortedRecords = [...filteredAndSortedRecords].sort((a, b) => {
                          const va = a[dataSortColumn];
                          const vb = b[dataSortColumn];
                          const aStr = String(va ?? "");
                          const bStr = String(vb ?? "");
                          const numA = Number(va);
                          const numB = Number(vb);
                          let cmp: number;
                          if (
                            va != null &&
                            vb != null &&
                            !Number.isNaN(numA) &&
                            !Number.isNaN(numB)
                          ) {
                            cmp = numA - numB;
                          } else {
                            cmp = aStr.localeCompare(bStr, undefined, { numeric: true });
                          }
                          return dataSortDirection === "asc" ? cmp : -cmp;
                        });
                      }

                      const toggleSort = (col: string) => {
                        if (dataSortColumn === col) {
                          setDataSortDirection((d) => (d === "asc" ? "desc" : "asc"));
                        } else {
                          setDataSortColumn(col);
                          setDataSortDirection("asc");
                        }
                      };

                      const setColumnFilter = (col: string, value: string) => {
                        setDataColumnFilters((prev) => {
                          const next = { ...prev };
                          if (value.trim() === "") delete next[col];
                          else next[col] = value;
                          return next;
                        });
                      };

                      const uniqueValuesByColumn: Record<string, string[]> = {};
                      columns.forEach((col) => {
                        const values = Array.from(
                          new Set(records.map((row) => String(row[col] ?? "").trim()).filter(Boolean)),
                        );
                        values.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                        uniqueValuesByColumn[col] = values;
                      });

                      const runExcelImport = async (file: File) => {
                        if (!tableEditable) return;
                        setExcelImportBusy(true);
                        try {
                          const rows = await parseFirstSheetAsTableRows(file);
                          if (rows.length === 0) {
                            showNotification("На листе нет данных", "error");
                            return;
                          }
                          const keys = Object.keys(rows[0]!);
                          assertExcelColumnsMatchTable(columns, keys);
                          const dataRows = rows.filter((r) => !isRowVisuallyEmpty(r, columns));
                          if (dataRows.length === 0) {
                            showNotification("Нет непустых строк для импорта", "error");
                            return;
                          }
                          const maxRows = 2000;
                          if (dataRows.length > maxRows) {
                            showNotification(`Слишком много строк (макс. ${maxRows} за раз)`, "error");
                            return;
                          }
                          await ensureCsrf();
                          let ok = 0;
                          for (let i = 0; i < dataRows.length; i++) {
                            const payload = buildCreatePayloadFromRow(dataRows[i], columns, pkField);
                            if (Object.keys(payload).length === 0) continue;
                            try {
                              await adminPublicDataCreate(selectedModel!, payload);
                              ok++;
                            } catch (e: unknown) {
                              const msg = e instanceof Error ? e.message : String(e);
                              showNotification(`Строка ${i + 2} в Excel: ${msg}`, "error");
                              return;
                            }
                          }
                          showNotification(`Импорт: добавлено строк — ${ok}`, "success");
                          await loadExtRecords(selectedModel!, recordOffset);
                        } catch (e: unknown) {
                          showNotification(e instanceof Error ? e.message : String(e), "error");
                        } finally {
                          setExcelImportBusy(false);
                          if (excelImportInputRef.current) excelImportInputRef.current.value = "";
                        }
                      };

                      return (
                        <>
                          {!tableEditable ? (
                            <p className="text-xs text-muted-foreground rounded-md border border-dashed px-2 py-1.5 bg-muted/40">
                              Только просмотр: изменение строк для этой таблицы здесь недоступно.
                            </p>
                          ) : null}
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                ref={excelImportInputRef}
                                type="file"
                                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) void runExcelImport(f);
                                }}
                              />
                              <Input
                                type="search"
                                placeholder="Поиск по таблице..."
                                className="max-w-xs"
                                value={dataSearchQuery}
                                onChange={(e) => setDataSearchQuery(e.target.value)}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={excelImportBusy || columns.length === 0 || !tableEditable}
                                aria-label="Загрузить данные из файла Excel"
                                onClick={() => excelImportInputRef.current?.click()}
                              >
                                <Upload className="h-4 w-4 mr-1" aria-hidden />
                                {excelImportBusy ? "Импорт…" : "Загрузить Excel…"}
                              </Button>
                              {(dataSearchQuery.trim() || Object.values(dataColumnFilters).some((v) => v.trim() !== "")) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setDataSearchQuery("");
                                    setDataColumnFilters({});
                                  }}
                                >
                                  Сбросить фильтры
                                </Button>
                              )}
                              {(hasSearch || hasColumnFilters) && records.length > 0 && (
                                <span className="text-muted-foreground text-sm">
                                  На странице: {filteredAndSortedRecords.length} из {records.length}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="overflow-x-auto border rounded-lg">
                            {loading ? (
                              <p className="p-4">Загрузка...</p>
                            ) : records.length === 0 && !newRow ? (
                              <p className="p-4 text-muted-foreground">Нет записей</p>
                            ) : (
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b bg-muted/50">
                                    {columns.map((col) => (
                                      <th key={col} className="text-left p-2 font-medium">
                                        <button
                                          type="button"
                                          className="flex items-center gap-1 hover:underline focus:outline-none focus:underline"
                                          onClick={() => toggleSort(col)}
                                        >
                                          {col}
                                          {dataSortColumn === col && (
                                            <span className="text-muted-foreground">
                                              {dataSortDirection === "asc" ? " ↑" : " ↓"}
                                            </span>
                                          )}
                                        </button>
                                      </th>
                                    ))}
                                    <th className="text-left p-2 font-medium w-24">Действия</th>
                                  </tr>
                                  {columns.length > 0 && (
                                    <tr className="border-b bg-muted/30">
                                      {columns.map((col) => (
                                        <td key={col} className="p-1">
                                          <div className="flex flex-col gap-1">
                                            <input
                                              className="w-full min-w-[60px] rounded border border-input bg-background px-1.5 py-0.5 text-xs"
                                              placeholder={`Фильтр: ${col}`}
                                              value={dataColumnFilters[col] ?? ""}
                                              onChange={(e) => setColumnFilter(col, e.target.value)}
                                            />
                                            {uniqueValuesByColumn[col]?.length > 0 && (
                                              <Select
                                                value={
                                                  dataColumnFilters[col] && uniqueValuesByColumn[col].includes(dataColumnFilters[col])
                                                    ? dataColumnFilters[col]
                                                    : undefined
                                                }
                                                onValueChange={(v) => setColumnFilter(col, v === "__clear__" ? "" : v)}
                                              >
                                                <SelectTrigger className="h-7 text-xs min-w-0">
                                                  <SelectValue placeholder="из столбца" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="__clear__" className="text-xs">
                                                    — сбросить —
                                                  </SelectItem>
                                                  {uniqueValuesByColumn[col].map((val) => (
                                                    <SelectItem key={val} value={val} className="text-xs truncate max-w-[200px]">
                                                      {val}
                                                    </SelectItem>
                                                  ))}
                                                </SelectContent>
                                              </Select>
                                            )}
                                          </div>
                                        </td>
                                      ))}
                                      <td className="p-1 w-24" />
                                    </tr>
                                  )}
                                </thead>
                                <tbody>
                                  {filteredAndSortedRecords.map((row, i) => (
                                    <tr key={row[pkField] ?? i} className="border-b">
                                      {columns.map((col) => (
                                        <td key={col} className="p-1">
                                          {col === pkField ? (
                                            <span className="px-2 py-1 block">{String(row[col] ?? "")}</span>
                                          ) : (
                                            <input
                                              className="w-full min-w-[80px] rounded border border-input bg-background px-2 py-1 text-sm read-only:bg-muted/40 read-only:pointer-events-none"
                                              readOnly={!tableEditable}
                                              defaultValue={String(row[col] ?? "")}
                                              onBlur={(e) => {
                                                if (!tableEditable) return;
                                                const v = e.target.value;
                                                if (String(row[col] ?? "") === v) return;
                                                const pk = Number(row[pkField]);
                                                if (Number.isNaN(pk)) return;
                                                const doReload = () =>
                                                  loadExtRecords(selectedModel!, recordOffset);
                                                const p = adminPublicDataUpdate(selectedModel!, pk, { [col]: v });
                                                p.then(doReload).catch(() =>
                                                  showNotification("Ошибка сохранения", "error"),
                                                );
                                              }}
                                            />
                                          )}
                                        </td>
                                      ))}
                                      <td className="p-1">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="text-destructive hover:bg-destructive/10"
                                          disabled={!tableEditable || savingRecord}
                                          onClick={() => {
                                            const pk = Number(row[pkField]);
                                            if (Number.isNaN(pk) || !confirm("Удалить запись?")) return;
                                            setSavingRecord(true);
                                            const doReload = () =>
                                              loadExtRecords(selectedModel!, recordOffset);
                                            const del = adminPublicDataDelete(selectedModel!, pk);
                                            del
                                              .then(doReload)
                                              .catch(() => showNotification("Ошибка удаления", "error"))
                                              .finally(() => setSavingRecord(false));
                                          }}
                                        >
                                          Удалить
                                        </Button>
                                      </td>
                                    </tr>
                                  ))}
                                  {tableEditable && newRow && (
                                    <tr className="border-b bg-muted/30">
                                      {columns.map((col) => (
                                        <td key={col} className="p-1">
                                          {col === pkField ? (
                                            <span className="px-2 py-1 block text-muted-foreground">—</span>
                                          ) : (
                                            <input
                                              className="w-full min-w-[80px] rounded border border-input bg-background px-2 py-1 text-sm"
                                              placeholder={col}
                                              value={newRow[col] ?? ""}
                                              onChange={(e) =>
                                                setNewRow((prev) => ({ ...prev!, [col]: e.target.value }))
                                              }
                                            />
                                          )}
                                        </td>
                                      ))}
                                      <td className="p-1">
                                        <div className="flex gap-1">
                                          <Button
                                            size="sm"
                                            disabled={savingRecord}
                                            onClick={() => {
                                              const payload: Record<string, unknown> = {};
                                              editableColumns.forEach((c) => {
                                                const val = newRow[c] ?? "";
                                                if (val !== "") payload[c] = val;
                                              });
                                              setSavingRecord(true);
                                              const createP = adminPublicDataCreate(selectedModel!, payload);
                                              createP
                                                .then(() => {
                                                  setNewRow(null);
                                                  loadExtRecords(selectedModel!, recordOffset);
                                                  showNotification("Запись создана", "success");
                                                })
                                                .catch((err) => {
                                                  const msg =
                                                    err?.message ?? err?.detail ?? "Ошибка создания";
                                                  showNotification(String(msg), "error");
                                                })
                                                .finally(() => setSavingRecord(false));
                                            }}
                                          >
                                            Создать
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            disabled={savingRecord}
                                            onClick={() => setNewRow(null)}
                                          >
                                            Отмена
                                          </Button>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="outline"
                              disabled={recordOffset === 0}
                              onClick={() => setRecordOffset((o) => Math.max(0, o - 50))}
                            >
                              Назад
                            </Button>
                            <Button
                              variant="outline"
                              disabled={recordOffset + 50 >= totalRecords}
                              onClick={() => setRecordOffset((o) => o + 50)}
                            >
                              Вперёд
                            </Button>
                            {!newRow && columns.length > 0 && (
                              <Button
                                variant="secondary"
                                onClick={() =>
                                  setNewRow(columns.reduce<Record<string, string>>((acc, c) => ({ ...acc, [c]: "" }), {}))
                                }
                              >
                                Добавить строку
                              </Button>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
          )}

          {displayLeaf === "data-flow-studio" && (
            <div className="space-y-4">
              <DataFlowStudio />
            </div>
          )}

          {dbConstructorRetained && (
            <div
              className={`space-y-4 ${displayLeaf === "db-constructor" ? "" : "hidden"}`}
              aria-hidden={displayLeaf !== "db-constructor"}
            >
              <AdminDbConstructor onOpenPublicDataEditor={handleOpenPublicDataEditor} />
            </div>
          )}

          {displayLeaf === "pdf-constructor" && (
            <AdminMovedToWhiteLabel title="Конструктор PDF" onNavigate={handleSidebarNavigate} />
          )}

          {displayLeaf === "page-layout-editor" && (
            isAdminLeafVisible("page-layout-editor") ? (
              <PageLayoutEditorTab />
            ) : (
              <AdminMovedToWhiteLabel title="Макет подбора" onNavigate={handleSidebarNavigate} />
            )
          )}

          {displayLeaf === "appearance" && (
            <AdminMovedToWhiteLabel title="Внешний вид витрины" onNavigate={handleSidebarNavigate} />
          )}

          {displayLeaf === "drawings" && !isAdminLeafVisible("drawings") && (
            <AdminMovedToWhiteLabel title="Изображения" onNavigate={handleSidebarNavigate} />
          )}

          {displayLeaf === "drawings" && isAdminLeafVisible("drawings") && (
          <div className="space-y-4">
            <Card className="card-industrial">
              <CardHeader>
                <CardTitle>Изображения на сервере (Drawings)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Файлы из каталога Drawings используются в PDF (чертежи, логотипы по умолчанию). Допустимые форматы: PNG, JPG, JPEG.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadDrawings}
                    disabled={loadingDrawings}
                  >
                    {loadingDrawings ? "Загрузка…" : "Обновить список"}
                  </Button>
                  <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-xs">
                    <label className="text-xs text-muted-foreground" htmlFor="drawings-upload-folder">
                      Папка в Drawings (необязательно)
                    </label>
                    <input
                      id="drawings-upload-folder"
                      type="text"
                      placeholder="например logos или schemes/pumps"
                      value={drawingsUploadFolder}
                      onChange={(e) => setDrawingsUploadFolder(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      disabled={uploadingDrawings}
                    />
                  </div>
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-input bg-background px-4 py-2 hover:bg-accent hover:text-accent-foreground">
                      Загрузить изображение
                    </span>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      className="hidden"
                      disabled={uploadingDrawings}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        e.target.value = "";
                        setUploadingDrawings(true);
                        try {
                          await adminDrawingsUpload(file, drawingsUploadFolder.trim() || undefined);
                          showNotification(`Файл «${file.name}» загружен`, "success");
                          await loadDrawings();
                        } catch (err: unknown) {
                          const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
                          showNotification(msg || "Ошибка загрузки", "error");
                        } finally {
                          setUploadingDrawings(false);
                        }
                      }}
                    />
                  </label>
                </div>
                {loadingDrawings ? (
                  <p className="text-muted-foreground">Загрузка списка…</p>
                ) : drawingsFiles.length === 0 ? (
                  <p className="text-muted-foreground">Нет изображений в каталоге или каталог недоступен.</p>
                ) : (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-2 font-medium w-[96px]">Превью</th>
                          <th className="text-left p-2 font-medium">Папка</th>
                          <th className="text-left p-2 font-medium">Путь</th>
                          <th className="text-left p-2 font-medium">Размер</th>
                          <th className="text-left p-2 font-medium w-24">Действия</th>
                        </tr>
                      </thead>
                      <tbody>
                        {drawingsFiles.map((f) => (
                          <tr key={f.path || f.name} className="border-b last:border-0">
                            <td className="p-2">
                              {f.preview_url ? (
                                <img
                                  src={f.preview_url}
                                  alt={f.name}
                                  className="h-14 w-20 rounded border object-contain bg-muted/20"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="p-2 text-muted-foreground">{f.folder || "—"}</td>
                            <td className="p-2 font-mono text-xs break-all">{f.path || f.name}</td>
                            <td className="p-2">
                              {f.size != null ? `${(f.size / 1024).toFixed(1)} КБ` : "—"}
                            </td>
                            <td className="p-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={async () => {
                                  const delPath = f.path || f.name;
                                  if (!confirm(`Удалить файл «${delPath}»?`)) return;
                                  try {
                                    await adminDrawingsDelete(delPath);
                                    showNotification("Файл удалён", "success");
                                    await loadDrawings();
                                  } catch (err: unknown) {
                                    const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
                                    showNotification(msg || "Ошибка удаления", "error");
                                  }
                                }}
                              >
                                Удалить
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          )}

          {/* ── ВКЛАДКА: ПОЛЬЗОВАТЕЛИ ────────────────────────────────────── */}
          {displayLeaf === "users" && (
          <div className="space-y-4">
            <UsersTab showNotification={showNotification} />
          </div>
          )}

          {/* ── ВКЛАДКА: НАСТРОЙКИ АЛГОРИТМА ─────────────────────────────── */}
          {displayLeaf === "selection-settings" && (
            <AdminSelectionSettings />
          )}

          {/* ── ВКЛАДКА: ПРОФИЛИ АЛГОРИТМА ───────────────────────────────── */}

          {/* ── ВКЛАДКА: WHITE-LABEL ───────────────────────────────────── */}
          {displayLeaf === "white-label" && (
            <WhiteLabelManagerTab />
          )}

          {/* ── ВКЛАДКА: ДАШБОРД ─────────────────────────────────────────── */}
          {displayLeaf === "dashboard" && (
            <AdminDashboard onNavigate={handleSidebarNavigate} />
          )}

        </div>
    </div>
  );

  // Встроенный режим: только вкладки, без внешней обёртки
  if (embedded) return tabsNode;

  // Полноценная страница админ-панели
  return (
    <div className="min-h-screen bg-tech-pattern">
      <Header showLogo={false} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-foreground">
            Админ-панель
            {currentUser && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">({currentUser})</span>
            )}
          </h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleLogout}>Выйти</Button>
            <Link href="/">
              <Button variant="outline">На главную</Button>
            </Link>
          </div>
        </div>
        {tabsNode}
      </div>
    </div>
  );
};

/* ── Компонент управления пользователями ──────────────────────────────────── */
function UsersTab({ showNotification }: { showNotification: (msg: string, type?: "success"|"error"|"info") => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showPwd, setShowPwd] = useState<number | null>(null);
  const [newPwd, setNewPwd] = useState("");

  // Форма создания
  const [createForm, setCreateForm] = useState({ email: "", password: "", first_name: "", last_name: "", role: "user" as "user" | "admin" });

  useEffect(() => {
    adminGetUsers()
      .then(setUsers)
      .catch(() => showNotification("Ошибка загрузки пользователей", "error"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.first_name.toLowerCase().includes(search.toLowerCase()) ||
    u.last_name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate() {
    try {
      await adminCreateUser(createForm);
      showNotification("Пользователь создан", "success");
      setShowCreate(false);
      setCreateForm({ email: "", password: "", first_name: "", last_name: "", role: "user" });
      const updated = await adminGetUsers();
      setUsers(updated);
    } catch (e: any) {
      showNotification(e?.response?.data?.error || "Ошибка", "error");
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Удалить пользователя и все его данные?")) return;
    try {
      await adminDeleteUser(id);
      setUsers(u => u.filter(x => x.id !== id));
      if (selectedUser?.id === id) setSelectedUser(null);
      showNotification("Пользователь удалён", "success");
    } catch (e: any) {
      showNotification(e?.response?.data?.error || "Ошибка удаления", "error");
    }
  }

  async function handleToggleActive(u: AdminUser) {
    try {
      const updated = await adminUpdateUser(u.id, { is_active: !u.is_active });
      setUsers(us => us.map(x => x.id === u.id ? { ...x, is_active: updated.is_active } : x));
      if (selectedUser?.id === u.id) setSelectedUser(s => s ? { ...s, is_active: updated.is_active } : s);
    } catch { showNotification("Ошибка", "error"); }
  }

  async function handleSetRole(u: AdminUser, role: "user" | "admin") {
    try {
      const updated = await adminUpdateUser(u.id, { role });
      setUsers(us => us.map(x => x.id === u.id ? { ...x, role: updated.role } : x));
      if (selectedUser?.id === u.id) setSelectedUser(s => s ? { ...s, role: updated.role } : s);
      showNotification(role === "admin" ? "Роль изменена на Администратор" : "Роль изменена на Пользователь", "success");
    } catch { showNotification("Ошибка изменения роли", "error"); }
  }

  async function handleSetPassword() {
    if (!showPwd || newPwd.length < 8) { showNotification("Минимум 8 символов", "error"); return; }
    try {
      await adminSetUserPassword(showPwd, newPwd);
      showNotification("Пароль изменён", "success");
      setShowPwd(null);
      setNewPwd("");
    } catch (e: any) {
      showNotification(e?.response?.data?.error || "Ошибка", "error");
    }
  }

  async function openUser(id: number) {
    try {
      const detail = await adminGetUser(id);
      setSelectedUser(detail);
    } catch { showNotification("Ошибка загрузки", "error"); }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Список */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Пользователи ({users.length})</CardTitle>
              <Button size="sm" onClick={() => setShowCreate(true)}>+ Создать</Button>
            </div>
            <Input
              placeholder="Поиск по email или имени..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="mt-2"
            />
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-center text-gray-400 py-8">Загрузка...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Email</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Имя</th>
                      <th className="text-left px-3 py-2 font-medium text-gray-600">Сайты</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-600">Подборов</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-600">Проектов</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-600">Активен</th>
                      <th className="text-center px-3 py-2 font-medium text-gray-600">Роль</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map(u => (
                      <tr
                        key={u.id}
                        className={`hover:bg-gray-50 cursor-pointer ${selectedUser?.id === u.id ? "bg-blue-50" : ""}`}
                        onClick={() => openUser(u.id)}
                      >
                        <td className="px-4 py-2.5 font-medium text-gray-800 truncate max-w-[180px]">{u.email}</td>
                        <td className="px-4 py-2.5 text-gray-600">{`${u.first_name} ${u.last_name}`.trim() || "—"}</td>
                        <td className="px-3 py-2.5 text-gray-600">
                          {u.sites_visited && u.sites_visited.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {u.sites_visited.map(s => (
                                <span
                                  key={s.slug}
                                  className="inline-block text-[11px] leading-4 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100"
                                  title={`Последний раз: ${new Date(s.last_seen).toLocaleString()} · посещений: ${s.visit_count}`}
                                >
                                  {s.name || s.slug}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-600">{u.selections_count}</td>
                        <td className="px-3 py-2.5 text-center text-gray-600">{u.projects_count}</td>
                        <td className="px-3 py-2.5 text-center" onClick={e => { e.stopPropagation(); handleToggleActive(u); }}>
                          <span className={`inline-block w-2 h-2 rounded-full ${u.is_active ? "bg-green-500" : "bg-gray-300"}`} title={u.is_active ? "Активен" : "Заблокирован"} />
                        </td>
                        <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                          <select
                            value={u.role}
                            onChange={e => handleSetRole(u, e.target.value as "user" | "admin")}
                            className={`text-xs rounded px-1.5 py-0.5 border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-400 ${
                              u.role === "admin"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            <option value="user">Пользователь</option>
                            <option value="admin">Администратор</option>
                          </select>
                        </td>
                        <td className="px-3 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => { setShowPwd(u.id); setNewPwd(""); }}
                              className="inline-flex items-center justify-center p-1 rounded text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                              title="Сменить пароль"
                              aria-label="Сменить пароль"
                            >
                              <KeyRound className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(u.id)}
                              className="inline-flex items-center justify-center p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50"
                              title="Удалить"
                              aria-label="Удалить"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={8} className="text-center text-gray-400 py-8">Нет пользователей</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Детали выбранного пользователя */}
      <div>
        {selectedUser ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold truncate">{selectedUser.email}</CardTitle>
              <p className="text-xs text-gray-400">
                {`${selectedUser.first_name} ${selectedUser.last_name}`.trim() || "Имя не указано"} ·
                Зарегистрирован {new Date(selectedUser.date_joined).toLocaleDateString("ru-RU")}
              </p>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="font-medium text-gray-700 mb-1">
                  Посещённые сайты ({selectedUser.sites_visited?.length || 0})
                </p>
                {!selectedUser.sites_visited || selectedUser.sites_visited.length === 0 ? (
                  <p className="text-gray-400 text-xs">Нет посещений</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {selectedUser.sites_visited.map(s => (
                      <div key={s.slug} className="text-xs bg-gray-50 rounded px-2 py-1 flex items-center justify-between">
                        <span>
                          <span className="font-medium">{s.name || s.slug}</span>
                          <span className="text-gray-400 ml-1">/{s.slug}</span>
                        </span>
                        <span className="text-gray-400">
                          {new Date(s.last_seen).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}
                          {" · "}
                          {s.visit_count}×
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-1">История подборов ({selectedUser.selections.length})</p>
                {selectedUser.selections.length === 0 ? (
                  <p className="text-gray-400 text-xs">Нет подборов</p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {selectedUser.selections.map(s => (
                      <div key={s.id} className="text-xs bg-gray-50 rounded px-2 py-1">
                        <span className="font-medium">{s.pump_name || "—"}</span>
                        <span className="text-gray-400 ml-1">{s.Q} м³/ч · {s.H} м</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-1">Проекты ({selectedUser.projects.length})</p>
                {selectedUser.projects.length === 0 ? (
                  <p className="text-gray-400 text-xs">Нет проектов</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {selectedUser.projects.map(p => (
                      <div key={p.id} className="text-xs bg-gray-50 rounded px-2 py-1">
                        <span className="font-medium">{p.name}</span>
                        {p.site_slug && (
                          <span className="text-gray-400 ml-1 font-mono">{p.site_slug}</span>
                        )}
                        {p.address && <span className="text-gray-400 ml-1">· {p.address}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-gray-400 text-sm">
              Выберите пользователя для просмотра деталей
            </CardContent>
          </Card>
        )}
      </div>

      {/* Модалка создания */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Новый пользователь</h3>
            <div className="space-y-3">
              {(["email","password","first_name","last_name"] as const).map(k => (
                <div key={k}>
                  <Label className="text-xs text-gray-500">{k === "email" ? "Email" : k === "password" ? "Пароль" : k === "first_name" ? "Имя" : "Фамилия"}</Label>
                  <Input
                    type={k === "password" ? "password" : "text"}
                    value={createForm[k]}
                    onChange={e => setCreateForm(f => ({ ...f, [k]: e.target.value }))}
                    className="mt-0.5"
                  />
                </div>
              ))}
              <div>
                <Label className="text-xs text-gray-500">Роль</Label>
                <select
                  value={createForm.role}
                  onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as "user" | "admin" }))}
                  className="mt-0.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="user">Пользователь</option>
                  <option value="admin">Администратор</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreate(false)}>Отмена</Button>
              <Button className="flex-1" onClick={handleCreate}>Создать</Button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка смены пароля */}
      {showPwd !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xs p-6">
            <h3 className="text-base font-semibold mb-3">Смена пароля</h3>
            <Input
              type="password"
              placeholder="Новый пароль (мин. 8 символов)"
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
            />
            <div className="flex gap-2 mt-3">
              <Button variant="outline" className="flex-1" onClick={() => { setShowPwd(null); setNewPwd(""); }}>Отмена</Button>
              <Button className="flex-1" onClick={handleSetPassword}>Сохранить</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AppAdmin;
