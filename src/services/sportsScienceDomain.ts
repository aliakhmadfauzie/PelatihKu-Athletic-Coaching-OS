import { ClientProfile, WeeklyBiometricPoint } from '../data/mockData';

/**
 * Pure Sports Science & Biometric Domain Module
 * Enforces AGENTS.md Section 5 Fitness Mathematics & Domain Invariants.
 */

export interface LoggedSetInput {
  weightKg: number;
  reps: number;
  isPR?: boolean;
}

export interface BestPRSetResult {
  weightKg: number;
  reps: number;
  est1RM: number;
  deltaKg: number;
}

// ==========================================
// 1. OLYMPIC BARBELL PLATE & COLLAR ENGINE
// ==========================================

export interface PlateBreakdown {
  plateKg: number;
  count: number;
  colorName: string;
  hexColor: string;
  textColor: string;
  borderColor?: string;
}

export interface BarbellCalculationResult {
  targetWeightKg: number;
  barWeightKg: number;
  weightPerSideKg: number;
  actualTotalWeightKg: number;
  platesPerSide: PlateBreakdown[];
  remainingKg: number;
  summaryText: string;
}

export const OLYMPIC_PLATES_CATALOG = [
  { plateKg: 25, colorName: 'Merah (25 kg)', hexColor: '#EF4444', textColor: '#FFFFFF' },
  { plateKg: 20, colorName: 'Biru (20 kg)', hexColor: '#3B82F6', textColor: '#FFFFFF' },
  { plateKg: 15, colorName: 'Kuning (15 kg)', hexColor: '#EAB308', textColor: '#000000' },
  { plateKg: 10, colorName: 'Hijau (10 kg)', hexColor: '#10B981', textColor: '#FFFFFF' },
  { plateKg: 5, colorName: 'Putih (5 kg)', hexColor: '#F3F4F6', textColor: '#111827', borderColor: '#9CA3AF' },
  { plateKg: 2.5, colorName: 'Hitam (2.5 kg)', hexColor: '#374151', textColor: '#FFFFFF' },
  { plateKg: 1.25, colorName: 'Krom (1.25 kg)', hexColor: '#9CA3AF', textColor: '#111827' }
];

/**
 * Calculates plate breakdown per side for standard Olympic Barbell (20kg or 15kg bar).
 * Uses greedy allocation of Olympic standard bumper plates: 25, 20, 15, 10, 5, 2.5, 1.25 kg.
 */
export function calculateBarbellPlateBreakdown(
  targetWeightKg: number,
  barWeightKg = 20
): BarbellCalculationResult {
  const safeTarget = Math.max(0, Number(targetWeightKg) || 0);
  const safeBar = Math.max(0, Number(barWeightKg) || 20);

  if (safeTarget <= safeBar) {
    return {
      targetWeightKg: safeTarget,
      barWeightKg: safeBar,
      weightPerSideKg: 0,
      actualTotalWeightKg: safeBar,
      platesPerSide: [],
      remainingKg: 0,
      summaryText: `Hanya bar kosong (${safeBar} kg) tanpa plate tambahan.`
    };
  }

  const netTargetPlates = safeTarget - safeBar;
  let targetPerSide = +(netTargetPlates / 2).toFixed(3);
  let perSideRemaining = targetPerSide;

  const platesPerSide: PlateBreakdown[] = [];

  for (const plate of OLYMPIC_PLATES_CATALOG) {
    if (perSideRemaining >= plate.plateKg - 0.001) {
      const count = Math.floor((perSideRemaining + 0.0001) / plate.plateKg);
      if (count > 0) {
        platesPerSide.push({
          plateKg: plate.plateKg,
          count,
          colorName: plate.colorName,
          hexColor: plate.hexColor,
          textColor: plate.textColor,
          borderColor: plate.borderColor
        });
        perSideRemaining = +(perSideRemaining - count * plate.plateKg).toFixed(3);
      }
    }
  }

  const loadedPerSide = platesPerSide.reduce(
    (acc, p) => acc + p.plateKg * p.count,
    0
  );
  const actualTotalWeightKg = +(safeBar + loadedPerSide * 2).toFixed(1);
  const remainingKg = +(safeTarget - actualTotalWeightKg).toFixed(2);

  const breakdownSummary =
    platesPerSide.length > 0
      ? platesPerSide.map((p) => `${p.count}× ${p.plateKg} kg`).join(', ')
      : 'Tanpa plate';

  return {
    targetWeightKg: safeTarget,
    barWeightKg: safeBar,
    weightPerSideKg: loadedPerSide,
    actualTotalWeightKg,
    platesPerSide,
    remainingKg,
    summaryText: `Per sisi: ${breakdownSummary} (Total: ${actualTotalWeightKg} kg)`
  };
}

// ==========================================
// 2. PREVIOUS SESSION GHOST VALUES EXTRACTOR
// ==========================================

export interface PreviousGhostValue {
  weightKg: number;
  reps: number;
  sessionDate: string;
  sourceText: string;
}

/**
 * Searches the member's historical session records in reverse chronological order
 * to find the most recent completed set for the given exercise.
 */
export function getPreviousSessionGhostValues(
  client: ClientProfile | undefined | null,
  exerciseName: string
): PreviousGhostValue | null {
  if (!client || !client.sessions || client.sessions.length === 0 || !exerciseName) {
    return null;
  }

  const cleanQuery = exerciseName.trim().toLowerCase();

  // Sort sessions descending by date if available, or scan in reverse
  const sessions = [...client.sessions].sort((a, b) => {
    return (b.date || '').localeCompare(a.date || '');
  });

  for (const session of sessions) {
    if (!session.exercises || session.exercises.length === 0) continue;

    for (const ex of session.exercises) {
      const match =
        ex.name.trim().toLowerCase() === cleanQuery ||
        ex.name.trim().toLowerCase().includes(cleanQuery) ||
        cleanQuery.includes(ex.name.trim().toLowerCase());

      if (match && ex.sets && ex.sets.length > 0) {
        // Pick the set with the highest weight, or the first valid set
        const validSets = ex.sets.filter((s) => s.weightKg > 0 && s.reps > 0);
        if (validSets.length > 0) {
          const topSet = [...validSets].sort((a, b) => b.weightKg - a.weightKg)[0];
          return {
            weightKg: topSet.weightKg,
            reps: topSet.reps,
            sessionDate: session.date,
            sourceText: `Sesi Lalu (${session.date}): ${topSet.weightKg} kg × ${topSet.reps} reps`
          };
        }
      }
    }
  }

  return null;
}

// ==========================================
// 3. BIOMECHANICAL EXERCISE SUBSTITUTION
// ==========================================

export interface ExerciseSubstitutionOption {
  name: string;
  equipment: 'Barbel' | 'Dumbbell' | 'Mesin / Cable' | 'Bodyweight';
  muscleTarget: string;
  movementPattern: 'Squat' | 'Hinge' | 'Push Horizontal' | 'Push Vertical' | 'Pull Horizontal' | 'Pull Vertical' | 'Lunge' | 'Isolation Core' | 'Isolation Arm';
  reason: string;
  weightRatioMultiplier: number; // e.g. 1.0 = same, 1.5 = machine can take 50% more weight
}

export const EXERCISE_SUBSTITUTION_MAP: Record<string, ExerciseSubstitutionOption[]> = {
  // Squat Pattern
  'barbell back squat': [
    {
      name: 'Hack Squat (Machine)',
      equipment: 'Mesin / Cable',
      muscleTarget: 'Quadriceps, Glutes',
      movementPattern: 'Squat',
      reason: 'Stabilisasi spinal terpandu mesin, beban fokus pada pemanjangan quad.',
      weightRatioMultiplier: 1.15
    },
    {
      name: 'Leg Press 45°',
      equipment: 'Mesin / Cable',
      muscleTarget: 'Quadriceps, Glutes',
      movementPattern: 'Squat',
      reason: 'Sangat ramah punggung bawah, mampu menampung overload mekanis tinggi.',
      weightRatioMultiplier: 1.6
    },
    {
      name: 'Goblet Squat (Dumbbell)',
      equipment: 'Dumbbell',
      muscleTarget: 'Quadriceps, Core',
      movementPattern: 'Squat',
      reason: 'Beban anterior mengaktifkan core anterior dan mobilitas dorsifleksi pergelangan kaki.',
      weightRatioMultiplier: 0.4
    }
  ],
  'leg press 45°': [
    {
      name: 'Hack Squat (Machine)',
      equipment: 'Mesin / Cable',
      muscleTarget: 'Quadriceps, Glutes',
      movementPattern: 'Squat',
      reason: 'Profil gerakan squat terpandu sudut tertutup.',
      weightRatioMultiplier: 0.75
    },
    {
      name: 'Barbell Back Squat',
      equipment: 'Barbel',
      muscleTarget: 'Quadriceps, Glutes, Core',
      movementPattern: 'Squat',
      reason: 'Gerakan free-weight multi-joint dengan aktivasi stabilisator tinggi.',
      weightRatioMultiplier: 0.6
    }
  ],

  // Push Horizontal Pattern
  'barbell bench press': [
    {
      name: 'Dumbbell Flat Bench Press',
      equipment: 'Dumbbell',
      muscleTarget: 'Pectoralis Major, Anterior Deltoid',
      movementPattern: 'Push Horizontal',
      reason: 'Rentang gerak (ROM) konvergen lebih luas dan kebebasan rotasi bahu/pergelangan.',
      weightRatioMultiplier: 0.8
    },
    {
      name: 'Machine Chest Press',
      equipment: 'Mesin / Cable',
      muscleTarget: 'Pectoralis Major',
      movementPattern: 'Push Horizontal',
      reason: 'Kurva resistensi konsisten hingga puncak kontraksi tanpa butuh spotter.',
      weightRatioMultiplier: 1.1
    },
    {
      name: 'Incline Dumbbell Press',
      equipment: 'Dumbbell',
      muscleTarget: 'Clavicular Head (Upper Chest)',
      movementPattern: 'Push Horizontal',
      reason: 'Fokus isolasi serat otot dada atas dengan sudut elevasi 30°.',
      weightRatioMultiplier: 0.75
    }
  ],

  // Pull Vertical Pattern
  'lat pulldown': [
    {
      name: 'Pull-Up (Assisted / Bodyweight)',
      equipment: 'Bodyweight',
      muscleTarget: 'Latissimus Dorsi, Biceps',
      movementPattern: 'Pull Vertical',
      reason: 'Gerakan closed-chain kinestetik murni dengan rekrutmen core tinggi.',
      weightRatioMultiplier: 0.9
    },
    {
      name: 'Straight-Arm Cable Pulldown',
      equipment: 'Mesin / Cable',
      muscleTarget: 'Latissimus Dorsi, Teres Major',
      movementPattern: 'Pull Vertical',
      reason: 'Isolasi serat lats tanpa kelelahan brachialis/biceps.',
      weightRatioMultiplier: 0.55
    },
    {
      name: 'Single-Arm Cable Lat Pulldown',
      equipment: 'Mesin / Cable',
      muscleTarget: 'Latissimus Dorsi (Iliac Division)',
      movementPattern: 'Pull Vertical',
      reason: 'Unilateral line of pull searah serat iliac lats.',
      weightRatioMultiplier: 0.45
    }
  ],

  // Hinge Pattern
  'romanian deadlift (rdl)': [
    {
      name: 'Dumbbell RDL',
      equipment: 'Dumbbell',
      muscleTarget: 'Hamstrings, Gluteus Maximus',
      movementPattern: 'Hinge',
      reason: 'Dumbbell dapat diposisikan di sisi paha, mengurangi momentum beban anterior.',
      weightRatioMultiplier: 0.85
    },
    {
      name: 'Seated Hamstring Leg Curl',
      equipment: 'Mesin / Cable',
      muscleTarget: 'Hamstrings (Knee Flexion)',
      movementPattern: 'Hinge',
      reason: 'Menargetkan hamstring pada posisi hip tertekuk untuk hipertrofi optimal.',
      weightRatioMultiplier: 0.7
    },
    {
      name: 'Glute-Ham Raise / 45° Back Extension',
      equipment: 'Bodyweight',
      muscleTarget: 'Posterior Chain',
      movementPattern: 'Hinge',
      reason: 'Sangat aman untuk lower back saat lumbar overload harus dihindari.',
      weightRatioMultiplier: 0.5
    }
  ],

  // Unilateral Leg Pattern
  'bulgarian split squat': [
    {
      name: 'Walking Lunges (Dumbbell)',
      equipment: 'Dumbbell',
      muscleTarget: 'Quadriceps, Glutes',
      movementPattern: 'Lunge',
      reason: 'Dinamika transfer langkah unipedal dengan stabilitas panggul tinggi.',
      weightRatioMultiplier: 0.9
    },
    {
      name: 'Single-Leg Leg Press',
      equipment: 'Mesin / Cable',
      muscleTarget: 'Quadriceps, Glutes',
      movementPattern: 'Lunge',
      reason: 'Menghilangkan kendala keseimbangan, murni mengisolasi kekuatan tungkai.',
      weightRatioMultiplier: 1.3
    },
    {
      name: 'Step-Up ke Box Tinggi',
      equipment: 'Dumbbell',
      muscleTarget: 'Gluteus Maximus, Hamstring',
      movementPattern: 'Lunge',
      reason: 'Konsentrik murni dari ekstensi panggul tanpa momentum rebound.',
      weightRatioMultiplier: 0.8
    }
  ]
};

/**
 * Returns 2-4 biomechanical substitutions for any given exercise.
 * If exercise is not in the explicit catalog, searches via fuzzy keyword matching.
 */
export function getExerciseSubstitutions(exerciseName: string): ExerciseSubstitutionOption[] {
  if (!exerciseName) return [];
  const cleanName = exerciseName.trim().toLowerCase();

  // 1. Direct match
  if (EXERCISE_SUBSTITUTION_MAP[cleanName]) {
    return EXERCISE_SUBSTITUTION_MAP[cleanName];
  }

  // 2. Partial key match
  for (const [key, subs] of Object.entries(EXERCISE_SUBSTITUTION_MAP)) {
    if (cleanName.includes(key) || key.includes(cleanName)) {
      return subs;
    }
  }

  // 3. Keyword heuristic match
  if (cleanName.includes('squat')) {
    return EXERCISE_SUBSTITUTION_MAP['barbell back squat'];
  }
  if (cleanName.includes('bench') || cleanName.includes('press') || cleanName.includes('dada')) {
    return EXERCISE_SUBSTITUTION_MAP['barbell bench press'];
  }
  if (cleanName.includes('pull') || cleanName.includes('row') || cleanName.includes('tarik')) {
    return EXERCISE_SUBSTITUTION_MAP['lat pulldown'];
  }
  if (cleanName.includes('deadlift') || cleanName.includes('rdl') || cleanName.includes('hamstring')) {
    return EXERCISE_SUBSTITUTION_MAP['romanian deadlift (rdl)'];
  }
  if (cleanName.includes('lunge') || cleanName.includes('split') || cleanName.includes('step')) {
    return EXERCISE_SUBSTITUTION_MAP['bulgarian split squat'];
  }

  // 4. General fallback
  return [
    {
      name: `${exerciseName} (Alternatif Mesin)`,
      equipment: 'Mesin / Cable',
      muscleTarget: 'Target Otot Utama',
      movementPattern: 'Push Horizontal',
      reason: 'Alternatif mesin terpandu saat rack/barbel sedang dipakai.',
      weightRatioMultiplier: 1.0
    },
    {
      name: `${exerciseName} (Alternatif Dumbbell)`,
      equipment: 'Dumbbell',
      muscleTarget: 'Target Otot Utama',
      movementPattern: 'Push Horizontal',
      reason: 'Alternatif free-weight unilateral dumbbell dengan ROM bebas.',
      weightRatioMultiplier: 0.85
    }
  ];
}


/**
 * Calculates Estimated 1RM (One-Rep Max) using the Epley formula:
 * 1RM = Weight (kg) * (1 + Reps / 30)
 *
 * Domain Invariants (AGENTS.md Section 5.1):
 * - If weightKg <= 0 or reps <= 0, returns 0.
 * - If reps === 1, returns exact weightKg (1RM = Beban).
 * - Only computes for reps between 1 and 30 (clamps reps > 30 to 30).
 */
export function calculateEpley1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0 || Number.isNaN(weightKg) || Number.isNaN(reps)) {
    return 0;
  }
  const clampedReps = Math.min(30, Math.floor(reps));
  if (clampedReps === 1) {
    return +weightKg.toFixed(1);
  }
  return +(weightKg * (1 + clampedReps / 30)).toFixed(1);
}

/**
 * Extracts the strongest PR set from a logged exercise's set array.
 * When an athlete logs multiple sets marked `isPR: true` in the same exercise,
 * selects the set with the highest estimated 1RM (and highest weight on ties)
 * rather than arbitrarily picking the first set.
 */
export function extractBestPRSet(
  sets: LoggedSetInput[],
  historicalBestKg: number
): BestPRSetResult | null {
  const prSets = sets.filter((s) => s.isPR && s.weightKg > 0 && s.reps > 0);
  if (prSets.length === 0) {
    return null;
  }

  let bestSet = prSets[0];
  let best1RM = calculateEpley1RM(bestSet.weightKg, bestSet.reps);

  for (let i = 1; i < prSets.length; i++) {
    const candidate = prSets[i];
    const candidate1RM = calculateEpley1RM(candidate.weightKg, candidate.reps);
    if (
      candidate1RM > best1RM ||
      (candidate1RM === best1RM && candidate.weightKg > bestSet.weightKg)
    ) {
      bestSet = candidate;
      best1RM = candidate1RM;
    }
  }

  const rawDelta = +(bestSet.weightKg - (historicalBestKg || 0)).toFixed(1);
  const deltaKg = rawDelta > 0 ? rawDelta : 2.5;

  return {
    weightKg: bestSet.weightKg,
    reps: bestSet.reps,
    est1RM: best1RM,
    deltaKg
  };
}

/**
 * Calculates baseline daily calories & protein targets per AGENTS.md Section 5.2:
 * - Fat Loss: Calories = Weight * 26 kcal, Protein = 2.0g * Weight
 * - Hipertrofi: Calories = Weight * 34 kcal, Protein = 2.0g * Weight
 * - Powerlifting: Calories = Weight * 32 kcal, Protein = 2.2g * Weight
 */
export function calculateBaselineMacros(
  goal: 'Fat Loss' | 'Hipertrofi' | 'Powerlifting',
  weightKg: number
): { calories: number; proteinGrams: number } {
  const safeWeight = Math.max(0, weightKg);
  switch (goal) {
    case 'Fat Loss':
      return {
        calories: Math.round(safeWeight * 26),
        proteinGrams: Math.round(safeWeight * 2.0)
      };
    case 'Hipertrofi':
      return {
        calories: Math.round(safeWeight * 34),
        proteinGrams: Math.round(safeWeight * 2.0)
      };
    case 'Powerlifting':
      return {
        calories: Math.round(safeWeight * 32),
        proteinGrams: Math.round(safeWeight * 2.2)
      };
  }
}

/**
 * Advances or calibrates the client's weekly biometric trend while strictly
 * preserving the M1 baseline checkpoint intact.
 */
export function advanceBiometricTrend(
  existingTrend: WeeklyBiometricPoint[] | undefined,
  baseline: {
    weightKg: number;
    bodyFatPct: number;
    muscleMassKg: number;
    waistCm: number;
  },
  calibrated: {
    weightKg: number;
    bodyFatPct: number;
    muscleMassKg: number;
    waistCm: number;
  }
): WeeklyBiometricPoint[] {
  const nextTrend = [...(existingTrend || [])];
  const latestLabel =
    nextTrend.length <= 1 ? 'M8' : nextTrend[nextTrend.length - 1].weekLabel || 'M8';

  const newPoint: WeeklyBiometricPoint = {
    weekLabel: latestLabel,
    weightKg: calibrated.weightKg,
    bodyFatPct: calibrated.bodyFatPct,
    muscleMassKg: calibrated.muscleMassKg,
    waistCm: calibrated.waistCm
  };

  if (nextTrend.length === 0) {
    nextTrend.push({
      weekLabel: 'M1',
      weightKg: baseline.weightKg || calibrated.weightKg,
      bodyFatPct: baseline.bodyFatPct || calibrated.bodyFatPct,
      muscleMassKg: baseline.muscleMassKg || calibrated.muscleMassKg,
      waistCm: baseline.waistCm || calibrated.waistCm
    });
    nextTrend.push(newPoint);
  } else if (nextTrend.length === 1) {
    // Preserve baseline M1 intact, append calibrated checkpoint
    nextTrend.push(newPoint);
  } else {
    // Update latest checkpoint while preserving M1..M(n-1)
    nextTrend[nextTrend.length - 1] = newPoint;
  }

  return nextTrend;
}
