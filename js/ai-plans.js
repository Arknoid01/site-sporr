const AI_PLANS_KEY = 'sporrAiPlans';
const AI_PROFILE_KEY = 'sporrAiCoachProfile';

const MUSCLE_LABELS = {
  fessiers: 'Fessiers',
  jambes: 'Jambes',
  dos: 'Dos',
  pectoraux: 'Pectoraux',
  bras: 'Bras',
  epaules: 'Épaules',
  abdos: 'Abdominaux'
};

const KNEE_SENSITIVE_KEYWORDS = [
  'jump', 'saut', 'burpee', 'fente', 'lunge', 'pistol', 'plyo', 'bulgare',
  'depth', 'box jump', 'split squat', 'corde', 'jog', 'run', 'sprint',
  'mountain climber', 'step jack', 'nordic', 'thruster', 'walking lunge',
  'marche de', 'talons fesses', 'genoux hauts', 'escaladeur', 'bronco'
];

const BACK_SENSITIVE_KEYWORDS = [
  'good morning', 'soulevé', 'deadlift', 'hyperextension', 'stiff', 'romanian',
  'rdl', 'good-morning', 'superman', 'hyper ext', 'lombaire'
];

const SHOULDER_SENSITIVE_KEYWORDS = [
  'overhead', 'militaire', 'handstand', 'dips', 'push press', 'arnold',
  'muscle-up', 'pompes piquées', 'pike', 'handstand', 'thruster', 'arraché', 'épaulé'
];

const WRIST_SENSITIVE_KEYWORDS = [
  'poignet', 'wrist', 'front squat', 'muscle-up', 'handstand', 'pompe sur les doigts',
  'barre au front', 'curl des poignets', 'enrouleur'
];

const LOCAL_EXERCISES_BY_MUSCLE = {
  pectoraux: ['developpe', 'ecartes', 'wger-73'],
  dos: ['rowing', 'tirage-vertical', 'pull-over', 'wger-83'],
  epaules: ['developpe-epaules', 'elevations', 'wger-566'],
  bras: ['curl', 'extension-triceps', 'wger-91'],
  jambes: ['squat', 'mollets', 'good-morning', 'wger-977'],
  fessiers: ['pont-fessier', 'donkey-kick', 'abduction', 'wger-292'],
  abdos: ['respiration-transverse', 'gainage', 'dead-bug', 'gainage-lateral', 'oiseau-chien', 'wger-178']
};

const ALL_WORKOUT_MUSCLES = ['pectoraux', 'dos', 'epaules', 'bras', 'jambes', 'fessiers', 'abdos'];

const AI_CATALOG_EXCLUDE_KEYWORDS = [
  'étirement', 'stretch', 'yoga', 'foam', 'meditation', 'breathing', 'swim',
  'vélo', 'bike', 'elliptique', 'cardio', 'tapis', 'rest (for timed', 'rotation du cou',
  'flexion du cou', 'tour de tête', 'rentré de menton', 'cercle', 'neck', 'diaphragmatic',
  'cool-down', 'recovery', 'limber', 'smr', 'angel', 'prière', 'cobra', 'papillon',
  'pigeon', 'bretzel', 'figure quatre', 'cavalier', 'handstand', 'muscle-up', 'front lever',
  'planche du chat', 'position de l\'enfant'
];

const AI_CATALOG_MAX = 100;

function parseMaterielFilter(materiel) {
  const m = (materiel || '').toLowerCase();
  const allowed = new Set();
  if (m.includes('élastique') || m.includes('elastique')) allowed.add('elastiques');
  if (m.includes('barre')) allowed.add('barre');
  if (m.includes('poids du corps') || m.includes('sans matériel') || m.includes('aucun')) {
    allowed.add('none');
  }
  return allowed.size ? allowed : null;
}

function isExcludedFromAiCatalog(ex) {
  const text = `${ex.name} ${ex.desc || ''}`.toLowerCase();
  return AI_CATALOG_EXCLUDE_KEYWORDS.some((kw) => text.includes(kw));
}

function isKneeRiskyExercise(ex) {
  const text = `${ex.name} ${ex.desc || ''}`.toLowerCase();
  return KNEE_SENSITIVE_KEYWORDS.some((kw) => text.includes(kw));
}

function isBackRiskyExercise(ex) {
  const text = `${ex.name} ${ex.desc || ''}`.toLowerCase();
  return BACK_SENSITIVE_KEYWORDS.some((kw) => text.includes(kw));
}

function isShoulderRiskyExercise(ex) {
  const text = `${ex.name} ${ex.desc || ''}`.toLowerCase();
  return SHOULDER_SENSITIVE_KEYWORDS.some((kw) => text.includes(kw));
}

function isWristRiskyExercise(ex) {
  const text = `${ex.name} ${ex.desc || ''}`.toLowerCase();
  return WRIST_SENSITIVE_KEYWORDS.some((kw) => text.includes(kw));
}

function parseExcludeList(text) {
  return (text || '')
    .split(/[,;\n]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function isExerciseExcludedByUser(ex, constraints) {
  const terms = parseExcludeList(constraints.excludeExercises);
  if (!terms.length) return false;
  const text = `${ex.name} ${ex.id} ${ex.desc || ''}`.toLowerCase();
  return terms.some((term) => text.includes(term));
}

function passesZoneConstraints(ex, constraints, profile = {}) {
  if (constraints.kneeSensitive && isKneeRiskyExercise(ex)) return false;
  if (constraints.backSensitive && isBackRiskyExercise(ex)) return false;
  if (constraints.shoulderSensitive && isShoulderRiskyExercise(ex)) return false;
  if (constraints.wristSensitive && isWristRiskyExercise(ex)) return false;
  if (isExerciseExcludedByUser(ex, constraints)) return false;
  if (!passesPelvicFloorFilter(ex, profile)) return false;
  return true;
}

function scoreExerciseForAi(ex, localIds, profile = {}) {
  let score = 0;
  if (localIds.has(ex.id)) score += 100;
  if (ex.equipment === 'barre' || ex.equipment === 'elastiques') score += 20;
  if (ex.equipment === 'none') score -= 5;
  const priorities = profile.musclePriorities || [];
  if (priorities.includes(ex.muscle)) score += 35;
  score += scorePelvicFloorBonus(ex, profile);
  return score;
}

function loadAiPlans() {
  const raw = localStorage.getItem(AI_PLANS_KEY);
  if (!raw) return [];
  try {
    const plans = JSON.parse(raw);
    return Array.isArray(plans) ? plans : [];
  } catch {
    return [];
  }
}

function saveAiPlans(plans) {
  localStorage.setItem(AI_PLANS_KEY, JSON.stringify(plans));
}

function saveAiPlan(plan) {
  const plans = loadAiPlans().filter((p) => p.id !== plan.id);
  plans.unshift(plan);
  saveAiPlans(plans);
  return plan;
}

function deleteAiPlan(id) {
  saveAiPlans(loadAiPlans().filter((p) => p.id !== id));
}

function getAiPlanById(id) {
  return loadAiPlans().find((p) => p.id === id);
}

function countLegSets(items) {
  return items.reduce((total, item) => {
    const ex = getExerciseById(item.exerciseId);
    if (ex?.muscle === 'jambes' || ex?.muscle === 'fessiers') {
      return total + (Number(item.sets) || 0);
    }
    return total;
  }, 0);
}

function countWeekLegSets(week) {
  return (week.sessions || []).reduce((total, session) => total + countLegSets(session.items || []), 0);
}

function validatePlanItem(item) {
  const errors = [];
  if (!item.exerciseId || !getExerciseById(item.exerciseId)) {
    errors.push(`Exercice inconnu : ${item.exerciseId || '?'}`);
  }
  if (!item.sets || item.sets < 1) errors.push('Séries invalides');
  if (!['reps', 'time', 'maxrep'].includes(item.mode)) errors.push(`Mode invalide : ${item.mode}`);
  if (!item.value || item.value < 1) errors.push('Valeur invalide');
  return errors;
}

function validateAiPlanData(data, constraints = {}) {
  const errors = [];
  if (!data?.planName) errors.push('Nom du plan manquant');
  if (!Array.isArray(data.weeks) || data.weeks.length === 0) errors.push('Semaines manquantes');
  const expectedWeeks = Number(constraints.planWeeks) || 12;
  if (data.weeks?.length > 0 && data.weeks.length < expectedWeeks) {
    errors.push(`Attention : ${data.weeks.length} semaine(s) seulement (${expectedWeeks} demandé)`);
  }

  const maxLeg = Number(constraints.maxLegSetsWeek) > 0 ? Number(constraints.maxLegSetsWeek) : 999;
  const maxMin = Number(constraints.maxMinutes) || 90;
  const isSingleSession = data.weeks?.length === 1 && data.weeks[0]?.sessions?.length === 1;

  data.weeks?.forEach((week) => {
    const legSets = countWeekLegSets(week);
    if (!isSingleSession && legSets > maxLeg) {
      errors.push(`Semaine ${week.week} : ${legSets} séries jambes/fessiers (max ${maxLeg})`);
    }
    week.sessions?.forEach((session) => {
      session.items?.forEach((item) => {
        validatePlanItem(item).forEach((e) => errors.push(`S${week.week} ${session.name} : ${e}`));
      });
      const fakeProgram = { items: session.items || [], restBetween: 60 };
      const dur = estimateProgramDuration(fakeProgram);
      if (dur > maxMin * 60 + 120) {
        errors.push(`S${week.week} ${session.name} : ~${Math.round(dur / 60)} min (max ${maxMin})`);
      }
    });
  });

  return errors;
}

function normalizePlanItem(raw) {
  return {
    exerciseId: String(raw.exerciseId),
    sets: Number(raw.sets) || 3,
    mode: raw.mode || 'reps',
    value: Number(raw.value) || 12,
    restSets: Number(raw.restSets) || 45,
    restAfter: Number(raw.restAfter) || 60
  };
}

function normalizeAiPlanData(data, profile, constraints) {
  return {
    id: generateId(),
    planName: String(data.planName).trim(),
    created: todayString(),
    profile: { ...profile },
    constraints: { ...constraints },
    currentWeek: 1,
    weeks: data.weeks.map((week) => ({
      week: Number(week.week),
      focus: week.focus || '',
      sessions: (week.sessions || []).map((session) => ({
        name: String(session.name || 'Séance'),
        items: (session.items || []).map(normalizePlanItem)
      }))
    }))
  };
}

function sessionToProgram(plan, weekNum, sessionIndex) {
  const week = plan.weeks.find((w) => w.week === weekNum);
  const session = week?.sessions?.[sessionIndex];
  if (!session) return null;
  return {
    id: generateId(),
    name: `${plan.planName} · S${weekNum} · ${session.name}`,
    created: todayString(),
    restBetween: 60,
    items: session.items
  };
}

function importAiPlanWeekAsPrograms(plan, weekNum) {
  const week = plan.weeks.find((w) => w.week === weekNum);
  if (!week) return 0;
  let count = 0;
  week.sessions.forEach((session) => {
    saveProgram({
      id: generateId(),
      name: `IA · ${plan.planName} · S${weekNum} · ${session.name}`,
      created: todayString(),
      restBetween: 60,
      items: session.items
    });
    count += 1;
  });
  return count;
}

function setAiPlanCurrentWeek(planId, weekNum) {
  const plan = getAiPlanById(planId);
  if (!plan) return;
  plan.currentWeek = weekNum;
  saveAiPlan(plan);
}

function getExercisesForAiPrompt(profile, constraints = {}) {
  const all = getAllExercises();
  const materielFilter = parseMaterielFilter(profile.materiel);
  const localIds = new Set(EXERCISE_CATALOG.map((ex) => ex.id));

  const filtered = all.filter((ex) => {
    if (isExcludedFromAiCatalog(ex)) return false;
    if (!passesZoneConstraints(ex, constraints, profile)) return false;
    if (materielFilter && !materielFilter.has(ex.equipment)) {
      if (ex.muscle === 'abdos' && ex.equipment === 'none') return true;
      return false;
    }
    return true;
  });

  const sorted = filtered.sort(
    (a, b) => scoreExerciseForAi(b, localIds, profile) - scoreExerciseForAi(a, localIds, profile)
  );

  const seen = new Set();
  const unique = [];
  sorted.forEach((ex) => {
    if (seen.has(ex.id)) return;
    seen.add(ex.id);
    unique.push(ex);
  });

  return unique.slice(0, AI_CATALOG_MAX);
}

function buildExerciseCatalogText(exercises) {
  return exercises
    .map((ex) => `${ex.id}|${ex.name}|${ex.muscle}|${ex.equipment}`)
    .join('\n');
}

function pickExercise(candidates, fallbackId) {
  for (const id of candidates) {
    if (getExerciseById(id)) return id;
  }
  return fallbackId && getExerciseById(fallbackId) ? fallbackId : candidates[0];
}

function getRestBase(constraints) {
  const map = {
    short: { sets: 45, after: 30 },
    medium: { sets: 60, after: 45 },
    long: { sets: 90, after: 75 }
  };
  return map[constraints.restPreference] || map.medium;
}

function pickExerciseForMuscle(muscle, profile, constraints, usedIds = new Set()) {
  const preferred = muscle === 'abdos'
    ? getPreferredAbExerciseIds(profile)
    : (LOCAL_EXERCISES_BY_MUSCLE[muscle] || []);
  const pool = getExercisesForAiPrompt(profile, constraints).filter((ex) => ex.muscle === muscle);

  for (const id of preferred) {
    if (usedIds.has(id)) continue;
    const ex = getExerciseById(id);
    if (ex && passesZoneConstraints(ex, constraints, profile)) return id;
  }
  for (const ex of pool) {
    if (!usedIds.has(ex.id)) return ex.id;
  }
  return null;
}

function buildItemsForMuscles(muscles, profile, constraints, exCount, baseReps, restBase) {
  const used = new Set();
  const priorities = profile.musclePriorities || [];
  const ordered = [...muscles].sort((a, b) => {
    const ap = priorities.includes(a) ? 0 : 1;
    const bp = priorities.includes(b) ? 0 : 1;
    return ap - bp;
  });

  const items = [];
  for (const muscle of ordered) {
    if (items.length >= exCount) break;
    const id = pickExerciseForMuscle(muscle, profile, constraints, used);
    if (!id) continue;
    used.add(id);
    const ex = getExerciseById(id);
    const sets = priorities.includes(muscle) ? 4 : 3;
    const mode = ex?.defaultMode || 'reps';
    const value = mode === 'time'
      ? 30
      : Math.max(4, priorities.includes(muscle) ? baseReps - 1 : baseReps);
    items.push({
      exerciseId: id,
      sets,
      mode,
      value,
      restSets: restBase.sets,
      restAfter: restBase.after
    });
  }
  return items;
}

function buildSessionBlueprints(profile, constraints) {
  const includeAbs = constraints.includeAbs !== false;
  const base = ALL_WORKOUT_MUSCLES.filter((m) => m !== 'abdos' || includeAbs);
  const isSingle = profile.planMode === 'single';

  if (isSingle) {
    const name = (profile.sessionName || '').trim() || 'Séance personnalisée';
    return [{ name, muscles: base }];
  }

  const sessions = Number(profile.seancesSemaine) || 2;
  return Array.from({ length: sessions }, (_, i) => {
    const rotated = [...base.slice(i % base.length), ...base.slice(0, i % base.length)];
    return { name: `Séance ${i + 1}`, muscles: rotated };
  });
}

function buildLocalSessionTemplates(profile, constraints, weekOffsetDays = 0) {
  const baseExCount = Math.min(6, Math.max(3, Number(profile.exercisesPerSession) || 4));
  const cycle = getCycleAdjustments(profile, weekOffsetDays);
  const exCount = Math.max(2, baseExCount + (cycle?.exCountMod || 0));
  const objectif = (profile.objectif || 'force').toLowerCase();
  const baseReps = objectif.includes('force') ? 6 : objectif.includes('endurance') ? 15 : 10;
  const restBase = getRestBase(constraints);
  const blueprints = buildSessionBlueprints(profile, constraints);

  return blueprints.map((bp) => ({
    name: bp.name,
    items: buildItemsForMuscles(bp.muscles, profile, constraints, exCount, baseReps, restBase)
  })).filter((tpl) => tpl.items.length > 0);
}

function applyCycleToProgression(prog, profile, weekOffsetDays) {
  const cycle = getCycleAdjustments(profile, weekOffsetDays);
  if (!cycle) return prog;
  return {
    ...prog,
    setsBonus: prog.setsBonus + (cycle.setsMod || 0),
    repsAdjust: prog.repsAdjust + (cycle.repsAdjust || 0),
    restSets: prog.restSets + (cycle.restBonus || 0),
    restAfter: prog.restAfter + (cycle.restBonus || 0),
    cyclePhase: cycle.phaseLabel,
    cycleFocus: cycle.focusText
  };
}

function progressionForWeek(weekNum, profile, constraints = {}) {
  const objectif = (profile.objectif || 'force').toLowerCase();
  const totalWeeks = Number(profile.planWeeks) || 12;
  const quarter = Math.max(1, Math.ceil(totalWeeks / 4));
  const restBase = getRestBase(constraints);
  let phase = 'Technique';
  let setsBonus = 0;
  let repsAdjust = 0;
  let restSets = restBase.sets;
  let restAfter = restBase.after;

  if (weekNum <= quarter) {
    phase = 'Fondations — maîtrise le mouvement, charge légère';
    repsAdjust = objectif.includes('force') ? 2 : 0;
    restSets = Math.max(40, restBase.sets - 5);
  } else if (weekNum <= quarter * 2) {
    phase = 'Accumulation — monte progressivement la charge';
    repsAdjust = 0;
    restSets = restBase.sets + 5;
    restAfter = restBase.after + 10;
  } else if (weekNum <= quarter * 3) {
    phase = 'Intensification — reps plus basses, repos plus longs';
    setsBonus = 1;
    repsAdjust = objectif.includes('force') ? -2 : 0;
    restSets = restBase.sets + 15;
    restAfter = restBase.after + 15;
  } else {
    phase = 'Pic — charge la plus lourde du cycle';
    setsBonus = 1;
    repsAdjust = objectif.includes('force') ? -3 : -1;
    restSets = restBase.sets + 25;
    restAfter = restBase.after + 25;
  }

  return { phase, setsBonus, repsAdjust, restSets, restAfter };
}

function generateLocalAiPlan(profile, constraints) {
  validateAiForm(profile, constraints);
  const isSingle = profile.planMode === 'single';
  const objectif = profile.objectif || 'force';
  const planWeeks = isSingle ? 1 : (Number(profile.planWeeks) || 12);
  const baseTemplates = buildLocalSessionTemplates(profile, constraints, 0);
  if (!baseTemplates.length) {
    throw new Error('Aucune séance générée — assouplis tes filtres ou zones à ménager');
  }

  const weeks = [];
  for (let w = 1; w <= planWeeks; w += 1) {
    const weekOffsetDays = isSingle ? 0 : (w - 1) * 7;
    const templates = isSingle
      ? baseTemplates
      : buildLocalSessionTemplates(profile, constraints, weekOffsetDays);
    const restBase = getRestBase(constraints);
    let prog = isSingle
      ? { phase: 'Séance du jour', setsBonus: 0, repsAdjust: 0, restSets: restBase.sets, restAfter: restBase.after }
      : progressionForWeek(w, profile, constraints);
    prog = applyCycleToProgression(prog, profile, weekOffsetDays);
    const mid = Math.ceil(planWeeks / 2);
    const focusParts = [];
    if (!isSingle) focusParts.push(`S${w} — ${prog.phase}`);
    if (prog.cyclePhase) focusParts.push(prog.cyclePhase);
    if (prog.cycleFocus && isCycleAdaptationActive(profile)) {
      focusParts.push(prog.cycleFocus);
    }
    weeks.push({
      week: w,
      focus: isSingle
        ? (prog.cyclePhase ? `${prog.cyclePhase} · ${prog.cycleFocus || 'Séance unique'}` : 'Séance unique')
        : focusParts.join(' · '),
      sessions: templates.map((tpl) => ({
        name: tpl.name,
        items: tpl.items.map((item) => {
          const baseValue = item.mode === 'time'
            ? item.value + (!isSingle && w > mid ? 10 : 0)
            : Math.max(4, item.value + prog.repsAdjust);
          return {
            exerciseId: item.exerciseId,
            sets: Math.max(2, item.sets + prog.setsBonus),
            mode: item.mode,
            value: baseValue,
            restSets: prog.restSets,
            restAfter: prog.restAfter
          };
        })
      }))
    });
  }

  const planData = {
    planName: isSingle
      ? baseTemplates[0]?.name || 'Séance personnalisée'
      : `${objectif.charAt(0).toUpperCase() + objectif.slice(1)} ${planWeeks} sem · ${baseTemplates.length}×/sem`,
    weeks
  };

  const errors = validateAiPlanData(planData, { ...constraints, planWeeks });
  if (errors.length) {
    planData.weeks = weeks.map((week) => ({
      ...week,
      sessions: week.sessions.map((session) => ({
        ...session,
        items: session.items.map((item) => ({
          ...item,
          sets: Math.max(2, item.sets - 1),
          restSets: getRestBase(constraints).sets,
          restAfter: getRestBase(constraints).after
        }))
      }))
    }));
    const retryErrors = validateAiPlanData(planData, { ...constraints, planWeeks });
    if (retryErrors.length) {
      throw new Error(`Plan local impossible : ${retryErrors.slice(0, 3).join('; ')}`);
    }
  }

  return normalizeAiPlanData(planData, profile, constraints);
}

function saveAiCoachProfile(profile, constraints) {
  localStorage.setItem(AI_PROFILE_KEY, JSON.stringify({ profile, constraints, savedAt: Date.now() }));
}

function loadAiCoachProfile() {
  const raw = localStorage.getItem(AI_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
