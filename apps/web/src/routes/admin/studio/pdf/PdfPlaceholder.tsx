export function PdfPlaceholder() {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-neutral-700">Конструктор PDF</h3>
      <p className="text-sm text-neutral-500">
        Визуальный drag-and-drop конструктор PDF-шаблонов.
      </p>
      <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 p-16">
        <div className="text-center text-neutral-400">
          <div className="mb-2 text-3xl">📄</div>
          <p className="text-sm font-medium">Конструктор PDF появится в Phase 3</p>
          <p className="mt-1 text-xs">
            Будет доступно: A4 canvas, drag-drop блоков (Header, Table, Footer), data binding.
          </p>
        </div>
      </div>
    </div>
  );
}
