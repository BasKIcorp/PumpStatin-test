import { useProfile } from "@/providers/ProfileProvider";

import { useWizardStore } from "@/stores/wizardStore";

import { CardGridStep } from "@/components/wizard/CardGridStep";

import { SelectionFormStep } from "@/components/wizard/SelectionFormStep";

import { StrelaCardGridStep } from "@/components/strela/StrelaCardGridStep";

import { StrelaSelectionFormStep } from "@/components/strela/StrelaSelectionFormStep";

import type { NavigationConfig } from "@/types/wizard";



export function WizardEngine() {

  const { wizard, branding } = useProfile();

  const step = useWizardStore((s) => s.step);

  const nav = wizard.navigation as NavigationConfig;

  const isStrela = branding.layoutVariant === "strela-funnel";



  if (isStrela && step === "selection-form") {

    return <StrelaSelectionFormStep />;

  }



  switch (step) {

    case "product-class":

      return isStrela ? (

        <StrelaCardGridStep

          stepId="product-class"

          titleKey="appTitle"

          subtitleKey="homeSubtitle"

          cards={nav.cards["product-class"]}

        />

      ) : (

        <CardGridStep

          stepId="product-class"

          titleKey="appTitle"

          subtitleKey="homeSubtitle"

          cards={nav.cards["product-class"]}

        />

      );

    case "product-line":

      return isStrela ? (

        <StrelaCardGridStep

          stepId="product-line"

          title="Линейка насосных установок"

          subtitle="Далее уточните тип сети — хоз-пит или ПНС"

          cards={nav.cards["product-line"]}

        />

      ) : (

        <CardGridStep

          stepId="product-line"

          title="Линейка насосных установок"

          subtitle="Далее уточните тип сети — хоз-пит или ПНС"

          cards={nav.cards["product-line"]}

          backLabel="← Класс продукции"

        />

      );

    case "installation-type":

      return isStrela ? (

        <StrelaCardGridStep

          stepId="installation-type"

          title="Тип установки"

          subtitle="Выберите назначение установки"

          cards={nav.cards["installation-type"]}

        />

      ) : (

        <CardGridStep

          stepId="installation-type"

          title="Тип установки"

          subtitle="Выберите назначение установки"

          cards={nav.cards["installation-type"]}

          backLabel="← Назад к линейке"

        />

      );

    case "selection-form":

      return <SelectionFormStep />;

    default:

      return null;

  }

}


