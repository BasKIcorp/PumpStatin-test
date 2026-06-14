import { Link } from "wouter";
import type { BlockProps } from "@pumpstation/contracts";

export function HeroBlock({ block }: BlockProps) {
  const props = block.props as {
    heading?: string;
    subheading?: string;
    cta?: { label: string; pageId: string };
    background?: string;
  };

  const style: React.CSSProperties = {};
  if (props.background) {
    style.backgroundColor = props.background;
  }

  return (
    <section className="hero-block flex min-h-[50vh] flex-col items-center justify-center px-6 py-20 text-center"
      style={style}
    >
      <h1 className="mb-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
        {props.heading ?? "Заголовок"}
      </h1>
      {props.subheading && (
        <p className="mb-8 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          {props.subheading}
        </p>
      )}
      {props.cta && (
        <Link
          href={props.cta.pageId ? `/${props.cta.pageId}` : "/"}
          className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-base font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          {props.cta.label}
        </Link>
      )}
    </section>
  );
}
