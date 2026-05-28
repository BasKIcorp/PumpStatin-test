import { useCallback, useEffect, useState } from "react";
import {
  alterAdminTable,
  createAdminTable,
  createAdminCatalogItem,
  deleteAdminCatalogItem,
  deleteAdminPump,
  fetchAdminSchema,
  fetchAdminCatalog,
  fetchAdminPumps,
  fetchDbStatus,
  importAdminExcel,
  saveAdminPump,
  type CatalogRow,
  type PumpRow,
  type SchemaTable,
} from "@/api/admin";

const emptyPump: PumpRow = {
  id: "",
  product_line: "bps-w",
  name: "",
  nominal_flow: 0,
  nominal_head: 0,
  power_kw: null,
};

export function AdminDatabasePage() {
  const [status, setStatus] = useState<{ mode: string; editable: boolean } | null>(null);
  const [pumps, setPumps] = useState<PumpRow[]>([]);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [pumpForm, setPumpForm] = useState<PumpRow>(emptyPump);
  const [isNewPump, setIsNewPump] = useState(true);
  const [catalogForm, setCatalogForm] = useState({
    source_key: "catalog.pumpTypes",
    value: "",
    label: "",
  });
  const [filterSource, setFilterSource] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [schema, setSchema] = useState<SchemaTable[]>([]);
  const [tableName, setTableName] = useState("");
  const [tableColumns, setTableColumns] = useState([
    { name: "id", type: "varchar", nullable: false, primary_key: true },
  ]);
  const [alterTableName, setAlterTableName] = useState("");
  const [alterAction, setAlterAction] = useState<"add_column" | "rename_column" | "drop_column">(
    "add_column",
  );
  const [alterColumnName, setAlterColumnName] = useState("");
  const [alterNewColumnName, setAlterNewColumnName] = useState("");
  const [alterColumnType, setAlterColumnType] = useState("text");
  const [importTableName, setImportTableName] = useState("");
  const [importFile, setImportFile] = useState<File | null>(null);

  const loadData = useCallback((editable: boolean, source?: string) => {
    if (!editable) return;
    fetchAdminPumps()
      .then((r) => setPumps(r.pumps))
      .catch(() => {});
    fetchAdminCatalog(source || undefined)
      .then((r) => setCatalog(r.items))
      .catch(() => {});
    fetchAdminSchema()
      .then((r) => setSchema(r.tables))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchDbStatus()
      .then((s) => {
        setStatus(s);
        loadData(s.editable);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка"));
  }, [loadData]);

  useEffect(() => {
    if (status?.editable) loadData(true, filterSource || undefined);
  }, [filterSource, status?.editable, loadData]);

  const reload = () => {
    if (status?.editable) loadData(true, filterSource || undefined);
  };

  if (!status) return <p className="text-sm text-neutral-500">Загрузка…</p>;

  if (!status.editable) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">База данных</h1>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          API работает в режиме <strong>mock</strong> (USE_MOCK_DB=true). Редактирование насосов и
          справочников недоступно. Установите USE_MOCK_DB=false в production.env и перезапустите
          pumpstation-api.
        </div>
      </div>
    );
  }

  const savePump = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveAdminPump(pumpForm, isNewPump);
      setMessage("Насос сохранён");
      setPumpForm(emptyPump);
      setIsNewPump(true);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const addCatalog = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAdminCatalogItem(catalogForm);
      setMessage("Пункт справочника добавлен");
      setCatalogForm({ ...catalogForm, value: "", label: "" });
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    }
  };

  const createTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAdminTable({
        table_name: tableName,
        columns: tableColumns,
      });
      setMessage("Таблица создана");
      setTableName("");
      setTableColumns([{ name: "id", type: "varchar", nullable: false, primary_key: true }]);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания таблицы");
    }
  };

  const alterTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await alterAdminTable({
        table_name: alterTableName,
        action: alterAction,
        column_name: alterColumnName || undefined,
        new_column_name: alterNewColumnName || undefined,
        column_type: alterColumnType || undefined,
      });
      setMessage("Изменения структуры применены");
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка изменения таблицы");
    }
  };

  const uploadExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) {
      setError("Выберите Excel файл");
      return;
    }
    try {
      const result = await importAdminExcel(importTableName, importFile);
      const errors = result.errors.length ? ` Ошибки: ${result.errors.slice(0, 3).join(" | ")}` : "";
      setMessage(`Импорт завершён: добавлено ${result.inserted}, пропущено ${result.skipped}.${errors}`);
      setImportFile(null);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка импорта Excel");
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold">База данных (PostgreSQL)</h1>
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Насосы</h2>
        <form
          onSubmit={savePump}
          className="grid max-w-2xl gap-2 rounded-lg border bg-white p-4 sm:grid-cols-3"
        >
          <input
            className="field"
            placeholder="id"
            value={pumpForm.id}
            disabled={!isNewPump}
            required
            onChange={(e) => setPumpForm({ ...pumpForm, id: e.target.value })}
          />
          <input
            className="field"
            placeholder="product_line"
            value={pumpForm.product_line}
            onChange={(e) => setPumpForm({ ...pumpForm, product_line: e.target.value })}
          />
          <input
            className="field"
            placeholder="name"
            value={pumpForm.name}
            onChange={(e) => setPumpForm({ ...pumpForm, name: e.target.value })}
          />
          <input
            className="field"
            type="number"
            step="any"
            placeholder="Q"
            value={pumpForm.nominal_flow}
            onChange={(e) =>
              setPumpForm({ ...pumpForm, nominal_flow: Number(e.target.value) })
            }
          />
          <input
            className="field"
            type="number"
            step="any"
            placeholder="H"
            value={pumpForm.nominal_head}
            onChange={(e) =>
              setPumpForm({ ...pumpForm, nominal_head: Number(e.target.value) })
            }
          />
          <input
            className="field"
            type="number"
            step="any"
            placeholder="kW"
            value={pumpForm.power_kw ?? ""}
            onChange={(e) =>
              setPumpForm({
                ...pumpForm,
                power_kw: e.target.value ? Number(e.target.value) : null,
              })
            }
          />
          <button type="submit" className="btn-primary sm:col-span-3">
            {isNewPump ? "Добавить насос" : "Обновить насос"}
          </button>
        </form>
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-2 py-1">id</th>
                <th className="px-2 py-1">line</th>
                <th className="px-2 py-1">name</th>
                <th className="px-2 py-1">Q</th>
                <th className="px-2 py-1">H</th>
                <th className="px-2 py-1" />
              </tr>
            </thead>
            <tbody>
              {pumps.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="px-2 py-1 font-mono">{p.id}</td>
                  <td className="px-2 py-1">{p.product_line}</td>
                  <td className="px-2 py-1">{p.name}</td>
                  <td className="px-2 py-1">{p.nominal_flow}</td>
                  <td className="px-2 py-1">{p.nominal_head}</td>
                  <td className="px-2 py-1 text-right">
                    <button
                      type="button"
                      className="text-[#13347f] hover:underline"
                      onClick={() => {
                        setPumpForm(p);
                        setIsNewPump(false);
                      }}
                    >
                      Изм.
                    </button>
                    <button
                      type="button"
                      className="ml-1 text-red-600 hover:underline"
                      onClick={() =>
                        void deleteAdminPump(p.id).then(() => {
                          reload();
                          setMessage("Удалено");
                        })
                      }
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Справочники (catalog_items)</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-neutral-600">
            Фильтр source_key
            <input
              className="field ml-1"
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              placeholder="catalog.pumpTypes"
            />
          </label>
        </div>
        <form
          onSubmit={addCatalog}
          className="flex flex-wrap gap-2 rounded-lg border bg-white p-4"
        >
          <input
            className="field min-w-[140px]"
            value={catalogForm.source_key}
            onChange={(e) => setCatalogForm({ ...catalogForm, source_key: e.target.value })}
          />
          <input
            className="field min-w-[80px]"
            placeholder="value"
            value={catalogForm.value}
            required
            onChange={(e) => setCatalogForm({ ...catalogForm, value: e.target.value })}
          />
          <input
            className="field min-w-[120px]"
            placeholder="label"
            value={catalogForm.label}
            required
            onChange={(e) => setCatalogForm({ ...catalogForm, label: e.target.value })}
          />
          <button type="submit" className="btn-primary">
            Добавить
          </button>
        </form>
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-2 py-1">source</th>
                <th className="px-2 py-1">value</th>
                <th className="px-2 py-1">label</th>
                <th className="px-2 py-1" />
              </tr>
            </thead>
            <tbody>
              {catalog.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-2 py-1 font-mono">{c.source_key}</td>
                  <td className="px-2 py-1">{c.value}</td>
                  <td className="px-2 py-1">{c.label}</td>
                  <td className="px-2 py-1 text-right">
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={() =>
                        void deleteAdminCatalogItem(c.id).then(() => {
                          reload();
                          setMessage("Удалено");
                        })
                      }
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Схема БД (простой редактор)</h2>
        <form
          onSubmit={createTable}
          className="grid max-w-4xl gap-2 rounded-lg border bg-white p-4 sm:grid-cols-6"
        >
          <input
            className="field sm:col-span-2"
            placeholder="Имя новой таблицы"
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            required
          />
          {tableColumns.map((col, idx) => (
            <div key={`new-col-${idx}`} className="sm:col-span-6 grid gap-2 sm:grid-cols-6">
              <input
                className="field sm:col-span-2"
                placeholder="column_name"
                value={col.name}
                onChange={(e) =>
                  setTableColumns((prev) =>
                    prev.map((p, i) => (i === idx ? { ...p, name: e.target.value } : p)),
                  )
                }
                required
              />
              <select
                className="field sm:col-span-2"
                value={col.type}
                onChange={(e) =>
                  setTableColumns((prev) =>
                    prev.map((p, i) => (i === idx ? { ...p, type: e.target.value } : p)),
                  )
                }
              >
                {["text", "varchar", "integer", "bigint", "numeric", "double", "boolean", "timestamp", "jsonb"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-xs sm:col-span-1">
                <input
                  type="checkbox"
                  checked={!col.nullable}
                  onChange={(e) =>
                    setTableColumns((prev) =>
                      prev.map((p, i) => (i === idx ? { ...p, nullable: !e.target.checked } : p)),
                    )
                  }
                />
                NOT NULL
              </label>
              <label className="flex items-center gap-1 text-xs sm:col-span-1">
                <input
                  type="checkbox"
                  checked={col.primary_key}
                  onChange={(e) =>
                    setTableColumns((prev) =>
                      prev.map((p, i) => (i === idx ? { ...p, primary_key: e.target.checked } : p)),
                    )
                  }
                />
                PK
              </label>
            </div>
          ))}
          <div className="sm:col-span-6 flex gap-2">
            <button
              type="button"
              className="rounded border px-3 py-1.5 text-sm"
              onClick={() =>
                setTableColumns((prev) => [
                  ...prev,
                  { name: "", type: "text", nullable: true, primary_key: false },
                ])
              }
            >
              + Колонка
            </button>
            <button type="submit" className="btn-primary">
              Создать таблицу
            </button>
          </div>
        </form>

        <form
          onSubmit={alterTable}
          className="grid max-w-4xl gap-2 rounded-lg border bg-white p-4 sm:grid-cols-6"
        >
          <input
            className="field sm:col-span-2"
            placeholder="table_name"
            value={alterTableName}
            onChange={(e) => setAlterTableName(e.target.value)}
            required
          />
          <select
            className="field sm:col-span-2"
            value={alterAction}
            onChange={(e) => setAlterAction(e.target.value as typeof alterAction)}
          >
            <option value="add_column">add_column</option>
            <option value="rename_column">rename_column</option>
            <option value="drop_column">drop_column</option>
          </select>
          <input
            className="field sm:col-span-2"
            placeholder="column_name"
            value={alterColumnName}
            onChange={(e) => setAlterColumnName(e.target.value)}
            required
          />
          {alterAction === "rename_column" ? (
            <input
              className="field sm:col-span-2"
              placeholder="new_column_name"
              value={alterNewColumnName}
              onChange={(e) => setAlterNewColumnName(e.target.value)}
              required
            />
          ) : null}
          {alterAction === "add_column" ? (
            <select
              className="field sm:col-span-2"
              value={alterColumnType}
              onChange={(e) => setAlterColumnType(e.target.value)}
            >
              {["text", "varchar", "integer", "bigint", "numeric", "double", "boolean", "timestamp", "jsonb"].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          ) : null}
          <button type="submit" className="btn-primary sm:col-span-6">
            Применить изменение
          </button>
        </form>

        <form
          onSubmit={uploadExcel}
          className="grid max-w-4xl gap-2 rounded-lg border bg-white p-4 sm:grid-cols-6"
        >
          <input
            className="field sm:col-span-2"
            placeholder="table_name"
            value={importTableName}
            onChange={(e) => setImportTableName(e.target.value)}
            required
          />
          <input
            className="field sm:col-span-3"
            type="file"
            accept=".xlsx,.xlsm"
            onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
            required
          />
          <button type="submit" className="btn-primary sm:col-span-1">
            Импорт Excel
          </button>
          <p className="text-xs text-neutral-500 sm:col-span-6">
            Первая строка Excel — заголовки колонок. Данные импортируются в выбранную таблицу.
          </p>
        </form>

        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50">
              <tr>
                <th className="px-2 py-1">Таблица</th>
                <th className="px-2 py-1">Колонки</th>
              </tr>
            </thead>
            <tbody>
              {schema.map((t) => (
                <tr key={t.name} className="border-t">
                  <td className="px-2 py-1 font-mono">{t.name}</td>
                  <td className="px-2 py-1">
                    {t.columns
                      .map((c) => `${c.name}:${c.type}${c.primary_key ? " [PK]" : ""}${c.nullable ? "" : " [NOT NULL]"}`)
                      .join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
