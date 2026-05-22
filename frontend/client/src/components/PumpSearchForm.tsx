import React, { useImperativeHandle, forwardRef, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToastNotification } from "@/hooks/use-toast-notification";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FUNNEL_INPUT_CLASS,
  FUNNEL_SELECT_CONTENT_CLASS,
  FUNNEL_SELECT_ITEM_CLASS,
  FUNNEL_SELECT_TRIGGER_CLASS,
} from "@/lib/funnelWorkUi";

const formSchema = z.object({
  Q: z.coerce
    .number()
    .positive("Расход должен быть положительным числом")
    .min(0.1, "Минимальное значение 0.1"),
  H: z.coerce
    .number()
    .positive("Напор должен быть положительным числом")
    .min(0.1, "Минимальное значение 0.1"),
  H_stat: z.coerce
    .number()
    .positive()
    .min(0.1, "Минимальное значение 0.1"),
  H_garant: z.coerce
    .number()
    .positive()
    .min(0.1, "Минимальное значение 0.1"),
  n1: z.coerce
    .number()
    .int("Должно быть целым числом")
    .min(1, "Минимум 1 рабочий насос"),
  n2: z.coerce
    .number()
    .int("Должно быть целым числом")
    .min(0, "Не может быть отрицательным"),
  T: z.coerce.number().int("Должно быть целым числом"),
  pump_type: z.array(z.string()).nonempty("Выберите хотя бы один тип насоса"),
  medium_type: z.string(),
  concentration: z.string().optional(),
  external_vfd: z.string().optional(),
})
  .superRefine((data, ctx) => {
    if (data.n1 + data.n2 >= 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Нестандартное исполнение: выберите не более трёх насосов суммарно или обратитесь к специалистам",
        path: ["n2"],
      });
    }
    if (data.T < 0 || data.T > 70) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Нестандартное исполнение: укажите температуру от 0 до 70 °C или обратитесь к специалистам",
        path: ["T"],
      });
    }
  });

export type PumpSearchFormValues = z.infer<typeof formSchema>;

export type PumpOperatingPointDisplay = {
  Q: number | null;
  H: number | null;
  p2Kw: number | null;
  npshM: number | null;
  etaPct: number | null;
};

export const PUMP_SEARCH_FORM_DESKTOP_ID = "pump-search-form-desktop";

export type PumpSearchFormHandle = {
  resetForm: () => void;
};

interface PumpSearchFormProps {
  onSubmit: (values: PumpSearchFormValues) => void;
  isLoading: boolean;
  defaultValues?: PumpSearchFormValues;
  selectedPumpType?: string | null;
  operatingPoint?: PumpOperatingPointDisplay | null;
  onReset?: () => void;
  /** Десктоп Simpel: правая колонка формы — кривые (общая сетка с формой) */
  graphsSlot?: React.ReactNode;
  /** Скрыть строку «Производитель» (до справочника в БД) */
  hideManufacturer?: boolean;
  /** Ветка ГМ/НУ: выбор серии насоса на экране параметров */
  editablePumpSeries?: boolean;
  /** Высота как у родителя: поля с прокруткой, кнопки снизу (десктоп рядом с графиками) */
  stretchToFill?: boolean;
  /** На lg кнопки снаружи формы (под блоком конфигурации) */
  desktopActionsOutside?: boolean;
  /** Уникальный id формы (на странице несколько брейкпоинтов — разные id) */
  formDomId?: string;
}

function fmt(v: number | null) {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const panel = "bg-[var(--funnel-surface)] p-2 space-y-2";
const panelMergedInner =
  "bg-[var(--funnel-surface)] p-2 space-y-2 lg:shadow-none lg:bg-transparent lg:p-0";
const sectionTitle =
  "pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--funnel-text-muted)]";

/** Микровзаимодействие полей ввода на панели параметров */
const PARAM_FIELD_TRANSITION =
  "transition-[border-color,box-shadow] duration-150 ease-out hover:border-zinc-500/65 focus-visible:border-[var(--funnel-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--funnel-primary)]/30 focus-visible:ring-offset-1";

const PARAM_SELECT_TRIGGER_CLASS = cn(FUNNEL_SELECT_TRIGGER_CLASS);

const FORM_MSG_MOTION = "animate-in fade-in-0 slide-in-from-top-0.5 duration-200";

/** Блок только для чтения: фон и тонкая рамка */
const OPERATING_READOUT_BOX =
  "rounded-md bg-[var(--funnel-input-bg)] px-1.5 py-1.5 ring-1 ring-inset ring-[color-mix(in_srgb,var(--funnel-text-muted)_25%,transparent)]";

const DEFAULT_FORM_VALUES: PumpSearchFormValues = {
  Q: 15,
  H: 20,
  H_stat: 20,
  H_garant: 20,
  n1: 1,
  n2: 1,
  T: 1,
  pump_type: ["CIVOS", "COMOS", "VMIP", "HMIP"],
  medium_type: "вода",
  concentration: "",
  external_vfd: "",
};

const PumpSearchForm = forwardRef<PumpSearchFormHandle, PumpSearchFormProps>(function PumpSearchForm(
  {
    onSubmit,
    isLoading,
    defaultValues: defaultValuesProp,
    selectedPumpType,
    operatingPoint,
    onReset,
    graphsSlot,
    hideManufacturer = false,
    editablePumpSeries = false,
    stretchToFill = false,
    desktopActionsOutside = false,
    formDomId = "pump-search-form",
  },
  ref,
) {
  const defaultValues = defaultValuesProp ?? DEFAULT_FORM_VALUES;
  const { showNotification } = useToastNotification();

  const form = useForm<PumpSearchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const reducedMotion = useReducedMotion();
  const sectionMotion = useMemo(
    () => ({
      container: reducedMotion
        ? { hidden: {}, show: {} }
        : {
            hidden: {},
            show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
          },
      item: reducedMotion
        ? { hidden: {}, show: {} }
        : {
            hidden: { opacity: 0.92, y: 4 },
            show: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
            },
          },
    }),
    [reducedMotion],
  );

  const mediumType = form.watch("medium_type");

  React.useEffect(() => {
    if (mediumType === "вода") {
      form.setValue("concentration", "");
    }
  }, [mediumType, form]);

  React.useEffect(() => {
    form.reset(defaultValues);
    if (selectedPumpType) {
      form.setValue("pump_type", [selectedPumpType] as [string, ...string[]]);
    }
  }, [defaultValues, selectedPumpType, form]);

  const handleSubmit = (values: PumpSearchFormValues) => {
    try {
      onSubmit(values);
    } catch {
      showNotification("Ошибка при отправке формы", "error");
    }
  };

  const handleReset = () => {
    form.reset(defaultValues);
    if (selectedPumpType) {
      form.setValue("pump_type", [selectedPumpType] as [string, ...string[]]);
    }
    onReset?.();
  };

  useImperativeHandle(
    ref,
    () => ({
      resetForm: () => {
        form.reset(defaultValues);
        if (selectedPumpType) {
          form.setValue("pump_type", [selectedPumpType] as [string, ...string[]]);
        }
        onReset?.();
      },
    }),
    [form, defaultValues, selectedPumpType, onReset],
  );

  const typePanel = (
    <div className={panel}>
      <h3 className={sectionTitle}>Используемые насосы</h3>
      <div
        className={cn(
          "gap-2",
          !hideManufacturer
            ? "grid grid-cols-1 sm:grid-cols-2 sm:grid-rows-[auto_auto] sm:gap-x-2 sm:gap-y-1"
            : "space-y-1.5",
        )}
      >
        {!hideManufacturer && (
          <div className="max-sm:space-y-1 sm:contents">
            <label className="block text-xs text-muted-foreground max-sm:mb-0.5 sm:col-start-1 sm:row-start-1 sm:self-end sm:pb-0.5 sm:leading-snug">
              Производитель
            </label>
            <div className="rounded-md border-0 bg-[var(--funnel-input-bg)] px-2 py-1.5 text-xs text-[var(--funnel-text)] sm:col-start-1 sm:row-start-2 sm:text-sm">
              ГК «Стрела»
            </div>
          </div>
        )}
        {editablePumpSeries ? (
          <FormField
            control={form.control}
            name="pump_type"
            render={({ field }) => {
              const cur = Array.isArray(field.value) && field.value[0] ? field.value[0] : "CIVOS";
              return (
                <FormItem
                  className={cn(
                    "space-y-1",
                    !hideManufacturer && "sm:contents sm:space-y-0",
                  )}
                >
                  <FormLabel
                    className={cn(
                      "text-xs text-muted-foreground",
                      !hideManufacturer && "sm:col-start-2 sm:row-start-1 sm:self-end sm:pb-0.5 sm:leading-snug",
                    )}
                  >
                    Тип насоса
                  </FormLabel>
                  <div className={cn(!hideManufacturer && "sm:col-start-2 sm:row-start-2 sm:!mt-0 sm:min-w-0")}>
                    <Select
                      value={cur}
                      onValueChange={(v) => field.onChange([v] as [string, ...string[]])}
                    >
                      <FormControl>
                        <SelectTrigger className={PARAM_SELECT_TRIGGER_CLASS}>
                          <SelectValue placeholder="Серия" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className={FUNNEL_SELECT_CONTENT_CLASS}>
                        {["COMOS", "CIVOS", "VMIP", "HMIP"].map((c) => (
                          <SelectItem key={c} value={c} className={FUNNEL_SELECT_ITEM_CLASS}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </FormItem>
              );
            }}
          />
        ) : (
          <div
            className={cn(
              "space-y-1",
              !hideManufacturer && "sm:contents sm:space-y-0",
            )}
          >
            <label
              className={cn(
                "mb-0.5 block text-xs text-muted-foreground",
                !hideManufacturer && "sm:col-start-2 sm:row-start-1 sm:mb-0 sm:self-end sm:pb-0.5 sm:leading-snug",
              )}
            >
              Тип насоса
            </label>
            <div
              className={cn(
                "rounded-md border-0 bg-[var(--funnel-input-bg)] px-2 py-1.5 text-xs font-medium text-[var(--funnel-text)] sm:text-sm",
                !hideManufacturer && "sm:col-start-2 sm:row-start-2",
              )}
            >
              {selectedPumpType ?? "—"}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const sourceParamsPanel = (
    <div className={panel}>
      <h3 className={sectionTitle}>Исходные параметры</h3>
      <div className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-1">
        <FormField
          control={form.control}
          name="Q"
          render={({ field }) => (
            <FormItem className="contents space-y-0">
              <FormLabel className="col-start-1 row-start-1 self-end pb-0.5 text-xs leading-snug text-muted-foreground">
                Производительность, м³/ч
              </FormLabel>
              <div className="col-start-2 row-start-1 !mt-0 min-w-0 self-end justify-self-end">
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    className={cn(
                      "h-8 w-full max-w-[108px] font-mono text-right text-sm tabular-nums",
                      FUNNEL_INPUT_CLASS,
                      PARAM_FIELD_TRANSITION,
                    )}
                    {...field}
                  />
                </FormControl>
                <FormMessage className={cn("text-right text-xs", FORM_MSG_MOTION)} />
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="H"
          render={({ field }) => (
            <FormItem className="contents space-y-0">
              <FormLabel className="col-start-1 row-start-2 self-end pb-0.5 text-xs leading-snug text-muted-foreground">
                Напор, м
              </FormLabel>
              <div className="col-start-2 row-start-2 !mt-0 min-w-0 self-end justify-self-end">
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    className={cn(
                      "h-8 w-full max-w-[108px] font-mono text-right text-sm tabular-nums",
                      FUNNEL_INPUT_CLASS,
                      PARAM_FIELD_TRANSITION,
                    )}
                    {...field}
                  />
                </FormControl>
                <FormMessage className={cn("text-right text-xs", FORM_MSG_MOTION)} />
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="H_stat"
          render={({ field }) => (
            <FormItem className="contents space-y-0">
              <FormLabel className="col-start-1 row-start-3 self-end pb-0.5 text-xs leading-snug text-muted-foreground">
                Статический напор, м
              </FormLabel>
              <div className="col-start-2 row-start-3 !mt-0 min-w-0 self-end justify-self-end">
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    className={cn(
                      "h-8 w-full max-w-[108px] font-mono text-right text-sm tabular-nums",
                      FUNNEL_INPUT_CLASS,
                      PARAM_FIELD_TRANSITION,
                    )}
                    {...field}
                  />
                </FormControl>
                <FormMessage className={cn("text-right text-xs", FORM_MSG_MOTION)} />
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="H_garant"
          render={({ field }) => (
            <FormItem className="contents space-y-0">
              <FormLabel className="col-start-1 row-start-4 self-end pb-0.5 text-xs leading-snug text-muted-foreground">
                Гарантированный напор, м
              </FormLabel>
              <div className="col-start-2 row-start-4 !mt-0 min-w-0 self-end justify-self-end">
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    className={cn(
                      "h-8 w-full max-w-[108px] font-mono text-right text-sm tabular-nums",
                      FUNNEL_INPUT_CLASS,
                      PARAM_FIELD_TRANSITION,
                    )}
                    {...field}
                  />
                </FormControl>
                <FormMessage className={cn("text-right text-xs", FORM_MSG_MOTION)} />
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const quantityPanel = (
    <div className={graphsSlot ? cn(panel, panelMergedInner) : panel}>
      <h3 className={sectionTitle}>Количество насосов</h3>
      {/* Общая сетка: одна высота строки подписей → поля на одной линии при переносе */}
      <div className="grid grid-cols-2 grid-rows-[auto_auto] gap-x-2 gap-y-1">
        <FormField
          control={form.control}
          name="n1"
          render={({ field }) => (
            <FormItem className="contents space-y-0">
              <FormLabel className="col-start-1 row-start-1 self-end pb-0.5 text-xs leading-snug text-muted-foreground">
                Рабочие насосы
              </FormLabel>
              <div className="col-start-1 row-start-2 !mt-0 min-w-0">
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    className={cn("h-8 font-mono text-sm", FUNNEL_INPUT_CLASS, PARAM_FIELD_TRANSITION)}
                    {...field}
                  />
                </FormControl>
                <FormMessage className={cn("text-xs", FORM_MSG_MOTION)} />
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="n2"
          render={({ field }) => (
            <FormItem className="contents space-y-0">
              <FormLabel className="col-start-2 row-start-1 self-end pb-0.5 text-xs leading-snug text-muted-foreground">
                Резервные насосы
              </FormLabel>
              <div className="col-start-2 row-start-2 !mt-0 min-w-0">
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    className={cn("h-8 font-mono text-sm", FUNNEL_INPUT_CLASS, PARAM_FIELD_TRANSITION)}
                    {...field}
                  />
                </FormControl>
                <FormMessage className={cn("text-xs", FORM_MSG_MOTION)} />
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const operatingPanel = (
    <div className={graphsSlot ? cn(panel, panelMergedInner) : panel}>
      <h3 className={sectionTitle}>Фактические параметры</h3>
      <div className={cn("grid grid-cols-[1fr_auto] gap-x-2 gap-y-1 text-xs sm:text-sm", OPERATING_READOUT_BOX)}>
        <div className="contents">
          <span className="col-start-1 row-start-1 self-end text-muted-foreground sm:leading-snug">Производительность, м³/ч</span>
          <span className="col-start-2 row-start-1 self-end font-mono font-medium tabular-nums">{fmt(operatingPoint?.Q ?? null)}</span>
        </div>
        <div className="contents">
          <span className="col-start-1 row-start-2 self-end text-muted-foreground sm:leading-snug">Напор, м</span>
          <span className="col-start-2 row-start-2 self-end font-mono font-medium tabular-nums">{fmt(operatingPoint?.H ?? null)}</span>
        </div>
        <div className="contents">
          <span className="col-start-1 row-start-3 self-end text-muted-foreground sm:leading-snug">Мощность на валу Р2, кВт</span>
          <span className="col-start-2 row-start-3 self-end font-mono font-medium tabular-nums">{fmt(operatingPoint?.p2Kw ?? null)}</span>
        </div>
        <div className="contents">
          <span className="col-start-1 row-start-4 self-end text-muted-foreground sm:leading-snug">Кавитационный запас, м</span>
          <span className="col-start-2 row-start-4 self-end font-mono font-medium tabular-nums">{fmt(operatingPoint?.npshM ?? null)}</span>
        </div>
        <div className="contents">
          <span className="col-start-1 row-start-5 self-end text-muted-foreground sm:leading-snug">Гидравлический КПД, %</span>
          <span className="col-start-2 row-start-5 self-end font-mono font-medium tabular-nums">{fmt(operatingPoint?.etaPct ?? null)}</span>
        </div>
      </div>
    </div>
  );

  const liquidPanel = (
    <div className={panel}>
      <h3 className={sectionTitle}>Параметры перекачиваемой жидкости</h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:grid-rows-[auto_auto] sm:gap-x-2 sm:gap-y-1">
        <FormField
          control={form.control}
          name="medium_type"
          render={({ field }) => (
            <FormItem className="space-y-1 sm:contents sm:space-y-0">
              <FormLabel className="text-xs text-muted-foreground sm:col-start-1 sm:row-start-1 sm:self-end sm:pb-0.5 sm:leading-snug">
                Тип перекачиваемой жидкости
              </FormLabel>
              <div className="min-w-0 sm:col-start-1 sm:row-start-2 sm:!mt-0">
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className={PARAM_SELECT_TRIGGER_CLASS}>
                      <SelectValue placeholder="Выберите тип" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FUNNEL_SELECT_CONTENT_CLASS}>
                    <SelectItem value="вода" className={FUNNEL_SELECT_ITEM_CLASS}>вода</SelectItem>
                    <SelectItem value="р-р этиленгликоля" className={FUNNEL_SELECT_ITEM_CLASS}>
                      р-р этиленгликоля
                    </SelectItem>
                    <SelectItem value="р-р пропиленгликоля" className={FUNNEL_SELECT_ITEM_CLASS}>
                      р-р пропиленгликоля
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="T"
          render={({ field }) => (
            <FormItem className="grid max-sm:grid-cols-[1fr_auto] max-sm:items-end max-sm:gap-x-2 max-sm:space-y-0 sm:contents sm:space-y-0">
              <FormLabel className="text-xs leading-snug text-muted-foreground max-sm:pb-0.5 sm:col-start-2 sm:row-start-1 sm:self-end sm:pb-0.5">
                Температура, °С
              </FormLabel>
              <div className="max-sm:justify-self-end sm:col-start-2 sm:row-start-2 sm:!mt-0 sm:min-w-0 sm:justify-self-end">
                <FormControl>
                  <Input
                    type="number"
                    step="1"
                    className={cn(
                      "h-8 w-full max-w-[108px] font-mono text-right text-sm",
                      FUNNEL_INPUT_CLASS,
                      PARAM_FIELD_TRANSITION,
                    )}
                    {...field}
                  />
                </FormControl>
                <FormMessage className={cn("text-right text-xs", FORM_MSG_MOTION)} />
              </div>
            </FormItem>
          )}
        />
        {(mediumType === "р-р пропиленгликоля" || mediumType === "р-р этиленгликоля") && (
          <FormField
            control={form.control}
            name="concentration"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel className="text-xs text-muted-foreground">Концентрация, %</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className={PARAM_SELECT_TRIGGER_CLASS}>
                      <SelectValue placeholder="Выберите" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className={FUNNEL_SELECT_CONTENT_CLASS}>
                    {["35", "40", "45", "50", "55"].map((val) => (
                      <SelectItem key={val} value={val} className={FUNNEL_SELECT_ITEM_CLASS}>
                        {val}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  );

  const additionalPanel = (
    <div className={panel}>
      <h3 className={sectionTitle}>Дополнительные опции</h3>
      <FormField
        control={form.control}
        name="external_vfd"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center gap-2">
              <FormLabel className="flex-1 text-sm text-muted-foreground">Исполнение с внешним ПЧ</FormLabel>
              <span className="text-primary shrink-0" title="Уточните у менеджера">
                <Info className="w-4 h-4" strokeWidth={1.75} />
              </span>
            </div>
            <FormControl>
              <Input
              placeholder="Не обязательно"
              className={cn(FUNNEL_INPUT_CLASS, PARAM_FIELD_TRANSITION)}
              {...field}
            />
            </FormControl>
          </FormItem>
        )}
      />
      <div
        className="mt-2 min-h-[52px] rounded-md border border-dashed border-[color-mix(in_srgb,var(--funnel-text-muted)_35%,transparent)] bg-[var(--funnel-input-bg)]"
        aria-hidden
      />
    </div>
  );

  const defaultFormFields = (
    <>
      <motion.div variants={sectionMotion.item} className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        {typePanel}
        {quantityPanel}
      </motion.div>
      <motion.div
        variants={sectionMotion.item}
        className="grid grid-cols-1 gap-2 border-t border-zinc-100 pt-3 lg:grid-cols-2"
      >
        {sourceParamsPanel}
        {operatingPanel}
      </motion.div>
      <motion.div variants={sectionMotion.item} className="border-t border-zinc-100 pt-3">
        {liquidPanel}
      </motion.div>
    </>
  );

  const actionsWrapperClass =
    desktopActionsOutside && stretchToFill && !graphsSlot ? "lg:hidden" : "";

  const actionButtons = (
    <div className={cn("flex flex-col gap-2 pt-0 sm:flex-row", actionsWrapperClass)}>
      <Button
        type="button"
        variant="ghost"
        className="h-9 flex-1 border-0 text-sm transition-transform hover:opacity-90 active:scale-[0.98] motion-reduce:active:scale-100 selection-work-btn-secondary focus-visible:ring-2 focus-visible:ring-[var(--funnel-primary)] focus-visible:ring-offset-2"
        onClick={handleReset}
      >
        Сбросить
      </Button>
      <Button
        type="submit"
        className="h-9 flex-1 border-0 text-sm font-medium shadow-sm transition-transform hover:opacity-90 active:scale-[0.98] motion-reduce:active:scale-100 selection-work-btn-primary focus-visible:ring-2 focus-visible:ring-[var(--funnel-primary)] focus-visible:ring-offset-2"
        disabled={isLoading}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Загрузка...
          </div>
        ) : (
          "Подобрать"
        )}
      </Button>
    </div>
  );

  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        graphsSlot ? "h-full gap-3 lg:col-span-9" : stretchToFill ? "h-full min-h-0" : "min-h-0",
      )}
      id="pumpSearchForm"
    >
      <Form {...form}>
        <form
          id={formDomId}
          onSubmit={form.handleSubmit(handleSubmit)}
          className={cn(
            "flex flex-col gap-2",
            stretchToFill && !graphsSlot && "min-h-0 flex-1",
            graphsSlot && "flex-1 lg:grid lg:grid-cols-9 lg:gap-3 lg:items-start",
          )}
        >
          {graphsSlot ? (
            <>
              <div className="flex flex-col gap-2 lg:col-span-4 lg:gap-3">
                <motion.div
                  variants={sectionMotion.container}
                  initial="hidden"
                  animate="show"
                  className="flex flex-col gap-2"
                >
                  <motion.div variants={sectionMotion.item}>{typePanel}</motion.div>
                  <motion.div variants={sectionMotion.item} className="border-t border-zinc-100 pt-3">
                    {sourceParamsPanel}
                  </motion.div>
                  <motion.div variants={sectionMotion.item} className="border-t border-zinc-100 pt-3">
                    {liquidPanel}
                  </motion.div>
                  <motion.div variants={sectionMotion.item} className="border-t border-zinc-100 pt-3">
                    {additionalPanel}
                  </motion.div>
                </motion.div>
                {actionButtons}
              </div>
              <div className="flex flex-col gap-2 lg:col-span-5 lg:gap-3 min-h-0 min-w-0">
                <div className="flex flex-col gap-2 lg:gap-0 lg:bg-[var(--funnel-surface)] lg:overflow-hidden lg:min-h-0">
                  <motion.div
                    variants={sectionMotion.container}
                    initial="hidden"
                    animate="show"
                    className="flex flex-col gap-2 lg:p-2 lg:space-y-2"
                  >
                    <motion.div variants={sectionMotion.item}>{quantityPanel}</motion.div>
                    <motion.div variants={sectionMotion.item} className="border-t border-zinc-100 pt-3">
                      {operatingPanel}
                    </motion.div>
                  </motion.div>
                  <div className="hidden lg:flex lg:flex-col lg:flex-1 lg:min-h-0">
                    <div className="px-3 py-2 text-sm font-semibold text-[var(--funnel-text)] shrink-0">
                      Кривые характеристик
                    </div>
                    <div className="p-2 flex-1 min-h-0 overflow-auto">{graphsSlot}</div>
                  </div>
                </div>
              </div>
            </>
          ) : stretchToFill ? (
            <>
              <div className="relative min-h-0 flex-1">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-4 bg-gradient-to-b from-[var(--funnel-surface)] from-30% to-transparent motion-reduce:hidden"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-5 bg-gradient-to-t from-[var(--funnel-surface)] from-35% to-transparent motion-reduce:hidden"
                  aria-hidden
                />
                <motion.div
                  className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain"
                  variants={sectionMotion.container}
                  initial="hidden"
                  animate="show"
                >
                  {defaultFormFields}
                </motion.div>
              </div>
              <div className="shrink-0">{actionButtons}</div>
            </>
          ) : (
            <>
              <motion.div
                variants={sectionMotion.container}
                initial="hidden"
                animate="show"
                className="flex flex-col gap-2"
              >
                {defaultFormFields}
              </motion.div>
              {actionButtons}
            </>
          )}
        </form>
      </Form>
    </div>
  );
});

export default PumpSearchForm;
