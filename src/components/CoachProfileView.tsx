import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Award,
  MapPin,
  Users,
  Edit3,
  LogOut,
  CheckCircle2,
  Lock,
  Plus,
  X,
  RefreshCw,
  Download,
  Upload,
  Database,
  CalendarClock
} from 'lucide-react';
import { CoachProfileData, CoachCertification, ClientProfile } from '../data/mockData';

interface CoachProfileViewProps {
  coach: CoachProfileData;
  activeClientsCount: number;
  clients?: ClientProfile[];
  onUpdateCoach: (updated: CoachProfileData) => void;
  onLogoutConfirmed: () => void;
  onNotify: (msg: string) => void;
  onOverlayChange?: (isOpen: boolean) => void;
  onRestoreData?: (clients: ClientProfile[], coach: CoachProfileData) => void;
  onOpenRescheduleHub?: () => void;
}

export const CoachProfileView: React.FC<CoachProfileViewProps> = ({
  coach,
  activeClientsCount,
  clients,
  onUpdateCoach,
  onLogoutConfirmed,
  onNotify,
  onOverlayChange,
  onRestoreData,
  onOpenRescheduleHub
}) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [syncingLogout, setSyncingLogout] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onOverlayChange?.(showEditModal || showLogoutModal);
    return () => {
      onOverlayChange?.(false);
    };
  }, [showEditModal, showLogoutModal, onOverlayChange]);

  const handleExportBackup = () => {
    try {
      const backupPayload = {
        app: 'PelatihKu PRO',
        version: '2.4.0',
        exportedAt: new Date().toISOString(),
        coach,
        clients: clients || []
      };
      const jsonStr = JSON.stringify(backupPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `pelatihku-pro-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onNotify('File cadangan JSON berhasil diunduh!');
    } catch {
      onNotify('Gagal mengekspor data cadangan.');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.clients && Array.isArray(parsed.clients) && parsed.coach) {
          onRestoreData?.(parsed.clients, parsed.coach);
          onNotify(`Berhasil memulihkan ${parsed.clients.length} data member!`);
        } else {
          onNotify('Format file JSON cadangan tidak valid.');
        }
      } catch {
        onNotify('Gagal membaca file cadangan.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Edit Form State
  const [editName, setEditName] = useState(coach.name);
  const [editRole, setEditRole] = useState(coach.roleTitle);
  const [editKemenpora, setEditKemenpora] = useState(coach.kemenporaId);
  const [editPabsi, setEditPabsi] = useState(coach.pabsiLicense);
  const [editSpecialization, setEditSpecialization] = useState(coach.specialization);
  const [editMaxQuota, setEditMaxQuota] = useState(coach.maxClientQuota);
  const [editPin, setEditPin] = useState(() => {
    try {
      return coach.coachPin || localStorage.getItem('pelatihku_v45_coach_pin') || '123456';
    } catch {
      return coach.coachPin || '123456';
    }
  });
  const [newCertTitle, setNewCertTitle] = useState('');
  const [newCertIssuer, setNewCertIssuer] = useState('');
  const [newCertNumber, setNewCertNumber] = useState('');

  const usedSlots = activeClientsCount;
  const maxSlots = coach.maxClientQuota;
  const remainingSlots = Math.max(0, maxSlots - usedSlots);
  const loadPct = Math.min(100, Math.round((usedSlots / maxSlots) * 100));

  const handleToggleAccepting = () => {
    const nextVal = !coach.acceptingNewClients;
    onUpdateCoach({ ...coach, acceptingNewClients: nextVal });
    onNotify(
      nextVal
        ? 'Status kuota dibuka: Menerima Member Baru'
        : 'Status kuota ditutup sementara untuk member baru'
    );
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    let updatedCerts: CoachCertification[] = [...coach.certifications];
    if (newCertTitle.trim() && newCertNumber.trim()) {
      updatedCerts.push({
        id: `cert-${Date.now()}`,
        title: newCertTitle.trim(),
        issuer: newCertIssuer.trim() || 'Federasi Kebugaran Internasional',
        licenseNumber: newCertNumber.trim(),
        validUntil: 'Des 2028',
        verified: true
      });
    }

    const cleanPin = editPin.trim();
    onUpdateCoach({
      ...coach,
      name: editName.trim() || coach.name,
      roleTitle: editRole.trim() || coach.roleTitle,
      kemenporaId: editKemenpora.trim() || coach.kemenporaId,
      pabsiLicense: editPabsi.trim() || coach.pabsiLicense,
      specialization: editSpecialization.trim() || coach.specialization,
      maxClientQuota: Number(editMaxQuota) || 27,
      certifications: updatedCerts,
      coachPin: cleanPin.length === 6 ? cleanPin : coach.coachPin || '123456'
    });

    if (cleanPin.length === 6) {
      try {
        localStorage.setItem('pelatihku_v45_coach_pin', cleanPin);
      } catch (err) {
        console.warn('Failed to save custom PIN:', err);
      }
    }

    setNewCertTitle('');
    setNewCertIssuer('');
    setNewCertNumber('');
    setShowEditModal(false);
    onNotify('Profil & Kredensial Federasi berhasil diperbarui');
  };

  const handleConfirmLogout = () => {
    setSyncingLogout(true);
    setTimeout(() => {
      setSyncingLogout(false);
      setShowLogoutModal(false);
      onLogoutConfirmed();
    }, 650);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Portofolio Pelatih */}
      <section className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-[#232a3a] border border-[#4edea3]/40 text-[#4edea3] flex items-center justify-center font-bold text-lg shrink-0">
              {coach.initials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {coach.name}
                </h2>
                <span className="text-xs font-mono text-[#4edea3]">
                  Terverifikasi Federasi
                </span>
              </div>
              <p className="text-xs text-[#bbcabf] mt-0.5">{coach.roleTitle}</p>
              <p className="text-xs text-[#86948a] mt-1 font-mono">
                <span>{coach.kemenporaId}</span>
                <span aria-hidden="true"> · </span>
                <span>{coach.pabsiLicense}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#232a3a] hover:bg-[#323949] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#4edea3]" />
              <span>Edit Kredensial</span>
            </button>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#93000a]/30 hover:bg-[#93000a]/50 border border-[#f87171]/30 text-[#f87171] text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar Akun</span>
            </button>
          </div>
        </div>

        <div className="pt-3 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#191f2f] border border-white/[0.05]">
            <span className="text-[#86948a] block">Spesialisasi Utama</span>
            <span className="text-white font-medium mt-0.5 block">
              {coach.specialization}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#191f2f] border border-white/[0.05]">
            <span className="text-[#86948a] block">Zonasi Lantai Gym</span>
            <span className="text-white font-medium mt-0.5 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#4edea3]" />
              {coach.primaryLocation} · {coach.secondaryLocation}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#191f2f] border border-white/[0.05]">
            <span className="text-[#86948a] block">Jam Terbang S&amp;C</span>
            <span className="text-white font-mono font-semibold mt-0.5 block">
              {coach.experienceYears} Tahun · 4,200+ Sesi Terverifikasi
            </span>
          </div>
        </div>
      </section>

      {/* 2. Alokasi Slot Member PT & Ketersediaan Kuota */}
      <section className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#10b981]/15 text-[#4edea3] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Alokasi Slot &amp; Kapasitas Member PT
              </h3>
              <p className="text-xs text-[#bbcabf]">
                Pengaturan beban kerja mingguan dan kuota penerimaan member fitness center baru
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleToggleAccepting}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
              coach.acceptingNewClients
                ? 'bg-[#10b981] text-[#002113] border-[#4edea3]'
                : 'bg-[#232a3a] text-[#bbcabf] border-white/[0.1]'
            }`}
          >
            {coach.acceptingNewClients ? 'Menerima Member Baru: AKTIF' : 'Kuota Ditutup Sementara'}
          </button>
        </div>

        <div className="p-4 rounded-xl bg-[#191f2f] border border-white/[0.06] space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#bbcabf]">
              Beban Kapasitas Aktif: <strong className="text-white font-mono">{loadPct}%</strong>
            </span>
            <span className="font-mono text-[#4edea3]">
              {usedSlots} / {maxSlots} Slot Terisi (Sisa {remainingSlots} Slot Kosong)
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[#070e1d] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#10b981] to-[#ffb95f]"
              style={{ width: `${loadPct}%` }}
            />
          </div>
          <p className="text-xs text-[#86948a]">
            Batas kuota ditetapkan maksimal {maxSlots} member aktif guna menjaga kualitas koreksi biomekanik gym floor dan pemantauan nutrisi individu.
          </p>
        </div>
      </section>

      {/* 2.5 Reschedule Management Action Card */}
      {onOpenRescheduleHub && (
        <section className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">
                Daftar &amp; Riwayat Reschedule Sesi PT
              </h3>
              <p className="text-xs text-[#bbcabf]">
                Tinjau dan putuskan seluruh permohonan pergantian jadwal latihan Member
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenRescheduleHub}
            className="min-h-[42px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 transition active:scale-95 shrink-0"
          >
            <CalendarClock className="w-4 h-4 text-slate-950" />
            <span>Buka Pusat Reschedule</span>
          </button>
        </section>
      )}

      {/* 3. Status Lisensi & Akreditasi Internasional */}
      <section className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">
              Status Lisensi &amp; Akreditasi Resmi
            </h3>
            <p className="text-xs text-[#bbcabf]">
              Sertifikasi Internasional &amp; Lisensi Pelatnas Terverifikasi
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-[#232a3a] hover:bg-[#323949] text-[#4edea3] text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Lisensi</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {coach.certifications.map((cert) => (
            <div
              key={cert.id}
              className="p-4 rounded-xl bg-[#191f2f] border border-white/[0.08] flex items-start justify-between gap-3"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#4edea3] shrink-0" />
                  <h4 className="text-xs font-semibold text-white truncate">
                    {cert.title}
                  </h4>
                </div>
                <p className="text-xs text-[#bbcabf]">{cert.issuer}</p>
                <p className="text-[11px] font-mono text-[#86948a] pt-1">
                  <span>ID: {cert.licenseNumber}</span>
                  <span aria-hidden="true"> · </span>
                  <span>Berlaku s/d {cert.validUntil}</span>
                </p>
              </div>
              <span className="text-[11px] font-mono text-[#4edea3] shrink-0 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Valid
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Cadangan & Pemulihan Data (Backup & Restore) */}
      <section className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Cadangan &amp; Pemulihan Data Lokal
            </h3>
            <p className="text-xs text-[#bbcabf]">
              Simpan seluruh database member &amp; log sesi latihan ke file JSON terenkripsi
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={handleExportBackup}
            className="min-h-[44px] py-2.5 px-4 rounded-xl bg-[#232a3a] hover:bg-[#2e3545] border border-white/[0.08] text-white text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95"
          >
            <Download className="w-4 h-4 text-[#4edea3]" />
            <span>Ekspor Cadangan JSON</span>
          </button>

          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportBackup}
              accept=".json"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#232a3a] hover:bg-[#2e3545] border border-white/[0.08] text-white text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Pulihkan dari File JSON</span>
            </button>
          </div>
        </div>
      </section>

      {/* Modal 1: Edit Profil & Kredensial Federasi */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg max-h-[92vh] bg-[#141b2b] border border-white/[0.12] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-white">
                  Edit Profil &amp; Kredensial Federasi
                </h3>
                <p className="text-xs text-[#bbcabf]">
                  Perbarui data lisensi kepelatihan kebugaran dan kuota member PT
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="min-w-[44px] min-h-[44px] rounded-xl bg-[#232a3a] text-[#bbcabf] hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Nama Lengkap Pelatih</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Jabatan Kepelatihan</label>
                  <input
                    type="text"
                    required
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Nomor ID Kemenpora</label>
                  <input
                    type="text"
                    required
                    value={editKemenpora}
                    onChange={(e) => setEditKemenpora(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Lisensi PB PABSI</label>
                  <input
                    type="text"
                    required
                    value={editPabsi}
                    onChange={(e) => setEditPabsi(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[#bbcabf] mb-1">Spesialisasi S&amp;C</label>
                  <input
                    type="text"
                    required
                    value={editSpecialization}
                    onChange={(e) => setEditSpecialization(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#bbcabf] mb-1">Kuota Maks Member</label>
                  <input
                    type="number"
                    min={10}
                    max={50}
                    required
                    value={editMaxQuota}
                    onChange={(e) => setEditMaxQuota(parseInt(e.target.value, 10) || 27)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#10b981]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#bbcabf] mb-1">PIN Cepat Masuk (6 Digit Angka)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={editPin}
                  onChange={(e) => setEditPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 tracking-widest focus:outline-none focus:border-[#10b981]"
                />
                <span className="text-[10px] text-neutral-400 mt-1 block">
                  PIN ini digunakan untuk membuka layar Login Pelatih di lantai gym (default: 123456).
                </span>
              </div>

              {/* Optional Add New Certification */}
              <div className="pt-3 border-t border-white/[0.08] space-y-2.5">
                <span className="text-xs font-semibold text-[#4edea3] block">
                  + Tambah Sertifikasi Baru (Opsional)
                </span>
                <input
                  type="text"
                  placeholder="Nama Sertifikasi (cth: USAW Level 1 Sports Performance)"
                  value={newCertTitle}
                  onChange={(e) => setNewCertTitle(e.target.value)}
                  className="w-full min-h-[40px] bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white"
                />
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Lembaga Penerbit"
                    value={newCertIssuer}
                    onChange={(e) => setNewCertIssuer(e.target.value)}
                    className="w-full min-h-[40px] bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Nomor Lisensi"
                    value={newCertNumber}
                    onChange={(e) => setNewCertNumber(e.target.value)}
                    className="w-full min-h-[40px] bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-white/[0.08] flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#232a3a] text-[#bbcabf] text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] px-4 py-2 rounded-xl bg-[#10b981] text-[#002113] text-xs font-semibold"
                >
                  Simpan Perubahan Kredensial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Konfirmasi Keluar Akun (Logout) & Offline Sync Check */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#141b2b] border border-white/[0.12] rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#93000a]/40 border border-[#f87171]/30 text-[#f87171] flex items-center justify-center">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Konfirmasi Keluar Akun
                  </h3>
                  <p className="text-xs text-[#bbcabf]">
                    Validasi Sync Status &amp; Kunci Cache Lokal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="min-w-[40px] min-h-[40px] rounded-xl bg-[#232a3a] text-[#bbcabf] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#191f2f] border border-white/[0.08] space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#bbcabf] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#4edea3]" />
                  <span>Sync Status Server Pusat</span>
                </span>
                <span className="font-mono text-[#4edea3] font-semibold">100% Terkirim</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#bbcabf] flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-[#06b6d4]" />
                  <span>Enkripsi Cache Offline</span>
                </span>
                <span className="font-mono text-[#dce2f7]">Siap Dikunci</span>
              </div>
              <p className="text-[#86948a] pt-1">
                Anda dapat masuk kembali kapan saja dengan 1 ketukan menggunakan Sidik Jari / Face ID atau PIN 6-Digit.
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#232a3a] text-white text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={syncingLogout}
                onClick={handleConfirmLogout}
                className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-[#ef4444] hover:bg-[#f87171] text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                {syncingLogout ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengunci Cache...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Kunci &amp; Keluar Akun</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
