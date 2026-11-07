import React, { useState } from 'react';
import { X, ArrowRightLeft, Sparkles, Check, Dumbbell, ShieldCheck } from 'lucide-react';
import {
  getExerciseSubstitutions,
  ExerciseSubstitutionOption
} from '../services/sportsScienceDomain';

interface ExerciseSwapModalProps {
  currentExerciseName: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSwap: (newExerciseName: string, notes?: string) => void;
}

export const ExerciseSwapModal: React.FC<ExerciseSwapModalProps> = ({
  currentExerciseName,
  isOpen,
  onClose,
  onConfirmSwap
}) => {
  const [selectedSub, setSelectedSub] = useState<ExerciseSubstitutionOption | null>(null);
  const [customSearch, setCustomSearch] = useState('');

  if (!isOpen) return null;

  const substitutions = getExerciseSubstitutions(currentExerciseName);

  const handleSelect = (sub: ExerciseSubstitutionOption) => {
    setSelectedSub(sub);
  };

  const handleApply = () => {
    if (!selectedSub) return;
    const note = `Substitusi dari ${currentExerciseName} (${selectedSub.reason})`;
    onConfirmSwap(selectedSub.name, note);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="swap-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg bg-[#0e1626] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#141d30]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ArrowRightLeft className="w-6 h-6" />
            </div>
            <div>
              <h2 id="swap-modal-title" className="text-lg font-bold text-white flex items-center gap-2">
                Substitusi Alat & Gerakan
              </h2>
              <p className="text-xs text-neutral-400">
                Alat sedang terpakai? Ganti ke variasi biomekanis setara
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup modal ganti gerakan"
            className="min-h-[48px] min-w-[48px] flex items-center justify-center text-neutral-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-white">
          {/* Active Exercise Summary */}
          <div className="bg-[#141f33] border border-white/10 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider block">
                Gerakan Saat Ini
              </span>
              <span className="text-base font-bold text-white">
                {currentExerciseName}
              </span>
            </div>
            <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold rounded-lg">
              Alat Penuh / Antri
            </span>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider block flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Rekomendasi Biomekanis Setara ({substitutions.length} Pilihan)</span>
            </label>

            <div className="space-y-2.5">
              {substitutions.map((sub, idx) => {
                const isSelected = selectedSub?.name === sub.name;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelect(sub)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-2 min-h-[72px] ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/10'
                        : 'bg-[#121a2c] border-white/10 hover:border-white/20 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Dumbbell className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-neutral-400'}`} />
                        <span className="text-sm font-bold text-white">{sub.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-white/10 text-neutral-300 font-medium">
                          {sub.equipment}
                        </span>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-neutral-400 leading-relaxed">
                      {sub.reason}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-neutral-400 pt-1 border-t border-white/5">
                      <span>Pola: <strong className="text-neutral-200">{sub.movementPattern}</strong></span>
                      <span>Target: <strong className="text-neutral-200">{sub.muscleTarget}</strong></span>
                      {sub.weightRatioMultiplier !== 1.0 && (
                        <span className="text-amber-400 font-mono">
                          Rasio beban: {sub.weightRatioMultiplier}×
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/10 bg-[#141d30] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[48px] px-4 rounded-xl border border-white/10 hover:bg-white/5 text-neutral-300 text-xs font-semibold transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!selectedSub}
            onClick={handleApply}
            className={`flex-1 min-h-[48px] font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-all ${
              selectedSub
                ? 'bg-emerald-500 hover:bg-emerald-400 active:scale-98 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
            }`}
          >
            <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            <span>Ganti ke {selectedSub ? selectedSub.name : 'Latihan Terpilih'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
