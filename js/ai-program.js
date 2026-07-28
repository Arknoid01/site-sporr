const AI_JSON_SCHEMA = `{
  "planName": "Hypertrophie 12 semaines",
  "weeks": [
    {
      "week": 1,
      "focus": "Accumulation",
      "sessions": [
        {
          "name": "Push",
          "items": [
            {
              "exerciseId": "wger-123",
              "sets": 3,
              "mode": "reps",
              "value": 10,
              "restSets": 90,
              "restAfter": 120
            }
          ]
        }
      ]
    }
  ]
}`;

function buildAiSystemPrompt() {
  return `Tu es un coach musculation expert. Tu réponds UNIQUEMENT en JSON valide, sans markdown, sans texte avant ou après.

Règles strictes :
- Utilise UNIQUEMENT des exerciseId présents dans le catalogue fourni.
- mode = "reps" | "time" | "maxrep" ; value = répétitions ou secondes.
- Respecte TOUTES les contraintes (durée, zones sensibles, séries jambes/semaine, priorités).
- Génère exactement le nombre de semaines demandé (1 pour séance unique) avec progression réaliste.
- Chaque semaine a le même nombre de séances que demandé.
- repos en secondes : restSets (entre séries), restAfter (après l'exercice).
- Muscles prioritaires = plus de volume dessus.
- Exclus les exercices listés en « à éviter » et les zones à ménager.
- Séances ≤ durée max (estime ~3 s/rep + repos).`;
}

function formatMuscleList(muscles) {
  if (!muscles?.length) return 'équilibré (aucune priorité)';
  return muscles.map((m) => MUSCLE_LABELS[m] || m).join(', ');
}

function formatZoneList(constraints) {
  const zones = [];
  if (constraints.kneeSensitive) zones.push('genoux');
  if (constraints.backSensitive) zones.push('dos/lombaires');
  if (constraints.shoulderSensitive) zones.push('épaules');
  if (constraints.wristSensitive) zones.push('poignets');
  return zones.length ? zones.join(', ') : 'aucune';
}

function buildAiUserPrompt(profile, constraints, exercises) {
  const catalog = buildExerciseCatalogText(exercises);
  const catalogNote = exercises.length >= AI_CATALOG_MAX
    ? `\n(Catalogue filtré : ${exercises.length} exercices pertinents pour ton matériel et tes contraintes.)`
    : '';
  const isSingle = profile.planMode === 'single';
  const planWeeks = isSingle ? 1 : (profile.planWeeks || 12);
  const modeLine = isSingle
    ? 'SÉANCE UNIQUE — 1 semaine, 1 séance, pas de programme long'
    : `Programme ${planWeeks} semaines · ${profile.seancesSemaine || 2} séances/semaine`;

  return `PROFIL :
- Sexe : ${profile.sexe || 'non précisé'}
- Âge : ${profile.age || '?'} ans
- Niveau : ${profile.niveau || 'intermédiaire'}
- Objectif : ${profile.objectif || 'hypertrophie'}
- Matériel : ${profile.materiel || 'salle complète'}

PERSONNALISATION :
- Mode : ${modeLine}
${isSingle && profile.sessionName ? `- Nom de la séance : ${profile.sessionName}` : ''}
- Exercices par séance : ${profile.exercisesPerSession || 4}
- Repos : ${constraints.restPreference === 'short' ? 'court' : constraints.restPreference === 'long' ? 'long' : 'moyen'}
- Muscles prioritaires : ${formatMuscleList(profile.musclePriorities)}
- Inclure abdos : ${constraints.includeAbs !== false ? 'oui' : 'non'}

CONTRAINTES :
- Durée max par séance : ${constraints.maxMinutes || 60} min
- Zones à ménager : ${formatZoneList(constraints)}
${!isSingle ? `- Max séries jambes+fessiers/semaine : ${constraints.maxLegSetsWeek > 0 ? constraints.maxLegSetsWeek : 'non précisé — adapte prudemment'}` : ''}
${constraints.excludeExercises ? `- Exercices à éviter : ${constraints.excludeExercises}` : ''}
${constraints.notes ? `- Notes : ${constraints.notes}` : ''}

CATALOGUE EXERCICES (exerciseId|nom|muscle|matériel) :
${catalog}${catalogNote}

IMPORTANT : réponds UNIQUEMENT avec le JSON du programme (pas ce prompt, pas de markdown).

Génère ${isSingle ? 'une séance unique (1 semaine, 1 session)' : `un programme ${planWeeks} semaines`}. Schéma JSON :
${AI_JSON_SCHEMA.replace('12 semaines', isSingle ? '1 séance' : `${planWeeks} semaines`)}`;
}

function extractJsonFromText(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Réponse IA illisible — colle du JSON valide');
  }
}

async function callGroq(apiKey, systemPrompt, userPrompt, model = 'openai/gpt-oss-120b') {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_completion_tokens: 16384,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Erreur Groq (${res.status})`);
  return data.choices?.[0]?.message?.content || '';
}

async function buildAiPlanPreview(profile, constraints) {
  validateAiForm(profile, constraints);
  const settings = loadSettings();
  const provider = settings.aiProvider || 'local';

  if (provider === 'local') {
    return generateLocalAiPlan(profile, constraints);
  }

  if (provider === 'manual') {
    throw new Error('MANUAL_MODE');
  }

  if (provider !== 'groq' && provider !== 'xai' && provider !== 'openai') {
    throw new Error('Fournisseur IA inconnu — choisis Groq dans Réglages');
  }

  const apiKey = settings.groqKey?.trim();
  if (!apiKey) {
    throw new Error('Clé API Groq manquante — voir Réglages (console.groq.com)');
  }

  const exercises = getExercisesForAiPrompt(profile, constraints);
  const systemPrompt = buildAiSystemPrompt();
  const userPrompt = buildAiUserPrompt(profile, constraints, exercises);

  let content;
  try {
    content = await callGroq(
      apiKey,
      systemPrompt,
      userPrompt,
      settings.groqModel || 'openai/gpt-oss-120b'
    );
  } catch (err) {
    if (err.message.includes('Failed to fetch') || err.name === 'TypeError') {
      throw new Error('Réseau ou CORS bloqué — passe en plan local dans Réglages');
    }
    throw err;
  }

  return parseAiPlan(content, profile, constraints);
}

async function generateAiPlanWithProvider(profile, constraints) {
  const plan = await buildAiPlanPreview(profile, constraints);
  saveAiPlan(plan);
  return plan;
}

function parseAiPlan(jsonText, profile, constraints) {
  validateAiForm(profile, constraints);
  const data = typeof jsonText === 'string' ? extractJsonFromText(jsonText) : jsonText;
  const errors = validateAiPlanData(data, constraints);
  if (errors.length) {
    throw new Error(`Plan invalide :\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n… +${errors.length - 5}` : ''}`);
  }
  return normalizeAiPlanData(data, profile, constraints);
}

function parseAndSaveAiPlan(jsonText, profile, constraints) {
  const plan = parseAiPlan(jsonText, profile, constraints);
  saveAiPlan(plan);
  return plan;
}

function getAiPromptForClipboard(profile, constraints) {
  validateAiForm(profile, constraints);
  const exercises = getExercisesForAiPrompt(profile, constraints);
  return `${buildAiSystemPrompt()}\n\n---\n\n${buildAiUserPrompt(profile, constraints, exercises)}`;
}

function readAiProfileFromForm() {
  return {
    planMode: document.querySelector('.ai-mode-tab.active')?.dataset.aiMode || 'single',
    sessionName: document.getElementById('ai-session-name')?.value.trim() || '',
    sexe: document.getElementById('ai-sexe')?.value || '',
    age: document.getElementById('ai-age')?.value || '',
    niveau: document.getElementById('ai-niveau')?.value || '',
    objectif: document.getElementById('ai-objectif')?.value || '',
    seancesSemaine: Number(document.getElementById('ai-seances')?.value) || 0,
    materiel: document.getElementById('ai-materiel')?.value || '',
    planWeeks: Number(document.getElementById('ai-plan-weeks')?.value) || 12,
    exercisesPerSession: Number(document.getElementById('ai-ex-per-session')?.value) || 4,
    musclePriorities: [...document.querySelectorAll('.ai-priority-check:checked')].map((c) => c.value)
  };
}

function readAiConstraintsFromForm() {
  return {
    maxMinutes: Number(document.getElementById('ai-max-min')?.value) || 0,
    kneeSensitive: document.getElementById('ai-knee')?.checked || false,
    backSensitive: document.getElementById('ai-back')?.checked || false,
    shoulderSensitive: document.getElementById('ai-shoulder')?.checked || false,
    wristSensitive: document.getElementById('ai-wrist')?.checked || false,
    maxLegSetsWeek: Number(document.getElementById('ai-max-leg-sets')?.value) || 0,
    restPreference: document.getElementById('ai-rest')?.value || 'medium',
    includeAbs: document.getElementById('ai-include-abs')?.checked !== false,
    excludeExercises: document.getElementById('ai-exclude')?.value.trim() || '',
    notes: document.getElementById('ai-notes')?.value.trim() || '',
    planWeeks: Number(document.getElementById('ai-plan-weeks')?.value) || 12
  };
}

function populateAiCoachForm(saved) {
  if (!saved?.profile) return;
  const { profile, constraints } = saved;
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null && val !== '') el.value = val;
  };
  const setCheck = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.checked = !!val;
  };

  set('ai-sexe', profile.sexe);
  set('ai-age', profile.age);
  set('ai-niveau', profile.niveau);
  set('ai-objectif', profile.objectif);
  set('ai-seances', profile.seancesSemaine);
  set('ai-materiel', profile.materiel);
  set('ai-plan-weeks', profile.planWeeks || 12);
  set('ai-ex-per-session', profile.exercisesPerSession || 4);
  set('ai-session-name', profile.sessionName);

  document.querySelectorAll('.ai-mode-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.aiMode === (profile.planMode || 'single'));
  });
  toggleAiPlanModeFields(profile.planMode || 'single');

  document.querySelectorAll('.ai-priority-check').forEach((cb) => {
    cb.checked = (profile.musclePriorities || []).includes(cb.value);
  });

  if (constraints) {
    set('ai-max-min', constraints.maxMinutes);
    set('ai-max-leg-sets', constraints.maxLegSetsWeek);
    set('ai-rest', constraints.restPreference || 'medium');
    set('ai-exclude', constraints.excludeExercises);
    set('ai-notes', constraints.notes);
    setCheck('ai-knee', constraints.kneeSensitive);
    setCheck('ai-back', constraints.backSensitive);
    setCheck('ai-shoulder', constraints.shoulderSensitive);
    setCheck('ai-wrist', constraints.wristSensitive);
    setCheck('ai-include-abs', constraints.includeAbs !== false);
  }
}

function clearAiCoachForm() {
  document.getElementById('ai-coach-form')?.reset();
  document.querySelectorAll('.ai-priority-check').forEach((cb) => { cb.checked = false; });
  document.querySelectorAll('.ai-mode-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.aiMode === 'single');
  });
  toggleAiPlanModeFields('single');
  const abs = document.getElementById('ai-include-abs');
  if (abs) abs.checked = true;
  localStorage.removeItem(AI_PROFILE_KEY);
  window.__aiCoachFormLoaded = true;
  showToast('Profil réinitialisé');
}

function validateAiForm(profile, constraints) {
  const missing = [];
  if (!profile.sexe) missing.push('sexe');
  if (!profile.age) missing.push('âge');
  if (!profile.niveau) missing.push('niveau');
  if (!profile.objectif) missing.push('objectif');
  if (!profile.materiel) missing.push('matériel');
  if (!constraints.maxMinutes || constraints.maxMinutes < 15) missing.push('durée max');
  if (profile.planMode !== 'single') {
    if (!profile.seancesSemaine || profile.seancesSemaine < 2) missing.push('séances/semaine');
  }
  if (missing.length) {
    throw new Error(`Complète ton profil : ${missing.join(', ')}`);
  }
}

function toggleAiPlanModeFields(mode) {
  const isSingle = mode === 'single';
  document.querySelectorAll('.ai-program-only').forEach((el) => {
    el.hidden = isSingle;
  });
  document.querySelectorAll('.ai-single-only').forEach((el) => {
    el.hidden = !isSingle;
  });
  const seancesInput = document.getElementById('ai-seances');
  if (seancesInput) seancesInput.required = !isSingle;
  const genBtn = document.getElementById('ai-generate-btn');
  if (genBtn) genBtn.textContent = isSingle ? 'Générer ma séance' : 'Générer le programme';
}
