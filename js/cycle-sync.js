const CYCLE_PHASE_CONFIG = {
  menstruation: {
    label: 'Menstruation',
    hormone: 'Œstrogène & progestérone bas · phase récupération',
    setsMod: -1,
    repsAdjust: 2,
    restBonus: 15,
    exCountMod: -1,
    focus: 'Mobilité douce, gainage, jambes légères — pas d\'impact ni surcharge'
  },
  follicular: {
    label: 'Phase folliculaire',
    hormone: 'Œstrogène en hausse · construction musculaire',
    setsMod: 1,
    repsAdjust: 0,
    restBonus: 0,
    exCountMod: 0,
    focus: 'Fenêtre favorable : force, hypertrophie, progression de charge'
  },
  ovulation: {
    label: 'Ovulation',
    hormone: 'Pic œstrogène · performance potentielle',
    setsMod: 0,
    repsAdjust: -1,
    restBonus: 5,
    exCountMod: 0,
    focus: 'Intensité haute possible — échauffement soigné (souplesse ligamentaire accrue)'
  },
  luteal: {
    label: 'Phase lutéale',
    hormone: 'Progestérone dominante · maintien & endurance',
    setsMod: 0,
    repsAdjust: 1,
    restBonus: 10,
    exCountMod: 0,
    focus: 'Volume modéré, maintien, hydratation — éviter records'
  },
  'late-luteal': {
    label: 'Fin de cycle (pré-menstruel)',
    hormone: 'Chute hormonale · fatigue & rétention',
    setsMod: -1,
    repsAdjust: 2,
    restBonus: 15,
    exCountMod: -1,
    focus: 'Alléger le volume, récupération active, bien-être prioritaire'
  }
};

const CYCLE_PHASE_LABELS = Object.fromEntries(
  Object.entries(CYCLE_PHASE_CONFIG).map(([k, v]) => [k, v.label])
);

function isCycleAdaptationActive(profile) {
  return profile?.sexe === 'femme' && profile?.cycleAdaptation === true;
}

function getCycleLength(profile) {
  const len = Number(profile.cycleLength) || 28;
  return Math.min(40, Math.max(21, len));
}

function getCycleDay(lastPeriodStart, cycleLength, offsetDays = 0) {
  if (!lastPeriodStart) return null;
  const start = new Date(`${lastPeriodStart}T12:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  const ref = new Date();
  ref.setHours(12, 0, 0, 0);
  ref.setDate(ref.getDate() + offsetDays);
  const diff = Math.floor((ref - start) / 86400000);
  if (diff < 0) return 1;
  return (diff % cycleLength) + 1;
}

function getPhaseFromCycleDay(day, cycleLength) {
  const ratio = cycleLength / 28;
  const mEnd = Math.max(3, Math.round(5 * ratio));
  const fEnd = Math.max(mEnd + 3, Math.round(13 * ratio));
  const oEnd = Math.max(fEnd + 1, Math.round(16 * ratio));
  const lateStart = Math.max(oEnd + 1, cycleLength - Math.max(3, Math.round(4 * ratio)));

  if (day <= mEnd) return 'menstruation';
  if (day <= fEnd) return 'follicular';
  if (day <= oEnd) return 'ovulation';
  if (day < lateStart) return 'luteal';
  return 'late-luteal';
}

function resolveCyclePhase(profile, weekOffsetDays = 0) {
  if (!isCycleAdaptationActive(profile)) return null;

  if (profile.cyclePhaseManual && profile.cyclePhaseManual !== 'auto') {
    const cfg = CYCLE_PHASE_CONFIG[profile.cyclePhaseManual];
    return {
      phase: profile.cyclePhaseManual,
      day: null,
      label: cfg?.label || profile.cyclePhaseManual,
      config: cfg || CYCLE_PHASE_CONFIG.luteal,
      source: 'manual'
    };
  }

  const cycleLength = getCycleLength(profile);
  const day = getCycleDay(profile.lastPeriodStart, cycleLength, weekOffsetDays);
  if (!day) return null;

  const phase = getPhaseFromCycleDay(day, cycleLength);
  const config = CYCLE_PHASE_CONFIG[phase];
  return {
    phase,
    day,
    cycleLength,
    label: config.label,
    config,
    source: 'calculated'
  };
}

function getCycleAdjustments(profile, weekOffsetDays = 0) {
  const resolved = resolveCyclePhase(profile, weekOffsetDays);
  if (!resolved) return null;
  return {
    ...resolved.config,
    phase: resolved.phase,
    phaseLabel: resolved.label,
    cycleDay: resolved.day,
    cycleLength: resolved.cycleLength,
    focusText: resolved.config.focus
  };
}

function formatCyclePromptBlock(profile) {
  if (!isCycleAdaptationActive(profile)) return '';

  const current = resolveCyclePhase(profile, 0);
  const lines = [
    'ADAPTATION CYCLE MENSTRUEL (prioritaire pour cette femme) :',
    `- Suivi cycle : activé · durée ${getCycleLength(profile)} jours`
  ];

  if (profile.contraception && profile.contraception !== 'none') {
    lines.push(`- Contraception : ${profile.contraception} — adapter prudemment (hormones exogènes)`);
  }

  if (current) {
    lines.push(`- Phase actuelle : ${current.label}${current.day ? ` (J${current.day})` : ''}`);
    lines.push(`- Contexte hormonal : ${current.config.hormone}`);
    lines.push(`- Consigne : ${current.config.focus}`);
  }

  lines.push('- Règles par phase :');
  Object.entries(CYCLE_PHASE_CONFIG).forEach(([key, cfg]) => {
    lines.push(`  · ${cfg.label} : ${cfg.focus}`);
  });

  if (profile.planMode !== 'single') {
    lines.push('- Programme multi-semaines : faire varier volume/intensité selon la phase de chaque semaine (cycle ~28j)');
  }

  return lines.join('\n');
}

function getCyclePhaseSummary(profile) {
  const resolved = resolveCyclePhase(profile, 0);
  if (!resolved) return '';
  return resolved.day
    ? `${resolved.label} · J${resolved.day}/${resolved.cycleLength}`
    : resolved.label;
}

function updateCyclePhaseHint() {
  const hint = document.getElementById('ai-cycle-phase-hint');
  if (!hint) return;

  const sexe = document.getElementById('ai-sexe')?.value;
  const enabled = document.getElementById('ai-cycle-adapt')?.checked;

  if (sexe !== 'femme' || !enabled) {
    hint.textContent = '';
    return;
  }

  try {
    const profile = readAiProfileFromForm();
    const summary = getCyclePhaseSummary(profile);
    hint.textContent = summary
      ? `Phase détectée : ${summary}`
      : 'Indique la date de tes dernières règles ou choisis ta phase manuellement.';
  } catch {
    hint.textContent = '';
  }
}

function toggleCycleFields() {
  const card = document.getElementById('ai-cycle-card');
  const sexe = document.getElementById('ai-sexe')?.value;
  if (card) card.hidden = sexe !== 'femme';

  const enabled = document.getElementById('ai-cycle-adapt')?.checked;
  const fields = document.querySelector('.ai-cycle-fields');
  if (fields) fields.hidden = !enabled;

  const manual = document.getElementById('ai-cycle-phase-manual')?.value !== 'auto';
  const dateWrap = document.getElementById('ai-cycle-date-wrap');
  if (dateWrap) dateWrap.hidden = !enabled || manual;

  updateCyclePhaseHint();
}
