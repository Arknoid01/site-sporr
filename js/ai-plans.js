const AI_PLANS_KEY = 'sporrAiPlans';

const KNEE_SENSITIVE_KEYWORDS = [
  'jump', 'saut', 'burpee', 'fente', 'lunge', 'pistol', 'plyo', 'bulgare',
  'depth', 'box jump', 'split squat', 'corde', 'jog', 'run', 'sprint',
  'mountain climber', 'step jack', 'nordic', 'thruster', 'walking lunge',
  'marche de', 'talons fesses', 'genoux hauts', 'escaladeur', 'bronco'
];

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

function scoreExerciseForAi(ex, localIds) {
  let score = 0;
  if (localIds.has(ex.id)) score += 100;
  if (ex.equipment === 'barre' || ex.equipment === 'elastiques') score += 20;
  if (ex.equipment === 'none') score -= 5;
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
  if (data.weeks?.length > 0 && data.weeks.length < 12) {
    errors.push(`Attention : ${data.weeks.length} semaine(s) seulement (12 recommandé)`);
  }

  const maxLeg = Number(constraints.maxLegSetsWeek) > 0 ? Number(constraints.maxLegSetsWeek) : 999;
  const maxMin = Number(constraints.maxMinutes) || 90;

  data.weeks?.forEach((week) => {
    const legSets = countWeekLegSets(week);
    if (legSets > maxLeg) {
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
  const kneeSensitive = constraints.kneeSensitive === true;
  const materielFilter = parseMaterielFilter(profile.materiel);
  const localIds = new Set(EXERCISE_CATALOG.map((ex) => ex.id));

  const filtered = all.filter((ex) => {
    if (isExcludedFromAiCatalog(ex)) return false;
    if (kneeSensitive && isKneeRiskyExercise(ex)) return false;
    if (materielFilter && !materielFilter.has(ex.equipment)) {
      if (ex.muscle === 'abdos' && ex.equipment === 'none') return true;
      return false;
    }
    return true;
  });

  const sorted = filtered.sort(
    (a, b) => scoreExerciseForAi(b, localIds) - scoreExerciseForAi(a, localIds)
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

function buildLocalSessionTemplates(profile, constraints) {
  const knee = constraints.kneeSensitive;
  const sessions = Number(profile.seancesSemaine) || 2;
  const objectif = (profile.objectif || 'force').toLowerCase();

  const upperPush = pickExercise(['developpe', 'wger-73', 'wger-1094'], 'developpe');
  const upperPull = pickExercise(['rowing', 'wger-83', 'wger-84'], 'rowing');
  const shoulders = pickExercise(['developpe-epaules', 'wger-566', 'wger-687'], 'developpe-epaules');
  const arms = pickExercise(['curl', 'wger-91', 'extension-triceps'], 'curl');

  const lowerMain = knee
    ? pickExercise(['squat', 'wger-977', 'wger-1963'], 'squat')
    : pickExercise(['squat', 'wger-1801', 'wger-1437'], 'squat');
  const glutes = pickExercise(['pont-fessier', 'wger-292', 'donkey-kick'], 'pont-fessier');
  const calves = pickExercise(['mollets', 'wger-1243'], 'mollets');
  const hinge = pickExercise(['good-morning', 'wger-1700'], 'good-morning');
  const core = pickExercise(['gainage', 'wger-1307', 'deadbug'], 'gainage');

  const baseReps = objectif.includes('force') ? 6 : objectif.includes('endurance') ? 15 : 10;

  const mk = (exerciseId, sets, value, mode = 'reps', restSets = 60, restAfter = 45) => ({
    exerciseId,
    sets,
    mode,
    value,
    restSets,
    restAfter
  });

  const templates = [];

  if (sessions <= 2) {
    templates.push({
      name: 'Force haut du corps',
      items: [
        mk(upperPush, 3, baseReps),
        mk(upperPull, 3, baseReps),
        mk(shoulders, 3, baseReps + 2)
      ]
    });
    templates.push({
      name: knee ? 'Force bas genou-safe' : 'Force bas du corps',
      items: knee
        ? [
            mk(lowerMain, 3, baseReps + 2),
            mk(glutes, 2, 12),
            mk(calves, 2, 15)
          ]
        : [
            mk(lowerMain, 3, baseReps),
            mk(hinge, 2, 10),
            mk(glutes, 2, 12)
          ]
    });
  } else if (sessions === 3) {
    templates.push({
      name: 'Push',
      items: [mk(upperPush, 3, baseReps), mk(shoulders, 3, baseReps + 2), mk(arms, 2, 10)]
    });
    templates.push({
      name: 'Pull',
      items: [
        mk(upperPull, 3, baseReps),
        mk(pickExercise(['pull-over', 'tirage-vertical'], 'tirage-vertical'), 3, baseReps),
        mk(arms, 2, 10)
      ]
    });
    templates.push({
      name: knee ? 'Jambes genou-safe' : 'Jambes',
      items: knee
        ? [mk(lowerMain, 3, baseReps + 2), mk(glutes, 2, 12), mk(core, 2, 30, 'time')]
        : [mk(lowerMain, 3, baseReps), mk(hinge, 2, 10), mk(glutes, 2, 12)]
    });
  } else {
    templates.push({
      name: 'Push',
      items: [mk(upperPush, 3, baseReps), mk(shoulders, 3, baseReps), mk(arms, 2, 10)]
    });
    templates.push({
      name: 'Pull',
      items: [mk(upperPull, 3, baseReps), mk(pickExercise(['tirage-vertical', 'pull-over'], 'tirage-vertical'), 3, baseReps)]
    });
    templates.push({
      name: knee ? 'Jambes genou-safe' : 'Jambes',
      items: [mk(lowerMain, 3, baseReps), mk(glutes, 2, 12), mk(calves, 2, 15)]
    });
    templates.push({
      name: 'Full body',
      items: [mk(upperPush, 2, baseReps + 2), mk(upperPull, 2, baseReps + 2), mk(core, 2, 30, 'time')]
    });
  }

  return templates.slice(0, sessions);
}

function progressionForWeek(weekNum, profile) {
  const objectif = (profile.objectif || 'force').toLowerCase();
  let phase = 'Technique';
  let setsBonus = 0;
  let repsAdjust = 0;
  let restSets = 60;
  let restAfter = 45;

  if (weekNum <= 3) {
    phase = 'Fondations — maîtrise le mouvement, charge légère';
    repsAdjust = objectif.includes('force') ? 2 : 0;
    restSets = 55;
  } else if (weekNum <= 6) {
    phase = 'Accumulation — monte progressivement la charge';
    repsAdjust = 0;
    restSets = 65;
    restAfter = 55;
  } else if (weekNum <= 9) {
    phase = 'Intensification — reps plus basses, repos plus longs';
    setsBonus = 1;
    repsAdjust = objectif.includes('force') ? -2 : 0;
    restSets = 75;
    restAfter = 60;
  } else {
    phase = 'Pic — force max, charge la plus lourde du cycle';
    setsBonus = 1;
    repsAdjust = objectif.includes('force') ? -3 : -1;
    restSets = 90;
    restAfter = 75;
  }

  return { phase, setsBonus, repsAdjust, restSets, restAfter };
}

function generateLocalAiPlan(profile, constraints) {
  validateAiForm(profile, constraints);
  const templates = buildLocalSessionTemplates(profile, constraints);
  const sessionsPerWeek = templates.length;
  const objectif = profile.objectif || 'force';

  const weeks = [];
  for (let w = 1; w <= 12; w += 1) {
    const prog = progressionForWeek(w, profile);
    weeks.push({
      week: w,
      focus: `S${w} — ${prog.phase}`,
      sessions: templates.map((tpl) => ({
        name: tpl.name,
        items: tpl.items.map((item) => {
          const baseValue = item.mode === 'time'
            ? item.value + (w > 6 ? 10 : 0)
            : Math.max(4, item.value + prog.repsAdjust);
          return {
            exerciseId: item.exerciseId,
            sets: item.sets + prog.setsBonus,
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
    planName: `${objectif.charAt(0).toUpperCase() + objectif.slice(1)} 12 sem · ${sessionsPerWeek}×/sem`,
    weeks
  };

  const errors = validateAiPlanData(planData, constraints);
  if (errors.length) {
    const relaxed = templates.map((tpl) => ({
      ...tpl,
      items: tpl.items.map((item) => ({ ...item, sets: Math.max(2, item.sets - 1) }))
    }));
    planData.weeks = weeks.map((week) => ({
      ...week,
      sessions: relaxed.map((tpl) => ({
        name: tpl.name,
        items: tpl.items.map((item) => ({ ...item, restSets: 45, restAfter: 30 }))
      }))
    }));
    const retryErrors = validateAiPlanData(planData, constraints);
    if (retryErrors.length) {
      throw new Error(`Plan local impossible : ${retryErrors.slice(0, 3).join('; ')}`);
    }
  }

  return normalizeAiPlanData(planData, profile, constraints);
}
