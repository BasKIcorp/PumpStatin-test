interface PageFormData {
  id: string;
  title: string;
  route: string;
  inMenu: boolean;
  type?: "page" | "wizard";
}

export function PageList({
  pages,
  selectedId,
  onSelect,
  onAdd,
  onDelete,
}: {
  pages: PageFormData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-700">Страницы</h3>
        <button
          type="button"
          onClick={onAdd}
          className="rounded bg-[#13347f] px-2 py-0.5 text-xs text-white hover:bg-[#0f2866]"
        >
          + Новая
        </button>
      </div>
      <div className="space-y-1">
        {pages.map((p) => (
          <div
            key={p.id}
            className={`group flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm ${
              selectedId === p.id
                ? "bg-[#13347f] text-white"
                : "text-neutral-700 hover:bg-neutral-100"
            }`}
            onClick={() => onSelect(p.id)}
          >
            <div className="flex items-center gap-2">
              {p.type === "wizard" && (
                <span className="rounded bg-yellow-100 px-1 text-[10px] text-yellow-800">
                  Wizard
                </span>
              )}
              <span>{p.title}</span>
              <span className="text-[10px] text-neutral-400">{p.route}</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(p.id);
              }}
              className="invisible rounded px-1 text-xs text-red-500 hover:bg-red-50 group-hover:visible"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
