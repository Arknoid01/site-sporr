const PELVIC_FLOOR_CUE =
  'Contracte le périnée, ramène le nombril vers la colonne, expire en maintenant la sangle profonde';

const PELVIC_FLOOR_PREFERRED_ABS = [
  'respiration-transverse',
  'gainage',
  'dead-bug',
  'gainage-lateral',
  'oiseau-chien',
  'wger-178',
  'wger-1001',
  'wger-1019',
  'wger-2482'
];

const PELVIC_FLOOR_SAFE_KEYWORDS = [
  'gainage', 'planche', 'plank', 'dead bug', 'deadbug', 'dead-bug',
  'bird dog', 'oiseau', 'transverse', 'respiration', 'ventrale', 'périnée',
  'perinee', 'pelvic', 'marche de l\'ours', 'bear', 'vacuum', 'drawing',
  'maintien latéral', 'side plank', 'planche latérale', 'hollow hold',
  'pont fessier', 'pont-fessier'
];

const PELVIC_FLOOR_RISKY_KEYWORDS = [
  'crunch', 'sit-up', 'sit up', 'situp', 'relevé de buste', 'releve de buste',
  'v-up', 'v up', 'jackknife', 'leg raise', 'relevé de jambe', 'releve de jambe',
  'knee raise', 'genoux hauts', 'mountain climber', 'escaladeur', 'bicycle',
  'ciseaux', 'scissor', 'russian twist', 'rotation du tronc', 'toe touch',
  'roll-up', 'rollup', 'roman chair', 'ab wheel', 'roue abdominale',
  'medicine ball crunch', 'cyclisme', 'knee tuck', 'flexion latérale'
];

function isPelvicFloorProtectionActive(profile) {
  return profile?.sexe === 'femme' && profile?.pelvicFloorSafe !== false;
}

function isPelvicFloorRiskyAbExercise(ex) {
  if (!ex || ex.muscle !== 'abdos') return false;
  if (ex.pelvicFloorSafe === true) return false;
  if (ex.pelvicFloorSafe === false) return true;
  const text = `${ex.name} ${ex.desc || ''} ${ex.id}`.toLowerCase();
  if (PELVIC_FLOOR_SAFE_KEYWORDS.some((kw) => text.includes(kw))) return false;
  return PELVIC_FLOOR_RISKY_KEYWORDS.some((kw) => text.includes(kw));
}

function isPelvicFloorSafeAbExercise(ex) {
  if (!ex || ex.muscle !== 'abdos') return true;
  if (ex.pelvicFloorSafe === true) return true;
  if (ex.pelvicFloorSafe === false) return false;
  if (PELVIC_FLOOR_PREFERRED_ABS.includes(ex.id)) return true;
  const text = `${ex.name} ${ex.desc || ''}`.toLowerCase();
  if (PELVIC_FLOOR_RISKY_KEYWORDS.some((kw) => text.includes(kw))) return false;
  return PELVIC_FLOOR_SAFE_KEYWORDS.some((kw) => text.includes(kw));
}

function passesPelvicFloorFilter(ex, profile) {
  if (!isPelvicFloorProtectionActive(profile)) return true;
  if (ex.muscle !== 'abdos') return true;
  return isPelvicFloorSafeAbExercise(ex);
}

function getPreferredAbExerciseIds(profile) {
  if (!isPelvicFloorProtectionActive(profile)) {
    return LOCAL_EXERCISES_BY_MUSCLE.abdos;
  }
  return PELVIC_FLOOR_PREFERRED_ABS;
}

function scorePelvicFloorBonus(ex, profile) {
  if (!isPelvicFloorProtectionActive(profile) || ex.muscle !== 'abdos') return 0;
  if (PELVIC_FLOOR_PREFERRED_ABS.includes(ex.id)) return 80;
  if (isPelvicFloorSafeAbExercise(ex)) return 40;
  if (isPelvicFloorRiskyAbExercise(ex)) return -200;
  return 0;
}

function formatPelvicFloorPromptBlock(profile) {
  if (!isPelvicFloorProtectionActive(profile)) return '';

  return [
    'PLANCHER PELVIEN & ABDOS (prioritaire — corps féminin) :',
    '- Privilégier UNIQUEMENT abdos à faible pression intra-abdominale.',
    '- Favoris : gainage planche, gainage latéral, dead bug, respiration ventrale/transverse, oiseau-chien.',
    `- Consigne systématique : ${PELVIC_FLOOR_CUE}.`,
    '- INTERDITS : crunch, sit-up, relevés de jambes, mountain climbers, rotations rapides du tronc, v-ups, ciseaux.',
    '- Mode abdos privilégié : "time" (maintien) plutôt que grosses séries de flexions du tronc.',
    '- En phase menstruelle ou fin de cycle : encore plus de gainage statique et respiration.'
  ].join('\n');
}

function toggleFemalePhysioFields() {
  const card = document.getElementById('ai-female-physio-card');
  const sexe = document.getElementById('ai-sexe')?.value;
  if (card) card.hidden = sexe !== 'femme';

  const pelvicCheck = document.getElementById('ai-pelvic-floor');
  if (pelvicCheck && sexe === 'femme' && !window.__pelvicFloorTouched) {
    pelvicCheck.checked = true;
  }
}

function getPelvicFloorCue(ex) {
  if (ex?.pelvicFloorCue) return ex.pelvicFloorCue;
  if (ex?.muscle === 'abdos' && (ex.pelvicFloorSafe || isPelvicFloorSafeAbExercise(ex))) {
    return PELVIC_FLOOR_CUE;
  }
  return '';
}
