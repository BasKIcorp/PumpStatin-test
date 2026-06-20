import { createContext, useContext, type ReactNode } from "react";
import type { ProfileBundle } from "@/api/config";
import { ThemeProvider } from "./ThemeProvider";

export const StudioProfileContext = createContext<ProfileBundle | null>(null);

export function StudioProfileProvider({
  bundle,
  children,
}: {
  bundle: ProfileBundle;
  children: ReactNode;
}) {
  return (
    <StudioProfileContext.Provider value={bundle}>
      <ThemeProvider>{children}</ThemeProvider>
    </StudioProfileContext.Provider>
  );
}

export function useStudioProfile() {
  return useContext(StudioProfileContext);
}
