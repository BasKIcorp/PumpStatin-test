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
    style.color = "#ffffff";
  }

  return (
    <section
      className="hero-block flex min-h-[30vh] flex-col items-center justify-center px-6 py-16 text-center"
      style={style}
    >
      <h1 className="mb-3 max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
        {props.heading ?? "Заголовок"}
      </h1>
      {props.subheading && (
        <p className="mb-6 max-w-2xl text-base text-white/80 sm:text-lg">
          {props.subheading}
        </p>
      )}
      {props.cta && (
        <Link
          href={props.cta.pageId ? `/${props.cta.pageId}` : "/"}
          className="inline-flex items-center justify-center rounded-md bg-white/20 px-8 py-3 text-base font-medium text-white shadow backdrop-blur transition-colors hover:bg-white/30"
        >
          {props.cta.label}
        </Link>
      )}
    </section>
  );
}
