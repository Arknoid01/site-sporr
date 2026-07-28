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
- Respecte TOUTES les contraintes (durée, genou, séries jambes/semaine).
- Génère exactement 12 semaines avec progression réaliste (volume, reps ou charge suggérée dans "focus").
- Chaque semaine a le même nombre de séances que demandé.
- repos en secondes : restSets (entre séries), restAfter (après l'exercice).
- Évite les exercices à impact genou si genou sensible.
- Séances ≤ durée max (estime ~3 s/rep + repos).`;
}

function buildAiUserPrompt(profile, constraints, exercises) {
  const catalog = buildExerciseCatalogText(exercises);
  return `PROFIL :
- Sexe : ${profile.sexe || 'non précisé'}
- Âge : ${profile.age || '?'} ans
- Niveau : ${profile.niveau || 'intermédiaire'}
- Objectif : ${profile.objectif || 'hypertrophie'}
- Séances/semaine : ${profile.seancesSemaine || 4}
- Matériel : ${profile.materiel || 'salle complète'}

CONTRAINTES :
- Durée max par séance : ${constraints.maxMinutes || 60} min
- Genou sensible : ${constraints.kneeSensitive ? 'OUI — éviter fentes profondes, sauts, plyométrie' : 'non'}
- Max séries jambes+fessiers/semaine : ${constraints.maxLegSetsWeek > 0 ? constraints.maxLegSetsWeek : 'non précisé — adapte prudemment'}
${constraints.notes ? `- Notes : ${constraints.notes}` : ''}

CATALOGUE EXERCICES (exerciseId|nom|muscle|matériel) :
${catalog}

Génère un programme 12 semaines. Schéma JSON :
${AI_JSON_SCHEMA}`;
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

async function generateAiPlanWithProvider(profile, constraints) {
  validateAiForm(profile, constraints);
  const settings = loadSettings();
  const provider = settings.aiProvider || 'manual';
  const exercises = getExercisesForAiPrompt(profile);
  const systemPrompt = buildAiSystemPrompt();
  const userPrompt = buildAiUserPrompt(profile, constraints, exercises);

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
      throw new Error('Réseau ou CORS bloqué — utilise « Copier le prompt » puis « Importer JSON »');
    }
    throw err;
  }

  return parseAndSaveAiPlan(content, profile, constraints);
}

function parseAndSaveAiPlan(jsonText, profile, constraints) {
  validateAiForm(profile, constraints);
  const data = extractJsonFromText(jsonText);
  const errors = validateAiPlanData(data, constraints);
  if (errors.length) {
    throw new Error(`Plan invalide :\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n… +${errors.length - 5}` : ''}`);
  }
  const plan = normalizeAiPlanData(data, profile, constraints);
  saveAiPlan(plan);
  return plan;
}

function getAiPromptForClipboard(profile, constraints) {
  validateAiForm(profile, constraints);
  const exercises = getExercisesForAiPrompt(profile);
  return `${buildAiSystemPrompt()}\n\n---\n\n${buildAiUserPrompt(profile, constraints, exercises)}`;
}

function readAiProfileFromForm() {
  return {
    sexe: document.getElementById('ai-sexe')?.value || '',
    age: document.getElementById('ai-age')?.value || '',
    niveau: document.getElementById('ai-niveau')?.value || '',
    objectif: document.getElementById('ai-objectif')?.value || '',
    seancesSemaine: Number(document.getElementById('ai-seances')?.value) || 0,
    materiel: document.getElementById('ai-materiel')?.value || ''
  };
}

function readAiConstraintsFromForm() {
  return {
    maxMinutes: Number(document.getElementById('ai-max-min')?.value) || 0,
    kneeSensitive: document.getElementById('ai-knee')?.checked || false,
    maxLegSetsWeek: Number(document.getElementById('ai-max-leg-sets')?.value) || 0,
    notes: document.getElementById('ai-notes')?.value.trim() || ''
  };
}

function validateAiForm(profile, constraints) {
  const missing = [];
  if (!profile.sexe) missing.push('sexe');
  if (!profile.age) missing.push('âge');
  if (!profile.niveau) missing.push('niveau');
  if (!profile.objectif) missing.push('objectif');
  if (!profile.seancesSemaine || profile.seancesSemaine < 2) missing.push('séances/semaine');
  if (!profile.materiel) missing.push('matériel');
  if (!constraints.maxMinutes || constraints.maxMinutes < 15) missing.push('durée max');
  if (missing.length) {
    throw new Error(`Complète ton profil : ${missing.join(', ')}`);
  }
}
