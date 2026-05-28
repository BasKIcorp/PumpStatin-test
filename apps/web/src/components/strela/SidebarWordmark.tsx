interface Props {
  wordmarkSrc: string | null;
  sidebarText?: string;
}

export function SidebarWordmark({ wordmarkSrc, sidebarText }: Props) {
  const text = sidebarText?.trim();
  if (!wordmarkSrc && !text) {
    return <div className="h-full w-full bg-white" aria-hidden />;
  }

  return (
    <div
      className="flex h-full min-h-0 w-full flex-col items-start justify-start gap-2 overflow-x-visible overflow-y-auto bg-white px-1.5 pt-2 sm:px-2 sm:pt-2.5"
      aria-hidden
    >
      {wordmarkSrc ? (
        <img
          src={wordmarkSrc}
          alt=""
          className="w-full max-w-full object-contain object-[left_top]"
          style={{ maxHeight: "min(72dvh, calc(100dvh - 6rem))" }}
          decoding="async"
        />
      ) : null}
      {text ? (
        <p className="selection-flow-sidebar-text max-w-full text-[10px] leading-snug text-slate-600 sm:text-xs">
          {text}
        </p>
      ) : null}
    </div>
  );
}
