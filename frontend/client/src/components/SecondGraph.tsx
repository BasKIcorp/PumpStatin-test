import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
  Customized,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Pump, CurvePoint } from "@/lib/types";
import { readFunnelChartTheme } from "@/lib/funnelWorkUi";

type SecondAxesMode = "both" | "p2" | "npsh";

interface Props {
  selectedPump: Pump | null;
  mousePosition?: { x: number; y: number } | null;
  onMouseMove?: (position: { x: number; y: number } | null) => void;
  onMouseLeave?: () => void;
  manualSliderValue?: number | null;
  isManualControl?: boolean;
  onManualControl?: (isManual: boolean) => void;
  maxQValue?: number | null;
  simplified?: boolean; // Упрощенная версия для скриншота (без карточки, легенды, заголовка)
  /** Разделить мощность и NPSH на отдельные графики (для макета Simpel) */
  axesMode?: SecondAxesMode;
  /** Без обводки Card — внутри общей панели «Кривые характеристик» */
  hideChrome?: boolean;
}

// Функция для вычисления шага сетки Q
function getQStep(qMax: number): number {
  if (qMax <= 0) return 1;
  
  // Специальные правила с кратно 5 (проверяются в первую очередь)
  if (15 <= qMax && qMax <= 90 && qMax % 5 === 0) return 5;
  if (qMax >= 90 && qMax % 5 === 0) return 25;
  
  // Обычные правила по диапазонам
  if (qMax < 15) return 1;
  if (qMax >= 15 && qMax < 40) return 2;
  if (qMax >= 40 && qMax < 60) return 4;
  if (qMax >= 60 && qMax < 90) return 5;
  if (qMax >= 90 && qMax < 150) return 10;
  if (qMax >= 150 && qMax <= 350) return 20;
  if (qMax > 350) return 50;
  
  return 10; // значение по умолчанию
}

// Функция для округления в большую сторону кратно шагу
function roundUpToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.ceil(value / step) * step;
}

// Функция для выбора шага левой оси (мощность) из списка возможных
function getP2Step(p2Max: number, targetTicks: number): number {
  const possibleSteps = [0.1, 0.2, 0.5, 1, 2, 3, 5, 10, 15, 20];
  
  if (p2Max <= 0) return 1;
  
  // Подбираем шаг так, чтобы количество делений было близко к targetTicks (10-15)
  for (const step of possibleSteps) {
    const roundedMax = roundUpToStep(p2Max, step);
    const tickCount = Math.floor(roundedMax / step) + 1;
    
    if (tickCount >= 10 && tickCount <= 15) {
      return step;
    }
  }
  
  // Если не подошло, берем шаг, который дает ближайшее количество делений к targetTicks
  let bestStep = 1;
  let bestDiff = Infinity;
  
  for (const step of possibleSteps) {
    const roundedMax = roundUpToStep(p2Max, step);
    const tickCount = Math.floor(roundedMax / step) + 1;
    const diff = Math.abs(tickCount - targetTicks);
    
    if (diff < bestDiff) {
      bestDiff = diff;
      bestStep = step;
    }
  }
  
  return bestStep;
}

// Функция для выбора шага правой оси (NPSH) из списка возможных
function getNpshStep(npshMax: number, targetTicks: number): number {
  const possibleSteps = [0.1, 0.2, 0.5, 1, 2, 3];
  
  if (npshMax <= 0) return 0.5;
  
  // Подбираем шаг так, чтобы количество делений было в диапазоне 5-8
  for (const step of possibleSteps) {
    const roundedMax = roundUpToStep(npshMax, step);
    const tickCount = Math.floor(roundedMax / step) + 1;
    
    if (tickCount >= 5 && tickCount <= 8) {
      return step;
    }
  }
  
  // Если не подошло, берем шаг, который дает ближайшее количество делений
  let bestStep = 0.5;
  let bestDiff = Infinity;
  const targetTick = (5 + 8) / 2; // 6.5
  
  for (const step of possibleSteps) {
    const roundedMax = roundUpToStep(npshMax, step);
    const tickCount = Math.floor(roundedMax / step) + 1;
    const diff = Math.abs(tickCount - targetTick);
    
    if (diff < bestDiff) {
      bestDiff = diff;
      bestStep = step;
    }
  }
  
  return bestStep;
}

export default function SecondGraph({
  selectedPump,
  mousePosition,
  onMouseMove,
  onMouseLeave,
  manualSliderValue,
  isManualControl,
  onManualControl,
  maxQValue,
  simplified = false,
  axesMode = "both",
  hideChrome = false,
}: Props) {
  const chartColors = readFunnelChartTheme();

  // Подготавливаем данные для графика мощности и NPSH по оси q
  const qP2Data = selectedPump?.q_p2 ?? [];
  const p2_sData = selectedPump?.p2_s ?? [];
  const qNpshData = selectedPump?.q_npsh ?? [];
  const npsh_sData = selectedPump?.npsh_s ?? [];
  
  // Подготавливаем данные для дополнительных кривых мощности, npsh (только для второго графика)
  const additionalCurvesP2 = selectedPump?.additional_curves_p2 ?? [];
  const additionalCurvesNpsh = selectedPump?.additional_curves_npsh ?? [];
  
  // Создаем объединенный массив всех уникальных значений Q
  const allQValues = Array.from(new Set([
    ...qP2Data.filter(q => q !== null),
    ...qNpshData.filter(q => q !== null)
  ])).sort((a, b) => a - b);

  // Создаем унифицированную структуру данных
  const baseChartData = allQValues.map(q => {
    // Находим соответствующие значения мощности и NPSH для данного Q
    const p2Index = qP2Data.findIndex(qVal => Math.abs((qVal || 0) - q) < 0.001);
    const npshIndex = qNpshData.findIndex(qVal => Math.abs((qVal || 0) - q) < 0.001);
    
    return {
      q: q,
      p2_s: p2Index >= 0 ? p2_sData[p2Index] : null,
      npsh_s: npshIndex >= 0 ? npsh_sData[npshIndex] : null
    };
  });

  // Подготавливаем данные для дополнительных кривых мощности, npsh
  const additionalCurvesP2Data = (() => {
    if (!additionalCurvesP2 || additionalCurvesP2.length === 0) return [];
    
    return additionalCurvesP2.map((curve: any, curveIndex: number) => {
      if (!curve || curve.length === 0) return null;
      
      return curve.map((point: any) => ({
        q: point.Q,
        [`additional_p2_${curveIndex}`]: point.P2,
        p2_s: null,
        npsh_s: null
      }));
    }).filter(Boolean);
  })();


  const additionalCurvesNpshData = (() => {
    if (!additionalCurvesNpsh || additionalCurvesNpsh.length === 0) return [];
    
    return additionalCurvesNpsh.map((curve: any, curveIndex: number) => {
      if (!curve || curve.length === 0) return null;
      
      return curve.map((point: any) => ({
        q: point.Q,
        [`additional_npsh_${curveIndex}`]: point.NPSH,
        eta_s: null,
        npsh_s: null
      }));
    }).filter(Boolean);
  })();

  // Объединяем все данные (основные + дополнительные кривые)
  const allChartData = (() => {
    let combinedData = [...baseChartData];
    
    // Добавляем данные дополнительных кривых мощности
    additionalCurvesP2Data.forEach((curveData: any, curveIndex: number) => {
      if (curveData && curveData.length > 0) {
        const dataKey = `additional_p2_${curveIndex}`;
        
        curveData.forEach((curvePoint: any) => {
          const existingPointIndex = combinedData.findIndex(point => 
            Math.abs((point.q || 0) - (curvePoint.q || 0)) < 0.001
          );
          
          if (existingPointIndex >= 0) {
            (combinedData[existingPointIndex] as any)[dataKey] = curvePoint[dataKey];
          } else {
            combinedData.push({
              q: curvePoint.q,
              p2_s: null,
              npsh_s: null,
              [dataKey]: curvePoint[dataKey]
            } as any);
          }
        });
      }
    });


    // Добавляем данные дополнительных кривых npsh
    additionalCurvesNpshData.forEach((curveData: any, curveIndex: number) => {
      if (curveData && curveData.length > 0) {
        const dataKey = `additional_npsh_${curveIndex}`;
        
        curveData.forEach((curvePoint: any) => {
          const existingPointIndex = combinedData.findIndex(point => 
            Math.abs((point.q || 0) - (curvePoint.q || 0)) < 0.001
          );
          
          if (existingPointIndex >= 0) {
            (combinedData[existingPointIndex] as any)[dataKey] = curvePoint[dataKey];
          } else {
            combinedData.push({
              q: curvePoint.q,
              p2_s: null,
              npsh_s: null,
              [dataKey]: curvePoint[dataKey]
            } as any);
          }
        });
      }
    });
    
    // Сортируем по q для правильного отображения
    return combinedData.sort((a, b) => (a.q || 0) - (b.q || 0));
  })();

  // Добавляем интерполированные точки для более плавного отображения
  const chartData = (() => {
    if (allChartData.length < 2) return allChartData;
    
    const sortedData = [...allChartData].sort((a, b) => (a.q || 0) - (b.q || 0));
    const interpolatedData = [];
    
    for (let i = 0; i < sortedData.length - 1; i++) {
      const current = sortedData[i];
      const next = sortedData[i + 1];
      
      // Добавляем текущую точку
      interpolatedData.push(current);
      
      // Добавляем промежуточные точки с меньшим шагом
      const steps = Math.max(1, Math.floor(((next.q || 0) - (current.q || 0)) / 0.5));
      for (let step = 1; step < steps; step++) {
        const ratio = step / steps;
        const interpolatedQ = (current.q || 0) + ratio * ((next.q || 0) - (current.q || 0));
        
        let interpolatedP2 = null;
        let interpolatedNpsh = null;
        
        if (current.p2_s !== null && next.p2_s !== null) {
          interpolatedP2 = current.p2_s + ratio * (next.p2_s - current.p2_s);
        }
        
        if (current.npsh_s !== null && next.npsh_s !== null) {
          interpolatedNpsh = current.npsh_s + ratio * (next.npsh_s - current.npsh_s);
        }
        
        interpolatedData.push({
          q: interpolatedQ,
          p2_s: interpolatedP2,
          npsh_s: interpolatedNpsh
        });
      }
    }
    
    // Добавляем последнюю точку
    interpolatedData.push(sortedData[sortedData.length - 1]);
    
    return interpolatedData;
  })();

  const baseQ = selectedPump?.Q_base ?? null;
  const baseH = selectedPump?.H_base ?? null;

  const allQs = chartData.map(p => p.q).filter(q => q !== null);
  const allP2s = chartData.map(p => p.p2_s).filter(p2 => p2 !== null);
  const allNpshs = chartData.map(p => p.npsh_s).filter(npsh => npsh !== null);

  // Используем синхронизированное максимальное значение Q или локальное
  const QmaxRaw: number = (maxQValue !== null && maxQValue !== undefined) ? maxQValue : (allQs.length > 0 ? Math.max(...allQs) : 0);
  
  // Вычисляем шаг сетки для Q
  const qStep = getQStep(QmaxRaw);
  
  // Округляем в большую сторону кратно шагу
  const Qmax = roundUpToStep(QmaxRaw, qStep);
  
  const P2maxRaw = allP2s.length > 0 ? Math.max(...allP2s) : 0;
  const NpshmaxRaw = allNpshs.length > 0 ? Math.max(...allNpshs) : 0;
  
  // Вычисляем шаг и максимум для левой оси (мощность P2)
  // Целевое количество делений: от 10 до 15 (берем среднее - 12.5, округляем до 13)
  const targetP2Ticks = 13;
  const p2Step = getP2Step(P2maxRaw, targetP2Ticks);
  const P2max = roundUpToStep(P2maxRaw, p2Step);
  
  // Создаем тики левой оси
  const leftAxisTicksP2 = Array.from({ length: Math.floor(P2max / p2Step) + 1 }, (_, i) => i * p2Step).concat([P2max]);
  const leftAxisTickCountP2 = leftAxisTicksP2.length;
  
  // Вычисляем шаг и максимум для правой оси (NPSH)
  // Целевое количество делений: 5-8 (берем среднее - 6.5)
  const targetNpshTicks = 6.5;
  const npshStep = getNpshStep(NpshmaxRaw, targetNpshTicks);
  const Npshmax = roundUpToStep(NpshmaxRaw, npshStep);
  
  // Вычисляем количество делений правой оси по шагу
  const rightAxisTickCountNpsh = Math.floor(Npshmax / npshStep) + 1;
  
  // Деления правой оси должны визуально совпадать с первыми N делениями левой оси
  // Берем столько делений правой оси, сколько поместится (но не больше количества делений левой оси)
  const targetRightAxisTickCount = Math.min(rightAxisTickCountNpsh, leftAxisTickCountP2);
  
  // Вычисляем домен правой оси так, чтобы визуально деления точно совпадали с левой осью
  // Ключевой момент: деления правой оси должны быть на тех же визуальных уровнях, что и первые targetRightAxisTickCount делений левой оси
  // Для этого домен правой оси должен быть увеличен пропорционально: Npshmax * (leftAxisTickCountP2 / targetRightAxisTickCount)
  // Но значения делений правой оси должны быть распределены так, чтобы они точно совпадали по индексу с делениями левой оси
  const rightAxisDomainNpsh = Npshmax * (leftAxisTickCountP2 / targetRightAxisTickCount);
  
  // Создаем тики правой оси на основе реального шага npshStep
  // Генерируем все возможные тики по шагу
  const allNpshTicksByStep = Array.from(
    { length: Math.floor(Npshmax / npshStep) + 1 },
    (_, i) => i * npshStep
  ).filter(t => t <= Npshmax + 0.001);
  
  // Берем нужное количество тиков для визуального совпадения с левой осью
  // Но сохраняем все тики, если их меньше или равно targetRightAxisTickCount
  let uniqueRightAxisTicks: number[];
  
  if (allNpshTicksByStep.length <= targetRightAxisTickCount) {
    // Если тиков по шагу меньше или равно нужному количеству, используем все
    uniqueRightAxisTicks = [...allNpshTicksByStep];
  } else {
    // Если тиков больше, распределяем их равномерно по индексу для визуального совпадения
    uniqueRightAxisTicks = Array.from({ length: targetRightAxisTickCount }, (_, i) => {
      if (targetRightAxisTickCount === 1) return Npshmax;
      const ratio = targetRightAxisTickCount > 1 ? i / (targetRightAxisTickCount - 1) : 0;
      return ratio * Npshmax;
    });
  }
  
  // Убеждаемся, что максимум есть в списке
  const hasMax = uniqueRightAxisTicks.some(t => Math.abs(t - Npshmax) < 0.001);
  if (!hasMax && uniqueRightAxisTicks.length > 0) {
    uniqueRightAxisTicks[uniqueRightAxisTicks.length - 1] = Npshmax;
  }

  // Отладочная информация
  console.log('SecondGraph данные:', {
    selectedPump: selectedPump?.naimenovanie,
    qP2Data: qP2Data,
    p2_sData: p2_sData,
    qNpshData: qNpshData,
    npsh_sData: npsh_sData,
    chartData: chartData,
    Qmax, P2max, Npshmax
  });

  // Дополнительная проверка на валидность данных
  if (chartData.length === 0) {
    console.log('SecondGraph: Нет данных для отображения');
  }

  // Вычисляем текущие значения для отображения
  const getCurrentValues = () => {
    const currentQ = manualSliderValue || mousePosition?.x;
    
    if (!currentQ || !selectedPump) {
      return { q: null, p2: null, npsh: null };
    }

    let nearestP2 = null;
    let nearestNpsh = null;
    
    // Ищем ближайшие значения в исходных данных мощности
    if (qP2Data.length > 0 && p2_sData.length > 0) {
      let minDistance = Infinity;
      let bestIndex = -1;
      
      qP2Data.forEach((qVal, index) => {
        if (qVal !== null && p2_sData[index] !== null) {
          const distance = Math.abs(qVal - currentQ);
          if (distance < minDistance) {
            minDistance = distance;
            bestIndex = index;
          }
        }
      });
      
      if (bestIndex >= 0) {
        nearestP2 = p2_sData[bestIndex];
      }
    }
    
    // Ищем ближайшие значения в исходных данных NPSH
    if (qNpshData.length > 0 && npsh_sData.length > 0) {
      let minDistance = Infinity;
      let bestIndex = -1;
      
      qNpshData.forEach((qVal, index) => {
        if (qVal !== null && npsh_sData[index] !== null) {
          const distance = Math.abs(qVal - currentQ);
          if (distance < minDistance) {
            minDistance = distance;
            bestIndex = index;
          }
        }
      });
      
      if (bestIndex >= 0) {
        nearestNpsh = npsh_sData[bestIndex];
      }
    }

    return { q: currentQ, p2: nearestP2, npsh: nearestNpsh };
  };

  const currentValues = getCurrentValues();
  const showP2Axis = axesMode !== "npsh";
  const showNpshAxis = axesMode !== "p2";
  const chartBlockHeight =
    hideChrome && axesMode !== "both"
      ? Math.round(280 / 2.25)
      : Math.round(280 / 1.8);

  // Упрощенная версия для скриншота
  if (simplified) {
    return (
      <div style={{ width: "100%", height: Math.round(400 / 1.8), backgroundColor: chartColors.background }}>
        {!selectedPump || allChartData.length === 0 ? null : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={allChartData}
              margin={{ top: 2, right: 5, left: 2, bottom: 10 }}
            >
              {/* Горизонтальные линии сетки только от делений левой оси (P2) */}
              {leftAxisTicksP2.map((tickValue: number, index: number) => (
                <ReferenceLine
                  key={`grid-h-${index}`}
                  yAxisId="left"
                  y={tickValue}
                  stroke={chartColors.grid}
                  strokeDasharray="0"
                  strokeWidth={1}
                  isFront={false}
                />
              ))}
              {/* Вертикальные линии сетки от делений оси X */}
              {Array.from({ length: Math.floor(Qmax / qStep) + 1 }, (_, i) => i * qStep)
                .concat([Qmax])
                .map((tickValue: number, index: number) => (
                  <ReferenceLine
                    key={`grid-v-${index}`}
                    x={tickValue}
                    yAxisId="left"
                    stroke={chartColors.grid}
                    strokeDasharray="0"
                    strokeWidth={1}
                    isFront={false}
                  />
                ))}

              <XAxis
                type="number"
                dataKey="q"
                domain={[0, Qmax]}
                ticks={Array.from({ length: Math.floor(Qmax / qStep) + 1 }, (_, i) => i * qStep).concat([Qmax])}
                allowDecimals={false}
                tickFormatter={(value) => {
                  if (Math.abs(value - Qmax) < 0.01) return "Q, м³/ч";
                  return value.toString();
                }}
                label={{
                  value: "",
                  position: "insideBottomRight",
                  offset: -5,
                }}
                tick={{ fontSize: 10, fill: chartColors.text, fontWeight: "normal" }}
                stroke={chartColors.lineSecondary}
                allowDataOverflow={false}
              />

              <YAxis
                yAxisId="left"
                type="number"
                dataKey="p2_s"
                domain={[0, P2max]}
                ticks={leftAxisTicksP2}
                allowDecimals={p2Step < 1}
                tickFormatter={(value) => {
                  if (Math.abs(value - P2max) < 0.01) return "P2, кВт";
                  return value.toFixed(p2Step < 1 ? 1 : 0);
                }}
                label={{
                  value: "Мощность на валу P2",
                  angle: -90,
                  position: "insideMiddle",
                  dy: 0,
                  dx: -20,
                  style: {
                    fontSize: 12,
                    fill: chartColors.text,
                    fontWeight: "normal",
                    textAnchor: "middle"
                  },
                }}
                tick={{ fontSize: 10, fill: chartColors.text, fontWeight: "normal" }}
                stroke={chartColors.lineSecondary}
                width={55}
                allowDataOverflow={false}
              />

              <YAxis
                yAxisId="right"
                type="number"
                dataKey="npsh_s"
                orientation="right"
                domain={[0, rightAxisDomainNpsh]}
                ticks={uniqueRightAxisTicks}
                allowDecimals={npshStep < 1}
                interval={0}
                tick={(props: any) => {
                  const { x, y, payload } = props;
                  const value = payload.value;

                  if (Math.abs(value - Npshmax) < 0.001) {
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={4}
                          y={0}
                          dy={-4}
                          textAnchor="start"
                          fill={chartColors.text}
                          fontSize={10}
                          fontWeight="normal"
                        >
                          NPSH,
                        </text>
                        <text
                          x={4}
                          y={0}
                          dy={6}
                          textAnchor="start"
                          fill={chartColors.text}
                          fontSize={10}
                          fontWeight="normal"
                        >
                          м
                        </text>
                      </g>
                    );
                  }

                  if (value > Npshmax * 1.1) return <g />;

                  let displayValue = "";
                  if (npshStep < 0.2) displayValue = value.toFixed(2);
                  else if (npshStep < 1) displayValue = value.toFixed(1);
                  else displayValue = value.toString();

                  return (
                    <text
                      x={x + 8}
                      y={y}
                      dy={3}
                      textAnchor="end"
                      fill={chartColors.text}
                      fontSize={10}
                      fontWeight="normal"
                    >
                      {displayValue}
                    </text>
                  );
                }}
                label={{
                  value: "Кавитационный запас",
                  angle: 90,
                  position: "insideMiddle",
                  dy: 0,
                  dx: 20,
                  style: {
                    fontSize: 12,
                    fill: chartColors.text,
                    fontWeight: "normal",
                    textAnchor: "middle"
                  },
                }}
                width={55}
                stroke={chartColors.lineSecondary}
                allowDataOverflow={false}
              />

              <Line
                yAxisId="left"
                type="monotone"
                dataKey="p2_s"
                stroke={chartColors.linePrimary}
                strokeWidth={3}
                dot={false}
                connectNulls={true}
                isAnimationActive={false}
              />

              <Line
                yAxisId="right"
                type="monotone"
                dataKey="npsh_s"
                stroke={chartColors.lineSecondary}
                strokeWidth={3}
                dot={false}
                connectNulls={true}
                isAnimationActive={false}
              />

              {/* Дополнительные кривые мощности - пунктирные линии */}
              {additionalCurvesP2.length > 0 && (
                <>
                  {additionalCurvesP2.map((curve: any, idx: number) => {
                    if (!curve || curve.length === 0) return null;
                    
                    const dataKey = `additional_p2_${idx}`;
                    
                    return (
                      <Line
                        key={`additional-p2-${idx}`}
                        yAxisId="left"
                        name=""
                        type="monotone"
                        dataKey={dataKey}
                        stroke={chartColors.linePrimary}
                        strokeWidth={1.5}
                        dot={false}
                        connectNulls={true}
                        strokeDasharray="5 3"
                        isAnimationActive={false}
                        activeDot={false}
                        style={{ pointerEvents: 'none' }}
                        legendType="none"
                      />
                    );
                  })}
                </>
              )}

              {/* Дополнительные кривые npsh - пунктирные линии */}
              {additionalCurvesNpsh.length > 0 && (
                <>
                  {additionalCurvesNpsh.map((curve: any, idx: number) => {
                    if (!curve || curve.length === 0) return null;
                    
                    const dataKey = `additional_npsh_${idx}`;
                    
                    return (
                      <Line
                        key={`additional-npsh-${idx}`}
                        yAxisId="right"
                        name=""
                        type="monotone"
                        dataKey={dataKey}
                        stroke={chartColors.lineSecondary}
                        strokeWidth={1.5}
                        dot={false}
                        connectNulls={true}
                        strokeDasharray="5 3"
                        isAnimationActive={false}
                        activeDot={false}
                        style={{ pointerEvents: 'none' }}
                        legendType="none"
                      />
                    );
                  })}
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    );
  }

  // Обычная версия для UI
  const graphBody = (
        <div 
          className={hideChrome ? "border-t border-black/10 pt-1" : ""}
          style={{ width: "100%", height: chartBlockHeight, backgroundColor: chartColors.background }}
          onMouseEnter={() => console.log('📈 SecondGraph контейнер onMouseEnter')}
          onMouseLeave={() => {
            console.log('📈 SecondGraph контейнер onMouseLeave');
            if (onMouseLeave) {
              onMouseLeave();
            }
          }}
        >
          {!selectedPump ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              Выберите насос
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              Нет данных для отображения
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 2, right: 5, left: 2, bottom: 10 }}
                onMouseMove={(e) => {
                  if (e && e.activeLabel && onMouseMove) {
                    const q = parseFloat(e.activeLabel);
                    onMouseMove({ x: q, y: 0 });
                  }
                }}
                onMouseLeave={() => {
                  console.log('📈 SecondGraph onMouseLeave вызван');
                  // Вызываем onMouseLeave для возврата к parabola_intersection
                  if (onMouseLeave) {
                    onMouseLeave();
                  }
                }}
              >
                {/* Горизонтальные линии сетки */}
                {showP2Axis &&
                  leftAxisTicksP2.map((tickValue: number, index: number) => (
                    <ReferenceLine
                      key={`grid-h-p2-${index}`}
                      yAxisId="left"
                      y={tickValue}
                      stroke={chartColors.grid}
                      strokeDasharray="0"
                      strokeWidth={1}
                      isFront={false}
                    />
                  ))}
                {axesMode === "npsh" &&
                  allNpshTicksByStep.map((tickValue: number, index: number) => (
                    <ReferenceLine
                      key={`grid-h-npsh-${index}`}
                      yAxisId="left"
                      y={tickValue}
                      stroke={chartColors.grid}
                      strokeDasharray="0"
                      strokeWidth={1}
                      isFront={false}
                    />
                  ))}
                {/* Вертикальные линии сетки от делений оси X */}
                {Array.from({ length: Math.floor(Qmax / qStep) + 1 }, (_, i) => i * qStep)
                  .concat([Qmax])
                  .map((tickValue: number, index: number) => (
                    <ReferenceLine
                      key={`grid-v-${index}`}
                      x={tickValue}
                      yAxisId="left"
                      stroke={chartColors.grid}
                      strokeDasharray="0"
                      strokeWidth={1}
                      isFront={false}
                    />
                  ))}

                <XAxis
                  type="number"
                  dataKey="q"
                  domain={[0, Qmax]}
                  ticks={Array.from({ length: Math.floor(Qmax / qStep) + 1 }, (_, i) => i * qStep).concat([Qmax])}
                  allowDecimals={false}
                  tickFormatter={(value) => {
                    // Показываем букву Q на месте максимального значения
                    if (Math.abs(value - Qmax) < 0.01) return "Q, м³/ч";
                    return value.toString();
                  }}
                  label={{
                    value: "",
                    position: "insideBottomRight",
                    offset: -5,
                    style: { fontSize: 12 }
                  }}
                  tick={{ fontSize: 10, fill: chartColors.text, fontWeight: "normal" }}
                  stroke={chartColors.lineSecondary}
                  allowDataOverflow={false}
                />

                {axesMode === "npsh" && (
                  <YAxis
                    yAxisId="left"
                    type="number"
                    dataKey="npsh_s"
                    domain={[0, Npshmax]}
                    ticks={allNpshTicksByStep}
                    allowDecimals={npshStep < 1}
                    tickFormatter={(value) => {
                      if (Math.abs(value - Npshmax) < 0.001) return "NPSH, м";
                      if (npshStep < 0.2) return value.toFixed(2);
                      if (npshStep < 1) return value.toFixed(1);
                      return value.toString();
                    }}
                    label={{
                      value: "Кавитационный запас NPSH",
                      angle: -90,
                      position: "insideMiddle",
                      dy: 0,
                      dx: -25,
                      style: {
                        fontSize: 12,
                        fill: chartColors.text,
                        fontWeight: "normal",
                        textAnchor: "middle",
                      },
                    }}
                    tick={{ fontSize: 10, fill: chartColors.text, fontWeight: "normal" }}
                    stroke={chartColors.lineSecondary}
                    width={55}
                    allowDataOverflow={false}
                  />
                )}

                {showP2Axis && (
                  <YAxis
                    yAxisId="left"
                    type="number"
                    dataKey="p2_s"
                    domain={[0, P2max]}
                    ticks={leftAxisTicksP2}
                    allowDecimals={p2Step < 1}
                    tickFormatter={(value) => {
                      if (Math.abs(value - P2max) < 0.01) return "P2, кВт";
                      return value.toFixed(p2Step < 1 ? 1 : 0);
                    }}
                    label={{
                      value: "Мощность на валу P2",
                      angle: -90,
                      position: "insideMiddle",
                      dy: 0,
                      dx: -25,
                      style: {
                        fontSize: 12,
                        fill: chartColors.text,
                        fontWeight: "normal",
                        textAnchor: "middle",
                      },
                    }}
                    tick={{ fontSize: 10, fill: chartColors.text, fontWeight: "normal" }}
                    stroke={chartColors.lineSecondary}
                    width={55}
                    allowDataOverflow={false}
                  />
                )}

                {axesMode === "both" && (
                  <YAxis
                    yAxisId="right"
                    type="number"
                    dataKey="npsh_s"
                    orientation="right"
                    domain={[0, rightAxisDomainNpsh]}
                    ticks={uniqueRightAxisTicks}
                    allowDecimals={npshStep < 1}
                    interval={0}
                    tick={(props: any) => {
                      const { x, y, payload } = props;
                      const value = payload.value;

                      if (Math.abs(value - Npshmax) < 0.001) {
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text
                              x={4}
                              y={0}
                              dy={-4}
                              textAnchor="start"
                              fill={chartColors.text}
                              fontSize={10}
                              fontWeight="normal"
                            >
                              NPSH,
                            </text>
                            <text
                              x={4}
                              y={0}
                              dy={6}
                              textAnchor="start"
                              fill={chartColors.text}
                              fontSize={10}
                              fontWeight="normal"
                            >
                              м
                            </text>
                          </g>
                        );
                      }

                      if (value > Npshmax * 1.1) return <g />;

                      let displayValue = "";
                      if (npshStep < 0.2) displayValue = value.toFixed(2);
                      else if (npshStep < 1) displayValue = value.toFixed(1);
                      else displayValue = value.toString();

                      return (
                        <text
                          x={x + 8}
                          y={y}
                          dy={3}
                          textAnchor="end"
                          fill={chartColors.text}
                          fontSize={10}
                          fontWeight="normal"
                        >
                          {displayValue}
                        </text>
                      );
                    }}
                    label={{
                      value: "Кавитационный запас",
                      angle: 90,
                      position: "insideMiddle",
                      dy: 0,
                      dx: 25,
                      style: {
                        fontSize: 12,
                        fill: chartColors.text,
                        fontWeight: "normal",
                        textAnchor: "middle",
                      },
                    }}
                    width={55}
                    stroke={chartColors.lineSecondary}
                    allowDataOverflow={false}
                  />
                )}




                {/* Убираем анимированный tooltip - используем фиксированную область */}

                {/* Движущаяся линия слайдера */}
                {(manualSliderValue !== null || mousePosition?.x !== undefined) && (
                  <ReferenceLine
                    x={manualSliderValue || mousePosition?.x || 0}
                    yAxisId="left"
                    stroke="#8FAADC"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    isFront
                  />
                )}

                <Legend 
                  iconSize={0} 
                  fontSize={4}
                  wrapperStyle={{ color: '#000000', fontWeight: 'normal' }}
                  payload={[
                    { 
                      value:
                        axesMode === "both"
                          ? `Q = ${typeof currentValues.q === "number" ? currentValues.q.toFixed(2) : "—"} м³/ч${String.fromCharCode(160).repeat(10)}P₂ = ${typeof currentValues.p2 === "number" ? currentValues.p2.toFixed(2) : "—"} кВт${String.fromCharCode(160).repeat(10)}NPSH = ${typeof currentValues.npsh === "number" ? currentValues.npsh.toFixed(2) : "—"} м`
                          : axesMode === "p2"
                          ? `Q = ${typeof currentValues.q === "number" ? currentValues.q.toFixed(2) : "—"} м³/ч${String.fromCharCode(160).repeat(10)}P₂ = ${typeof currentValues.p2 === "number" ? currentValues.p2.toFixed(2) : "—"} кВт`
                          : `Q = ${typeof currentValues.q === "number" ? currentValues.q.toFixed(2) : "—"} м³/ч${String.fromCharCode(160).repeat(10)}NPSH = ${typeof currentValues.npsh === "number" ? currentValues.npsh.toFixed(2) : "—"} м`,
                      color: '#000000' 
                    }
                  ]}
                />

                {showP2Axis && (
                <Line
                  yAxisId="left"
                  name={`P₂, кВт ${typeof currentValues.p2 === "number" ? `(${currentValues.p2.toFixed(2)})` : ""}`}
                  type="monotone"
                  dataKey="p2_s"
                  stroke={chartColors.linePrimary}
                  strokeWidth={3}
                  dot={false}
                  connectNulls={true}
                  activeDot={{ r: 4, stroke: "#13347F", strokeWidth: 2, fill: "#fff" }}
                />
                )}

                {showNpshAxis && (
                <Line
                  yAxisId={axesMode === "npsh" ? "left" : "right"}
                  name={`NPSH, м ${typeof currentValues.npsh === "number" ? `(${currentValues.npsh.toFixed(2)})` : ""}`}
                  type="monotone"
                  dataKey="npsh_s"
                  stroke={chartColors.lineSecondary}
                  strokeWidth={3}
                  dot={false}
                  connectNulls={true}
                  activeDot={{ r: 4, stroke: "#000000", strokeWidth: 2, fill: "#fff" }}
                />
                )}

                {showP2Axis && additionalCurvesP2.length > 0 && (
                  <>
                    {additionalCurvesP2.map((curve: any, idx: number) => {
                      if (!curve || curve.length === 0) return null;
                      
                      const dataKey = `additional_p2_${idx}`;
                      
                      return (
                        <Line
                          key={`additional-p2-${idx}`}
                          yAxisId="left"
                          name=""
                          type="monotone"
                          dataKey={dataKey}
                          stroke={chartColors.linePrimary}
                          strokeWidth={1.5}
                          dot={false}
                          connectNulls={true}
                          strokeDasharray="5 3"
                          isAnimationActive={false}
                          activeDot={false}
                          style={{ pointerEvents: 'none' }}
                          legendType="none"
                        />
                      );
                    })}
                  </>
                )}

                {showNpshAxis && additionalCurvesNpsh.length > 0 && (
                  <>
                    {additionalCurvesNpsh.map((curve: any, idx: number) => {
                      if (!curve || curve.length === 0) return null;
                      
                      const dataKey = `additional_npsh_${idx}`;
                      
                      return (
                        <Line
                          key={`additional-npsh-${idx}`}
                          yAxisId={axesMode === "npsh" ? "left" : "right"}
                          name=""
                          type="monotone"
                          dataKey={dataKey}
                          stroke={chartColors.lineSecondary}
                          strokeWidth={1.5}
                          dot={false}
                          connectNulls={true}
                          strokeDasharray="5 3"
                          isAnimationActive={false}
                          activeDot={false}
                          style={{ pointerEvents: 'none' }}
                          legendType="none"
                        />
                      );
                    })}
                  </>
                )}

              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
  );

  if (hideChrome) {
    return graphBody;
  }

  return (
    <Card>
      <CardContent className="pt-1 pb-1 px-2">{graphBody}</CardContent>
    </Card>
  );
}
