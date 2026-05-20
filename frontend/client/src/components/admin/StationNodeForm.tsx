import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function Hint({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1" title={text}>
        {children}
        <span className="text-muted-foreground cursor-help text-xs">ⓘ</span>
      </div>
    </div>
  );
}

function BindingInput(props: {
  label: string;
  value: string | undefined;
  hint: string;
  onChange?: (val: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <Hint text={props.hint}>
        <Label>{props.label}</Label>
      </Hint>
      <Input
        className="font-mono text-xs"
        value={props.value ?? ""}
        onChange={(e) => props.onChange?.(e.target.value)}
        readOnly={props.readOnly}
      />
    </div>
  );
}

interface StationNodeFormProps {
  kind: string;
  params: Record<string, unknown>;
  onChange: (newParams: Record<string, unknown>) => void;
}

function updateParam(
  params: Record<string, unknown>,
  key: string,
  value: unknown
): Record<string, unknown> {
  return { ...params, [key]: value };
}

export function StationNodeForm({ kind, params, onChange }: StationNodeFormProps) {
  const p = (key: string, fallback = "") =>
    String(params[key] ?? fallback);
  const b = (key: string, fallback = "") =>
    String(params[key] ?? fallback);
  const toggled = (key: string, fallback = true) =>
    params[key] !== undefined ? Boolean(params[key]) : fallback;

  // --- station_select_filter, predokh, vibroopora: simple switch ---
  if (kind === "station_select_filter" || kind === "station_select_predokh" || kind === "station_select_vibroopora") {
    return (
      <div className="space-y-3 p-3">
        <div className="flex items-center justify-between">
          <Label>Включено</Label>
          <Switch
            checked={toggled("enabled")}
            onCheckedChange={(v) => onChange(updateParam(params, "enabled", v))}
          />
        </div>
        <BindingInput label="input binding" value={b("input")} hint="Путь к данным" />
      </div>
    );
  }

  // --- station_aggregate: readonly summary ---
  // --- station_aggregate ---
  if (kind === "station_aggregate") {
    const eqCount = Object.keys(params).filter((k) => k.startsWith("eq_")).length;
    const nv = (key: string, fallback = "") => String(params[key] ?? fallback);
    const nf = (key: string, fallback = 0) => Number(params[key] ?? fallback);
    return (
      <div className="space-y-3 p-3">
        <Hint text="Сводка всех компонентов станции">
          <Label className="font-bold">Агрегация станции</Label>
        </Hint>
        <div className="rounded border bg-muted p-2 text-xs space-y-1">
          <div>Компонентов: {eqCount}</div>
          <div>Опции: {nv("options", "—")}</div>
          <div>PN: {nv("PN", "—")}</div>
          <div>n2: {nv("n2", "—")}</div>
        </div>

        <details open>
          <summary className="cursor-pointer font-medium text-sm">Наценки стоимости</summary>
          <div className="space-y-2 mt-2 pl-2">
            <div>
              <Hint text="Добавка за обогрев кожуха (руб)">
                <Label>Кожух с обогревом</Label>
              </Hint>
              <Input
                type="number"
                className="text-xs"
                value={nf("cost_markup_heating", 0)}
                onChange={(e) => onChange(updateParam(params, "cost_markup_heating", Number(e.target.value)))}
              />
            </div>
            <div>
              <Hint text="Произвольная добавка к стоимости">
                <Label>Кастомная наценка</Label>
              </Hint>
              <Input
                type="number"
                className="text-xs"
                value={nf("cost_markup_custom_value", 0)}
                onChange={(e) => onChange(updateParam(params, "cost_markup_custom_value", Number(e.target.value)))}
              />
            </div>
          </div>
        </details>

        <div>
          <Label>equipment (JSON)</Label>
          <textarea
            className="w-full rounded border bg-background px-3 py-2 text-xs font-mono"
            rows={6}
            value={JSON.stringify(params, null, 2)}
            readOnly
          />
        </div>
      </div>
    );
  }

  // --- station_select_collector ---
  if (kind === "station_select_collector") {
    const nf = (key: string, fallback = 0) => Number(params[key] ?? fallback);
    return (
      <div className="space-y-3 p-3">
        <Hint text="Материал коллектора">
          <Label>Материал коллектора</Label>
        </Hint>
        <Select
          value={b("collector_material", "AISI304")}
          onValueChange={(v) => onChange(updateParam(params, "collector_material", v))}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="AISI304">AISI304 (нерж.)</SelectItem>
            <SelectItem value="сталь20">Сталь20</SelectItem>
          </SelectContent>
        </Select>
        <BindingInput label="Q binding" value={b("Q")} hint="Расход насоса" />
        <BindingInput label="n binding" value={b("n")} hint="Количество насосов" />
        <BindingInput label="n1 binding" value={b("n1")} hint="Рабочих насосов" />
        <BindingInput label="D1 binding" value={b("D1")} hint="Диаметр всасывания насоса" />

        <details>
          <summary className="cursor-pointer font-medium text-sm">⚙️ Таблица подбора (опционально)</summary>
          <div className="space-y-2 mt-2 pl-2">
            <Hint text="JSON-массив [Qmin,Qmax,DN_otv,DN_2нас,DN_3нас,...]. Если пусто — используется стандартная.">
              <Label>COLLECTOR_TABLE override</Label>
            </Hint>
            <textarea
              className="w-full rounded border bg-background px-3 py-2 text-xs font-mono"
              rows={5}
              value={JSON.stringify(
                (params as Record<string, unknown>)["collector_table"] ??
                  [[16,25,50,65,80],[26,40,65,100,125],[41,60,80,125,150]],
                null, 2
              )}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  if (Array.isArray(parsed))
                    onChange(updateParam(params, "collector_table", parsed));
                } catch {}
              }}
            />
          </div>
        </details>
      </div>
    );
  }

  // --- station_select_frame (THE MOST COMPLEX) ---
  if (kind === "station_select_frame") {
    const nf = (key: string, fallback = 0) => Number(params[key] ?? fallback);
    return (
      <div className="space-y-3 p-3">
        <div className="rounded border bg-blue-50 p-2 text-xs font-medium text-blue-800">
          Параметры из 10 upstream-нод. Приходят автоматически по связям графа.
        </div>

        <details open>
          <summary className="cursor-pointer font-medium text-sm">📐 Константы расчёта</summary>
          <div className="space-y-2 mt-2 pl-2">
            <div>
              <Hint text="Зазор между элементами на раме (мм)">
                <Label>Зазор (frame_gap_mm)</Label>
              </Hint>
              <Input
                type="number"
                className="text-xs"
                value={nf("frame_gap_mm", 150)}
                onChange={(e) => onChange(updateParam(params, "frame_gap_mm", Number(e.target.value)))}
              />
            </div>
            <div>
              <Hint text="Запас по ширине рамы относительно насоса (мм)">
                <Label>Запас ширины (frame_width_margin)</Label>
              </Hint>
              <Input
                type="number"
                className="text-xs"
                value={nf("frame_width_margin", 100)}
                onChange={(e) => onChange(updateParam(params, "frame_width_margin", Number(e.target.value)))}
              />
            </div>
            <div>
              <Hint text="Коэффициент длины рамы относительно длины насоса">
                <Label>Коэф. длины (frame_length_factor)</Label>
              </Hint>
              <Input
                type="number"
                step="0.05"
                className="text-xs"
                value={nf("frame_length_factor", 0.6)}
                onChange={(e) => onChange(updateParam(params, "frame_length_factor", Number(e.target.value)))}
              />
            </div>
          </div>
        </details>

        <details open>
          <summary className="cursor-pointer font-medium text-sm">От насоса</summary>
          <div className="space-y-2 mt-2 pl-2">
            <BindingInput label="Тип станции" value={b("station_type")} hint="" readOnly />
            <BindingInput label="n (всего)" value={b("n")} hint="" readOnly />
            <BindingInput label="D1" value={b("D1")} hint="" readOnly />
            <BindingInput label="D2" value={b("D2")} hint="" readOnly />
            <BindingInput label="Ширина насоса" value={b("nasos_shirina")} hint="" readOnly />
            <BindingInput label="Длина насоса" value={b("nasos_dlina")} hint="" readOnly />
          </div>
        </details>
        <details>
          <summary className="cursor-pointer font-medium text-sm">От отвода</summary>
          <div className="space-y-2 mt-2 pl-2">
            <BindingInput label="Радиус отвода" value={b("otvod_radius")} hint="" readOnly />
          </div>
        </details>
        <details>
          <summary className="cursor-pointer font-medium text-sm">От переходов</summary>
          <div className="space-y-2 mt-2 pl-2">
            <BindingInput label="Длина перехода D1→D0" value={b("perehod_d1_d0")} hint="" readOnly />
            <BindingInput label="Длина перехода D2→D0" value={b("perehod_d2_d0")} hint="" readOnly />
          </div>
        </details>
        <details>
          <summary className="cursor-pointer font-medium text-sm">От запорной арматуры</summary>
          <div className="space-y-2 mt-2 pl-2">
            <BindingInput label="Длина ЗРА 1" value={b("zap_arm_1_dlina")} hint="" readOnly />
            <BindingInput label="Длина ЗРА 2" value={b("zap_arm_2_dlina")} hint="" readOnly />
          </div>
        </details>
        <details>
          <summary className="cursor-pointer font-medium text-sm">Остальные</summary>
          <div className="space-y-2 mt-2 pl-2">
            <BindingInput label="Длина катушки" value={b("katushka_dlina")} hint="" readOnly />
            <BindingInput label="Длина фильтра" value={b("dlina_filtra")} hint="" readOnly />
            <BindingInput label="Длина обр. клапана" value={b("dlina_obr_klapan")} hint="" readOnly />
            <BindingInput label="DN коллектора" value={b("Dn")} hint="" readOnly />
            <BindingInput label="D0 (отвод колл.)" value={b("D0")} hint="" readOnly />
            <BindingInput label="Dj (жокей)" value={b("Dj")} hint="" readOnly />
            <BindingInput label="Dp (подпитка)" value={b("Dp")} hint="" readOnly />
            <BindingInput label="Ø фланца коллектора" value={b("collector_diam_flanec")} hint="" readOnly />
          </div>
        </details>
      </div>
    );
  }

  // --- station_select_kozhuh ---
  if (kind === "station_select_kozhuh") {
    return (
      <div className="space-y-3 p-3">
        <BindingInput label="Тип станции" value={b("station_type")} hint="" readOnly />
        <BindingInput label="n" value={b("n")} hint="" readOnly />
        <BindingInput label="Ширина рамы" value={b("shirina_rami")} hint="" readOnly />
        <BindingInput label="Длина рамы" value={b("dlina_rami")} hint="" readOnly />
        <BindingInput label="Высота рамы" value={b("visota_rami")} hint="" readOnly />
      </div>
    );
  }

  // --- station_select_vibrocomp ---
  if (kind === "station_select_vibrocomp") {
    return (
      <div className="space-y-3 p-3">
        <Hint text="Тип подключения">
          <Label>Подключение</Label>
        </Hint>
        <Select
          value={b("connection", "виброкомпенсатор")}
          onValueChange={(v) => onChange(updateParam(params, "connection", v))}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="виброкомпенсатор">Виброкомпенсатор</SelectItem>
            <SelectItem value="фланец">Фланец</SelectItem>
            <SelectItem value="грувлок">Грувлок</SelectItem>
          </SelectContent>
        </Select>
        <BindingInput label="DN" value={b("Dn")} hint="" readOnly />
      </div>
    );
  }

  // --- station_select_shkaf ---
  if (kind === "station_select_shkaf") {
    return (
      <div className="space-y-3 p-3">
        <Hint text="Тип управления">
          <Label>Управление</Label>
        </Hint>
        <Select
          value={b("management", "частотное по выходному давлению")}
          onValueChange={(v) => onChange(updateParam(params, "management", v))}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="частотное по выходному давлению">Частотное по давлению</SelectItem>
            <SelectItem value="релейное по выходному давлению">Релейное по давлению</SelectItem>
            <SelectItem value="частотное по перепаду давления">Частотное по перепаду</SelectItem>
            <SelectItem value="релейное по перепаду давления">Релейное по перепаду</SelectItem>
            <SelectItem value="спринклерная">Спринклерная</SelectItem>
          </SelectContent>
        </Select>
        <BindingInput label="Мощность насоса" value={b("pwr_pump")} hint="" readOnly />
        <BindingInput label="n (всего насосов)" value={b("n")} hint="" readOnly />
      </div>
    );
  }

  // --- station_select_kip ---
  if (kind === "station_select_kip") {
    return (
      <div className="space-y-3 p-3">
        <BindingInput label="Тип станции" value={b("station_type")} hint="" readOnly />
        <BindingInput label="Управление" value={b("management")} hint="" readOnly />
        <BindingInput label="n" value={b("n")} hint="" readOnly />
        <Hint text="Рабочее давление">
          <Label>PN</Label>
        </Hint>
        <Select
          value={b("PN", "PN10")}
          onValueChange={(v) => onChange(updateParam(params, "PN", v))}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PN6">PN6</SelectItem>
            <SelectItem value="PN10">PN10</SelectItem>
            <SelectItem value="PN16">PN16</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  // --- station_select_rash_bak ---
  if (kind === "station_select_rash_bak") {
    return (
      <div className="space-y-3 p-3">
        <Hint text="Объём расширительного бака">
          <Label>Расширительный бак</Label>
        </Hint>
        <Select
          value={b("tank_volume", "200")}
          onValueChange={(v) => onChange(updateParam(params, "tank_volume", v))}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="отсутствует">Отсутствует</SelectItem>
            <SelectItem value="100">100 л</SelectItem>
            <SelectItem value="200">200 л</SelectItem>
            <SelectItem value="300">300 л</SelectItem>
            <SelectItem value="500">500 л</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  // --- station_select_buf_bak ---
  if (kind === "station_select_buf_bak") {
    return (
      <div className="space-y-3 p-3">
        <Hint text="Объём буферного бака">
          <Label>Буферный бак</Label>
        </Hint>
        <Select
          value={b("tank_volume", "200")}
          onValueChange={(v) => onChange(updateParam(params, "tank_volume", v))}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="отсутствует">Отсутствует</SelectItem>
            <SelectItem value="100">100 л</SelectItem>
            <SelectItem value="200">200 л</SelectItem>
            <SelectItem value="300">300 л</SelectItem>
            <SelectItem value="500">500 л</SelectItem>
          </SelectContent>
        </Select>
        <Hint text="Материал бака">
          <Label>Материал</Label>
        </Hint>
        <Select
          value={b("material", "AISI304")}
          onValueChange={(v) => onChange(updateParam(params, "material", v))}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="AISI304">AISI304</SelectItem>
            <SelectItem value="Ст20">Ст20</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  // --- station_select_podpitka_jockey ---
  if (kind === "station_select_podpitka_jockey") {
    return (
      <div className="space-y-3 p-3">
        <Hint text="Тип модуля подпитки">
          <Label>Модуль подпитки</Label>
        </Hint>
        <Select
          value={b("makeup_type", "отсутствует")}
          onValueChange={(v) => onChange(updateParam(params, "makeup_type", v))}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="отсутствует">Отсутствует</SelectItem>
            <SelectItem value="Подпиточный клапан">Подпиточный клапан</SelectItem>
            <SelectItem value="Подпиточный насос">Подпиточный насос</SelectItem>
            <SelectItem value="Подпиточный насос и бак">Подпиточный насос и бак</SelectItem>
          </SelectContent>
        </Select>
        <Hint text="Жокей-насос (для ПНС)">
          <Label>Жокей</Label>
        </Hint>
        <Select
          value={b("jockey_mode", "нет")}
          onValueChange={(v) => onChange(updateParam(params, "jockey_mode", v))}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="нет">Нет</SelectItem>
            <SelectItem value="спринклерная">Спринклерная (ПНС)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  // --- Default: generic binding inputs for any other station_* node ---
  const knownKinds: Record<string, { label: string; hint: string }[]> = {
    station_select_pump: [
      { label: "Q", hint: "Расход" },
      { label: "H", hint: "Напор" },
      { label: "n1", hint: "Рабочих насосов" },
      { label: "nasos_type", hint: "Типы насосов" },
    ],
    station_select_perehod: [
      { label: "D1", hint: "Всасывание насоса" },
      { label: "D2", hint: "Напор насоса" },
      { label: "D0", hint: "Диаметр отвода коллектора" },
    ],
    station_select_otvod: [
      { label: "station_type", hint: "Тип станции" },
      { label: "D1", hint: "Всасывание насоса" },
      { label: "Dn", hint: "DN коллектора" },
    ],
    station_select_katushka: [
      { label: "D0", hint: "Диаметр отвода коллектора" },
    ],
    station_select_zap_armatura: [
      { label: "D0", hint: "Диаметр отвода коллектора" },
      { label: "n", hint: "Количество насосов" },
    ],
    station_select_obratniy_klapan: [
      { label: "D0", hint: "Диаметр отвода коллектора" },
      { label: "n", hint: "Количество насосов" },
    ],
    station_select_zatvor: [
      { label: "Dn", hint: "DN коллектора" },
      { label: "n", hint: "Количество насосов" },
    ],
    station_select_koncevik: [
      { label: "station_type", hint: "Тип станции" },
      { label: "n", hint: "Количество насосов" },
    ],
    station_select_insulation: [
      { label: "station_type", hint: "Тип станции" },
      { label: "collector_diameter", hint: "Диаметр коллектора" },
    ],
    station_select_sborska_electrika: [
      { label: "n", hint: "Количество насосов" },
      { label: "Dn", hint: "DN коллектора" },
      { label: "D1", hint: "Всасывание насоса" },
      { label: "D2", hint: "Напор насоса" },
      { label: "pwr_pump", hint: "Мощность насоса" },
    ],
  };

  const fields = knownKinds[kind];
  if (fields) {
    return (
      <div className="space-y-3 p-3">
        {fields.map((f) => (
          <BindingInput
            key={f.label}
            label={f.label}
            value={b(f.label)}
            hint={f.hint}
            readOnly
          />
        ))}
      </div>
    );
  }

  // --- Fallback: generic JSON editor ---
  return (
    <div className="space-y-3 p-3">
      <Hint text="Редактирование параметров узла. Для станционных нод доступны формы выше — этот JSON для кастомных полей.">
        <Label>Дополнительные params (JSON)</Label>
      </Hint>
      <textarea
        className="w-full rounded-md border bg-background px-3 py-2 text-xs font-mono"
        rows={6}
        value={JSON.stringify(params, null, 2)}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value);
            onChange(parsed);
          } catch {
            // no-op while typing
          }
        }}
      />
    </div>
  );
}
