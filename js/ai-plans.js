const AI_PLANS_KEY = 'sporrAiPlans';

const KNEE_SENSITIVE_KEYWORDS = [
  'jump', 'saut', 'burpee', 'fente', 'lunge', 'squat', 'pistol', 'plyo',
  'depth', 'box jump', 'split squat'
];

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

  const maxLeg = Number(constraints.maxLegSetsWeek) || 999;
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

function getExercisesForAiPrompt(profile) {
  const all = getAllExercises();
  const kneeSensitive = profile.kneeSensitive === true || profile.kneeSensitive === 'true';

  return all.filter((ex) => {
    if (!kneeSensitive) return true;
    const text = `${ex.name} ${ex.desc || ''}`.toLowerCase();
    return !KNEE_SENSITIVE_KEYWORDS.some((kw) => text.includes(kw));
  });
}

function buildExerciseCatalogText(exercises) {
  return exercises
    .map((ex) => `${ex.id}|${ex.name}|${ex.muscle}|${ex.equipment}`)
    .join('\n');
}
