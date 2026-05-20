import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeChange,
  type NodeProps,
  type ReactFlowInstance,
  type Connection,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToastNotification } from "@/hooks/use-toast-notification";
import { ensureCsrf } from "@/lib/csrf";
import {
  adminExtDesignAddColumn,
  adminExtDesignAlterColumnType,
  adminExtDesignCatalog,
  adminExtDesignCreateIndex,
  adminExtDesignCreateTable,
  adminExtDesignDropColumn,
  adminExtDesignDropIndex,
  adminExtDesignDropTable,
  adminExtDesignPortFullPublic,
  adminExtDesignProjectApply,
  adminExtDesignProjectGet,
  adminExtDesignProjectPatch,
  adminExtDesignProjectsList,
  adminExtDesignRenameColumn,
  adminExtDesignAddFk,
  adminPublicDesignAddColumn,
  adminPublicDesignAlterColumnType,
  adminPublicDesignCatalog,
  adminPublicDesignCreateIndex,
  adminPublicDesignCreateTable,
  adminPublicDesignDropColumn,
  adminPublicDesignDropIndex,
  adminPublicDesignDropTable,
  adminPublicDesignRenameColumn,
  adminPublicDesignAddFk,
  type ExtDesignCatalog,
  type ExtSchemaBlueprint,
  type ExtSchemaProjectDetail,
  adminWhoami,
} from "@/lib/api";

type LayerFilter = "all" | "core" | "ext" | "public";
type RuntimeSchemaTarget = "ext" | "public";

function TableFlowNode({ data }: NodeProps) {
  const layer = String(data.layer ?? "");
  const borderPx = 2;
  return (
    <div
      className="relative rounded-md border-2 bg-card px-2 py-1.5 text-left shadow-sm min-w-[140px]"
      style={{
        borderColor: layer === "ext" ? "#0ea5e9" : layer === "public" ? "#22c55e" : "#64748b",
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="nodrag nopan !bg-primary !w-2 !h-2 !min-h-2 !min-w-2 !border-0 !p-0 !m-0"
        style={{ left: "50%", top: 0, transform: `translate(-50%, calc(-50% - ${borderPx}px))` }}
      />
      <div className="text-xs font-semibold text-primary leading-tight">{String(data.label)}</div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{layer}</div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="nodrag nopan !bg-primary !w-2 !h-2 !min-h-2 !min-w-2 !border-0 !p-0 !m-0"
        style={{ left: "50%", bottom: 0, transform: `translate(-50%, calc(50% + ${borderPx}px))` }}
      />
    </div>
  );
}

const flowNodeTypes = { tableNode: TableFlowNode };

/** Базовый размер узла для границ полотна / мини-карты, пока DOM не измерен. */
const FLOW_NODE_LAYOUT_W = 200;
const FLOW_NODE_LAYOUT_H = 92;

/** Подсветка узлов/рёбер при непустом поиске: совпадения непрозрачны, остальное приглушено. */
function applyTableSearchToNodes(nodes: Node[], query: string): Node[] {
  const q = query.trim().toLowerCase();
  if (!q) return nodes;
  return nodes.map((n) => {
    const label = String(n.data?.label ?? "");
    const match = n.id.toLowerCase().includes(q) || label.toLowerCase().includes(q);
    const prev = n.style && typeof n.style === "object" && !Array.isArray(n.style) ? n.style : {};
    return {
      ...n,
      style: { ...prev, opacity: match ? 1 : 0.22 },
    };
  });
}

function applyTableSearchToEdges(edges: Edge[], nodes: Node[], query: string): Edge[] {
  const q = query.trim().toLowerCase();
  if (!q) return edges;
  const matchId = (id: string) => {
    const n = nodes.find((x) => x.id === id);
    if (!n) return false;
    const label = String(n.data?.label ?? "");
    return n.id.toLowerCase().includes(q) || label.toLowerCase().includes(q);
  };
  return edges.map((e) => {
    const both = matchId(e.source) && matchId(e.target);
    const prev = e.style && typeof e.style === "object" && !Array.isArray(e.style) ? e.style : {};
    return {
      ...e,
      style: { ...prev, opacity: both ? 1 : 0.12 },
    };
  });
}

function apiErrorMessage(e: unknown): string {
  const ax = e as { response?: { data?: { error?: string; detail?: unknown } } };
  const d = ax?.response?.data;
  if (d && typeof d === "object") {
    if (typeof d.error === "string") return d.error;
    if (typeof d.detail === "string") return d.detail;
    if (Array.isArray(d.detail)) {
      return d.detail.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join("; ");
    }
  }
  if (e instanceof Error) return e.message;
  return "Ошибка запроса";
}

const emptyBlueprint = (): ExtSchemaBlueprint => ({
  version: 1,
  layers: {
    core: { nodes: [], edges: [] },
    ext: { nodes: [], edges: [] },
    public: { nodes: [], edges: [] },
  },
  layout: { nodePositions: {} },
});

type BlueprintColumn = {
  name: string;
  pg_type?: string;
  type?: string;
  nullable?: boolean;
  primary_key?: boolean;
};

const PG_TYPE_OPTIONS = [
  "text",
  "integer",
  "bigint",
  "smallint",
  "boolean",
  "timestamptz",
  "numeric",
  "uuid",
  "jsonb",
  "double precision",
  "real",
  "varchar",
  "char",
  "serial",
  "bigserial",
] as const;

function normalizePgTypeForSelect(raw: string): string {
  const r = raw.toLowerCase();
  const aliases: Record<string, string> = {
    int4: "integer",
    int8: "bigint",
    int2: "smallint",
    float8: "double precision",
    float4: "real",
    bool: "boolean",
    timestamp: "timestamptz",
    timestamptz: "timestamptz",
  };
  const mapped = aliases[r] || r;
  return PG_TYPE_OPTIONS.includes(mapped as (typeof PG_TYPE_OPTIONS)[number]) ? mapped : "text";
}

function catalogToTableMap(cat: ExtDesignCatalog): Record<string, ExtDesignCatalog["tables"][number]> {
  const map: Record<string, ExtDesignCatalog["tables"][number]> = {};
  for (const t of cat.tables || []) map[t.name] = t;
  return map;
}

function catalogTableToBlueprintColumns(t: ExtDesignCatalog["tables"][number]): BlueprintColumn[] {
  return (t.columns || []).map((c) => {
    const raw = (c.udt_name || c.data_type || "text").toLowerCase();
    return {
      name: c.name,
      pg_type: normalizePgTypeForSelect(raw),
      nullable: c.nullable,
      primary_key: c.name === "id",
    };
  });
}

function catalogColumnUdt(cat: ExtDesignCatalog | null, table: string, column: string): string {
  const t = cat?.tables?.find((x) => x.name === table);
  const c = t?.columns?.find((x) => x.name === column);
  return String(c?.udt_name || c?.data_type || "text").toLowerCase();
}

function resolveColumnPgUdt(
  cat: ExtDesignCatalog | null,
  table: string,
  colName: string,
  fallbackBlueprintCols: BlueprintColumn[],
): string {
  const u = catalogColumnUdt(cat, table, colName);
  const t = cat?.tables?.find((x) => x.name === table);
  if (t?.columns?.some((c) => c.name === colName)) return u;
  const bc = fallbackBlueprintCols.find((c) => c.name === colName);
  return String(bc?.pg_type || bc?.type || "text").toLowerCase();
}

/** Колонки родительской таблицы, на которые разрешено ссылаться в PostgreSQL (PK / UNIQUE из каталога; иначе все колонки таблицы). */
function referenceableColumnNames(cat: ExtDesignCatalog | null, table: string): string[] {
  const t = cat?.tables?.find((x) => x.name === table);
  const names = new Set<string>();
  if (t?.columns?.some((c) => c.name === "id")) names.add("id");
  for (const uq of cat?.unique_constraints || []) {
    if (uq.table !== table || !uq.columns || uq.columns.length !== 1) continue;
    names.add(uq.columns[0]);
  }
  if (names.size === 0 && t?.columns?.length) {
    return [...t.columns.map((c) => c.name)].sort();
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

function normalizeUdt(udt: string): string {
  const u = udt.toLowerCase();
  const map: Record<string, string> = {
    int4: "integer",
    int8: "bigint",
    int2: "smallint",
    float8: "double precision",
    float4: "real",
    bool: "boolean",
  };
  return map[u] || u;
}

/** Допустимость типов для FK (упрощённо; окончательно проверяет PostgreSQL). */
function pgTypesFkCompatible(childUdt: string, parentUdt: string): boolean {
  const a = normalizeUdt(childUdt);
  const b = normalizeUdt(parentUdt);
  if (a === b) return true;
  const ints = new Set(["integer", "bigint", "smallint", "serial", "bigserial"]);
  if (ints.has(a) && ints.has(b)) return true;
  const textlike = new Set(["text", "varchar", "char", "bpchar"]);
  if (textlike.has(a) && textlike.has(b)) return true;
  return false;
}

function runtimeColumnsForTable(
  blueprint: ExtSchemaBlueprint,
  layer: RuntimeSchemaTarget,
  tableId: string,
  catByTable: Record<string, ExtDesignCatalog["tables"][number]>,
): BlueprintColumn[] {
  const t = catByTable[tableId];
  if (t?.columns?.length) return catalogTableToBlueprintColumns(t);
  const layers = blueprint.layers as
    | Record<
        string,
        {
          nodes?: Array<{
            id?: string;
            name?: string;
            columns?: BlueprintColumn[];
            fields?: BlueprintColumn[];
          }>;
        }
      >
    | undefined;
  const bucket = layers?.[layer];
  const node = bucket?.nodes?.find((n) => String(n.id || n.name) === tableId);
  const raw = (node?.columns || node?.fields || []) as BlueprintColumn[];
  return raw.map((c) => ({ ...c, name: String(c.name ?? "") }));
}

function mergeRuntimeNodeColumnsInBlueprint(
  blueprint: ExtSchemaBlueprint,
  runtimeLayer: RuntimeSchemaTarget,
  tableId: string,
  columns: BlueprintColumn[],
): ExtSchemaBlueprint {
  const next = JSON.parse(JSON.stringify(blueprint)) as ExtSchemaBlueprint;
  const layers = (next.layers as Record<string, { nodes?: Array<Record<string, unknown>> }>) || {};
  const bucket = layers[runtimeLayer] || { nodes: [] };
  const nodes = [...(bucket.nodes || [])];
  const i = nodes.findIndex((n) => String(n.id || n.name) === tableId);
  if (i < 0) return next;
  const prev = nodes[i];
  nodes[i] = { ...prev, columns };
  delete (nodes[i] as { fields?: unknown }).fields;
  bucket.nodes = nodes;
  layers[runtimeLayer] = bucket;
  next.layers = layers;
  return next;
}

function updateRuntimeNodeColumnAt(
  blueprint: ExtSchemaBlueprint,
  runtimeLayer: RuntimeSchemaTarget,
  tableId: string,
  index: number,
  patch: Partial<BlueprintColumn>,
): ExtSchemaBlueprint {
  const next = JSON.parse(JSON.stringify(blueprint)) as ExtSchemaBlueprint;
  const layers = (next.layers as Record<string, { nodes?: Array<Record<string, unknown>> }>) || {};
  const bucket = layers[runtimeLayer] || { nodes: [] };
  const nodes = [...(bucket.nodes || [])];
  const i = nodes.findIndex((n) => String(n.id || n.name) === tableId);
  if (i < 0) return next;
  const prev = nodes[i];
  const raw = (prev.columns || prev.fields || []) as BlueprintColumn[];
  const cols = raw.map((c) => ({ ...c, name: String((c as BlueprintColumn).name) }));
  if (cols[index] === undefined) return next;
  cols[index] = { ...cols[index], ...patch };
  nodes[i] = { ...prev, columns: cols };
  delete (nodes[i] as { fields?: unknown }).fields;
  bucket.nodes = nodes;
  layers[runtimeLayer] = bucket;
  next.layers = layers;
  return next;
}

function removeRuntimeNodeColumnAt(
  blueprint: ExtSchemaBlueprint,
  runtimeLayer: RuntimeSchemaTarget,
  tableId: string,
  index: number,
): ExtSchemaBlueprint {
  const next = JSON.parse(JSON.stringify(blueprint)) as ExtSchemaBlueprint;
  const layers = (next.layers as Record<string, { nodes?: Array<Record<string, unknown>> }>) || {};
  const bucket = layers[runtimeLayer] || { nodes: [] };
  const nodes = [...(bucket.nodes || [])];
  const i = nodes.findIndex((n) => String(n.id || n.name) === tableId);
  if (i < 0) return next;
  const prev = nodes[i];
  const raw = (prev.columns || prev.fields || []) as BlueprintColumn[];
  const cols = raw.filter((_, j) => j !== index);
  nodes[i] = { ...prev, columns: cols };
  delete (nodes[i] as { fields?: unknown }).fields;
  bucket.nodes = nodes;
  layers[runtimeLayer] = bucket;
  next.layers = layers;
  return next;
}

function appendRuntimeNodeColumn(
  blueprint: ExtSchemaBlueprint,
  runtimeLayer: RuntimeSchemaTarget,
  tableId: string,
  col: BlueprintColumn,
): ExtSchemaBlueprint {
  const next = JSON.parse(JSON.stringify(blueprint)) as ExtSchemaBlueprint;
  const layers = (next.layers as Record<string, { nodes?: Array<Record<string, unknown>> }>) || {};
  const bucket = layers[runtimeLayer] || { nodes: [] };
  const nodes = [...(bucket.nodes || [])];
  const i = nodes.findIndex((n) => String(n.id || n.name) === tableId);
  if (i < 0) return next;
  const prev = nodes[i];
  const raw = (prev.columns || prev.fields || []) as BlueprintColumn[];
  const cols = [...raw.map((c) => ({ ...(c as BlueprintColumn) })), col];
  nodes[i] = { ...prev, columns: cols };
  delete (nodes[i] as { fields?: unknown }).fields;
  bucket.nodes = nodes;
  layers[runtimeLayer] = bucket;
  next.layers = layers;
  return next;
}

function mergeExtNodeColumnsInBlueprint(
  blueprint: ExtSchemaBlueprint,
  tableId: string,
  columns: BlueprintColumn[],
): ExtSchemaBlueprint {
  return mergeRuntimeNodeColumnsInBlueprint(blueprint, "ext", tableId, columns);
}

function updateExtNodeColumnAt(
  blueprint: ExtSchemaBlueprint,
  tableId: string,
  index: number,
  patch: Partial<BlueprintColumn>,
): ExtSchemaBlueprint {
  return updateRuntimeNodeColumnAt(blueprint, "ext", tableId, index, patch);
}

function removeExtNodeColumnAt(blueprint: ExtSchemaBlueprint, tableId: string, index: number): ExtSchemaBlueprint {
  return removeRuntimeNodeColumnAt(blueprint, "ext", tableId, index);
}

function appendExtNodeColumn(blueprint: ExtSchemaBlueprint, tableId: string, col: BlueprintColumn): ExtSchemaBlueprint {
  return appendRuntimeNodeColumn(blueprint, "ext", tableId, col);
}

function blueprintToFlow(
  blueprint: ExtSchemaBlueprint | null | undefined,
  layerFilter: LayerFilter,
): { nodes: Node[]; edges: Edge[] } {
  const bp = blueprint && typeof blueprint === "object" ? blueprint : emptyBlueprint();
  const layers = (bp.layers as Record<string, { nodes?: unknown[]; edges?: unknown[] }>) || {};
  const layout = (
    (bp.layout as { nodePositions?: Record<string, { x: number; y: number }> }) || {}
  ).nodePositions || {};

  type RawNode = {
    id?: string;
    name?: string;
    label?: string;
    layer?: string;
    managed?: boolean;
    fields?: unknown[];
    columns?: unknown[];
  };
  type RawEdge = { from?: string; to?: string; field?: string; layer?: string };

  const rawNodes: Array<RawNode & { _layer: string }> = [];
  const rawEdges: Array<RawEdge & { _layer?: string }> = [];

  if (layerFilter === "all" || layerFilter === "core") {
    const c = layers.core || { nodes: [], edges: [] };
    (c.nodes || []).forEach((n) =>
      rawNodes.push({ ...(n as RawNode), _layer: "core" }),
    );
    (c.edges || []).forEach((e) =>
      rawEdges.push({ ...(e as RawEdge), _layer: "core" }),
    );
  }
  if (layerFilter === "all" || layerFilter === "ext") {
    const ex = layers.ext || { nodes: [], edges: [] };
    (ex.nodes || []).forEach((n) =>
      rawNodes.push({ ...(n as RawNode), _layer: "ext" }),
    );
    (ex.edges || []).forEach((e) =>
      rawEdges.push({ ...(e as RawEdge), _layer: "ext" }),
    );
  }
  if (layerFilter === "all" || layerFilter === "public") {
    const pub = layers.public || { nodes: [], edges: [] };
    (pub.nodes || []).forEach((n) =>
      rawNodes.push({ ...(n as RawNode), _layer: "public" }),
    );
    (pub.edges || []).forEach((e) =>
      rawEdges.push({ ...(e as RawEdge), _layer: "public" }),
    );
  }

  const seen = new Set<string>();
  const nodes: Node[] = [];
  for (const n of rawNodes) {
    const id = String(n.id || n.name || "");
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const pos = layout[id] || { x: 0, y: 0 };
    const layer = n._layer || n.layer || "core";
    nodes.push({
      id,
      type: "tableNode",
      position: pos,
      style: { width: FLOW_NODE_LAYOUT_W, minHeight: FLOW_NODE_LAYOUT_H },
      data: {
        label: String(n.label || id),
        layer,
        managed: n.managed,
        fields: (n.fields || n.columns || []) as Array<Record<string, unknown>>,
      },
    });
  }

  const ids = new Set(nodes.map((x) => x.id));
  /** В чертеже from = таблица с FK (ребёнок), to = referenced (родитель). Source снизу, target сверху — ребро идёт родитель → ребёнок. */
  const edges: Edge[] = rawEdges
    .filter((e) => e.from && e.to && ids.has(e.from) && ids.has(e.to))
    .map((e, i) => ({
      id: `e-${i}-${e.from}-${e.to}-${e.field || ""}`,
      source: e.to!,
      target: e.from!,
      label: String(e.field || ""),
    }));

  return { nodes, edges };
}

function applyLayoutToBlueprint(
  blueprint: ExtSchemaBlueprint,
  nodeId: string,
  position: { x: number; y: number },
): ExtSchemaBlueprint {
  const next = JSON.parse(JSON.stringify(blueprint)) as ExtSchemaBlueprint;
  const layout = (next.layout as Record<string, Record<string, { x: number; y: number }>>) || {};
  if (!layout.nodePositions) layout.nodePositions = {};
  layout.nodePositions[nodeId] = position;
  next.layout = layout;
  return next;
}

const DAGRE_NODE_W = 200;
const DAGRE_NODE_H = 88;

function dedupeFkPairs(
  fks: Array<{ from_table: string; to_table: string }>,
): Array<{ from_table: string; to_table: string }> {
  const seen = new Set<string>();
  const out: Array<{ from_table: string; to_table: string }> = [];
  for (const fk of fks) {
    const k = `${fk.from_table}\0${fk.to_table}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(fk);
  }
  return out;
}

/** Плотная сетка внутри одной группы таблиц (нет рёбер или вырожденный Dagre). */
function compactComponentGrid(ids: string[]): Record<string, { x: number; y: number }> {
  const sorted = [...ids].sort((a, b) => a.localeCompare(b));
  const n = sorted.length;
  if (n === 0) return {};
  const cols = Math.max(1, Math.ceil(Math.sqrt(n)));
  const DX = 224;
  const DY = 118;
  const pos: Record<string, { x: number; y: number }> = {};
  sorted.forEach((id, j) => {
    pos[id] = { x: (j % cols) * DX, y: Math.floor(j / cols) * DY };
  });
  return pos;
}

function bboxOfLayout(
  pos: Record<string, { x: number; y: number }>,
  ids: string[],
  nodeW: number,
  nodeH: number,
): { minX: number; minY: number; width: number; height: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxR = -Infinity;
  let maxB = -Infinity;
  for (const id of ids) {
    const p = pos[id];
    if (!p) continue;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxR = Math.max(maxR, p.x + nodeW);
    maxB = Math.max(maxB, p.y + nodeH);
  }
  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, width: nodeW, height: nodeH };
  return { minX, minY, width: maxR - minX, height: maxB - minY };
}

/** Связные компоненты по FK (неориентированно). */
function connectedComponentsFromEdges(
  nodeIds: string[],
  undirected: Array<{ a: string; b: string }>,
): string[][] {
  const idSet = new Set(nodeIds);
  const adj = new Map<string, string[]>();
  for (const id of nodeIds) adj.set(id, []);
  for (const { a, b } of undirected) {
    if (!idSet.has(a) || !idSet.has(b)) continue;
    adj.get(a)!.push(b);
    adj.get(b)!.push(a);
  }
  const seen = new Set<string>();
  const out: string[][] = [];
  for (const start of nodeIds) {
    if (seen.has(start)) continue;
    const comp: string[] = [];
    const st = [start];
    seen.add(start);
    while (st.length) {
      const u = st.pop()!;
      comp.push(u);
      for (const v of adj.get(u) || []) {
        if (!seen.has(v)) {
          seen.add(v);
          st.push(v);
        }
      }
    }
    out.push(comp);
  }
  return out;
}

/** Таблицы, участвующие хотя бы в одной FK паре на диаграмме. */
function nodesIncidentToFkKeys(
  orderedNodeIds: string[],
  deduped: Array<{ from_table: string; to_table: string }>,
): Set<string> {
  const idSet = new Set(orderedNodeIds);
  const inc = new Set<string>();
  for (const fk of deduped) {
    if (fk.from_table === fk.to_table) continue;
    if (!idSet.has(fk.from_table) || !idSet.has(fk.to_table)) continue;
    inc.add(fk.from_table);
    inc.add(fk.to_table);
  }
  return inc;
}

function splitIncidentIsolated(
  orderedNodeIds: string[],
  incident: Set<string>,
): { incidentNodes: string[]; isolatedNodes: string[] } {
  const incidentNodes: string[] = [];
  const isolatedNodes: string[] = [];
  for (const id of orderedNodeIds) {
    if (incident.has(id)) incidentNodes.push(id);
    else isolatedNodes.push(id);
  }
  return { incidentNodes, isolatedNodes };
}

/** Dagre кладёт все узлы в один ранг — визуально одна линия; тогда лучше сетка. */
function dagreLayoutIsDegenerateLine(
  pos: Record<string, { x: number; y: number }>,
  ids: string[],
): boolean {
  if (ids.length < 3) return false;
  const ys = ids.map((id) => pos[id]?.y).filter((y): y is number => typeof y === "number");
  if (ys.length !== ids.length) return true;
  return Math.max(...ys) - Math.min(...ys) <= 8;
}

/** Рёбра для Dagre: referenced (родитель) → referencing (ребёнок), чтобы в TB родитель был выше. */
function computeDagrePositions(
  nodeIds: string[],
  logicalEdges: Array<{ source: string; target: string }>,
): Record<string, { x: number; y: number }> {
  const idSet = new Set(nodeIds);
  const g = new dagre.graphlib.Graph({ compound: false });
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: "TB",
    ranker: "network-simplex",
    nodesep: 34,
    ranksep: 46,
    marginx: 28,
    marginy: 28,
    edgesep: 12,
  });

  nodeIds.forEach((id) => g.setNode(id, { width: DAGRE_NODE_W, height: DAGRE_NODE_H }));

  const seenE = new Set<string>();
  for (const e of logicalEdges) {
    if (!idSet.has(e.source) || !idSet.has(e.target)) continue;
    const key = `${e.source}\0${e.target}`;
    if (seenE.has(key)) continue;
    seenE.add(key);
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  const pos: Record<string, { x: number; y: number }> = {};
  for (const id of nodeIds) {
    const n = g.node(id);
    if (n && typeof n.x === "number" && typeof n.y === "number") {
      pos[id] = { x: n.x - DAGRE_NODE_W / 2, y: n.y - DAGRE_NODE_H / 2 };
    }
  }
  return pos;
}

/**
 * Раскладка по FK: каждый связный кластер таблиц — Dagre (TB), кластеры упаковываются в ряды;
 * без FK у таблицы — колонка справа; совсем без рёбер — плотная квадратная сетка.
 */
function applyFkGraphLayoutToBlueprint(
  blueprint: ExtSchemaBlueprint,
  orderedNodeIds: string[],
  fkList: Array<{ from_table: string; to_table: string }>,
): ExtSchemaBlueprint {
  const next = JSON.parse(JSON.stringify(blueprint)) as ExtSchemaBlueprint;
  const layout = (next.layout as { nodePositions?: Record<string, { x: number; y: number }> }) || {};
  if (!layout.nodePositions) layout.nodePositions = {};

  const deduped = dedupeFkPairs(fkList);
  const idSet = new Set(orderedNodeIds);
  const logical = deduped
    .filter(
      (fk) =>
        fk.from_table !== fk.to_table &&
        idSet.has(fk.from_table) &&
        idSet.has(fk.to_table),
    )
    .map((fk) => ({ source: fk.to_table, target: fk.from_table }));

  const incident = nodesIncidentToFkKeys(orderedNodeIds, deduped);
  const { incidentNodes, isolatedNodes } = splitIncidentIsolated(orderedNodeIds, incident);
  const connSet = new Set(incidentNodes);

  const positions: Record<string, { x: number; y: number }> = {};
  const ISOLATE_COL_GAP = 64;
  const ISOLATED_ROW_STEP = 112;
  const COMPONENT_GAP_X = 72;
  const COMPONENT_GAP_Y = 52;
  const MAX_PACK_ROW_W = 2700;
  const nodeFootprintW = DAGRE_NODE_W;
  const nodeFootprintH = DAGRE_NODE_H;

  if (incidentNodes.length === 0) {
    Object.assign(positions, compactComponentGrid(orderedNodeIds));
  } else {
    const logicalOnConnected = logical.filter((e) => connSet.has(e.source) && connSet.has(e.target));
    const undirected = logicalOnConnected.map((e) => ({ a: e.source, b: e.target }));
    const components = connectedComponentsFromEdges(incidentNodes, undirected);
    components.sort(
      (a, b) => b.length - a.length || (a[0] || "").localeCompare(b[0] || ""),
    );

    let packX = 0;
    let packY = 0;
    let rowH = 0;

    for (const comp of components) {
      const compSet = new Set(comp);
      const edgesIn = logicalOnConnected.filter((e) => compSet.has(e.source) && compSet.has(e.target));
      let local: Record<string, { x: number; y: number }>;
      if (edgesIn.length === 0) {
        local = compactComponentGrid(comp);
      } else {
        const dagrePos = computeDagrePositions(comp, edgesIn);
        const complete =
          comp.length > 0 && comp.every((id) => Object.prototype.hasOwnProperty.call(dagrePos, id));
        const useDagre =
          complete && comp.length > 0 && !dagreLayoutIsDegenerateLine(dagrePos, comp);
        local = useDagre ? dagrePos : compactComponentGrid(comp);
      }
      const bb = bboxOfLayout(local, comp, nodeFootprintW, nodeFootprintH);
      if (packX > 0 && packX + bb.width > MAX_PACK_ROW_W) {
        packY += rowH + COMPONENT_GAP_Y;
        packX = 0;
        rowH = 0;
      }
      const dx = packX - bb.minX;
      const dy = packY - bb.minY;
      for (const id of comp) {
        const p = local[id];
        if (p) positions[id] = { x: p.x + dx, y: p.y + dy };
      }
      packX += bb.width + COMPONENT_GAP_X;
      rowH = Math.max(rowH, bb.height);
    }

    if (isolatedNodes.length > 0) {
      let maxRight = 0;
      let minY = Infinity;
      for (const id of incidentNodes) {
        const p = positions[id];
        if (p) {
          maxRight = Math.max(maxRight, p.x + nodeFootprintW);
          minY = Math.min(minY, p.y);
        }
      }
      if (!Number.isFinite(minY)) minY = 0;
      const colX = maxRight + ISOLATE_COL_GAP;
      const isol = [...isolatedNodes].sort((a, b) => a.localeCompare(b));
      isol.forEach((id, i) => {
        positions[id] = { x: colX, y: minY + i * ISOLATED_ROW_STEP };
      });
    }
  }

  for (const id of orderedNodeIds) {
    const p = positions[id];
    if (p) layout.nodePositions[id] = p;
  }
  next.layout = layout;
  return next;
}

/** Подставляет слой ext из актуального каталога PostgreSQL, сохраняя core и прочие поля чертежа. */
function mergeCatalogIntoBlueprintExt(
  cat: ExtDesignCatalog,
  previous: ExtSchemaBlueprint,
): ExtSchemaBlueprint {
  const extNodes = (cat.tables || []).map((t) => ({
    id: t.name,
    layer: "ext",
    label: t.name,
    columns: (t.columns || []).map((c) => ({
      name: c.name,
      pg_type: normalizePgTypeForSelect(String(c.udt_name || c.data_type || "text")),
      nullable: c.nullable,
      primary_key: c.name === "id",
    })),
  }));
  const extEdges = (cat.foreign_keys || []).map((fk) => ({
    from: fk.from_table,
    to: fk.to_table,
    field: fk.from_column,
    layer: "ext",
    constraint_name: fk.constraint_name,
  }));
  const extIds = extNodes.map((n) => String(n.id));
  const next = JSON.parse(JSON.stringify(previous)) as ExtSchemaBlueprint;
  const layers = (next.layers as Record<string, unknown>) || {};
  layers.ext = { nodes: extNodes, edges: extEdges };
  next.layers = layers;
  return applyFkGraphLayoutToBlueprint(next, extIds, cat.foreign_keys || []);
}

/** Слой public из каталога схемы public (вариант A). */
function mergeCatalogIntoBlueprintPublic(
  cat: ExtDesignCatalog,
  previous: ExtSchemaBlueprint,
): ExtSchemaBlueprint {
  const pubNodes = (cat.tables || []).map((t) => ({
    id: t.name,
    layer: "public",
    label: t.name,
    columns: (t.columns || []).map((c) => ({
      name: c.name,
      pg_type: normalizePgTypeForSelect(String(c.udt_name || c.data_type || "text")),
      nullable: c.nullable,
      primary_key: c.name === "id",
    })),
  }));
  const pubEdges = (cat.foreign_keys || []).map((fk) => ({
    from: fk.from_table,
    to: fk.to_table,
    field: fk.from_column,
    layer: "public",
    constraint_name: fk.constraint_name,
  }));
  const ids = pubNodes.map((n) => String(n.id));
  const next = JSON.parse(JSON.stringify(previous)) as ExtSchemaBlueprint;
  const layers = (next.layers as Record<string, unknown>) || {};
  layers.public = { nodes: pubNodes, edges: pubEdges };
  next.layers = layers;
  return applyFkGraphLayoutToBlueprint(next, ids, cat.foreign_keys || []);
}

export function AdminDbConstructor({
  onOpenPublicDataEditor,
}: {
  /** Перейти к редактированию строк таблицы в схеме public (вкладка «Данные БД»). */
  onOpenPublicDataEditor?: (tableName: string) => void;
} = {}) {
  const { showNotification } = useToastNotification();
  const rfInstanceRef = useRef<ReactFlowInstance | null>(null);
  /** Актуальные узлы для fitView поиска без лишних перезапусков при перетаскивании. */
  const nodesRef = useRef<Node[]>([]);
  const [detail, setDetail] = useState<ExtSchemaProjectDetail | null>(null);
  const [metaName, setMetaName] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [blueprintDraft, setBlueprintDraft] = useState<ExtSchemaBlueprint>(emptyBlueprint());
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tableDialog, setTableDialog] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [extCatalogByTable, setExtCatalogByTable] = useState<
    Record<string, ExtDesignCatalog["tables"][number]>
  >({});
  const [colDialogOpen, setColDialogOpen] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColType, setNewColType] = useState<string>("text");
  const [newColNullable, setNewColNullable] = useState(true);
  const [portPublicOpen, setPortPublicOpen] = useState(false);
  const [portPublicOverwrite, setPortPublicOverwrite] = useState(false);
  const [portPublicBusy, setPortPublicBusy] = useState(false);
  const [extCatalog, setExtCatalog] = useState<ExtDesignCatalog | null>(null);
  const [indexDialogOpen, setIndexDialogOpen] = useState(false);
  const [indexColumns, setIndexColumns] = useState("");
  const [indexName, setIndexName] = useState("");
  const [indexUnique, setIndexUnique] = useState(false);
  const [renameColTarget, setRenameColTarget] = useState<BlueprintColumn | null>(null);
  const [renameColDraft, setRenameColDraft] = useState("");
  const [alterTypeTarget, setAlterTypeTarget] = useState<BlueprintColumn | null>(null);
  const [alterTypeDraft, setAlterTypeDraft] = useState<string>("text");
  /** Переключатель слоя диаграммы; после whoami выравнивается под PG_APP_DATA_SCHEMA на сервере. */
  const [schemaTarget, setSchemaTarget] = useState<RuntimeSchemaTarget>("public");
  const [serverPgAppSchema, setServerPgAppSchema] = useState<string | null>(null);
  /** До whoami не грузим каталог. После ответа слой совпадает с PG_APP_DATA_SCHEMA. */
  const [adminContextReady, setAdminContextReady] = useState(false);
  /** Диалог создания FK после соединения узлов (нижний порт родителя → верхний порт ребёнка). */
  const [fkLinkOpen, setFkLinkOpen] = useState(false);
  const [fkReferencedTable, setFkReferencedTable] = useState("");
  const [fkReferencingTable, setFkReferencingTable] = useState("");
  const [fkFromColumn, setFkFromColumn] = useState("");
  const [fkToColumn, setFkToColumn] = useState("id");
  const [fkConstraintName, setFkConstraintName] = useState("");
  const [fkBusy, setFkBusy] = useState(false);
  const [tableSearch, setTableSearch] = useState("");

  const flowLayer: LayerFilter = schemaTarget === "public" ? "public" : "ext";
  const { nodes: initialNodes, edges: initialEdges } = useMemo(
    () => blueprintToFlow(blueprintDraft, flowLayer),
    [blueprintDraft, flowLayer],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const flowNodesForView = useMemo(
    () => applyTableSearchToNodes(nodes, tableSearch),
    [nodes, tableSearch],
  );
  const flowEdgesForView = useMemo(
    () => applyTableSearchToEdges(edges, nodes, tableSearch),
    [edges, nodes, tableSearch],
  );

  const tableSearchMatchCount = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    if (!q) return null;
    return nodes.filter(
      (n) => n.id.toLowerCase().includes(q) || String(n.data?.label ?? "").toLowerCase().includes(q),
    ).length;
  }, [nodes, tableSearch]);

  /** Меняется при смене набора таблиц на диаграмме, но не при смене только координат. */
  const diagramNodeIdsKey = useMemo(() => [...nodes.map((n) => n.id)].sort().join("\0"), [nodes]);

  nodesRef.current = nodes;

  const flowCoordinateExtent = useMemo((): [[number, number], [number, number]] | undefined => {
    if (nodes.length === 0) return undefined;
    const pad = 480;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of nodes) {
      const { x, y } = n.position;
      const w = n.measured?.width ?? FLOW_NODE_LAYOUT_W;
      const h = n.measured?.height ?? FLOW_NODE_LAYOUT_H;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }
    if (!Number.isFinite(minX)) return undefined;
    return [
      [minX - pad, minY - pad],
      [maxX + pad, maxY + pad],
    ];
  }, [nodes]);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  useEffect(() => {
    setTableSearch("");
  }, [schemaTarget]);

  /** Центровка на совпадениях при поиске; при пустом запросе — весь граф. */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const rf = rfInstanceRef.current;
      const current = nodesRef.current;
      if (!rf || current.length === 0) return;
      const q = tableSearch.trim().toLowerCase();
      if (!q) {
        rf.fitView({ padding: 0.2, maxZoom: 1.25, duration: 240 });
        return;
      }
      const matched = current.filter(
        (n) =>
          n.id.toLowerCase().includes(q) || String(n.data?.label ?? "").toLowerCase().includes(q),
      );
      if (matched.length === 0) return;
      rf.fitView({
        nodes: matched.map((n) => ({ id: n.id })),
        padding: 0.32,
        maxZoom: 1.35,
        duration: 280,
      });
    }, 90);

    return () => window.clearTimeout(timer);
  }, [tableSearch, diagramNodeIdsKey]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await ensureCsrf();
        const w = await adminWhoami();
        if (cancelled) return;
        if (w.pg_app_data_schema) setServerPgAppSchema(String(w.pg_app_data_schema));
        const s = String(w.pg_app_data_schema || "").toLowerCase();
        if (s === "ext" || s === "public") {
          setSchemaTarget(s as RuntimeSchemaTarget);
        }
      } catch {
        if (!cancelled) setServerPgAppSchema(null);
      } finally {
        if (!cancelled) setAdminContextReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const refreshExtCatalog = useCallback(async () => {
    try {
      const cat =
        schemaTarget === "public"
          ? await adminPublicDesignCatalog()
          : await adminExtDesignCatalog();
      setExtCatalog(cat);
      setExtCatalogByTable(catalogToTableMap(cat));
      return cat;
    } catch {
      setExtCatalog(null);
      setExtCatalogByTable({});
      return null;
    }
  }, [schemaTarget]);

  const onConnectFk = useCallback(
    (connection: Connection) => {
      const src = connection.source;
      const tgt = connection.target;
      if (!src || !tgt) return;

      const srcNode = nodes.find((n) => n.id === src);
      const tgtNode = nodes.find((n) => n.id === tgt);
      const srcLayer = String(srcNode?.data?.layer ?? "");
      const tgtLayer = String(tgtNode?.data?.layer ?? "");
      if (srcLayer !== schemaTarget || tgtLayer !== schemaTarget) {
        showNotification({
          title: "Связь FK",
          description: "Внешние ключи только между таблицами текущей схемы (ext или public).",
          variant: "destructive",
        });
        return;
      }
      /* На диаграмме: нижний порт (source) — родитель REFERENCES, верхний (target) — дочерняя таблица с FOREIGN KEY. */
      const referenced = src;
      const referencing = tgt;

      const refCols = referenceableColumnNames(extCatalog, referenced);
      const toCol = refCols.includes("id") ? "id" : refCols[0] || "id";

      const childCols = runtimeColumnsForTable(
        blueprintDraft,
        schemaTarget,
        referencing,
        extCatalogByTable,
      );
      const refTabCols = runtimeColumnsForTable(
        blueprintDraft,
        schemaTarget,
        referenced,
        extCatalogByTable,
      );
      const parentUdt = resolveColumnPgUdt(extCatalog, referenced, toCol, refTabCols);
      const fromCol =
        childCols.find((c) =>
          pgTypesFkCompatible(resolveColumnPgUdt(extCatalog, referencing, c.name, childCols), parentUdt),
        )?.name ||
        childCols[0]?.name ||
        "";

      setFkReferencedTable(referenced);
      setFkReferencingTable(referencing);
      setFkToColumn(toCol);
      setFkFromColumn(fromCol);
      setFkConstraintName("");
      setFkLinkOpen(true);
    },
    [nodes, schemaTarget, extCatalog, blueprintDraft, extCatalogByTable, showNotification],
  );

  const applyAutoLayoutActiveLayer = useCallback(() => {
    const key = flowLayer === "public" ? "public" : "ext";
    const layers = blueprintDraft.layers as
      | Record<
          string,
          {
            nodes?: Array<{ id?: string; name?: string }>;
            edges?: Array<{ from?: string; to?: string }>;
          }
        >
      | undefined;
    const bucket = layers?.[key];
    const ids = (bucket?.nodes ?? []).map((n) => String(n.id || n.name || "")).filter(Boolean);
    if (ids.length === 0) {
      showNotification({
        title: "Конструктор БД",
        description: "Нет таблиц в текущем слое для авторазметки.",
        variant: "destructive",
      });
      return;
    }
    const fks = (bucket?.edges ?? [])
      .filter((e): e is { from: string; to: string } => Boolean(e.from && e.to))
      .map((e) => ({ from_table: e.from, to_table: e.to }));
    setBlueprintDraft((bp) => applyFkGraphLayoutToBlueprint(bp, ids, fks));
    setDirty(true);
    requestAnimationFrame(() => {
      rfInstanceRef.current?.fitView({ padding: 0.2, maxZoom: 1.25, duration: 200 });
    });
  }, [blueprintDraft.layers, flowLayer, showNotification]);

  const loadProject = useCallback(
    async (id: number) => {
      setLoading(true);
      try {
        const d = await adminExtDesignProjectGet(id);
        setDetail(d);
        setMetaName(d.name);
        setMetaDesc(d.description ?? "");
        const base =
          d.blueprint && typeof d.blueprint === "object" && Object.keys(d.blueprint).length
            ? d.blueprint
            : emptyBlueprint();
        try {
          const cat = await adminExtDesignCatalog();
          setExtCatalog(cat);
          setExtCatalogByTable(catalogToTableMap(cat));
          setBlueprintDraft(mergeCatalogIntoBlueprintExt(cat, base as ExtSchemaBlueprint));
        } catch {
          setBlueprintDraft(base);
          void refreshExtCatalog();
        }
        setDirty(false);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            rfInstanceRef.current?.fitView({ padding: 0.2, maxZoom: 1.25, duration: 200 });
          });
        });
      } catch (e: unknown) {
        showNotification({
          title: "Ошибка",
          description: apiErrorMessage(e) || "Не удалось загрузить проект",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [showNotification, refreshExtCatalog],
  );

  useEffect(() => {
    if (!adminContextReady) return;
    let cancelled = false;
    (async () => {
      if (schemaTarget === "public") {
        setLoading(true);
        try {
          const cat = await adminPublicDesignCatalog();
          if (cancelled) return;
          setExtCatalog(cat);
          setExtCatalogByTable(catalogToTableMap(cat));
          setDetail(null);
          setBlueprintDraft(mergeCatalogIntoBlueprintPublic(cat, emptyBlueprint()));
          setDirty(false);
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              rfInstanceRef.current?.fitView({ padding: 0.2, maxZoom: 1.25, duration: 200 });
            });
          });
        } catch (e: unknown) {
          if (!cancelled) {
            showNotification({
              title: "Ошибка",
              description: apiErrorMessage(e),
              variant: "destructive",
            });
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
        return;
      }

      try {
        const list = await adminExtDesignProjectsList();
        if (cancelled) return;
        const first = list[0];
        if (first) await loadProject(first.id);
        else
          showNotification({
            title: "Нет чертежа",
            description: "Сервер не вернул рабочий проект схемы ext.",
            variant: "destructive",
          });
      } catch (e: unknown) {
        if (!cancelled) {
          showNotification({
            title: "Ошибка",
            description: apiErrorMessage(e),
            variant: "destructive",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schemaTarget, loadProject, showNotification, adminContextReady]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      for (const ch of changes) {
        if (ch.type === "position" && ch.id && "dragging" in ch && ch.dragging === false) {
          const pos = ch.position;
          if (!pos) continue;
          setBlueprintDraft((bp) => applyLayoutToBlueprint(bp, ch.id, pos));
          setDirty(true);
        }
      }
    },
    [onNodesChange],
  );

  const saveBlueprint = async () => {
    if (!detail) return;
    await ensureCsrf();
    try {
      const d = await adminExtDesignProjectPatch(detail.id, {
        blueprint: blueprintDraft,
        expected_revision: detail.revision,
      });
      setDetail(d);
      setMetaName(d.name);
      setMetaDesc(d.description ?? "");
      setBlueprintDraft(
        d.blueprint && typeof d.blueprint === "object" ? d.blueprint : emptyBlueprint(),
      );
      setDirty(false);
      showNotification({ title: "Сохранено", description: "Чертёж записан." });
    } catch (e: unknown) {
      showNotification({
        title: "Ошибка",
        description: apiErrorMessage(e) || "Ошибка сохранения",
        variant: "destructive",
      });
    }
  };

  const saveProjectMeta = async () => {
    if (!detail) return;
    const name = metaName.trim();
    if (!name) {
      showNotification({
        title: "Название",
        description: "Укажите непустое название проекта.",
        variant: "destructive",
      });
      return;
    }
    await ensureCsrf();
    try {
      const d = await adminExtDesignProjectPatch(detail.id, {
        name,
        description: metaDesc,
        expected_revision: detail.revision,
      });
      setDetail(d);
      setMetaName(d.name);
      setMetaDesc(d.description ?? "");
      showNotification({ title: "Сохранено", description: "Название и описание обновлены." });
    } catch (e: unknown) {
      showNotification({
        title: "Ошибка",
        description: apiErrorMessage(e) || "Не удалось сохранить сведения",
        variant: "destructive",
      });
    }
  };

  const syncExtFromCatalog = async () => {
    try {
      const cat =
        schemaTarget === "public"
          ? await adminPublicDesignCatalog()
          : await adminExtDesignCatalog();
      setExtCatalog(cat);
      setExtCatalogByTable(catalogToTableMap(cat));
      setBlueprintDraft((bp) =>
        schemaTarget === "public"
          ? mergeCatalogIntoBlueprintPublic(cat, bp)
          : mergeCatalogIntoBlueprintExt(cat, bp),
      );
      setDirty(true);
      const n = (cat.tables || []).length;
      showNotification({
        title: schemaTarget === "public" ? "public обновлён" : "ext обновлён",
        description: `Слой ${schemaTarget}: ${n} таблиц из PostgreSQL.`,
      });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          rfInstanceRef.current?.fitView({ padding: 0.2, maxZoom: 1.25, duration: 200 });
        });
      });
    } catch (e: unknown) {
      showNotification({
        title: "Ошибка",
        description: apiErrorMessage(e),
        variant: "destructive",
      });
    }
  };

  const applyExtDdl = async () => {
    if (schemaTarget === "public") return;
    if (!detail) return;
    await ensureCsrf();
    try {
      const r = await adminExtDesignProjectApply(detail.id);
      showNotification({
        title: "Применено",
        description: r.executed.length ? r.executed.join("; ") : "Нет новых таблиц (существующие не пересоздаются)",
      });
      await syncExtFromCatalog();
    } catch (e: unknown) {
      showNotification({
        title: "Ошибка apply",
        description: apiErrorMessage(e),
        variant: "destructive",
      });
    }
  };

  const portPublicToExtThenSync = async () => {
    if (schemaTarget === "public") return;
    await ensureCsrf();
    setPortPublicBusy(true);
    try {
      const r = await adminExtDesignPortFullPublic({
        overwrite: portPublicOverwrite,
      });
      const nCreated = r.created?.length ?? 0;
      const nSkip = r.skipped?.length ?? 0;
      const nErr = r.errors?.length ?? 0;
      const dest = r.dest_schema ?? serverPgAppSchema ?? "?";
      showNotification({
        title: `Копирование в зеркало (${dest})`,
        description: `Создано/обновлено: ${nCreated}, пропуск: ${nSkip}, ошибок: ${nErr}.`,
      });
      setPortPublicOpen(false);
      setPortPublicOverwrite(false);
      await syncExtFromCatalog();
    } catch (e: unknown) {
      showNotification({
        title: "Ошибка",
        description: apiErrorMessage(e),
        variant: "destructive",
      });
    } finally {
      setPortPublicBusy(false);
    }
  };

  const createExtTable = async () => {
    const t = newTableName.trim().toLowerCase();
    if (!t) return;
    await ensureCsrf();
    try {
      if (schemaTarget === "public") {
        await adminPublicDesignCreateTable({
          table: t,
          columns: [{ name: "id", pg_type: "bigserial", nullable: false, primary_key: true }],
        });
      } else {
        await adminExtDesignCreateTable({
          table: t,
          columns: [{ name: "id", pg_type: "bigserial", nullable: false, primary_key: true }],
        });
      }
      setTableDialog(false);
      setNewTableName("");
      await syncExtFromCatalog();
      showNotification({
        title: "Таблица создана",
        description: `${schemaTarget}.${t}`,
      });
    } catch (e: unknown) {
      showNotification({
        title: "Ошибка",
        description: apiErrorMessage(e),
        variant: "destructive",
      });
    }
  };

  const dropExtTable = async () => {
    if (!selectedNodeId) return;
    const node = nodes.find((n) => n.id === selectedNodeId);
    const lyr = String(node?.data?.layer ?? "");
    if (lyr !== "ext" && lyr !== "public") {
      showNotification({
        title: "Нельзя удалить",
        description: "Удаление только для таблиц слоя ext или public.",
        variant: "destructive",
      });
      return;
    }
    if (!window.confirm(`Удалить таблицу ${lyr}.${selectedNodeId}?`)) return;
    await ensureCsrf();
    try {
      if (schemaTarget === "public") {
        await adminPublicDesignDropTable(selectedNodeId, true);
      } else {
        await adminExtDesignDropTable(selectedNodeId, true);
      }
      await syncExtFromCatalog();
      setSelectedNodeId(null);
      showNotification({ title: "Удалено", description: selectedNodeId });
    } catch (e: unknown) {
      showNotification({
        title: "Ошибка",
        description: apiErrorMessage(e),
        variant: "destructive",
      });
    }
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);
  const selectedLayer = selectedNode ? String(selectedNode.data?.layer ?? "") : "";

  const inspectorRuntimeColumns = useMemo((): BlueprintColumn[] => {
    if (!selectedNodeId || (selectedLayer !== "ext" && selectedLayer !== "public")) return [];
    const layerKey = selectedLayer as RuntimeSchemaTarget;
    const layers = blueprintDraft.layers as
      | Record<
          string,
          {
            nodes?: Array<{
              id?: string;
              name?: string;
              columns?: BlueprintColumn[];
              fields?: BlueprintColumn[];
            }>;
          }
        >
      | undefined;
    const layerBucket = layers?.[layerKey];
    const node = layerBucket?.nodes?.find((n) => String(n.id || n.name) === selectedNodeId);
    const raw = (node?.columns || node?.fields || []) as BlueprintColumn[];
    return raw.map((c) => ({ ...c, name: String(c.name ?? "") }));
  }, [blueprintDraft, selectedNodeId, selectedLayer]);

  const tableExistsInExtDb = Boolean(selectedNodeId && extCatalogByTable[selectedNodeId]);

  const selectedTableIndexes = useMemo(() => {
    if (!selectedNodeId) return [];
    return (extCatalog?.indexes || []).filter((idx) => idx.table === selectedNodeId);
  }, [extCatalog, selectedNodeId]);

  const catalogColNames = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const t = extCatalogByTable[selectedNodeId];
    return new Set((t?.columns || []).map((c) => c.name));
  }, [selectedNodeId, extCatalogByTable]);

  const columnLockedInDb = (colName: string) => tableExistsInExtDb && catalogColNames.has(colName);

  const patchInspectorColumn = (index: number, patch: Partial<BlueprintColumn>) => {
    if (!selectedNodeId || (selectedLayer !== "ext" && selectedLayer !== "public")) return;
    const col = inspectorRuntimeColumns[index];
    if (!col || columnLockedInDb(col.name)) return;
    setBlueprintDraft((bp) =>
      updateRuntimeNodeColumnAt(bp, selectedLayer as RuntimeSchemaTarget, selectedNodeId, index, patch),
    );
    setDirty(true);
  };

  const removeInspectorColumn = async (index: number, col: BlueprintColumn) => {
    if (!selectedNodeId || (selectedLayer !== "ext" && selectedLayer !== "public")) return;
    if (col.primary_key || col.name === "id") {
      showNotification({
        title: "Нельзя удалить",
        description: "Колонку id / первичный ключ не удаляем из инспектора.",
        variant: "destructive",
      });
      return;
    }
    const locked = columnLockedInDb(col.name);
    if (locked) {
      if (!window.confirm(`Удалить колонку «${col.name}» из PostgreSQL (${selectedLayer}.${selectedNodeId})?`))
        return;
      await ensureCsrf();
      try {
        if (schemaTarget === "public") {
          await adminPublicDesignDropColumn(selectedNodeId, col.name);
        } else {
          await adminExtDesignDropColumn(selectedNodeId, col.name);
        }
        const cat = await refreshExtCatalog();
        const t = cat?.tables?.find((x) => x.name === selectedNodeId);
        if (t) {
          setBlueprintDraft((bp) =>
            mergeRuntimeNodeColumnsInBlueprint(
              bp,
              selectedLayer as RuntimeSchemaTarget,
              selectedNodeId,
              catalogTableToBlueprintColumns(t),
            ),
          );
        } else {
          setBlueprintDraft((bp) =>
            removeRuntimeNodeColumnAt(bp, selectedLayer as RuntimeSchemaTarget, selectedNodeId, index),
          );
        }
        setDirty(true);
        showNotification({ title: "Колонка удалена", description: `${selectedNodeId}.${col.name}` });
      } catch (e: unknown) {
        showNotification({
          title: "Ошибка",
          description: apiErrorMessage(e),
          variant: "destructive",
        });
      }
      return;
    }
    setBlueprintDraft((bp) =>
      removeRuntimeNodeColumnAt(bp, selectedLayer as RuntimeSchemaTarget, selectedNodeId, index),
    );
    setDirty(true);
  };

  const submitAddColumn = async () => {
    if (!selectedNodeId || (selectedLayer !== "ext" && selectedLayer !== "public")) return;
    const name = newColName.trim().toLowerCase();
    if (!name) {
      showNotification({
        title: "Имя колонки",
        description: "Укажите имя (a-z, цифры, _).",
        variant: "destructive",
      });
      return;
    }
    await ensureCsrf();
    try {
      if (tableExistsInExtDb) {
        if (schemaTarget === "public") {
          await adminPublicDesignAddColumn(selectedNodeId, {
            name,
            pg_type: newColType,
            nullable: newColNullable,
          });
        } else {
          await adminExtDesignAddColumn(selectedNodeId, {
            name,
            pg_type: newColType,
            nullable: newColNullable,
          });
        }
        const cat = await refreshExtCatalog();
        const t = cat?.tables?.find((x) => x.name === selectedNodeId);
        if (t) {
          setBlueprintDraft((bp) =>
            mergeRuntimeNodeColumnsInBlueprint(
              bp,
              selectedLayer as RuntimeSchemaTarget,
              selectedNodeId,
              catalogTableToBlueprintColumns(t),
            ),
          );
        }
        setDirty(true);
        showNotification({
          title: "Колонка в БД",
          description: `${selectedLayer}.${selectedNodeId}.${name}`,
        });
      } else {
        setBlueprintDraft((bp) =>
          appendRuntimeNodeColumn(bp, selectedLayer as RuntimeSchemaTarget, selectedNodeId, {
            name,
            pg_type: newColType,
            nullable: newColNullable,
            primary_key: false,
          }),
        );
        setDirty(true);
        showNotification({ title: "Колонка в чертеже", description: name });
      }
      setColDialogOpen(false);
      setNewColName("");
    } catch (e: unknown) {
      showNotification({
        title: "Ошибка",
        description: apiErrorMessage(e),
        variant: "destructive",
      });
    }
  };

  const openRenameColumnDialog = (col: BlueprintColumn) => {
    if (!selectedNodeId || !col.name) return;
    setRenameColTarget(col);
    setRenameColDraft(col.name);
  };

  const confirmRenameColumn = async () => {
    const col = renameColTarget;
    if (!selectedNodeId || !col?.name) return;
    const nextName = renameColDraft.trim().toLowerCase();
    if (!nextName) {
      showNotification({
        title: "Имя колонки",
        description: "Укажите непустое имя (a-z, цифры, _).",
        variant: "destructive",
      });
      return;
    }
    if (nextName === col.name) {
      setRenameColTarget(null);
      return;
    }
    await ensureCsrf();
    try {
      if (schemaTarget === "public") {
        await adminPublicDesignRenameColumn(selectedNodeId, col.name, { new_column: nextName });
      } else {
        await adminExtDesignRenameColumn(selectedNodeId, col.name, { new_column: nextName });
      }
      await syncExtFromCatalog();
      showNotification({ title: "Колонка переименована", description: `${col.name} → ${nextName}` });
      setRenameColTarget(null);
    } catch (e: unknown) {
      showNotification({ title: "Ошибка", description: apiErrorMessage(e), variant: "destructive" });
    }
  };

  const openAlterTypeColumnDialog = (col: BlueprintColumn) => {
    if (!selectedNodeId || !col.name) return;
    setAlterTypeTarget(col);
    setAlterTypeDraft(normalizePgTypeForSelect(String(col.pg_type || col.type || "text")));
  };

  const confirmAlterTypeColumn = async () => {
    const col = alterTypeTarget;
    if (!selectedNodeId || !col?.name) return;
    const currentType = normalizePgTypeForSelect(String(col.pg_type || col.type || "text"));
    const nextType = alterTypeDraft.trim().toLowerCase();
    if (!nextType || nextType === currentType) {
      setAlterTypeTarget(null);
      return;
    }
    await ensureCsrf();
    try {
      if (schemaTarget === "public") {
        await adminPublicDesignAlterColumnType(selectedNodeId, col.name, { pg_type: nextType });
      } else {
        await adminExtDesignAlterColumnType(selectedNodeId, col.name, { pg_type: nextType });
      }
      await syncExtFromCatalog();
      showNotification({ title: "Тип изменён", description: `${col.name}: ${nextType}` });
      setAlterTypeTarget(null);
    } catch (e: unknown) {
      showNotification({ title: "Ошибка", description: apiErrorMessage(e), variant: "destructive" });
    }
  };

  const submitCreateIndex = async () => {
    if (!selectedNodeId) return;
    const columns = indexColumns
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);
    if (!columns.length) return;
    await ensureCsrf();
    try {
      if (schemaTarget === "public") {
        await adminPublicDesignCreateIndex({
          table: selectedNodeId,
          columns,
          index_name: indexName.trim().toLowerCase() || undefined,
          unique: indexUnique,
        });
      } else {
        await adminExtDesignCreateIndex({
          table: selectedNodeId,
          columns,
          index_name: indexName.trim().toLowerCase() || undefined,
          unique: indexUnique,
        });
      }
      await refreshExtCatalog();
      setIndexDialogOpen(false);
      setIndexColumns("");
      setIndexName("");
      setIndexUnique(false);
      showNotification({ title: indexUnique ? "UNIQUE создан" : "Индекс создан", description: columns.join(", ") });
    } catch (e: unknown) {
      showNotification({ title: "Ошибка", description: apiErrorMessage(e), variant: "destructive" });
    }
  };

  const dropDbIndex = async (name: string) => {
    if (!window.confirm(`Удалить индекс ${schemaTarget}.${name}?`)) return;
    await ensureCsrf();
    try {
      if (schemaTarget === "public") {
        await adminPublicDesignDropIndex(name);
      } else {
        await adminExtDesignDropIndex(name);
      }
      await refreshExtCatalog();
      showNotification({ title: "Индекс удалён", description: name });
    } catch (e: unknown) {
      showNotification({ title: "Ошибка", description: apiErrorMessage(e), variant: "destructive" });
    }
  };

  const fkReferencingCols = useMemo(
    () =>
      fkLinkOpen
        ? runtimeColumnsForTable(blueprintDraft, schemaTarget, fkReferencingTable, extCatalogByTable)
        : [],
    [fkLinkOpen, blueprintDraft, schemaTarget, fkReferencingTable, extCatalogByTable],
  );

  const fkReferencedRefColNames = useMemo(
    () => (fkLinkOpen ? referenceableColumnNames(extCatalog, fkReferencedTable) : []),
    [fkLinkOpen, extCatalog, fkReferencedTable],
  );

  const fkReferencedBlueprintCols = useMemo(
    () =>
      fkLinkOpen
        ? runtimeColumnsForTable(blueprintDraft, schemaTarget, fkReferencedTable, extCatalogByTable)
        : [],
    [fkLinkOpen, blueprintDraft, schemaTarget, fkReferencedTable, extCatalogByTable],
  );

  const fkTypeCompatible = useMemo(() => {
    if (!fkLinkOpen || !fkFromColumn || !fkToColumn) return false;
    const childU = resolveColumnPgUdt(extCatalog, fkReferencingTable, fkFromColumn, fkReferencingCols);
    const parentU = resolveColumnPgUdt(extCatalog, fkReferencedTable, fkToColumn, fkReferencedBlueprintCols);
    return pgTypesFkCompatible(childU, parentU);
  }, [
    fkLinkOpen,
    fkFromColumn,
    fkToColumn,
    extCatalog,
    fkReferencingTable,
    fkReferencedTable,
    fkReferencingCols,
    fkReferencedBlueprintCols,
  ]);

  const fkDuplicateEdge = useMemo(() => {
    if (!fkLinkOpen || !fkFromColumn) return false;
    const layers = blueprintDraft.layers as
      | Record<string, { edges?: Array<{ from?: string; to?: string; field?: string }> }>
      | undefined;
    const bucket = layers?.[schemaTarget];
    return (bucket?.edges || []).some(
      (e) =>
        e.from === fkReferencingTable &&
        e.to === fkReferencedTable &&
        String(e.field || "") === fkFromColumn,
    );
  }, [fkLinkOpen, blueprintDraft.layers, schemaTarget, fkReferencingTable, fkReferencedTable, fkFromColumn]);

  useEffect(() => {
    if (!fkLinkOpen) return;
    if (fkReferencedRefColNames.length === 0) return;
    if (!fkReferencedRefColNames.includes(fkToColumn)) {
      setFkToColumn(fkReferencedRefColNames[0]);
    }
  }, [fkLinkOpen, fkReferencedRefColNames, fkToColumn]);

  const swapFkEndpoints = () => {
    const newRef = fkReferencingTable;
    const newChild = fkReferencedTable;
    const refCols = referenceableColumnNames(extCatalog, newRef);
    const toCol = refCols.includes("id") ? "id" : refCols[0] || "id";
    const childCols = runtimeColumnsForTable(blueprintDraft, schemaTarget, newChild, extCatalogByTable);
    const refTabCols = runtimeColumnsForTable(blueprintDraft, schemaTarget, newRef, extCatalogByTable);
    const parentUdt = resolveColumnPgUdt(extCatalog, newRef, toCol, refTabCols);
    const fromCol =
      childCols.find((c) =>
        pgTypesFkCompatible(resolveColumnPgUdt(extCatalog, newChild, c.name, childCols), parentUdt),
      )?.name ||
      childCols[0]?.name ||
      "";
    setFkReferencedTable(newRef);
    setFkReferencingTable(newChild);
    setFkToColumn(toCol);
    setFkFromColumn(fromCol);
  };

  const submitAddForeignKey = async () => {
    if (!fkFromColumn.trim() || !fkToColumn.trim()) {
      showNotification({ title: "FK", description: "Выберите колонки.", variant: "destructive" });
      return;
    }
    if (fkDuplicateEdge) {
      showNotification({
        title: "FK",
        description: "Такая связь уже есть на чертеже (та же колонка).",
        variant: "destructive",
      });
      return;
    }
    if (!fkTypeCompatible) {
      showNotification({
        title: "FK",
        description: "Типы колонок, скорее всего, несовместимы для FOREIGN KEY (проверьте или поменяйте тип).",
        variant: "destructive",
      });
      return;
    }
    setFkBusy(true);
    await ensureCsrf();
    try {
      const payload = {
        from_table: fkReferencingTable,
        from_column: fkFromColumn.trim(),
        to_table: fkReferencedTable,
        to_column: fkToColumn.trim(),
        constraint_name: fkConstraintName.trim() || undefined,
      };
      if (schemaTarget === "public") {
        await adminPublicDesignAddFk(payload);
      } else {
        await adminExtDesignAddFk(payload);
      }
      await syncExtFromCatalog();
      setFkLinkOpen(false);
      showNotification({
        title: "Внешний ключ создан",
        description: `${payload.from_table}.${payload.from_column} → ${payload.to_table}.${payload.to_column}`,
      });
    } catch (e: unknown) {
      showNotification({ title: "Ошибка FK", description: apiErrorMessage(e), variant: "destructive" });
    } finally {
      setFkBusy(false);
    }
  };

  const metaDirty = useMemo(() => {
    if (!detail) return false;
    return metaName.trim() !== detail.name || metaDesc !== (detail.description ?? "");
  }, [detail, metaName, metaDesc]);

  /** Переключатель ext скрыт, если бэкенд уже на PG_APP_DATA_SCHEMA=public. */
  const showLegacyExtSchemaSwitcher = serverPgAppSchema !== "public";

  useEffect(() => {
    if (serverPgAppSchema === "public" && schemaTarget !== "public") {
      setSchemaTarget("public");
    }
  }, [serverPgAppSchema, schemaTarget]);

  return (
    <div className="space-y-4">
      <Card className="card-industrial">
        <CardHeader className="pb-2">
          <CardTitle>Конструктор БД</CardTitle>
          {schemaTarget !== "public" ? (
            <p className="text-sm text-muted-foreground">
              Устаревший режим: чертёж и метаданные схемы <code className="text-xs">ext</code> на backend. Переведите
              деплой на <code className="text-xs">PG_APP_DATA_SCHEMA=public</code> и миграцию 0033+, чтобы осталась одна
              схема.
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="db-schema-target">Схема</Label>
              {showLegacyExtSchemaSwitcher ? (
                <Select
                  value={schemaTarget}
                  onValueChange={(v) => setSchemaTarget(v as RuntimeSchemaTarget)}
                  disabled={loading || !adminContextReady}
                >
                  <SelectTrigger id="db-schema-target" className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">public (основная)</SelectItem>
                    <SelectItem value="ext">ext (legacy)</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p id="db-schema-target" className="text-sm text-muted-foreground py-1">
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">public</code>
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void syncExtFromCatalog()}
              disabled={loading || !adminContextReady}
            >
              Обновить из PostgreSQL
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={applyAutoLayoutActiveLayer}
              disabled={loading || !adminContextReady}
              title="Расположить таблицы по связям FK (сверху — на кого ссылаются)"
            >
              Авторазметка
            </Button>
            <div className="flex flex-col gap-1 min-w-[200px] max-w-sm">
              <Label htmlFor="db-table-search" className="text-xs text-muted-foreground">
                Поиск таблицы
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="db-table-search"
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Имя или фрагмент…"
                  className="h-9 text-sm"
                  disabled={loading || !adminContextReady}
                  autoComplete="off"
                />
                {tableSearch.trim() !== "" ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2 text-xs shrink-0"
                    onClick={() => setTableSearch("")}
                  >
                    Очистить
                  </Button>
                ) : null}
              </div>
              {tableSearchMatchCount !== null ? (
                <span className="text-[11px] text-muted-foreground">Совпадений: {tableSearchMatchCount}</span>
              ) : null}
            </div>
            {schemaTarget === "ext" && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void applyExtDdl()}
                  disabled={loading || !detail}
                >
                  Применить чертёж (DDL)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPortPublicOpen(true)}
                  disabled={loading}
                >
                  Залить public → зеркало dj_*…
                </Button>
              </>
            )}
            {loading && <span className="text-sm text-muted-foreground pb-2">Загрузка…</span>}
          </div>

          {schemaTarget === "ext" ? (
            <>
              <div className="grid gap-3 sm:grid-cols-1 md:max-w-xl">
                <div className="space-y-1.5">
                  <Label htmlFor="ext-project-name">Название чертежа</Label>
                  <Input
                    id="ext-project-name"
                    value={metaName}
                    onChange={(e) => setMetaName(e.target.value)}
                    disabled={!detail || loading}
                    placeholder="Например, текущая база данных"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ext-project-desc">Описание</Label>
                  <Textarea
                    id="ext-project-desc"
                    value={metaDesc}
                    onChange={(e) => setMetaDesc(e.target.value)}
                    disabled={!detail || loading}
                    rows={3}
                    className="resize-y min-h-[72px]"
                    placeholder="Комментарий для администраторов"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void saveProjectMeta()}
                  disabled={!detail || loading || !metaDirty}
                >
                  Сохранить сведения
                </Button>
                <Button type="button" onClick={() => void saveBlueprint()} disabled={!detail || !dirty}>
                  Сохранить чертёж
                </Button>
                {dirty && <span className="text-sm text-amber-600">Несохранённые изменения чертежа</span>}
                {metaDirty && (
                  <span className="text-sm text-amber-600">Несохранённые название или описание</span>
                )}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="card-industrial overflow-hidden min-h-[480px]">
          <CardContent className="p-0 flex flex-col h-[520px]">
            <p className="text-[11px] text-muted-foreground px-3 py-1.5 border-b border-border shrink-0 bg-muted/20">
              Связь <code className="text-[10px]">FOREIGN KEY</code>: перетащите от{" "}
              <span className="font-medium text-foreground">родителя</span> (нижний порт) к{" "}
              <span className="font-medium text-foreground">ребёнку</span> (верхний порт). Подпись на линии — имя колонки
              FK в дочерней таблице. Если соединили наоборот — в диалоге нажмите «Поменять таблицы местами».
            </p>
            <div className="flex-1 min-h-0">
              <ReactFlow
                className="h-full w-full"
                nodes={flowNodesForView}
                edges={flowEdgesForView}
                nodeTypes={flowNodeTypes}
                translateExtent={flowCoordinateExtent}
                nodeExtent={flowCoordinateExtent}
                onInit={(inst) => {
                  rfInstanceRef.current = inst;
                }}
                onNodesChange={handleNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnectFk}
                onNodeClick={(_, n) => setSelectedNodeId(n.id)}
                onPaneClick={() => setSelectedNodeId(null)}
                fitView
                proOptions={{ hideAttribution: true }}
              >
                <Background />
                <Controls />
                <MiniMap
                  position="bottom-right"
                  className="!m-2 rounded-md border border-border bg-card/95 shadow-md"
                  bgColor="rgb(248 250 252 / 0.95)"
                  maskColor="rgba(100, 116, 139, 0.2)"
                  maskStrokeColor="rgb(59 130 246)"
                  maskStrokeWidth={2}
                  nodeColor="#22c55e"
                  nodeStrokeColor="#15803d"
                  nodeStrokeWidth={2}
                  style={{ width: 200, height: 140 }}
                  offsetScale={2}
                />
              </ReactFlow>
            </div>
          </CardContent>
        </Card>
        <Card className="card-industrial">
          <CardHeader>
            <CardTitle className="text-base">Инспектор</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {selectedNode ? (
              <>
                <div>
                  <span className="text-muted-foreground">Таблица</span>
                  <div className="font-medium">{selectedNode.id}</div>
                </div>
                {selectedLayer === "public" && onOpenPublicDataEditor ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => onOpenPublicDataEditor(String(selectedNode.id))}
                  >
                    Данные таблицы (строки)…
                  </Button>
                ) : null}
                {selectedNode.data?.managed === false && (
                  <p className="text-amber-700 text-xs">managed=False — только просмотр в админке backend.</p>
                )}
                {selectedLayer === "core" ? (
                  <div className="max-h-72 overflow-auto border rounded-md p-2 bg-muted/30">
                    <ul className="space-y-1 text-xs">
                      {(selectedNode.data?.fields as Array<Record<string, unknown>>)?.map((f, i) => (
                        <li key={i}>
                          <code>{String(f.name)}</code>{" "}
                          <span className="text-muted-foreground">
                            ({String(f.type || f.pg_type || "?")})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : selectedLayer === "ext" || selectedLayer === "public" ? (
                  <div className="space-y-2">
                    <div className="max-h-72 overflow-y-auto border rounded-md p-2 bg-muted/30 space-y-2">
                      {inspectorRuntimeColumns.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Нет колонок в чертеже.</p>
                      ) : (
                        inspectorRuntimeColumns.map((col, i) => {
                          const locked = columnLockedInDb(col.name);
                          const selectType = normalizePgTypeForSelect(
                            String(col.pg_type || col.type || "text"),
                          );
                          return (
                            <div
                              key={`${col.name}-${i}`}
                              className="grid gap-1.5 border-b border-border/60 pb-2 last:border-0 last:pb-0"
                            >
                              <div className="flex items-center gap-2">
                                <Input
                                  className="h-8 text-xs font-mono flex-1"
                                  value={col.name}
                                  disabled={locked}
                                  onChange={(e) => patchInspectorColumn(i, { name: e.target.value })}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 shrink-0 px-2 text-destructive"
                                  disabled={col.name === "id" || Boolean(col.primary_key)}
                                  onClick={() => void removeInspectorColumn(i, col)}
                                  title="Удалить колонку"
                                >
                                  ×
                                </Button>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Select
                                  value={selectType}
                                  disabled={locked}
                                  onValueChange={(v) => patchInspectorColumn(i, { pg_type: v })}
                                >
                                  <SelectTrigger className="h-8 text-xs w-[140px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {PG_TYPE_OPTIONS.map((opt) => (
                                      <SelectItem key={opt} value={opt} className="text-xs">
                                        {opt}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                                  <Checkbox
                                    checked={col.nullable !== false}
                                    disabled={locked}
                                    onCheckedChange={(c) =>
                                      patchInspectorColumn(i, { nullable: c === true })
                                    }
                                  />
                                  NULL
                                </label>
                                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer">
                                  <Checkbox
                                    checked={Boolean(col.primary_key)}
                                    disabled={locked}
                                    onCheckedChange={(c) =>
                                      patchInspectorColumn(i, { primary_key: c === true })
                                    }
                                  />
                                  PK
                                </label>
                                {locked ? (
                                  <>
                                    <span className="text-[10px] text-sky-700">в БД</span>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-[10px]"
                                      disabled={col.name === "id"}
                                      title={
                                        col.name === "id"
                                          ? "Колонку id не переименовываем из админки"
                                          : undefined
                                      }
                                      onClick={() => openRenameColumnDialog(col)}
                                    >
                                      Rename
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-[10px]"
                                      disabled={col.name === "id"}
                                      title={
                                        col.name === "id"
                                          ? "Тип колонки id не меняем из админки"
                                          : undefined
                                      }
                                      onClick={() => openAlterTypeColumnDialog(col)}
                                    >
                                      Type
                                    </Button>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-amber-700">только чертёж</span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setNewColName("");
                        setNewColType("text");
                        setNewColNullable(true);
                        setColDialogOpen(true);
                      }}
                    >
                      Добавить колонку…
                    </Button>
                    {tableExistsInExtDb && (
                      <div className="space-y-2 border rounded-md p-2 bg-muted/20">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-medium">Индексы / UNIQUE</div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => setIndexDialogOpen(true)}
                          >
                            Создать
                          </Button>
                        </div>
                        {selectedTableIndexes.length ? (
                          <ul className="space-y-1 text-[11px]">
                            {selectedTableIndexes.map((idx) => (
                              <li key={idx.name} className="flex items-center justify-between gap-2">
                                <code className="truncate" title={idx.definition}>{idx.name}</code>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-1 text-destructive"
                                  onClick={() => void dropDbIndex(idx.name)}
                                >
                                  ×
                                </Button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">Нет пользовательских индексов в каталоге.</p>
                        )}
                      </div>
                    )}
                    <Button type="button" variant="destructive" size="sm" onClick={() => void dropExtTable()}>
                      Удалить таблицу ({schemaTarget})
                    </Button>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-auto border rounded-md p-2 bg-muted/30">
                    <ul className="space-y-1 text-xs">
                      {(selectedNode.data?.fields as Array<Record<string, unknown>>)?.map((f, i) => (
                        <li key={i}>
                          <code>{String(f.name)}</code>{" "}
                          <span className="text-muted-foreground">
                            ({String(f.type || f.pg_type || "?")})
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="text-muted-foreground">Выберите узел на диаграмме.</p>
            )}
            <Button type="button" variant="secondary" size="sm" onClick={() => setTableDialog(true)}>
              Новая таблица ({schemaTarget})…
            </Button>
          </CardContent>
        </Card>
      </div>



      <Dialog open={tableDialog} onOpenChange={setTableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новая таблица в {schemaTarget}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Имя: строчные буквы, цифры, подчёркивание. Будет создана колонка id BIGSERIAL PRIMARY KEY.
          </p>
          <Input
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            placeholder="my_table"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTableDialog(false)}>
              Отмена
            </Button>
            <Button onClick={() => void createExtTable()}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={renameColTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameColTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переименовать колонку в PostgreSQL</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            {selectedLayer}.{selectedNodeId}.{renameColTarget?.name}
          </p>
          <div className="space-y-2">
            <Label>Новое имя</Label>
            <Input
              value={renameColDraft}
              onChange={(e) => setRenameColDraft(e.target.value)}
              className="font-mono text-sm"
              placeholder="new_name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameColTarget(null)}>
              Отмена
            </Button>
            <Button onClick={() => void confirmRenameColumn()}>Переименовать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={alterTypeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setAlterTypeTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Изменить тип колонки в PostgreSQL</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            {selectedLayer}.{selectedNodeId}.{alterTypeTarget?.name} — проверьте совместимость данных.
          </p>
          <div className="space-y-2">
            <Label>Тип</Label>
            <Select value={alterTypeDraft} onValueChange={setAlterTypeDraft}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PG_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt} className="text-xs">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlterTypeTarget(null)}>
              Отмена
            </Button>
            <Button onClick={() => void confirmAlterTypeColumn()}>Применить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={colDialogOpen} onOpenChange={setColDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tableExistsInExtDb ? `Колонка в PostgreSQL (${schemaTarget})` : "Колонка в чертеже"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Имя: <code className="text-xs">a-z</code>, цифры, подчёркивание.
            {tableExistsInExtDb ? " Выполнится ALTER TABLE … ADD COLUMN." : " Появится в чертеже до записи DDL в PostgreSQL."}
          </p>
          <div className="space-y-2">
            <Label>Имя колонки</Label>
            <Input
              value={newColName}
              onChange={(e) => setNewColName(e.target.value)}
              placeholder="my_field"
              className="font-mono text-sm"
            />
            <Label>Тип</Label>
            <Select value={newColType} onValueChange={setNewColType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PG_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt} className="text-xs">
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={newColNullable} onCheckedChange={(c) => setNewColNullable(c === true)} />
              Допускает NULL
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setColDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => void submitAddColumn()}>Добавить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={indexDialogOpen} onOpenChange={setIndexDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Индекс / UNIQUE для {schemaTarget}.{selectedNodeId}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Колонки через запятую</Label>
            <Input
              value={indexColumns}
              onChange={(e) => setIndexColumns(e.target.value)}
              placeholder="name, type_id"
              className="font-mono text-sm"
            />
            <Label>Имя индекса (опционально)</Label>
            <Input
              value={indexName}
              onChange={(e) => setIndexName(e.target.value)}
              placeholder="ix_table_column"
              className="font-mono text-sm"
            />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={indexUnique} onCheckedChange={(c) => setIndexUnique(c === true)} />
              UNIQUE
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIndexDialogOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => void submitCreateIndex()}>Создать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={portPublicOpen} onOpenChange={setPortPublicOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Копирование public → зеркало dj_*</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Создаёт таблицы <code className="text-[11px]">&lt;PG_APP_DATA_SCHEMA&gt;.dj_*</code> по данным из{" "}
            <code className="text-[11px]">public</code>
            {serverPgAppSchema ? (
              <>
                . На сервере сейчас: <strong>{serverPgAppSchema}</strong>.
              </>
            ) : (
              <> (схема задаётся в переменных окружения бэкенда).</>
            )}
          </p>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox checked={portPublicOverwrite} onCheckedChange={(c) => setPortPublicOverwrite(c === true)} />
            Перезаписать существующие зеркала (DROP… CASCADE при необходимости)
          </label>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPortPublicOpen(false)}>
              Отмена
            </Button>
            <Button onClick={() => void portPublicToExtThenSync()} disabled={portPublicBusy}>
              {portPublicBusy ? "Копирование…" : "Запустить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={fkLinkOpen}
        onOpenChange={(open) => {
          if (!open) setFkLinkOpen(false);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Внешний ключ (FOREIGN KEY)</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground leading-relaxed">
            В PostgreSQL будет выполнено:{" "}
            <code className="text-[10px] whitespace-pre-wrap break-all">
              ALTER TABLE {schemaTarget}.{fkReferencingTable} ADD CONSTRAINT … FOREIGN KEY ({fkFromColumn || "…"}) REFERENCES{" "}
              {schemaTarget}.{fkReferencedTable} ({fkToColumn || "…"})
            </code>
          </p>
          <div className="space-y-3">
            <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => swapFkEndpoints()}>
              Поменять родительскую и дочернюю таблицы местами
            </Button>
            <div className="space-y-1.5">
              <Label>Колонка FK в дочерней таблице ({fkReferencingTable})</Label>
              <Select value={fkFromColumn} onValueChange={setFkFromColumn} disabled={fkReferencingCols.length === 0}>
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue placeholder="Выберите колонку" />
                </SelectTrigger>
                <SelectContent>
                  {fkReferencingCols.map((c) => (
                    <SelectItem key={c.name} value={c.name} className="font-mono text-xs">
                      {c.name} ({String(c.pg_type || c.type || "?")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fkReferencingCols.length === 0 ? (
                <p className="text-[11px] text-destructive">
                  Нет колонок — сначала добавьте колонку в дочерней таблице.
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Целевая колонка ({fkReferencedTable}, PK / UNIQUE)</Label>
              <Select
                value={fkToColumn}
                onValueChange={setFkToColumn}
                disabled={fkReferencedRefColNames.length === 0}
              >
                <SelectTrigger className="font-mono text-xs">
                  <SelectValue placeholder="Колонка в родителе" />
                </SelectTrigger>
                <SelectContent>
                  {fkReferencedRefColNames.map((col) => (
                    <SelectItem key={col} value={col} className="font-mono text-xs">
                      {col}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fkReferencedRefColNames.length === 0 ? (
                <p className="text-[11px] text-amber-800">
                  Нет подходящих колонок в каталоге — обновите каталог из PostgreSQL.
                </p>
              ) : null}
            </div>
            <div className="space-y-1.5">
              <Label>Имя ограничения (необязательно)</Label>
              <Input
                value={fkConstraintName}
                onChange={(e) => setFkConstraintName(e.target.value)}
                className="font-mono text-xs"
                placeholder="оставьте пустым — имя сгенерирует сервер"
              />
            </div>
            {fkDuplicateEdge ? (
              <p className="text-[11px] text-destructive">Такая связь уже есть на чертеже для этой колонки.</p>
            ) : null}
            {!fkTypeCompatible && fkFromColumn && fkToColumn ? (
              <p className="text-[11px] text-destructive">
                Типы колонок не проходят упрощённую проверку совместимости (сервер выполнит окончательную проверку).
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setFkLinkOpen(false)} disabled={fkBusy}>
              Отмена
            </Button>
            <Button
              type="button"
              onClick={() => void submitAddForeignKey()}
              disabled={
                fkBusy ||
                !fkFromColumn ||
                !fkToColumn ||
                !fkTypeCompatible ||
                fkDuplicateEdge ||
                fkReferencingCols.length === 0 ||
                fkReferencedRefColNames.length === 0
              }
            >
              {fkBusy ? "Создание…" : "Создать в PostgreSQL"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
