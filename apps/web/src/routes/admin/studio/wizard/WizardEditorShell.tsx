import { useEffect, useState } from "react";
import { apiFetch } from "@/api/client";
import { WizardEditor } from "./WizardEditor";

export function WizardEditorShell({ profileId }: { profileId?: string }) {
  const [wizardNav, setWizardNav] = useState<Record<string, unknown> | null>(null);
  const [flows, setFlows] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    if (!profileId) return;
    setLoading(true);
    apiFetch<{ navigation: Record<string, unknown>; flows: Record<string, unknown> }>(
      `/api/v1/admin/profiles/${encodeURIComponent(profileId)}/wizard`,
    )
      .then((d) => {
        setWizardNav(d.navigation);
        setFlows(d.flows);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Ошибка загрузки"))
      .finally(() => setLoading(false));
  }, [profileId]);

  const handleSave = async (nav: Record<string, unknown>) => {
    if (!profileId) return;
    setSaveMsg("");
    try {
      const wizardData = {
        navigation: nav,
        flows,
      };
      await apiFetch(`/api/v1/admin/profiles/${encodeURIComponent(profileId)}/wizard`, {
        method: "PUT",
        body: JSON.stringify(wizardData),
      });
      setSaveMsg("Сохранено");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка сохранения");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8 text-sm text-neutral-500">Загрузка визарда...</div>;
  }

  if (error) {
    return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-3">
      {saveMsg && (
        <div className="rounded bg-green-100 px-3 py-1 text-xs text-green-700">{saveMsg}</div>
      )}
      <WizardEditor
        initialNav={wizardNav}
        onSave={handleSave}
      />
    </div>
  );
}
