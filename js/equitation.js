const EQUI_SESSIONS_KEY = 'sporrEquitationSessions';

const EQUI_TYPE_LABELS = {
  dressage: 'Dressage',
  balade: 'Balade',
  'travail-sol': 'Travail au sol',
  saut: 'Saut / CSO',
  recuperation: 'Récupération'
};

const EQUI_INTENSITY_LABELS = {
  legere: 'Légère',
  moderee: 'Modérée',
  intense: 'Intense'
};

let equiState = null;
let equiTimerInterval = null;

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

function startEquitationSession(options) {
  equiState = {
    id: generateId(),
    name: options.name || 'Séance équitation',
    type: options.type || 'dressage',
    intensity: options.intensity || 'moderee',
    horse: options.horse || '',
    notes: options.notes || '',
    targetMin: Number(options.targetMin) || 0,
    startTime: Date.now(),
    elapsed: 0,
    paused: false
  };

  document.getElementById('equitation-live-overlay').hidden = false;
  document.body.classList.add('timer-active');
  document.getElementById('equi-name-display').textContent = equiState.name;
  document.getElementById('equi-meta-display').textContent = [
    EQUI_TYPE_LABELS[equiState.type],
    EQUI_INTENSITY_LABELS[equiState.intensity],
    equiState.horse ? `· ${equiState.horse}` : ''
  ].filter(Boolean).join(' ');

  equiTimerInterval = setInterval(() => {
    if (!equiState || equiState.paused) return;
    equiState.elapsed += 1;
    updateEquitationDisplay();
  }, 1000);

  updateEquitationDisplay();
}

function updateEquitationDisplay() {
  if (!equiState) return;
  const min = Math.floor(equiState.elapsed / 60);
  const sec = equiState.elapsed % 60;
  document.getElementById('equi-time-display').textContent =
    `${min}:${String(sec).padStart(2, '0')}`;

  const targetEl = document.getElementById('equi-target-display');
  if (equiState.targetMin > 0) {
    const remaining = Math.max(0, equiState.targetMin * 60 - equiState.elapsed);
    const rMin = Math.floor(remaining / 60);
    const rSec = remaining % 60;
    targetEl.textContent = remaining > 0
      ? `${rMin}:${String(rSec).padStart(2, '0')}`
      : '✓';
  } else {
    targetEl.textContent = '—';
  }
}

function stopEquitationSession() {
  if (!equiState) return;
  clearInterval(equiTimerInterval);
  equiTimerInterval = null;

  const session = {
    id: equiState.id,
    date: todayString(),
    name: equiState.name,
    type: equiState.type,
    intensity: equiState.intensity,
    horse: equiState.horse,
    notes: equiState.notes,
    targetMin: equiState.targetMin,
    durationSec: equiState.elapsed
  };

  saveEquitationSession(session);

  const minutes = Math.max(1, Math.round(equiState.elapsed / 60));
  const typeLabel = EQUI_TYPE_LABELS[session.type] || session.type;
  addSession({
    date: todayString(),
    type: 'Équitation',
    duration: String(minutes),
    calories: '',
    note: `${session.name} — ${typeLabel}${session.horse ? ` · ${session.horse}` : ''}${session.notes ? ` · ${session.notes}` : ''}`,
    time: currentTimeString()
  });

  document.getElementById('equitation-live-overlay').hidden = true;
  document.body.classList.remove('timer-active');
  showToast(`Séance enregistrée (${minutes} min)`);
  hapticSuccess();
  equiState = null;
  checkAchievements(loadSessions(), loadSettings());
  refreshApp();
  renderEquitationSessionsList();
}

function applyEquitationTypeDefaults() {
  const type = document.getElementById('equi-type-select')?.value || 'dressage';
  const nameInput = document.getElementById('equi-name-input');
  const targetInput = document.getElementById('equi-target-min');
  const intensitySelect = document.getElementById('equi-intensity-select');

  const defaults = {
    dressage: { name: 'Dressage', min: 45, intensity: 'moderee' },
    balade: { name: 'Balade', min: 60, intensity: 'legere' },
    'travail-sol': { name: 'Travail au sol', min: 30, intensity: 'moderee' },
    saut: { name: 'Séance saut', min: 50, intensity: 'intense' },
    recuperation: { name: 'Récupération', min: 25, intensity: 'legere' }
  };
  const d = defaults[type] || defaults.dressage;
  if (nameInput && !nameInput.value.trim()) nameInput.placeholder = `Ex. ${d.name}`;
  if (targetInput && !targetInput.value) targetInput.placeholder = String(d.min);
  if (intensitySelect) intensitySelect.value = d.intensity;
}

function bindEquitation() {
  document.getElementById('equi-type-select')?.addEventListener('change', applyEquitationTypeDefaults);
  document.getElementById('start-equi-btn')?.addEventListener('click', () => {
    const type = document.getElementById('equi-type-select').value;
    const name = document.getElementById('equi-name-input').value.trim()
      || EQUI_TYPE_LABELS[type]
      || 'Séance équitation';
    startEquitationSession({
      name,
      type,
      intensity: document.getElementById('equi-intensity-select').value,
      horse: document.getElementById('equi-horse-name').value.trim(),
      notes: document.getElementById('equi-notes-input').value.trim(),
      targetMin: Number(document.getElementById('equi-target-min').value) || 0
    });
  });
  document.getElementById('stop-equi-btn')?.addEventListener('click', stopEquitationSession);
  applyEquitationTypeDefaults();
}

function renderEquitationSessionsList() {
  const container = document.getElementById('equi-sessions-list');
  if (!container) return;
  const sessions = loadEquitationSessions();

  if (sessions.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucune séance enregistrée.</p>';
    return;
  }

  container.innerHTML = sessions.map((s) => `
    <article class="exercise-list-item">
      <div class="exercise-list-info">
        <strong>${escapeHtmlEqui(s.name)}</strong>
        <span class="hint">${formatEquiDate(s.date)} · ${EQUI_TYPE_LABELS[s.type] || s.type} · ${formatDurationSeconds(s.durationSec)}${s.horse ? ` · ${escapeHtmlEqui(s.horse)}` : ''}</span>
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
