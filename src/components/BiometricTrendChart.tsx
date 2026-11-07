import React, { useState, useMemo } from 'react';
import {
  TrendingDown,
  TrendingUp,
  Activity,
  Scale,
  Dumbbell,
  Info,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { ClientProfile, WeeklyBiometricPoint } from '../data/mockData';
import { UserRole, isCoachOrAdmin } from '../services/authGatekeeperService';

export type TrendMetricType = 'weight' | 'bodyFat' | 'muscle' | 'waist' | 'comparison';

export interface GeometryOptions {
  svgWidth?: number;
  svgHeight?: number;
  padLeft?: number;
  padRight?: number;
  padTop?: number;
  padBottom?: number;
}

export function computeScaleAndCoordinates(
  points: WeeklyBiometricPoint[],
  key: keyof Pick<WeeklyBiometricPoint, 'weightKg' | 'bodyFatPct' | 'muscleMassKg' | 'waistCm'>,
  geom: GeometryOptions = {}
) {
  const padLeft = geom.padLeft ?? 42;
  const padRight = geom.padRight ?? 20;
  const padTop = geom.padTop ?? 18;
  const padBottom = geom.padBottom ?? 28;
  const svgWidth = geom.svgWidth ?? 360;
  const svgHeight = geom.svgHeight ?? 150;
  const usableWidth = svgWidth - padLeft - padRight;
  const usableHeight = svgHeight - padTop - padBottom;

  const values = points.map((p) => p[key]);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);

  let low: number;
  let high: number;

  if (rawMin === rawMax) {
    low = Math.max(0, rawMin - 2);
    high = rawMax + 2;
  } else {
    const range = rawMax - rawMin;
    const pad = range * 0.2; // 20% margin top and bottom for readability
    low = Number((rawMin - pad).toFixed(1));
    high = Number((rawMax + pad).toFixed(1));
  }

  const span = high - low;
  const coords = points.map((p, i) => {
    const x = points.length === 1
      ? padLeft + usableWidth / 2
      : padLeft + (i / (points.length - 1)) * usableWidth;
    const val = p[key];
    const norm = (val - low) / span;
    // Invert for SVG Y (high value = lower Y / near top of canvas)
    const y = padTop + usableHeight - norm * usableHeight;
    return { x, y, point: p, value: val };
  });

  return {
    minVal: low,
    maxVal: high,
    coordinates: coords
  };
}

export function computeBiometricAnalysis(
  points: WeeklyBiometricPoint[],
  category?: string
) {
  if (!points || points.length === 0) {
    return {
      badge: 'Menunggu Data',
      isPositive: true,
      weeklyRateText: '0 kg / minggu',
      deltaWeight: 0,
      deltaFat: 0,
      deltaMuscle: 0,
      deltaWaist: 0,
      totalWeeks: 1,
      narrative: 'Belum ada data checkpoint biometric.'
    };
  }

  const first = points[0];
  const last = points[points.length - 1];
  const totalCheckpoints = points.length;

  const deltaWeight = Number((last.weightKg - first.weightKg).toFixed(1));
  const deltaFat = Number((last.bodyFatPct - first.bodyFatPct).toFixed(1));
  const deltaMuscle = Number((last.muscleMassKg - first.muscleMassKg).toFixed(1));
  const deltaWaist = Number((last.waistCm - first.waistCm).toFixed(1));

  // Calculate approximate weeks represented
  const parsedLastNum = parseInt(last.weekLabel.replace(/\D/g, ''), 10);
  const totalWeeks = !isNaN(parsedLastNum) && parsedLastNum > 1 ? parsedLastNum : Math.max(1, totalCheckpoints);
  const weeklyRateKg = Number((deltaWeight / totalWeeks).toFixed(2));

  if (category === 'Fat Loss') {
    const isWeightDropping = deltaWeight <= 0;
    const isFatDropping = deltaFat <= 0;
    const isMusclePreserved = deltaMuscle >= -0.5;

    return {
      badge: isWeightDropping && isFatDropping ? 'Defisit Terkendali & Optimal' : 'Evaluasi Kepatuhan Kalori',
      isPositive: isWeightDropping && isFatDropping,
      weeklyRateText: `${weeklyRateKg > 0 ? `+${weeklyRateKg}` : weeklyRateKg} kg / minggu`,
      deltaWeight,
      deltaFat,
      deltaMuscle,
      deltaWaist,
      totalWeeks,
      narrative: isWeightDropping
        ? `Penurunan berat total ${Math.abs(deltaWeight)} kg (${Math.abs(weeklyRateKg)} kg/minggu) dengan reduksi lemak tubuh ${Math.abs(deltaFat)}%. Massa otot ${isMusclePreserved ? 'terjaga optimal' : 'perlu perhatian suplementasi protein'}.`
        : `Berat badan saat ini stabil (+${deltaWeight} kg). Pantau defisit kalori harian dan tingkatkan intensitas latihan kardio.`
    };
  }

  if (category === 'Hipertrofi') {
    const isMuscleGrowing = deltaMuscle >= 0;

    return {
      badge: isMuscleGrowing ? 'Hipertrofi Positif (Lean Gains)' : 'Tingkatkan Volume Latihan',
      isPositive: isMuscleGrowing,
      weeklyRateText: `${weeklyRateKg > 0 ? `+${weeklyRateKg}` : weeklyRateKg} kg / minggu`,
      deltaWeight,
      deltaFat,
      deltaMuscle,
      deltaWaist,
      totalWeeks,
      narrative: isMuscleGrowing
        ? `Pertumbuhan massa otot rangka +${deltaMuscle} kg dengan peningkatan berat terencana +${deltaWeight} kg. Rasio lemak tubuh stabil (${deltaFat >= 0 ? `+${deltaFat}` : deltaFat}%).`
        : `Massa otot belum bertambah optimal. Tingkatkan target kalori surplus bersih dan pastikan RIR 1-2 pada set utama.`
    };
  }

  // Powerlifting default
  return {
    badge: 'Peaking & Preservasi Otot',
    isPositive: deltaMuscle >= 0,
    weeklyRateText: `${weeklyRateKg > 0 ? `+${weeklyRateKg}` : weeklyRateKg} kg / minggu`,
    deltaWeight,
    deltaFat,
    deltaMuscle,
    deltaWaist,
    totalWeeks,
    narrative: `Stabilitas massa otot ${last.muscleMassKg} kg mendukung efisiensi biomekanis pada Squat, Bench, dan Deadlift.`
  };
}

export function computeDeltaFromBaseline(
  activePoint: WeeklyBiometricPoint,
  baselinePoint: WeeklyBiometricPoint,
  key: keyof Pick<WeeklyBiometricPoint, 'weightKg' | 'bodyFatPct' | 'muscleMassKg' | 'waistCm'>
) {
  const diff = Number((activePoint[key] - baselinePoint[key]).toFixed(1));
  const pct = baselinePoint[key] !== 0
    ? Number(((diff / baselinePoint[key]) * 100).toFixed(1))
    : 0;
  return { diff, pct };
}

interface BiometricTrendChartProps {
  client: ClientProfile;
  currentUserRole?: UserRole;
  onOpenUpdateMetrics?: () => void;
}

export const BiometricTrendChart: React.FC<BiometricTrendChartProps> = ({
  client,
  currentUserRole = 'coach',
  onOpenUpdateMetrics
}) => {
  const [selectedMetric, setSelectedMetric] = useState<TrendMetricType>('weight');
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);

  // Normalize points: fallback to baseline if empty
  const points: WeeklyBiometricPoint[] = useMemo(() => {
    if (client.weeklyTrend && client.weeklyTrend.length > 0) {
      return client.weeklyTrend;
    }
    return [
      {
        weekLabel: 'M1',
        weightKg: client.berat_awal_kg || 80,
        bodyFatPct: client.body_fat_awal_pct || 20,
        muscleMassKg: client.massa_otot_awal_kg || 35,
        waistCm: client.lingkar_pinggang_awal_cm || 85
      }
    ];
  }, [client]);

  // Selected or default active point (defaults to latest checkpoint)
  const currentActiveIndex = activePointIndex !== null && activePointIndex < points.length
    ? activePointIndex
    : points.length - 1;
  const activePoint = points[currentActiveIndex] || points[0];
  const baselinePoint = points[0];

  // Step navigation for mobile one-thumb ergonomics
  const handlePrevPoint = () => {
    setActivePointIndex((prev) => {
      const idx = prev !== null ? prev : points.length - 1;
      return Math.max(0, idx - 1);
    });
  };

  const handleNextPoint = () => {
    setActivePointIndex((prev) => {
      const idx = prev !== null ? prev : points.length - 1;
      return Math.min(points.length - 1, idx + 1);
    });
  };

  // SVG Chart Geometry Constants
  const svgWidth = 360;
  const svgHeight = 150;
  const padLeft = 42;
  const padRight = 20;
  const padTop = 18;
  const padBottom = 28;
  const usableWidth = svgWidth - padLeft - padRight;
  const usableHeight = svgHeight - padTop - padBottom;

  // Metric metadata
  const metricConfig = useMemo(() => {
    switch (selectedMetric) {
      case 'bodyFat':
        return {
          title: 'Persentase Lemak Tubuh (Body Fat)',
          unit: '%',
          color: '#ffb95f',
          gradientId: 'amberArea',
          key: 'bodyFatPct' as const,
          label: 'Body Fat'
        };
      case 'muscle':
        return {
          title: 'Massa Otot Rangka (SMM)',
          unit: 'kg',
          color: '#06b6d4',
          gradientId: 'cyanArea',
          key: 'muscleMassKg' as const,
          label: 'Massa Otot'
        };
      case 'waist':
        return {
          title: 'Lingkar Pinggang (Antropometri)',
          unit: 'cm',
          color: '#a78bfa',
          gradientId: 'purpleArea',
          key: 'waistCm' as const,
          label: 'Lingkar Pinggang'
        };
      case 'comparison':
        return {
          title: 'Komparasi Berat Badan vs. Body Fat',
          unit: '',
          color: '#4edea3',
          gradientId: 'emeraldArea',
          key: 'weightKg' as const,
          label: 'BB vs BF'
        };
      case 'weight':
      default:
        return {
          title: 'Berat Badan (Body Weight)',
          unit: 'kg',
          color: '#4edea3',
          gradientId: 'emeraldArea',
          key: 'weightKg' as const,
          label: 'Berat Badan'
        };
    }
  }, [selectedMetric]);

  // Dynamic Min / Max scale calculation
  const { minVal, maxVal, coordinates, comparisonCoordinates } = useMemo(() => {
    if (selectedMetric === 'comparison') {
      // Dual-metric normalized plotting (0% - 100%)
      const weights = points.map((p) => p.weightKg);
      const fats = points.map((p) => p.bodyFatPct);
      const minW = Math.min(...weights);
      const maxW = Math.max(...weights);
      const minF = Math.min(...fats);
      const maxF = Math.max(...fats);

      const spanW = maxW === minW ? 1 : maxW - minW;
      const spanF = maxF === minF ? 1 : maxF - minF;

      const wCoords = points.map((p, i) => {
        const x = points.length === 1
          ? padLeft + usableWidth / 2
          : padLeft + (i / (points.length - 1)) * usableWidth;
        const norm = (p.weightKg - minW) / spanW;
        // Invert for SVG Y (high value = lower Y / near top)
        const y = padTop + usableHeight - norm * usableHeight;
        return { x, y, point: p, value: p.weightKg };
      });

      const fCoords = points.map((p, i) => {
        const x = points.length === 1
          ? padLeft + usableWidth / 2
          : padLeft + (i / (points.length - 1)) * usableWidth;
        const norm = (p.bodyFatPct - minF) / spanF;
        const y = padTop + usableHeight - norm * usableHeight;
        return { x, y, point: p, value: p.bodyFatPct };
      });

      return {
        minVal: minW,
        maxVal: maxW,
        coordinates: wCoords,
        comparisonCoordinates: fCoords
      };
    }

    const key = metricConfig.key;
    const computed = computeScaleAndCoordinates(points, key, {
      svgWidth,
      svgHeight,
      padLeft,
      padRight,
      padTop,
      padBottom
    });

    return {
      minVal: computed.minVal,
      maxVal: computed.maxVal,
      coordinates: computed.coordinates,
      comparisonCoordinates: null
    };
  }, [points, selectedMetric, metricConfig.key, padLeft, usableWidth, padTop, usableHeight]);

  // Construct SVG Polyline and Polygon Points
  const polylinePoints = useMemo(() => {
    return coordinates.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  }, [coordinates]);

  const polygonPoints = useMemo(() => {
    if (coordinates.length === 0) return '';
    const baseY = (padTop + usableHeight).toFixed(1);
    const firstX = coordinates[0].x.toFixed(1);
    const lastX = coordinates[coordinates.length - 1].x.toFixed(1);
    const pathPoints = coordinates.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
    return `${firstX},${baseY} ${pathPoints} ${lastX},${baseY}`;
  }, [coordinates, padTop, usableHeight]);

  const comparisonPolylinePoints = useMemo(() => {
    if (!comparisonCoordinates) return '';
    return comparisonCoordinates.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  }, [comparisonCoordinates]);

  // Baseline Y reference line coordinate
  const baselineY = useMemo(() => {
    if (coordinates.length === 0) return padTop + usableHeight / 2;
    return coordinates[0].y;
  }, [coordinates, padTop, usableHeight]);

  // Progress Analysis & Interpretation Narrative
  const analysis = useMemo(() => {
    return computeBiometricAnalysis(points, client.target_category);
  }, [points, client.target_category]);

  // Delta between active point and baseline point
  const activeDelta = useMemo(() => {
    return computeDeltaFromBaseline(activePoint, baselinePoint, metricConfig.key);
  }, [activePoint, baselinePoint, metricConfig.key]);

  return (
    <section className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-4 sm:p-5 space-y-4 shadow-md">
      {/* Header & Metric Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Tren Progres Komposisi Tubuh
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[#4edea3] font-bold">
              {points.length} Checkpoint
            </span>
          </div>
          <p className="text-xs text-[#bbcabf] mt-0.5">
            Grafik dinamis terkalibrasi dari baseline awal ({client.berat_awal_kg} kg · {client.body_fat_awal_pct}%)
          </p>
        </div>

        {/* Metric Selector Pills - Ergonomically optimized for mobile gym touch */}
        <div className="flex items-center gap-2 p-1 bg-[#070e1d] border border-white/[0.08] rounded-xl overflow-x-auto no-scrollbar touch-pan-x -mx-1 px-1 sm:mx-0">
          <button
            type="button"
            onClick={() => setSelectedMetric('weight')}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold shrink-0 whitespace-nowrap transition active:scale-95 flex items-center justify-center ${
              selectedMetric === 'weight'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            BB (kg)
          </button>
          <button
            type="button"
            onClick={() => setSelectedMetric('bodyFat')}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold shrink-0 whitespace-nowrap transition active:scale-95 flex items-center justify-center ${
              selectedMetric === 'bodyFat'
                ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Fat (%)
          </button>
          <button
            type="button"
            onClick={() => setSelectedMetric('muscle')}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold shrink-0 whitespace-nowrap transition active:scale-95 flex items-center justify-center ${
              selectedMetric === 'muscle'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Otot (kg)
          </button>
          <button
            type="button"
            onClick={() => setSelectedMetric('waist')}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold shrink-0 whitespace-nowrap transition active:scale-95 flex items-center justify-center ${
              selectedMetric === 'waist'
                ? 'bg-purple-500 text-slate-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            Pinggang
          </button>
          <button
            type="button"
            onClick={() => setSelectedMetric('comparison')}
            className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold shrink-0 whitespace-nowrap transition active:scale-95 flex items-center justify-center ${
              selectedMetric === 'comparison'
                ? 'bg-gradient-to-r from-emerald-500 to-amber-500 text-slate-950 font-bold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.04]'
            }`}
            title="Tampilkan BB dan Body Fat bersamaan"
          >
            Komparasi
          </button>
        </div>
      </div>

      {/* SVG Canvas Area — Separated Plot Zone & X-Axis Selector Bar (Zero Overlap) */}
      <div className="w-full bg-[#070e1d] border border-white/[0.06] rounded-xl p-3.5 space-y-2.5 overflow-hidden">
        {/* Dynamic SVG Plot with Scoped Y-Axis Guide Lines */}
        <div className="relative w-full h-36 pt-4 pb-4">
          {/* Y-Axis Reference Guide Lines & Labels (Strictly inside plot box above X-Axis) */}
          <div className="absolute inset-x-0 top-0 border-b border-white/[0.05] pb-0.5 flex justify-between items-center text-[10px] font-mono text-[#86948a] pointer-events-none">
            <span>
              Max:{' '}
              {selectedMetric === 'comparison'
                ? `${Math.max(...points.map((p) => p.weightKg))}kg / ${Math.max(...points.map((p) => p.bodyFatPct))}%`
                : `${maxVal} ${metricConfig.unit}`}
            </span>
            <span className="text-neutral-500">Plafon Sesi</span>
          </div>

          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-b border-dashed border-white/[0.06] pb-0.5 flex justify-between items-center text-[10px] font-mono text-[#86948a] pointer-events-none">
            <span>
              {selectedMetric === 'comparison'
                ? 'Korelasi Progres'
                : `Mid: ${((maxVal + minVal) / 2).toFixed(1)} ${metricConfig.unit}`}
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 border-b border-white/[0.05] pb-0.5 flex justify-between items-center text-[10px] font-mono text-[#86948a] pointer-events-none">
            <span>
              Min:{' '}
              {selectedMetric === 'comparison'
                ? `${Math.min(...points.map((p) => p.weightKg))}kg / ${Math.min(...points.map((p) => p.bodyFatPct))}%`
                : `${minVal} ${metricConfig.unit}`}
            </span>
            <span className="text-neutral-500">Lantai Baseline</span>
          </div>

          <svg
            className="w-full h-full overflow-visible"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="emeraldArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#4edea3" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#4edea3" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="amberArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#ffb95f" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#ffb95f" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="cyanArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="purpleArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Baseline Guideline (Horizontal dashed line at M1 level) */}
            <line
              x1={padLeft}
              y1={baselineY}
              x2={padLeft + usableWidth}
              y2={baselineY}
              stroke="#86948a"
              strokeOpacity="0.3"
              strokeDasharray="4 3"
              strokeWidth="1"
            />

            {/* Area Fill */}
            {selectedMetric !== 'comparison' && polygonPoints && (
              <polygon
                fill={`url(#${metricConfig.gradientId})`}
                points={polygonPoints}
              />
            )}

            {/* Main Polyline */}
            {polylinePoints && (
              <polyline
                fill="none"
                points={polylinePoints}
                stroke={metricConfig.color}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.5"
              />
            )}

            {/* Secondary Comparison Polyline (Body Fat) if comparison mode */}
            {selectedMetric === 'comparison' && comparisonPolylinePoints && (
              <polyline
                fill="none"
                points={comparisonPolylinePoints}
                stroke="#ffb95f"
                strokeDasharray="3 3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            )}

            {/* Coordinates Points & Interactive Hit Targets */}
            {coordinates.map((c, i) => {
              const isSelected = i === currentActiveIndex;
              return (
                <g key={`pt-${i}`} className="cursor-pointer" onClick={() => setActivePointIndex(i)}>
                  {/* Invisible generous hit target (40px touch zone) for gym floor mobile interaction */}
                  <circle cx={c.x} cy={c.y} r="20" fill="transparent" />

                  {/* Visual Node Circle */}
                  <circle
                    cx={c.x}
                    cy={c.y}
                    fill={isSelected ? '#ffffff' : metricConfig.color}
                    r={isSelected ? 6 : 3.5}
                    stroke={isSelected ? metricConfig.color : '#070e1d'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    className="transition-all duration-150"
                  />

                  {/* Active Point Indicator Pulse Ring */}
                  {isSelected && (
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r="10"
                      fill="none"
                      stroke={metricConfig.color}
                      strokeOpacity="0.5"
                      strokeWidth="1.5"
                      className="animate-ping"
                    />
                  )}
                </g>
              );
            })}

            {/* Comparison secondary circles */}
            {selectedMetric === 'comparison' &&
              comparisonCoordinates?.map((c, i) => (
                <circle
                  key={`comp-pt-${i}`}
                  cx={c.x}
                  cy={c.y}
                  fill="#ffb95f"
                  r={i === currentActiveIndex ? 4.5 : 2.5}
                  stroke="#070e1d"
                  strokeWidth="1.5"
                />
              ))}
          </svg>
        </div>

        {/* Dynamic X-Axis Checkpoint Labels with Symmetric Grid Tap Zones */}
        <div className="pt-3 pb-1 border-t border-white/[0.08]">
          <div className="grid grid-cols-8 gap-1.5">
            {points.map((p, i) => {
              const isSelected = i === currentActiveIndex;
              return (
                <button
                  key={`lbl-${i}`}
                  type="button"
                  onClick={() => setActivePointIndex(i)}
                  className={`min-h-[40px] w-full flex items-center justify-center transition-all font-mono text-[11px] rounded-lg ${
                    isSelected
                      ? 'text-white font-bold bg-white/[0.16] border border-white/30 shadow-sm ring-1 ring-white/10'
                      : i === points.length - 1
                      ? 'text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20'
                      : 'text-neutral-400 hover:text-white hover:bg-white/[0.05]'
                  }`}
                  title={`Pilih Checkpoint ${p.weekLabel}`}
                >
                  {p.weekLabel}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Checkpoint Telemetry Inspector Card — Apple HIG Redesign */}
      <div className="bg-[#0b101c]/90 border border-white/[0.08] rounded-2xl p-3.5 space-y-3 shadow-lg backdrop-blur-md">
        {/* Row 1: Checkpoint Header & Segmented Stepper */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-bold text-white tracking-tight shrink-0">
              Checkpoint {activePoint.weekLabel}
            </span>
            {/* Single smart badge */}
            {points.length === 1 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shrink-0 whitespace-nowrap">
                Baseline & Terkini
              </span>
            ) : currentActiveIndex === 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/[0.08] border border-white/[0.1] text-neutral-300 shrink-0 whitespace-nowrap">
                Baseline Awal
              </span>
            ) : currentActiveIndex === points.length - 1 ? (
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 shrink-0 whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Terkini
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-white/[0.06] text-neutral-400 shrink-0 whitespace-nowrap">
                Minggu ke-{currentActiveIndex + 1}
              </span>
            )}
          </div>

          {/* Stepper with clear min-h-[44px] touch targets */}
          <div className="flex items-center gap-1.5 bg-[#141b2b] border border-white/[0.08] rounded-xl p-1 shrink-0">
            <button
              type="button"
              onClick={handlePrevPoint}
              disabled={currentActiveIndex === 0}
              aria-label="Checkpoint sebelumnya"
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg hover:bg-white/[0.08] disabled:opacity-20 disabled:pointer-events-none text-neutral-300 hover:text-white flex items-center justify-center transition active:scale-95"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 font-mono font-bold text-xs text-white tabular-nums whitespace-nowrap">
              {activePoint.weekLabel}
            </span>

            <button
              type="button"
              onClick={handleNextPoint}
              disabled={currentActiveIndex === points.length - 1}
              aria-label="Checkpoint berikutnya"
              className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg hover:bg-white/[0.08] disabled:opacity-20 disabled:pointer-events-none text-neutral-300 hover:text-white flex items-center justify-center transition active:scale-95"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Row 2: 4-Metric Micro Bento Grid (Scannable, Elegant, High-Legibility) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Berat Badan */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col items-center justify-center text-center">
            <span className="text-[9px] uppercase tracking-wider font-semibold text-neutral-400">
              Berat Badan
            </span>
            <div className="flex items-baseline gap-0.5 mt-0.5">
              <span className="text-sm font-bold font-mono text-emerald-400">
                {activePoint.weightKg}
              </span>
              <span className="text-[10px] text-neutral-400 font-medium">kg</span>
            </div>
          </div>

          {/* Body Fat */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col items-center justify-center text-center">
            <span className="text-[9px] uppercase tracking-wider font-semibold text-neutral-400">
              Body Fat
            </span>
            <div className="flex items-baseline gap-0.5 mt-0.5">
              <span className="text-sm font-bold font-mono text-amber-400">
                {activePoint.bodyFatPct}
              </span>
              <span className="text-[10px] text-neutral-400 font-medium">%</span>
            </div>
          </div>

          {/* Massa Otot */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col items-center justify-center text-center">
            <span className="text-[9px] uppercase tracking-wider font-semibold text-neutral-400">
              Massa Otot
            </span>
            <div className="flex items-baseline gap-0.5 mt-0.5">
              <span className="text-sm font-bold font-mono text-cyan-400">
                {activePoint.muscleMassKg}
              </span>
              <span className="text-[10px] text-neutral-400 font-medium">kg</span>
            </div>
          </div>

          {/* Lingkar Pinggang */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col items-center justify-center text-center">
            <span className="text-[9px] uppercase tracking-wider font-semibold text-neutral-400">
              Pinggang
            </span>
            <div className="flex items-baseline gap-0.5 mt-0.5">
              <span className="text-sm font-bold font-mono text-purple-400">
                {activePoint.waistCm}
              </span>
              <span className="text-[10px] text-neutral-400 font-medium">cm</span>
            </div>
          </div>
        </div>

        {/* Row 3: Baseline Delta Banner */}
        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-neutral-400">
            Perubahan dari Baseline:
          </span>
          <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
            {activeDelta.diff === 0 ? (
              <span className="px-2 py-0.5 rounded-md bg-white/[0.06] text-neutral-300 text-[11px]">
                0.0 {metricConfig.unit} (Baseline)
              </span>
            ) : activeDelta.diff < 0 ? (
              <div className="flex items-center gap-1 text-emerald-400">
                <TrendingDown className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {activeDelta.diff} {metricConfig.unit} ({activeDelta.pct}%)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-amber-400">
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span>
                  +{activeDelta.diff} {metricConfig.unit} (+{activeDelta.pct}%)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Narrative Progress Interpretation & Coach Calibration Action (44px mobile touch target) */}
      <div className="p-3 bg-[#191f2f] rounded-xl text-xs text-[#bbcabf] flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-white/[0.05]">
        <div className="flex items-start gap-2.5">
          <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white">
                {analysis.badge}
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                Laju: {analysis.weeklyRateText}
              </span>
            </div>
            <p className="text-[11px] text-[#bbcabf] mt-0.5 leading-relaxed">
              {analysis.narrative}
            </p>
          </div>
        </div>

        {isCoachOrAdmin(currentUserRole) && onOpenUpdateMetrics && (
          <button
            type="button"
            onClick={onOpenUpdateMetrics}
            className="w-full sm:w-auto shrink-0 min-h-[44px] px-4 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
          >
            <span>Kalibrasi Baru</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </section>
  );
};
