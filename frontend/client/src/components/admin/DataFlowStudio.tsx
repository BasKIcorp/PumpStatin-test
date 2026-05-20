import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  addEdge,
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Panel,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { CircleHelp, Loader2, Play, Plus, Save, Trash2, Workflow } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToastNotification } from "@/hooks/use-toast-notification";
import {
  adminDataFlowGet,
  adminDataFlowNodeKinds,
  adminDataFlowPatch,
  adminDataFlowRun,
  adminDataFlowsList,
  adminDataFlowValidate,
  type AdminDataFlow,
} from "@/lib/api";
import { StationNodeForm } from "./StationNodeForm";

type DfNodeData = {
  kind: string;
  params: Record<string, unknown>;
  /** Подпись на холсте; пустая — показывается русское имя типа узла. */
  label?: string;
};

/** data-flow edge: метка ветки для узла switch */
type DfEdgeData = {
  case?: string;
  isDefault?: boolean;
};

type StudioCanvasUi = {
  blockMode: boolean;
  expertMode: boolean;
};

const StudioCanvasUiContext = createContext<StudioCanvasUi>({
  blockMode: false,
  expertMode: false,
});

const EDGE_LABEL_STYLE: NonNullable<Edge["labelStyle"]> = {
  fontSize: 10,
  fontWeight: 500,
  fill: "#475569",
};

const EDGE_LABEL_BG_STYLE: NonNullable<Edge["labelBgStyle"]> = {
  fill: "#f1f5f9",
  fillOpacity: 0.95,
};

function edgeVisualLabel(data: DfEdgeData | undefined, reactFlowLabel: Edge["label"]): string | undefined {
  const d = data ?? {};
  if (d.isDefault) return "default";
  const c = typeof d.case === "string" ? d.case.trim() : "";
  if (c) return c.length > 24 ? `${c.slice(0, 23)}…` : c;
  if (typeof reactFlowLabel === "string" && reactFlowLabel.trim()) return reactFlowLabel.trim();
  return undefined;
}

/** Стили «блочного» режима (Scratch-подобная геометрия карточки). */
const BLOCK_KIND_VISUAL: Record<string, { tint: string; ring: string }> = {
  input: { tint: "bg-sky-50/95", ring: "ring-2 ring-sky-300/80" },
  output: { tint: "bg-violet-50/95", ring: "ring-2 ring-violet-300/80" },
  switch: { tint: "bg-amber-50/95", ring: "ring-2 ring-amber-400/90" },
  coalesce: { tint: "bg-teal-50/95", ring: "ring-2 ring-teal-300/80" },
  sql_query: { tint: "bg-slate-50/95", ring: "ring-2 ring-slate-300/70" },
};

const SCHEMA_VERSION = "data_flow.v1";

const DF_KIND_LABELS: Record<string, string> = {
  input: "Входные параметры",
  sql_query: "SQL-запрос",
  filter: "Фильтр",
  compute: "Вычисления",
  map_rows: "Преобразование строк",
  rank: "Ранжирование",
  group_by: "Группировка",
  aggregate: "Агрегация",
  curve_fit: "Аппроксимация кривой",
  curve_fit_validate: "Проверка формы Q–H (как у ядра)",
  matching_run: "Подбор насосов (ядро ChoosingPump)",
  station_calculate: "Расчёт станции (select_station)",
  series_generate: "Генерация серии",
  series_filter: "Фильтр серии",
  interpolate: "Интерполяция",
  join: "Объединение",
  project: "Проекция полей",
  output: "Выход",
  // --- Станционные узлы ---
  station_input: "Вход станции",
  station_select_pump: "Выбор насоса",
  station_select_collector: "Коллектор",
  station_select_perehod: "Переходы",
  station_select_otvod: "Отводы",
  station_select_katushka: "Катушки",
  station_select_zap_armatura: "Запорная арматура",
  station_select_obratniy_klapan: "Обратный клапан",
  station_select_filter: "Фильтр",
  station_select_frame: "Рама",
  station_select_kozhuh: "Кожух",
  station_select_vibrocomp: "Виброкомпенсатор",
  station_select_vibroopora: "Виброопоры",
  station_select_shkaf: "Шкаф управления",
  station_select_rash_bak: "Расширительный бак",
  station_select_buf_bak: "Буферный бак",
  station_select_predokh: "Предохранительный клапан",
  station_select_zatvor: "Затвор",
  station_select_koncevik: "Концевики",
  station_select_insulation: "Изоляция",
  station_select_kip: "КИП",
  station_select_sborska_electrika: "Сборка/Электрика",
  station_select_podpitka_jockey: "Подпитка/Жокей",
  station_aggregate: "Агрегация станции",
  switch: "Развилка (условие)",
  coalesce: "Слияние веток",
};

const DF_KIND_CATEGORIES: Array<{ label: string; kinds: string[] }> = [
  { label: "Условие", kinds: ["switch"] },
  { label: "Поток", kinds: ["input", "output", "coalesce"] },
  { label: "Данные", kinds: ["sql_query", "filter", "project", "join", "compute", "map_rows", "rank", "group_by", "aggregate"] },
  { label: "Математика", kinds: ["curve_fit", "curve_fit_validate", "series_generate", "series_filter", "interpolate"] },
  { label: "Подбор насосов", kinds: ["matching_run", "curve_fit_pumps", "filter_pumps_qh", "build_pump_charts", "join_pump_catalog"] },
  { label: "Расчёт станции", kinds: ["station_calculate"] },
  { label: "Станция", kinds: [
    "station_input",
    "station_select_pump",
    "station_select_collector",
    "station_select_perehod",
    "station_select_otvod",
    "station_select_katushka",
    "station_select_zap_armatura",
    "station_select_obratniy_klapan",
    "station_select_filter",
    "station_select_frame",
    "station_select_kozhuh",
    "station_select_vibrocomp",
    "station_select_vibroopora",
    "station_select_shkaf",
    "station_select_rash_bak",
    "station_select_buf_bak",
    "station_select_predokh",
    "station_select_zatvor",
    "station_select_koncevik",
    "station_select_insulation",
    "station_select_kip",
    "station_select_sborska_electrika",
    "station_select_podpitka_jockey",
    "station_aggregate",
  ] },
];

/** Стрелки на рёбрах и цвет линии: направление = поток данных (source → target). */
const STATION_NODE_META: Record<string, { short: string; bg: string; border: string; desc: string }> = {
  station_input: { short: "Вх", bg: "bg-blue-100", border: "border-blue-300", desc: "Вход станции" },
  station_select_pump: { short: "Нс", bg: "bg-emerald-100", border: "border-emerald-300", desc: "Выбор насоса" },
  station_select_collector: { short: "Кл", bg: "bg-teal-100", border: "border-teal-300", desc: "Коллектор" },
  station_select_perehod: { short: "Пх", bg: "bg-indigo-100", border: "border-indigo-300", desc: "Переходы" },
  station_select_otvod: { short: "От", bg: "bg-sky-100", border: "border-sky-300", desc: "Отводы" },
  station_select_katushka: { short: "Кт", bg: "bg-pink-100", border: "border-pink-300", desc: "Катушки" },
  station_select_zap_armatura: { short: "ЗА", bg: "bg-amber-100", border: "border-amber-300", desc: "Запорная арматура" },
  station_select_obratniy_klapan: { short: "ОК", bg: "bg-cyan-100", border: "border-cyan-300", desc: "Обратный клапан" },
  station_select_filter: { short: "Фл", bg: "bg-indigo-100", border: "border-indigo-300", desc: "Фильтр" },
  station_select_frame: { short: "Рм", bg: "bg-purple-100", border: "border-purple-300", desc: "Рама" },
  station_select_kozhuh: { short: "Кж", bg: "bg-rose-100", border: "border-rose-300", desc: "Кожух" },
  station_select_vibrocomp: { short: "ВК", bg: "bg-emerald-100", border: "border-emerald-300", desc: "Виброкомпенсатор" },
  station_select_vibroopora: { short: "ВО", bg: "bg-teal-100", border: "border-teal-300", desc: "Виброопоры" },
  station_select_shkaf: { short: "ШУ", bg: "bg-amber-100", border: "border-amber-300", desc: "Шкаф управления" },
  station_select_rash_bak: { short: "РБ", bg: "bg-indigo-100", border: "border-indigo-300", desc: "Расширительный бак" },
  station_select_buf_bak: { short: "ББ", bg: "bg-indigo-100", border: "border-indigo-300", desc: "Буферный бак" },
  station_select_predokh: { short: "ПК", bg: "bg-amber-100", border: "border-amber-300", desc: "Предохранительный клапан" },
  station_select_zatvor: { short: "Зт", bg: "bg-sky-100", border: "border-sky-300", desc: "Затвор" },
  station_select_koncevik: { short: "Кц", bg: "bg-purple-100", border: "border-purple-300", desc: "Концевики" },
  station_select_insulation: { short: "Из", bg: "bg-yellow-100", border: "border-yellow-300", desc: "Изоляция" },
  station_select_kip: { short: "КИП", bg: "bg-green-100", border: "border-green-300", desc: "КИП" },
  station_select_sborska_electrika: { short: "СЭ", bg: "bg-fuchsia-100", border: "border-fuchsia-300", desc: "Сборка/Электрика" },
  station_select_podpitka_jockey: { short: "ПЖ", bg: "bg-cyan-100", border: "border-cyan-300", desc: "Подпитка/Жокей" },
  station_aggregate: { short: "Аг", bg: "bg-indigo-100", border: "border-indigo-300", desc: "Агрегация станции" },
};

/** Проверка, является ли kind станционным */
function isStationKind(kind: string): boolean {
  return kind.startsWith("station_");
}

const DATA_FLOW_EDGE_DEFAULTS = {
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
    color: "#64748b",
  },
  style: { strokeWidth: 1.75, stroke: "#94a3b8" },
} as const;

const FALLBACK_RUN_INPUTS_JSON = '{\n  "flow_rate": 20\n}';

type FlowInputFieldType = "number" | "integer" | "string" | "boolean" | "array" | "object";

type FlowInputFieldSpec = {
  key: string;
  label: string;
  type: FlowInputFieldType;
  default?: unknown;
  required?: boolean;
};

function parseFlowInputSchema(graph: Record<string, unknown>): FlowInputFieldSpec[] {
  const raw = graph.inputs;
  if (!Array.isArray(raw)) return [];
  const out: FlowInputFieldSpec[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const key = String(o.key ?? "").trim();
    if (!key) continue;
    const label = String(o.label ?? key);
    const t = o.type;
    const type: FlowInputFieldType =
      t === "number" || t === "integer" || t === "string" || t === "boolean" || t === "array" || t === "object"
        ? t
        : "string";
    const spec: FlowInputFieldSpec = { key, label, type, required: Boolean(o.required) };
    if ("default" in o) spec.default = o.default;
    out.push(spec);
  }
  return out;
}

function schemaForPersist(schema: FlowInputFieldSpec[]): FlowInputFieldSpec[] {
  return schema
    .filter((s) => s.key.trim())
    .map((s) => {
      const row: FlowInputFieldSpec = {
        key: s.key.trim(),
        label: s.label.trim() || s.key.trim(),
        type: s.type,
        required: Boolean(s.required),
      };
      if (s.default !== undefined) row.default = s.default;
      return row;
    });
}

function seedRunInputsRawFromSchema(schema: FlowInputFieldSpec[]): string {
  if (!schema.length) return FALLBACK_RUN_INPUTS_JSON;
  const obj: Record<string, unknown> = {};
  for (const s of schema) {
    if (s.default !== undefined) {
      obj[s.key] = s.default;
    } else if (s.type === "number" || s.type === "integer") {
      obj[s.key] = 0;
    } else if (s.type === "boolean") {
      obj[s.key] = false;
    } else if (s.type === "array") {
      obj[s.key] = [];
    } else if (s.type === "object") {
      obj[s.key] = {};
    } else {
      obj[s.key] = "";
    }
  }
  return JSON.stringify(obj, null, 2);
}

function tryParseRunObject(raw: string): Record<string, unknown> | null {
  const t = raw.trim();
  if (!t) return {};
  try {
    const parsed = JSON.parse(t) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return { ...(parsed as Record<string, unknown>) };
  } catch {
    return null;
  }
}

function mergeRunInputsKey(prevRaw: string, key: string, value: unknown): string {
  let o: Record<string, unknown> = {};
  try {
    const p = JSON.parse(prevRaw);
    if (p && typeof p === "object" && !Array.isArray(p)) {
      o = { ...(p as Record<string, unknown>) };
    }
  } catch {
    /* текст невалиден — пересобираем объект с изменённым ключом */
  }
  if (value === "" || value === undefined) {
    delete o[key];
  } else {
    o[key] = value;
  }
  return JSON.stringify(o, null, 2);
}

function previewValueForKey(
  schema: FlowInputFieldSpec[],
  parsed: Record<string, unknown> | null,
  key: string,
  type: FlowInputFieldType,
): unknown {
  if (parsed && key in parsed) return parsed[key];
  const spec = schema.find((s) => s.key === key);
  if (spec?.default !== undefined) return spec.default;
  if (type === "number" || type === "integer") return 0;
  if (type === "boolean") return false;
  if (type === "array") return [];
  if (type === "object") return {};
  return "";
}

function coercePreviewString(raw: string, type: FlowInputFieldType): unknown {
  if (type === "boolean") return raw === "true" || raw === "1";
  if (type === "number") {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  if (type === "integer") {
    const n = Number(raw);
    return Number.isFinite(n) ? Math.trunc(n) : 0;
  }
  if (type === "array" || type === "object") {
    try {
      return JSON.parse(raw);
    } catch {
      return type === "array" ? [] : {};
    }
  }
  return raw;
}

function defaultParams(kind: string): Record<string, unknown> {
  switch (kind) {
    case "input":
      return {};
    case "sql_query":
      return {
        query:
          "SELECT * FROM (VALUES " +
          "(1::bigint, 'демо A'::text, 15.5::double precision, 40.0::double precision, 250000::bigint), " +
          "(2::bigint, 'демо B'::text, 22.0::double precision, 35.0::double precision, 310000::bigint), " +
          "(3::bigint, 'демо C'::text, 8.5::double precision, 50.0::double precision, 180000::bigint)" +
          ") AS _df_demo (id, naimenovanie, napor, rashod, stoimost)",
        params: {},
        outputAlias: "candidates",
      };
    case "filter":
      return {
        input: "{{ n2.candidates }}",
        predicate: { "==": [{ var: "id" }, { var: "id" }] },
      };
    case "compute":
      return {
        input: "{{ n3.output }}",
        expressions: {
          score: "(item.napor or 0) - ((item.stoimost or 0) / 100000.0)",
        },
      };
    case "map_rows":
      return {
        input: "{{ n3.output }}",
        expressions: { score: "item.napor" },
      };
    case "group_by":
      return {
        input: "{{ n2.output }}",
        by: ["naimenovanie"],
      };
    case "aggregate":
      return {
        input: "{{ n3.output }}",
        metrics: {
          max_napor: { op: "max", field: "napor" },
          rows: { op: "count" },
        },
      };
    case "curve_fit":
      return {
        input: "{{ n3.output }}",
        group_by: "naimenovanie",
        q_field: "rashod",
        h_field: "napor",
        min_points: 3,
        approx_points: 100,
      };
    case "curve_fit_validate":
      return { input: "{{ n4.output }}" };
    case "matching_run":
      return {
        thresholds_source: "admin",
        curves: "{{ n2.curves }}",
        pumps: "{{ n5.pumps }}",
      };
    case "station_calculate":
      return {};
    case "series_generate":
      return {
        start: 0,
        end: 100,
        points: 30,
        x_key: "q",
        y_key: "h",
        expression: "constants.a * (item.q * item.q) + constants.c",
      };
    case "series_filter":
      return {
        input: "{{ n4.output }}",
        expression: "item.h >= inputs.H",
      };
    case "interpolate":
      return {
        source: "{{ n4.output[0].curve }}",
        x_field: "q",
        y_field: "h",
        query_x: "{{ inputs.Q }}",
      };
    case "join":
      return {
        left: "{{ n2.output }}",
        right: "{{ n3.output }}",
        on: ["naimenovanie"],
        mode: "inner",
      };
    case "project":
      return {
        input: "{{ n4.output }}",
        fields: { pump_name: "naimenovanie", q: "rashod", h: "napor" },
        passthrough: ["score"],
      };
    case "rank":
      return { input: "{{ n4.output }}", by: "score", order: "desc", limit: 10 };
    case "output":
      return { rows: "{{ n9.output }}" };
    case "switch":
      return { expr: 'str(inputs["pick"])' };
    case "coalesce":
      return { from: ["n_a", "n_b"] };
    // --- Станционные узлы ---
    case "station_input":
      return {};
    case "station_select_pump":
      return { input: "{{ n1.output }}", selected_pump: null };
    case "station_select_collector":
      return { input: "{{ n1.output }}", diameter_mm: 100 };
    case "station_select_perehod":
      return { input: "{{ n1.output }}", from_diameter: 100, to_diameter: 80 };
    case "station_select_otvod":
      return { input: "{{ n1.output }}", diameter_mm: 100, angle_deg: 90 };
    case "station_select_katushka":
      return { input: "{{ n1.output }}", diameter_mm: 100 };
    case "station_select_zap_armatura":
      return { input: "{{ n1.output }}", diameter_mm: 100, type: "zadvizhka" };
    case "station_select_obratniy_klapan":
      return { input: "{{ n1.output }}", diameter_mm: 100, dn: "DN100" };
    case "station_select_filter":
      return { input: "{{ n1.output }}", enabled: true, diameter_mm: 100 };
    case "station_select_frame":
      return { input: "{{ n1.output }}", length_mm: 2000, width_mm: 800 };
    case "station_select_kozhuh":
      return { input: "{{ n1.output }}", type: "zashchitniy" };
    case "station_select_vibrocomp":
      return { input: "{{ n1.output }}", diameter_mm: 100 };
    case "station_select_vibroopora":
      return { input: "{{ n1.output }}", enabled: true, side: "left" };
    case "station_select_shkaf":
      return { input: "{{ n1.output }}", power_kw: 30 };
    case "station_select_rash_bak":
      return { input: "{{ n1.output }}", volume_l: 100 };
    case "station_select_buf_bak":
      return { input: "{{ n1.output }}", volume_l: 50 };
    case "station_select_predokh":
      return { input: "{{ n1.output }}", enabled: true, diameter_mm: 100 };
    case "station_select_zatvor":
      return { input: "{{ n1.output }}", diameter_mm: 100, type: "diskoviy" };
    case "station_select_koncevik":
      return { input: "{{ n1.output }}", type: "limit" };
    case "station_select_insulation":
      return { input: "{{ n1.output }}", thickness_mm: 50, material: "minvata" };
    case "station_select_kip":
      return { input: "{{ n1.output }}", type: "manometer" };
    case "station_select_sborska_electrika":
      return { input: "{{ n1.output }}", voltage_v: 380 };
    case "station_select_podpitka_jockey":
      return { input: "{{ n1.output }}", pump_model: "jockey_1" };
    case "station_aggregate":
      return { nodes: [], summary: {} };
    default:
      return {};
  }
}

function graphFromServer(graph: Record<string, unknown>): { nodes: Node<DfNodeData>[]; edges: Edge[] } {
  const nodesRaw = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edgesRaw = Array.isArray(graph.edges) ? graph.edges : [];
  const nodes: Node<DfNodeData>[] = nodesRaw.map((n: any, i: number) => {
    const id = String(n.id ?? `n${i}`);
    const kind = String(n.kind ?? "");
    const pos = n.position && typeof n.position === "object" ? n.position : { x: 0, y: 0 };
    const params = n.params && typeof n.params === "object" ? (n.params as Record<string, unknown>) : {};
    const lab = typeof n.label === "string" ? n.label.trim().slice(0, 200) : "";
    return {
      id,
      type: "df",
      position: { x: Number(pos.x) || 0, y: Number(pos.y) || 0 },
      data: { kind, params, ...(lab ? { label: lab } : {}) },
    };
  });
  const edges: Edge[] = edgesRaw.map((e: any, i: number) => {
    const isDef = Boolean(e.isDefault ?? e.default);
    let caseStr = "";
    if (typeof e.case === "string" && e.case.trim()) caseStr = e.case.trim().slice(0, 120);
    else if (!isDef && typeof e.label === "string" && e.label.trim() && e.label.trim() !== "default")
      caseStr = e.label.trim().slice(0, 120);
    const data: DfEdgeData = {
      ...(caseStr ? { case: caseStr } : {}),
      ...(isDef ? { isDefault: true } : {}),
    };
    const hasData = Object.keys(data).length > 0;
    const lbl = edgeVisualLabel(hasData ? data : undefined, undefined);
    return {
      id: String(e.id ?? `e${i}`),
      source: String(e.source ?? ""),
      target: String(e.target ?? ""),
      ...(hasData ? { data } : {}),
      ...(lbl ? { label: lbl, labelStyle: EDGE_LABEL_STYLE, labelBgStyle: EDGE_LABEL_BG_STYLE } : {}),
      ...DATA_FLOW_EDGE_DEFAULTS,
    };
  });
  return { nodes, edges };
}

type RunInputsPreview =
  | { status: "ok"; keys: string[]; preview: Record<string, unknown> }
  | { status: "invalid"; keys: string[]; hint: string }
  | { status: "empty"; keys: string[] };

const RunInputsPreviewContext = createContext<RunInputsPreview>({ status: "empty", keys: [] });

type NodeRunStatus = "running" | "ok" | "error";
type NodeRunStateMap = Record<string, { status: NodeRunStatus; error?: string }>;
const NodeRunStateContext = createContext<NodeRunStateMap>({});

function parseRunInputsPreview(raw: string): RunInputsPreview {
  const t = raw.trim();
  if (!t) return { status: "empty", keys: [] };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        status: "invalid",
        keys: [],
        hint: "Нужен JSON-объект вида {\"flow_rate\": 20}, не массив.",
      };
    }
    const obj = parsed as Record<string, unknown>;
    return { status: "ok", keys: Object.keys(obj), preview: obj };
  } catch {
    return { status: "invalid", keys: [], hint: "Не удалось разобрать JSON — проверьте кавычки и запятые." };
  }
}

function formatPreviewSnippet(obj: Record<string, unknown>, maxKeys = 6): string {
  const entries = Object.entries(obj).slice(0, maxKeys);
  const inner = entries.map(([k, v]) => {
    const s =
      v === null || typeof v === "number" || typeof v === "boolean"
        ? String(v)
        : typeof v === "string"
          ? `"${v.length > 24 ? `${v.slice(0, 24)}…` : v}"`
          : "…";
    return `${k}: ${s}`;
  });
  const tail = Object.keys(obj).length > maxKeys ? ", …" : "";
  return `{ ${inner.join(", ")}${tail} }`;
}

/** Одна строка для подписи на холсте (без переносов). */
function truncateOneLine(s: string, maxLen: number): string {
  const one = s.replace(/\s+/g, " ").trim();
  if (!one) return "";
  if (one.length <= maxLen) return one;
  return `${one.slice(0, Math.max(0, maxLen - 1))}…`;
}

function strParam(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function summarizeBinding(v: unknown, max: number): string {
  const s = strParam(v);
  return truncateOneLine(s, max);
}

/**
 * Краткое содержимое узла для подписи под заголовком на холсте.
 * Полная конфигурация по-прежнему в колонке «Параметры узла».
 */
function summarizeDfNodeCanvasSubtitle(kind: string, params: Record<string, unknown> | undefined): string | null {
  const p = params && typeof params === "object" ? params : {};
  const parts: string[] = [];

  switch (kind) {
    case "input":
      return null;
    case "sql_query": {
      const alias = strParam(p.outputAlias).trim() || "output";
      const q = strParam(p.query).trim();
      if (q) parts.push(`выход «${alias}» · ${truncateOneLine(q, 72)}`);
      else parts.push(`алиас «${alias}», SQL не задан`);
      break;
    }
    case "filter":
    case "series_filter": {
      const ex = strParam(p.expression).trim();
      if (ex) parts.push(truncateOneLine(ex, 88));
      else if (p.predicate != null) parts.push("фильтр: JSONLogic");
      else parts.push("задайте expression или predicate");
      break;
    }
    case "compute":
    case "map_rows": {
      const exprs = p.expressions;
      if (exprs && typeof exprs === "object" && !Array.isArray(exprs)) {
        const keys = Object.keys(exprs as Record<string, unknown>);
        parts.push(
          keys.length
            ? `новые поля: ${keys.slice(0, 6).join(", ")}${keys.length > 6 ? "…" : ""}`
            : "expressions пусто",
        );
      } else parts.push("нужен объект expressions");
      break;
    }
    case "group_by": {
      const by = p.by;
      if (typeof by === "string" && by.trim()) parts.push(`группировка: ${by.trim()}`);
      else if (Array.isArray(by) && by.length)
        parts.push(`группировка: ${by.map((x) => String(x)).join(", ")}`);
      else parts.push("укажите by");
      break;
    }
    case "aggregate": {
      const m = p.metrics;
      if (m && typeof m === "object" && !Array.isArray(m)) {
        const keys = Object.keys(m as Record<string, unknown>);
        parts.push(keys.length ? `метрики: ${keys.slice(0, 5).join(", ")}` : "metrics пусто");
      } else parts.push("нужен объект metrics");
      break;
    }
    case "rank": {
      const by = strParam(p.by).trim();
      const ord = strParam(p.order).trim() || "desc";
      const lim = p.limit;
      const limS = lim !== undefined && lim !== "" ? `, top ${lim}` : "";
      parts.push(by ? `ранг по ${by} (${ord}${limS})` : "укажите by");
      break;
    }
    case "join": {
      const on = p.on;
      const keys = typeof on === "string" ? (on.trim() ? [on.trim()] : []) : Array.isArray(on) ? on.map(String) : [];
      const mode = strParam(p.mode).trim() || "inner";
      parts.push(keys.length ? `join ${mode} on ${keys.join(", ")}` : "укажите on");
      break;
    }
    case "project": {
      const fields = p.fields;
      if (fields && typeof fields === "object" && !Array.isArray(fields)) {
        const keys = Object.keys(fields as Record<string, unknown>);
        parts.push(keys.length ? `поля: ${keys.slice(0, 6).join(", ")}${keys.length > 6 ? "…" : ""}` : "fields пусто");
      } else parts.push("нужен объект fields");
      break;
    }
    case "curve_fit": {
      const qf = strParam(p.q_field).trim() || "rashod";
      const hf = strParam(p.h_field).trim() || "napor";
      const gf = strParam(p.group_by).trim();
      parts.push(gf ? `Q:${qf} H:${hf}, группа ${gf}` : `Q:${qf} H:${hf}`);
      break;
    }
    case "curve_fit_validate":
      parts.push("проверка формы Q–H");
      break;
    case "series_generate": {
      parts.push(
        `от ${strParam(p.start)} до ${strParam(p.end)}, точек ${strParam(p.points) || "30"}`,
      );
      break;
    }
    case "interpolate": {
      parts.push(`поле ${strParam(p.field).trim() || "?"}`);
      break;
    }
    case "matching_run": {
      const ts = strParam(p.thresholds_source).trim() || "admin";
      const c = summarizeBinding(p.curves, 28);
      const pu = summarizeBinding(p.pumps, 28);
      parts.push(`пороги: ${ts}`);
      if (c) parts.push(`кривые: ${c}`);
      if (pu) parts.push(`каталог: ${pu}`);
      break;
    }
    case "station_calculate":
      parts.push("комплектация через select_station");
      break;
    case "station_input":
      parts.push("входные параметры станции");
      break;
    case "station_select_pump": {
      const sp = strParam(p.selected_pump);
      parts.push(sp ? `насос: ${sp}` : "выбор насоса");
      break;
    }
    case "station_select_collector":
      parts.push(`⌀${strParam(p.diameter_mm) || "?"} мм`);
      break;
    case "station_select_perehod":
      parts.push(`${strParam(p.from_diameter) || "?"}→${strParam(p.to_diameter) || "?"} мм`);
      break;
    case "station_select_otvod":
      parts.push(`⌀${strParam(p.diameter_mm) || "?"} мм, ${strParam(p.angle_deg) || "?"}°`);
      break;
    case "station_select_katushka":
      parts.push(`⌀${strParam(p.diameter_mm) || "?"} мм`);
      break;
    case "station_select_zap_armatura":
      parts.push(`${strParam(p.type) || "?"}, ⌀${strParam(p.diameter_mm) || "?"} мм`);
      break;
    case "station_select_obratniy_klapan":
      parts.push(`⌀${strParam(p.diameter_mm) || "?"} мм`);
      break;
    case "station_select_filter": {
      const en = p.enabled !== false;
      parts.push(`⌀${strParam(p.diameter_mm) || "?"} мм${en ? "" : " (откл.)"}`);
      break;
    }
    case "station_select_frame":
      parts.push(`${strParam(p.length_mm) || "?"}×${strParam(p.width_mm) || "?"} мм`);
      break;
    case "station_select_kozhuh":
      parts.push(`${strParam(p.type) || "?"}`);
      break;
    case "station_select_vibrocomp":
      parts.push(`⌀${strParam(p.diameter_mm) || "?"} мм`);
      break;
    case "station_select_vibroopora": {
      const en = p.enabled !== false;
      parts.push(`${strParam(p.side) || "left"}${en ? "" : " (откл.)"}`);
      break;
    }
    case "station_select_shkaf":
      parts.push(`${strParam(p.power_kw) || "?"} кВт`);
      break;
    case "station_select_rash_bak":
      parts.push(`${strParam(p.volume_l) || "?"} л`);
      break;
    case "station_select_buf_bak":
      parts.push(`${strParam(p.volume_l) || "?"} л`);
      break;
    case "station_select_predokh": {
      const en = p.enabled !== false;
      parts.push(`⌀${strParam(p.diameter_mm) || "?"} мм${en ? "" : " (откл.)"}`);
      break;
    }
    case "station_select_zatvor":
      parts.push(`${strParam(p.type) || "?"}, ⌀${strParam(p.diameter_mm) || "?"} мм`);
      break;
    case "station_select_koncevik":
      parts.push(`${strParam(p.type) || "?"}`);
      break;
    case "station_select_insulation":
      parts.push(`${strParam(p.thickness_mm) || "?"} мм, ${strParam(p.material) || "?"}`);
      break;
    case "station_select_kip":
      parts.push(`${strParam(p.type) || "?"}`);
      break;
    case "station_select_sborska_electrika":
      parts.push(`${strParam(p.voltage_v) || "?"} В`);
      break;
    case "station_select_podpitka_jockey":
      parts.push(`${strParam(p.pump_model) || "?"}`);
      break;
    case "station_aggregate":
      parts.push("сводка компонентов станции");
      break;
    case "curve_fit_pumps": {
      const ts = strParam(p.thresholds_source).trim() || "admin";
      const n1 = p.n1 !== undefined ? `n1=${strParam(p.n1)}` : "";
      parts.push([`пороги: ${ts}`, n1].filter(Boolean).join(", "));
      const c = summarizeBinding(p.curves, 40);
      if (c) parts.push(c);
      break;
    }
    case "filter_pumps_qh":
    case "build_pump_charts":
    case "join_pump_catalog": {
      const ts = strParam(p.thresholds_source).trim() || "admin";
      const Qv = strParam(p.Q).trim();
      const Hv = strParam(p.H).trim();
      parts.push(`Q=${Qv || "?"}, H=${Hv || "?"}, пороги ${ts}`);
      break;
    }
    case "switch": {
      const ex = strParam(p.expr).trim();
      parts.push(ex ? truncateOneLine(ex, 88) : "укажите expr (метка ветки)");
      break;
    }
    case "coalesce": {
      const fr = p.from;
      if (Array.isArray(fr) && fr.length)
        parts.push(`из: ${fr.map((x) => String(x)).slice(0, 6).join(", ")}${fr.length > 6 ? "…" : ""}`);
      else parts.push("укажите from — список id узлов");
      break;
    }
    case "output": {
      const rows = p.rows;
      const map = p.map;
      if (map && typeof map === "object" && !Array.isArray(map)) {
        const keys = Object.keys(map as Record<string, unknown>);
        parts.push(keys.length ? `выход: ${keys.join(", ")}` : "map пустой");
      } else if (rows !== undefined && rows !== null) {
        parts.push(truncateOneLine(`rows: ${typeof rows === "string" ? rows : "…"}`, 64));
      } else parts.push("задайте map или rows");
      break;
    }
    default:
      if (Object.keys(p).length === 0) return "параметры в правой колонке";
      return truncateOneLine(formatPreviewSnippet(p, 4), 96);
  }

  const line = parts.filter(Boolean).join(" · ");
  return line ? truncateOneLine(line, 120) : null;
}

function buildGraphPayload(
  nodes: Node<DfNodeData>[],
  edges: Edge[],
  inputsSchema: FlowInputFieldSpec[],
): Record<string, unknown> {
  return {
    schema_version: SCHEMA_VERSION,
    meta: {},
    inputs: schemaForPersist(inputsSchema),
    nodes: nodes.map((n) => {
      const rawLabel = typeof n.data.label === "string" ? n.data.label.trim().slice(0, 200) : "";
      const row: Record<string, unknown> = {
        id: n.id,
        kind: n.data.kind,
        position: n.position,
        params: n.data.params && typeof n.data.params === "object" ? n.data.params : {},
      };
      if (rawLabel) row.label = rawLabel;
      return row;
    }),
    edges: edges.map((e, i) => {
      const row: Record<string, unknown> = {
        id: e.id || `e${i}`,
        source: e.source,
        target: e.target,
      };
      const d = (e.data ?? {}) as DfEdgeData;
      let c = typeof d.case === "string" ? d.case.trim() : "";
      if (!c && typeof e.label === "string" && e.label.trim() && e.label.trim() !== "default")
        c = e.label.trim();
      if (c) row.case = c.slice(0, 120);
      const isDef = Boolean(d.isDefault) || (typeof e.label === "string" && e.label.trim() === "default");
      if (isDef) row.isDefault = true;
      return row;
    }),
  };
}

function DfNodeView({ data, selected, id }: NodeProps<Node<DfNodeData>>) {
  const runIn = useContext(RunInputsPreviewContext);
  const runStateMap = useContext(NodeRunStateContext);
  const { blockMode } = useContext(StudioCanvasUiContext);
  const runState = runStateMap[id];

  const paramSummary = useMemo(
    () => summarizeDfNodeCanvasSubtitle(data.kind, data.params),
    [data.kind, data.params],
  );

  const kindCaption = DF_KIND_LABELS[data.kind] ?? data.kind;
  const custom = typeof data.label === "string" ? data.label.trim().slice(0, 200) : "";
  const mainTitle = custom || kindCaption;
  const inputHint =
    data.kind === "input"
      ? runIn.status === "ok"
        ? runIn.keys.length
          ? `поля: ${runIn.keys.slice(0, 4).join(", ")}${runIn.keys.length > 4 ? "…" : ""}`
          : "пустой объект"
        : runIn.status === "invalid"
          ? "JSON: ошибка"
          : "нет JSON"
      : null;

  const stationMeta = STATION_NODE_META[data.kind];

  const borderClass = selected
    ? "border-blue-600 ring-2 ring-blue-200"
    : runState?.status === "error"
      ? "border-red-500 ring-2 ring-red-200"
      : runState?.status === "ok"
        ? "border-emerald-500"
        : stationMeta
          ? stationMeta.border
          : "border-border";

  const bgClass = stationMeta ? stationMeta.bg : "";
  const blockVis = BLOCK_KIND_VISUAL[data.kind];
  const blockShape = blockMode ? "rounded-2xl shadow-md min-w-[168px] max-w-[280px]" : "rounded-lg min-w-[150px] max-w-[260px]";
  const blockTint = blockMode && blockVis ? `${blockVis.tint} ${blockVis.ring}` : "";

  const cardTitle =
    runState?.status === "error" && runState.error
      ? runState.error
      : stationMeta
        ? `${stationMeta.desc} — ${paramSummary ?? "без параметров"}`
        : [mainTitle, paramSummary].filter(Boolean).join(" — ") || undefined;

  return (
    <div
      className={cn(
        blockShape,
        "border-2 px-2 py-1.5 text-left",
        blockTint || bgClass,
        !blockTint && !bgClass ? "bg-background/95" : "",
        borderClass,
      )}
      title={cardTitle}
    >
      <Handle type="target" position={Position.Left} className="!bg-sky-500" />
      <div className="flex items-center gap-1">
        {runState?.status === "running" && <Loader2 className="h-3 w-3 animate-spin text-sky-500 shrink-0" />}
        {runState?.status === "ok" && <span className="text-emerald-500 text-[10px] shrink-0">✓</span>}
        {runState?.status === "error" && <span className="text-red-500 text-[10px] shrink-0">✕</span>}
        {stationMeta && (
          <span className="inline-flex items-center justify-center rounded px-1 py-0 text-[9px] font-bold uppercase leading-tight bg-white/60 text-foreground/80 shrink-0">
            {stationMeta.short}
          </span>
        )}
        <div className="text-xs font-semibold leading-snug text-foreground line-clamp-2">{mainTitle}</div>
      </div>
      {custom ? (
        <div className="text-[9px] font-medium text-muted-foreground mt-0.5">{kindCaption}</div>
      ) : null}
      {paramSummary ? (
        <div
          className="text-[9px] leading-snug text-muted-foreground mt-0.5 line-clamp-2 break-words"
          title={paramSummary}
        >
          {paramSummary}
        </div>
      ) : null}
      {runState?.status === "error" && runState.error && (
        <div className="text-[9px] leading-snug text-red-600 mt-0.5 line-clamp-2">{runState.error}</div>
      )}
      {inputHint && <div className="text-[9px] leading-snug text-sky-800/90 dark:text-sky-200/90 mt-0.5">{inputHint}</div>}
      <Handle type="source" position={Position.Right} className="!bg-sky-500" />
    </div>
  );
}

const FILTER_OPS = ["==", "!=", ">", ">=", "<", "<="] as const;

const STUDIO_OVERVIEW_TOOLTIP = (
  <>
    <p className="font-medium text-foreground">Как пользоваться схемой подбора</p>
    <ol className="list-decimal pl-4 space-y-1.5 text-muted-foreground">
      <li>Выберите поток в списке (новые потоки создаются через API или админку Django).</li>
      <li>
        Собирайте граф на холсте: узлы и связи между ручками (выход справа → вход слева); на линиях показаны стрелки направления данных.
      </li>
      <li>
        После правок узлов или связей нажимайте <strong className="text-foreground">«Сохранить»</strong> — без этого сервер может не принять запуск или отдать старую версию графа.
      </li>
      <li>«Проверить» — валидация DAG и типов блоков перед продакшеном.</li>
      <li>
        Кнопка <strong className="text-foreground">«Запустить»</strong> отправляет JSON из узла «Входные параметры» справа (поля формы и/или текст JSON).
      </li>
      <li>
        Под заголовком узла на холсте показывается <strong className="text-foreground">краткое содержимое</strong> (SQL, связи{" "}
        <code className="text-[11px]">{"{{ }}"}</code>, пороги подбора и т.д.); полная правка — в правой колонке «Параметры узла» после клика по узлу.
      </li>
    </ol>
  </>
);

const CANVAS_HELP_TOOLTIP = (
  <>
    <p>
      Выберите узел кликом. Тяните линию от правого маркера (выхода) ко входу следующего блока — так задаётся порядок обработки на сервере.
    </p>
    <p className="text-muted-foreground">
      <strong className="text-foreground">Направление данных</strong> на графе показывают{" "}
      <strong className="text-foreground">стрелки на линиях</strong>: от источника (откуда вышла связь) к приёмнику (куда вошла). Типовая цепочка идёт слева
      направо от <code>input</code> к <code>output</code>.
    </p>
    <p className="text-muted-foreground">Кнопки «Добавить узел» под холстом вставляют блок; при необходимости перетащите узел мышью.</p>
  </>
);

const PARAMS_IDLE_HELP_TOOLTIP = (
  <>
    <p>Выберите узел на холсте кликом — здесь появятся его поля.</p>
    <p>
      Узел «Входные параметры» (<code>input</code>) задаёт объект <code>inputs</code>: схему полей, значения запуска и полный JSON. Рядом с подзаголовками внутри input стоят иконки «?» с пояснениями.
    </p>
  </>
);

const RUN_RESULT_HELP_TOOLTIP = (
  <>
    <p>После «Запустить» здесь только итоговый объект узла <code>output</code> (карта <code>map</code>), без пошаговой трассировки.</p>
    <p className="text-muted-foreground">Входные значения настраиваются справа при выбранной ноде input — эта карточка только показывает результат выполнения.</p>
  </>
);

/** Итоговый объект ноды `output` из трассировки (без цепочки по всем узлам). */
function finalSinkOutputPayload(traces: Record<string, unknown>[]): unknown {
  for (let i = traces.length - 1; i >= 0; i--) {
    const t = traces[i];
    if (!t || typeof t !== "object") continue;
    if (String((t as { kind?: unknown }).kind) !== "output") continue;
    const preview = (t as { output_preview?: unknown }).output_preview;
    if (preview !== undefined) return preview;
  }
  return undefined;
}

function Hint({
  text,
  children,
}: {
  text: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-5">{text}</TooltipContent>
    </Tooltip>
  );
}

function DfPanelHelp({
  content,
  compact = false,
  ariaLabel = "Справка по входам",
}: {
  content: ReactNode;
  compact?: boolean;
  ariaLabel?: string;
}) {
  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            compact ? "h-6 w-6 rounded-full" : "h-7 w-7",
          )}
          aria-label={ariaLabel}
        >
          <CircleHelp className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="left"
        align="start"
        className="max-w-sm max-h-[min(70vh,28rem)] overflow-y-auto text-xs leading-relaxed"
      >
        <div className="space-y-2 [&_code]:rounded [&_code]:bg-muted/80 [&_code]:px-0.5 [&_code]:text-[11px] [&_code]:font-mono">
          {content}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

type FlowInputNodePanelProps = {
  nodeId: string;
  flowInputSchema: FlowInputFieldSpec[];
  addFlowSchemaRow: () => void;
  updateFlowSchemaRow: (index: number, patch: Partial<FlowInputFieldSpec>) => void;
  removeFlowSchemaRow: (index: number) => void;
  runInputsRaw: string;
  setRunInputsRaw: Dispatch<SetStateAction<string>>;
  runInputsPreview: RunInputsPreview;
  runInputsObject: Record<string, unknown> | null;
  patchSchemaRunInput: (fieldKey: string, rawStr: string, ft: FlowInputFieldType) => void;
};

function FlowInputNodePanel(props: FlowInputNodePanelProps) {
  const {
    nodeId,
    flowInputSchema,
    addFlowSchemaRow,
    updateFlowSchemaRow,
    removeFlowSchemaRow,
    runInputsRaw,
    setRunInputsRaw,
    runInputsPreview,
    runInputsObject,
    patchSchemaRunInput,
  } = props;

  return (
    <div className="space-y-3 pb-1">
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <span className="text-xs font-medium text-foreground">Входные данные запуска</span>
        <DfPanelHelp
          ariaLabel="Справка: входные данные запуска"
          content={
            <>
              <p>
                Объект <code>inputs</code> уходит на сервер при «Запустить» и попадает в контекст как <code>inputs</code>. Выход этой ноды:{" "}
                <code>{`{{ ${nodeId}.output }}`}</code> (тот же объект).
              </p>
              <ol className="list-decimal space-y-1.5 pl-4 text-muted-foreground">
                <li>Значения задаются полями ниже и/или полным JSON внизу; действуют ключи из схемы полей этого потока.</li>
                <li>
                  Нода <code>input</code> не использует <code>params</code> — она добавляет в контекст{" "}
                  <code>{`{ "${nodeId}": { "output": <объект inputs> } }`}</code>.
                </li>
                <li>
                  В биндингах: <code>{`{{ inputs.flow_rate }}`}</code> или <code>{`{{ ${nodeId}.output.flow_rate }}`}</code> — одно и то же.
                </li>
                <li>
                  Каждый следующий узел дополняет контекст своим <code>id</code> и результатами.
                </li>
              </ol>
            </>
          }
        />
      </div>

      <div className="rounded-md border bg-muted/20 p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs font-medium text-foreground">Схема входов этого потока</span>
            <DfPanelHelp
              ariaLabel="Справка: схема входов потока"
              content={
                <>
                  <p>
                    Ожидаемые ключи для данного потока — у другого потока список может отличаться. Сохраните граф кнопкой «Сохранить». Обязательные поля
                    проверяются на сервере.
                  </p>
                  <p className="text-amber-900 dark:text-amber-100">
                    Пока ни одного поля в схеме — используйте только JSON ниже или добавьте поля кнопкой «Поле».
                  </p>
                </>
              }
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={addFlowSchemaRow}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Поле
          </Button>
        </div>
        {flowInputSchema.length > 0 ? (
          <div className="space-y-2">
            {flowInputSchema.map((spec, idx) => (
              <div
                key={`${spec.key}_${idx}`}
                className="grid gap-2 text-xs grid-cols-1 sm:grid-cols-12 sm:items-end border-b border-border/60 pb-2 last:border-0 last:pb-0"
              >
                <div className="sm:col-span-2 space-y-0.5">
                  <Label className="text-[10px]">key</Label>
                  <Input
                    className="h-8 text-xs font-mono"
                    value={spec.key}
                    onChange={(e) => updateFlowSchemaRow(idx, { key: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-3 space-y-0.5">
                  <Label className="text-[10px]">подпись</Label>
                  <Input
                    className="h-8 text-xs"
                    value={spec.label}
                    onChange={(e) => updateFlowSchemaRow(idx, { label: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2 space-y-0.5">
                  <Label className="text-[10px]">тип</Label>
                  <Select
                    value={spec.type}
                    onValueChange={(v: FlowInputFieldType) =>
                      updateFlowSchemaRow(idx, {
                        type: v,
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="number">number</SelectItem>
                      <SelectItem value="integer">integer</SelectItem>
                      <SelectItem value="string">string</SelectItem>
                      <SelectItem value="boolean">boolean</SelectItem>
                      <SelectItem value="array">array</SelectItem>
                      <SelectItem value="object">object</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 space-y-0.5">
                  <Label className="text-[10px]">default JSON</Label>
                  <Input
                    className="h-8 text-xs font-mono"
                    placeholder="20 или &quot;x&quot;"
                    value={spec.default !== undefined ? JSON.stringify(spec.default) : ""}
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      if (!raw) {
                        updateFlowSchemaRow(idx, { default: undefined });
                        return;
                      }
                      try {
                        updateFlowSchemaRow(idx, { default: JSON.parse(raw) as unknown });
                      } catch {
                        /* не мешаем набору, пока невалидно */
                      }
                    }}
                  />
                </div>
                <label className="sm:col-span-2 flex items-center gap-2 cursor-pointer whitespace-nowrap pb-1">
                  <Checkbox
                    checked={Boolean(spec.required)}
                    onCheckedChange={(c) => updateFlowSchemaRow(idx, { required: c === true })}
                  />
                  <span className="text-[11px]">обязат.</span>
                </label>
                <div className="sm:col-span-1 flex justify-end pb-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-destructive"
                    onClick={() => removeFlowSchemaRow(idx)}
                    aria-label="Удалить поле"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {flowInputSchema.length > 0 && (
        <div className="rounded-md border p-3 space-y-2">
          <Label className="text-xs font-medium">Значения для запуска по схеме</Label>
          <div className="space-y-2">
            {flowInputSchema.map((spec, idx) => {
              const v = previewValueForKey(flowInputSchema, runInputsObject, spec.key, spec.type);
              const strVal =
                spec.type === "boolean"
                  ? ""
                  : spec.type === "array" || spec.type === "object"
                    ? JSON.stringify(v ?? (spec.type === "array" ? [] : {}))
                    : v === null || v === undefined
                      ? ""
                      : String(v);

              return (
                <div key={`val_${spec.key}_${idx}`} className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground" title={spec.key}>
                    {spec.label || spec.key}
                    {spec.required ? <span className="text-destructive ml-0.5">*</span> : null}
                  </span>
                  {spec.type === "boolean" ? (
                    <Checkbox
                      checked={Boolean(v)}
                      onCheckedChange={(c) =>
                        setRunInputsRaw((prev) =>
                          mergeRunInputsKey(prev, spec.key, c === true ? true : false),
                        )
                      }
                    />
                  ) : spec.type === "array" || spec.type === "object" ? (
                    <textarea
                      className="w-full rounded-md border bg-background px-3 py-2 text-xs font-mono"
                      rows={3}
                      value={strVal}
                      onChange={(e) => patchSchemaRunInput(spec.key, e.target.value, spec.type)}
                    />
                  ) : (
                    <Input
                      className="h-8 text-xs font-mono"
                      type={spec.type === "number" || spec.type === "integer" ? "number" : "text"}
                      value={strVal}
                      onChange={(e) => patchSchemaRunInput(spec.key, e.target.value, spec.type)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <Hint text="Один JSON-объект верхнего уровня; допускаются лишние ключи помимо схемы. В sql_query используйте :имя и объект params.">
          <Label className="text-xs">Полный JSON inputs</Label>
        </Hint>
        <textarea
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
          rows={5}
          value={runInputsRaw}
          onChange={(e) => setRunInputsRaw(e.target.value)}
          spellCheck={false}
        />
      </div>
      {runInputsPreview.status === "ok" && runInputsPreview.keys.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Ключи: <span className="font-mono text-foreground">{runInputsPreview.keys.join(", ")}</span>
          {" · "}кратко: <span className="font-mono text-foreground">{formatPreviewSnippet(runInputsPreview.preview)}</span>
        </p>
      )}
      {runInputsPreview.status === "ok" && runInputsPreview.keys.length === 0 && (
        <p className="text-xs text-amber-800 dark:text-amber-200">Объект пустой — в биндингах не будет значений под ключи.</p>
      )}
      {runInputsPreview.status === "invalid" && <p className="text-xs text-destructive">{runInputsPreview.hint}</p>}
    </div>
  );
}

export function DataFlowStudio() {
  const { showNotification } = useToastNotification();
  const [loading, setLoading] = useState(true);
  const [kinds, setKinds] = useState<string[]>([]);
  const [flows, setFlows] = useState<AdminDataFlow[]>([]);
  const [flowId, setFlowId] = useState<number | null>(null);
  const [detail, setDetail] = useState<AdminDataFlow | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<DfNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [blockMode, setBlockMode] = useState(false);
  const [expertMode, setExpertMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [nodeRunState, setNodeRunState] = useState<NodeRunStateMap>({});
  const [runInputsRaw, setRunInputsRaw] = useState(FALLBACK_RUN_INPUTS_JSON);
  const [flowInputSchema, setFlowInputSchema] = useState<FlowInputFieldSpec[]>([]);
  const [traces, setTraces] = useState<Record<string, unknown>[]>([]);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = useMemo(() => nodes.find((n) => n.id === selectedId) ?? null, [nodes, selectedId]);
  const selectedEdge = useMemo(() => edges.find((e) => e.id === selectedEdgeId) ?? null, [edges, selectedEdgeId]);

  const runInputsPreview = useMemo(() => parseRunInputsPreview(runInputsRaw), [runInputsRaw]);
  const runInputsObject = useMemo(() => tryParseRunObject(runInputsRaw), [runInputsRaw]);

  const paramsPanelHeaderTooltip = useMemo(() => {
    if (!selected) return PARAMS_IDLE_HELP_TOOLTIP;
    return (
      <>
        <p>
          Узел <strong>{DF_KIND_LABELS[selected.data.kind] ?? selected.data.kind}</strong> (<code>{selected.data.kind}</code>). Ниже — параметры этого шага пайплайна.
        </p>
        <p className="text-muted-foreground text-[11px]">Связи на холсте задают порядок: данные идут от узла-предка к этому по стрелкам.</p>
      </>
    );
  }, [selected]);

  const patchSchemaRunInput = useCallback((fieldKey: string, rawStr: string, ft: FlowInputFieldType) => {
    if (rawStr.trim() === "") {
      setRunInputsRaw((prev) => mergeRunInputsKey(prev, fieldKey, undefined));
      return;
    }
    const coerced = coercePreviewString(rawStr, ft);
    setRunInputsRaw((prev) => mergeRunInputsKey(prev, fieldKey, coerced));
  }, []);

  const updateFlowSchemaRow = useCallback((index: number, patch: Partial<FlowInputFieldSpec>) => {
    setFlowInputSchema((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }, []);

  const removeFlowSchemaRow = useCallback((index: number) => {
    setFlowInputSchema((rows) => rows.filter((_, i) => i !== index));
  }, []);

  const addFlowSchemaRow = useCallback(() => {
    setFlowInputSchema((rows) => [
      ...rows,
      { key: `field_${rows.length + 1}`, label: "", type: "number", required: false },
    ]);
  }, []);

  const nodeTypes = useMemo(() => ({ df: DfNodeView }), []);

  const reloadFlows = useCallback(async () => {
    const { items } = await adminDataFlowsList();
    setFlows(items);
    if (items.length && flowId == null) {
      setFlowId(items[0].id);
    }
  }, [flowId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const k = await adminDataFlowNodeKinds();
        if (cancelled) return;
        setKinds(k.kinds);
        await reloadFlows();
      } catch {
        if (!cancelled) showNotification("Не удалось загрузить данные схемы подбора", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadFlows, showNotification]);

  useEffect(() => {
    if (flowId == null) return;
    let cancelled = false;
    (async () => {
      try {
        const { flow } = await adminDataFlowGet(flowId);
        if (cancelled) return;
        setDetail(flow);
        const g =
          flow.graph && typeof flow.graph === "object" && !Array.isArray(flow.graph)
            ? (flow.graph as Record<string, unknown>)
            : {};
        const schemaRows = parseFlowInputSchema(g);
        setFlowInputSchema(schemaRows);
        const { nodes: n, edges: e } = graphFromServer(g);
        setNodes(n);
        setEdges(e);
        setSelectedId(n[0]?.id ?? null);
        setSelectedEdgeId(null);
        setTraces([]);
        setRunInputsRaw(seedRunInputsRawFromSchema(schemaRows));
      } catch {
        if (!cancelled) showNotification("Не удалось загрузить поток", "error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [flowId, setEdges, setNodes, showNotification]);

  // Автосохранение с debounce 3с после изменений графа
  useEffect(() => {
    if (!detail || saving) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      void handleSave();
    }, 3000);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  const onConnect = useCallback(
    (c: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...c,
            id: `e_${c.source}_${c.target}`,
            data: {} as DfEdgeData,
            ...DATA_FLOW_EDGE_DEFAULTS,
          },
          eds,
        ),
      ),
    [setEdges],
  );

  const updateSelectedEdge = useCallback((patch: Partial<DfEdgeData>) => {
    if (!selectedEdgeId) return;
    setEdges((eds) =>
      eds.map((e) => {
        if (e.id !== selectedEdgeId) return e;
        const prev = (e.data ?? {}) as DfEdgeData;
        const next: DfEdgeData = { ...prev, ...patch };
        if (next.isDefault) delete next.case;
        const lbl = edgeVisualLabel(next, e.label);
        const nextEdge: Edge = { ...e, data: next };
        if (lbl) {
          nextEdge.label = lbl;
          nextEdge.labelStyle = EDGE_LABEL_STYLE;
          nextEdge.labelBgStyle = EDGE_LABEL_BG_STYLE;
        } else {
          delete nextEdge.label;
          delete nextEdge.labelStyle;
          delete nextEdge.labelBgStyle;
        }
        return nextEdge;
      }),
    );
  }, [selectedEdgeId, setEdges]);

  const removeSelectedEdge = useCallback(() => {
    if (!selectedEdgeId) return;
    setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
  }, [selectedEdgeId, setEdges]);

  const updateSelectedParams = (patch: Record<string, unknown>) => {
    if (!selectedId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedId
          ? { ...n, data: { ...n.data, params: { ...n.data.params, ...patch } } }
          : n,
      ),
    );
  };

  const sourceNodeKind = (sourceId: string) => nodes.find((x) => x.id === sourceId)?.data.kind;

  const addBlock = (kind: string) => {
    setSelectedEdgeId(null);
    const id = `n_${Date.now().toString(36)}`;
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: "df",
        position: { x: 120 + nds.length * 30, y: 140 + nds.length * 12 },
        data: { kind, params: defaultParams(kind) },
      },
    ]);
    setSelectedId(id);
  };

  const removeSelected = () => {
    if (!selectedId) return;
    setSelectedEdgeId(null);
    setEdges((eds) => eds.filter((e) => e.source !== selectedId && e.target !== selectedId));
    setNodes((nds) => nds.filter((n) => n.id !== selectedId));
    setSelectedId(null);
  };

  const handleSave = async (): Promise<boolean> => {
    if (!detail) return false;
    setSaving(true);
    try {
      const graph = buildGraphPayload(nodes, edges, flowInputSchema);
      const { flow } = await adminDataFlowPatch(detail.id, {
        revision: detail.revision,
        name: detail.name,
        graph,
      });
      setDetail(flow);
      showNotification("Сохранено", "success");
      await reloadFlows();
      return true;
    } catch (e: unknown) {
      const st = (e as { response?: { status?: number; data?: { error?: string; flow?: AdminDataFlow } } })?.response;
      if (st?.status === 409 && st.data?.flow) {
        setDetail(st.data.flow);
        showNotification("Конфликт ревизии — перезагрузили версию с сервера", "error");
      } else {
        showNotification(st?.data?.error || "Ошибка сохранения", "error");
      }
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    if (!detail) return;
    const id = detail.id;
    if (!(await handleSave())) return;
    try {
      const v = await adminDataFlowValidate(id);
      if (v.ok) {
        showNotification(v.warnings.length ? `OK: ${v.warnings.join("; ")}` : "Граф валиден", "success");
      } else {
        showNotification(v.errors.join("; "), "error");
      }
    } catch {
      showNotification("Проверка не удалась", "error");
    }
  };

  const handleRun = async () => {
    if (!detail) return;
    const id = detail.id;
    if (!(await handleSave())) return;

    // Помечаем все ноды как "running"
    const allRunning: NodeRunStateMap = {};
    for (const n of nodes) allRunning[n.id] = { status: "running" };
    setNodeRunState(allRunning);
    setRunning(true);

    try {
      let inputs: Record<string, unknown> = {};
      try {
        const parsed = JSON.parse(runInputsRaw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          inputs = parsed as Record<string, unknown>;
        } else {
          showNotification("inputs должен быть JSON-объектом", "error");
          setNodeRunState({});
          setRunning(false);
          return;
        }
      } catch {
        showNotification("Некорректный JSON в inputs", "error");
        setNodeRunState({});
        setRunning(false);
        return;
      }

      const r = await adminDataFlowRun(id, { preview_row_cap: 100, inputs });
      setTraces(r.traces ?? []);

      // Определяем статус каждой ноды из трасс
      const completed = new Set<string>();
      for (const t of (r.traces ?? [])) {
        const nid = t["node_id"] as string | undefined;
        if (nid) completed.add(nid);
      }
      const finalState: NodeRunStateMap = {};
      for (const n of nodes) {
        finalState[n.id] = completed.has(n.id) ? { status: "ok" } : { status: "error", error: "Узел не выполнился" };
      }
      setNodeRunState(finalState);
      showNotification(`Готово, строк: ${r.row_count ?? 0}`, "success");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      showNotification(msg || "Запуск не удался", "error");
      // Помечаем все ноды как ошибочные
      const errState: NodeRunStateMap = {};
      for (const n of nodes) errState[n.id] = { status: "error", error: msg || "Ошибка выполнения" };
      setNodeRunState(errState);
    } finally {
      setRunning(false);
    }
  };

  const handleExportGraph = () => {
    if (!detail) return;
    const payload = buildGraphPayload(nodes, edges, flowInputSchema);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${detail.slug || "data-flow"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportGraph = () => {
    const raw = window.prompt("Вставьте JSON графа (data_flow.v1)");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const schemaRows = parseFlowInputSchema(parsed);
      const { nodes: n, edges: e } = graphFromServer(parsed);
      setFlowInputSchema(schemaRows);
      setNodes(n);
      setEdges(e);
      setSelectedId(n[0]?.id ?? null);
      setSelectedEdgeId(null);
      setRunInputsRaw(seedRunInputsRawFromSchema(schemaRows));
      showNotification("Граф импортирован в редактор (не забудьте Сохранить)", "success");
    } catch {
      showNotification("Некорректный JSON графа", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Загрузка…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="card-industrial">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 flex-wrap">
            <Workflow className="h-5 w-5 shrink-0" />
            <span className="flex-1 min-w-0">Схема Подбора</span>
            <DfPanelHelp
              ariaLabel="Справка: обзор схемы подбора"
              content={STUDIO_OVERVIEW_TOOLTIP}
            />
          </CardTitle>
          <CardDescription>
            Граф шагов pipeline подбора: узлы, связи порядка выполнения, сохранение ревизии и тестовый запуск.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 items-end">
          <div className="min-w-[180px]">
            <Hint text="Выберите активный flow для редактирования, проверки и запуска.">
              <Label>Поток</Label>
            </Hint>
            <Select
              value={flowId != null ? String(flowId) : ""}
              onValueChange={(v) => setFlowId(Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите" />
              </SelectTrigger>
              <SelectContent>
                {flows.map((f) => (
                  <SelectItem key={f.id} value={String(f.id)}>
                    {f.name} ({f.slug})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Hint text="Сохраняет изменения узлов и связей в текущую ревизию потока.">
            <Button type="button" onClick={() => void handleSave()} disabled={saving || !detail}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? "…" : "Сохранить"}
            </Button>
          </Hint>
          <Hint text="Валидирует граф: типы нод, DAG и обязательные root/sink ноды.">
            <Button type="button" variant="outline" onClick={() => void handleValidate()} disabled={!detail}>
              Проверить
            </Button>
          </Hint>
          <Hint text="В API уходит объект inputs из правой панели, когда выбрана нода «Входные параметры» (input).">
            <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => void handleRun()} disabled={!detail || running}>
              {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
              {running ? "Выполнение…" : "Запустить"}
            </Button>
          </Hint>
          {Object.keys(nodeRunState).length > 0 && !running && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setNodeRunState({})} className="text-xs text-muted-foreground">
              Сбросить
            </Button>
          )}
          <Button type="button" variant="outline" onClick={handleExportGraph} disabled={!detail}>
            Экспорт JSON
          </Button>
          <Button type="button" variant="outline" onClick={handleImportGraph} disabled={!detail}>
            Импорт JSON
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="card-industrial xl:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <span>Холст</span>
              <DfPanelHelp compact ariaLabel="Справка: работа с холстом графа" content={CANVAS_HELP_TOOLTIP} />
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[420px] border rounded-lg overflow-hidden bg-slate-50/80">
            <NodeRunStateContext.Provider value={nodeRunState}>
            <RunInputsPreviewContext.Provider value={runInputsPreview}>
              <StudioCanvasUiContext.Provider value={{ blockMode, expertMode }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                defaultEdgeOptions={DATA_FLOW_EDGE_DEFAULTS}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                onNodeClick={(_, n) => {
                  setSelectedId(n.id);
                  setSelectedEdgeId(null);
                }}
                onEdgeClick={(_, ed) => {
                  setSelectedEdgeId(ed.id);
                  setSelectedId(null);
                }}
                onPaneClick={() => setSelectedEdgeId(null)}
                fitView
              >
                <Panel
                  position="top-left"
                  className="m-2 max-w-[min(100%-1rem,16rem)] rounded-md border border-slate-200/90 bg-background/92 px-2.5 py-1.5 text-[10px] leading-snug text-muted-foreground shadow-sm backdrop-blur-[2px]"
                >
                  <span className="font-semibold text-foreground">Поток данных:</span> по стрелкам на связях, от выхода узла (справа) ко входу следующего
                  (слева). Цепочка начинается в <code className="text-[9px] text-foreground/90">input</code>, заканчивается в{" "}
                  <code className="text-[9px] text-foreground/90">output</code>.
                </Panel>
                <Background />
                <Controls />
                <MiniMap />
                <Panel
                  position="top-right"
                  className="m-2 flex flex-col gap-1.5 rounded-md border border-slate-200/90 bg-background/95 px-2 py-2 text-[10px] shadow-sm"
                >
                  <label className="flex cursor-pointer items-center gap-2 text-foreground">
                    <Checkbox checked={blockMode} onCheckedChange={(c) => setBlockMode(c === true)} />
                    Блочный вид
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-foreground">
                    <Checkbox checked={expertMode} onCheckedChange={(c) => setExpertMode(c === true)} />
                    Эксперт (сырой SQL/JSON)
                  </label>
                </Panel>
              </ReactFlow>
              </StudioCanvasUiContext.Provider>
            </RunInputsPreviewContext.Provider>
            </NodeRunStateContext.Provider>
          </CardContent>
          <CardContent className="flex flex-wrap gap-2 pt-0 items-center">
            <div className="w-full flex items-center gap-1">
              <Label className="text-xs text-muted-foreground">Добавить узел</Label>
              <DfPanelHelp
                compact
                ariaLabel="Справка: добавление узлов"
                content={
                  <p className="text-muted-foreground">
                    Каждая кнопка вставляет блок указанного типа на граф. Свяжите узлы линиями: выход справа → вход слева.
                    Порядок выполнения задаётся связями от корня <code>input</code>.
                  </p>
                }
              />
            </div>
            {DF_KIND_CATEGORIES.map(cat => {
              const available = cat.kinds.filter(k => kinds.includes(k));
              if (!available.length) return null;
              return (
                <div key={cat.label} className="w-full">
                  <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1 mt-1">{cat.label}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {available.map(k => (
                      <Button key={k} type="button" size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => addBlock(k)}>
                        {DF_KIND_LABELS[k] ?? k}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="card-industrial xl:flex xl:flex-col xl:max-h-[calc(100vh-10rem)]">
          <CardHeader className="shrink-0">
            <CardTitle className="text-base flex items-center gap-2">
              <span>Параметры узла</span>
              <DfPanelHelp
                compact
                ariaLabel="Справка: панель параметров узла"
                content={paramsPanelHeaderTooltip}
              />
            </CardTitle>
            {selectedEdge ? (
              <CardDescription className="text-xs font-mono">
                Связь: {selectedEdge.source} → {selectedEdge.target}
                {sourceNodeKind(selectedEdge.source) === "switch"
                  ? " · метка ветки для развилки"
                  : ""}
              </CardDescription>
            ) : selected ? (
              <CardDescription>{DF_KIND_LABELS[selected.data.kind] ?? selected.data.kind}</CardDescription>
            ) : (
              <CardDescription className="text-xs">
                Кликните узел или линию на холсте. Для <code className="text-xs">inputs</code> — схема и JSON запуска в этой колонке.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-3 text-sm flex-1 min-h-0 overflow-y-auto xl:overflow-y-auto pr-1">
            {selectedEdge && (
              <div className="space-y-2 pb-3 border-b border-border/60">
                <Hint text="Для узла «Развилка» исходящие связи должны иметь разные case или одна — ветка по умолчанию (если ни один case не совпал).">
                  <Label className="text-xs">Параметры связи (ветка)</Label>
                </Hint>
                <label className="flex cursor-pointer items-center gap-2">
                  <Checkbox
                    checked={Boolean((selectedEdge.data as DfEdgeData | undefined)?.isDefault)}
                    onCheckedChange={(c) =>
                      updateSelectedEdge({
                        isDefault: c === true,
                        ...(c === true ? { case: undefined } : {}),
                      })
                    }
                  />
                  <span className="text-xs">Ветка по умолчанию (isDefault)</span>
                </label>
                {!((selectedEdge.data as DfEdgeData | undefined)?.isDefault) && (
                  <div className="space-y-1">
                    <Label className="text-xs">Метка case</Label>
                    <Input
                      className="h-8 font-mono text-xs"
                      placeholder="например main или alt"
                      maxLength={120}
                      value={String((selectedEdge.data as DfEdgeData | undefined)?.case ?? "")}
                      onChange={(e) =>
                        updateSelectedEdge({ case: e.target.value, isDefault: false })
                      }
                    />
                  </div>
                )}
              </div>
            )}
            {selected && (
              <div className="space-y-1 pb-2 border-b border-border/60">
                <Hint text="Текст на карточке узла на холсте. Если пусто — показывается тип блока (например «SQL-запрос»). Сохраняется в графе вместе с потоком.">
                  <Label className="text-xs">Название на холсте</Label>
                </Hint>
                <Input
                  maxLength={200}
                  className="h-8 text-sm"
                  placeholder={DF_KIND_LABELS[selected.data.kind] ?? selected.data.kind}
                  value={selected.data.label ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    const sid = selected.id;
                    setNodes((nds) => nds.map((n) => (n.id === sid ? { ...n, data: { ...n.data, label: v } } : n)));
                  }}
                />
              </div>
            )}
            {selected?.data.kind === "input" && (
              <FlowInputNodePanel
                nodeId={selected.id}
                flowInputSchema={flowInputSchema}
                addFlowSchemaRow={addFlowSchemaRow}
                updateFlowSchemaRow={updateFlowSchemaRow}
                removeFlowSchemaRow={removeFlowSchemaRow}
                runInputsRaw={runInputsRaw}
                setRunInputsRaw={setRunInputsRaw}
                runInputsPreview={runInputsPreview}
                runInputsObject={runInputsObject}
                patchSchemaRunInput={patchSchemaRunInput}
              />
            )}
            {selected && selected.data.kind === "sql_query" && (
              <>
                {blockMode && !expertMode ? (
                  <p className="text-xs text-muted-foreground rounded-md border border-amber-200/80 bg-amber-50/90 dark:bg-amber-950/30 p-3 leading-relaxed">
                    SQL и сырой JSON параметров скрыты в блочном режиме. Включите на холсте пункт «Эксперт (сырой SQL/JSON)» или отключите «Блочный вид».
                  </p>
                ) : (
                  <>
                <div>
                  <Hint text="Разрешены только SELECT-запросы. Параметры задавайте как :flow, :head и т.д.">
                    <Label>SQL (только SELECT)</Label>
                  </Hint>
                  <textarea
                    className="w-full rounded-md border bg-background px-3 py-2 text-xs"
                    rows={5}
                    value={String(selected.data.params.query ?? "")}
                    onChange={(e) => updateSelectedParams({ query: e.target.value })}
                  />
                </div>
                <div>
                  <Hint text='Имя, по которому результат SQL доступен в биндингах, например {{ n2.candidates }}.'>
                    <Label>outputAlias</Label>
                  </Hint>
                  <Input
                    value={String(selected.data.params.outputAlias ?? "output")}
                    onChange={(e) => updateSelectedParams({ outputAlias: e.target.value })}
                  />
                </div>
                <div>
                  <Hint text='Связка SQL-параметров с контекстом, например {"flow":"{{ inputs.flow_rate }}"}.'>
                    <Label>params (JSON)</Label>
                  </Hint>
                  <textarea
                    className="w-full rounded-md border bg-background px-3 py-2 text-xs"
                    rows={4}
                    value={JSON.stringify(selected.data.params.params ?? {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        updateSelectedParams({ params: parsed });
                      } catch {
                        // no-op while typing invalid json
                      }
                    }}
                  />
                </div>
                  </>
                )}
              </>
            )}
            {selected && selected.data.kind === "switch" && (
              <div className="space-y-2">
                <Hint text="Выражение как в compute (item, inputs, constants idx): должно вернуть строку — ту же метку, что на исходящей связи (case), иначе сработает ребро isDefault, если оно есть.">
                  <Label className="text-xs">expr → метка ветки (строка)</Label>
                </Hint>
                <Input
                  className="h-9 font-mono text-xs"
                  placeholder="str(inputs.get('mode', 'main'))"
                  value={String(selected.data.params.expr ?? "")}
                  onChange={(e) => updateSelectedParams({ expr: e.target.value })}
                />
              </div>
            )}
            {selected && selected.data.kind === "coalesce" && (
              <div className="space-y-2">
                <Hint text="Список id узлов по приоритету: первый с непустым output попадает в результат (часто ветки после развилки).">
                  <Label className="text-xs">from (JSON-массив строк-id)</Label>
                </Hint>
                <textarea
                  className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                  rows={5}
                  value={JSON.stringify(selected.data.params.from ?? [], null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      if (Array.isArray(parsed)) updateSelectedParams({ from: parsed });
                    } catch {
                      /* набор */
                    }
                  }}
                />
              </div>
            )}
            {selected && selected.data.kind === "filter" && (
              <>
                <div>
                  <Hint text="Биндинг источника данных, обычно {{ nX.output }} или alias от sql_query.">
                    <Label>input binding</Label>
                  </Hint>
                  <Input
                    value={String(selected.data.params.input ?? "")}
                    onChange={(e) => updateSelectedParams({ input: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Оператор predicate</Label>
                  <Select
                    value={String(
                      Object.keys(
                        (selected.data.params.predicate as Record<string, unknown> | undefined) ?? { ">=": [] },
                      )[0] ?? ">=",
                    )}
                    onValueChange={(op) => {
                      const pred = (selected.data.params.predicate as Record<string, unknown> | undefined) ?? {};
                      const args = Array.isArray(pred[Object.keys(pred)[0]]) ? pred[Object.keys(pred)[0]] : [{ var: "napor" }, 0];
                      updateSelectedParams({ predicate: { [op]: args } });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FILTER_OPS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Hint text='JsonLogic-выражение, например {">=":[{"var":"napor"},0]}.'>
                    <Label>predicate (JSON)</Label>
                  </Hint>
                  <textarea
                    className="w-full rounded-md border bg-background px-3 py-2 text-xs"
                    rows={4}
                    value={JSON.stringify(selected.data.params.predicate ?? { ">=": [{ var: "napor" }, 0] }, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        updateSelectedParams({ predicate: parsed });
                      } catch {
                        // no-op while typing invalid json
                      }
                    }}
                  />
                </div>
              </>
            )}
            {selected && selected.data.kind === "compute" && (
              <>
                <div>
                  <Label>input binding</Label>
                  <Input
                    value={String(selected.data.params.input ?? "")}
                    onChange={(e) => updateSelectedParams({ input: e.target.value })}
                  />
                </div>
                <div>
                  <Hint text='Формулы новых полей, например {"score":"item.napor - (item.stoimost / 100000)"}.'>
                    <Label>expressions (JSON)</Label>
                  </Hint>
                  <textarea
                    className="w-full rounded-md border bg-background px-3 py-2 text-xs"
                    rows={4}
                    value={JSON.stringify(selected.data.params.expressions ?? { score: "item.napor" }, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        updateSelectedParams({ expressions: parsed });
                      } catch {
                        // no-op while typing invalid json
                      }
                    }}
                  />
                </div>
              </>
            )}
            {selected && selected.data.kind === "rank" && (
              <>
                <div>
                  <Label>input binding</Label>
                  <Input
                    value={String(selected.data.params.input ?? "")}
                    onChange={(e) => updateSelectedParams({ input: e.target.value })}
                  />
                </div>
                <div>
                  <Hint text="Поле сортировки для ранжирования (например score).">
                    <Label>by</Label>
                  </Hint>
                  <Input
                    value={String(selected.data.params.by ?? "")}
                    onChange={(e) => updateSelectedParams({ by: e.target.value })}
                  />
                </div>
                <div>
                  <Label>order</Label>
                  <Select
                    value={String(selected.data.params.order ?? "desc")}
                    onValueChange={(v) => updateSelectedParams({ order: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">asc</SelectItem>
                      <SelectItem value="desc">desc</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>limit</Label>
                  <Input
                    type="number"
                    value={Number(selected.data.params.limit ?? 10)}
                    onChange={(e) => updateSelectedParams({ limit: Number(e.target.value) || 1 })}
                  />
                </div>
              </>
            )}
            {selected && selected.data.kind === "output" && (
              <div className="space-y-2">
                <div>
                  <Hint text="Если указано и даёт массив, ответ потока — список записей насосов (как из get_matching_pumps). Иначе используйте map.">
                    <Label>rows (биндинг)</Label>
                  </Hint>
                  <Input
                    className="font-mono text-xs"
                    value={String(selected.data.params.rows ?? "")}
                    onChange={(e) => updateSelectedParams({ rows: e.target.value })}
                  />
                </div>
                <div>
                  <Hint text='Финальная проекция-объект, если rows пусто: {"candidates":"{{ n5.output }}"}.'>
                    <Label>map (JSON)</Label>
                  </Hint>
                  <textarea
                    className="w-full rounded-md border bg-background px-3 py-2 text-xs"
                    rows={4}
                    value={JSON.stringify(selected.data.params.map ?? { candidates: "{{ n5.output }}" }, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        updateSelectedParams({ map: parsed });
                      } catch {
                        // no-op while typing invalid JSON
                      }
                    }}
                  />
                </div>
              </div>
            )}
            {selected && isStationKind(selected.data.kind) && selected.data.kind !== "station_calculate" && (
              <div className="space-y-3 pt-1 pb-2 border-b border-border/60">
                <div className="flex items-center gap-1.5">
                  {STATION_NODE_META[selected.data.kind] && (
                    <span
                      className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase leading-tight ${STATION_NODE_META[selected.data.kind].bg} text-foreground/80`}
                    >
                      {STATION_NODE_META[selected.data.kind].short}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {STATION_NODE_META[selected.data.kind]?.desc ?? selected.data.kind}
                  </span>
                </div>
                <div>
                  <Hint text="Биндинг источника данных, обычно {{ nX.output }}.">
                    <Label className="text-xs">input binding</Label>
                  </Hint>
                  <Input
                    className="h-8 text-xs font-mono"
                    value={String(selected.data.params.input ?? "")}
                    onChange={(e) => updateSelectedParams({ input: e.target.value })}
                  />
                </div>
                {selected.data.kind === "station_select_filter" && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selected.data.params.enabled !== false}
                      onCheckedChange={(c) => updateSelectedParams({ enabled: c === true ? true : false })}
                    />
                    <span className="text-xs text-foreground">Фильтр включён</span>
                  </label>
                )}
                {selected.data.kind === "station_select_predokh" && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selected.data.params.enabled !== false}
                      onCheckedChange={(c) => updateSelectedParams({ enabled: c === true ? true : false })}
                    />
                    <span className="text-xs text-foreground">Предохранительный клапан включён</span>
                  </label>
                )}
                {selected.data.kind === "station_select_vibroopora" && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selected.data.params.enabled !== false}
                      onCheckedChange={(c) => updateSelectedParams({ enabled: c === true ? true : false })}
                    />
                    <span className="text-xs text-foreground">Виброопоры включены</span>
                  </label>
                )}
                {selected.data.kind === "station_aggregate" && (
                  <div className="rounded-md border bg-muted/20 p-2">
                    <span className="text-xs font-medium text-foreground">Сводка станции</span>
                    <pre className="mt-1 text-[10px] font-mono text-muted-foreground whitespace-pre-wrap">
                      {(() => {
                        const s = selected.data.params.summary;
                        if (s && typeof s === "object") {
                          return JSON.stringify(s, null, 2);
                        }
                        const nodes = selected.data.params.nodes;
                        if (Array.isArray(nodes) && nodes.length > 0) {
                          return `${nodes.length} компонентов`;
                        }
                        return "Укажите компоненты станции (readonly)";
                      })()}
                    </pre>
                  </div>
                )}
              </div>
            )}
            {selected && selected.data.kind.startsWith("station_") && (
              <StationNodeForm
                kind={selected.data.kind}
                params={selected.data.params}
                onChange={(newParams) => {
                  setNodes((nds) =>
                    nds.map((n) =>
                      n.id === selected.id ? { ...n, data: { ...n.data, params: newParams } } : n
                    )
                  );
                }}
              />
            )}
            {selected &&
              [
                "map_rows",
                "group_by",
                "aggregate",
                "curve_fit",
                "curve_fit_validate",
                "matching_run",
                "station_calculate",
                "series_generate",
                "series_filter",
                "interpolate",
                "join",
                "project",
              ].includes(selected.data.kind) && (
                <div className="space-y-2">
                  <Hint text="Параметры узла в JSON. Допускаются биндинги {{ ... }} для полей input/source/left/right/query_x и др.">
                    <Label>params (JSON)</Label>
                  </Hint>
                  <textarea
                    className="w-full rounded-md border bg-background px-3 py-2 text-xs font-mono"
                    rows={10}
                    value={JSON.stringify(selected.data.params ?? {}, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        updateSelectedParams(parsed as Record<string, unknown>);
                      } catch {
                        // no-op while typing invalid json
                      }
                    }}
                  />
                </div>
              )}
            {selected && (
              <Button type="button" variant="destructive" size="sm" onClick={removeSelected}>
                Удалить узел
              </Button>
            )}
            {selectedEdge && (
              <Button type="button" variant="destructive" size="sm" onClick={removeSelectedEdge}>
                Удалить связь
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {(() => {
        const sinkOut = finalSinkOutputPayload(traces);
        if (sinkOut === undefined) return null;
        return (
          <Card className="card-industrial">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <span>Результат запуска</span>
                <DfPanelHelp
                  compact
                  ariaLabel="Справка: результат запуска потока"
                  content={RUN_RESULT_HELP_TOOLTIP}
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-60 font-mono">
                {JSON.stringify(sinkOut, null, 2)}
              </pre>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}
