import { AppShell } from "@/components/layout/AppShell";

import { StrelaWizardShell } from "@/components/strela/StrelaWizardShell";

import { WizardEngine } from "@/engines/WizardEngine";

import { useProfile } from "@/providers/ProfileProvider";

import { useWizardStore } from "@/stores/wizardStore";



export function WizardPage() {

  const { branding } = useProfile();

  const step = useWizardStore((s) => s.step);

  const isStrela = branding.layoutVariant === "strela-funnel";



  if (isStrela) {

    if (step === "selection-form") {

      return <WizardEngine />;

    }

    return (

      <StrelaWizardShell>

        <WizardEngine />

      </StrelaWizardShell>

    );

  }



  return (

    <AppShell>

      <WizardEngine />

    </AppShell>

  );

}


