import { useEffect, useId, useRef, useState } from "react";

type AdminMermaidDiagramProps = {
  /** Исходник диаграммы Mermaid (flowchart и т.д.) */
  diagram: string;
  className?: string;
};

/**
 * Ленивая отрисовка Mermaid; каждый экземпляр получает уникальный id рендера.
 */
export function AdminMermaidDiagram({ diagram, className }: AdminMermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reactId = useId().replace(/:/g, "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          securityLevel: "loose",
        });
        if (cancelled || !containerRef.current) return;
        const renderId = `admin-mmd-${reactId}`;
        const { svg, bindFunctions } = await mermaid.render(renderId, diagram);
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = svg;
        bindFunctions?.(containerRef.current);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Не удалось отрисовать схему");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [diagram, reactId]);

  if (error) {
    return (
      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className ?? "admin-mermaid overflow-x-auto min-h-[180px] text-foreground [&_svg]:max-w-full"}
    />
  );
}
