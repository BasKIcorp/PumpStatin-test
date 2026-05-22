import React, { useEffect, useId, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { Separator } from "@/components/ui/separator";
import { fetchFormConfig } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  FUNNEL_INPUT_CLASS,
  FUNNEL_SELECT_CONTENT_CLASS,
  FUNNEL_SELECT_ITEM_CLASS,
  FUNNEL_SELECT_TRIGGER_CLASS,
} from "@/lib/funnelWorkUi";

// ----------------------------------
// 🔧 STATIC FALLBACKS (используются до загрузки из API / при ошибке)
// ----------------------------------
const FALLBACK_BUFFER_TANK_SIZES = ["100", "200", "300", "500", "750", "1000", "1500", "2000", "3000", "5000"];
const FALLBACK_EXPANSION_TANK_SIZES = ["12", "18", "24", "50", "80", "100", "150", "200", "300", "500"];
const FALLBACK_PUMP_PRESSURE = Array.from({ length: 14 }, (_, i) => (i + 1).toString());
const FALLBACK_TANK_VOLUME = ["300", "500", "800", "1000", "1500"];

/** Единый стиль с PumpSearchForm / блоками подбора */
const selectTriggerSimpel = FUNNEL_SELECT_TRIGGER_CLASS;
const selectTriggerSimpelMt = cn("mt-1", FUNNEL_SELECT_TRIGGER_CLASS);
const readonlyBoxSimpel =
  "rounded-md border-0 bg-[var(--funnel-input-bg)] px-2 py-1.5 text-xs text-[var(--funnel-text-muted)] sm:text-sm";

// ----------------------------------
// 🛂 VALIDATION
// ----------------------------------
const formSchema = z.object({
  station_type: z.string(),
  PN: z.string(),
  management: z.string(),
  фильтр: z.string(),
  кожух: z.string(),
  предохранительный_клапан: z.string().optional(),
  подключение: z.string(),
  виброопоры: z.string().optional(),
  буферный_бак: z.string(),
  буферный_бак_материал: z.string().optional(),
  расширительный_бак: z.string(),
  расширительный_бак_значение: z.string().optional(),
  материал_коллектора: z.string(),
  добавлять_изоляцию: z.string().optional(),
  модуль_подпитки: z.string().optional(),
  модуль_подпитки_тип: z.string().optional(),
  // ➕ NEW FIELDS
  модуль_подпитки_давление: z.string().optional(), // Давление насоса (бар)
  модуль_подпитки_объем: z.string().optional(), // Объем бака (л)
})
  .superRefine((data, ctx) => {
    if (data.модуль_подпитки !== "отсутствует") {
      const t = (data.модуль_подпитки_тип ?? "").trim();
      if (!t) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Выберите тип модуля подпитки",
          path: ["модуль_подпитки_тип"],
        });
      } else if (t === "Подпиточный насос и бак" || t === "Подпиточный насос") {
        const p = (data.модуль_подпитки_давление ?? "").trim();
        if (!p) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Укажите давление насоса подпитки",
            path: ["модуль_подпитки_давление"],
          });
        }
      }
      if (t === "Подпиточный насос и бак") {
        const vol = (data.модуль_подпитки_объем ?? "").trim();
        if (!vol) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Укажите объём бака подпитки",
            path: ["модуль_подпитки_объем"],
          });
        }
      }
    }
  });

export type StationConfigFormValues = z.infer<typeof formSchema>;

// ----------------------------------
// PROPS
// ----------------------------------
interface StationConfigFormProps {
  onSubmit: (values: StationConfigFormValues & { Q: number; H: number; chosen_id: number }) => void;
  isLoading: boolean;
  selectedPumpId: number | null;
  Q: number;
  H: number;
  /** Если задан — тип станции фиксирован маршрутом, поле «Тип станции» скрыто */
  lockedStationType?: string | null;
  /** Заголовок блока (макет гидромодуля) */
  sectionTitle?: string;
  /** Классы корневого контейнера (например min-h-0 flex-1 для заполнения панели на десктопе) */
  className?: string;
}

// ----------------------------------
// COMPONENT
// ----------------------------------
const StationConfigForm: React.FC<StationConfigFormProps> = ({
  onSubmit,
  isLoading,
  selectedPumpId,
  Q,
  H,
  lockedStationType = null,
  sectionTitle = "Конфигурация станции",
  className,
}) => {
  const formDomId = useId();
  const { showNotification } = useToastNotification();

  const { data: formConfig } = useQuery({
    queryKey: ["form-config"],
    queryFn: fetchFormConfig,
    staleTime: 5 * 60 * 1000,
  });

  const stationTypes = formConfig?.station_types ?? [];
  const bufferTankSizes = formConfig?.options?.buffer_tank_size?.map(o => o.value) ?? FALLBACK_BUFFER_TANK_SIZES;
  const expansionTankSizes = formConfig?.options?.expansion_tank_size?.map(o => o.value) ?? FALLBACK_EXPANSION_TANK_SIZES;
  const pumpPressureOptions = formConfig?.options?.pump_pressure?.map(o => o.value) ?? FALLBACK_PUMP_PRESSURE;
  const tankVolumeOptions = formConfig?.options?.tank_volume?.map(o => o.value) ?? FALLBACK_TANK_VOLUME;
  const getPNNumber = (pn: string) => {
  const n = Number(pn.replace("PN", ""));
  return isNaN(n) ? 0 : n;
};
  // ------------------------------
  // Default values
  // ------------------------------
  const defaultValues: StationConfigFormValues = {
    station_type: "гм",
    PN: "PN10",
    management: "частотное по перепаду давления",
    фильтр: "отсутствует",
    кожух: "отсутствует",
    предохранительный_клапан: "",
    подключение: "фланец",
    виброопоры: "",
    буферный_бак: "отсутствует",
    буферный_бак_материал: "AISI304",
    расширительный_бак: "отсутствует",
    расширительный_бак_значение: "",
    материал_коллектора: "AISI304",
    добавлять_изоляцию: "true",
    модуль_подпитки: "отсутствует",
    модуль_подпитки_тип: "",
    // ➕ NEW DEFAULTS
    модуль_подпитки_давление: "",
    модуль_подпитки_объем: "",
  };

  // ------------------------------
  // React-Hook-Form
  // ------------------------------
  const form = useForm<StationConfigFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: lockedStationType
      ? { ...defaultValues, station_type: lockedStationType }
      : defaultValues,
  });

  useEffect(() => {
    if (lockedStationType) {
      form.setValue("station_type", lockedStationType);
    }
  }, [lockedStationType, form]);

  // ------------------------------
  // Watches
  // ------------------------------
  const stationType = form.watch("station_type");
  const PN = form.watch("PN");
  const hasBufferTank = form.watch("буферный_бак") !== "отсутствует";
  const hasExpansionTank = form.watch("расширительный_бак") !== "отсутствует";
  const hasModulePodpitki = form.watch("модуль_подпитки") !== "отсутствует";
  const modulePodpitkiType = form.watch("модуль_подпитки_тип");
  useEffect(() => {
  if (stationType !== "гм") {
    form.setValue("модуль_подпитки", "отсутствует");
    form.setValue("модуль_подпитки_тип", "");
    form.setValue("модуль_подпитки_давление", "");
    form.setValue("модуль_подпитки_объем", "");
  }
}, [stationType, form]);
  // ------------------------------
  // Effects – station type rules
  // ------------------------------
  const currentStationType = stationTypes.find(st => st.code === stationType);
  const managementOptions: string[] = currentStationType?.management_options ?? [];

  useEffect(() => {
    if (!currentStationType) return;

    // Фикс для хоз-пит: кожух и материал коллектора
    if (stationType === "хоз-пит") {
      form.setValue("кожух", "отсутствует");
      form.setValue("материал_коллектора", "AISI304");
    }

    // Выбрать первую опцию управления, если текущая невалидна
    const current = form.getValues("management");
    const opts = currentStationType.management_options;
    if (opts.length > 0 && !opts.includes(current)) {
      form.setValue("management", opts[0]);
    }

    // Isolation auto-toggle для гм
    if (stationType === "гм") {
      form.setValue("добавлять_изоляцию", "true");
    }
  }, [stationType, currentStationType, form]);

  // Buffer tank rule for PN16
  useEffect(() => {
    if (stationType === "гм" && PN === "PN16") {
      form.setValue("буферный_бак", "отсутствует");
    }

    // Isolation rule again (if station ≠ гм, allow user to switch off)
    if (stationType !== "гм" && form.getValues("добавлять_изоляцию") === "true") {
      form.setValue("добавлять_изоляцию", "false");
    }
  }, [stationType, PN, form]);

  // 🆕 Сброс полей модуля подпитки, когда его отключили или сменили тип
  useEffect(() => {
    if (!hasModulePodpitki) {
      form.setValue("модуль_подпитки_тип", "");
      form.setValue("модуль_подпитки_давление", "");
      form.setValue("модуль_подпитки_объем", "");
    } else {
      if (modulePodpitkiType === "Подпиточный насос") {
        form.setValue("модуль_подпитки_объем", "");
      }
      if (
        modulePodpitkiType !== "Подпиточный насос" &&
        modulePodpitkiType !== "Подпиточный насос и бак"
      ) {
        form.setValue("модуль_подпитки_давление", "");
        form.setValue("модуль_подпитки_объем", "");
      }
    }
  }, [hasModulePodpitki, modulePodpitkiType, form]);

  // ------------------------------
  // Submit
  // ------------------------------
  const preprocessFormValues = (values: StationConfigFormValues) => {
    const v = { ...values };
    // Nothing special пока; backend сам поймёт пустые строки
    return v;
  };

  // ------------------------------
// Submit
// ------------------------------
const handleSubmit = (values: StationConfigFormValues) => {
  if (!selectedPumpId) {
    showNotification("Сначала выберите насос", "error");
    return;
  }

  // ✅ 1. Проверка PN и H (только для PN6)
  const pnNumeric = getPNNumber(PN); // 6 / 10 / 16
  if ((H >= 10 * pnNumeric)) {
    showNotification("Слишком маленькое рабочее давление для выбранного значения напора", "error");
    return;
  }

  // ✅ 2. Проверка предохранительного клапана
  if (values.предохранительный_клапан && values.предохранительный_клапан !== "") {
    const valvePressure = parseFloat(values.предохранительный_клапан);
    if (!isNaN(valvePressure) && valvePressure >= pnNumeric) {
      showNotification("Давление предохранительного клапана должно быть больше рабочего давления системы", "error");
      return;
    }
  }

  try {
    const processedValues = preprocessFormValues(values);
    onSubmit({ ...processedValues, Q, H, chosen_id: selectedPumpId });
  } catch (err: any) {
    let msg = "Ошибка отправки формы";
    if (err?.message) msg = err.message;
    else if (typeof err === "string") msg = err;
    showNotification(msg, "error");
  }
};

  // Расчёт без кнопки: при смене насоса или Q/H с формы подбора (без form.watch — иначе setValue из эффектов → цикл submit и мигание тостов)
  useEffect(() => {
    if (selectedPumpId == null) return;
    const t = window.setTimeout(() => {
      void form.handleSubmit(handleSubmit)();
    }, 400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- намеренно без полей формы станции; PN/опции — смените выбор насоса в таблице для пересчёта
  }, [selectedPumpId, Q, H]);

  // ----------------------------------
  // RENDER
  // ----------------------------------
  return (
    <div className={cn("flex min-h-0 flex-col lg:h-full lg:max-h-full", className)}>
      <div className="shrink-0 border-b border-zinc-200 bg-zinc-50/90 px-3 py-2">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-800">{sectionTitle}</h2>
        {isLoading ? (
          <p className="mt-1 text-xs text-muted-foreground">Формирование конфигурации…</p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <Form {...form}>
        <form id={formDomId} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 p-2 sm:p-2.5">
          {/* ------------------------------ */}
          {/* Основные поля: тип, PN, управление */}
          {/* ------------------------------ */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {/* Тип станции */}
            {!lockedStationType && (
            <FormField
              control={form.control}
              name="station_type"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs text-muted-foreground">Тип станции</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className={selectTriggerSimpel}>
                        <SelectValue placeholder="Выберите тип станции" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FUNNEL_SELECT_CONTENT_CLASS}>
                      {stationTypes.map(st => (
                        <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} key={st.code} value={st.code}>{st.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            )}

            {/* PN */}
            <FormField
              control={form.control}
              name="PN"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs text-muted-foreground">PN</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className={selectTriggerSimpel}>
                        <SelectValue placeholder="Выберите PN" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FUNNEL_SELECT_CONTENT_CLASS}>
                      <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} value="PN6">PN6</SelectItem>
                      <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} value="PN10">PN10</SelectItem>
                      <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} value="PN16">PN16</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Управление */}
            <FormField
              control={form.control}
              name="management"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs text-muted-foreground">Управление</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className={selectTriggerSimpel}>
                        <SelectValue placeholder="Выберите тип управления" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FUNNEL_SELECT_CONTENT_CLASS}>
                      {managementOptions.map(opt => (
                        <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
          </div>

          <Separator className="h-px bg-black/10" />

          {/* ------------------------------ */}
          {/* Фильтр / кожух / подключение / материал */}
          {/* ------------------------------ */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {/* Фильтр */}
            <FormField
              control={form.control}
              name="фильтр"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs text-muted-foreground">Фильтр</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className={selectTriggerSimpel}>
                        <SelectValue placeholder="Выберите тип фильтра" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FUNNEL_SELECT_CONTENT_CLASS}>
                      <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} value="на коллектор">на коллектор</SelectItem>
                      <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} value="на каждый насос">на каждый насос</SelectItem>
                      <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} value="отсутствует">отсутствует</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Кожух */}
            <FormField
              control={form.control}
              name="кожух"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs text-muted-foreground">Кожух</FormLabel>
                  {stationType === "хоз-пит" ? (
                    <div className={readonlyBoxSimpel}>отсутствует</div>
                  ) : (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className={selectTriggerSimpel}>
                          <SelectValue placeholder="Выберите тип кожуха" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className={FUNNEL_SELECT_CONTENT_CLASS}>
                        <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} value="с обогревом">с обогревом</SelectItem>
                        <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} value="без обогрева">без обогрева</SelectItem>
                        <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} value="отсутствует">отсутствует</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </FormItem>
              )}
            />

            {/* Подключение */}
            <FormField
              control={form.control}
              name="подключение"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs text-muted-foreground">Подключение</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className={selectTriggerSimpel}>
                        <SelectValue placeholder="Выберите тип подключения" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className={FUNNEL_SELECT_CONTENT_CLASS}>
                      <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} value="виброкомпенсатор">виброкомпенсатор</SelectItem>
                      <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} value="фланец">фланец</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {/* Материал коллектора */}
            <FormField
              control={form.control}
              name="материал_коллектора"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel className="text-xs text-muted-foreground">Материал коллектора</FormLabel>
                  {stationType === "хоз-пит" ? (
                    <div className={readonlyBoxSimpel}>AISI304</div>
                  ) : (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className={selectTriggerSimpel}>
                          <SelectValue placeholder="Выберите материал" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className={FUNNEL_SELECT_CONTENT_CLASS}>
                        <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} value="сталь20">сталь20</SelectItem>
                        <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} value="AISI304">AISI304</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </FormItem>
              )}
            />
          </div>

          {/* ------------------------------ */}
          {/* Чекбоксы – клапан, виброопоры, изоляция */}
          {/* ------------------------------ */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
            {/* Предохранительный клапан */}
            <div>
              <FormField
                control={form.control}
                name="предохранительный_клапан"
                render={({ field }) => (
                  <FormItem className="h-full">
                    <div className="flex flex-row items-center space-x-2 mb-1.5">
                      <FormControl>
                        <Checkbox
                          checked={!!field.value}
                          onCheckedChange={(checked) => field.onChange(checked ? "0.5" : "")}
                        />
                      </FormControl>
                      <FormLabel className="text-sm text-muted-foreground font-normal">Предохранительный клапан</FormLabel>
                    </div>

                    <div className="flex items-center justify-start mt-1 h-8">
                      {!!field.value ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 shrink-0 rounded-none border-black/60 p-0 text-black hover:bg-gray-50"
                            onClick={() => {
                              const val = parseFloat(field.value || "0.5");
                              if (val >= 1.0) field.onChange((val - 0.5).toFixed(1));
                            }}
                          >
                            -
                          </Button>
                          <Input
                            type="text"
                            className={cn("mx-1 h-8 w-14 text-center text-sm", FUNNEL_INPUT_CLASS)}
                            value={field.value}
                            readOnly
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 shrink-0 rounded-none border-black/60 p-0 text-black hover:bg-gray-50"
                            onClick={() => {
                              const val = parseFloat(field.value || "0.5");
                              field.onChange((val + 0.5).toFixed(1));
                            }}
                          >
                            +
                          </Button>
                        </>
                      ) : (
                        <div className="h-8">&nbsp;</div>
                      )}
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Виброопоры */}
            <div>
              <FormField
                control={form.control}
                name="виброопоры"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-row items-center space-x-2 mb-1.5">
                      <FormControl>
                        <Checkbox
                          checked={field.value === "true"}
                          onCheckedChange={(c) => field.onChange(c ? "true" : "false")}
                        />
                      </FormControl>
                      <FormLabel className="text-sm text-muted-foreground font-normal">Виброопоры</FormLabel>
                    </div>
                    <div className="h-8">&nbsp;</div>
                  </FormItem>
                )}
              />
            </div>

            {/* Изоляция */}
            <div>
              <FormField
                control={form.control}
                name="добавлять_изоляцию"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-row items-center space-x-2 mb-1.5">
                      <FormControl>
                        <Checkbox
                          checked={field.value === "true"}
                          disabled={stationType === "гм"}
                          onCheckedChange={(c) => field.onChange(c ? "true" : "false")}
                        />
                      </FormControl>
                      <FormLabel className="text-sm text-muted-foreground font-normal">Изоляция</FormLabel>
                    </div>
                    <div className="h-8">&nbsp;</div>
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* ------------------------------ */}
          {/* Баки + Модуль подпитки */}
          {/* ------------------------------ */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
            {/* Буферный бак (только для гм и PN≠16) */}
            {stationType === "гм" && PN !== "PN16" && (
              <div>
                <FormField
                  control={form.control}
                  name="буферный_бак"
                  render={({ field }) => (
                    <FormItem>
                      {/* Checkbox */}
                      <div className="flex flex-row items-center space-x-2 mb-1.5">
                        <FormControl>
                          <Checkbox
                            checked={field.value !== "отсутствует"}
                            onCheckedChange={(checked) => field.onChange(checked ? "200" : "отсутствует")}
                          />
                        </FormControl>
                        <FormLabel className="text-sm text-muted-foreground font-normal">Буферный бак</FormLabel>
                      </div>

                      {/* Dropdowns */}
                      <div className="space-y-2 pl-6">
                        {field.value !== "отсутствует" && (
                          <>
                            {/* Объем */}
                            <div>
                              <FormLabel className="text-xs text-muted-foreground">Объем</FormLabel>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                  <SelectTrigger className={selectTriggerSimpelMt}>
                                    <SelectValue placeholder="Объем" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className={FUNNEL_SELECT_CONTENT_CLASS}>
                                  {bufferTankSizes.map((size) => (
                                    <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} key={size} value={size}>{size} л</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Материал */}
                            <FormField
                              control={form.control}
                              name="буферный_бак_материал"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs text-muted-foreground">Материал</FormLabel>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger className={selectTriggerSimpelMt}>
                                        <SelectValue placeholder="Материал" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className={FUNNEL_SELECT_CONTENT_CLASS}>
                                      <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} value="сталь20">сталь20</SelectItem>
                                      <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} value="AISI304">AISI304</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </>
                        )}
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Расширительный бак */}
            <div>
              <FormField
                control={form.control}
                name="расширительный_бак"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex flex-row items-center space-x-2 mb-1.5">
                      <FormControl>
                        <Checkbox
                          checked={field.value !== "отсутствует"}
                          onCheckedChange={(checked) => field.onChange(checked ? "24" : "отсутствует")}
                        />
                      </FormControl>
                      <FormLabel className="text-sm text-muted-foreground font-normal">Расширительный бак</FormLabel>
                    </div>

                    {/* Объем */}
                    <div className="pl-6">
                      {field.value !== "отсутствует" && (
                        <>
                          <FormLabel className="text-xs text-muted-foreground">Объем</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger className={selectTriggerSimpelMt}>
                                <SelectValue placeholder="Объем" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className={FUNNEL_SELECT_CONTENT_CLASS}>
                              {expansionTankSizes.map((size) => (
                                <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} key={size} value={size}>{size} л</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      )}
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Модуль подпитки */}
            {stationType === "гм" && (
              <div>
                <FormField
                  control={form.control}
                  name="модуль_подпитки"
                  render={({ field }) => (
                    <FormItem>
                      {/* Checkbox */}
                      <div className="flex flex-row items-center space-x-2 mb-1.5">
                        <FormControl>
                          <Checkbox
                            checked={field.value !== "отсутствует"}
                            onCheckedChange={(checked) => {
                              field.onChange(checked ? "true" : "отсутствует");
                              if (!checked) {
                                form.setValue("модуль_подпитки_тип", "");
                                form.setValue("модуль_подпитки_давление", "");
                                form.setValue("модуль_подпитки_объем", "");
                              }
                            }}
                          />
                        </FormControl>
                        <FormLabel className="text-sm text-muted-foreground font-normal">Модуль подпитки</FormLabel>
                      </div>

                      {/* ------------------------------ */}
                      {/* Вложенные dropdowns */}
                      {/* ------------------------------ */}
                      <div className="pl-6 space-y-2">
                        {/* Тип модуля */}
                        {field.value !== "отсутствует" && (
                          <FormField
                            control={form.control}
                            name="модуль_подпитки_тип"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Тип модуля</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger className={selectTriggerSimpelMt}>
                                      <SelectValue placeholder="Тип" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className={FUNNEL_SELECT_CONTENT_CLASS}>
                                    <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} value="Подпиточный клапан">Подпиточный клапан</SelectItem>
                                    <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} value="Подпиточный насос">Подпиточный насос</SelectItem>
                                    <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} value="Подпиточный насос и бак">Подпиточный насос и бак</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}

                        {/* Давление насоса (бар) */}
                        {field.value !== "отсутствует" && (
                          modulePodpitkiType === "Подпиточный насос" || modulePodpitkiType === "Подпиточный насос и бак" ? (
                            <FormField
                              control={form.control}
                              name="модуль_подпитки_давление"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-xs text-muted-foreground">Давление насоса (бар)</FormLabel>
                                  <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                      <SelectTrigger className={selectTriggerSimpelMt}>
                                        <SelectValue placeholder="давление" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className={FUNNEL_SELECT_CONTENT_CLASS}>
                                      {pumpPressureOptions.map((p) => (
                                        <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} key={p} value={p}>{p}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : null
                        )}

                        {/* Объем бака (л) */}
                        {field.value !== "отсутствует" && modulePodpitkiType === "Подпиточный насос и бак" && (
                          <FormField
                            control={form.control}
                            name="модуль_подпитки_объем"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">Объем бака (л)</FormLabel>
                                <Select value={field.value} onValueChange={field.onChange}>
                                  <FormControl>
                                    <SelectTrigger className={selectTriggerSimpelMt}>
                                      <SelectValue placeholder="объем" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className={FUNNEL_SELECT_CONTENT_CLASS}>
                                    {tankVolumeOptions.map((v) => (
                                      <SelectItem className={FUNNEL_SELECT_ITEM_CLASS} key={v} value={v}>{v}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        </form>
      </Form>
      </div>

      <div className="shrink-0 border-t border-zinc-200 bg-[var(--funnel-surface)] px-2 pb-2 pt-3 sm:px-2.5">
        <Button
          type="submit"
          form={formDomId}
          disabled={isLoading || selectedPumpId == null}
          title={selectedPumpId == null ? "Сначала выберите насос в таблице подбора" : undefined}
          className="h-9 w-full rounded-lg border-0 text-sm font-medium shadow-sm selection-work-btn-primary hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Формирование…" : "Сформировать станцию"}
        </Button>
      </div>
    </div>
  );
};

export default StationConfigForm;
