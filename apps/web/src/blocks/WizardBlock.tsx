import { WizardPage } from "@/pages/WizardPage";

/**
 * Блок-обёртка для отображения страницы визарда (WizardPage)
 * внутри динамической системы рендеринга страниц (PageRenderer).
 *
 * WizardPage уже содержит всю логику layout'а, AppShell и выбор вариации.
 */
export function WizardBlock() {
  return <WizardPage />;
}
