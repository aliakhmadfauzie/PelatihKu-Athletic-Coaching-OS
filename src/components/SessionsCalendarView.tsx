import React, { useState, useMemo } from 'react';
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
  Check,
  X,
  Sparkles
} from 'lucide-react';
import { ClientProfile } from '../data/mockData';

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
}

interface SessionsCalendarViewProps {
  clients: ClientProfile[];
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
}

export type CalendarViewMode = 'day' | 'week' | 'month';

// Fixed 7-day schedule range for current week (Week 44, Nov 2026)
const WEEK_DAYS = [
  { dayKey: '2026-11-02', label: 'Sen', dateNum: '02', fullDate: 'Senin, 2 Nov 2026' },
  { dayKey: '2026-11-03', label: 'Sel', dateNum: '03', fullDate: 'Selasa, 3 Nov 2026' },
  { dayKey: '2026-11-04', label: 'Rab', dateNum: '04', fullDate: 'Rabu, 4 Nov 2026' },
  { dayKey: '2026-11-05', label: 'Kam', dateNum: '05', fullDate: 'Kamis, 5 Nov 2026', isToday: true },
  { dayKey: '2026-11-06', label: 'Jum', dateNum: '06', fullDate: 'Jumat, 6 Nov 2026' },
  { dayKey: '2026-11-07', label: 'Sab', dateNum: '07', fullDate: 'Sabtu, 7 Nov 2026' },
  { dayKey: '2026-11-08', label: 'Min', dateNum: '08', fullDate: 'Minggu, 8 Nov 2026' }
];

export const SessionsCalendarView: React.FC<SessionsCalendarViewProps> = ({
  clients,
  onBackToDashboard,
  onSelectClient,
  onOpenLogSession,
  onOpenReschedule,
  onScheduleNewSession,
  onNotify
}) => {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [selectedDayKey, setSelectedDayKey] = useState<string>('all'); // for week view: 'all' or '2026-11-05'
  const [currentDayIndex, setCurrentDayIndex] = useState<number>(3); // for day view: 0..6 (default 3 = Kamis 5 Nov / today)
  const [selectedMonthDate, setSelectedMonthDate] = useState<string | null>(null); // for month view
  const [locationFilter, setLocationFilter] = useState<string>('Semua');
  const [statusFilter, setStatusFilter] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showQuickScheduleModal, setShowQuickScheduleModal] = useState<boolean>(false);

  // Quick schedule modal form state
  const [formClientId, setFormClientId] = useState<string>(clients[0]?.id || '');
  const [formDate, setFormDate] = useState<string>('2026-11-06');
  const [formTime, setFormTime] = useState<string>('16:30');
  const [formLocation, setFormLocation] = useState<
    'Gym Utama Senayan' | 'SCBD District 8' | 'Private Studio Kemang'
  >('Gym Utama Senayan');
  const [formFocus, setFormFocus] = useState<string>('Upper Body Hypertrophy & Arms');

  // Generate complete 38 sessions for this week based on clients + realistic schedule slots
  const allWeeklySessions = useMemo<ScheduledSessionItem[]>(() => {
    const list: ScheduledSessionItem[] = [];

    // 1. Add each client's upcoming nextSession
    clients.forEach((c) => {
      if (c.nextSession) {
        list.push({
          id: `sched-${c.id}-${c.nextSession.date}`,
          clientId: c.id,
          clientName: c.nama_lengkap,
          clientCode: c.code,
          clientInitials: c.initials,
          clientAvatarBg: c.avatarBg,
          clientGender: c.gender,
          clientPhone: c.telepon,
          date: c.nextSession.date || '2026-11-06',
          dayName: c.nextSession.date === '2026-11-05' ? 'Kam' : c.nextSession.date === '2026-11-06' ? 'Jum' : 'Sab',
          time: c.nextSession.time || '16:30',
          durationMinutes: 75,
          location: c.nextSession.location || 'Gym Utama Senayan',
          focus: c.nextSession.focus || 'Movement Assessment & Strength',
          sessionNumber: Math.min(c.paketTotal, c.paketTerpakai + 1),
          totalPackage: c.paketTotal,
          status: 'Terkonfirmasi',
          coachNotes: c.nextSession.rescheduleReason
        });
      }

      // Add recent sessions from this week
      c.sessions?.forEach((s) => {
        list.push({
          id: `past-${c.id}-${s.id}`,
          clientId: c.id,
          clientName: c.nama_lengkap,
          clientCode: c.code,
          clientInitials: c.initials,
          clientAvatarBg: c.avatarBg,
          clientGender: c.gender,
          clientPhone: c.telepon,
          date: '2026-11-04', // Earlier this week
          dayName: 'Rab',
          time: s.time || '14:00',
          durationMinutes: s.durationMinutes || 75,
          location: (s.location as any) || 'Gym Utama Senayan',
          focus: s.focus,
          sessionNumber: s.sessionNumber,
          totalPackage: c.paketTotal,
          status: 'Selesai',
          coachNotes: s.coachNotes
        });
      });
    });

    // Supplementary realistic scheduled slots to populate all 7 days (matching the 38 total sessions metric)
    const extraSlots: Omit<ScheduledSessionItem, 'clientId' | 'clientName' | 'clientCode' | 'clientInitials' | 'clientGender' | 'clientPhone' | 'totalPackage'>[] = [
      // Monday 2 Nov (Completed)
      { id: 'ex-01', date: '2026-11-02', dayName: 'Sen', time: '07:00', durationMinutes: 60, location: 'Gym Utama Senayan', focus: 'Lower Body Strength (Squat 5x5)', sessionNumber: 12, status: 'Selesai' },
      { id: 'ex-02', date: '2026-11-02', dayName: 'Sen', time: '09:00', durationMinutes: 75, location: 'Gym Utama Senayan', focus: 'Postural Alignment & Core Stability', sessionNumber: 8, status: 'Selesai' },
      { id: 'ex-03', date: '2026-11-02', dayName: 'Sen', time: '14:30', durationMinutes: 75, location: 'SCBD District 8', focus: 'Upper Push Heavy (Bench 4x6)', sessionNumber: 14, status: 'Selesai' },
      { id: 'ex-04', date: '2026-11-02', dayName: 'Sen', time: '17:00', durationMinutes: 60, location: 'SCBD District 8', focus: 'Glute Hypertrophy & RDL Progression', sessionNumber: 19, status: 'Selesai' },

      // Tuesday 3 Nov (Completed)
      { id: 'ex-05', date: '2026-11-03', dayName: 'Sel', time: '07:30', durationMinutes: 60, location: 'Gym Utama Senayan', focus: 'Deadlift Technique & Lat Engagement', sessionNumber: 15, status: 'Selesai' },
      { id: 'ex-06', date: '2026-11-03', dayName: 'Sel', time: '09:30', durationMinutes: 75, location: 'Gym Utama Senayan', focus: 'Metabolic Conditioning & Core Tabata', sessionNumber: 6, status: 'Selesai' },
      { id: 'ex-07', date: '2026-11-03', dayName: 'Sel', time: '13:00', durationMinutes: 60, location: 'Private Studio Kemang', focus: 'Shoulder Mobility & Rotator Cuff Rehab', sessionNumber: 10, status: 'Selesai' },
      { id: 'ex-08', date: '2026-11-03', dayName: 'Sel', time: '16:00', durationMinutes: 75, location: 'Private Studio Kemang', focus: 'Posterior Chain & Hamstring Isolation', sessionNumber: 18, status: 'Selesai' },
      { id: 'ex-09', date: '2026-11-03', dayName: 'Sel', time: '18:30', durationMinutes: 60, location: 'Gym Utama Senayan', focus: 'Chest & Back Superset Hypertrophy', sessionNumber: 21, status: 'Selesai' },
      { id: 'ex-10', date: '2026-11-03', dayName: 'Sel', time: '19:45', durationMinutes: 60, location: 'Gym Utama Senayan', focus: 'Quad Dominant Leg Day (Hack Squat)', sessionNumber: 9, status: 'Selesai' },

      // Wednesday 4 Nov (Completed)
      { id: 'ex-11', date: '2026-11-04', dayName: 'Rab', time: '07:00', durationMinutes: 60, location: 'SCBD District 8', focus: 'Full Body Functional Strength', sessionNumber: 11, status: 'Selesai' },
      { id: 'ex-12', date: '2026-11-04', dayName: 'Rab', time: '09:00', durationMinutes: 75, location: 'SCBD District 8', focus: 'Olympic Lifts Primer & High Pulls', sessionNumber: 5, status: 'Selesai' },
      { id: 'ex-13', date: '2026-11-04', dayName: 'Rab', time: '15:00', durationMinutes: 60, location: 'Gym Utama Senayan', focus: 'Ankle Dorsiflexion & Deep Squat Rehab', sessionNumber: 16, status: 'Selesai' },
      { id: 'ex-14', date: '2026-11-04', dayName: 'Rab', time: '17:30', durationMinutes: 75, location: 'Gym Utama Senayan', focus: 'Deltoid Sculpting & Lateral Raises', sessionNumber: 13, status: 'Selesai' },
      { id: 'ex-15', date: '2026-11-04', dayName: 'Rab', time: '19:00', durationMinutes: 60, location: 'Gym Utama Senayan', focus: 'Powerlifting Peaking Session (Squat/Bench)', sessionNumber: 22, status: 'Selesai' },

      // Thursday 5 Nov (Today - Active)
      { id: 'ex-16', date: '2026-11-05', dayName: 'Kam', time: '08:00', durationMinutes: 60, location: 'Gym Utama Senayan', focus: 'Morning Mobility & Thoracic Extension', sessionNumber: 7, status: 'Selesai' },
      { id: 'ex-17', date: '2026-11-05', dayName: 'Kam', time: '10:00', durationMinutes: 75, location: 'Gym Utama Senayan', focus: 'Heavy Pull (Trap Bar Deadlift 5x3)', sessionNumber: 14, status: 'Selesai' },
      { id: 'ex-18', date: '2026-11-05', dayName: 'Kam', time: '14:00', durationMinutes: 60, location: 'SCBD District 8', focus: 'Arm Day Specialization (Biceps/Triceps)', sessionNumber: 17, status: 'Terkonfirmasi' },
      { id: 'ex-19', date: '2026-11-05', dayName: 'Kam', time: '16:30', durationMinutes: 75, location: 'Gym Utama Senayan', focus: 'Lower Body Hypertrophy (Split Squat/RDL)', sessionNumber: 17, status: 'Terkonfirmasi' },
      { id: 'ex-20', date: '2026-11-05', dayName: 'Kam', time: '18:15', durationMinutes: 60, location: 'Gym Utama Senayan', focus: 'Upper Body Pump & Conditioning', sessionNumber: 20, status: 'Terkonfirmasi' },
      { id: 'ex-21', date: '2026-11-05', dayName: 'Kam', time: '19:30', durationMinutes: 60, location: 'Gym Utama Senayan', focus: 'Powerbuilding Bench & Incline DB Press', sessionNumber: 23, status: 'Menunggu' },

      // Friday 6 Nov (Tomorrow - Upcoming)
      { id: 'ex-22', date: '2026-11-06', dayName: 'Jum', time: '07:00', durationMinutes: 60, location: 'Private Studio Kemang', focus: 'Kettlebell Complex & Hip Power', sessionNumber: 10, status: 'Terkonfirmasi' },
      { id: 'ex-23', date: '2026-11-06', dayName: 'Jum', time: '09:00', durationMinutes: 75, location: 'Private Studio Kemang', focus: 'Movement Screening & Baseline Assessment', sessionNumber: 1, status: 'Terkonfirmasi' },
      { id: 'ex-24', date: '2026-11-06', dayName: 'Jum', time: '14:00', durationMinutes: 60, location: 'SCBD District 8', focus: 'Back Width & Lat Pulldown Tempo Work', sessionNumber: 15, status: 'Terkonfirmasi' },
      { id: 'ex-25', date: '2026-11-06', dayName: 'Jum', time: '16:00', durationMinutes: 75, location: 'Gym Utama Senayan', focus: 'Squat Deload & Technique Polishing', sessionNumber: 18, status: 'Terkonfirmasi' },
      { id: 'ex-26', date: '2026-11-06', dayName: 'Jum', time: '17:45', durationMinutes: 60, location: 'Gym Utama Senayan', focus: 'Glute Hypertrophy & Hip Thrust 4x10', sessionNumber: 12, status: 'Terkonfirmasi' },
      { id: 'ex-27', date: '2026-11-06', dayName: 'Jum', time: '19:15', durationMinutes: 60, location: 'Gym Utama Senayan', focus: 'Deadlift Test (90% 1RM Calibration)', sessionNumber: 24, status: 'Menunggu' },

      // Saturday 7 Nov (Weekend Slots)
      { id: 'ex-28', date: '2026-11-07', dayName: 'Sab', time: '08:00', durationMinutes: 75, location: 'Gym Utama Senayan', focus: 'Weekend Heavy Legs (Squat / RDL)', sessionNumber: 16, status: 'Terkonfirmasi' },
      { id: 'ex-29', date: '2026-11-07', dayName: 'Sab', time: '09:45', durationMinutes: 75, location: 'Gym Utama Senayan', focus: 'Upper Body Power & Push Press', sessionNumber: 19, status: 'Terkonfirmasi' },
      { id: 'ex-30', date: '2026-11-07', dayName: 'Sab', time: '11:30', durationMinutes: 60, location: 'SCBD District 8', focus: 'Core Anti-Rotation & Farmers Walk', sessionNumber: 8, status: 'Terkonfirmasi' },
      { id: 'ex-31', date: '2026-11-07', dayName: 'Sab', time: '14:00', durationMinutes: 60, location: 'SCBD District 8', focus: 'Hypertrophy Delts & Arms Blast', sessionNumber: 13, status: 'Menunggu' },
      { id: 'ex-32', date: '2026-11-07', dayName: 'Sab', time: '16:00', durationMinutes: 75, location: 'Private Studio Kemang', focus: 'Hamstring Rehabilitation & Nordic Curl', sessionNumber: 21, status: 'Menunggu' },

      // Sunday 8 Nov (Recovery & Form Check)
      { id: 'ex-33', date: '2026-11-08', dayName: 'Min', time: '08:30', durationMinutes: 60, location: 'Gym Utama Senayan', focus: 'Active Recovery & Full Body Stretching', sessionNumber: 6, status: 'Terkonfirmasi' },
      { id: 'ex-34', date: '2026-11-08', dayName: 'Min', time: '10:00', durationMinutes: 60, location: 'Gym Utama Senayan', focus: 'Movement Assessment & Baseline Measurement', sessionNumber: 1, status: 'Terkonfirmasi' },
      { id: 'ex-35', date: '2026-11-08', dayName: 'Min', time: '15:00', durationMinutes: 60, location: 'Private Studio Kemang', focus: 'Light Cardio & Core Bracing', sessionNumber: 11, status: 'Menunggu' },

      // Additional Monthly November 2026 Sessions (for Month View)
      { id: 'm-01', date: '2026-11-01', dayName: 'Min', time: '10:00', durationMinutes: 60, location: 'Gym Utama Senayan', focus: 'Introductory Assessment & Mobility Screening', sessionNumber: 1, status: 'Selesai' },
      { id: 'm-02', date: '2026-11-10', dayName: 'Sel', time: '08:00', durationMinutes: 75, location: 'Gym Utama Senayan', focus: 'Hypertrophy Block II — Quad Sweep & Split Squats', sessionNumber: 18, status: 'Terkonfirmasi' },
      { id: 'm-03', date: '2026-11-11', dayName: 'Rab', time: '16:30', durationMinutes: 60, location: 'SCBD District 8', focus: 'Posterior Chain & Conventional Deadlift Work', sessionNumber: 15, status: 'Terkonfirmasi' },
      { id: 'm-04', date: '2026-11-13', dayName: 'Jum', time: '17:00', durationMinutes: 75, location: 'Private Studio Kemang', focus: 'Upper Push Heavy — Incline DB Press & Triceps', sessionNumber: 19, status: 'Terkonfirmasi' },
      { id: 'm-05', date: '2026-11-17', dayName: 'Sel', time: '09:00', durationMinutes: 60, location: 'Gym Utama Senayan', focus: 'Deload & Joint Prep — Mobility Drills', sessionNumber: 20, status: 'Terkonfirmasi' },
      { id: 'm-06', date: '2026-11-20', dayName: 'Jum', time: '18:00', durationMinutes: 75, location: 'Gym Utama Senayan', focus: 'PR Calibration Session — Barbell Back Squat', sessionNumber: 21, status: 'Terkonfirmasi' },
      { id: 'm-07', date: '2026-11-24', dayName: 'Sel', time: '15:30', durationMinutes: 60, location: 'SCBD District 8', focus: 'Bench Press Peak Testing (3RM Evaluation)', sessionNumber: 22, status: 'Menunggu' },
      { id: 'm-08', date: '2026-11-27', dayName: 'Jum', time: '16:30', durationMinutes: 75, location: 'Gym Utama Senayan', focus: 'Package Closing Sesi #24 — Final Assessment', sessionNumber: 24, status: 'Menunggu' }
    ];

    // Combine and link with clients
    extraSlots.forEach((slot, idx) => {
      const assignedClient = clients[idx % clients.length] || clients[0];
      list.push({
        ...slot,
        clientId: assignedClient.id,
        clientName: assignedClient.nama_lengkap,
        clientCode: assignedClient.code,
        clientInitials: assignedClient.initials,
        clientAvatarBg: assignedClient.avatarBg,
        clientGender: assignedClient.gender,
        clientPhone: assignedClient.telepon,
        totalPackage: assignedClient.paketTotal
      });
    });

    // Sort by date then time
    return list.sort((a, b) => {
      const dComp = a.date.localeCompare(b.date);
      if (dComp !== 0) return dComp;
      return a.time.localeCompare(b.time);
    });
  }, [clients]);

  // Daily counts for day pill indicators
  const dayCounts = useMemo(() => {
    const counts: Record<string, { total: number; completed: number; upcoming: number }> = {};
    WEEK_DAYS.forEach((w) => {
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
  }, [allWeeklySessions]);

  // Month days map for November 2026 (Nov 1 to Nov 30)
  // In Nov 2026, 1 Nov is Sunday (day of week index 6 if Mon=0..Sun=6)
  const monthDaysList = useMemo(() => {
    const days: { dateStr: string; dayNum: number; isToday: boolean; isCurrentWeek: boolean; count: number; completedCount: number }[] = [];
    for (let d = 1; d <= 30; d++) {
      const dateStr = `2026-11-${d < 10 ? '0' + d : d}`;
      const dayData = dayCounts[dateStr] || { total: (d % 2 === 0 ? 5 : 4), completed: d <= 4 ? (d % 2 === 0 ? 5 : 4) : d === 5 ? 2 : 0, upcoming: d >= 5 ? 4 : 0 };
      const isToday = dateStr === '2026-11-05';
      const isCurrentWeek = d >= 2 && d <= 8;
      days.push({
        dateStr,
        dayNum: d,
        isToday,
        isCurrentWeek,
        count: dayData.total,
        completedCount: dayData.completed
      });
    }
    return days;
  }, [dayCounts]);

  // Overall stats
  const totalCompleted = allWeeklySessions.filter((s) => s.status === 'Selesai').length;
  const totalUpcoming = allWeeklySessions.filter((s) => s.status !== 'Selesai').length;

  // Filtered session list based on active view mode (day, week, month)
  const filteredSessions = useMemo(() => {
    const activeDayKey = WEEK_DAYS[currentDayIndex]?.dayKey || '2026-11-05';

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
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        s.clientName.toLowerCase().includes(q) ||
        s.focus.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q) ||
        s.clientCode.toLowerCase().includes(q);

      return matchDay && matchLoc && matchStatus && matchSearch;
    });
  }, [allWeeklySessions, viewMode, currentDayIndex, selectedDayKey, selectedMonthDate, locationFilter, statusFilter, searchQuery]);

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
      `Sesi latihan baru berhasil dijadwalkan untuk ${chosenClient?.nama_lengkap || 'Klien'} pada ${formDate} (${formTime} WIB)!`
    );
  };

  const activeDayObj = WEEK_DAYS[currentDayIndex] || WEEK_DAYS[3];
  const activeDayCountInfo = dayCounts[activeDayObj.dayKey] || { total: 6, completed: 2, upcoming: 4 };

  return (
    <div className="space-y-5">
      {/* 1. Header & Navigation Context Bar */}
      <div className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="min-w-[42px] min-h-[42px] rounded-xl bg-[#232a3a] hover:bg-[#323949] text-white flex items-center justify-center transition active:scale-95 border border-white/[0.06]"
            aria-label="Kembali ke Dashboard"
          >
            <ArrowLeft className="w-4 h-4 text-[#4edea3]" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Jadwal &amp; Kalender Sesi
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold">
                Minggu 44 · Nov 2026
              </span>
            </div>
            <p className="text-xs text-[#bbcabf] mt-0.5">
              <span>Coach Hendra Kurniawan</span>
              <span aria-hidden="true"> · </span>
              <span>Total 38 Sesi ({totalCompleted} Selesai, {totalUpcoming} Mendatang)</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowQuickScheduleModal(true)}
          className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 active:scale-95 transition"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>+ Jadwalkan Sesi Baru</span>
        </button>
      </div>

      {/* 2. Stat Performance Highlights Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-[#141b2b] border border-white/[0.08] rounded-xl p-3">
          <span className="text-[10px] font-medium text-[#86948a] uppercase tracking-wider block">
            Target Mingguan
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold font-mono text-white">38</span>
            <span className="text-xs text-[#bbcabf]">Sesi</span>
          </div>
          <p className="text-[11px] text-[#4edea3] mt-1 font-mono">100% Terisi</p>
        </div>

        <div className="bg-[#141b2b] border border-white/[0.08] rounded-xl p-3">
          <span className="text-[10px] font-medium text-[#86948a] uppercase tracking-wider block">
            Selesai / Terverifikasi
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold font-mono text-[#4edea3]">{totalCompleted}</span>
            <span className="text-xs text-[#bbcabf]">/ 38 Sesi</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] mt-1.5 overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full"
              style={{ width: `${Math.round((totalCompleted / 38) * 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-[#141b2b] border border-white/[0.08] rounded-xl p-3">
          <span className="text-[10px] font-medium text-[#86948a] uppercase tracking-wider block">
            Sesi Menunggu
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold font-mono text-[#ffb95f]">{totalUpcoming}</span>
            <span className="text-xs text-[#bbcabf]">Sesi</span>
          </div>
          <p className="text-[11px] text-amber-400 mt-1 font-mono">Siap Dieksekusi</p>
        </div>

        <div className="bg-[#141b2b] border border-white/[0.08] rounded-xl p-3">
          <span className="text-[10px] font-medium text-[#86948a] uppercase tracking-wider block">
            Tingkat Kehadiran
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-xl font-bold font-mono text-[#06b6d4]">94.2%</span>
          </div>
          <p className="text-[11px] text-[#06b6d4] mt-1 font-mono">0 Sesi Batal</p>
        </div>
      </div>

      {/* 3. Interactive Calendar Section with Day / Week / Month View Switcher */}
      <section className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-3.5 sm:p-4 space-y-3.5 shadow-md">
        {/* Top View Selector Bar */}
        <div className="flex items-center justify-between flex-wrap gap-2.5 pb-2.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              {viewMode === 'day'
                ? 'Tampilan Harian (Day View)'
                : viewMode === 'week'
                ? 'Pita Mingguan (Week View)'
                : 'Kalender Bulanan (Month View)'}
            </h3>
          </div>

          {/* Segmented View Mode Tabs: Day, Week, Month */}
          <div className="flex items-center p-1 bg-[#070e1d] border border-white/[0.08] rounded-xl">
            <button
              type="button"
              onClick={() => {
                setViewMode('day');
                setCurrentDayIndex(3); // Kamis 5 Nov (today)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 ${
                viewMode === 'day'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Hari (Day)
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('week');
                setSelectedDayKey('all');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 ${
                viewMode === 'week'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Minggu (Week)
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('month');
                setSelectedMonthDate(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95 ${
                viewMode === 'month'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Bulan (Month)
            </button>
          </div>
        </div>

        {/* View Content 1: DAY VIEW */}
        {viewMode === 'day' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 bg-[#070e1d] border border-white/[0.06] rounded-xl p-2.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentDayIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentDayIndex === 0}
                  className="min-w-[34px] min-h-[34px] rounded-lg bg-[#141b2b] text-neutral-300 hover:text-white hover:bg-[#191f2f] disabled:opacity-40 flex items-center justify-center transition"
                  aria-label="Hari sebelumnya"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentDayIndex((prev) => Math.min(WEEK_DAYS.length - 1, prev + 1))}
                  disabled={currentDayIndex === WEEK_DAYS.length - 1}
                  className="min-w-[34px] min-h-[34px] rounded-lg bg-[#141b2b] text-neutral-300 hover:text-white hover:bg-[#191f2f] disabled:opacity-40 flex items-center justify-center transition"
                  aria-label="Hari berikutnya"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                <div className="pl-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-white">
                      {activeDayObj.fullDate}
                    </span>
                    {activeDayObj.isToday && (
                      <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
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
                onClick={() => setCurrentDayIndex(3)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition ${
                  currentDayIndex === 3
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-[#141b2b] text-neutral-300 border-white/[0.08] hover:text-white'
                }`}
              >
                Hari Ini
              </button>
            </div>

            {/* Quick Time Slots Jump Strip for the Day */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-[#191f2f] border border-white/[0.06] rounded-xl p-2">
                <span className="text-[10px] text-neutral-400 uppercase font-medium block">Pagi (07:00 - 11:00)</span>
                <span className="text-xs font-mono font-bold text-white mt-0.5 block">2 Sesi Latihan</span>
              </div>
              <div className="bg-[#191f2f] border border-white/[0.06] rounded-xl p-2">
                <span className="text-[10px] text-neutral-400 uppercase font-medium block">Siang (12:00 - 15:00)</span>
                <span className="text-xs font-mono font-bold text-[#ffb95f] mt-0.5 block">1 Sesi Latihan</span>
              </div>
              <div className="bg-[#191f2f] border border-white/[0.06] rounded-xl p-2">
                <span className="text-[10px] text-neutral-400 uppercase font-medium block">Sore/Malam (16:00+)</span>
                <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5 block">3 Sesi Latihan</span>
              </div>
            </div>
          </div>
        )}

        {/* View Content 2: WEEK VIEW (Original 7-Day Horizontal Selector Bar) */}
        {viewMode === 'week' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#bbcabf]">
              <span className="font-semibold text-white">Minggu ke-44 (2 - 8 November 2026)</span>
              <button
                type="button"
                onClick={() => setSelectedDayKey('all')}
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
                  selectedDayKey === 'all'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Lihat Semua (38 Sesi)
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {WEEK_DAYS.map((day) => {
                const isSelected = selectedDayKey === day.dayKey;
                const countInfo = dayCounts[day.dayKey] || { total: 0, completed: 0, upcoming: 0 };
                return (
                  <button
                    key={day.dayKey}
                    type="button"
                    onClick={() => setSelectedDayKey(day.dayKey)}
                    className={`flex flex-col items-center justify-between p-2 rounded-xl text-center transition active:scale-95 border ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-md shadow-emerald-500/20'
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

        {/* View Content 3: MONTH VIEW (Full November 2026 Grid) */}
        {viewMode === 'month' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">November 2026</span>
                <span className="text-[10px] font-mono text-[#4edea3] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  142 Sesi Bulan Ini
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMonthDate(null)}
                className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
                  selectedMonthDate === null
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
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

            {/* 30 Day Matrix (Nov 1 is Sunday, so 6 empty slots for Mon..Sat) */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {/* Leading 6 empty cells for Sunday Nov 1 */}
              {[...Array(6)].map((_, i) => (
                <div key={`empty-${i}`} className="h-10 sm:h-12 rounded-lg bg-white/[0.01] border border-white/[0.02]" />
              ))}

              {monthDaysList.map((mDay) => {
                const isSelected = selectedMonthDate === mDay.dateStr;
                return (
                  <button
                    key={mDay.dateStr}
                    type="button"
                    onClick={() => setSelectedMonthDate(isSelected ? null : mDay.dateStr)}
                    className={`h-11 sm:h-12 rounded-xl flex flex-col items-center justify-between p-1 transition border text-left active:scale-95 ${
                      isSelected
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold shadow-md shadow-emerald-500/25'
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
                      <span
                        className={`text-[9px] font-mono px-1 py-0.2 rounded ${
                          isSelected
                            ? 'bg-slate-950/20 text-slate-950 font-bold'
                            : mDay.completedCount > 0
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {mDay.count}s
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Hari Ini (5 Nov)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Minggu Aktif (Mgg 44)
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
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama klien, fokus latihan, atau lokasi..."
            className="w-full bg-[#141b2b] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="bg-[#141b2b] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition shrink-0"
          >
            <option value="Semua">Semua Lokasi Gym</option>
            <option value="Gym Utama Senayan">Gym Utama Senayan</option>
            <option value="SCBD District 8">SCBD District 8</option>
            <option value="Private Studio Kemang">Private Studio Kemang</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#141b2b] border border-white/[0.08] rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition shrink-0"
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
              ? 'Daftar Semua Sesi Minggu Ini'
              : `Jadwal ${WEEK_DAYS.find((d) => d.dayKey === selectedDayKey)?.fullDate || selectedDayKey}`}
          </span>
          <span className="font-mono text-emerald-400">
            {filteredSessions.length} Sesi Ditampilkan
          </span>
        </div>

        {filteredSessions.length === 0 ? (
          <div className="bg-[#141b2b] border border-white/[0.08] rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#191f2f] text-neutral-400 flex items-center justify-center mx-auto">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Tidak ada jadwal sesi pada filter ini</p>
              <p className="text-xs text-[#bbcabf] mt-1">
                Pilih hari lain atau klik tombol di bawah untuk menjadwalkan sesi baru.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowQuickScheduleModal(true)}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 active:scale-95 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Jadwalkan Sesi Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((ses) => {
              const isFinished = ses.status === 'Selesai';
              return (
                <div
                  key={ses.id}
                  className={`bg-[#141b2b] border rounded-2xl p-4 transition space-y-3.5 shadow-sm hover:border-emerald-500/40 ${
                    isFinished ? 'border-white/[0.06] opacity-90' : 'border-emerald-500/30 bg-gradient-to-r from-[#141b2b] to-[#162033]'
                  }`}
                >
                  {/* Card Header: Time, Status, Location */}
                  <div className="flex items-start justify-between gap-2 border-b border-white/[0.06] pb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs font-mono shrink-0 ${
                          isFinished
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {ses.dayName}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono text-white flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-emerald-400" />
                            {ses.time} WIB ({ses.durationMinutes} mnt)
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono">
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
                      className={`text-[10px] font-mono px-2.5 py-1 rounded-full font-bold border shrink-0 ${
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
                        className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-cyan-700 text-white flex items-center justify-center font-bold text-xs shrink-0 cursor-pointer hover:opacity-90 transition"
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
                    <div className="p-2.5 bg-[#070e1d] rounded-xl text-xs text-[#bbcabf] italic border border-white/[0.04]">
                      “{ses.coachNotes}”
                    </div>
                  )}

                  {/* Action Thumb Bar */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.06]">
                    <div className="flex items-center gap-1.5 flex-1">
                      {isFinished ? (
                        <button
                          type="button"
                          onClick={() => onSelectClient(ses.clientId)}
                          className="flex-1 min-h-[38px] px-3 rounded-xl bg-[#232a3a] hover:bg-[#323949] text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                        >
                          <User className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Lihat Log &amp; Metrik</span>
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onOpenLogSession(ses.clientId)}
                            className="flex-1 min-h-[38px] px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition"
                          >
                            <Dumbbell className="w-3.5 h-3.5" />
                            <span>Catat Sesi #{ses.sessionNumber}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenReschedule(ses.clientId)}
                            className="min-h-[38px] px-3 rounded-xl bg-[#232a3a] hover:bg-[#323949] text-amber-300 text-xs font-semibold flex items-center justify-center gap-1 transition active:scale-95"
                            title="Reschedule sesi ini"
                          >
                            <CalendarClock className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Pindah Jadwal</span>
                          </button>
                        </>
                      )}
                    </div>

                    <a
                      href={`https://wa.me/${ses.clientPhone}?text=Halo%20${encodeURIComponent(ses.clientName)},%20konfirmasi%20jadwal%20latihan%20PelatihKu%20pada%20${ses.date}%20jam%20${ses.time}%20WIB%20di%20${encodeURIComponent(ses.location)}.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[38px] min-w-[38px] px-2 rounded-xl bg-[#232a3a] hover:bg-[#323949] text-emerald-400 flex items-center justify-center transition active:scale-95"
                      title="Chat WhatsApp Klien"
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
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="w-full max-w-md bg-[#111827] border border-white/[0.12] rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                  <CalendarClock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Jadwalkan Sesi Latihan Baru
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Tambahkan sesi ke kalender mingguan Coach Hendra
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQuickScheduleModal(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickScheduleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                  Pilih Klien *
                </label>
                <select
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
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
                    className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition"
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
                    className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 transition"
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
                  className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 transition"
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
                  className="w-full bg-[#0B0F17] border border-white/[0.1] rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowQuickScheduleModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:bg-white/[0.06] transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 active:scale-95 transition"
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
