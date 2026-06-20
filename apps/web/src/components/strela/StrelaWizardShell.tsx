import type { ReactNode } from "react";

import { useProfile } from "@/providers/ProfileProvider";

import { useWizardStore } from "@/stores/wizardStore";

import { FUNNEL_SIDEBAR_WORDMARK_DEFAULT } from "@/lib/strela/selectionAssets";

import { resolveStrelaStageHeading } from "@/lib/strela/stageHeadings";
import type { NavigationConfig } from "@/types/wizard";

import { FunnelHeaderRight } from "./FunnelHeaderRight";

import { SelectionFlowFunnel } from "./SelectionFlowFunnel";



const BACK_LABELS: Partial<Record<string, string>> = {
  "product-line": "← Класс продукции",
  "hm-line": "← Класс продукции",
  "pu-line": "← Класс продукции",
  "simpel-line": "← Класс продукции",
  "installation-type": "← Назад к линейке",
};



export function StrelaWizardShell({
  children,
  embedded = false,
  previewStepId,
}: {
  children: ReactNode;
  embedded?: boolean;
  /** Studio: заголовок funnel по выбранному шагу превью */
  previewStepId?: string;
}) {
  const { branding, wizard } = useProfile();
  const storeStep = useWizardStore((s) => s.step);
  const step = previewStepId ?? storeStep;

  const goBack = useWizardStore((s) => s.goBack);

  const appearance = branding.appearance;

  const nav = wizard.navigation as NavigationConfig;
  const stepDef = nav.steps?.find((s) => s.id === step);
  const fallback = resolveStrelaStageHeading(step, branding);
  const meta =
    stepDef?.title || stepDef?.subtitle
      ? {
          title: stepDef.title ?? fallback.title,
          subtitle: stepDef.subtitle ?? fallback.subtitle,
        }
      : fallback;

  const backLabel = BACK_LABELS[step];
  const sidebarWidth = appearance?.funnel_sidebar_width;



  return (

    <div
      className={
        embedded
          ? "flex h-full min-h-0 flex-col overflow-hidden"
          : "flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden"
      }
    >
      <SelectionFlowFunnel
        embedded={embedded}

        sidebarWordmarkSrc={

          appearance?.funnel_sidebar_wordmark_url ?? FUNNEL_SIDEBAR_WORDMARK_DEFAULT

        }

        sidebarText={appearance?.sidebar_text}

        sidebarWidth={sidebarWidth}

        title={meta.title}

        subtitle={meta.subtitle}

        onBack={backLabel ? goBack : undefined}

        backLabel={backLabel}

        headerRight={<FunnelHeaderRight loginLabel={branding.copy?.loginLabel} />}

        stageBackgroundSrc={null}

        bodyClassName="overflow-hidden"

      >

        {children}

      </SelectionFlowFunnel>

    </div>

  );

}


