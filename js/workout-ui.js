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

function openEquitationHub() {
  renderEquitationSessionsList();
  applyEquitationTypeDefaults();
  showScreen('screen-equitation');
}

function renderRunningHub() {
  renderRunsList();
  applyRunTypeDefaults();
}

function renderRenfoHub() {
  renderProgramsList();
  renderExerciseBrowser();
  renderAiPlansList();
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
  if (tab === 'exercises') renderExerciseBrowser();
  if (tab === 'ai-coach') {
    initAiCoachForm();
    renderAiPlansList();
  }
}

function initAiCoachForm() {
  if (window.__aiCoachFormLoaded) return;
  const saved = loadAiCoachProfile();
  if (saved) populateAiCoachForm(saved);
  else {
    toggleAiPlanModeFields('single');
    toggleCycleFields();
    toggleFemalePhysioFields();
  }
  window.__aiCoachFormLoaded = true;
}

function bindCycleFields() {
  const ids = ['ai-sexe', 'ai-cycle-adapt', 'ai-last-period', 'ai-cycle-length', 'ai-cycle-phase-manual', 'ai-contraception', 'ai-pelvic-floor'];
  ids.forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => {
      if (id === 'ai-pelvic-floor') window.__pelvicFloorTouched = true;
      toggleCycleFields();
      toggleFemalePhysioFields();
    });
    document.getElementById(id)?.addEventListener('input', () => {
      toggleCycleFields();
      toggleFemalePhysioFields();
    });
  });
}

function bindAiCoachModeTabs() {
  document.querySelectorAll('.ai-mode-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ai-mode-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      toggleAiPlanModeFields(tab.dataset.aiMode);
    });
  });
}

function renderAiPlansList() {
  const container = document.getElementById('ai-plans-list');
  if (!container) return;

  const plans = loadAiPlans();
  if (plans.length === 0) {
    container.innerHTML = '<p class="empty-state">Aucun plan IA enregistré.</p>';
    return;
  }

  container.innerHTML = plans.map((plan) => {
    const week = plan.currentWeek || 1;
    const weekData = plan.weeks.find((w) => w.week === week);
    const sessions = weekData?.sessions || [];
    return `
      <article class="card ai-plan-card" data-plan-id="${plan.id}">
        <div class="ai-plan-header">
          <strong>${escapeHtml(plan.planName)}</strong>
          <button type="button" class="delete-btn compact" data-del-plan="${plan.id}">✕</button>
        </div>
        <p class="hint">${plan.weeks.length} semaines · ${plan.profile?.objectif || ''} · ${plan.profile?.seancesSemaine || '?'} séances/sem</p>
        <label>Semaine active
          <select data-plan-week="${plan.id}" class="ai-week-select">
            ${plan.weeks.map((w) => `<option value="${w.week}" ${w.week === week ? 'selected' : ''}>S${w.week}${w.focus ? ` — ${escapeHtml(w.focus)}` : ''}</option>`).join('')}
          </select>
        </label>
        <div class="ai-plan-sessions">
          ${sessions.map((session, idx) => `
            <button type="button" class="secondary-btn ai-session-btn" data-plan-id="${plan.id}" data-week="${week}" data-session="${idx}">
              ▶ ${escapeHtml(session.name)} (${session.items.length} ex.)
            </button>
          `).join('')}
        </div>
        <button type="button" class="secondary-btn compact" data-import-week="${plan.id}" data-week="${week}" style="width:100%;margin-top:8px;">
          Enregistrer semaine ${week} dans Programmes
        </button>
      </article>
    `;
  }).join('');

  container.querySelectorAll('[data-del-plan]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (confirm('Supprimer ce plan IA ?')) {
        deleteAiPlan(btn.dataset.delPlan);
        renderAiPlansList();
        showToast('Plan supprimé');
      }
    });
  });

  container.querySelectorAll('.ai-week-select').forEach((select) => {
    select.addEventListener('change', () => {
      setAiPlanCurrentWeek(select.dataset.planWeek, Number(select.value));
      renderAiPlansList();
    });
  });

  container.querySelectorAll('.ai-session-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const plan = getAiPlanById(btn.dataset.planId);
      const program = sessionToProgram(plan, Number(btn.dataset.week), Number(btn.dataset.session));
      if (program) startProgramPlayer(program);
    });
  });

  container.querySelectorAll('[data-import-week]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const plan = getAiPlanById(btn.dataset.importWeek);
      const count = importAiPlanWeekAsPrograms(plan, Number(btn.dataset.week));
      renderProgramsList();
      showToast(`${count} séances ajoutées aux Programmes`);
      hapticSuccess();
    });
  });
}

let pendingAiPlan = null;

function renderAiPlanPreviewContent(plan, weekNum) {
  const week = plan.weeks.find((w) => w.week === weekNum) || plan.weeks[0];
  const container = document.getElementById('ai-preview-content');
  if (!container || !week) return;

  container.innerHTML = (week.sessions || []).map((session) => {
    const dur = estimateProgramDuration({ items: session.items || [], restBetween: 60 });
    const exercises = (session.items || []).map((item) => {
      const ex = getExerciseById(item.exerciseId);
      const name = ex?.name || item.exerciseId;
      const detail = item.mode === 'time'
        ? `${item.sets}× ${item.value}s`
        : `${item.sets}× ${item.value} reps`;
      return `
        <div class="ai-preview-exercise">
          <span>${escapeHtml(name)}</span>
          <span class="ai-preview-exercise-meta">${detail}</span>
        </div>
      `;
    }).join('');

    return `
      <article class="ai-preview-session">
        <h4>${escapeHtml(session.name)} · ~${Math.round(dur / 60)} min</h4>
        ${exercises}
      </article>
    `;
  }).join('');
}

function showAiPlanPreviewModal(plan) {
  pendingAiPlan = plan;
  const modal = document.getElementById('ai-plan-preview-modal');
  const summary = document.getElementById('ai-preview-summary');
  const weekSelect = document.getElementById('ai-preview-week-select');
  const importCheck = document.getElementById('ai-preview-import-week');
  const title = document.getElementById('ai-preview-title');
  const weekLabel = document.querySelector('.ai-preview-week-label');
  const importLabel = document.getElementById('ai-preview-import-label-text');
  const acceptBtn = document.getElementById('ai-preview-accept');
  if (!modal || !summary || !weekSelect) return;

  const isSingle = plan.profile?.planMode === 'single';
  const sessionsPerWeek = plan.weeks[0]?.sessions?.length || 0;
  const legSets = countWeekLegSets(plan.weeks[0]);
  const priorities = (plan.profile?.musclePriorities || [])
    .map((m) => MUSCLE_LABELS[m] || m).join(', ') || 'équilibré';
  const session = plan.weeks[0]?.sessions?.[0];
  const sessionDur = session
    ? Math.round(estimateProgramDuration({ items: session.items, restBetween: 60 }) / 60)
    : 0;
  const cycleLine = isCycleAdaptationActive(plan.profile)
    ? getCyclePhaseSummary(plan.profile)
    : '';
  const pelvicLine = isPelvicFloorProtectionActive(plan.profile)
    ? 'Abdos plancher pelvien (transverse + périnée)'
    : '';

  if (title) title.textContent = isSingle ? 'Aperçu de la séance' : 'Aperçu du programme';
  if (weekLabel) weekLabel.hidden = isSingle;
  if (importLabel) {
    importLabel.textContent = isSingle
      ? 'Ajouter cette séance aux Programmes'
      : 'Importer la semaine 1 dans Programmes';
  }
  if (acceptBtn) acceptBtn.textContent = isSingle ? 'Valider la séance' : 'Valider le programme';

  summary.innerHTML = isSingle
    ? `<strong>${escapeHtml(plan.planName)}</strong><br>
       ~${sessionDur} min · ${escapeHtml(plan.profile?.objectif || '')}<br>
       Priorités : ${escapeHtml(priorities)} · ${session?.items?.length || 0} exercices${cycleLine ? `<br>Cycle : ${escapeHtml(cycleLine)}` : ''}${pelvicLine ? `<br>${escapeHtml(pelvicLine)}` : ''}`
    : `<strong>${escapeHtml(plan.planName)}</strong><br>
       ${plan.weeks.length} sem · ${sessionsPerWeek} séance(s)/sem · ${escapeHtml(plan.profile?.objectif || '')}<br>
       Priorités : ${escapeHtml(priorities)}${cycleLine ? `<br>Cycle actuel : ${escapeHtml(cycleLine)}` : ''}${pelvicLine ? `<br>${escapeHtml(pelvicLine)}` : ''}<br>
       Semaine 1 : ${legSets} séries jambes/fessiers${plan.constraints?.maxLegSetsWeek ? ` (max ${plan.constraints.maxLegSetsWeek})` : ''}`;

  weekSelect.innerHTML = plan.weeks.map((w) =>
    `<option value="${w.week}">S${w.week}${w.focus ? ` — ${escapeHtml(w.focus)}` : ''}</option>`
  ).join('');

  if (importCheck) importCheck.checked = true;
  renderAiPlanPreviewContent(plan, plan.weeks[0]?.week || 1);
  modal.hidden = false;
}

function closeAiPlanPreviewModal() {
  const modal = document.getElementById('ai-plan-preview-modal');
  if (modal) modal.hidden = true;
  pendingAiPlan = null;
}

function acceptAiPlanPreview() {
  if (!pendingAiPlan) return;
  const plan = pendingAiPlan;
  const importWeek = document.getElementById('ai-preview-import-week')?.checked;
  const isSingle = plan.profile?.planMode === 'single';
  saveAiPlan(plan);
  let imported = 0;
  if (importWeek) {
    if (isSingle) {
      const program = sessionToProgram(plan, 1, 0);
      if (program) {
        saveProgram(program);
        imported = 1;
      }
    } else {
      imported = importAiPlanWeekAsPrograms(plan, 1);
    }
    renderProgramsList();
  }
  renderAiPlansList();
  closeAiPlanPreviewModal();
  document.getElementById('ai-json-import').value = '';
  showToast(imported
    ? (isSingle ? 'Séance ajoutée aux Programmes !' : `Programme validé · ${imported} séance(s) ajoutée(s)`)
    : (isSingle ? 'Séance enregistrée' : 'Programme validé et enregistré'));
  hapticSuccess();
}

function rejectAiPlanPreview() {
  closeAiPlanPreviewModal();
  showToast('Programme non enregistré');
}

async function handleAiGenerate() {
  const profile = readAiProfileFromForm();
  const constraints = readAiConstraintsFromForm();
  const btn = document.getElementById('ai-generate-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Génération…';
  }

  try {
    saveAiCoachProfile(profile, constraints);
    const plan = await buildAiPlanPreview(profile, constraints);
    showAiPlanPreviewModal(plan);
  } catch (err) {
    if (err.message === 'MANUAL_MODE') {
      showToast('Mode manuel : colle le JSON Groq puis « Prévisualiser »');
      const preview = document.getElementById('ai-prompt-preview');
      if (preview && !preview.value) {
        try {
          preview.value = getAiPromptForClipboard(profile, constraints);
        } catch {
          /* form validation */
        }
      }
      document.querySelector('.ai-advanced-options')?.setAttribute('open', '');
    } else {
      showToast(err.message.slice(0, 120));
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      const isSingle = document.querySelector('.ai-mode-tab.active')?.dataset.aiMode === 'single';
      btn.textContent = isSingle ? 'Générer ma séance' : 'Générer le programme';
    }
  }
}

function handleAiCopyPrompt() {
  const profile = readAiProfileFromForm();
  const constraints = readAiConstraintsFromForm();
  let text;
  try {
    text = getAiPromptForClipboard(profile, constraints);
  } catch (err) {
    showToast(err.message.slice(0, 120));
    return;
  }
  const preview = document.getElementById('ai-prompt-preview');
  if (preview) preview.value = text;
  navigator.clipboard?.writeText(text).then(() => {
    showToast('Prompt copié — colle-le dans Groq');
  }).catch(() => {
    showToast('Prompt affiché ci-dessus');
  });
}

function initAiPlanPreviewModal() {
  document.getElementById('ai-preview-accept')?.addEventListener('click', acceptAiPlanPreview);
  document.getElementById('ai-preview-reject')?.addEventListener('click', rejectAiPlanPreview);
  document.getElementById('ai-preview-close')?.addEventListener('click', rejectAiPlanPreview);
  document.getElementById('ai-preview-week-select')?.addEventListener('change', (e) => {
    if (pendingAiPlan) {
      renderAiPlanPreviewContent(pendingAiPlan, Number(e.target.value));
    }
  });
  document.getElementById('ai-plan-preview-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'ai-plan-preview-modal') rejectAiPlanPreview();
  });
}

function handleAiImportJson() {
  const raw = document.getElementById('ai-json-import')?.value.trim();
  if (!raw) {
    showToast('Colle d’abord le JSON');
    return;
  }
  if (raw.includes('Tu es un coach musculation') || raw.includes('CATALOGUE EXERCICES')) {
    showToast('Tu as collé le prompt, pas la réponse JSON');
    return;
  }
  try {
    const profile = readAiProfileFromForm();
    const constraints = readAiConstraintsFromForm();
    saveAiCoachProfile(profile, constraints);
    const plan = parseAiPlan(raw, profile, constraints);
    showAiPlanPreviewModal(plan);
  } catch (err) {
    showToast(err.message.slice(0, 140));
  }
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
  document.getElementById('open-equitation-hub')?.addEventListener('click', openEquitationHub);
  document.getElementById('back-from-equitation')?.addEventListener('click', () => showScreen('screen-home'));
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

  document.getElementById('ai-generate-btn')?.addEventListener('click', handleAiGenerate);
  document.getElementById('ai-clear-profile-btn')?.addEventListener('click', clearAiCoachForm);
  document.getElementById('ai-copy-prompt-btn')?.addEventListener('click', handleAiCopyPrompt);
  document.getElementById('ai-import-json-btn')?.addEventListener('click', handleAiImportJson);
  initAiPlanPreviewModal();

  renderEquipmentGuide();
  bindProgramPlayer();
  bindRunning();
  bindEquitation();
  bindAiCoachModeTabs();
  bindCycleFields();
}

function escapeHtml(str) {
  return String(str).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
