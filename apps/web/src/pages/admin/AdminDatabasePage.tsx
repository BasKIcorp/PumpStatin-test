import { useCallback, useEffect, useState } from "react";
import {
  createAdminCatalogItem,
  deleteAdminCatalogItem,
  deleteAdminPump,
  fetchAdminCatalog,
  fetchAdminPumps,
  fetchDbStatus,
  saveAdminPump,
  type CatalogRow,
  type PumpRow,
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

  const loadData = useCallback((editable: boolean, source?: string) => {
    if (!editable) return;
    fetchAdminPumps()
      .then((r) => setPumps(r.pumps))
      .catch(() => {});
    fetchAdminCatalog(source || undefined)
      .then((r) => setCatalog(r.items))
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
    </div>
  );
}
