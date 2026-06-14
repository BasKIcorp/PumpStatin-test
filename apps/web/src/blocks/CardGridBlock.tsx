import type { BlockProps } from "@pumpstation/contracts";

interface CardItem {
  icon?: string;
  title: string;
  text: string;
}

export function CardGridBlock({ block }: BlockProps) {
  const props = block.props as {
    cards?: CardItem[];
    columns?: number;
  };

  const cards = props.cards ?? [];
  const columns = Math.min(Math.max(props.columns ?? 3, 1), 4);

  const gridCols: Record<number, string> = {
    1: "md:grid-cols-1",
    2: "md:grid-cols-2",
    3: "md:grid-cols-3",
    4: "md:grid-cols-4",
  };

  return (
    <section className="card-grid-block px-6 py-16">
      <div className={`mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 ${gridCols[columns]}`}>
        {cards.map((card, i) => (
          <div
            key={i}
            className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            {card.icon && (
              <div className="mb-3 text-2xl">{card.icon}</div>
            )}
            <h3 className="mb-2 text-lg font-semibold">{card.title}</h3>
            <p className="text-sm text-muted-foreground">{card.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
