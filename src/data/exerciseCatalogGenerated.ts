export type ExerciseCategory = 'Free Weights' | 'Kabel/Mesin' | 'Kalistenik' | 'Kardio/Fungsional';

export interface CatalogExercise {
  id: string;
  name: string;
  nameMs?: string;
  slug?: string;
  category: ExerciseCategory;
  primaryMuscle: string;
  targetMuscles?: string;
  movementPattern?: string;
  mechanicsType?: 'compound' | 'isolation' | 'endurance';
  equipment?: string[];
  visualGuideUrl?: string | null;
  defaultTempo: string;
  defaultRestSeconds: number;
  defaultBestKg: number;
  isUnilateral?: boolean;
}

export const EXERCISE_CATALOG: CatalogExercise[] = [
  {
    "id": "ex-01",
    "name": "Barbell Bench Press",
    "nameMs": "Tekan Dada Rata",
    "slug": "flat-bench-press",
    "category": "Free Weights",
    "primaryMuscle": "Chest (Dada)",
    "targetMuscles": "Pectoralis Major, Triceps Brachii, Anterior Deltoid",
    "movementPattern": "horizontal_push",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://exrx.net/WeightExercises/PectoralSternal/BBBenchPress",
    "equipment": [
      "Barbell & Flat Bench",
      "Smith Machine"
    ],
    "defaultTempo": "2-1-X-1",
    "defaultRestSeconds": 90,
    "defaultBestKg": 82.5,
    "isUnilateral": false
  },
  {
    "id": "ex-02",
    "name": "Incline Bench Press / Dumbbell Press",
    "nameMs": "Tekan Dada Condong Atas",
    "slug": "incline-chest-press",
    "category": "Free Weights",
    "primaryMuscle": "Chest (Dada)",
    "targetMuscles": "Pectoralis Major (Clavicular Head), Anterior Deltoid",
    "movementPattern": "horizontal_push",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://exrx.net/WeightExercises/PectoralClavicular/BBInclineBenchPress",
    "equipment": [
      "Incline Bench Press",
      "Incline Chest Press Machine"
    ],
    "defaultTempo": "2-1-X-1",
    "defaultRestSeconds": 90,
    "defaultBestKg": 65,
    "isUnilateral": false
  },
  {
    "id": "ex-03",
    "name": "Decline Bench Press",
    "nameMs": "Tekan Dada Condong Bawah",
    "slug": "decline-chest-press",
    "category": "Free Weights",
    "primaryMuscle": "Chest (Dada)",
    "targetMuscles": "Pectoralis Major (Sternal/Costal Head), Triceps",
    "movementPattern": "horizontal_push",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://exrx.net/WeightExercises/PectoralSternal/LVDeclineChestPress",
    "equipment": [
      "Decline Bench",
      "Decline Chest Press Machine"
    ],
    "defaultTempo": "2-1-X-1",
    "defaultRestSeconds": 90,
    "defaultBestKg": 75,
    "isUnilateral": false
  },
  {
    "id": "ex-04",
    "name": "Chest Fly (Pec Deck)",
    "nameMs": "Bukaan Dada (Pec Deck)",
    "slug": "pec-deck-chest-fly",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Chest (Dada)",
    "targetMuscles": "Pectoralis Major (Sternal Head)",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/pec-deck-fly/",
    "equipment": [
      "Pec Deck / Fly Machine",
      "Cable Crossover Station"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-05",
    "name": "Chest Dips",
    "nameMs": "Tolak Tubuh / Selaman Dada",
    "slug": "chest-dips",
    "category": "Kalistenik",
    "primaryMuscle": "Chest (Dada)",
    "targetMuscles": "Pectoralis Major (Lower), Triceps, Anterior Deltoid",
    "movementPattern": "vertical_push",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://exrx.net/WeightExercises/PectoralSternal/BWChestDip",
    "equipment": [
      "Dip Station / Parallel Bars",
      "Assisted Dip & Pull-Up Machine"
    ],
    "defaultTempo": "2-1-X-1",
    "defaultRestSeconds": 90,
    "defaultBestKg": 60,
    "isUnilateral": false
  },
  {
    "id": "ex-06",
    "name": "Cable Crossover",
    "nameMs": "Tarikan Kabel Silang",
    "slug": "cable-crossover",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Chest (Dada)",
    "targetMuscles": "Pectoralis Major (Sternal & Clavicular)",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/cable-crossover/",
    "equipment": [
      "Cable Crossover Station"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-07",
    "name": "Lat Pulldown (Wide Neutral Grip)",
    "nameMs": "Tarikan Atas Sayap",
    "slug": "lat-pulldown",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Back (Punggung / Belakang)",
    "targetMuscles": "Latissimus Dorsi, Teres Major, Biceps Brachii",
    "movementPattern": "vertical_pull",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://bellsofsteel.com/blogs/content/how-to-use-a-lat-pulldown-machine-comprehensive-guide",
    "equipment": [
      "Lat Pulldown Machine"
    ],
    "defaultTempo": "2-1-2-1",
    "defaultRestSeconds": 90,
    "defaultBestKg": 75,
    "isUnilateral": false
  },
  {
    "id": "ex-08",
    "name": "Seated Cable Row (V-Bar)",
    "nameMs": "Dayungan Duduk Kabel",
    "slug": "seated-cable-row",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Back (Punggung / Belakang)",
    "targetMuscles": "Rhomboids, Middle Trapezius, Latissimus Dorsi",
    "movementPattern": "horizontal_pull",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://exrx.net/WeightExercises/BackGeneral/CBSeatedRow",
    "equipment": [
      "Seated Cable Row Machine"
    ],
    "defaultTempo": "2-1-2-1",
    "defaultRestSeconds": 90,
    "defaultBestKg": 70,
    "isUnilateral": false
  },
  {
    "id": "ex-09",
    "name": "T-Bar Row",
    "nameMs": "Dayungan Palang-T",
    "slug": "t-bar-row",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Back (Punggung / Belakang)",
    "targetMuscles": "Latissimus Dorsi, Rhomboids, Trapezius, Erector Spinae",
    "movementPattern": "horizontal_pull",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://exrx.net/WeightExercises/BackGeneral/LVTBarRow",
    "equipment": [
      "T-Bar Row Machine / Landmine"
    ],
    "defaultTempo": "2-1-2-1",
    "defaultRestSeconds": 90,
    "defaultBestKg": 65,
    "isUnilateral": false
  },
  {
    "id": "ex-10",
    "name": "Chest-Supported Row",
    "nameMs": "Dayungan Sokong Dada",
    "slug": "chest-supported-row",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Back (Punggung / Belakang)",
    "targetMuscles": "Upper Latissimus, Rhomboids, Rear Deltoids",
    "movementPattern": "horizontal_pull",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/chest-supported-dumbbell-row/",
    "equipment": [
      "Chest-Supported Row Machine"
    ],
    "defaultTempo": "2-1-2-1",
    "defaultRestSeconds": 90,
    "defaultBestKg": 65,
    "isUnilateral": false
  },
  {
    "id": "ex-11",
    "name": "Deadlift",
    "nameMs": "Angkat Mati",
    "slug": "barbell-deadlift",
    "category": "Free Weights",
    "primaryMuscle": "Back (Punggung / Belakang)",
    "targetMuscles": "Erector Spinae, Gluteus Maximus, Hamstrings, Traps",
    "movementPattern": "hinge",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://exrx.net/WeightExercises/GluteusMaximus/BBDeadlift",
    "equipment": [
      "Power Rack & Barbell",
      "Trap Bar / Hex Bar"
    ],
    "defaultTempo": "3-1-X-1",
    "defaultRestSeconds": 120,
    "defaultBestKg": 100,
    "isUnilateral": false
  },
  {
    "id": "ex-12",
    "name": "Hyperextension",
    "nameMs": "Lentik Belakang / Ekstensi",
    "slug": "hyperextension-back-raise",
    "category": "Kalistenik",
    "primaryMuscle": "Back (Punggung / Belakang)",
    "targetMuscles": "Erector Spinae, Gluteus Maximus, Hamstrings",
    "movementPattern": "hinge",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/ErectorSpinae/BWHyperextension",
    "equipment": [
      "Roman Chair / 45-Degree Bench"
    ],
    "defaultTempo": "3-1-X-1",
    "defaultRestSeconds": 120,
    "defaultBestKg": 100,
    "isUnilateral": false
  },
  {
    "id": "ex-13",
    "name": "Overhead Barbell Press (OHP)",
    "nameMs": "Tolak Bahu Tegak",
    "slug": "overhead-shoulder-press",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Shoulders (Bahu)",
    "targetMuscles": "Anterior Deltoid, Lateral Deltoid, Triceps Brachii",
    "movementPattern": "vertical_push",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://exrx.net/WeightExercises/DeltoidAnterior/LVOverheadPress",
    "equipment": [
      "Overhead Shoulder Press Machine",
      "Smith Machine"
    ],
    "defaultTempo": "2-1-X-1",
    "defaultRestSeconds": 90,
    "defaultBestKg": 52.5,
    "isUnilateral": false
  },
  {
    "id": "ex-14",
    "name": "Lateral Raise",
    "nameMs": "Angkat Bahu Sisi",
    "slug": "lateral-raise",
    "category": "Free Weights",
    "primaryMuscle": "Shoulders (Bahu)",
    "targetMuscles": "Lateral Deltoid",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/DeltoidLateral/LVLateralRaise",
    "equipment": [
      "Dumbbells",
      "Adjustable Cable Tower"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-15",
    "name": "Front Raise",
    "nameMs": "Angkat Hadapan",
    "slug": "cable-front-raise",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Shoulders (Bahu)",
    "targetMuscles": "Anterior Deltoid",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/DeltoidAnterior/CBFrontRaise",
    "equipment": [
      "Adjustable Cable Tower",
      "Dumbbells"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-16",
    "name": "Reverse Fly (Rear Delt)",
    "nameMs": "Bukaan Bahu Belakang",
    "slug": "reverse-pec-deck-fly",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Shoulders (Bahu)",
    "targetMuscles": "Posterior Deltoid, Infraspinatus, Rhomboids",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/reverse-machine-fly/",
    "equipment": [
      "Pec Deck / Fly Machine",
      "Cable Crossover Station"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-17",
    "name": "Face Pull",
    "nameMs": "Tarik Muka",
    "slug": "cable-face-pull",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Shoulders (Bahu)",
    "targetMuscles": "Posterior Deltoid, Rotator Cuff, Upper Trapezius",
    "movementPattern": "horizontal_pull",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://exrx.net/WeightExercises/DeltoidPosterior/CBFacePull",
    "equipment": [
      "Adjustable Cable Tower"
    ],
    "defaultTempo": "2-1-2-1",
    "defaultRestSeconds": 90,
    "defaultBestKg": 65,
    "isUnilateral": false
  },
  {
    "id": "ex-18",
    "name": "Shrugs",
    "nameMs": "Angkat Bahu (Traps)",
    "slug": "shrugs",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Shoulders (Bahu)",
    "targetMuscles": "Upper Trapezius, Levator Scapulae",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/TrapeziusUpper/SMShrug",
    "equipment": [
      "Smith Machine",
      "Trap Bar / Hex Bar"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-19",
    "name": "Bicep Curl (Cable/Machine)",
    "nameMs": "Lenturan Biceps Mesin/Kabel",
    "slug": "machine-bicep-curl",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Arms (Lengan)",
    "targetMuscles": "Biceps Brachii, Brachialis",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/Biceps/LVPreacherCurl",
    "equipment": [
      "Adjustable Cable Tower"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-20",
    "name": "Preacher Curl",
    "nameMs": "Lenturan Bangku Preacher",
    "slug": "preacher-curl",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Arms (Lengan)",
    "targetMuscles": "Biceps Brachii (Short Head / Peak)",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/preacher-curl/",
    "equipment": [
      "Preacher Curl Bench & Machine",
      "EZ Curl Bar"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-21",
    "name": "Hammer Curl",
    "nameMs": "Lenturan Tukul",
    "slug": "rope-hammer-curl",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Arms (Lengan)",
    "targetMuscles": "Brachialis, Brachioradialis",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/Brachioradialis/CBRopeHammerCurl",
    "equipment": [
      "Adjustable Cable Tower",
      "Dumbbells"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-22",
    "name": "Tricep Pushdown",
    "nameMs": "Tolak Bawah Tricep",
    "slug": "tricep-pushdown",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Arms (Lengan)",
    "targetMuscles": "Triceps Brachii (Lateral & Medial Heads)",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/Triceps/CBPushdown",
    "equipment": [
      "Adjustable Cable Tower"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-23",
    "name": "Skull Crusher (Lying Ext.)",
    "nameMs": "Ekstensi Tricep Baring",
    "slug": "lying-tricep-extension",
    "category": "Free Weights",
    "primaryMuscle": "Arms (Lengan)",
    "targetMuscles": "Triceps Brachii (Long Head)",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/Triceps/BBLyingTriExt",
    "equipment": [
      "EZ Curl Bar",
      "Smith Machine"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-24",
    "name": "Overhead Cable Tricep Extension",
    "nameMs": "Ekstensi Tricep Atas Kepala",
    "slug": "overhead-cable-tricep-ext",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Arms (Lengan)",
    "targetMuscles": "Triceps Brachii (Long Head in Full Stretch)",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/cable-overhead-triceps-extension/",
    "equipment": [
      "Adjustable Cable Tower"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-25",
    "name": "Wrist Curl",
    "nameMs": "Lenturan Pergelangan Tangan",
    "slug": "wrist-curl",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Forearms & Grip (Lengan Bawah & Genggaman)",
    "targetMuscles": "Wrist Flexors, Flexor Digitorum",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/WristFlexors/CBWristCurl",
    "equipment": [
      "Adjustable Cable Tower"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-26",
    "name": "Reverse Wrist Curl",
    "nameMs": "Lenturan Songsang Pergelangan",
    "slug": "reverse-wrist-curl",
    "category": "Free Weights",
    "primaryMuscle": "Forearms & Grip (Lengan Bawah & Genggaman)",
    "targetMuscles": "Wrist Extensors",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/WristExtensors/BBReverseWristCurl",
    "equipment": [
      "Barbell & Flat Bench"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-27",
    "name": "Farmers Walk / Carry",
    "nameMs": "Jalan Membawa Beban",
    "slug": "farmers-walk",
    "category": "Free Weights",
    "primaryMuscle": "Forearms & Grip (Lengan Bawah & Genggaman)",
    "targetMuscles": "Forearms, Grip, Trapezius, Core",
    "movementPattern": "conditioning",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/farmers-walk/",
    "equipment": [
      "Trap Bar / Hex Bar",
      "Dumbbells"
    ],
    "defaultTempo": "1-0-1-0",
    "defaultRestSeconds": 45,
    "defaultBestKg": 0,
    "isUnilateral": false
  },
  {
    "id": "ex-28",
    "name": "Wrist Roller",
    "nameMs": "Gulungan Tali Beban",
    "slug": "wrist-roller",
    "category": "Kardio/Fungsional",
    "primaryMuscle": "Forearms & Grip (Lengan Bawah & Genggaman)",
    "targetMuscles": "Wrist Flexors and Extensors",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/WristFlexors/WristRoller",
    "equipment": [
      "Wrist Roller"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-29",
    "name": "Leg Press 45°",
    "nameMs": "Tolak Kaki 45 Darjah",
    "slug": "leg-press-45",
    "category": "Free Weights",
    "primaryMuscle": "Legs (Kaki)",
    "targetMuscles": "Quadriceps, Gluteus Maximus, Adductor Magnus",
    "movementPattern": "squat",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://pulsefitness.com/product/45-degree-leg-press-581h-aaa/",
    "equipment": [
      "45-Degree Leg Press Machine"
    ],
    "defaultTempo": "3-1-X-1",
    "defaultRestSeconds": 120,
    "defaultBestKg": 180,
    "isUnilateral": false
  },
  {
    "id": "ex-30",
    "name": "Hack Squat Machine",
    "nameMs": "Mencangkung Hack",
    "slug": "hack-squat",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Legs (Kaki)",
    "targetMuscles": "Quadriceps (Vastus Lateralis, Vastus Medialis)",
    "movementPattern": "squat",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://bellsofsteel.com/blogs/content/how-to-use-hack-squat-machine",
    "equipment": [
      "Hack Squat Machine"
    ],
    "defaultTempo": "3-1-X-1",
    "defaultRestSeconds": 120,
    "defaultBestKg": 130,
    "isUnilateral": false
  },
  {
    "id": "ex-31",
    "name": "Barbell Back Squat",
    "nameMs": "Mencangkung Barbell",
    "slug": "barbell-back-squat",
    "category": "Free Weights",
    "primaryMuscle": "Legs (Kaki)",
    "targetMuscles": "Quadriceps, Gluteus Maximus, Hamstrings, Core",
    "movementPattern": "squat",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://exrx.net/WeightExercises/Quadriceps/BBSquat",
    "equipment": [
      "Power Rack & Barbell"
    ],
    "defaultTempo": "3-1-X-1",
    "defaultRestSeconds": 120,
    "defaultBestKg": 110,
    "isUnilateral": false
  },
  {
    "id": "ex-32",
    "name": "Leg Extension",
    "nameMs": "Ekstensi Lutut / Kaki",
    "slug": "seated-leg-extension",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Legs (Kaki)",
    "targetMuscles": "Quadriceps (Rectus Femoris isolation)",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/Quadriceps/LVLegExtension",
    "equipment": [
      "Leg Extension Machine"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-33",
    "name": "Lying Leg Curl Machine",
    "nameMs": "Lenturan Kaki Baring",
    "slug": "lying-leg-curl",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Legs (Kaki)",
    "targetMuscles": "Hamstrings (Biceps Femoris, Semitendinosus)",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/Hamstrings/LVLyingLegCurl",
    "equipment": [
      "Lying Leg Curl Machine"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 55,
    "isUnilateral": false
  },
  {
    "id": "ex-34",
    "name": "Leg Curl (Seated)",
    "nameMs": "Lenturan Kaki Duduk",
    "slug": "seated-leg-curl",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Legs (Kaki)",
    "targetMuscles": "Hamstrings (Stretched Position)",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/Hamstrings/LVSeatedLegCurl",
    "equipment": [
      "Seated Leg Curl Machine"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-35",
    "name": "Hip Thrust",
    "nameMs": "Tolak Pinggul",
    "slug": "hip-thrust",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Legs (Kaki)",
    "targetMuscles": "Gluteus Maximus",
    "movementPattern": "hinge",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/barbell-hip-thrust/",
    "equipment": [
      "Hip Thrust Machine",
      "Barbell & Flat Bench"
    ],
    "defaultTempo": "3-1-X-1",
    "defaultRestSeconds": 120,
    "defaultBestKg": 100,
    "isUnilateral": false
  },
  {
    "id": "ex-36",
    "name": "Hip Abduction",
    "nameMs": "Buka Peha",
    "slug": "hip-abduction",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Legs (Kaki)",
    "targetMuscles": "Gluteus Medius, Gluteus Minimus, Tensor Fasciae Latae",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/GluteusMedius/LVSeatedHipAbduction",
    "equipment": [
      "Seated Hip Abductor Machine"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-37",
    "name": "Hip Adduction",
    "nameMs": "Rapat Peha",
    "slug": "hip-adduction",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Legs (Kaki)",
    "targetMuscles": "Adductor Longus, Adductor Magnus, Gracilis",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/Adductors/LVSeatedHipAdduction",
    "equipment": [
      "Seated Hip Adductor Machine"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-38",
    "name": "Calf Raise",
    "nameMs": "Angkat Betis / Menjengket",
    "slug": "calf-raise",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Legs (Kaki)",
    "targetMuscles": "Gastrocnemius, Soleus",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/Gastrocnemius/LVStandingCalfRaise",
    "equipment": [
      "Standing Calf Raise Machine",
      "Seated Calf Raise Machine"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-39",
    "name": "Pendulum Squat",
    "nameMs": "Mencangkung Bandul",
    "slug": "pendulum-squat",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Legs (Kaki)",
    "targetMuscles": "Quadriceps (Deep Knee Flexion)",
    "movementPattern": "squat",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/pendulum-squat/",
    "equipment": [
      "Pendulum Squat Machine"
    ],
    "defaultTempo": "3-1-X-1",
    "defaultRestSeconds": 120,
    "defaultBestKg": 100,
    "isUnilateral": false
  },
  {
    "id": "ex-40",
    "name": "Belt Squat",
    "nameMs": "Mencangkung Tali Pinggang",
    "slug": "belt-squat",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Legs (Kaki)",
    "targetMuscles": "Quadriceps, Glutes",
    "movementPattern": "squat",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/belt-squat/",
    "equipment": [
      "Belt Squat Machine"
    ],
    "defaultTempo": "3-1-X-1",
    "defaultRestSeconds": 120,
    "defaultBestKg": 100,
    "isUnilateral": false
  },
  {
    "id": "ex-41",
    "name": "Sissy Squat",
    "nameMs": "Mencangkung Sissy",
    "slug": "sissy-squat",
    "category": "Kalistenik",
    "primaryMuscle": "Legs (Kaki)",
    "targetMuscles": "Rectus Femoris (Quad Peak Tension)",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/Quadriceps/BWSissySquat",
    "equipment": [
      "Sissy Squat Bench"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-42",
    "name": "Glute-Ham Raise (GHR)",
    "nameMs": "Angkat Paha & Punggung (GHR)",
    "slug": "glute-ham-raise",
    "category": "Kalistenik",
    "primaryMuscle": "Legs (Kaki)",
    "targetMuscles": "Hamstrings, Gluteus Maximus, Gastrocnemius",
    "movementPattern": "hinge",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/glute-ham-raise/",
    "equipment": [
      "Glute-Ham Developer (GHD)"
    ],
    "defaultTempo": "3-1-X-1",
    "defaultRestSeconds": 120,
    "defaultBestKg": 100,
    "isUnilateral": false
  },
  {
    "id": "ex-43",
    "name": "Reverse Hyperextension",
    "nameMs": "Lentik Belakang Songsang",
    "slug": "reverse-hyperextension",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Legs (Kaki)",
    "targetMuscles": "Glutes, Hamstrings, Lumbar Decompression",
    "movementPattern": "hinge",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/reverse-hyper/",
    "equipment": [
      "Reverse Hyperextension Machine"
    ],
    "defaultTempo": "3-1-X-1",
    "defaultRestSeconds": 120,
    "defaultBestKg": 100,
    "isUnilateral": false
  },
  {
    "id": "ex-44",
    "name": "Standing Leg Curl",
    "nameMs": "Lenturan Kaki Berdiri",
    "slug": "standing-leg-curl",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Legs (Kaki)",
    "targetMuscles": "Hamstrings (Unilateral)",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/Hamstrings/LVStandingLegCurl",
    "equipment": [
      "Standing Single-Leg Curl Machine"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-45",
    "name": "Cable Crunch",
    "nameMs": "Rengkuk Kabel",
    "slug": "cable-crunch",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Core & Abs (Abdomen & Teras)",
    "targetMuscles": "Rectus Abdominis",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/RectusAbdominis/CBKneelingCrunch",
    "equipment": [
      "Adjustable Cable Tower"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-46",
    "name": "Abdominal Crunch Machine",
    "nameMs": "Mesin Rengkuk Perut",
    "slug": "machine-abdominal-crunch",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Core & Abs (Abdomen & Teras)",
    "targetMuscles": "Rectus Abdominis (Upper & Mid)",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/RectusAbdominis/LVSeatedCrunch",
    "equipment": [
      "Seated Ab Crunch Machine"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-47",
    "name": "Hanging Leg Raise (Strict)",
    "nameMs": "Gantung Angkat Kaki",
    "slug": "hanging-leg-raise",
    "category": "Kalistenik",
    "primaryMuscle": "Core & Abs (Abdomen & Teras)",
    "targetMuscles": "Rectus Abdominis (Lower), Iliopsoas",
    "movementPattern": "isolation",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://exrx.net/WeightExercises/RectusAbdominis/BWHangingLegRaise",
    "equipment": [
      "Captains Chair / Power Tower"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 0,
    "isUnilateral": false
  },
  {
    "id": "ex-48",
    "name": "Cable Woodchopper",
    "nameMs": "Hayunan Pemotong Kayu",
    "slug": "cable-woodchopper",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Core & Abs (Abdomen & Teras)",
    "targetMuscles": "Internal and External Obliques, Transverse Abdominis",
    "movementPattern": "dynamic",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/cable-woodchopper/",
    "equipment": [
      "Adjustable Cable Tower"
    ],
    "defaultTempo": "1-0-1-0",
    "defaultRestSeconds": 45,
    "defaultBestKg": 0,
    "isUnilateral": false
  },
  {
    "id": "ex-49",
    "name": "Rotary Torso Twist",
    "nameMs": "Putaran Batang Tubuh",
    "slug": "rotary-torso-twist",
    "category": "Kabel/Mesin",
    "primaryMuscle": "Core & Abs (Abdomen & Teras)",
    "targetMuscles": "Internal and External Obliques",
    "movementPattern": "isolation",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/Obliques/LVSeatedTwist",
    "equipment": [
      "Rotary Torso Machine"
    ],
    "defaultTempo": "2-0-2-1",
    "defaultRestSeconds": 60,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-50",
    "name": "Clean and Jerk",
    "nameMs": "Angkat ke Bahu & Sentak Atas",
    "slug": "clean-and-jerk",
    "category": "Free Weights",
    "primaryMuscle": "Full Body / Dynamic (Seluruh Badan / Dinamik)",
    "targetMuscles": "Full Body: Quadriceps, Hamstrings, Glutes, Deltoids, Traps",
    "movementPattern": "dynamic",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://exrx.net/WeightExercises/OlympicLifts/CleanAndJerk",
    "equipment": [
      "Olympic Lifting Platform & Bumper Plates"
    ],
    "defaultTempo": "1-0-1-0",
    "defaultRestSeconds": 45,
    "defaultBestKg": 0,
    "isUnilateral": false
  },
  {
    "id": "ex-51",
    "name": "Snatch",
    "nameMs": "Sentap Pantas ke Atas Kepala",
    "slug": "snatch",
    "category": "Free Weights",
    "primaryMuscle": "Full Body / Dynamic (Seluruh Badan / Dinamik)",
    "targetMuscles": "Posterior Chain, Traps, Shoulders, Core Stabilizers",
    "movementPattern": "dynamic",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://exrx.net/WeightExercises/OlympicLifts/Snatch",
    "equipment": [
      "Olympic Lifting Platform & Bumper Plates"
    ],
    "defaultTempo": "1-0-1-0",
    "defaultRestSeconds": 45,
    "defaultBestKg": 0,
    "isUnilateral": false
  },
  {
    "id": "ex-52",
    "name": "Push Press",
    "nameMs": "Tolak Bahu Bantuan Kaki",
    "slug": "push-press",
    "category": "Free Weights",
    "primaryMuscle": "Full Body / Dynamic (Seluruh Badan / Dinamik)",
    "targetMuscles": "Deltoids, Triceps, Quadriceps, Core",
    "movementPattern": "vertical_push",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://exrx.net/WeightExercises/OlympicLifts/PushPress",
    "equipment": [
      "Power Rack & Barbell"
    ],
    "defaultTempo": "2-1-X-1",
    "defaultRestSeconds": 90,
    "defaultBestKg": 60,
    "isUnilateral": false
  },
  {
    "id": "ex-53",
    "name": "Sled / Prowler Push",
    "nameMs": "Tolak Kereta Sorong Beban",
    "slug": "sled-prowler-push",
    "category": "Kardio/Fungsional",
    "primaryMuscle": "Full Body / Dynamic (Seluruh Badan / Dinamik)",
    "targetMuscles": "Quadriceps, Glutes, Calves, Cardiovascular Capacity",
    "movementPattern": "conditioning",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/sled-push/",
    "equipment": [
      "Weight Sled / Prowler & Turf"
    ],
    "defaultTempo": "1-0-1-0",
    "defaultRestSeconds": 45,
    "defaultBestKg": 0,
    "isUnilateral": false
  },
  {
    "id": "ex-54",
    "name": "Sled Pull",
    "nameMs": "Tarik Kereta Sorong Beban",
    "slug": "sled-pull",
    "category": "Kardio/Fungsional",
    "primaryMuscle": "Full Body / Dynamic (Seluruh Badan / Dinamik)",
    "targetMuscles": "Hamstrings, Glutes, Latissimus Dorsi, Posterior Chain",
    "movementPattern": "conditioning",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/sled-pull/",
    "equipment": [
      "Weight Sled / Prowler & Turf"
    ],
    "defaultTempo": "1-0-1-0",
    "defaultRestSeconds": 45,
    "defaultBestKg": 0,
    "isUnilateral": false
  },
  {
    "id": "ex-55",
    "name": "Battle Ropes Wave",
    "nameMs": "Hayunan Tali Tempur",
    "slug": "battle-ropes-wave",
    "category": "Kardio/Fungsional",
    "primaryMuscle": "Full Body / Dynamic (Seluruh Badan / Dinamik)",
    "targetMuscles": "Deltoids, Biceps, Triceps, Core, Cardiovascular",
    "movementPattern": "conditioning",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/battle-rope/",
    "equipment": [
      "Battle Ropes"
    ],
    "defaultTempo": "1-0-1-0",
    "defaultRestSeconds": 45,
    "defaultBestKg": 0,
    "isUnilateral": false
  },
  {
    "id": "ex-56",
    "name": "Medicine Ball Slam",
    "nameMs": "Hempasan Bola Berat",
    "slug": "medicine-ball-slam",
    "category": "Kardio/Fungsional",
    "primaryMuscle": "Full Body / Dynamic (Seluruh Badan / Dinamik)",
    "targetMuscles": "Latissimus Dorsi, Rectus Abdominis, Shoulders",
    "movementPattern": "dynamic",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/medicine-ball-slam/",
    "equipment": [
      "Medicine / Slam Ball"
    ],
    "defaultTempo": "1-0-1-0",
    "defaultRestSeconds": 45,
    "defaultBestKg": 0,
    "isUnilateral": false
  },
  {
    "id": "ex-57",
    "name": "Tire Flip",
    "nameMs": "Balikkan Tayar Gergasi",
    "slug": "tire-flip",
    "category": "Kardio/Fungsional",
    "primaryMuscle": "Full Body / Dynamic (Seluruh Badan / Dinamik)",
    "targetMuscles": "Hamstrings, Glutes, Erector Spinae, Traps, Biceps",
    "movementPattern": "dynamic",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/tire-flip/",
    "equipment": [
      "Heavy Industrial Tire"
    ],
    "defaultTempo": "1-0-1-0",
    "defaultRestSeconds": 45,
    "defaultBestKg": 0,
    "isUnilateral": false
  },
  {
    "id": "ex-58",
    "name": "Weighted Pull-Up",
    "nameMs": "Tarik Badan Palang Tinggi",
    "slug": "pull-up-chin-up",
    "category": "Kalistenik",
    "primaryMuscle": "Back (Punggung / Belakang)",
    "targetMuscles": "Latissimus Dorsi, Teres Major, Biceps Brachii",
    "movementPattern": "vertical_pull",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://exrx.net/WeightExercises/LatissimusDorsi/BWPullup",
    "equipment": [
      "High Pull-Up Bar",
      "Assisted Dip & Pull-Up Machine"
    ],
    "defaultTempo": "2-1-2-1",
    "defaultRestSeconds": 90,
    "defaultBestKg": 20,
    "isUnilateral": false
  },
  {
    "id": "ex-59",
    "name": "Weighted Parallel Bar Dips",
    "nameMs": "Tolakan Palang Selari",
    "slug": "parallel-bar-dip",
    "category": "Kalistenik",
    "primaryMuscle": "Chest (Dada)",
    "targetMuscles": "Pectoralis Major, Triceps Brachii, Anterior Deltoid",
    "movementPattern": "vertical_push",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://exrx.net/WeightExercises/Triceps/BWDip",
    "equipment": [
      "Dip Station / Parallel Bars"
    ],
    "defaultTempo": "2-1-X-1",
    "defaultRestSeconds": 90,
    "defaultBestKg": 25,
    "isUnilateral": false
  },
  {
    "id": "ex-60",
    "name": "Inverted Row",
    "nameMs": "Dayungan Badan Songsang",
    "slug": "inverted-row",
    "category": "Kalistenik",
    "primaryMuscle": "Back (Punggung / Belakang)",
    "targetMuscles": "Upper Back, Rhomboids, Middle Trapezius, Biceps",
    "movementPattern": "horizontal_pull",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://exrx.net/WeightExercises/BackGeneral/BWSupineRow",
    "equipment": [
      "Suspension Trainer (TRX)"
    ],
    "defaultTempo": "2-1-2-1",
    "defaultRestSeconds": 90,
    "defaultBestKg": 65,
    "isUnilateral": false
  },
  {
    "id": "ex-61",
    "name": "Muscle-Up",
    "nameMs": "Tarik dan Naik Palang",
    "slug": "muscle-up",
    "category": "Kalistenik",
    "primaryMuscle": "Full Body / Dynamic (Seluruh Badan / Dinamik)",
    "targetMuscles": "Latissimus Dorsi, Pectoralis Major, Triceps, Core",
    "movementPattern": "dynamic",
    "mechanicsType": "compound",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/muscle-up/",
    "equipment": [
      "High Pull-Up Bar",
      "Gymnastic Rings"
    ],
    "defaultTempo": "1-0-1-0",
    "defaultRestSeconds": 45,
    "defaultBestKg": 0,
    "isUnilateral": false
  },
  {
    "id": "ex-62",
    "name": "Treadmill Running/Walking",
    "nameMs": "Berlari / Berjalan di Mesin",
    "slug": "treadmill-running",
    "category": "Kardio/Fungsional",
    "primaryMuscle": "Cardio & Conditioning (Kardio & Daya Tahan)",
    "targetMuscles": "Cardiovascular System, Quadriceps, Calves, Hamstrings",
    "movementPattern": "conditioning",
    "mechanicsType": "endurance",
    "visualGuideUrl": "https://exrx.net/Aerobic/Exercises/TreadmillRun",
    "equipment": [
      "Treadmill"
    ],
    "defaultTempo": "1-0-1-0",
    "defaultRestSeconds": 45,
    "defaultBestKg": 0,
    "isUnilateral": false
  },
  {
    "id": "ex-63",
    "name": "Stationary Cycling",
    "nameMs": "Mengayuh Basikal Pegun",
    "slug": "stationary-cycling",
    "category": "Kardio/Fungsional",
    "primaryMuscle": "Cardio & Conditioning (Kardio & Daya Tahan)",
    "targetMuscles": "Cardiovascular System, Quadriceps, Gluteus, Calves",
    "movementPattern": "conditioning",
    "mechanicsType": "endurance",
    "visualGuideUrl": "https://exrx.net/Aerobic/Exercises/StationaryBike",
    "equipment": [
      "Stationary Bike / Spin Bike"
    ],
    "defaultTempo": "1-0-1-0",
    "defaultRestSeconds": 45,
    "defaultBestKg": 0,
    "isUnilateral": false
  },
  {
    "id": "ex-64",
    "name": "Stair Climbing",
    "nameMs": "Mendaki Tangga Mesin",
    "slug": "stair-climbing",
    "category": "Kardio/Fungsional",
    "primaryMuscle": "Cardio & Conditioning (Kardio & Daya Tahan)",
    "targetMuscles": "Cardiovascular System, Gluteus Maximus, Quadriceps",
    "movementPattern": "conditioning",
    "mechanicsType": "endurance",
    "visualGuideUrl": "https://exrx.net/Aerobic/Exercises/StairClimber",
    "equipment": [
      "Stair Climber / StairMaster"
    ],
    "defaultTempo": "1-0-1-0",
    "defaultRestSeconds": 45,
    "defaultBestKg": 0,
    "isUnilateral": false
  },
  {
    "id": "ex-65",
    "name": "Rowing Machine Ergometer",
    "nameMs": "Mendayung di Mesin Dayung",
    "slug": "rowing-machine",
    "category": "Kardio/Fungsional",
    "primaryMuscle": "Cardio & Conditioning (Kardio & Daya Tahan)",
    "targetMuscles": "Full Body Aerobic/Anaerobic: Lats, Legs, Core",
    "movementPattern": "conditioning",
    "mechanicsType": "endurance",
    "visualGuideUrl": "https://exrx.net/Aerobic/Exercises/RowErgometer",
    "equipment": [
      "Rowing Machine (Ergometer)"
    ],
    "defaultTempo": "1-0-1-0",
    "defaultRestSeconds": 45,
    "defaultBestKg": 0,
    "isUnilateral": false
  },
  {
    "id": "ex-66",
    "name": "Elliptical Striding",
    "nameMs": "Senaman Mesin Elips",
    "slug": "elliptical-striding",
    "category": "Kardio/Fungsional",
    "primaryMuscle": "Cardio & Conditioning (Kardio & Daya Tahan)",
    "targetMuscles": "Cardiovascular System (Zero-Impact)",
    "movementPattern": "conditioning",
    "mechanicsType": "endurance",
    "visualGuideUrl": "https://exrx.net/Aerobic/Exercises/EllipticalTrainer",
    "equipment": [
      "Elliptical Cross Trainer"
    ],
    "defaultTempo": "1-0-1-0",
    "defaultRestSeconds": 45,
    "defaultBestKg": 0,
    "isUnilateral": false
  },
  {
    "id": "ex-67",
    "name": "Air Bike / Fan Bike Sprint",
    "nameMs": "Pecutan Basikal Udara",
    "slug": "air-bike-sprint",
    "category": "Kardio/Fungsional",
    "primaryMuscle": "Cardio & Conditioning (Kardio & Daya Tahan)",
    "targetMuscles": "Maximum Anaerobic Capacity, Full Body Muscular Endurance",
    "movementPattern": "conditioning",
    "mechanicsType": "endurance",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/air-bike/",
    "equipment": [
      "Air Bike / Fan Bike"
    ],
    "defaultTempo": "1-0-1-0",
    "defaultRestSeconds": 45,
    "defaultBestKg": 0,
    "isUnilateral": false
  },
  {
    "id": "ex-68",
    "name": "SkiErg Tower Conditioning",
    "nameMs": "Luncur Salji Ergometer",
    "slug": "skierg-conditioning",
    "category": "Kardio/Fungsional",
    "primaryMuscle": "Cardio & Conditioning (Kardio & Daya Tahan)",
    "targetMuscles": "Latissimus Dorsi, Triceps, Abdominals, Cardiovascular",
    "movementPattern": "conditioning",
    "mechanicsType": "endurance",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/skierg/",
    "equipment": [
      "SkiErg Tower"
    ],
    "defaultTempo": "1-0-1-0",
    "defaultRestSeconds": 45,
    "defaultBestKg": 0,
    "isUnilateral": false
  },
  {
    "id": "ex-69",
    "name": "Curved Manual Treadmill",
    "nameMs": "Treadmill Manual Melengkung",
    "slug": "curved-manual-treadmill",
    "category": "Kardio/Fungsional",
    "primaryMuscle": "Cardio & Conditioning (Kardio & Daya Tahan)",
    "targetMuscles": "Posterior Chain Running Mechanics, Cardiovascular",
    "movementPattern": "conditioning",
    "mechanicsType": "endurance",
    "visualGuideUrl": "https://fitnessprogramer.com/exercise/curved-treadmill/",
    "equipment": [
      "Curved Manual Treadmill"
    ],
    "defaultTempo": "1-0-1-0",
    "defaultRestSeconds": 45,
    "defaultBestKg": 0,
    "isUnilateral": false
  },
  {
    "id": "ex-70",
    "name": "Nordic Hamstring Curl",
    "nameMs": "Lengkungan Hamstring Nordic",
    "slug": "nordic-hamstring-curl",
    "category": "Kalistenik",
    "primaryMuscle": "Legs (Paha Belakang)",
    "targetMuscles": "Eccentric Hamstrings (Biceps Femoris, Semitendinosus)",
    "movementPattern": "hinge",
    "mechanicsType": "isolation",
    "visualGuideUrl": "https://exrx.net/WeightExercises/Hamstrings/BWNordicHamstringCurl",
    "equipment": [
      "Roman Chair / 45-Degree Bench",
      "Partner / Foam Roller"
    ],
    "defaultTempo": "4-0-1-0",
    "defaultRestSeconds": 90,
    "defaultBestKg": 0,
    "isUnilateral": false
  }
];
