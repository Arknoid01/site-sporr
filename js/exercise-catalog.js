const MUSCLE_GROUPS = {
  fessiers: { label: 'Fessiers', emoji: '🍑' },
  jambes: { label: 'Jambes', emoji: '🦵' },
  dos: { label: 'Dos', emoji: '🔙' },
  pectoraux: { label: 'Pectoraux', emoji: '💪' },
  bras: { label: 'Bras', emoji: '💪' },
  epaules: { label: 'Épaules', emoji: '🏋️' },
  abdos: { label: 'Abdominaux', emoji: '🎯' }
};

const EQUIPMENT_GUIDE = {
  elastiques: {
    title: 'Élastiques de résistance',
    points: [
      'Choisis la résistance adaptée : léger (échauffement), moyen (travail), fort (force).',
      'Place l’élastique sous les pieds, au niveau des genoux ou des hanches selon l’exercice.',
      'Garde la tension constante pendant tout le mouvement.',
      'Contrôle la phase excentrique (retour) autant que la phase concentrique.',
      'Vérifie que l’élastique n’est pas usé ou fissuré avant chaque séance.'
    ]
  },
  barre: {
    title: 'Barre + élastiques',
    points: [
      'Fixe les élastiques aux extrémités de la barre de manière symétrique.',
      'Pieds écartés largeur d’épaules, élastiques sous les arches ou sous les talons.',
      'Garde le dos droit et le core engagé sur tous les mouvements.',
      'La barre reste proche du corps sur les tirages et les curls.',
      'Commence léger pour maîtriser la trajectoire avant d’augmenter la résistance.'
    ]
  }
};

const EXERCISE_CATALOG = [
  { id: 'squat', name: 'Squat', muscle: 'jambes', equipment: 'barre',
    desc: 'Descends en poussant les hanches vers l’arrière, genoux alignés avec les orteils.',
    tips: ['Dos droit', 'Genoux ne dépassent pas les orteils', 'Talons au sol'], defaultMode: 'reps', defaultValue: 12 },
  { id: 'fente', name: 'Fentes alternées', muscle: 'jambes', equipment: 'elastiques',
    desc: 'Grand pas en avant, fléchis les deux genoux à 90°, buste droit.',
    tips: ['Genou arrière près du sol', 'Buste vertical', 'Pousse le talon avant'], defaultMode: 'reps', defaultValue: 10 },
  { id: 'fente-bulgare', name: 'Fente bulgare', muscle: 'jambes', equipment: 'elastiques',
    desc: 'Pied arrière surélevé, descends verticalement en fléchissant le genou avant.',
    tips: ['Genou avant stable', 'Hanche alignée', 'Contrôle la descente'], defaultMode: 'reps', defaultValue: 8 },
  { id: 'good-morning', name: 'Good Morning', muscle: 'jambes', equipment: 'barre',
    desc: 'Barre sur les trapèzes, penche le buste en avant en poussant les hanches arrière.',
    tips: ['Dos plat', 'Légère flexion genoux', 'Sentir les ischio-jambiers'], defaultMode: 'reps', defaultValue: 12 },
  { id: 'mollets', name: 'Extensions mollets', muscle: 'jambes', equipment: 'elastiques',
    desc: 'Debout, monte sur la pointe des pieds en contractant les mollets.',
    tips: ['Amplitude complète', 'Pause en haut', 'Descente lente'], defaultMode: 'reps', defaultValue: 15 },
  { id: 'donkey-kick', name: 'Donkey Kick', muscle: 'fessiers', equipment: 'elastiques',
    desc: 'À quatre pattes, pousse une jambe vers le plafond en gardant le genou fléchi.',
    tips: ['Ne cambre pas le dos', 'Contracte les fessiers en haut', 'Mouvement contrôlé'], defaultMode: 'reps', defaultValue: 12 },
  { id: 'abduction', name: 'Abduction hanches', muscle: 'fessiers', equipment: 'elastiques',
    desc: 'Élastique au-dessus des genoux, pousse un genou sur le côté contre la résistance.',
    tips: ['Core engagé', 'Ne bascule pas le bassin', 'Contrôle le retour'], defaultMode: 'reps', defaultValue: 15 },
  { id: 'pont-fessier', name: 'Pont fessier', muscle: 'fessiers', equipment: 'elastiques',
    desc: 'Allongée, pieds au sol, pousse les hanches vers le haut en serrant les fessiers.',
    tips: ['Pause 2 s en haut', 'Ne creuse pas le bas du dos', 'Genoux alignés'], defaultMode: 'reps', defaultValue: 15 },
  { id: 'rowing', name: 'Rowing buste penché', muscle: 'dos', equipment: 'barre',
    desc: 'Buste penché 45°, tire la barre vers le nombril en serrant les omoplates.',
    tips: ['Dos plat', 'Coudes près du corps', 'Serre en fin de tirage'], defaultMode: 'reps', defaultValue: 12 },
  { id: 'tirage-vertical', name: 'Tirage vertical', muscle: 'dos', equipment: 'elastiques',
    desc: 'Élastique fixé en haut, tire vers la poitrine en gardant le buste droit.',
    tips: ['Tire avec les coudes', 'Ne te pencher en arrière', 'Contrôle la remontée'], defaultMode: 'reps', defaultValue: 12 },
  { id: 'pull-over', name: 'Pull-over', muscle: 'dos', equipment: 'elastiques',
    desc: 'Bras tendus, tire l’élastique de haut en bas devant soi en gardant les bras quasi tendus.',
    tips: ['Core serré', 'Amplitude complète', 'Mouvement lent'], defaultMode: 'reps', defaultValue: 10 },
  { id: 'developpe', name: 'Développé poitrine', muscle: 'pectoraux', equipment: 'barre',
    desc: 'Allongée ou debout, pousse la barre devant soi en contractant les pectoraux.',
    tips: ['Omoplates serrées', 'Contrôle la descente', 'Expire à la poussée'], defaultMode: 'reps', defaultValue: 10 },
  { id: 'ecartes', name: 'Écartés élastiques', muscle: 'pectoraux', equipment: 'elastiques',
    desc: 'Bras écartés, ramène les mains devant la poitrine contre la résistance.',
    tips: ['Légère flexion coudes', 'Contraction en fin de mouvement', 'Mouvement fluide'], defaultMode: 'reps', defaultValue: 12 },
  { id: 'curl', name: 'Curl biceps', muscle: 'bras', equipment: 'barre',
    desc: 'Coudes fixes le long du corps, fléchis les bras en montant la barre.',
    tips: ['Pas d’élan', 'Contraction en haut', 'Descente sur 2 s'], defaultMode: 'reps', defaultValue: 12 },
  { id: 'extension-triceps', name: 'Extension triceps', muscle: 'bras', equipment: 'elastiques',
    desc: 'Élastique derrière la tête, tends les bras vers le haut.',
    tips: ['Coudes fixes', 'Core engagé', 'Amplitude complète'], defaultMode: 'reps', defaultValue: 12 },
  { id: 'developpe-epaules', name: 'Développé épaules', muscle: 'epaules', equipment: 'barre',
    desc: 'Pousse la barre au-dessus de la tête, bras tendus sans verrouiller.',
    tips: ['Core serré', 'Ne cambrer pas', 'Descente contrôlée'], defaultMode: 'reps', defaultValue: 10 },
  { id: 'elevations', name: 'Élévations latérales', muscle: 'epaules', equipment: 'elastiques',
    desc: 'Bras le long du corps, lève sur les côtés jusqu’à hauteur des épaules.',
    tips: ['Légère flexion coudes', 'Pas d’élan', 'Descente lente'], defaultMode: 'reps', defaultValue: 12 },
  { id: 'crunch', name: 'Crunch', muscle: 'abdos', equipment: 'none',
    desc: 'Allongée, mains derrière la tête, décolle les omoplates du sol.',
    tips: ['Regard vers le plafond', 'Expire en montant', 'Ne tire pas sur la nuque'],
    defaultMode: 'reps', defaultValue: 15, pelvicFloorSafe: false },
  { id: 'respiration-transverse', name: 'Respiration ventrale & transverse', muscle: 'abdos', equipment: 'none',
    desc: 'Allongée ou assise, inspire en gonflant le ventre, expire en rentrant le nombril vers la colonne en contractant le périnée.',
    tips: ['Périnée engagé', 'Nombril vers la colonne', 'Expiration longue'],
    defaultMode: 'time', defaultValue: 45, pelvicFloorSafe: true,
    pelvicFloorCue: 'À l\'expiration : contracte le périnée et rapproche le nombril de la colonne vertébrale' },
  { id: 'dead-bug', name: 'Dead bug', muscle: 'abdos', equipment: 'none',
    desc: 'Allongée dos au sol, bras vers le plafond, genoux fléchis à 90°. Étends bras et jambe opposés lentement en gardant le dos plaqué.',
    tips: ['Dos collé au sol', 'Nombril vers la colonne', 'Périnée contracté'],
    defaultMode: 'reps', defaultValue: 8, pelvicFloorSafe: true,
    pelvicFloorCue: 'Avant chaque mouvement : périnée serré, nombril vers la colonne' },
  { id: 'oiseau-chien', name: 'Oiseau-chien', muscle: 'abdos', equipment: 'none',
    desc: 'À quatre pattes, étends bras et jambe opposés en gardant le bassin stable et la sangle profonde engagée.',
    tips: ['Bassin immobile', 'Périnée engagé', 'Mouvement lent et contrôlé'],
    defaultMode: 'reps', defaultValue: 10, pelvicFloorSafe: true,
    pelvicFloorCue: 'Gainage profond : périnée + nombril vers la colonne' },
  { id: 'gainage', name: 'Gainage planche', muscle: 'abdos', equipment: 'none',
    desc: 'Appui avant-bras et orteils, corps aligné. Contracte le périnée et ramène le nombril vers la colonne.',
    tips: ['Périnée engagé', 'Nombril vers la colonne', 'Fessiers légèrement serrés', 'Respiration fluide'],
    defaultMode: 'time', defaultValue: 30, pelvicFloorSafe: true,
    pelvicFloorCue: 'Maintiens : périnée contracté, nombril vers la colonne' },
  { id: 'mountain', name: 'Mountain Climbers', muscle: 'abdos', equipment: 'none',
    desc: 'Position planche, ramène alternativement les genoux vers la poitrine.',
    tips: ['Hanches basses', 'Rythme régulier', 'Core engagé'],
    defaultMode: 'time', defaultValue: 30, pelvicFloorSafe: false },
  { id: 'gainage-lateral', name: 'Gainage latéral', muscle: 'abdos', equipment: 'none',
    desc: 'Sur le côté, appui avant-bras, hanches levées. Périnée engagé, nombril légèrement aspiré vers la colonne.',
    tips: ['Périnée engagé', 'Nombril vers la colonne', 'Hanches hautes', 'Respire calmement'],
    defaultMode: 'time', defaultValue: 25, pelvicFloorSafe: true,
    pelvicFloorCue: 'Périnée serré, nombril vers la colonne pendant tout le maintien' }
];

function getExerciseById(id) {
  const local = EXERCISE_CATALOG.find((ex) => ex.id === id);
  if (local) return local;
  if (typeof WGER_EXERCISES !== 'undefined') {
    return WGER_EXERCISES.find((ex) => ex.id === id);
  }
  return undefined;
}

function getAllExercises() {
  const wger = typeof WGER_EXERCISES !== 'undefined' ? WGER_EXERCISES : [];
  return [...EXERCISE_CATALOG, ...wger];
}

function getExercisesByMuscle(muscle, source = 'all') {
  const local = EXERCISE_CATALOG.filter((ex) => ex.muscle === muscle);
  const wger = (typeof WGER_EXERCISES !== 'undefined' ? WGER_EXERCISES : [])
    .filter((ex) => ex.muscle === muscle);
  if (source === 'local') return local;
  if (source === 'wger') return wger;
  return [...local, ...wger];
}

function searchExercises(query, muscle = 'all', source = 'wger') {
  const q = query.trim().toLowerCase();
  let pool = source === 'local'
    ? EXERCISE_CATALOG
    : source === 'wger' && typeof WGER_EXERCISES !== 'undefined'
      ? WGER_EXERCISES
      : getAllExercises();

  if (muscle !== 'all') {
    pool = pool.filter((ex) => ex.muscle === muscle);
  }
  if (!q) return pool;
  return pool.filter((ex) =>
    ex.name.toLowerCase().includes(q) ||
    (ex.desc && ex.desc.toLowerCase().includes(q))
  );
}

function getExerciseImageHtml(exercise) {
  if (exercise.image) {
    return `<img src="${exercise.image}" class="exercise-thumb exercise-photo" alt="" loading="lazy">`;
  }
  const colors = {
    jambes: '#3A86FF', fessiers: '#FF6B35', dos: '#7B2FF7',
    pectoraux: '#00C9A7', bras: '#FFD23F', epaules: '#FF4D6D', abdos: '#06D6A0'
  };
  const color = colors[exercise.muscle] || '#888';
  return `<svg viewBox="0 0 80 80" class="exercise-thumb" aria-hidden="true">
    <rect width="80" height="80" rx="12" fill="${color}22"/>
    <circle cx="40" cy="28" r="10" fill="${color}"/>
    <rect x="30" y="38" width="20" height="24" rx="6" fill="${color}"/>
    <rect x="22" y="42" width="10" height="6" rx="3" fill="${color}88"/>
    <rect x="48" y="42" width="10" height="6" rx="3" fill="${color}88"/>
  </svg>`;
}
