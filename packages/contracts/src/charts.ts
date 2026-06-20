/** Стили графиков из ТЗ п. 3.3 */

export interface ChartLineStyle {
  color: string;
  width: number;
  dash?: "solid" | "long" | "short";
}

export interface ChartAxisStyle {
  label: string;
  title?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
}

export interface ChartStyle {
  fontFamily: string;
  fontSize: number;
  grid: ChartLineStyle;
  axes: ChartLineStyle;
  curves: {
    qh_main: ChartLineStyle;
    qh_viscosity: ChartLineStyle;
    system: ChartLineStyle;
    eta: ChartLineStyle;
    p2: ChartLineStyle;
    npsh: ChartLineStyle;
    h_guaranteed: ChartLineStyle;
    working_point: { fill: string; stroke?: string };
  };
  axesLabels: {
    Q: ChartAxisStyle;
    H: ChartAxisStyle;
    eta: ChartAxisStyle;
    p2: ChartAxisStyle;
    npsh: ChartAxisStyle;
  };
}

export const DEFAULT_CHART_STYLE: ChartStyle = {
  fontFamily: "Open Sans, Segoe UI, sans-serif",
  fontSize: 14,
  grid: { color: "#7F7F7F", width: 0.75, dash: "solid" },
  axes: { color: "#000000", width: 1, dash: "solid" },
  curves: {
    qh_main: { color: "#13347F", width: 3, dash: "solid" },
    qh_viscosity: { color: "#8FAADC", width: 1.5, dash: "solid" },
    system: { color: "#A00808", width: 1.5, dash: "solid" },
    eta: { color: "#000000", width: 1.25, dash: "solid" },
    p2: { color: "#13347F", width: 1.25, dash: "solid" },
    npsh: { color: "#13347F", width: 1.25, dash: "solid" },
    h_guaranteed: { color: "#000000", width: 0.75, dash: "short" },
    working_point: { fill: "#061d52" },
  },
  axesLabels: {
    Q: { label: "Q, м³/ч", title: "Q, м³/ч" },
    H: { label: "H, м", title: "Напор" },
    eta: { label: "η, %", title: "Гидравлический КПД" },
    p2: { label: "P2, кВт", title: "Мощность на валу P2" },
    npsh: { label: "NPSH, м", title: "Кавитационный запас" },
  },
};
