import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Plus,
  Dumbbell,
  CalendarClock,
  User,
  MessageCircle,
  CheckCircle2,
  AlertCircle,
  Filter,
  Search,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Sparkles
} from 'lucide-react';
import { ClientProfile, RescheduleRequest, INITIAL_COACH_PROFILE } from '../data/mockData';
import { UserRole, isCoachOrAdmin } from '../services/authGatekeeperService';
import { RescheduleApprovalBanner } from './RescheduleApprovalBanner';

export interface ScheduledSessionItem {
  id: string;
  clientId: string;
  clientName: string;
  clientCode: string;
  clientInitials: string;
  clientAvatarBg?: string;
  clientGender: 'Pria' | 'Wanita';
  clientPhone: string;
  date: string; // YYYY-MM-DD
  dayName: string; // Sen, Sel, Rab, Kam, Jum, Sab, Min
  time: string; // HH:MM
  durationMinutes: number;
  location: 'Gym Utama Senayan' | 'SCBD District 8' | 'Private Studio Kemang';
  focus: string;
  sessionNumber: number;
  totalPackage: number;
  status: 'Selesai' | 'Terkonfirmasi' | 'Menunggu';
  coachNotes?: string;
  pendingReschedule?: RescheduleRequest;
}

interface SessionsCalendarViewProps {
  clients: ClientProfile[];
  currentUserRole?: UserRole;
  currentClientId?: string;
  onBackToDashboard: () => void;
  onSelectClient: (clientId: string) => void;
  onOpenLogSession: (clientId: string) => void;
  onOpenReschedule: (clientId: string) => void;
  onScheduleNewSession: (newSession: {
    clientId: string;
    date: string;
    time: string;
    location: 'Gym Utama Senayan' | 'SCBD District 8' | 'Private Studio Kemang';
    focus: string;
  }) => void;
  onNotify: (msg: string) => void;
  onOverlayChange?: (isOpen: boolean) => void;
  onApproveReschedule?: (request: RescheduleRequest, note?: string) => void;
  onRejectReschedule?: (request: RescheduleRequest, reason: string) => void;
  onCancelReschedule?: (request: RescheduleRequest) => void;
  onOpenReviewReschedule?: (request: RescheduleRequest) => void;
  onOpenRescheduleHub?: () => void;
}

export type CalendarViewMode = 'day' | 'week' | 'month';

const INDO_DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const INDO_DAYS_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

const MONTH_MAP: Record<string, number> = {
  jan: 1, januari: 1,
  feb: 2, februari: 2,
  mar: 3, maret: 3,
  apr: 4, april: 4,
  mei: 5, may: 5,
  jun: 6, juni: 6,
  jul: 7, juli: 7,
  agu: 8, agt: 8, agustus: 8, aug: 8,
  sep: 9, september: 9,
  okt: 10, oktober: 10, oct: 10,
  nov: 11, november: 11,
  des: 12, desember: 12, dec: 12
};

export function normalizeDateToKey(dateStr?: string): string {
  if (!dateStr) return '2026-11-05';
  const trimmed = dateStr.trim();
  // Check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  // Check DD MMM YYYY (e.g., "04 Nov 2026", "4 Nov 2026")
  const match = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (match) {
    const day = parseInt(match[1], 10);
    const mStr = match[2].toLowerCase();
    const month = MONTH_MAP[mStr] || 11;
    const year = parseInt(match[3], 10);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  return '2026-11-05';
}

export function getDayNameFromDateKey(dateKey: string): string {
  const parts = dateKey.split('-').map(Number);
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return INDO_DAYS[d.getDay()];
  }
  return 'Kam';
}

export const SessionsCalendarView: React.FC<SessionsCalendarViewProps> = ({
  clients,
  currentUserRole = 'coach',
  currentClientId = 'k-01',
  onBackToDashboard,
  onSelectClient,
  onOpenLogSession,
  onOpenReschedule,
  onScheduleNewSession,
  onNotify,
  onOverlayChange,
  onApproveReschedule,
  onRejectReschedule,
  onCancelReschedule,
  onOpenReviewReschedule,
  onOpenRescheduleHub
}) => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    return new Date(2026, 10, 2); // Monday, 2 Nov 2026
  });
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    return new Date(2026, 10, 1); // Nov 2026
  });
  const [selectedDayKey, setSelectedDayKey] = useState<string>('all');
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(3); // default index 3 (Kamis / today)
  const [selectedMonthDate, setSelectedMonthDate] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<string>('Semua');
  const [locationFilter, setLocationFilter] = useState<string>('Semua');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showQuickScheduleModal, setShowQuickScheduleModal] = useState<boolean>(false);

  // Active member profile for client view
  const activeClientProfile = useMemo(
    () => clients.find((c) => c.id === currentClientId) || clients[0],
    [clients, currentClientId]
  );
  const activeClientsCount = useMemo(
    () => clients.filter((c) => c.status === 'Aktif').length,
    [clients]
  );

  // Dynamic 7-day week schedule list
  const weekDaysList = useMemo(() => {
    const todayKey = '2026-11-05';
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(currentWeekStart.getDate() + i);
      const dayKey = formatDateKey(d);
      const dayOfWeek = d.getDay();
      const label = INDO_DAYS[dayOfWeek];
      const dateNum = String(d.getDate()).padStart(2, '0');
      const fullDate = `${INDO_DAYS_FULL[dayOfWeek]}, ${d.getDate()} ${INDO_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      const isToday = dayKey === todayKey;
      days.push({ dayKey, label, dateNum, fullDate, isToday, rawDate: d });
    }
    return days;
  }, [currentWeekStart]);

  const handlePrevWeek = () => {
    setCurrentWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 7);
      return next;
    });
  };

  const handleNextWeek = () => {
    setCurrentWeekStart((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 7);
      return next;
    });
  };

  const handleToday = () => {
    const today = new Date(2026, 10, 5);
    setCurrentWeekStart(getMondayOfWeek(today));
    setCurrentMonthDate(new Date(2026, 10, 1));
    setCurrentDayIndex(3);
    setSelectedDayKey('all');
    setSelectedMonthDate(null);
  };

  const handlePrevDay = () => {
    if (currentDayIndex > 0) {
      setCurrentDayIndex((prev) => prev - 1);
    } else {
      handlePrevWeek();
      setCurrentDayIndex(6);
    }
  };

  const handleNextDay = () => {
    if (currentDayIndex < 6) {
      setCurrentDayIndex((prev) => prev + 1);
    } else {
      handleNextWeek();
      setCurrentDayIndex(0);
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const weekLabelText = useMemo(() => {
    const start = weekDaysList[0];
    const end = weekDaysList[6];
    if (!start || !end) return 'Jadwal Mingguan';
    return `${start.dateNum} ${INDO_MONTHS[start.rawDate.getMonth()]} – ${end.dateNum} ${INDO_MONTHS[end.rawDate.getMonth()]} ${end.rawDate.getFullYear()}`;
  }, [weekDaysList]);

  useEffect(() => {
    onOverlayChange?.(showQuickScheduleModal);
    return () => {
      onOverlayChange?.(false);
    };
  }, [showQuickScheduleModal, onOverlayChange]);

  // Quick schedule modal form state
  const [formClientId, setFormClientId] = useState<string>(clients[0]?.id || '');
  const [formDate, setFormDate] = useState<string>('2026-11-06');
  const [formTime, setFormTime] = useState<string>('16:30');
  const [formLocation, setFormLocation] = useState<
    'Gym Utama Senayan' | 'SCBD District 8' | 'Private Studio Kemang'
  >('Gym Utama Senayan');
  const [formFocus, setFormFocus] = useState<string>('Upper Body Hypertrophy & Arms');

  // Keep formClientId synced when clients change/load
  useEffect(() => {
    if (!formClientId && clients.length > 0) {
      setFormClientId(clients[0].id);
    }
  }, [clients, formClientId]);

  // Generate authentic, non-misleading sessions based on real client schedule records
  const allWeeklySessions = useMemo<ScheduledSessionItem[]>(() => {
    const list: ScheduledSessionItem[] = [];
    const seenSessionKeys = new Set<string>();

    clients.forEach((c) => {
      // A. Planned / Scheduled Slots directly attached to Member
      if (c.scheduledSessions && c.scheduledSessions.length > 0) {
        c.scheduledSessions.forEach((slot) => {
          const dateKey = normalizeDateToKey(slot.date);
          const dayName = getDayNameFromDateKey(dateKey);
          const key = `${c.id}-${dateKey}-${slot.time}`;
          seenSessionKeys.add(key);

          list.push({
            id: slot.id,
            clientId: c.id,
            clientName: c.nama_lengkap,
            clientCode: c.code,
            clientInitials: c.initials,
            clientAvatarBg: c.avatarBg,
            clientGender: c.gender,
            clientPhone: c.telepon,
            date: dateKey,
            dayName,
            time: slot.time,
            durationMinutes: slot.durationMinutes || 75,
            location: slot.location,
            focus: slot.focus,
            sessionNumber: slot.sessionNumber,
            totalPackage: c.paketTotal,
            status: slot.status,
            coachNotes: slot.coachNotes,
            pendingReschedule: c.pendingReschedule
          });
        });
      }

      // B. Upcoming nextSession (if not already recorded in scheduledSessions)
      if (c.nextSession && c.nextSession.date) {
        const dateKey = normalizeDateToKey(c.nextSession.date);
        const timeKey = c.nextSession.time || '16:30';
        const key = `${c.id}-${dateKey}-${timeKey}`;
        if (!seenSessionKeys.has(key)) {
          seenSessionKeys.add(key);
          const dayName = getDayNameFromDateKey(dateKey);
          list.push({
            id: `next-${c.id}-${dateKey}`,
            clientId: c.id,
            clientName: c.nama_lengkap,
            clientCode: c.code,
            clientInitials: c.initials,
            clientAvatarBg: c.avatarBg,
            clientGender: c.gender,
            clientPhone: c.telepon,
            date: dateKey,
            dayName,
            time: timeKey,
            durationMinutes: 75,
            location: c.nextSession.location || 'Gym Utama Senayan',
            focus: c.nextSession.focus || 'Latihan Terjadwal',
            sessionNumber: Math.min(c.paketTotal, c.paketTerpakai + 1),
            totalPackage: c.paketTotal,
            status: 'Terkonfirmasi',
            coachNotes: c.nextSession.rescheduleReason,
            pendingReschedule: c.pendingReschedule
          });
        }
      }

      // C. Completed / Logged Past Sessions from c.sessions
      c.sessions?.forEach((s) => {
        const dateKey = normalizeDateToKey(s.date);
        const rawTime = (s.time || '14:00').replace(/wib/i, '').trim();
        const key = `${c.id}-${dateKey}-${rawTime}`;
        if (!seenSessionKeys.has(key)) {
          seenSessionKeys.add(key);
          const dayName = getDayNameFromDateKey(dateKey);
          list.push({
            id: `past-${c.id}-${s.id}`,
            clientId: c.id,
            clientName: c.nama_lengkap,
            clientCode: c.code,
            clientInitials: c.initials,
            clientAvatarBg: c.avatarBg,
            clientGender: c.gender,
            clientPhone: c.telepon,
            date: dateKey,
            dayName,
            time: rawTime,
            durationMinutes: s.durationMinutes || 75,
            location: (s.location as any) || 'Gym Utama Senayan',
            focus: s.focus,
            sessionNumber: s.sessionNumber,
            totalPackage: c.paketTotal,
            status: 'Selesai',
            coachNotes: s.coachNotes
          });
        }
      });
    });

    // Scoped filtering based on RBAC:
    // 1. Client: ONLY see the schedule that plotted under his name
    // 2. Coach & Admin: can see all plotted schedules from his clients
    const scopedList =
      currentUserRole === 'client'
        ? list.filter((s) => s.clientId === currentClientId)
        : list;

    // Sort chronologically by date then time
    return scopedList.sort((a, b) => {
      const dComp = a.date.localeCompare(b.date);
      if (dComp !== 0) return dComp;
      return a.time.localeCompare(b.time);
    });
  }, [clients, currentUserRole, currentClientId]);

  // Daily counts for day pill indicators
  const dayCounts = useMemo(() => {
    const counts: Record<string, { total: number; completed: number; upcoming: number }> = {};
    weekDaysList.forEach((w) => {
      counts[w.dayKey] = { total: 0, completed: 0, upcoming: 0 };
    });
    allWeeklySessions.forEach((s) => {
      if (!counts[s.date]) {
        counts[s.date] = { total: 0, completed: 0, upcoming: 0 };
      }
      counts[s.date].total += 1;
      if (s.status === 'Selesai') counts[s.date].completed += 1;
      else counts[s.date].upcoming += 1;
    });
    return counts;
  }, [allWeeklySessions, weekDaysList]);

  // Dynamic month grid based on currentMonthDate
  const monthGridData = useMemo(() => {
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth();
    const monthTitle = `${INDO_MONTHS[month]} ${year}`;
    const firstDay = new Date(year, month, 1);
    const firstDayIndex = (firstDay.getDay() + 6) % 7; // Monday = 0
    const totalDays = new Date(year, month + 1, 0).getDate();

    const currentWeekStartKey = formatDateKey(currentWeekStart);
    const currentWeekEndObj = new Date(currentWeekStart);
    currentWeekEndObj.setDate(currentWeekEndObj.getDate() + 6);
    const currentWeekEndKey = formatDateKey(currentWeekEndObj);

    const days = [];
    for (let d = 1; d <= totalDays; d++) {
      const dObj = new Date(year, month, d);
      const dateStr = formatDateKey(dObj);
      const isToday = dateStr === '2026-11-05';
      const isCurrentWeek = dateStr >= currentWeekStartKey && dateStr <= currentWeekEndKey;
      const dayData = dayCounts[dateStr] || {
        total: 0,
        completed: 0,
        upcoming: 0
      };
      days.push({
        dateStr,
        dayNum: d,
        isToday,
        isCurrentWeek,
        count: dayData.total,
        completedCount: dayData.completed
      });
    }

    return {
      monthTitle,
      firstDayIndex,
      days,
      totalMonthSessions: days.reduce((sum, d) => sum + d.count, 0)
    };
  }, [currentMonthDate, currentWeekStart, dayCounts]);

  // Overall stats
  const totalCompleted = allWeeklySessions.filter((s) => s.status === 'Selesai').length;
  const totalUpcoming = allWeeklySessions.filter((s) => s.status !== 'Selesai').length;

  // Filtered session list based on active view mode (day, week, month)
  const filteredSessions = useMemo(() => {
    const activeDayKey = weekDaysList[currentDayIndex]?.dayKey || '2026-11-05';

    return allWeeklySessions.filter((s) => {
      let matchDay = true;
      if (viewMode === 'day') {
        matchDay = s.date === activeDayKey;
      } else if (viewMode === 'week') {
        matchDay = selectedDayKey === 'all' ? true : s.date === selectedDayKey;
      } else if (viewMode === 'month') {
        matchDay = selectedMonthDate ? s.date === selectedMonthDate : true;
      }

      const matchLoc = locationFilter === 'Semua' || s.location === locationFilter;
      const matchStatus =
        statusFilter === 'Semua'
          ? true
          : statusFilter === 'Selesai'
          ? s.status === 'Selesai'
          : s.status !== 'Selesai';
      const matchClient =
        !isCoachOrAdmin(currentUserRole) ||
        clientFilter === 'Semua' ||
        s.clientId === clientFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.clientName.toLowerCase().includes(q) ||
        s.focus.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        s.clientCode.toLowerCase().includes(q);

      return matchDay && matchLoc && matchStatus && matchClient && matchSearch;
    });
  }, [
    allWeeklySessions,
    viewMode,
    currentDayIndex,
    weekDaysList,
    selectedDayKey,
    selectedMonthDate,
    locationFilter,
    statusFilter,
    clientFilter,
    currentUserRole,
    searchQuery
  ]);

  const handleQuickScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClientId || !formDate || !formTime || !formFocus) return;

    onScheduleNewSession({
      clientId: formClientId,
      date: formDate,
      time: formTime,
      location: formLocation,
      focus: formFocus
    });

    const chosenClient = clients.find((c) => c.id === formClientId);
    setShowQuickScheduleModal(false);
    onNotify(
      `Sesi latihan baru berhasil dijadwalkan untuk ${chosenClient?.nama_lengkap || 'Member'} pada ${formDate} (${formTime} WIB)!`
    );
  };

  const activeDayObj = weekDaysList[currentDayIndex] || weekDaysList[3];
  const activeDayCountInfo = dayCounts[activeDayObj.dayKey] || { total: 0, completed: 0, upcoming: 0 };

  const activeDaySessions = useMemo(() => {
    return allWeeklySessions.filter((s) => s.date === activeDayObj.dayKey);
  }, [allWeeklySessions, activeDayObj.dayKey]);

  const morningCount = activeDaySessions.filter((s) => s.time < '12:00').length;
  const afternoonCount = activeDaySessions.filter((s) => s.time >= '12:00' && s.time < '16:00').length;
  const eveningCount = activeDaySessions.filter((s) => s.time >= '16:00').length;

  // Pending Reschedule Requests across clients for Coach / Admin
  const pendingReschedulesList = useMemo(() => {
    return clients
      .filter((c) => c.pendingReschedule && c.pendingReschedule.status === 'pending')
      .map((c) => ({
        client: c,
        request: c.pendingReschedule!
      }));
  }, [clients]);

  const weekNumber = useMemo(() => {
    const d = new Date(currentWeekStart);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  }, [currentWeekStart]);

  return (
    <div className="space-y-5">
      {/* 1. Header & Navigation Context Bar */}
      <div className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="w-11 h-11 rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] text-white flex items-center justify-center transition active:scale-95 border border-white/[0.08] shadow-sm"
            aria-label="Kembali ke Dashboard"
          >
            <ArrowLeft className="w-5 h-5 text-[#4edea3]" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                {currentUserRole === 'client' ? 'Jadwal Latihan Saya' : 'Jadwal & Kalender Sesi'}
              </h2>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold">
                Minggu {weekNumber} · {INDO_MONTHS[currentWeekStart.getMonth()]} {currentWeekStart.getFullYear()}
              </span>
            </div>
            <p className="text-xs text-[#bbcabf] mt-0.5">
              {currentUserRole === 'client' ? (
                <span>
                  Jadwal Personal Training Anda bersama Coach Panji ({allWeeklySessions.length} Sesi Terjadwal)
                </span>
              ) : (
                <>
                  <span>{currentUserRole === 'admin' ? 'Floor Operations & PT Quota' : 'Coach Panji Akbar Syamsi'}</span>
                  <span aria-hidden="true"> · </span>
                  <span>Total {allWeeklySessions.length} Sesi ({totalCompleted} Selesai, {totalUpcoming} Mendatang)</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenRescheduleHub && (
            <button
              type="button"
              onClick={onOpenRescheduleHub}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#1e2638] hover:bg-[#283248] text-white border border-white/[0.1] text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
            >
              <CalendarClock className="w-4 h-4 text-amber-400" />
              <span>{currentUserRole === 'client' ? 'Riwayat Reschedule' : 'Daftar Reschedule'}</span>
              {isCoachOrAdmin(currentUserRole) && pendingReschedulesList.length > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-0.5" />
              )}
            </button>
          )}

          {isCoachOrAdmin(currentUserRole) && (
            <button
              type="button"
              onClick={() => setShowQuickScheduleModal(true)}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Jadwalkan Sesi Baru</span>
            </button>
          )}
        </div>
      </div>

      {/* 1.5 Pending Reschedule Approval Matrix Action Center (High Urgency) */}
      {isCoachOrAdmin(currentUserRole) && pendingReschedulesList.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/35 backdrop-blur-xl rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-lg animate-in fade-in">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold text-white">
                    Permintaan Reschedule Menunggu Keputusan Coach
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/25 text-amber-300 border border-amber-500/40 animate-pulse">
                    {pendingReschedulesList.length} Permintaan
                  </span>
                </div>
                <p className="text-[11px] text-[#bbcabf] mt-0.5">
                  Member mengajukan pergeseran slot latihan. Tinjau dan putuskan persetujuan sesuai SOP gym floor.
                </p>
              </div>
            </div>

            {onOpenRescheduleHub && (
              <button
                type="button"
                onClick={onOpenRescheduleHub}
                className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.1] text-xs font-semibold text-white flex items-center gap-1.5 transition active:scale-95 shrink-0"
              >
                <CalendarClock className="w-4 h-4 text-amber-400" />
                <span>Lihat Semua Pengajuan</span>
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {pendingReschedulesList.map(({ client: c, request: req }) => (
              <div
                key={req.id}
                className="bg-[#0b101b]/90 border border-white/[0.08] hover:border-amber-500/40 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-2xl ${c.avatarBg || 'bg-blue-600'} text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5`}>
                    {c.initials || 'MBR'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-white">{req.clientName}</span>
                      <span className="text-[10px] font-mono text-neutral-400">({c.code || c.id})</span>
                      {req.isLateRequest ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          ⚠️ Mepet (&lt;24 Jam)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Standar (Bebas Kuota)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs">
                      <span className="text-neutral-400 line-through">
                        {req.originalDate} · {req.originalTime} WIB
                      </span>
                      <ArrowRight className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="text-emerald-400 font-bold">
                        {req.proposedDate} · {req.proposedTime} WIB ({req.proposedLocation})
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-300 italic mt-1">
                      “{req.reason}”
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => onOpenReviewReschedule && onOpenReviewReschedule(req)}
                    className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition"
                  >
                    <CalendarClock className="w-4 h-4 text-slate-950" />
                    <span>Tinjau &amp; Putuskan</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Stat Performance Highlights Strip */}
      {currentUserRole === 'client' ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl p-3.5">
            <span className="text-[10px] font-medium text-[#86948a] uppercase tracking-wider block">
              Paket Sesi PT
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold font-mono text-white">
                #{activeClientProfile?.paketTerpakai || 0}
              </span>
              <span className="text-xs text-[#bbcabf]">/ {activeClientProfile?.paketTotal || 0} Sesi</span>
            </div>
            <p className="text-[11px] text-[#4edea3] mt-1 font-mono">
              Sisa {Math.max(0, (activeClientProfile?.paketTotal || 0) - (activeClientProfile?.paketTerpakai || 0))} Sesi Aktif
            </p>
          </div>

          <div className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl p-3.5">
            <span className="text-[10px] font-medium text-[#86948a] uppercase tracking-wider block">
              Selesai Minggu Ini
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold font-mono text-[#4edea3]">{totalCompleted}</span>
              <span className="text-xs text-[#bbcabf]">Sesi</span>
            </div>
            <p className="text-[11px] text-emerald-400 mt-1 font-mono">✓ Terverifikasi Log</p>
          </div>

          <div className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl p-3.5">
            <span className="text-[10px] font-medium text-[#86948a] uppercase tracking-wider block">
              Sesi Mendatang
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold font-mono text-[#ffb95f]">{totalUpcoming}</span>
              <span className="text-xs text-[#bbcabf]">Sesi</span>
            </div>
            <p className="text-[11px] text-amber-400 mt-1 font-mono">Siap di Gym Floor</p>
          </div>

          <div className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl p-3.5">
            <span className="text-[10px] font-medium text-[#86948a] uppercase tracking-wider block">
              Kepatuhan Jadwal
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold font-mono text-[#06b6d4]">100%</span>
            </div>
            <p className="text-[11px] text-[#06b6d4] mt-1 font-mono">0 Sesi Terlewat</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl p-3.5">
            <span className="text-[10px] font-medium text-[#86948a] uppercase tracking-wider block">
              Total Sesi Terplot
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold font-mono text-white">{allWeeklySessions.length}</span>
              <span className="text-xs text-[#bbcabf]">Sesi</span>
            </div>
            <p className="text-[11px] text-[#4edea3] mt-1 font-mono">{activeClientsCount} Member Aktif</p>
          </div>

          <div className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl p-3.5">
            <span className="text-[10px] font-medium text-[#86948a] uppercase tracking-wider block">
              Selesai / Terverifikasi
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold font-mono text-[#4edea3]">{totalCompleted}</span>
              <span className="text-xs text-[#bbcabf]">/ {allWeeklySessions.length} Sesi</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.06] mt-1.5 overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all"
                style={{
                  width: `${allWeeklySessions.length > 0 ? Math.round((totalCompleted / allWeeklySessions.length) * 100) : 0}%`
                }}
              />
            </div>
          </div>

          <div className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl p-3.5">
            <span className="text-[10px] font-medium text-[#86948a] uppercase tracking-wider block">
              Sesi Menunggu
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold font-mono text-[#ffb95f]">{totalUpcoming}</span>
              <span className="text-xs text-[#bbcabf]">Sesi</span>
            </div>
            <p className="text-[11px] text-amber-400 mt-1 font-mono">Siap Dieksekusi</p>
          </div>

          <div className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-2xl p-3.5">
            <span className="text-[10px] font-medium text-[#86948a] uppercase tracking-wider block">
              Tingkat Kehadiran
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-xl font-bold font-mono text-[#06b6d4]">
                {allWeeklySessions.length > 0 ? `${Math.round((totalCompleted / allWeeklySessions.length) * 100)}%` : '100%'}
              </span>
            </div>
            <p className="text-[11px] text-[#06b6d4] mt-1 font-mono">0 Sesi Batal</p>
          </div>
        </div>
      )}

      {/* 3. Interactive Calendar Section with Day / Week / Month View Switcher */}
      <section className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-3xl p-4 sm:p-5 space-y-4">
        {/* Top View Selector Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
                {viewMode === 'day'
                  ? 'Tampilan Harian (Day View)'
                  : viewMode === 'week'
                  ? 'Pita Mingguan (Week View)'
                  : 'Kalender Bulanan (Month View)'}
              </h3>
              <p className="text-[11px] text-[#bbcabf]">
                {viewMode === 'day'
                  ? 'Fokus slot per jam & breakdown sesi harian'
                  : viewMode === 'week'
                  ? 'Navigasi cepat 7 hari dengan indikator sesi'
                  : 'Distribusi beban latihan sepanjang bulan'}
              </p>
            </div>
          </div>

          {/* Segmented View Mode Tabs: Day, Week, Month */}
          <div className="flex items-center p-1 bg-[#070e1d]/90 border border-white/[0.08] rounded-2xl w-full sm:w-auto shadow-inner">
            <button
              type="button"
              onClick={() => {
                setViewMode('day');
                setCurrentDayIndex(3); // Kamis 5 Nov (today)
              }}
              className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1.5 ${
                viewMode === 'day'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Hari
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('week');
                setSelectedDayKey('all');
              }}
              className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1.5 ${
                viewMode === 'week'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Minggu
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('month');
                setSelectedMonthDate(null);
              }}
              className={`flex-1 sm:flex-none min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 flex items-center justify-center gap-1.5 ${
                viewMode === 'month'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Bulan
            </button>
          </div>
        </div>

        {/* View Content 1: DAY VIEW */}
        {viewMode === 'day' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 bg-[#070e1d]/90 border border-white/[0.06] rounded-2xl p-2.5 sm:p-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevDay}
                  className="w-11 h-11 rounded-xl bg-[#141b2b] text-neutral-300 hover:text-white hover:bg-[#191f2f] border border-white/[0.08] flex items-center justify-center transition active:scale-95 shadow-sm"
                  aria-label="Hari sebelumnya"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextDay}
                  className="w-11 h-11 rounded-xl bg-[#141b2b] text-neutral-300 hover:text-white hover:bg-[#191f2f] border border-white/[0.08] flex items-center justify-center transition active:scale-95 shadow-sm"
                  aria-label="Hari berikutnya"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div className="pl-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white">
                      {activeDayObj.fullDate}
                    </span>
                    {activeDayObj.isToday && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                        Hari Ini
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#bbcabf]">
                    {activeDayCountInfo.total} Sesi ({activeDayCountInfo.completed} Selesai · {activeDayCountInfo.upcoming} Mendatang)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToday}
                className={`text-xs min-h-[44px] px-3.5 py-2 rounded-xl border font-bold transition active:scale-95 ${
                  activeDayObj.isToday
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                    : 'bg-[#141b2b] text-neutral-300 border-white/[0.08] hover:text-white'
                }`}
              >
                Hari Ini
              </button>
            </div>

            {/* Quick Time Slots Jump Strip for the Day */}
            <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
              <div className="bg-[#141b2b] border border-white/[0.06] rounded-2xl p-2.5">
                <span className="text-[10px] text-neutral-400 uppercase font-medium block">Pagi (07:00 - 11:59)</span>
                <span className="text-xs font-mono font-bold text-white mt-0.5 block">{morningCount} Sesi Latihan</span>
              </div>
              <div className="bg-[#141b2b] border border-white/[0.06] rounded-2xl p-2.5">
                <span className="text-[10px] text-neutral-400 uppercase font-medium block">Siang (12:00 - 15:59)</span>
                <span className="text-xs font-mono font-bold text-[#ffb95f] mt-0.5 block">{afternoonCount} Sesi Latihan</span>
              </div>
              <div className="bg-[#141b2b] border border-white/[0.06] rounded-2xl p-2.5">
                <span className="text-[10px] text-neutral-400 uppercase font-medium block">Sore/Malam (16:00+)</span>
                <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5 block">{eveningCount} Sesi Latihan</span>
              </div>
            </div>
          </div>
        )}

        {/* View Content 2: WEEK VIEW (Original 7-Day Horizontal Selector Bar) */}
        {viewMode === 'week' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#bbcabf] gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevWeek}
                  className="w-11 h-11 rounded-2xl bg-[#070e1d] hover:bg-[#191f2f] text-neutral-300 hover:text-white border border-white/[0.08] flex items-center justify-center transition active:scale-95 shadow-sm"
                  aria-label="Minggu sebelumnya"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextWeek}
                  className="w-11 h-11 rounded-2xl bg-[#070e1d] hover:bg-[#191f2f] text-neutral-300 hover:text-white border border-white/[0.08] flex items-center justify-center transition active:scale-95 shadow-sm"
                  aria-label="Minggu berikutnya"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span className="font-bold text-white ml-1 text-xs sm:text-sm">{weekLabelText}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayKey('all')}
                className={`min-h-[44px] text-xs px-3.5 py-2 rounded-xl font-bold transition active:scale-95 ${
                  selectedDayKey === 'all'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Lihat Semua ({allWeeklySessions.length} Sesi)
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {weekDaysList.map((day) => {
                const isSelected = selectedDayKey === day.dayKey;
                const countInfo = dayCounts[day.dayKey] || { total: 0, completed: 0, upcoming: 0 };
                return (
                  <button
                    key={day.dayKey}
                    type="button"
                    onClick={() => setSelectedDayKey(day.dayKey)}
                    className={`min-h-[72px] flex flex-col items-center justify-between p-2 rounded-2xl text-center transition active:scale-95 border ${
                      isSelected
                        ? 'bg-gradient-to-b from-emerald-500 to-teal-400 text-slate-950 border-emerald-300 font-bold shadow-md shadow-emerald-500/20'
                        : day.isToday
                        ? 'bg-[#191f2f] text-white border-amber-500/50 hover:bg-[#232a3a]'
                        : 'bg-[#070e1d] text-neutral-300 border-white/[0.06] hover:bg-[#191f2f]'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-medium uppercase tracking-wider ${
                        isSelected ? 'text-slate-950 font-bold' : day.isToday ? 'text-amber-400 font-bold' : 'text-neutral-400'
                      }`}
                    >
                      {day.label}
                    </span>

                    <span
                      className={`text-base sm:text-lg font-bold font-mono my-0.5 ${
                        isSelected ? 'text-slate-950' : 'text-white'
                      }`}
                    >
                      {day.dateNum}
                    </span>

                    <div className="flex items-center gap-1 mt-0.5">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                          isSelected
                            ? 'bg-slate-950/20 text-slate-950 font-bold'
                            : countInfo.upcoming > 0
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {countInfo.total}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* View Content 3: MONTH VIEW (Full Dynamic Month Grid) */}
        {viewMode === 'month' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="w-11 h-11 rounded-2xl bg-[#070e1d] hover:bg-[#191f2f] text-neutral-300 hover:text-white border border-white/[0.08] flex items-center justify-center transition active:scale-95 shadow-sm"
                    aria-label="Bulan sebelumnya"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="w-11 h-11 rounded-2xl bg-[#070e1d] hover:bg-[#191f2f] text-neutral-300 hover:text-white border border-white/[0.08] flex items-center justify-center transition active:scale-95 shadow-sm"
                    aria-label="Bulan berikutnya"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <span className="font-bold text-white text-sm">{monthGridData.monthTitle}</span>
                <span className="text-[10px] font-mono text-[#4edea3] bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  {monthGridData.totalMonthSessions} Sesi Bulan Ini
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMonthDate(null)}
                className={`min-h-[44px] text-xs px-3.5 py-2 rounded-xl font-bold transition active:scale-95 ${
                  selectedMonthDate === null
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Semua Sesi Bulan Ini
              </button>
            </div>

            {/* 7 Column Headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-neutral-400 uppercase tracking-wider pb-1">
              <span>Sen</span>
              <span>Sel</span>
              <span>Rab</span>
              <span>Kam</span>
              <span>Jum</span>
              <span>Sab</span>
              <span className="text-amber-400">Min</span>
            </div>

            {/* Dynamic Day Matrix with leading empty slots based on firstDayIndex */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {[...Array(monthGridData.firstDayIndex)].map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[48px] sm:min-h-[54px] rounded-2xl bg-white/[0.01] border border-white/[0.02]" />
              ))}

              {monthGridData.days.map((mDay) => {
                const isSelected = selectedMonthDate === mDay.dateStr;
                return (
                  <button
                    key={mDay.dateStr}
                    type="button"
                    onClick={() => setSelectedMonthDate(isSelected ? null : mDay.dateStr)}
                    className={`min-h-[48px] sm:min-h-[54px] rounded-2xl flex flex-col items-center justify-between p-1.5 transition border text-left active:scale-95 ${
                      isSelected
                        ? 'bg-gradient-to-b from-emerald-500 to-teal-400 text-slate-950 border-emerald-300 font-bold shadow-md shadow-emerald-500/25'
                        : mDay.isToday
                        ? 'bg-[#191f2f] border-amber-500/60 text-white'
                        : mDay.isCurrentWeek
                        ? 'bg-[#141b2b] border-white/[0.1] text-white hover:border-emerald-500/40'
                        : 'bg-[#070e1d] border-white/[0.04] text-neutral-400 hover:text-white'
                    }`}
                  >
                    <div className="w-full flex items-center justify-between text-[10px] leading-none">
                      <span className={`font-mono font-bold ${isSelected ? 'text-slate-950' : mDay.isToday ? 'text-amber-400' : 'text-neutral-300'}`}>
                        {mDay.dayNum}
                      </span>
                      {mDay.isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      )}
                    </div>

                    <div className="w-full flex items-center justify-center gap-1">
                      {mDay.count > 0 && (
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${
                            isSelected
                              ? 'bg-slate-950/20 text-slate-950 font-bold'
                              : mDay.completedCount > 0
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {mDay.count}s
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Hari Ini
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Minggu Aktif
                </span>
              </div>
              <span className="font-mono text-emerald-400">
                {selectedMonthDate ? `Terpilih: ${selectedMonthDate}` : 'Menampilkan Semua'}
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 4. Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              currentUserRole === 'client'
                ? 'Cari fokus latihan atau lokasi sesi saya...'
                : 'Cari nama member, kode, fokus latihan, atau lokasi...'
            }
            className="w-full min-h-[44px] bg-[#111726]/85 border border-white/[0.08] rounded-2xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition shadow-inner"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {isCoachOrAdmin(currentUserRole) && (
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="min-h-[44px] bg-[#111726]/85 border border-white/[0.08] rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition shrink-0"
              title="Filter Berdasarkan Member"
            >
              <option value="Semua">Semua Member ({clients.length})</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nama_lengkap} ({c.code})
                </option>
              ))}
            </select>
          )}

          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="min-h-[44px] bg-[#111726]/85 border border-white/[0.08] rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition shrink-0"
          >
            <option value="Semua">Semua Lokasi Gym</option>
            <option value="Gym Utama Senayan">Gym Utama Senayan</option>
            <option value="SCBD District 8">SCBD District 8</option>
            <option value="Private Studio Kemang">Private Studio Kemang</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-[44px] bg-[#111726]/85 border border-white/[0.08] rounded-2xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition shrink-0"
          >
            <option value="Semua">Semua Status</option>
            <option value="Mendatang">Mendatang / Terjadwal</option>
            <option value="Selesai">Selesai (Hadir)</option>
          </select>
        </div>
      </div>

      {/* 5. Scheduled Session Cards List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between text-xs text-[#bbcabf] px-1">
          <span className="font-semibold text-white">
            {selectedDayKey === 'all'
              ? currentUserRole === 'client'
                ? 'Daftar Semua Sesi Latihan Saya'
                : 'Daftar Semua Sesi Minggu Ini'
              : `Jadwal ${weekDaysList.find((d) => d.dayKey === selectedDayKey)?.fullDate || selectedDayKey}`}
          </span>
          <span className="font-mono text-emerald-400">
            {filteredSessions.length} Sesi Ditampilkan
          </span>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="bg-[#111726]/85 backdrop-blur-xl border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] rounded-3xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#191f2f] text-neutral-400 flex items-center justify-center mx-auto border border-white/[0.06]">
              <CalendarClock className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Tidak ada jadwal sesi pada filter ini</p>
              <p className="text-xs text-[#bbcabf] mt-1 max-w-sm mx-auto">
                {currentUserRole === 'client'
                  ? 'Belum ada sesi latihan terjadwal untuk filter ini. Hubungi Coach Panji jika ingin mengajukan jadwal latihan baru.'
                  : 'Pilih hari lain atau klik tombol di bawah untuk menjadwalkan sesi baru bagi member.'}
              </p>
            </div>
            {isCoachOrAdmin(currentUserRole) ? (
              <button
                type="button"
                onClick={() => setShowQuickScheduleModal(true)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 active:scale-95 transition shadow-md shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Jadwalkan Sesi Sekarang</span>
              </button>
            ) : (
              <a
                href={`https://wa.me/${INITIAL_COACH_PROFILE.whatsapp}?text=Halo%20Coach%20Panji,%20saya%20ingin%20konsultasi%20jadwal%20latihan%20berikutnya.`}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 active:scale-95 transition shadow-md shadow-emerald-500/20"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat Coach Panji di WhatsApp</span>
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((ses) => {
              const isFinished = ses.status === 'Selesai';
              return (
                <div
                  key={ses.id}
                  className={`bg-[#111726]/85 backdrop-blur-xl border rounded-3xl p-4 sm:p-5 transition space-y-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.35),inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:border-emerald-500/40 ${
                    isFinished ? 'border-white/[0.08] opacity-90' : 'border-emerald-500/30 bg-gradient-to-r from-[#111726]/90 to-[#162035]/90'
                  }`}
                >
                  {/* Card Header: Time, Status, Location */}
                  <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-xs font-mono shrink-0 shadow-sm ${
                          isFinished
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {ses.dayName}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold font-mono text-white flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-emerald-400" />
                            {ses.time} WIB ({ses.durationMinutes} mnt)
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono">
                            {ses.date}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#bbcabf] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#06b6d4]" />
                          <span>{ses.location}</span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-3 py-1 rounded-full font-bold border shrink-0 ${
                        isFinished
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {isFinished ? '✓ Selesai' : '⏳ Terjadwal'}
                    </span>
                  </div>

                  {/* Client Info & Focus Details */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        onClick={() => onSelectClient(ses.clientId)}
                        className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 text-white flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer hover:opacity-90 transition shadow-sm active:scale-95"
                      >
                        {ses.clientInitials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4
                            onClick={() => onSelectClient(ses.clientId)}
                            className="text-xs sm:text-sm font-bold text-white hover:text-emerald-400 cursor-pointer transition truncate"
                          >
                            {ses.clientName}
                          </h4>
                          <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                            {ses.clientCode}
                          </span>
                        </div>
                        <p className="text-xs text-emerald-300 font-medium truncate mt-0.5">
                          {ses.focus}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-white block">
                        Sesi #{ses.sessionNumber}/{ses.totalPackage}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        Sisa {Math.max(0, ses.totalPackage - ses.sessionNumber)} Sesi
                      </span>
                    </div>
                  </div>

                  {/* Coach Notes if present */}
                  {ses.coachNotes && (
                    <div className="p-3 bg-[#070e1d] rounded-2xl text-xs text-[#bbcabf] italic border border-white/[0.04]">
                      “{ses.coachNotes}”
                    </div>
                  )}

                  {/* Pending Reschedule Approval Matrix Banner */}
                  {ses.pendingReschedule && onApproveReschedule && onRejectReschedule && onCancelReschedule && (
                    <RescheduleApprovalBanner
                      compact
                      request={ses.pendingReschedule}
                      currentUserRole={currentUserRole}
                      onApprove={onApproveReschedule}
                      onReject={onRejectReschedule}
                      onCancel={onCancelReschedule}
                      onOpenReview={onOpenReviewReschedule}
                    />
                  )}

                  {/* Action Thumb Bar */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center gap-2 flex-1">
                      {isFinished ? (
                        <button
                          type="button"
                          onClick={() => onSelectClient(ses.clientId)}
                          className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[#1e2638] hover:bg-[#283248] text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                        >
                          <User className="w-4 h-4 text-emerald-400" />
                          <span>Lihat Log &amp; Metrik</span>
                        </button>
                      ) : isCoachOrAdmin(currentUserRole) ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onOpenLogSession(ses.clientId)}
                            className="flex-1 min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition"
                          >
                            <Dumbbell className="w-4 h-4" />
                            <span>Catat Sesi #{ses.sessionNumber}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenReschedule(ses.clientId)}
                            className="min-h-[44px] px-3.5 rounded-xl bg-[#1e2638] hover:bg-[#283248] border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                            title="Reschedule sesi ini"
                          >
                            <CalendarClock className="w-4 h-4" />
                            <span className="hidden sm:inline">Pindah Jadwal</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onSelectClient(ses.clientId)}
                            className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[#1e2638] hover:bg-[#283248] text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                          >
                            <User className="w-4 h-4 text-emerald-400" />
                            <span>Detail Latihan</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenReschedule(ses.clientId)}
                            className="min-h-[44px] px-3.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
                            title="Ajukan pindah jadwal sesi ini"
                          >
                            <CalendarClock className="w-4 h-4" />
                            <span>Ajukan Reschedule</span>
                          </button>
                        </>
                      )}
                    </div>

                    <a
                      href={
                        currentUserRole === 'client'
                          ? `https://wa.me/${INITIAL_COACH_PROFILE.whatsapp}?text=Halo%20Coach%20Panji,%20saya%20ingin%20konfirmasi%20jadwal%20latihan%20pada%20${ses.date}%20jam%20${ses.time}%20WIB%20di%20${encodeURIComponent(ses.location)}.`
                          : `https://wa.me/${(ses.clientPhone || '').replace(/\D/g, '')}?text=Halo%20${encodeURIComponent(ses.clientName)},%20konfirmasi%20jadwal%20latihan%20PelatihKu%20pada%20${ses.date}%20jam%20${ses.time}%20WIB%20di%20${encodeURIComponent(ses.location)}.`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] min-w-[44px] px-2.5 rounded-xl bg-[#1e2638] hover:bg-[#283248] text-emerald-400 flex items-center justify-center transition active:scale-95 shadow-sm border border-white/[0.06]"
                      title={currentUserRole === 'client' ? 'Chat Coach Panji via WhatsApp' : 'Chat WhatsApp Member'}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick Schedule Modal */}
      {showQuickScheduleModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowQuickScheduleModal(false);
          }}
          className="fixed inset-0 z-50 bg-[#070e1d]/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-[#111726]/95 backdrop-blur-2xl border border-white/[0.12] rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Jadwalkan Sesi Latihan Baru
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Tambahkan sesi ke kalender mingguan Coach Panji Akbar Syamsi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickScheduleModal(false)}
                className="w-11 h-11 rounded-2xl bg-white/[0.06] border border-white/[0.1] text-neutral-400 hover:text-white flex items-center justify-center active:scale-95 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickScheduleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                  Pilih Member *
                </label>
                <select
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nama_lengkap} ({c.code} · Paket {c.paketTerpakai}/{c.paketTotal} Sesi)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                    Tanggal Sesi *
                  </label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                    Jam Sesi (WIB) *
                  </label>
                  <input
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                  Lokasi Gym *
                </label>
                <select
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value as any)}
                  className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
                >
                  <option value="Gym Utama Senayan">Gym Utama Senayan</option>
                  <option value="SCBD District 8">SCBD District 8</option>
                  <option value="Private Studio Kemang">Private Studio Kemang</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                  Fokus Sesi Latihan *
                </label>
                <input
                  type="text"
                  required
                  value={formFocus}
                  onChange={(e) => setFormFocus(e.target.value)}
                  placeholder="Contoh: Barbell Bench Press & Hypertrophy Chest"
                  className="w-full min-h-[44px] bg-[#070e1d] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowQuickScheduleModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:bg-white/[0.06] transition active:scale-95"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
