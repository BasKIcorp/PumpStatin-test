import type { ReactNode } from "react";

import { useProfile } from "@/providers/ProfileProvider";

import { useWizardStore } from "@/stores/wizardStore";

import { stageBackdropUrl } from "@/lib/strela/appearance";
import { FUNNEL_SIDEBAR_WORDMARK_DEFAULT } from "@/lib/strela/selectionAssets";

import { resolveStrelaStageHeading } from "@/lib/strela/stageHeadings";

import { FunnelHeaderRight } from "./FunnelHeaderRight";

import { SelectionFlowFunnel } from "./SelectionFlowFunnel";



const BACK_LABELS: Partial<Record<string, string>> = {

  "product-line": "← Класс продукции",

  "installation-type": "← Назад к линейке",

};



export function StrelaWizardShell({ children }: { children: ReactNode }) {

  const { branding } = useProfile();

  const step = useWizardStore((s) => s.step);

  const goBack = useWizardStore((s) => s.goBack);

  const appearance = branding.appearance;

  const meta = resolveStrelaStageHeading(step, branding);

  const backLabel = BACK_LABELS[step];



  return (

    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden">

      <SelectionFlowFunnel

        sidebarWordmarkSrc={

          appearance?.funnel_sidebar_wordmark_url ?? FUNNEL_SIDEBAR_WORDMARK_DEFAULT

        }

        sidebarText={appearance?.sidebar_text ?? branding.sidebar?.logoText}

        title={meta.title}

        subtitle={meta.subtitle}

        onBack={backLabel ? goBack : undefined}

        backLabel={backLabel}

        headerRight={<FunnelHeaderRight loginLabel={branding.copy?.loginLabel} />}

        stageBackgroundSrc={

          step === "product-class"

            ? stageBackdropUrl(1)

            : step === "product-line"

              ? stageBackdropUrl(2)

              : step === "installation-type"

                ? stageBackdropUrl(3)

                : null

        }

        bodyClassName="overflow-hidden"

      >

        {children}

      </SelectionFlowFunnel>

    </div>

  );

}


