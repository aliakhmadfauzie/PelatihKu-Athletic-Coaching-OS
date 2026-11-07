import React, { useState } from 'react';
import {
  Printer,
  Share2,
  Copy,
  Check,
  X,
  Award,
  Calendar,
  Activity,
  Dumbbell,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  User
} from 'lucide-react';
import { ClientProfile, CoachProfileData } from '../data/mockData';

interface ClientProgressReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientProfile;
  coach: CoachProfileData;
  onNotify: (msg: string) => void;
}

export const ClientProgressReportModal: React.FC<ClientProgressReportModalProps> = ({
  isOpen,
  onClose,
  client,
  coach,
  onNotify
}) => {
  if (!isOpen) return null;

  const [copied, setCopied] = useState(false);

  // Deltas
  const deltaWeight = (client.berat_terkini_kg - client.berat_awal_kg).toFixed(1);
  const deltaBf = (client.body_fat_terkini_pct - client.body_fat_awal_pct).toFixed(1);
  const deltaMuscle = (client.massa_otot_terkini_kg - client.massa_otot_awal_kg).toFixed(1);
  const deltaWaist = (client.lingkar_pinggang_terkini_cm - client.lingkar_pinggang_awal_cm).toFixed(1);

  // Formatted date
  const todayFormatted = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date());

  // WhatsApp summary generator
  const generateWhatsAppSummary = () => {
    return `*LAPORAN RESMI TRANSFORMASI ATLETIK — PELATIHKU PRO*
Tanggal: ${todayFormatted}
Head Coach: ${coach.name || 'Coach Panji Akbar Syamsi, S.Or.'}
Lisensi: Kemenpora RI & PB PABSI Level 2

*PROFIL MEMBER:*
Nama: ${client.nama_lengkap} (${client.code})
Target: ${client.target_utama} (${client.target_category})
Paket PT: ${client.paketTerpakai}/${client.paketTotal} Sesi Selesai (${Math.round((client.paketTerpakai / client.paketTotal) * 100)}%)

*METRIK KOMPOSISI TUBUH:*
• Berat Badan: ${client.berat_awal_kg} kg ➔ ${client.berat_terkini_kg} kg (${parseFloat(deltaWeight) > 0 ? '+' : ''}${deltaWeight} kg)
• Body Fat: ${client.body_fat_awal_pct}% ➔ ${client.body_fat_terkini_pct}% (${parseFloat(deltaBf) > 0 ? '+' : ''}${deltaBf}%)
• Massa Otot: ${client.massa_otot_awal_kg} kg ➔ ${client.massa_otot_terkini_kg} kg (${parseFloat(deltaMuscle) > 0 ? '+' : ''}${deltaMuscle} kg)
• Lingkar Pinggang: ${client.lingkar_pinggang_awal_cm} cm ➔ ${client.lingkar_pinggang_terkini_cm} cm (${parseFloat(deltaWaist) > 0 ? '+' : ''}${deltaWaist} cm)

*PERSONAL RECORD (PR) TERBAIK:*
${
  client.prList && client.prList.length > 0
    ? client.prList
        .slice(0, 3)
        .map((pr) => `• ${pr.exerciseName}: ${pr.weightKg} kg x ${pr.reps} reps (Est 1RM: ${pr.est1RM} kg)`)
        .join('\n')
    : '• Belum ada catatan PR'
}

*EVALUASI PELATIH:*
"${client.nutritionCoachNote || 'Disiplin latihan dan recovery sangat baik. Pertahankan progres menuju fase berikutnya!'}"

_Diverifikasi oleh ${coach.name || 'Coach Panji Akbar Syamsi'}, Head Coach PelatihKu PRO._`;
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppSummary();
    navigator.clipboard.writeText(text);
    setCopied(true);
    onNotify('Ringkasan laporan disalin ke clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="progress-report-title"
    >
      <div className="relative w-full max-w-3xl bg-[#0b1220] border border-white/10 rounded-3xl p-5 sm:p-7 space-y-6 text-white shadow-2xl my-auto print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        {/* Header Actions (Hidden in Print) */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 id="progress-report-title" className="text-base sm:text-lg font-bold text-white">
                Sertifikat &amp; Laporan Progres Atletik
              </h2>
              <p className="text-xs text-neutral-400">
                Dokumen resmi perkembangan member fitness center siap cetak dan bagikan
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="min-h-[44px] min-w-[44px] px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-300 flex items-center justify-center gap-1.5 transition active:scale-95"
              title="Salin teks laporan untuk WhatsApp"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin WA'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[44px] min-w-[44px] px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm active:scale-95"
              title="Cetak atau simpan sebagai file PDF"
            >
              <Printer className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>Cetak / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup Modal"
              className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-neutral-400 hover:text-white transition ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div id="printable-progress-report" className="space-y-6 max-h-[72vh] overflow-y-auto pr-1 no-scrollbar print:max-h-none print:overflow-visible">
          {/* Institutional Header Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#111e38] to-[#0c1629] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:bg-white print:border-b-2 print:border-black print:text-black">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight text-white print:text-black">
                  Pelatih<span className="text-emerald-400 print:text-emerald-700">Ku</span> PRO
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 print:border-black print:text-black">
                  Athletic Coaching OS
                </span>
              </div>
              <h3 className="text-xs sm:text-sm font-semibold text-neutral-300 print:text-neutral-700 mt-1">
                Laporan Evaluasi Progres Latihan Personal Training
              </h3>
              <p className="text-[11px] text-neutral-400 print:text-neutral-600">
                Penerbit: PelatihKu PRO Club Senayan &amp; SCBD District 8
              </p>
            </div>

            <div className="text-left sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-white/10 print:border-none">
              <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 print:text-neutral-600 block">
                Head Coach &amp; Verifikator
              </span>
              <span className="text-xs sm:text-sm font-bold text-white print:text-black block">
                {coach.name || 'Coach Panji Akbar Syamsi, S.Or.'}
              </span>
              <span className="text-[10px] text-emerald-400 print:text-emerald-700 block">
                Reg Kemenpora: {coach.kemenporaId || 'KMP-INA-2024-8819'} · PABSI L2
              </span>
            </div>
          </div>

          {/* Member Metadata Bento */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-2xl bg-[#141f36] border border-white/10 print:border-neutral-300 print:bg-neutral-50">
              <span className="text-[10px] uppercase text-neutral-400 block font-mono">Nama Member</span>
              <span className="text-sm font-bold text-white print:text-black block truncate">
                {client.nama_lengkap}
              </span>
              <span className="text-[11px] font-mono text-emerald-400 print:text-emerald-700 block">
                {client.code}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#141f36] border border-white/10 print:border-neutral-300 print:bg-neutral-50">
              <span className="text-[10px] uppercase text-neutral-400 block font-mono">Target Latihan</span>
              <span className="text-sm font-bold text-white print:text-black block truncate">
                {client.target_utama}
              </span>
              <span className="text-[11px] text-neutral-400 print:text-neutral-600 block">
                Kategori: {client.target_category}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#141f36] border border-white/10 print:border-neutral-300 print:bg-neutral-50">
              <span className="text-[10px] uppercase text-neutral-400 block font-mono">Realisasi Sesi PT</span>
              <span className="text-sm font-bold text-white print:text-black block">
                {client.paketTerpakai} / {client.paketTotal} Sesi
              </span>
              <span className="text-[11px] font-mono text-emerald-400 print:text-emerald-700 block">
                {Math.round((client.paketTerpakai / client.paketTotal) * 100)}% Kuota Selesai
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-[#141f36] border border-white/10 print:border-neutral-300 print:bg-neutral-50">
              <span className="text-[10px] uppercase text-neutral-400 block font-mono">Kepatuhan Diet</span>
              <span className="text-sm font-bold text-white print:text-black block">
                {client.dietCompliancePct || 92}%
              </span>
              <span className="text-[11px] text-neutral-400 print:text-neutral-600 block">
                {todayFormatted}
              </span>
            </div>
          </div>

          {/* Antropometri & Komposisi Tubuh Comparison Table */}
          <div className="rounded-2xl bg-[#141f36] border border-white/10 p-4 space-y-3 print:border-neutral-300 print:bg-neutral-50">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 print:text-black flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Rekapitulasi Komposisi Tubuh &amp; Antropometri</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-white/10 print:border-neutral-300 text-neutral-400 print:text-neutral-600 text-[11px]">
                    <th className="pb-2">Parameter</th>
                    <th className="pb-2">Baseline Awal</th>
                    <th className="pb-2">Pengukuran Terkini</th>
                    <th className="pb-2">Perubahan (Delta)</th>
                    <th className="pb-2 text-right">Target Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 print:divide-neutral-200 text-white print:text-black">
                  <tr>
                    <td className="py-2.5 font-sans font-medium">Berat Badan (kg)</td>
                    <td className="py-2.5 text-neutral-300 print:text-neutral-700">{client.berat_awal_kg} kg</td>
                    <td className="py-2.5 font-bold text-emerald-400 print:text-emerald-700">{client.berat_terkini_kg} kg</td>
                    <td className="py-2.5 font-bold">
                      {parseFloat(deltaWeight) < 0 ? (
                        <span className="text-emerald-400 print:text-emerald-700">{deltaWeight} kg</span>
                      ) : (
                        <span className="text-amber-400 print:text-amber-700">+{deltaWeight} kg</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-neutral-400 print:text-neutral-600">{client.berat_target_kg} kg</td>
                  </tr>

                  <tr>
                    <td className="py-2.5 font-sans font-medium">Body Fat (%)</td>
                    <td className="py-2.5 text-neutral-300 print:text-neutral-700">{client.body_fat_awal_pct}%</td>
                    <td className="py-2.5 font-bold text-emerald-400 print:text-emerald-700">{client.body_fat_terkini_pct}%</td>
                    <td className="py-2.5 font-bold">
                      {parseFloat(deltaBf) < 0 ? (
                        <span className="text-emerald-400 print:text-emerald-700">{deltaBf}%</span>
                      ) : (
                        <span className="text-neutral-300 print:text-neutral-700">+{deltaBf}%</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-neutral-400 print:text-neutral-600">~15.0%</td>
                  </tr>

                  <tr>
                    <td className="py-2.5 font-sans font-medium">Massa Otot (kg)</td>
                    <td className="py-2.5 text-neutral-300 print:text-neutral-700">{client.massa_otot_awal_kg} kg</td>
                    <td className="py-2.5 font-bold text-emerald-400 print:text-emerald-700">{client.massa_otot_terkini_kg} kg</td>
                    <td className="py-2.5 font-bold">
                      {parseFloat(deltaMuscle) > 0 ? (
                        <span className="text-emerald-400 print:text-emerald-700">+{deltaMuscle} kg</span>
                      ) : (
                        <span className="text-neutral-300 print:text-neutral-700">{deltaMuscle} kg</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-neutral-400 print:text-neutral-600">Surplus</td>
                  </tr>

                  <tr>
                    <td className="py-2.5 font-sans font-medium">Lingkar Pinggang (cm)</td>
                    <td className="py-2.5 text-neutral-300 print:text-neutral-700">{client.lingkar_pinggang_awal_cm} cm</td>
                    <td className="py-2.5 font-bold text-emerald-400 print:text-emerald-700">{client.lingkar_pinggang_terkini_cm} cm</td>
                    <td className="py-2.5 font-bold">
                      {parseFloat(deltaWaist) < 0 ? (
                        <span className="text-emerald-400 print:text-emerald-700">{deltaWaist} cm</span>
                      ) : (
                        <span className="text-neutral-300 print:text-neutral-700">+{deltaWaist} cm</span>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-neutral-400 print:text-neutral-600">&lt; 82 cm</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Personal Record & 1RM Table */}
          <div className="rounded-2xl bg-[#141f36] border border-white/10 p-4 space-y-3 print:border-neutral-300 print:bg-neutral-50">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-300 print:text-black flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-emerald-400" />
              <span>Papan Personal Record (PR) &amp; Estimasi 1RM (Epley Formula)</span>
            </h4>

            {client.prList && client.prList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {client.prList.map((pr) => (
                  <div
                    key={pr.id}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/10 print:border-neutral-300 print:bg-white text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white print:text-black truncate">{pr.exerciseName}</span>
                      <span className="text-[10px] font-mono text-emerald-400 print:text-emerald-700">+{pr.deltaKg} kg</span>
                    </div>
                    <div className="flex items-center justify-between text-neutral-300 print:text-neutral-700 font-mono text-[11px]">
                      <span>Beban: {pr.weightKg} kg × {pr.reps} reps</span>
                    </div>
                    <div className="pt-1 border-t border-white/5 print:border-neutral-200 flex items-center justify-between font-mono text-[10px]">
                      <span className="text-neutral-400 print:text-neutral-600">Estimasi 1RM</span>
                      <span className="text-emerald-400 print:text-emerald-700 font-bold">{pr.est1RM} kg</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 print:text-neutral-600 italic">
                Belum ada rekor beban maksimal yang tercatat pada sesi gym floor.
              </p>
            )}
          </div>

          {/* Coach Assessment & Verification Stamp */}
          <div className="p-4 rounded-2xl bg-[#141f36] border border-white/10 space-y-2 print:border-neutral-300 print:bg-neutral-50">
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-400 print:text-neutral-600 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Evaluasi &amp; Catatan Khusus Pelatih (Head Coach Panji Akbar Syamsi)</span>
            </span>
            <p className="text-xs text-neutral-200 print:text-neutral-800 leading-relaxed italic">
              "{client.nutritionCoachNote || 'Kepatuhan latihan dan disiplin nutrisi menunjukkan hasil yang sangat konsisten. Progres kekuatan compound movement meningkat teratur tanpa keluhan nyeri sendi. Lanjutkan ke fase intensifikasi beban.'}"
            </p>

            <div className="pt-3 border-t border-white/10 print:border-neutral-300 flex items-center justify-between text-[11px] text-neutral-400 print:text-neutral-600">
              <span>Sertifikasi: NSCA CSCS &amp; PB PABSI Level 2</span>
              <span className="font-mono">Verifikasi Sistem: OK-PLT-{client.code.replace('#', '')}</span>
            </div>
          </div>
        </div>

        {/* Footer info (Hidden in Print) */}
        <div className="border-t border-white/10 pt-3 flex items-center justify-between text-xs text-neutral-400 print:hidden">
          <span>Format A4 siap unduh via menu cetak browser (Save as PDF).</span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 font-semibold"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
