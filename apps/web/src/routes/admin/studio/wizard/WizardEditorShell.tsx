export function WizardEditorShell() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-neutral-700">Редактор визарда</h3>
      <p className="text-sm text-neutral-500">
        Шаги подбора и поля формы редактируются в YAML-файлах профиля.
      </p>
      <p className="text-sm text-neutral-500">
        Полноценный визуальный редактор визарда появится в одном из следующих обновлений. 
        Пока изменения вносятся в файловой системе: <code className="rounded bg-neutral-100 px-1 py-0.5 text-xs">config/profiles/{'{profileId}'}/wizard/</code>
      </p>
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
        💡 Для редактирования шагов используйте вкладку «Профили» → выберите профиль → раздел «Плагины» в старой админке.
      </div>
    </div>
  );
}
