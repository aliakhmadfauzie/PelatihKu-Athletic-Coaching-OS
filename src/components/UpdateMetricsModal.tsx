import React, { useState, useEffect } from 'react';
import {
  X,
  Scale,
  CheckCircle2,
  Copy,
  MessageCircle,
  TrendingDown,
  TrendingUp,
  ArrowRight,
  Database
} from 'lucide-react';
import { ClientProfile } from '../data/mockData';

interface UpdateMetricsModalProps {
  client: ClientProfile;
  onClose: () => void;
  onSaveMetrics: (updated: {
    weightKg: number;
    bodyFatPct: number;
    muscleMassKg: number;
    waistCm: number;
    chestCm: number;
    armCm: number;
  }) => void;
  onNotify: (msg: string) => void;
}

export const UpdateMetricsModal: React.FC<UpdateMetricsModalProps> = ({
  client,
  onClose,
  onSaveMetrics,
  onNotify
}) => {
  const latestTrendPoint =
    client.weeklyTrend && client.weeklyTrend.length > 0
      ? client.weeklyTrend[client.weeklyTrend.length - 1]
      : null;

  // Latest saved values in database prior to this update
  const lastDbWeight = client.berat_terkini_kg ?? latestTrendPoint?.weightKg ?? client.berat_awal_kg;
  const lastDbFat = client.body_fat_terkini_pct ?? latestTrendPoint?.bodyFatPct ?? client.body_fat_awal_pct;
  const lastDbMuscle = client.massa_otot_terkini_kg ?? latestTrendPoint?.muscleMassKg ?? client.massa_otot_awal_kg;
  const lastDbWaist = client.lingkar_pinggang_terkini_cm ?? latestTrendPoint?.waistCm ?? client.lingkar_pinggang_awal_cm;
  const lastDbChest = client.lingkar_dada_terkini_cm ?? client.lingkar_dada_awal_cm;
  const lastDbArm = client.lingkar_lengan_terkini_cm ?? client.lingkar_lengan_awal_cm;

  const [step, setStep] = useState<'form' | 'confirmation'>('form');
  const [weightKg, setWeightKg] = useState<string>(String(lastDbWeight));
  const [bodyFatPct, setBodyFatPct] = useState<string>(String(lastDbFat));
  const [muscleMassKg, setMuscleMassKg] = useState<string>(String(lastDbMuscle));
  const [waistCm, setWaistCm] = useState<string>(String(lastDbWaist));
  const [chestCm, setChestCm] = useState<string>(String(lastDbChest));
  const [armCm, setArmCm] = useState<string>(String(lastDbArm));
  const [copied, setCopied] = useState(false);

  // Ensure form always reflects the latest saved database values when opened or updated
  useEffect(() => {
    if (step === 'form') {
      setWeightKg(String(lastDbWeight));
      setBodyFatPct(String(lastDbFat));
      setMuscleMassKg(String(lastDbMuscle));
      setWaistCm(String(lastDbWaist));
      setChestCm(String(lastDbChest));
      setArmCm(String(lastDbArm));
    }
  }, [
    client.id,
    lastDbWeight,
    lastDbFat,
    lastDbMuscle,
    lastDbWaist,
    lastDbChest,
    lastDbArm,
    step
  ]);

  const parsedWeight = parseFloat(weightKg) || lastDbWeight;
  const parsedFat = parseFloat(bodyFatPct) || lastDbFat;
  const parsedMuscle = parseFloat(muscleMassKg) || lastDbMuscle;
  const parsedWaist = parseFloat(waistCm) || lastDbWaist;
  const parsedChest = parseFloat(chestCm) || lastDbChest;
  const parsedArm = parseFloat(armCm) || lastDbArm;

  // Automatic 8-week baseline deltas
  const weightDelta = parsedWeight - client.berat_awal_kg;
  const weightPctChange = (client.berat_awal_kg || 0) > 0
    ? ((weightDelta / client.berat_awal_kg) * 100).toFixed(1)
    : '0.0';
  const fatDelta = parsedFat - client.body_fat_awal_pct;
  const muscleDelta = parsedMuscle - client.massa_otot_awal_kg;
  const waistDelta = parsedWaist - client.lingkar_pinggang_awal_cm;

  const progressWeekLabel =
    client.weeklyTrend && client.weeklyTrend.length > 1
      ? `Mgg ${client.weeklyTrend.length}`
      : 'Mgg 8';

  const formatSigned = (val: number, unit: string) =>
    `${val > 0 ? '+' : ''}${val.toFixed(1)} ${unit}`;

  const cleanCoachName = (client.leadCoach || 'Panji Akbar Syamsi').replace(/^Coach\s+/i, '');

  const whatsappReportDraft = `*LAPORAN KALIBRASI PROGRES FISIK — PELATIHKU*
Member: *${client.nama_lengkap}* (${client.code})
Program: ${client.phase} (${client.target_utama})
Pelatih: Coach ${cleanCoachName}

*Ringkasan Biometrik (Mgg 1 vs ${progressWeekLabel}):*
• Berat Badan: ${client.berat_awal_kg} kg → *${parsedWeight.toFixed(1)} kg* (${formatSigned(weightDelta, 'kg')} / ${weightPctChange}%)
• Lemak Tubuh (BF): ${client.body_fat_awal_pct}% → *${parsedFat.toFixed(1)}%* (${formatSigned(fatDelta, '%')})
• Massa Otot (SMM): ${client.massa_otot_awal_kg} kg → *${parsedMuscle.toFixed(1)} kg* (${formatSigned(muscleDelta, 'kg')})
• Lingkar Pinggang: ${client.lingkar_pinggang_awal_cm} cm → *${parsedWaist.toFixed(1)} cm* (${formatSigned(waistDelta, 'cm')})
• Lingkar Dada / Lengan: ${parsedChest.toFixed(1)} cm / ${parsedArm.toFixed(1)} cm

*Evaluasi Taktis:*
Progres sangat konsisten dengan tingkat kepatuhan nutrisi ${client.dietCompliancePct}%. Pertahankan target protein harian ${client.proteinTarget}g dan hidrasi ${client.hidrasiTarget}L.`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveMetrics({
      weightKg: parsedWeight,
      bodyFatPct: parsedFat,
      muscleMassKg: parsedMuscle,
      waistCm: parsedWaist,
      chestCm: parsedChest,
      armCm: parsedArm
    });
    setStep('confirmation');
  };

  const handleCopyDraft = () => {
    navigator.clipboard?.writeText(whatsappReportDraft);
    setCopied(true);
    onNotify('Draf laporan 8 minggu disalin ke clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const waUrl = `https://wa.me/${(client.telepon || '').replace(/\D/g, '')}?text=${encodeURIComponent(whatsappReportDraft)}`;

  return (
    <div className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-lg max-h-[92vh] bg-[#111726]/95 backdrop-blur-2xl border border-white/[0.12] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.6)]"
      >
        {/* Grab Handle on mobile */}
        <div className="w-10 h-1 rounded-full bg-[#2e3545] mx-auto mt-3 sm:hidden" />

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#10b981]/15 text-[#4edea3] flex items-center justify-center shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white truncate">
                {step === 'form' ? 'Update Metrik & Timbang' : 'Konfirmasi Progres 8 Minggu'}
              </h2>
              <p className="text-xs text-[#bbcabf] truncate">
                {client.nama_lengkap} · Baseline Mgg 1: {client.berat_awal_kg} kg ({client.body_fat_awal_pct}% BF)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="min-w-[44px] min-h-[44px] rounded-xl bg-[#232a3a] text-[#bbcabf] hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'form' ? (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Live Automatic Delta Preview Banner */}
            <div className="bg-[#191f2f] border border-white/[0.08] rounded-xl p-3.5 grid grid-cols-3 gap-3">
              <div>
                <span className="text-[11px] text-[#86948a] block">Delta Berat (8 Mgg)</span>
                <div className="flex items-center gap-1 mt-0.5 font-mono text-sm font-semibold text-[#4edea3]">
                  {weightDelta <= 0 ? (
                    <TrendingDown className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingUp className="w-3.5 h-3.5 text-[#ffb95f]" />
                  )}
                  <span>{formatSigned(weightDelta, 'kg')}</span>
                </div>
                <span className="text-[11px] font-mono text-[#bbcabf]">{weightPctChange}% vs M1</span>
              </div>

              <div>
                <span className="text-[11px] text-[#86948a] block">Delta Lemak (BF%)</span>
                <div className="font-mono text-sm font-semibold text-[#4edea3] mt-0.5">
                  {formatSigned(fatDelta, '%')}
                </div>
                <span className="text-[11px] font-mono text-[#bbcabf]">M1: {client.body_fat_awal_pct}%</span>
              </div>

              <div>
                <span className="text-[11px] text-[#86948a] block">Delta Pinggang</span>
                <div className="font-mono text-sm font-semibold text-[#4edea3] mt-0.5">
                  {formatSigned(waistDelta, 'cm')}
                </div>
                <span className="text-[11px] font-mono text-[#bbcabf]">M1: {client.lingkar_pinggang_awal_cm} cm</span>
              </div>
            </div>

            {/* Database Synced State Info Card — Shows Latest DB Data Prior to Update */}
            <div className="bg-[#121928] border border-emerald-500/30 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Data Terakhir Tersimpan di Database (Sebelum Update)</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  {latestTrendPoint?.weekLabel || 'Checkpoint Terkini'}
                </span>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[11px] font-mono">
                <div className="bg-[#0b101c] p-2 rounded-lg border border-white/[0.06]">
                  <span className="text-[10px] text-neutral-400 block">Berat</span>
                  <span className="font-bold text-white">{lastDbWeight} kg</span>
                </div>
                <div className="bg-[#0b101c] p-2 rounded-lg border border-white/[0.06]">
                  <span className="text-[10px] text-neutral-400 block">Body Fat</span>
                  <span className="font-bold text-white">{lastDbFat}%</span>
                </div>
                <div className="bg-[#0b101c] p-2 rounded-lg border border-white/[0.06]">
                  <span className="text-[10px] text-neutral-400 block">Massa Otot</span>
                  <span className="font-bold text-white">{lastDbMuscle} kg</span>
                </div>
                <div className="bg-[#0b101c] p-2 rounded-lg border border-white/[0.06]">
                  <span className="text-[10px] text-neutral-400 block">Pinggang</span>
                  <span className="font-bold text-white">{lastDbWaist} cm</span>
                </div>
                <div className="bg-[#0b101c] p-2 rounded-lg border border-white/[0.06]">
                  <span className="text-[10px] text-neutral-400 block">Dada</span>
                  <span className="font-bold text-white">{lastDbChest} cm</span>
                </div>
                <div className="bg-[#0b101c] p-2 rounded-lg border border-white/[0.06]">
                  <span className="text-[10px] text-neutral-400 block">Lengan</span>
                  <span className="font-bold text-white">{lastDbArm} cm</span>
                </div>
              </div>
            </div>

            {/* Primary Biometrics */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-[#bbcabf]">
                  Komposisi Tubuh Utama
                </h3>
                <span className="text-[10px] font-mono text-[#86948a]">
                  Nilai form terisi otomatis dari data terakhir DB
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Berat Badan (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full min-h-[46px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-base font-mono font-bold text-white tabular-nums focus:outline-none focus:border-[#10b981]"
                  />
                  <span className="block text-[10px] font-mono text-[#86948a] mt-1">
                    Terakhir: <strong className="text-[#bbcabf]">{lastDbWeight} kg</strong>
                  </span>
                </div>
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Body Fat (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={bodyFatPct}
                    onChange={(e) => setBodyFatPct(e.target.value)}
                    className="w-full min-h-[46px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-base font-mono font-bold text-white tabular-nums focus:outline-none focus:border-[#10b981]"
                  />
                  <span className="block text-[10px] font-mono text-[#86948a] mt-1">
                    Terakhir: <strong className="text-[#bbcabf]">{lastDbFat}%</strong>
                  </span>
                </div>
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Massa Otot (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={muscleMassKg}
                    onChange={(e) => setMuscleMassKg(e.target.value)}
                    className="w-full min-h-[46px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-base font-mono font-bold text-white tabular-nums focus:outline-none focus:border-[#10b981]"
                  />
                  <span className="block text-[10px] font-mono text-[#86948a] mt-1">
                    Terakhir: <strong className="text-[#bbcabf]">{lastDbMuscle} kg</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Circumference Measurements */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-[#bbcabf]">
                  Pengukuran Lingkar Tubuh (Antropometri)
                </h3>
                <span className="text-[10px] font-mono text-[#86948a]">
                  Baseline M1: {client.lingkar_pinggang_awal_cm}/{client.lingkar_dada_awal_cm}/{client.lingkar_lengan_awal_cm} cm
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Pinggang (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={waistCm}
                    onChange={(e) => setWaistCm(e.target.value)}
                    className="w-full min-h-[46px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-base font-mono font-bold text-white tabular-nums focus:outline-none focus:border-[#10b981]"
                  />
                  <span className="block text-[10px] font-mono text-[#86948a] mt-1">
                    Terakhir: <strong className="text-[#bbcabf]">{lastDbWaist} cm</strong>
                  </span>
                </div>
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Dada (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={chestCm}
                    onChange={(e) => setChestCm(e.target.value)}
                    className="w-full min-h-[46px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-base font-mono font-bold text-white tabular-nums focus:outline-none focus:border-[#10b981]"
                  />
                  <span className="block text-[10px] font-mono text-[#86948a] mt-1">
                    Terakhir: <strong className="text-[#bbcabf]">{lastDbChest} cm</strong>
                  </span>
                </div>
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Lengan (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={armCm}
                    onChange={(e) => setArmCm(e.target.value)}
                    className="w-full min-h-[46px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-base font-mono font-bold text-white tabular-nums focus:outline-none focus:border-[#10b981]"
                  />
                  <span className="block text-[10px] font-mono text-[#86948a] mt-1">
                    Terakhir: <strong className="text-[#bbcabf]">{lastDbArm} cm</strong>
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[#232a3a] text-[#bbcabf] hover:text-white text-xs font-semibold transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#002113] text-sm font-semibold flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
              >
                <span>Simpan &amp; Buat Ringkasan 8 Minggu</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Confirmation Banner */}
            <div className="bg-[#10b981]/10 border border-[#10b981]/30 rounded-xl p-3.5 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#4edea3] shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-white">Metrik Biometrik Terkalibrasi</p>
                <p className="text-[#bbcabf]">
                  Grafik komposisi tubuh 8 minggu telah diperbarui. Draf laporan siap dikirim ke WhatsApp member.
                </p>
              </div>
            </div>

            {/* 8-Week Summary Table */}
            <div className="bg-[#191f2f] border border-white/[0.08] rounded-xl overflow-hidden">
              <div className="grid grid-cols-4 px-3.5 py-2 bg-[#070e1d] text-[11px] font-medium text-[#86948a]">
                <span>Parameter</span>
                <span className="text-right">Baseline M1</span>
                <span className="text-right">Mgg 8 (Kini)</span>
                <span className="text-right">Selisih</span>
              </div>
              <div className="divide-y divide-white/[0.06] text-xs font-mono">
                <div className="grid grid-cols-4 px-3.5 py-2.5 items-center">
                  <span className="font-sans text-white">Berat Badan</span>
                  <span className="text-right text-[#bbcabf]">{client.berat_awal_kg} kg</span>
                  <span className="text-right text-white font-semibold">{parsedWeight.toFixed(1)} kg</span>
                  <span className="text-right text-[#4edea3] font-semibold">{formatSigned(weightDelta, 'kg')}</span>
                </div>
                <div className="grid grid-cols-4 px-3.5 py-2.5 items-center">
                  <span className="font-sans text-white">Lemak Tubuh</span>
                  <span className="text-right text-[#bbcabf]">{client.body_fat_awal_pct}%</span>
                  <span className="text-right text-white font-semibold">{parsedFat.toFixed(1)}%</span>
                  <span className="text-right text-[#4edea3] font-semibold">{formatSigned(fatDelta, '%')}</span>
                </div>
                <div className="grid grid-cols-4 px-3.5 py-2.5 items-center">
                  <span className="font-sans text-white">Massa Otot</span>
                  <span className="text-right text-[#bbcabf]">{client.massa_otot_awal_kg} kg</span>
                  <span className="text-right text-white font-semibold">{parsedMuscle.toFixed(1)} kg</span>
                  <span className="text-right text-[#4edea3] font-semibold">{formatSigned(muscleDelta, 'kg')}</span>
                </div>
                <div className="grid grid-cols-4 px-3.5 py-2.5 items-center">
                  <span className="font-sans text-white">Pinggang</span>
                  <span className="text-right text-[#bbcabf]">{client.lingkar_pinggang_awal_cm} cm</span>
                  <span className="text-right text-white font-semibold">{parsedWaist.toFixed(1)} cm</span>
                  <span className="text-right text-[#4edea3] font-semibold">{formatSigned(waistDelta, 'cm')}</span>
                </div>
              </div>
            </div>

            {/* WhatsApp Formatted Report Preview */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#bbcabf]">
                  Draf Laporan Format WhatsApp
                </span>
                <button
                  type="button"
                  onClick={handleCopyDraft}
                  className="min-h-[36px] px-2.5 py-1 rounded-lg bg-[#232a3a] hover:bg-[#323949] text-xs text-[#4edea3] font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
                </button>
              </div>
              <pre className="p-3.5 rounded-xl bg-[#070e1d] border border-white/[0.08] text-[11px] font-mono text-[#dce2f7] whitespace-pre-wrap leading-relaxed max-h-44 overflow-y-auto">
                {whatsappReportDraft}
              </pre>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-h-[48px] px-4 py-3 rounded-xl bg-[#10b981] hover:bg-[#4edea3] text-[#002113] font-semibold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Kirim Laporan via WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[48px] px-4 py-3 rounded-xl bg-[#232a3a] text-white text-xs font-semibold hover:bg-[#323949] transition-colors"
              >
                Selesai
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
