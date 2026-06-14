import type { MenuItem, FooterColumn } from "@pumpstation/contracts";

export function MenuEditor({
  menu,
  pageOptions,
  onChange,
}: {
  menu: MenuItem[];
  pageOptions: { id: string; title: string }[];
  onChange: (menu: MenuItem[]) => void;
}) {
  const addItem = () => {
    onChange([...menu, { label: "Новый пункт", pageId: pageOptions[0]?.id ?? "" }]);
  };

  const removeItem = (index: number) => {
    onChange(menu.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, patch: Partial<MenuItem>) => {
    onChange(menu.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-700">Меню шапки</h3>
        <button
          type="button"
          onClick={addItem}
          className="rounded bg-[#13347f] px-2 py-0.5 text-xs text-white"
        >
          + Пункт
        </button>
      </div>
      <div className="space-y-2">
        {menu.map((item, i) => (
          <div key={i} className="flex items-center gap-2 rounded border border-neutral-200 p-2">
            <input
              className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm"
              placeholder="Подпись"
              value={item.label}
              onChange={(e) => updateItem(i, { label: e.target.value })}
            />
            <select
              className="w-40 rounded border border-neutral-300 px-2 py-1 text-sm"
              value={item.pageId}
              onChange={(e) => updateItem(i, { pageId: e.target.value })}
            >
              {pageOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeItem(i)}
              className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
            >
              ✕
            </button>
          </div>
        ))}
        {menu.length === 0 && (
          <p className="py-4 text-center text-xs text-neutral-400">Меню пусто.</p>
        )}
      </div>
    </div>
  );
}

export function FooterEditor({
  footer,
  pageOptions,
  onChange,
}: {
  footer: { columns: FooterColumn[]; copyright: string };
  pageOptions: { id: string; title: string }[];
  onChange: (footer: { columns: FooterColumn[]; copyright: string }) => void;
}) {
  const addColumn = () => {
    onChange({
      ...footer,
      columns: [...footer.columns, { title: "Новая колонка", links: [] }],
    });
  };

  const updateColumn = (colIndex: number, title: string) => {
    const cols = footer.columns.map((c, i) => (i === colIndex ? { ...c, title } : c));
    onChange({ ...footer, columns: cols });
  };

  const removeColumn = (colIndex: number) => {
    onChange({
      ...footer,
      columns: footer.columns.filter((_, i) => i !== colIndex),
    });
  };

  const addLink = (colIndex: number) => {
    const cols = footer.columns.map((c, i) =>
      i === colIndex
        ? { ...c, links: [...c.links, { label: "Новая ссылка", pageId: "" }] }
        : c,
    );
    onChange({ ...footer, columns: cols });
  };

  const updateLink = (colIndex: number, linkIndex: number, patch: Record<string, string>) => {
    const cols = footer.columns.map((c, i) =>
      i === colIndex
        ? {
            ...c,
            links: c.links.map((ln, li) => (li === linkIndex ? { ...ln, ...patch } : ln)),
          }
        : c,
    );
    onChange({ ...footer, columns: cols });
  };

  const removeLink = (colIndex: number, linkIndex: number) => {
    const cols = footer.columns.map((c, i) =>
      i === colIndex
        ? { ...c, links: c.links.filter((_l, j) => j !== linkIndex) }
        : c,
    );
    onChange({ ...footer, columns: cols });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-700">Подвал</h3>
        <button
          type="button"
          onClick={addColumn}
          className="rounded bg-[#13347f] px-2 py-0.5 text-xs text-white"
        >
          + Колонка
        </button>
      </div>

      {footer.columns.map((col, ci) => (
        <div key={ci} className="rounded-lg border border-neutral-200 p-3">
          <div className="mb-2 flex items-center justify-between">
            <input
              className="w-48 rounded border border-neutral-300 px-2 py-1 text-sm font-medium"
              placeholder="Заголовок колонки"
              value={col.title}
              onChange={(e) => updateColumn(ci, e.target.value)}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => addLink(ci)}
                className="rounded px-2 py-0.5 text-xs text-[#13347f] hover:bg-blue-50"
              >
                + Ссылка
              </button>
              <button
                type="button"
                onClick={() => removeColumn(ci)}
                className="rounded px-2 py-0.5 text-xs text-red-500 hover:bg-red-50"
              >
                Удалить колонку
              </button>
            </div>
          </div>
          <div className="ml-2 space-y-2">
            {col.links.map((link, li) => (
              <div key={li} className="flex items-center gap-2">
                <input
                  className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm"
                  placeholder="Подпись"
                  value={link.label}
                  onChange={(e) => updateLink(ci, li, { label: e.target.value })}
                />
                <select
                  className="w-40 rounded border border-neutral-300 px-2 py-1 text-sm"
                  value={link.pageId}
                  onChange={(e) => updateLink(ci, li, { pageId: e.target.value })}
                >
                  <option value="">— не выбрано —</option>
                  {pageOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => removeLink(ci, li)}
                  className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-600">
          Копирайт
        </label>
        <input
          className="w-full rounded border border-neutral-300 px-2 py-1.5 text-sm"
          placeholder="© 2026 Компания"
          value={footer.copyright}
          onChange={(e) => onChange({ ...footer, copyright: e.target.value })}
        />
      </div>
    </div>
  );
}
