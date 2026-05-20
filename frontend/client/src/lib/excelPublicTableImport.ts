import * as XLSX from "xlsx";

/**
 * Читает первый лист Excel: первая строка — имена колонок (как в public-таблице).
 * Имена нормализуются trim; дубликаты и пустые имена — ошибка.
 */
export async function parseFirstSheetAsTableRows(file: File): Promise<Record<string, unknown>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    throw new Error("В файле нет листов");
  }
  const sheet = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    raw: true,
    defval: null,
    blankrows: false,
  });
  if (rawRows.length === 0) {
    throw new Error("На первом листе нет строк данных");
  }

  const first = rawRows[0];
  const rawKeys = Object.keys(first);
  const normalized = rawKeys.map((k) => String(k).trim());
  if (normalized.some((k) => !k)) {
    throw new Error("В заголовке есть пустое имя колонки");
  }
  if (new Set(normalized).size !== normalized.length) {
    throw new Error("В заголовке дублируются имена колонок");
  }

  const rename = Object.fromEntries(rawKeys.map((k, i) => [k, normalized[i]])) as Record<
    string,
    string
  >;

  return rawRows.map((row) => {
    const o: Record<string, unknown> = {};
    for (const k of rawKeys) {
      o[rename[k]!] = row[k];
    }
    return o;
  });
}

/** Множества имён колонок должны совпасть (порядок в Excel может быть любым). */
export function assertExcelColumnsMatchTable(tableColumns: string[], excelRowKeys: string[]): void {
  const T = new Set(tableColumns);
  const E = new Set(excelRowKeys);
  const missing = Array.from(T).filter((c) => !E.has(c));
  const extra = Array.from(E).filter((c) => !T.has(c));
  if (missing.length === 0 && extra.length === 0) return;
  const parts: string[] = ["Колонки Excel должны в точности совпадать с таблицей."];
  if (missing.length) parts.push(`Не хватает колонок: ${missing.join(", ")}`);
  if (extra.length) parts.push(`Лишние колонки: ${extra.join(", ")}`);
  throw new Error(parts.join(" "));
}

function normalizeCell(value: unknown): unknown {
  if (value === "" || value === undefined) return null;
  return value;
}

export function buildCreatePayloadFromRow(
  row: Record<string, unknown>,
  columns: string[],
  primaryKeyColumn: string,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const col of columns) {
    const v = normalizeCell(row[col]);
    if (col === primaryKeyColumn && v === null) {
      continue;
    }
    payload[col] = v;
  }
  return payload;
}

export function isRowVisuallyEmpty(row: Record<string, unknown>, columns: string[]): boolean {
  return columns.every((c) => {
    const v = row[c];
    return v === null || v === undefined || v === "";
  });
}
