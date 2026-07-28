const EQUI_SESSIONS_KEY = 'sporrEquitationSessions';

/** Préparation physique du cavalier — pas le travail du cheval */
const RIDER_FOCUS = {
  'gainage-posture': {
    label: 'Gainage & posture',
    desc: 'Core, dos droit, stabilité en selle',
    placeholder: 'Ex. Gainage posture',
    duration: 20,
    intensity: 'moderee',
    pool: ['gainage', 'gainage-lateral', 'crunch', 'wger-178']
  },
  jambes: {
    label: 'Jambes & adducteurs',
    desc: 'Appuis, étriers, cuisses et fessiers',
    placeholder: 'Ex. Jambes étriers',
    duration: 25,
    intensity: 'moderee',
    pool: ['abduction', 'pont-fessier', 'donkey-kick', 'mollets', 'squat']
  },
  equilibre: {
    label: 'Équilibre & proprioception',
    desc: 'Stabilité, appuis alternés, contrôle du buste',
    placeholder: 'Ex. Équilibre cavalier',
    duration: 20,
    intensity: 'moderee',
    pool: ['gainage-lateral', 'gainage', 'wger-178', 'pont-fessier']
  },
  souplesse: {
    label: 'Souplesse hanches & dos',
    desc: 'Mobilité utile pour monter et suivre le mouvement',
    placeholder: 'Ex. Souplesse cavalier',
    duration: 15,
    intensity: 'legere',
    pool: ['gainage', 'pont-fessier', 'gainage-lateral'],
    timeHeavy: true
  },
  'renfo-complet': {
    label: 'Renfo complet cavalier',
    desc: 'Séance mixte jambes + gainage + posture',
    placeholder: 'Ex. Renfo cavalier',
    duration: 30,
    intensity: 'moderee',
    pool: ['pont-fessier', 'abduction', 'gainage', 'rowing', 'mollets']
  },
  recuperation: {
    label: 'Récupération / étirements actifs',
    desc: 'Léger, après monte ou en jour off',
    placeholder: 'Ex. Récup cavalier',
    duration: 15,
    intensity: 'legere',
    pool: ['gainage', 'pont-fessier', 'mollets'],
    timeHeavy: true
  }
};

const INTENSITY_CONFIG = {
  legere: { sets: 2, reps: 12, restSets: 40, restAfter: 30 },
  moderee: { sets: 3, reps: 10, restSets: 50, restAfter: 45 },
  intense: { sets: 3, reps: 8, restSets: 60, restAfter: 55 }
};

function loadEquitationSessions() {
  const raw = localStorage.getItem(EQUI_SESSIONS_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveEquitationSession(session) {
  const list = loadEquitationSessions().filter((s) => s.id !== session.id);
  list.unshift(session);
  localStorage.setItem(EQUI_SESSIONS_KEY, JSON.stringify(list));
}

function pickRiderExercises(focusKey, maxCount) {
  const focus = RIDER_FOCUS[focusKey] || RIDER_FOCUS['gainage-posture'];
  const picked = [];
  for (const id of focus.pool) {
    if (getExerciseById(id) && !picked.includes(id)) picked.push(id);
    if (picked.length >= maxCount) break;
  }
  if (picked.length === 0) {
    return ['gainage', 'pont-fessier', 'abduction'].filter((id) => getExerciseById(id));
  }
  return picked;
}

function generateRiderProgram(focusKey, intensity, targetMin, customName) {
  const focus = RIDER_FOCUS[focusKey] || RIDER_FOCUS['gainage-posture'];
  const cfg = INTENSITY_CONFIG[intensity] || INTENSITY_CONFIG.moderee;
  const exCount = targetMin <= 15 ? 3 : targetMin <= 25 ? 4 : 5;
  const exerciseIds = pickRiderExercises(focusKey, exCount);
  const useTime = focus.timeHeavy;

  const items = exerciseIds.map((exerciseId) => {
    const ex = getExerciseById(exerciseId);
    const mode = useTime || ex?.defaultMode === 'time' ? 'time' : 'reps';
    const value = mode === 'time'
      ? (intensity === 'legere' ? 30 : intensity === 'intense' ? 45 : 35)
      : cfg.reps;
    return {
      exerciseId,
      sets: cfg.sets,
      mode,
      value,
      restSets: cfg.restSets,
      restAfter: cfg.restAfter
    };
  });

  const name = customName || focus.label;
  return {
    id: generateId(),
    name: `Cavalier · ${name}`,
    sportType: 'Équitation',
    focus: focusKey,
    intensity,
    created: todayString(),
    restBetween: 45,
    items
  };
}

function applyEquitationTypeDefaults() {
  const type = document.getElementById('equi-type-select')?.value || 'gainage-posture';
  const focus = RIDER_FOCUS[type] || RIDER_FOCUS['gainage-posture'];
  const nameInput = document.getElementById('equi-name-input');
  const targetInput = document.getElementById('equi-target-min');
  const intensitySelect = document.getElementById('equi-intensity-select');
  const descEl = document.getElementById('equi-focus-desc');

  if (descEl) descEl.textContent = focus.desc;
  if (nameInput && !nameInput.value.trim()) nameInput.placeholder = focus.placeholder;
  if (targetInput && !targetInput.value) targetInput.placeholder = String(focus.duration);
  if (intensitySelect && !intensitySelect.dataset.userSet) {
    intensitySelect.value = focus.intensity;
  }
}

function bindEquitation() {
  document.getElementById('equi-type-select')?.addEventListener('change', () => {
    applyEquitationTypeDefaults();
  });
  document.getElementById('equi-intensity-select')?.addEventListener('change', (e) => {
    e.target.dataset.userSet = '1';
  });
  document.getElementById('start-equi-btn')?.addEventListener('click', () => {
    const focusKey = document.getElementById('equi-type-select').value;
    const intensity = document.getElementById('equi-intensity-select').value;
    const targetMin = Number(document.getElementById('equi-target-min').value)
      || RIDER_FOCUS[focusKey]?.duration
      || 20;
    const name = document.getElementById('equi-name-input').value.trim();
    const notes = document.getElementById('equi-notes-input').value.trim();

    const program = generateRiderProgram(focusKey, intensity, targetMin, name || undefined);
    program.riderNotes = notes;
    saveProgram(program);
    startProgramPlayer(program);
  });
  applyEquitationTypeDefaults();
}

function logEquitationProgramComplete(program, minutes) {
  const focus = RIDER_FOCUS[program.focus] || { label: program.focus };
  saveEquitationSession({
    id: generateId(),
    date: todayString(),
    name: program.name,
    focus: program.focus,
    intensity: program.intensity,
    notes: program.riderNotes || '',
    durationSec: minutes * 60,
    exerciseCount: program.items.length
  });
  renderEquitationSessionsList();
}

function renderEquitationSessionsList() {
  const container = document.getElementById('equi-sessions-list');
  if (!container) return;
  const sessions = loadEquitationSessions();

  if (sessions.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucune séance de prépa cavalier enregistrée.</p>';
    return;
  }

  container.innerHTML = sessions.map((s) => `
    <article class="exercise-list-item">
      <div class="exercise-list-info">
        <strong>${escapeHtmlEqui(s.name)}</strong>
        <span class="hint">${formatEquiDate(s.date)} · ${RIDER_FOCUS[s.focus]?.label || s.focus} · ${formatDurationSeconds(s.durationSec)}${s.exerciseCount ? ` · ${s.exerciseCount} ex.` : ''}</span>
      </div>
    </article>
  `).join('');
}

function escapeHtmlEqui(str) {
  return String(str).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function formatEquiDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
