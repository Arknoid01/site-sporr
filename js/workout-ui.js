let builderState = { name: '', items: [], step: 'name', muscles: [] };
let selectedMuscleFilter = 'all';
let selectedCatalogSource = 'local';
let exerciseSearchQuery = '';
let viewingExerciseId = null;

function openRenfoHub() {
  renderRenfoHub();
  showScreen('screen-renfo');
}

function openRunningHub() {
  renderRunningHub();
  showScreen('screen-running');
}

function renderRenfoHub() {
  renderProgramsList();
  renderExerciseBrowser();
  updateBuilderDurationPreview();
}

function renderProgramsList() {
  const container = document.getElementById('programs-list');
  if (!container) return;
  const programs = loadPrograms();

  if (programs.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucun programme. Crée-en un ou utilise le générateur !</p>';
    return;
  }

  container.innerHTML = programs.map((prog) => {
    const dur = formatDurationSeconds(estimateProgramDuration(prog));
    return `
      <article class="program-card">
        <div>
          <strong>${escapeHtml(prog.name)}</strong>
          <p class="hint">${prog.items.length} exercices · ~${dur}</p>
        </div>
        <div class="program-card-actions">
          <button type="button" class="primary-btn compact" data-start-prog="${prog.id}">▶</button>
          <button type="button" class="delete-btn compact" data-del-prog="${prog.id}">✕</button>
        </div>
      </article>
    `;
  }).join('');

  container.querySelectorAll('[data-start-prog]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const prog = loadPrograms().find((p) => p.id === btn.dataset.startProg);
      if (prog) startProgramPlayer(prog);
    });
  });

  container.querySelectorAll('[data-del-prog]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (confirm('Supprimer ce programme ?')) {
        deleteProgram(btn.dataset.delProg);
        renderProgramsList();
        showToast('Programme supprimé');
      }
    });
  });
}

function renderExerciseBrowser() {
  const container = document.getElementById('exercise-browser');
  if (!container) return;

  const meta = typeof WGER_CATALOG_META !== 'undefined' ? WGER_CATALOG_META : null;
  const isWger = selectedCatalogSource === 'wger';
  const maxShow = isWger && !exerciseSearchQuery ? 48 : 80;

  let exercises = searchExercises(exerciseSearchQuery, selectedMuscleFilter, selectedCatalogSource);
  const total = exercises.length;
  exercises = exercises.slice(0, maxShow);

  if (total === 0) {
    container.innerHTML = '<p class="empty-state">Aucun exercice trouvé. Essaie un autre mot-clé ou muscle.</p>';
    return;
  }

  const hint = isWger && !exerciseSearchQuery && total > maxShow
    ? `<p class="hint catalog-hint">${total} exercices wger — utilise la recherche pour en voir plus (${maxShow} affichés)</p>`
    : isWger && exerciseSearchQuery
      ? `<p class="hint catalog-hint">${total} résultat(s) · ${meta?.withImages || 0} photos dans le catalogue</p>`
      : '';

  if (selectedCatalogSource === 'local') {
    const groups = selectedMuscleFilter === 'all'
      ? Object.keys(MUSCLE_GROUPS)
      : [selectedMuscleFilter];

    container.innerHTML = hint + groups.map((muscle) => {
      const groupExercises = exercises.filter((ex) => ex.muscle === muscle);
      if (!groupExercises.length) return '';
      const group = MUSCLE_GROUPS[muscle];
      return `
        <div class="muscle-section">
          <h3 class="muscle-section-title">${group.emoji} ${group.label}</h3>
          <div class="exercise-grid">
            ${groupExercises.map((ex) => renderExerciseCard(ex)).join('')}
          </div>
        </div>
      `;
    }).join('');
  } else {
    container.innerHTML = hint + `
      <div class="exercise-grid">
        ${exercises.map((ex) => renderExerciseCard(ex)).join('')}
      </div>
    `;
  }

  container.querySelectorAll('.exercise-card').forEach((card) => {
    card.addEventListener('click', () => openExerciseDetail(card.dataset.exId));
  });
}

function renderExerciseCard(ex) {
  return `
    <button type="button" class="exercise-card" data-ex-id="${ex.id}">
      ${getExerciseImageHtml(ex)}
      <span class="exercise-card-label">${escapeHtml(ex.name)}</span>
      <span class="play-badge">▶</span>
    </button>
  `;
}

function openExerciseDetail(exId) {
  viewingExerciseId = exId;
  const ex = getExerciseById(exId);
  if (!ex) return;

  document.getElementById('exercise-detail-overlay').hidden = false;
  document.getElementById('ex-detail-name').textContent = ex.name;
  document.getElementById('ex-detail-muscle').textContent = MUSCLE_GROUPS[ex.muscle]?.label || ex.muscle;
  document.getElementById('ex-detail-image').innerHTML = getExerciseImageHtml(ex);
  document.getElementById('ex-detail-desc').textContent = ex.desc;
  document.getElementById('ex-detail-tips').innerHTML = ex.tips.map((t) => `<li>${t}</li>`).join('');
  document.getElementById('ex-detail-equipment').textContent =
    ex.equipment === 'barre' ? 'Barre + élastiques' :
    ex.equipment === 'elastiques' ? 'Élastiques' : 'Sans matériel';

  const sourceEl = document.getElementById('ex-detail-source');
  if (sourceEl) {
    sourceEl.textContent = ex.source === 'wger' ? 'Source : wger.de (CC-BY-SA)' : '';
    sourceEl.hidden = ex.source !== 'wger';
  }
}

function closeExerciseDetail() {
  document.getElementById('exercise-detail-overlay').hidden = true;
  viewingExerciseId = null;
}

function switchRenfoTab(tab) {
  document.querySelectorAll('.renfo-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.renfoTab === tab);
  });
  document.querySelectorAll('.renfo-panel').forEach((panel) => {
    panel.hidden = panel.id !== `renfo-panel-${tab}`;
  });
}

function resetBuilder() {
  builderState = { name: '', items: [], step: 'name', muscles: [] };
  document.getElementById('builder-name-input').value = '';
  document.getElementById('builder-items-list').innerHTML = '';
  updateBuilderDurationPreview();
}

function addExerciseToBuilder(exId) {
  const ex = getExerciseById(exId);
  if (!ex) return;
  builderState.items.push({
    exerciseId: ex.id,
    sets: 3,
    mode: ex.defaultMode || 'reps',
    value: ex.defaultValue || 12,
    restSets: 45,
    restAfter: 60
  });
  renderBuilderItems();
  updateBuilderDurationPreview();
  showToast(`${ex.name} ajouté`);
}

function renderBuilderItems() {
  const container = document.getElementById('builder-items-list');
  if (!container) return;

  if (builderState.items.length === 0) {
    container.innerHTML = '<p class="empty-state small">Ajoute des exercices depuis l’onglet Exercices</p>';
    return;
  }

  container.innerHTML = builderState.items.map((item, index) => {
    const ex = getExerciseById(item.exerciseId);
    return `
      <div class="builder-item card" data-index="${index}">
        <div class="builder-item-header">
          <strong>${ex?.name || item.exerciseId}</strong>
          <button type="button" class="delete-btn compact" data-remove-index="${index}">✕</button>
        </div>
        <div class="set-config-row">
          <label>Séries<input type="number" min="1" max="10" value="${item.sets}" data-field="sets" data-index="${index}"></label>
          <label>Mode
            <select data-field="mode" data-index="${index}">
              <option value="reps" ${item.mode === 'reps' ? 'selected' : ''}>Répétitions</option>
              <option value="time" ${item.mode === 'time' ? 'selected' : ''}>Durée (s)</option>
              <option value="maxrep" ${item.mode === 'maxrep' ? 'selected' : ''}>Max rep</option>
            </select>
          </label>
          <label>Valeur<input type="number" min="1" value="${item.value}" data-field="value" data-index="${index}"></label>
          <label>Repos séries (s)<input type="number" min="0" value="${item.restSets}" data-field="restSets" data-index="${index}"></label>
          <label>Repos après (s)<input type="number" min="0" value="${item.restAfter}" data-field="restAfter" data-index="${index}"></label>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('[data-remove-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      builderState.items.splice(Number(btn.dataset.removeIndex), 1);
      renderBuilderItems();
      updateBuilderDurationPreview();
    });
  });

  container.querySelectorAll('[data-field]').forEach((input) => {
    const event = input.tagName === 'SELECT' ? 'change' : 'input';
    input.addEventListener(event, () => {
      const idx = Number(input.dataset.index);
      const field = input.dataset.field;
      builderState.items[idx][field] = field === 'mode' ? input.value : Number(input.value);
      updateBuilderDurationPreview();
    });
  });
}

function updateBuilderDurationPreview() {
  const el = document.getElementById('builder-duration-preview');
  if (!el) return;
  const fakeProgram = { items: builderState.items, restBetween: 60 };
  const sec = estimateProgramDuration(fakeProgram);
  el.textContent = sec > 0 ? `Durée estimée : ${formatDurationSeconds(sec)}` : 'Durée estimée : —';
}

function saveBuilderProgram() {
  const name = document.getElementById('builder-name-input').value.trim();
  if (!name) { showToast('Donne un nom au programme'); return; }
  if (builderState.items.length === 0) { showToast('Ajoute au moins un exercice'); return; }

  saveProgram({
    id: generateId(),
    name,
    created: todayString(),
    restBetween: 60,
    items: builderState.items
  });

  resetBuilder();
  switchRenfoTab('programs');
  renderProgramsList();
  showToast(`Programme « ${name} » enregistré !`);
}

function runGenerator(type) {
  const muscles = [...document.querySelectorAll('.gen-muscle-check:checked')].map((c) => c.value);
  if (muscles.length === 0) { showToast('Choisis au moins un muscle'); return; }

  let items;
  let name;

  if (type === 'time') {
    const minutes = Number(document.getElementById('gen-time-minutes').value) || 30;
    items = generateProgramByTime(muscles, minutes);
    name = `Auto ${minutes} min`;
  } else {
    const count = Number(document.getElementById('gen-exercise-count').value) || 5;
    items = generateProgramByMuscles(muscles, count);
    name = `Auto ${MUSCLE_GROUPS[muscles[0]]?.label || 'Mix'}`;
  }

  if (items.length === 0) { showToast('Pas assez d’exercices pour ce muscle'); return; }

  saveProgram({
    id: generateId(),
    name,
    created: todayString(),
    restBetween: 60,
    items
  });

  renderProgramsList();
  switchRenfoTab('programs');
  showToast(`Programme « ${name} » généré !`);
}

function renderEquipmentGuide() {
  const container = document.getElementById('equipment-guide');
  if (!container) return;
  const wgerMeta = typeof WGER_CATALOG_META !== 'undefined' ? WGER_CATALOG_META : null;
  const wgerBlock = wgerMeta ? `
    <div class="card equipment-card wger-credit">
      <h3>Catalogue wger</h3>
      <p class="hint">${wgerMeta.count} exercices importés (${wgerMeta.withImages} avec photo). Données sous licence <a href="https://wger.de" target="_blank" rel="noopener">wger.de</a> (CC-BY-SA).</p>
      <p class="hint">${wgerMeta.frenchDescriptions || wgerMeta.count} descriptions en français${wgerMeta.autoTranslated ? ' (traduction auto pour le reste)' : ''}.</p>
      <p class="hint">Mise à jour : ${new Date(wgerMeta.fetchedAt).toLocaleDateString('fr-FR')}</p>
      <p class="hint">Les programmes tout faits wger (routines avec temps/repos) nécessitent un compte wger. Sport propose des <strong>programmes exemples</strong> générés depuis le catalogue (onglet Programmes → Importer).</p>
    </div>
  ` : '';
  container.innerHTML = wgerBlock + Object.values(EQUIPMENT_GUIDE).map((guide) => `
    <div class="card equipment-card">
      <h3>${guide.title}</h3>
      <ul class="equipment-list">${guide.points.map((p) => `<li>${p}</li>`).join('')}</ul>
    </div>
  `).join('');
}

function renderRunningHub() {
  renderRunsList();
}

function bindWorkoutUI() {
  document.getElementById('open-renfo-hub')?.addEventListener('click', openRenfoHub);
  document.getElementById('open-running-hub')?.addEventListener('click', openRunningHub);
  document.getElementById('back-from-renfo')?.addEventListener('click', () => showScreen('screen-home'));
  document.getElementById('back-from-running')?.addEventListener('click', () => showScreen('screen-home'));

  document.querySelectorAll('.renfo-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchRenfoTab(tab.dataset.renfoTab));
  });

  document.getElementById('builder-save-btn')?.addEventListener('click', saveBuilderProgram);
  document.getElementById('close-exercise-detail')?.addEventListener('click', closeExerciseDetail);
  document.getElementById('add-ex-to-builder')?.addEventListener('click', () => {
    if (viewingExerciseId) {
      addExerciseToBuilder(viewingExerciseId);
      closeExerciseDetail();
      switchRenfoTab('create');
    }
  });

  document.getElementById('muscle-filter')?.addEventListener('change', (e) => {
    selectedMuscleFilter = e.target.value;
    renderExerciseBrowser();
  });

  document.getElementById('catalog-source')?.addEventListener('change', (e) => {
    selectedCatalogSource = e.target.value;
    renderExerciseBrowser();
  });

  document.getElementById('exercise-search')?.addEventListener('input', (e) => {
    exerciseSearchQuery = e.target.value;
    renderExerciseBrowser();
  });

  document.getElementById('gen-by-muscles-btn')?.addEventListener('click', () => runGenerator('muscles'));
  document.getElementById('gen-by-time-btn')?.addEventListener('click', () => runGenerator('time'));

  document.getElementById('import-wger-programs-btn')?.addEventListener('click', () => {
    const result = importWgerStarterPrograms();
    if (result.skipped) {
      showToast('Programmes wger déjà importés');
      return;
    }
    if (result.imported === 0) {
      showToast('Catalogue wger indisponible — recharge la page');
      return;
    }
    renderProgramsList();
    showToast(`${result.imported} programmes wger ajoutés !`);
    hapticSuccess();
  });

  renderEquipmentGuide();
  bindProgramPlayer();
  bindRunning();
}

function escapeHtml(str) {
  return String(str).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
