import { createContext, useContext } from "react";

/** Контекст studio-редактора визарда: выбор карточек и frame-блоков на превью */
export interface WizardStudioContextValue {
  selectedCardId?: string | null;
  onSelectCard?: (cardId: string) => void;
}

export const WizardStudioContext = createContext<WizardStudioContextValue | null>(null);

export function useWizardStudio() {
  return useContext(WizardStudioContext);
}
