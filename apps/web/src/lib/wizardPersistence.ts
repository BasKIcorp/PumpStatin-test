const STEP_KEY = "pumpstation-wizard-step";
const PROFILE_KEY = "pumpstation-wizard-profile";

export function persistWizardStep(profileId: string, stepId: string) {
  try {
    sessionStorage.setItem(PROFILE_KEY, profileId);
    sessionStorage.setItem(`${STEP_KEY}:${profileId}`, stepId);
  } catch {
    /* ignore quota / private mode */
  }
}

export function readPersistedWizardStep(profileId: string, validStepIds: string[]): string | null {
  try {
    const saved = sessionStorage.getItem(`${STEP_KEY}:${profileId}`);
    if (saved && validStepIds.includes(saved)) return saved;
  } catch {
    /* ignore */
  }
  return null;
}

export function clearWizardStepForProfile(profileId: string) {
  try {
    sessionStorage.removeItem(`${STEP_KEY}:${profileId}`);
  } catch {
    /* ignore */
  }
}
