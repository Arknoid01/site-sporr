let runState = null;
let runWatchId = null;
let runTimerInterval = null;
let runIntervalPhase = 'idle';

const INTERVAL_PRESETS = [
  { name: '30/30 x8', work: 30, rest: 30, rounds: 8 },
  { name: '1 min / 1 min x6', work: 60, rest: 60, rounds: 6 },
  { name: '2 min / 1 min x5', work: 120, rest: 60, rounds: 5 }
];

const RUN_TYPE_LABELS = {
  footing: 'Footing',
  endurance: 'Endurance',
  fractionne: 'Fractionné',
  'sortie-longue': 'Sortie longue',
  recuperation: 'Récupération'
};

const RUN_TERRAIN_LABELS = {
  route: 'Route',
  trail: 'Trail',
  piste: 'Piste'
};

function startRunSession(name, description, intervalPreset, options = {}) {
  if (!navigator.geolocation) {
    showToast('GPS non disponible sur cet appareil');
    return;
  }

  runState = {
    id: generateId(),
    name: name || 'Course',
    description: description || '',
    runType: options.runType || 'footing',
    terrain: options.terrain || 'route',
    targetKm: Number(options.targetKm) || 0,
    targetMin: Number(options.targetMin) || 0,
    startTime: Date.now(),
    elapsed: 0,
    points: [],
    distance: 0,
    elevation: 0,
    interval: intervalPreset ? { ...intervalPreset, round: 1, phase: 'work', remaining: intervalPreset.work } : null,
    paused: false
  };

  document.getElementById('running-live-overlay').hidden = false;
  document.body.classList.add('timer-active');
  document.getElementById('run-name-display').textContent = runState.name;

  runTimerInterval = setInterval(() => {
    if (!runState || runState.paused) return;
    runState.elapsed += 1;
    updateRunDisplay();
    if (runState.interval) tickRunInterval();
  }, 1000);

  runWatchId = navigator.geolocation.watchPosition(
    (pos) => onRunPosition(pos),
    () => showToast('Signal GPS faible'),
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
  );

  updateRunDisplay();
}

function onRunPosition(pos) {
  if (!runState) return;
  const point = {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    alt: pos.coords.altitude || 0
  };
  runState.points.push(point);
  const stats = calcRouteStats(runState.points);
  runState.distance = stats.distance;
  runState.elevation = stats.elevationGain;
  updateRunDisplay();
  updateLiveRouteMap('run-live-map', runState.points);
}

function updateRunDisplay() {
  if (!runState) return;
  const min = Math.floor(runState.elapsed / 60);
  const sec = runState.elapsed % 60;
  document.getElementById('run-time-display').textContent =
    `${min}:${String(sec).padStart(2, '0')}`;
  document.getElementById('run-distance-display').textContent =
    runState.distance >= 1000
      ? `${(runState.distance / 1000).toFixed(2)} km`
      : `${Math.round(runState.distance)} m`;
  document.getElementById('run-elevation-display').textContent =
    `${Math.round(runState.elevation)} m D+`;

  const pace = runState.distance > 0
    ? (runState.elapsed / 60) / (runState.distance / 1000)
    : 0;
  document.getElementById('run-pace-display').textContent =
    pace > 0 ? `${pace.toFixed(1)} min/km` : '—';

  const targetEl = document.getElementById('run-target-display');
  if (targetEl) {
    const parts = [];
    if (runState.targetKm > 0) {
      const km = runState.distance / 1000;
      const pct = Math.min(100, Math.round((km / runState.targetKm) * 100));
      parts.push(`🎯 ${km.toFixed(2)} / ${runState.targetKm} km (${pct}%)`);
    }
    if (runState.targetMin > 0) {
      const min = runState.elapsed / 60;
      const pct = Math.min(100, Math.round((min / runState.targetMin) * 100));
      parts.push(`⏱ ${Math.floor(min)} / ${runState.targetMin} min (${pct}%)`);
    }
    targetEl.textContent = parts.join(' · ');
    targetEl.hidden = parts.length === 0;
  }

  const intervalEl = document.getElementById('run-interval-display');
  if (runState.interval && intervalEl) {
    const iv = runState.interval;
    intervalEl.hidden = false;
    intervalEl.textContent = iv.phase === 'work'
      ? `Intervalle ${iv.round}/${iv.rounds} · Effort ${iv.remaining}s`
      : `Récup ${iv.remaining}s`;
  } else if (intervalEl) {
    intervalEl.hidden = true;
  }
}

function tickRunInterval() {
  const iv = runState.interval;
  if (!iv) return;
  iv.remaining -= 1;
  if (iv.remaining > 0) return;

  if (iv.phase === 'work') {
    iv.phase = 'rest';
    iv.remaining = iv.rest;
    hapticSuccess();
  } else {
    iv.round += 1;
    if (iv.round > iv.rounds) {
      runState.interval = null;
      showToast('Intervalles terminés — continue ta course !');
      return;
    }
    iv.phase = 'work';
    iv.remaining = iv.work;
  }
}

function toggleRunPause() {
  if (!runState) return;
  runState.paused = !runState.paused;
  const btn = document.getElementById('pause-run-btn');
  if (btn) btn.textContent = runState.paused ? 'Reprendre' : 'Pause';
  if (!runState.paused) hapticSuccess();
}

function stopRunSession() {
  if (!runState) return;
  clearInterval(runTimerInterval);
  if (runWatchId !== null) {
    navigator.geolocation.clearWatch(runWatchId);
    runWatchId = null;
  }
  destroyRouteMap('run-live-map');

  const run = {
    id: runState.id,
    date: todayString(),
    name: runState.name,
    description: runState.description,
    runType: runState.runType,
    terrain: runState.terrain,
    targetKm: runState.targetKm,
    targetMin: runState.targetMin,
    durationSec: runState.elapsed,
    distanceM: Math.round(runState.distance),
    elevationM: Math.round(runState.elevation),
    route: runState.points
  };

  saveRun(run);

  const minutes = Math.max(1, Math.round(runState.elapsed / 60));
  const typeLabel = RUN_TYPE_LABELS[run.runType] || run.runType;
  const terrainLabel = RUN_TERRAIN_LABELS[run.terrain] || run.terrain;
  const targetParts = [];
  if (run.targetKm > 0) targetParts.push(`obj. ${run.targetKm} km`);
  if (run.targetMin > 0) targetParts.push(`obj. ${run.targetMin} min`);
  addSession({
    date: todayString(),
    type: 'Running',
    duration: String(minutes),
    calories: '',
    note: `${run.name} — ${typeLabel} · ${terrainLabel} — ${(run.distanceM / 1000).toFixed(2)} km, ${run.elevationM}m D+${targetParts.length ? ` · ${targetParts.join(', ')}` : ''}`,
    time: currentTimeString()
  });

  document.getElementById('running-live-overlay').hidden = true;
  document.body.classList.remove('timer-active');

  showRunSummary(run);
  runState = null;
  checkAchievements(loadSessions(), loadSettings());
  refreshApp();
}

function showRunSummary(run) {
  document.getElementById('run-summary-modal').hidden = false;
  document.getElementById('run-summary-name').textContent = run.name;
  const typeLabel = RUN_TYPE_LABELS[run.runType] || '';
  const terrainLabel = RUN_TERRAIN_LABELS[run.terrain] || '';
  document.getElementById('run-summary-stats').innerHTML = `
    <p><strong>${formatDurationSeconds(run.durationSec)}</strong></p>
    <p>${(run.distanceM / 1000).toFixed(2)} km · ${run.elevationM} m D+</p>
    ${typeLabel ? `<p class="hint">${typeLabel}${terrainLabel ? ` · ${terrainLabel}` : ''}</p>` : ''}
  `;

  const mapEl = document.getElementById('run-route-map');
  const canvas = document.getElementById('run-route-canvas');
  destroyRouteMap('run-route-map');

  if (mapEl && run.route.length > 0) {
    const map = renderRouteMap(mapEl, run.route, { height: 220, maxZoom: 17 });
    if (!map && canvas) {
      canvas.hidden = false;
      canvas.width = 320;
      canvas.height = 180;
      drawRouteCanvas(canvas, run.route);
    } else if (canvas) {
      canvas.hidden = true;
    }
  } else if (canvas && run.route.length > 1) {
    canvas.hidden = false;
    canvas.width = 320;
    canvas.height = 180;
    drawRouteCanvas(canvas, run.route);
  }
}

function applyRunTypeDefaults() {
  const type = document.getElementById('run-type-select')?.value || 'footing';
  const intervalGroup = document.getElementById('run-interval-group');
  const intervalSelect = document.getElementById('run-interval-select');
  const nameInput = document.getElementById('run-name-input');
  const targetKm = document.getElementById('run-target-km');
  const targetMin = document.getElementById('run-target-min');

  const defaults = {
    footing: { name: 'Footing', km: 5, min: 30, interval: '' },
    endurance: { name: 'Endurance', km: 8, min: 50, interval: '' },
    fractionne: { name: 'Fractionné', km: 0, min: 40, interval: '0' },
    'sortie-longue': { name: 'Sortie longue', km: 12, min: 75, interval: '' },
    recuperation: { name: 'Récupération', km: 3, min: 25, interval: '' }
  };
  const d = defaults[type] || defaults.footing;

  if (intervalGroup) intervalGroup.hidden = type !== 'fractionne';
  if (intervalSelect && type === 'fractionne' && intervalSelect.value === '') {
    intervalSelect.value = d.interval;
  }
  if (nameInput && !nameInput.value.trim()) nameInput.placeholder = `Ex. ${d.name}`;
  if (targetKm && !targetKm.value && d.km) targetKm.placeholder = String(d.km);
  if (targetMin && !targetMin.value && d.min) targetMin.placeholder = String(d.min);
}

function bindRunning() {
  document.getElementById('run-type-select')?.addEventListener('change', applyRunTypeDefaults);
  document.getElementById('start-run-btn')?.addEventListener('click', () => {
    const type = document.getElementById('run-type-select').value;
    const name = document.getElementById('run-name-input').value.trim()
      || RUN_TYPE_LABELS[type]
      || 'Course';
    const desc = document.getElementById('run-desc-input').value.trim();
    const presetIdx = document.getElementById('run-interval-select').value;
    const preset = presetIdx === '' ? null : INTERVAL_PRESETS[Number(presetIdx)];
    startRunSession(name, desc, preset, {
      runType: type,
      terrain: document.getElementById('run-terrain-select').value,
      targetKm: document.getElementById('run-target-km').value,
      targetMin: document.getElementById('run-target-min').value
    });
  });

  document.getElementById('pause-run-btn')?.addEventListener('click', toggleRunPause);
  document.getElementById('stop-run-btn')?.addEventListener('click', stopRunSession);
  document.getElementById('close-run-summary')?.addEventListener('click', () => {
    document.getElementById('run-summary-modal').hidden = true;
    destroyRouteMap('run-route-map');
    showScreen('screen-running');
    renderRunsList();
  });
  applyRunTypeDefaults();
}

function renderRunsList() {
  const container = document.getElementById('runs-list');
  if (!container) return;
  const runs = loadRuns();

  if (runs.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucune course enregistrée.</p>';
    return;
  }

  container.innerHTML = runs.map((run) => `
    <article class="exercise-list-item" data-run-id="${run.id}">
      <div class="exercise-list-thumb run-thumb-mini" data-run-id="${run.id}">
        <canvas width="56" height="56" id="run-mini-${run.id}"></canvas>
      </div>
      <div class="exercise-list-info">
        <strong>${escapeHtml(run.name)}</strong>
        <span class="hint">${formatDisplayDate(run.date)} · ${RUN_TYPE_LABELS[run.runType] || 'Course'} · ${(run.distanceM / 1000).toFixed(2)} km · ${run.elevationM}m D+</span>
      </div>
      <button type="button" class="delete-btn compact" data-del-run="${run.id}" aria-label="Supprimer">✕</button>
      <span class="chevron">›</span>
    </article>
  `).join('');

  runs.forEach((run) => {
    const canvas = document.getElementById(`run-mini-${run.id}`);
    if (canvas && run.route.length > 1) drawRouteCanvas(canvas, run.route);
  });

  container.querySelectorAll('.exercise-list-item').forEach((item) => {
    item.addEventListener('click', () => {
      const run = loadRuns().find((r) => r.id === item.dataset.runId);
      if (run) showRunSummary(run);
    });
  });

  container.querySelectorAll('[data-del-run]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Supprimer cette course ?')) {
        deleteRun(btn.dataset.delRun);
        renderRunsList();
        showToast('Course supprimée');
      }
    });
  });
}

function escapeHtml(str) {
  return String(str).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function formatDisplayDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
