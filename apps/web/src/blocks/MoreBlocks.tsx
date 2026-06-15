import type { BlockProps } from "@pumpstation/contracts";

export function ProductGridBlock({ block }: BlockProps) {
  const props = block.props as { filter?: boolean; columns?: number };
  return (
    <div className="bg-white px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-6 text-2xl font-bold">Каталог продукции</h2>
        {props.filter !== false && (
          <div className="mb-6 flex flex-wrap gap-2">
            <span className="rounded bg-neutral-100 px-3 py-1 text-sm">Все</span>
            <span className="rounded bg-neutral-100 px-3 py-1 text-sm">Насосы</span>
            <span className="rounded bg-neutral-100 px-3 py-1 text-sm">Гидромодули</span>
          </div>
        )}
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${props.columns ?? 3}, 1fr)` }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border p-4 text-center">
              <div className="mx-auto mb-2 h-32 w-32 rounded bg-neutral-100" />
              <h3 className="font-medium">Товар {i}</h3>
              <p className="text-sm text-neutral-500">Категория</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ContactFormBlock(_props: BlockProps) {
  return (
    <div className="bg-neutral-50 px-6 py-12">
      <div className="mx-auto max-w-lg">
        <h2 className="mb-6 text-center text-2xl font-bold">Свяжитесь с нами</h2>
        <div className="space-y-4 rounded-lg bg-white p-6 shadow">
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Ваше имя" />
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Email" />
          <textarea className="w-full rounded border px-3 py-2 text-sm" placeholder="Сообщение" rows={4} />
          <button className="w-full rounded bg-[#13347f] py-2 text-sm text-white">Отправить</button>
        </div>
      </div>
    </div>
  );
}

export function MapBlock({ block }: BlockProps) {
  const props = block.props as { lat?: number; lng?: number; address?: string };
  return (
    <div className="bg-white px-6 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-center rounded-lg bg-neutral-200 py-20 text-center">
          <div>
            <div className="mb-2 text-3xl">🗺️</div>
            <p className="text-sm text-neutral-600">
              {props.address ?? `${props.lat ?? 55.75}, ${props.lng ?? 37.62}`}
            </p>
            <p className="mt-1 text-xs text-neutral-400">Карта загружается</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GalleryBlock(_props: BlockProps) {
  return (
    <div className="bg-neutral-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-6 text-2xl font-bold">Галерея</h2>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-square rounded-lg bg-neutral-200" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AccordionBlock({ block }: BlockProps) {
  const props = block.props as { items?: Array<{ title: string; content: string }> };
  const items = props.items ?? [
    { title: "Раздел 1", content: "Содержимое раздела 1" },
    { title: "Раздел 2", content: "Содержимое раздела 2" },
  ];
  return (
    <div className="bg-white px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-2">
        {items.map((item, i) => (
          <details key={i} className="rounded-lg border">
            <summary className="cursor-pointer px-4 py-3 font-medium">{item.title}</summary>
            <p className="border-t px-4 py-3 text-sm text-neutral-600">{item.content}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

export function TabsBlock({ block }: BlockProps) {
  const props = block.props as { tabs?: Array<{ title: string; content: string }> };
  const tabs = props.tabs ?? [
    { title: "Вкладка 1", content: "Содержимое 1" },
    { title: "Вкладка 2", content: "Содержимое 2" },
  ];
  return (
    <div className="bg-white px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex border-b">
          {tabs.map((tab, i) => (
            <button key={i} className={`px-4 py-2 text-sm ${i === 0 ? "border-b-2 border-[#13347f] font-medium" : "text-neutral-500"}`}>
              {tab.title}
            </button>
          ))}
        </div>
        <div className="p-4 text-sm text-neutral-600">{tabs[0].content}</div>
      </div>
    </div>
  );
}

export function DividerBlock({ block }: BlockProps) {
  const props = block.props as { style?: "solid" | "dashed" | "dotted"; color?: string };
  return (
    <hr
      className="my-8"
      style={{
        borderStyle: props.style ?? "solid",
        borderColor: props.color ?? "#e5e7eb",
      }}
    />
  );
}

export function ImageBlock({ block }: BlockProps) {
  const props = block.props as { src?: string; alt?: string; caption?: string };
  return (
    <div className="bg-white px-6 py-8 text-center">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-center rounded-lg bg-neutral-100 py-16">
          <div className="text-center">
            <div className="mb-1 text-3xl">🖼️</div>
            <p className="text-xs text-neutral-400">{props.src ?? "URL изображения"}</p>
          </div>
        </div>
        {props.caption && <p className="mt-2 text-sm text-neutral-500">{props.caption}</p>}
      </div>
    </div>
  );
}

export function VideoBlock({ block }: BlockProps) {
  const props = block.props as { url?: string; title?: string };
  return (
    <div className="bg-white px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <div className="flex aspect-video items-center justify-center rounded-lg bg-neutral-900 text-center text-white">
          <div>
            <div className="mb-2 text-4xl">▶️</div>
            <p className="text-sm">{props.title ?? "Видео"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
