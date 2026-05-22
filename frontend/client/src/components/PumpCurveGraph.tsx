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
  ReferenceDot,
  Customized,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Pump, CurvePoint } from "@/lib/types";
import { readFunnelChartTheme } from "@/lib/funnelWorkUi";

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
  /** Встроить в общую панель без заголовка карточки */
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

// Функция для вычисления шага сетки H
function getHStep(hMax: number): number {
  if (hMax <= 0) return 1;
  
  // Специальные правила с кратно 5 (проверяются в первую очередь)
  if (15 <= hMax && hMax <= 90 && hMax % 5 === 0) return 5;
  if (hMax >= 90 && hMax % 5 === 0) return 25;
  
  // Обычные правила по диапазонам
  if (hMax < 15) return 1;
  if (hMax >= 15 && hMax < 40) return 2;
  if (hMax >= 40 && hMax < 50) return 4;
  if (hMax >= 50 && hMax < 90) return 5;
  if (hMax >= 90 && hMax < 150) return 10;
  if (hMax >= 150) return 20;
  
  return 10; // значение по умолчанию
}

// Функция для округления в большую сторону кратно шагу
function roundUpToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.ceil(value / step) * step;
}

export default function PumpCurveGraph({
  selectedPump,
  mousePosition,
  onMouseMove,
  onMouseLeave,
  manualSliderValue,
  isManualControl,
  onManualControl,
  maxQValue,
  simplified = false,
  hideChrome = false,
}: Props) {
  const chartColors = readFunnelChartTheme();
  const axisTick = { fontSize: 10, fill: chartColors.text, fontWeight: "normal" as const };
  const axisTickSmall = { fontSize: 9, fill: chartColors.text, fontWeight: "normal" as const };

  // Подготавливаем данные для графика H и КПД по оси q
  const curveData = selectedPump?.curve ?? [];
  const qEtaData = selectedPump?.q_eta ?? [];
  const eta_sData = selectedPump?.eta_s ?? [];
  
  // Создаем объединенный массив всех уникальных значений Q
  const allQValues = Array.from(new Set([
    ...curveData.map(point => point.Q),
    ...qEtaData.filter(q => q !== null)
  ])).sort((a, b) => a - b);

  // Создаем унифицированную структуру данных
  const baseChartData = allQValues.map(q => {
    // Находим соответствующие значения H и КПД для данного Q
    const hPoint = curveData.find(point => Math.abs(point.Q - q) < 0.001);
    const etaIndex = qEtaData.findIndex(qVal => Math.abs((qVal || 0) - q) < 0.001);
    
    return {
      q: q,
      h_s: hPoint ? hPoint.H : null,
      eta_s: etaIndex >= 0 ? eta_sData[etaIndex] : null
    };
  });
  const additionalCurves = selectedPump?.additional_curves ?? [];

  // Добавляем интерполированные точки для более плавного отображения
  const chartData = (() => {
    if (baseChartData.length < 2) return baseChartData;
    
    const sortedData = [...baseChartData].sort((a, b) => (a.q || 0) - (b.q || 0));
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
        
        let interpolatedH = null;
        let interpolatedEta = null;
        
        if (current.h_s !== null && next.h_s !== null) {
          interpolatedH = current.h_s + ratio * (next.h_s - current.h_s);
        }
        
        if (current.eta_s !== null && next.eta_s !== null) {
          interpolatedEta = current.eta_s + ratio * (next.eta_s - current.eta_s);
        }
        
        interpolatedData.push({
          q: interpolatedQ,
          h_s: interpolatedH,
          eta_s: interpolatedEta
        });
      }
    }
    
    // Добавляем последнюю точку
    interpolatedData.push(sortedData[sortedData.length - 1]);
    
    return interpolatedData;
  })();

  // Подготавливаем данные для дополнительных кривых
  const additionalCurvesData = (() => {
    if (!additionalCurves || additionalCurves.length === 0) return [];
    
    return additionalCurves.map((curve, curveIndex) => {
      if (!curve || curve.length === 0) return null;
      
      // Преобразуем кривую в формат данных с уникальными ключами
      return curve.map(point => ({
        q: point.Q,
        [`additional_h_${curveIndex}`]: point.H,
        h_s: null,
        p2_s: null
      }));
    }).filter(Boolean);
  })();

  // Подготавливаем данные для parabola
  const parabolaData = selectedPump?.parabola ?? [];
  
  // Подготавливаем данные для дополнительных кривых КПД (только для первого графика)
  const additionalCurvesEta = selectedPump?.additional_curves_eta ?? [];

  // Объединяем все данные (основные + дополнительные кривые + parabola)
  const allChartData = (() => {
    let combinedData = [...chartData];
    
    // Добавляем данные parabola
    if (parabolaData.length > 0) {
      parabolaData.forEach((parabolaPoint: any) => {
        const existingPointIndex = combinedData.findIndex(point => 
          Math.abs((point.q || 0) - (parabolaPoint.Q || 0)) < 0.001
        );
        
        if (existingPointIndex >= 0) {
          // Обновляем существующую точку
          (combinedData[existingPointIndex] as any).parabola_h = parabolaPoint.H;
        } else {
          // Добавляем новую точку
          combinedData.push({
            q: parabolaPoint.Q,
            h_s: null,
            eta_s: null,
            parabola_h: parabolaPoint.H
          } as any);
        }
      });
    }
    
    // Добавляем данные дополнительных кривых к основным данным
    additionalCurvesData.forEach((curveData, curveIndex) => {
      if (curveData && curveData.length > 0) {
        const dataKey = `additional_h_${curveIndex}`;
        
        // Находим существующие точки с тем же q или добавляем новые
        curveData.forEach(curvePoint => {
          const existingPointIndex = combinedData.findIndex(point => 
            Math.abs((point.q || 0) - (curvePoint.q || 0)) < 0.001
          );
          
          if (existingPointIndex >= 0) {
            // Обновляем существующую точку
            (combinedData[existingPointIndex] as any)[dataKey] = curvePoint[dataKey];
          } else {
            // Добавляем новую точку
            combinedData.push({
              q: curvePoint.q,
              h_s: null,
              eta_s: null,
              [dataKey]: curvePoint[dataKey]
            } as any);
          }
        });
      }
    });

    // Добавляем данные дополнительных кривых КПД
    const additionalCurvesEtaData = (() => {
      if (!additionalCurvesEta || additionalCurvesEta.length === 0) return [];
      
      return additionalCurvesEta.map((curve: any, curveIndex: number) => {
        if (!curve || curve.length === 0) return null;
        
        return curve.map((point: any) => ({
          q: point.Q,
          [`additional_eta_${curveIndex}`]: point.eta,
          h_s: null,
          eta_s: null
        }));
      }).filter(Boolean);
    })();

    additionalCurvesEtaData.forEach((curveData: any, curveIndex: number) => {
      if (curveData && curveData.length > 0) {
        const dataKey = `additional_eta_${curveIndex}`;
        
        curveData.forEach((curvePoint: any) => {
          const existingPointIndex = combinedData.findIndex(point => 
            Math.abs((point.q || 0) - (curvePoint.q || 0)) < 0.001
          );
          
          if (existingPointIndex >= 0) {
            (combinedData[existingPointIndex] as any)[dataKey] = curvePoint[dataKey];
          } else {
            combinedData.push({
              q: curvePoint.q,
              h_s: null,
              eta_s: null,
              [dataKey]: curvePoint[dataKey]
            } as any);
          }
        });
      }
    });
    
    // Сортируем по q для правильного отображения
    return combinedData.sort((a, b) => (a.q || 0) - (b.q || 0));
  })();

  const baseQ = selectedPump?.Q_base ?? null;
  const baseH = selectedPump?.H_base ?? null;

  // Рассчитываем максимумы только для основных кривых (без дополнительных)
  const allQs = chartData.map(p => p.q).filter(q => q !== null);
  const allHs = chartData.map(p => p.h_s).filter(h => h !== null);
  const allEtas = chartData.map(p => p.eta_s).filter(eta => eta !== null);

  // Используем синхронизированное максимальное значение Q или локальное
  const QmaxRaw: number = (maxQValue !== null && maxQValue !== undefined) ? maxQValue : (allQs.length > 0 ? Math.max(...allQs) : 0);
  const HmaxRaw: number = allHs.length > 0 ? Math.max(...allHs) : 0;
  
  // Вычисляем шаги сетки
  const qStep = getQStep(QmaxRaw);
  const hStep = getHStep(HmaxRaw);
  
  // Округляем в большую сторону кратно шагу
  const Qmax = roundUpToStep(QmaxRaw, qStep);
  const Hmax = roundUpToStep(HmaxRaw, hStep);
  
  const Etamax = allEtas.length > 0 ? Math.max(...allEtas) : 0;
  
  // Вычисляем количество делений левой оси (H)
  const leftAxisTicks = Array.from({ length: Math.floor(Hmax / hStep) + 1 }, (_, i) => i * hStep).concat([Hmax]);
  const leftAxisTickCount = leftAxisTicks.length;
  
  // Вычисляем максимальное значение для правой оси (КПД)
  // Округляем в большую сторону кратно 10, но не больше 90
  const rightAxisDomainMax = Etamax > 0 ? Math.min(90, Math.ceil(Etamax / 10) * 10) : 90;
  
  // Количество делений КПД с шагом 10 (0, 10, 20, 30, ..., rightAxisDomainMax)
  const rightAxisTickCountEta = Math.floor(rightAxisDomainMax / 10) + 1;
  
  // Проверяем, достаточно ли делений левой оси для отображения всех делений КПД
  // Если делений левой оси достаточно, используем деления по 10 для КПД
  // Если недостаточно, используем логику с половиной делений (но всегда правая ось ниже левой)
  const useFullTicks = rightAxisTickCountEta <= leftAxisTickCount;
  
  let rightAxisTicks: number[];
  let rightAxisDomain: number;
  
  if (useFullTicks) {
    // Логика с делениями по 10 - каждое деление КПД соответствует делению левой оси
    rightAxisTicks = Array.from({ length: rightAxisTickCountEta }, (_, i) => i * 10);
    // Домен увеличиваем пропорционально, чтобы визуально правая ось была ниже левой
    // Если левая ось имеет N делений, а правая M делений (M <= N), 
    // то домен правой оси должен быть таким, чтобы M делений визуально соответствовали первым M делениям левой
    // Это означает домен = rightAxisDomainMax * (leftAxisTickCount / rightAxisTickCountEta)
    rightAxisDomain = rightAxisDomainMax * (leftAxisTickCount / rightAxisTickCountEta);
  } else {
    // Логика с половиной делений (если делений левой оси недостаточно)
    const rightAxisTickCount = Math.max(2, Math.floor(leftAxisTickCount / 2));
    const rightAxisStep = rightAxisDomainMax / (rightAxisTickCount - 1);
    rightAxisTicks = Array.from({ length: rightAxisTickCount }, (_, i) => i * rightAxisStep).concat([rightAxisDomainMax]);
    // Домен в 2 раза больше для визуальной половины высоты
    rightAxisDomain = rightAxisDomainMax * 2;
  }

  // Отладочная информация
  console.log('PumpCurveGraph данные:', {
    selectedPump: selectedPump?.naimenovanie,
    curveData: curveData,
    qEtaData: qEtaData,
    eta_sData: eta_sData,
    additionalCurves: additionalCurves,
    chartData: chartData,
    Qmax, Hmax, Etamax
  });

  // Детальная диагностика additionalCurves
  console.log('PumpCurveGraph: selectedPump?.additional_curves:', selectedPump?.additional_curves);
  console.log('PumpCurveGraph: additionalCurves после обработки:', additionalCurves);
  console.log('PumpCurveGraph: additionalCurves.length:', additionalCurves.length);
  console.log('PumpCurveGraph: typeof additionalCurves:', typeof additionalCurves);
  console.log('PumpCurveGraph: Array.isArray(additionalCurves):', Array.isArray(additionalCurves));

  // Дополнительная проверка на валидность данных
  if (chartData.length === 0) {
    console.log('PumpCurveGraph: Нет данных для отображения');
  }

  if (additionalCurves.length > 0) {
    console.log('PumpCurveGraph: Найдены дополнительные кривые:', additionalCurves.length);
    console.log('PumpCurveGraph: Данные дополнительных кривых:', additionalCurves);
  } else {
    console.log('PumpCurveGraph: Дополнительные кривые отсутствуют');
  }

  // Вычисляем текущие значения для отображения
  const getCurrentValues = () => {
    const currentQ = manualSliderValue || mousePosition?.x;
    
    if (!currentQ || !selectedPump) {
      return { q: null, h: null, eta: null };
    }

    let nearestH = null;
    let nearestEta = null;
    
    // Ищем ближайшие значения в исходных данных H
    if (curveData.length > 0) {
      let minDistance = Infinity;
      let bestPoint: any = null;
      
      curveData.forEach(point => {
        const distance = Math.abs(point.Q - currentQ);
        if (distance < minDistance) {
          minDistance = distance;
          bestPoint = point;
        }
      });
      
      if (bestPoint) {
        nearestH = bestPoint.H;
      }
    }
    
    // Ищем ближайшие значения в исходных данных КПД
    if (qEtaData.length > 0 && eta_sData.length > 0) {
      let minDistance = Infinity;
      let bestIndex = -1;
      
      qEtaData.forEach((qVal, index) => {
        if (qVal !== null && eta_sData[index] !== null) {
          const distance = Math.abs(qVal - currentQ);
          if (distance < minDistance) {
            minDistance = distance;
            bestIndex = index;
          }
        }
      });
      
      if (bestIndex >= 0) {
        nearestEta = eta_sData[bestIndex];
      }
    }

    return { q: currentQ, h: nearestH, eta: nearestEta };
  };

  const currentValues = getCurrentValues();

  // Упрощенная версия для скриншота
  if (simplified) {
    // Проверяем наличие данных
    const hasData = selectedPump && allChartData && allChartData.length > 0;
    const hasHData = hasData && allChartData.some(d => d.h_s !== null && d.h_s !== undefined);
    const hasEtaData = hasData && allChartData.some(d => d.eta_s !== null && d.eta_s !== undefined);
    
    return (
      <div style={{ width: "100%", height: 400, backgroundColor: chartColors.background }}>
        {!hasData ? null : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={allChartData}
              margin={{ top: 2, right: 5, left: 2, bottom: 10 }}
            >
              {/* Горизонтальные линии сетки только от делений левой оси (H) */}
              {Array.from({ length: Math.floor(Hmax / hStep) + 1 }, (_, i) => i * hStep)
                .concat([Hmax])
                .map((tickValue: number, index: number) => (
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
                dataKey="h_s"
                domain={[0, Hmax]}
                ticks={Array.from({ length: Math.floor(Hmax / hStep) + 1 }, (_, i) => i * hStep).concat([Hmax])}
                allowDecimals={false}
                tickFormatter={(value) => {
                  if (Math.abs(value - Hmax) < 0.01) return "H, м";
                  return value.toString();
                }}
                label={{
                  value: "Напор",
                  angle: -90,
                  position: "insideMiddle",
                  dy: 0,
                  dx: -20,
                  style: { fontSize: 12, fill: chartColors.text, fontWeight: "normal", textAnchor: "middle" }
                }}
                tick={{ fontSize: 10, fill: chartColors.text, fontWeight: "normal" }}
                stroke={chartColors.lineSecondary}
                width={55}
                allowDataOverflow={false}
              />
              <YAxis
                yAxisId="right"
                type="number"
                dataKey="eta_s"
                orientation="right"
                label={{
                  value: "Гидравлический КПД",
                  angle: 90,
                  position: "insideMiddle",
                  dy: 0,
                  dx: 20,
                  style: { fontSize: 12, fill: chartColors.text, fontWeight: "normal", textAnchor: "middle" }
                }}
                width={55}
                domain={[0, rightAxisDomain]}
                ticks={rightAxisTicks}
                interval={0}
                allowDecimals={false}
                stroke={chartColors.lineSecondary}
                tick={(props: any) => {
                  const { x, y, payload } = props;
                  const value = payload.value;

                  if (Math.abs(value - rightAxisDomainMax) < 0.01) {
                    return (
                      <text
                        x={x + 20}
                        y={y}
                        dy={3}
                        textAnchor="end"
                        fill="#000000"
                        fontSize={10}
                        fontWeight="normal"
                      >
                        η, %
                      </text>
                    );
                  }

                  if (value > rightAxisDomainMax * 1.1) return <g />;

                  return (
                    <text
                      x={x + 12}
                      y={y}
                      dy={3}
                      textAnchor="end"
                      fill="#000000"
                      fontSize={10}
                      fontWeight="normal"
                    >
                      {value.toString()}
                    </text>
                  );
                }}
                allowDataOverflow={false}
              />

              {/* Основная кривая H */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="h_s"
                stroke={chartColors.linePrimary}
                strokeWidth={3}
                dot={false}
                connectNulls={true}
                isAnimationActive={false}
              />
              {/* Кривая КПД */}
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="eta_s"
                stroke={chartColors.lineSecondary}
                strokeWidth={3}
                dot={false}
                connectNulls={true}
                isAnimationActive={false}
              />
              {/* Парабола */}
              {parabolaData.length > 0 && (
                <Line
                  yAxisId="left"
                  name=""
                  type="monotone"
                  dataKey="parabola_h"
                  stroke="#061D52"
                  strokeWidth={1.5}
                  dot={false}
                  connectNulls={true}
                  isAnimationActive={false}
                  activeDot={false}
                  style={{ pointerEvents: 'none' }}
                  legendType="none"
                />
              )}

              {/* 🔴 Точка входа - красный кружок */}
              {baseQ != null && baseH != null && chartData.length > 0 && (
                <ReferenceDot
                  x={Number(baseQ)}
                  y={Number(baseH)}
                  r={4.5}
                  fill="#C40808"
                  stroke="none"
                  isFront
                  yAxisId="left"
                />
              )}

              {/* Точка пересечения parabola - красный крестик */}
              {selectedPump?.parabola_intersection && (
                <ReferenceDot
                  x={selectedPump.parabola_intersection.Q}
                  y={selectedPump.parabola_intersection.H}
                  r={8}
                  fill="none"
                  stroke="#ED0F0F"
                  strokeWidth={2}
                  isFront
                  yAxisId="left"
                  shape={(props: any) => {
                    const { cx, cy } = props;
                    const size = 8;
                    return (
                      <g>
                        <line
                          x1={cx - size}
                          y1={cy - size}
                          x2={cx + size}
                          y2={cy + size}
                          stroke="#ED0F0F"
                          strokeWidth={2}
                        />
                        <line
                          x1={cx + size}
                          y1={cy - size}
                          x2={cx - size}
                          y2={cy + size}
                          stroke="#ED0F0F"
                          strokeWidth={2}
                        />
                      </g>
                    );
                  }}
                />
              )}

              {/* Дополнительные кривые H - только визуальные, без интерактивности */}
              {additionalCurves.length > 0 && (
                <>
                  {additionalCurves.map((curve, idx) => {
                    if (!curve || curve.length === 0) return null;
                    
                    const dataKey = `additional_h_${idx}`;
                    
                    return (
                      <Line
                        key={`additional-${idx}`}
                        yAxisId="left"
                        name={`H при n-${idx + 1}`}
                        type="monotone"
                        dataKey={dataKey}
                        stroke={chartColors.linePrimary}
                        strokeWidth={2.5}
                        dot={false}
                        connectNulls={true}
                        strokeDasharray="5 3"
                        opacity={0.8}
                        isAnimationActive={false}
                        activeDot={false}
                        style={{ pointerEvents: 'none' }}
                        legendType="none"
                      />
                    );
                  })}
                </>
              )}

              {/* Дополнительные кривые КПД - пунктирные черные линии */}
              {additionalCurvesEta.length > 0 && (
                <>
                  {additionalCurvesEta.map((curve: any, idx: number) => {
                    if (!curve || curve.length === 0) return null;
                    
                    const dataKey = `additional_eta_${idx}`;
                    
                    return (
                      <Line
                        key={`additional-eta-${idx}`}
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
  const chartHeight = hideChrome ? 210 : 350;

  const graphInner = (
        <div
          style={{ width: "100%", height: chartHeight, backgroundColor: chartColors.background }}
          onMouseEnter={() => console.log('📊 PumpCurveGraph контейнер onMouseEnter')}
          onMouseLeave={() => {
            console.log('📊 PumpCurveGraph контейнер onMouseLeave');
            if (onMouseLeave) {
              onMouseLeave();
            }
          }}
        >
          {!selectedPump ? (
            <div className="h-full flex items-center justify-center text-[var(--funnel-text-muted)]">
              Выберите насос
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-[var(--funnel-text-muted)]">
              Нет данных для отображения
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={allChartData}
                margin={{ top: 2, right: 5, left: 2, bottom: 10 }}
                onMouseMove={(e) => {
                  if (e && e.activeLabel && onMouseMove) {
                    const q = parseFloat(e.activeLabel);
                    onMouseMove({ x: q, y: 0 });
                  }
                }}
                onMouseLeave={() => {
                  console.log('📊 PumpCurveGraph onMouseLeave вызван');
                  // Вызываем onMouseLeave для возврата к parabola_intersection
                  if (onMouseLeave) {
                    onMouseLeave();
                  }
                }}
              >
                {/* Горизонтальные линии сетки только от делений левой оси (H) */}
                {Array.from({ length: Math.floor(Hmax / hStep) + 1 }, (_, i) => i * hStep)
                  .concat([Hmax])
                  .map((tickValue: number, index: number) => (
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

                <YAxis
                  yAxisId="left"
                  type="number"
                  dataKey="h_s"
                  domain={[0, Hmax]}
                  ticks={Array.from({ length: Math.floor(Hmax / hStep) + 1 }, (_, i) => i * hStep).concat([Hmax])}
                  allowDecimals={false}
                  tickFormatter={(value) => {
                    if (Math.abs(value - Hmax) < 0.01) return "H, м";
                    return value.toString();
                  }}
                  label={{
                    value: "Напор",
                    angle: -90,
                    position: "insideMiddle",
                    dy: 0,
                    dx: -18,  // ⬅ увеличенный отступ от оси
                    style: { fontSize: 12, fill: chartColors.text, fontWeight: "normal", textAnchor: "middle" }
                  }}
                  tick={{ fontSize: 10, fill: chartColors.text, fontWeight: "normal" }}
                  stroke={chartColors.lineSecondary}
                  width={55}  // ⬅ можно чуть увеличить ширину для запаса
                  allowDataOverflow={false}
                />

                <YAxis
                  yAxisId="right"
                  type="number"
                  dataKey="eta_s"
                  orientation="right"
                  label={{
                    value: "Гидравлический КПД",
                    angle: 90,
                    position: "insideMiddle",
                    dy: 0,
                    dx: 18,   // ⬅ увеличенный отступ от оси
                    style: { fontSize: 12, fill: chartColors.text, fontWeight: "normal", textAnchor: "middle" }
                  }}
                  width={55}
                  domain={[0, rightAxisDomain]}
                  ticks={rightAxisTicks}
                  interval={0}
                  allowDecimals={false}
                  stroke={chartColors.lineSecondary}
                  tick={(props: any) => {
                    const { x, y, payload } = props;
                    const value = payload.value;

                    if (Math.abs(value - rightAxisDomainMax) < 0.01) {
                      return (
                        <text
                          x={x + 20}
                          y={y}
                          dy={3}
                          textAnchor="end"
                          fill="#000000"
                          fontSize={10}
                          fontWeight="normal"
                        >
                          η, %
                        </text>
                      );
                    }

                    if (value > rightAxisDomainMax * 1.1) return <g />;

                    let displayValue = "";
                    if (useFullTicks) {
                      displayValue = value.toString();
                    } else {
                      displayValue = Math.round(value).toString();
                    }

                    return (
                      <text
                        x={x + 12}
                        y={y}
                        dy={3}
                        textAnchor="end"
                        fill="#000000"
                        fontSize={10}
                        fontWeight="normal"
                      >
                        {displayValue}
                      </text>
                    );
                  }}
                  allowDataOverflow={false}
                />





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
                      value: `Q = ${typeof currentValues.q === "number" ? currentValues.q.toFixed(2) : "—"} м³/ч${String.fromCharCode(160).repeat(10)}H = ${typeof currentValues.h === "number" ? currentValues.h.toFixed(2) : "—"} м${String.fromCharCode(160).repeat(10)}η = ${typeof currentValues.eta === "number" ? currentValues.eta.toFixed(2) : "—"}%`, 
                      color: '#000000' 
                    }
                  ]}
                />

                {/* 🔵 Кривая H */}
                <Line
                  yAxisId="left"
                  name={`H, м ${typeof currentValues.h === "number" ? `(${currentValues.h.toFixed(2)})` : ""}`}
                  type="monotone"
                  dataKey="h_s"
                  stroke={chartColors.linePrimary}
                  strokeWidth={3}
                  dot={false}
                  connectNulls={true}
                  activeDot={{ r: 4, stroke: "#13347F", strokeWidth: 2, fill: "#fff" }}
                />

                {/* 🟢 Кривая КПД */}
                <Line
                  yAxisId="right"
                  name={`η, % ${typeof currentValues.eta === "number" ? `(${currentValues.eta.toFixed(2)})` : ""}`}
                  type="monotone"
                  dataKey="eta_s"
                  stroke={chartColors.lineSecondary}
                  strokeWidth={3}
                  dot={false}
                  connectNulls={true}
                  activeDot={{ r: 4, stroke: "#000000", strokeWidth: 2, fill: "#fff" }}
                />

                {/* 🔴 Точка входа */}
                {baseQ != null && baseH != null && chartData.length > 0 && (
                  <ReferenceDot
                    x={Number(baseQ)}
                    y={Number(baseH)}
                    r={4.5}
                    fill="#C40808"
                    stroke="none"
                    isFront
                    yAxisId="left"
                  />
                )}

                {/* Parabola линия - черная не очень жирная */}
                {parabolaData.length > 0 && (
                  <Line
                    yAxisId="left"
                    name=""
                    type="monotone"
                    dataKey="parabola_h"
                    stroke="#061D52"
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls={true}
                    isAnimationActive={false}
                    activeDot={false}
                    style={{ pointerEvents: 'none' }}
                    legendType="none"
                  />
                )}

                {/* Точка пересечения parabola - красный крестик */}
                {selectedPump?.parabola_intersection && (
                  <ReferenceDot
                    x={selectedPump.parabola_intersection.Q}
                    y={selectedPump.parabola_intersection.H}
                    r={8}
                    fill="none"
                    stroke="#ED0F0F"
                    strokeWidth={2}
                    isFront
                    yAxisId="left"
                    shape={(props: any) => {
                      const { cx, cy } = props;
                      const size = 8;
                      return (
                        <g>
                          <line
                            x1={cx - size}
                            y1={cy - size}
                            x2={cx + size}
                            y2={cy + size}
                            stroke="#ED0F0F"
                            strokeWidth={2}
                          />
                          <line
                            x1={cx + size}
                            y1={cy - size}
                            x2={cx - size}
                            y2={cy + size}
                            stroke="#ED0F0F"
                            strokeWidth={2}
                          />
                        </g>
                      );
                    }}
                  />
                )}

                {/* Дополнительные кривые H - только визуальные, без интерактивности */}
                {additionalCurves.length > 0 && (
                  <>
                    {additionalCurves.map((curve, idx) => {
                      if (!curve || curve.length === 0) return null;
                      
                      const dataKey = `additional_h_${idx}`;
                      
                      return (
                        <Line
                          key={`additional-${idx}`}
                          yAxisId="left"
                          name={`H при n-${idx + 1}`}
                          type="monotone"
                          dataKey={dataKey}
                          stroke={chartColors.linePrimary}
                          strokeWidth={2.5}
                          dot={false}
                          connectNulls={true}
                          strokeDasharray="5 3"
                          opacity={0.8}
                          isAnimationActive={false}
                          // Отключаем интерактивность для дополнительных кривых
                          activeDot={false}
                          // Отключаем все события мыши для дополнительных кривых
                          onMouseEnter={undefined}
                          onMouseLeave={undefined}
                          onMouseMove={undefined}
                          // Устанавливаем pointer-events: none через стили
                          style={{ pointerEvents: 'none' }}
                          legendType="none"
                        />
                      );
                    })}
                  </>
                )}

                {/* Дополнительные кривые КПД - пунктирные черные линии */}
                {additionalCurvesEta.length > 0 && (
                  <>
                    {additionalCurvesEta.map((curve: any, idx: number) => {
                      if (!curve || curve.length === 0) return null;
                      
                      const dataKey = `additional_eta_${idx}`;
                      
                      return (
                        <Line
                          key={`additional-eta-${idx}`}
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

  if (hideChrome) {
    return <div className="w-full">{graphInner}</div>;
  }

  return (
    <Card>
      <CardHeader className="pb-1 pt-2 px-2">
        <CardTitle className="text-sm">Характеристики насоса</CardTitle>
      </CardHeader>

      <CardContent className="pt-0 pb-1 px-2">{graphInner}</CardContent>
    </Card>
  );
}
