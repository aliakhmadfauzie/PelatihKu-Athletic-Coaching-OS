import React, { useState } from 'react';
import { X, Dumbbell, Check, RotateCcw } from 'lucide-react';
import {
  calculateBarbellPlateBreakdown,
  OLYMPIC_PLATES_CATALOG
} from '../services/sportsScienceDomain';

interface BarbellPlateCalculatorModalProps {
  initialWeightKg: number;
  exerciseName?: string;
  isOpen: boolean;
  onClose: () => void;
  onApplyWeight: (weightKg: number) => void;
}

export const BarbellPlateCalculatorModal: React.FC<BarbellPlateCalculatorModalProps> = ({
  initialWeightKg,
  exerciseName = 'Barbel',
  isOpen,
  onClose,
  onApplyWeight
}) => {
  const [targetWeight, setTargetWeight] = useState<number>(() =>
    Math.max(20, initialWeightKg > 0 ? initialWeightKg : 60)
  );
  const [barWeight, setBarWeight] = useState<number>(20);

  if (!isOpen) return null;

  const result = calculateBarbellPlateBreakdown(targetWeight, barWeight);

  const adjustWeight = (delta: number) => {
    setTargetWeight((prev) => {
      const next = Math.max(barWeight, +(prev + delta).toFixed(1));
      return next;
    });
  };

  const handleApply = () => {
    onApplyWeight(result.actualTotalWeightKg);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="plate-calc-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-[#0e1626] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#141d30]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <h2 id="plate-calc-title" className="text-lg font-bold text-white flex items-center gap-2">
                Kalkulator Barbel & Plate
              </h2>
              <p className="text-xs text-neutral-400 truncate max-w-[240px]">
                {exerciseName} · Olympic Plate Math
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup kalkulator barbel"
            className="min-h-[48px] min-w-[48px] flex items-center justify-center text-neutral-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-5 text-white">
          {/* Bar Selection Toggle */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block mb-2">
              Jenis Barbel (Sleeve 50mm)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setBarWeight(20);
                  if (targetWeight < 20) setTargetWeight(20);
                }}
                className={`min-h-[48px] px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  barWeight === 20
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                    : 'bg-[#182338] border-white/10 text-neutral-400 hover:text-white'
                }`}
              >
                <span>Bar Standar Men (20 kg)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBarWeight(15);
                  if (targetWeight < 15) setTargetWeight(15);
                }}
                className={`min-h-[48px] px-4 rounded-xl border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  barWeight === 15
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm'
                    : 'bg-[#182338] border-white/10 text-neutral-400 hover:text-white'
                }`}
              >
                <span>Bar Women / Tech (15 kg)</span>
              </button>
            </div>
          </div>

          {/* Target Weight Readout & Increments */}
          <div className="bg-[#141f33] border border-white/10 rounded-2xl p-4">
            <span className="text-xs text-neutral-400 font-medium block mb-1">
              Target Beban Total
            </span>
            <div className="flex items-center justify-between gap-3 mb-3">
              <input
                type="number"
                step="0.5"
                min={barWeight}
                value={targetWeight || ''}
                onChange={(e) => setTargetWeight(Number(e.target.value) || barWeight)}
                className="w-full bg-[#0a0f1d] border border-white/10 rounded-xl px-4 py-3 text-3xl font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500 min-h-[52px]"
                aria-label="Input target beban barbel (kg)"
              />
              <span className="text-xl font-bold text-neutral-400">kg</span>
            </div>

            {/* Incremental Steppers (48dp hit targets for chalked fingers) */}
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => adjustWeight(-5)}
                className="min-h-[48px] bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-xl text-sm font-semibold text-neutral-200 transition-all flex items-center justify-center"
              >
                -5 kg
              </button>
              <button
                type="button"
                onClick={() => adjustWeight(-2.5)}
                className="min-h-[48px] bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-xl text-sm font-semibold text-neutral-200 transition-all flex items-center justify-center"
              >
                -2.5 kg
              </button>
              <button
                type="button"
                onClick={() => adjustWeight(2.5)}
                className="min-h-[48px] bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-xl text-sm font-semibold text-emerald-300 transition-all flex items-center justify-center"
              >
                +2.5 kg
              </button>
              <button
                type="button"
                onClick={() => adjustWeight(5)}
                className="min-h-[48px] bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-xl text-sm font-semibold text-emerald-300 transition-all flex items-center justify-center"
              >
                +5 kg
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => adjustWeight(-10)}
                className="min-h-[44px] bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-xl text-xs font-semibold text-neutral-300 transition-all flex items-center justify-center"
              >
                -10 kg
              </button>
              <button
                type="button"
                onClick={() => adjustWeight(10)}
                className="min-h-[44px] bg-white/5 hover:bg-white/10 active:scale-95 border border-white/10 rounded-xl text-xs font-semibold text-emerald-300 transition-all flex items-center justify-center"
              >
                +10 kg
              </button>
            </div>
          </div>

          {/* Visual Barbell Loading Representation */}
          <div className="bg-[#101827] border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Beban Per Sisi (Setengah Bar)
              </span>
              <span className="text-sm font-mono font-bold text-amber-400">
                {result.weightPerSideKg} kg / sisi
              </span>
            </div>

            {/* Graphic Barbell Sleeve */}
            <div className="bg-[#0b0f19] border border-white/10 rounded-xl p-4 flex items-center justify-center min-h-[90px] overflow-x-auto">
              <div className="flex items-center gap-1.5 py-2">
                {/* Collar / Shaft */}
                <div className="w-12 h-6 bg-neutral-600 rounded-l border border-neutral-500 flex items-center justify-center text-[10px] text-white font-mono font-bold shadow-inner">
                  {barWeight}kg
                </div>
                {/* Sleeve Ring */}
                <div className="w-3 h-12 bg-neutral-400 rounded-sm border border-neutral-300" />

                {/* Plates Loaded */}
                {result.platesPerSide.length === 0 ? (
                  <div className="px-4 py-2 text-xs text-neutral-500 italic">
                    Tanpa plate (Hanya bar {barWeight} kg)
                  </div>
                ) : (
                  result.platesPerSide.flatMap((plate, pIdx) =>
                    Array.from({ length: plate.count }).map((_, cIdx) => {
                      // Proportional height based on plate size
                      const heightClass =
                        plate.plateKg >= 20
                          ? 'h-18'
                          : plate.plateKg >= 15
                          ? 'h-16'
                          : plate.plateKg >= 10
                          ? 'h-14'
                          : plate.plateKg >= 5
                          ? 'h-12'
                          : 'h-10';
                      const widthClass = plate.plateKg >= 20 ? 'w-5' : 'w-4';

                      return (
                        <div
                          key={`${pIdx}-${cIdx}`}
                          style={{
                            backgroundColor: plate.hexColor,
                            color: plate.textColor,
                            borderColor: plate.borderColor || 'rgba(255,255,255,0.2)'
                          }}
                          className={`${widthClass} ${heightClass} rounded border flex flex-col items-center justify-center text-[9px] font-bold font-mono shadow-md select-none transition-transform hover:scale-105`}
                          title={`${plate.plateKg} kg`}
                        >
                          <span className="rotate-90 whitespace-nowrap leading-none">
                            {plate.plateKg}
                          </span>
                        </div>
                      );
                    })
                  )
                )}

                {/* Outer Collar Lock */}
                {result.platesPerSide.length > 0 && (
                  <div className="w-2.5 h-7 bg-amber-500 rounded-r border border-amber-400 shadow-sm" />
                )}
              </div>
            </div>

            {/* Plate Breakdown Pills */}
            <div className="mt-4 flex flex-wrap gap-2">
              {result.platesPerSide.length === 0 ? (
                <span className="text-xs text-neutral-400">
                  Tidak membutuhkan plate tambahan.
                </span>
              ) : (
                result.platesPerSide.map((plate) => (
                  <div
                    key={plate.plateKg}
                    style={{
                      borderColor: plate.hexColor,
                      backgroundColor: `${plate.hexColor}20`
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: plate.hexColor }}
                    />
                    <span className="text-white font-mono">
                      {plate.count}× {plate.plateKg} kg
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      ({plate.colorName.split(' ')[0]})
                    </span>
                  </div>
                ))
              )}
            </div>

            {result.remainingKg > 0 && (
              <p className="mt-3 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5">
                Catatan: Sisa {result.remainingKg} kg tidak dapat dimuat persis karena keterbatasan kepingan fraksional 1.25 kg. Beban terpasang: {result.actualTotalWeightKg} kg.
              </p>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-[#141d30] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setTargetWeight(barWeight)}
            className="min-h-[48px] px-4 rounded-xl border border-white/10 hover:bg-white/5 text-neutral-300 text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Bar</span>
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 min-h-[48px] bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 font-bold rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Check className="w-5 h-5 stroke-[2.5]" />
            <span>Gunakan Beban {result.actualTotalWeightKg} kg</span>
          </button>
        </div>
      </div>
    </div>
  );
};
