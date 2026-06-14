export interface StudioTab {
  id: string;
  label: string;
}

export const STUDIO_TABS: StudioTab[] = [
  { id: "theme", label: "Стили" },
  { id: "pages", label: "Страницы" },
  { id: "layout", label: "Layout" },
  { id: "wizard", label: "Визард" },
  { id: "pdf", label: "PDF" },
];

export function TabNav({
  tabs,
  activeTab,
  onSelect,
}: {
  tabs: StudioTab[];
  activeTab: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
            activeTab === tab.id
              ? "bg-[#13347f] font-medium text-white"
              : "text-neutral-700 hover:bg-neutral-100"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
