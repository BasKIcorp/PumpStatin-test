interface Props {
  title: string;
  subtitle?: string;
}

export function FunnelHeading({ title, subtitle }: Props) {
  return (
    <div className="min-w-0 text-left">
      <h1 className="selection-flow-funnel-heading text-[var(--funnel-primary)] text-xl leading-tight sm:text-2xl lg:text-3xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-0.5 text-sm text-[var(--funnel-text-muted)] sm:text-base">{subtitle}</p>
      ) : null}
    </div>
  );
}
