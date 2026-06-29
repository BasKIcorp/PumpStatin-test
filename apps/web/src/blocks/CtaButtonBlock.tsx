import { Link } from "wouter";
import type { BlockProps } from "@pumpstation/contracts";
import { useProfile } from "@/providers/ProfileProvider";

/** Standalone CTA / link button block for CMS and wizard grids. */
export function CtaButtonBlock({ block }: BlockProps) {
  const { branding } = useProfile();
  const label = String(block.props.label ?? "Подобрать");
  const href = String(block.props.href ?? "/");
  const pageId = block.props.pageId as string | undefined;
  const variant = String(block.props.variant ?? "primary");
  const target = block.props.openInNewTab ? "_blank" : undefined;

  const resolvedHref =
    pageId && pageId.startsWith("/") ? pageId : pageId ? `/${pageId}` : href;

  const base =
    "inline-flex items-center justify-center rounded px-4 py-2 text-sm font-medium transition-colors";
  const styles =
    variant === "outline"
      ? "border border-current bg-transparent text-[var(--color-primary,#13347f)] hover:bg-neutral-50"
      : variant === "ghost"
        ? "bg-transparent text-[var(--color-primary,#13347f)] hover:bg-neutral-100"
        : "bg-[var(--color-primary,#13347f)] text-white hover:opacity-90";

  return (
    <div className="flex h-full w-full items-center justify-center p-2">
      <Link
        href={resolvedHref}
        target={target}
        rel={target ? "noopener noreferrer" : undefined}
        className={`${base} ${styles}`}
        style={{ fontFamily: branding.fonts?.body }}
      >
        {label}
      </Link>
    </div>
  );
}
