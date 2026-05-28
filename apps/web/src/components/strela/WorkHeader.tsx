import type { ReactNode } from "react";
import { Link } from "wouter";
import { useProfile } from "@/providers/ProfileProvider";

interface Props {
  pageTitle: string;
  pageTitleLogoSrc?: string | null;
  leftSlot?: ReactNode;
}

export function WorkHeader({ pageTitle, pageTitleLogoSrc, leftSlot }: Props) {
  const { user } = useProfile();

  return (
    <header
      className="relative shrink-0 bg-white font-sans"
      style={{ fontFamily: "var(--funnel-font-body)" }}
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 py-2.5 sm:py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {leftSlot}
            <div className="flex min-w-0 max-w-[min(100%,42rem)] flex-1 items-center justify-start gap-2 sm:gap-2.5">
              {pageTitleLogoSrc ? (
                <img
                  src={pageTitleLogoSrc}
                  alt=""
                  className="h-7 w-auto max-h-9 max-w-[min(55vw,15rem)] shrink-0 object-contain object-left sm:h-8 sm:max-w-[17rem]"
                  decoding="async"
                />
              ) : null}
              <h1 className="min-w-0 flex-1 truncate text-left text-base font-semibold text-black sm:text-lg md:text-xl">
                {pageTitle}
              </h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 text-sm">
            {user ? (
              <Link
                href="/login"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/20 text-gray-700 transition-colors hover:bg-gray-50"
                title={user.displayName}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </Link>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-[var(--funnel-primary)] hover:underline"
              >
                Войти
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
