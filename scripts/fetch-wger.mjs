#!/usr/bin/env node
/**
 * Récupère le catalogue public wger (exercices + photos) et génère js/wger-catalog.js
 * Usage:
 *   node scripts/fetch-wger.mjs
 *   node scripts/fetch-wger.mjs --translate   # traduit les descriptions manquantes en FR
 * API: https://wger.de/api/v2/ — données CC-BY-SA, crédit wger.de requis dans l'app
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_FILE = join(__dirname, '../js/wger-catalog.js');
const BASE = 'https://wger.de/api/v2';
const LANG_FR = 12;
const LANG_EN = 2;
const TRANSLATE = process.argv.includes('--translate');

const LANG_PAIR = {
  1: 'de|fr',
  2: 'en|fr',
  4: 'es|fr',
  6: 'nl|fr',
  7: 'pt|fr',
  13: 'it|fr',
  16: 'tr|fr'
};

const MUSCLE_MAP = {
  glutes: 'fessiers',
  gluteus: 'fessiers',
  quads: 'jambes',
  quadriceps: 'jambes',
  hamstrings: 'jambes',
  calves: 'jambes',
  soleus: 'jambes',
  gastrocnemius: 'jambes',
  brachialis: 'bras',
  biceps: 'bras',
  triceps: 'bras',
  forearms: 'bras',
  brachioradialis: 'bras',
  shoulders: 'epaules',
  deltoids: 'epaules',
  'anterior deltoid': 'epaules',
  'posterior deltoid': 'epaules',
  chest: 'pectoraux',
  pectoralis: 'pectoraux',
  abs: 'abdos',
  abdominals: 'abdos',
  obliquus: 'abdos',
  obliques: 'abdos',
  lats: 'dos',
  latissimus: 'dos',
  trapezius: 'dos',
  traps: 'dos',
  'lower back': 'dos',
  'upper back': 'dos',
  erector: 'dos',
  rhomboids: 'dos',
  teres: 'dos'
};

const EQUIPMENT_MAP = {
  'none (bodyweight exercise)': 'none',
  'resistance band': 'elastiques',
  barbell: 'barre',
  'ez barbell': 'barre',
  dumbbell: 'elastiques',
  kettlebell: 'elastiques',
  'gym mat': 'none',
  'pull-up bar': 'none',
  bench: 'barre',
  'incline bench': 'barre',
  'swiss ball': 'none'
};

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTips(text) {
  const tips = [];
  const numbered = text.match(/\d+\.\s[^.\d]+/g) || [];
  numbered.forEach((line) => {
    const tip = line.replace(/^\d+\.\s*/, '').trim();
    if (tip.length > 8 && tip.length < 120) tips.push(tip);
  });
  if (tips.length === 0) {
    const bullets = text.split('•').map((s) => s.trim()).filter((s) => s.length > 8 && s.length < 120);
    tips.push(...bullets.slice(0, 5));
  }
  return tips.slice(0, 5);
}

function looksFrench(text) {
  if (!text || text.length < 16) return false;
  if (/[éèêàçùôîûïëœ]/i.test(text)) return true;
  return /\b(les|des|avec|pieds|genoux|position|bras|dos|contracte|tenez|allongé|fléchir)\b/i.test(text);
}

function mapMuscle(muscles) {
  for (const m of muscles) {
    const key = (m.name_en || m.name || '').toLowerCase();
    for (const [needle, group] of Object.entries(MUSCLE_MAP)) {
      if (key.includes(needle)) return group;
    }
  }
  return 'jambes';
}

function mapEquipment(equipment) {
  if (!equipment.length) return 'none';
  const name = (equipment[0].name || '').toLowerCase().trim();
  for (const [key, val] of Object.entries(EQUIPMENT_MAP)) {
    if (name.includes(key)) return val;
  }
  if (name.includes('band')) return 'elastiques';
  if (name.includes('bar')) return 'barre';
  return 'none';
}

function translationText(tr) {
  return stripHtml(tr?.description_source || tr?.description || '');
}

function pickTranslation(translations) {
  const list = translations || [];
  const withText = list.filter((t) => translationText(t).length > 20);
  return (
    withText.find((t) => t.language === LANG_FR) ||
    withText.find((t) => t.language === LANG_EN) ||
    list.find((t) => t.language === LANG_FR) ||
    list.find((t) => t.language === LANG_EN) ||
    withText[0] ||
    list[0]
  );
}

function pickFrenchName(translations, fallback) {
  const fr = translations?.find((t) => t.language === LANG_FR && t.name?.trim());
  return fr?.name.trim() || fallback;
}

async function fetchPage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchAllExercises() {
  const items = [];
  let url = `${BASE}/exerciseinfo/?limit=100`;
  while (url) {
    process.stdout.write(`\rFetching ${items.length}…`);
    const data = await fetchPage(url);
    items.push(...data.results);
    url = data.next;
    await new Promise((r) => setTimeout(r, 350));
  }
  process.stdout.write('\n');
  return items;
}

async function translateToFrench(text, sourceLang = LANG_EN) {
  const chunk = text.slice(0, 480).trim();
  if (!chunk) return text;
  const pair = LANG_PAIR[sourceLang] || 'en|fr';
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${pair}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.responseStatus !== 200 || data.quotaFinished) {
    throw new Error(data.responseDetails || 'Quota traduction atteint');
  }
  await new Promise((r) => setTimeout(r, 1100));
  return data.responseData.translatedText;
}

function normalizeExercise(raw) {
  const tr = pickTranslation(raw.translations || []);
  if (!tr?.name) return null;

  const plain = translationText(tr);
  const desc = plain.slice(0, 650);
  const tips = extractTips(plain);
  const mainImage = (raw.images || []).find((img) => img.is_main) || raw.images?.[0];
  const imageUrl = mainImage?.thumbnails?.medium || mainImage?.image || '';
  const category = raw.category?.name || '';
  const isTimed = /cardio|stretch/i.test(category);
  const name = pickFrenchName(raw.translations, tr.name.trim());
  const descLang = tr.language === LANG_FR && looksFrench(desc) ? 'fr' : looksFrench(desc) ? 'fr' : 'other';

  return {
    id: `wger-${raw.id}`,
    wgerId: raw.id,
    name,
    muscle: mapMuscle(raw.muscles || []),
    equipment: mapEquipment(raw.equipment || []),
    desc: desc || 'Consulte la description complète sur wger.de.',
    tips: tips.length ? tips : ['Contrôle le mouvement', 'Respire régulièrement', 'Adapte la charge'],
    image: imageUrl,
    defaultMode: isTimed ? 'time' : 'reps',
    defaultValue: isTimed ? 30 : 12,
    category,
    source: 'wger',
    descLang,
    _sourceLang: tr.language
  };
}

async function translateExerciseFields(exercise) {
  const updated = { ...exercise };
  try {
    if (updated.descLang !== 'fr') {
      const translated = await translateToFrench(updated.desc, updated._sourceLang);
      updated.desc = translated.slice(0, 650);
      updated.tips = extractTips(translated);
      if (!updated.tips.length) {
        updated.tips = ['Contrôle le mouvement', 'Respire régulièrement', 'Adapte la charge'];
      }
      updated.descLang = 'fr';
    }
  } catch (err) {
    console.warn(`\nTraduction ignorée pour ${exercise.name}: ${err.message}`);
  }
  delete updated._sourceLang;
  return updated;
}

async function main() {
  console.log('Téléchargement du catalogue wger (public, sans compte)…');
  const rawList = await fetchAllExercises();
  let exercises = rawList.map(normalizeExercise).filter(Boolean);

  let frDesc = exercises.filter((e) => e.descLang === 'fr').length;
  console.log(`Descriptions FR natives wger : ${frDesc}/${exercises.length}`);

  if (TRANSLATE) {
    const toTranslate = exercises.filter((e) => e.descLang !== 'fr');
    console.log(`Traduction auto de ${toTranslate.length} descriptions…`);
    for (let i = 0; i < toTranslate.length; i += 1) {
      process.stdout.write(`\rTraduction ${i + 1}/${toTranslate.length}…`);
      const idx = exercises.findIndex((e) => e.id === toTranslate[i].id);
      exercises[idx] = await translateExerciseFields(toTranslate[i]);
    }
    process.stdout.write('\n');
    frDesc = exercises.filter((e) => e.descLang === 'fr').length;
  }

  exercises = exercises.map(({ _sourceLang, ...rest }) => rest);

  const withImage = exercises.filter((e) => e.image).length;

  const js = `/* Generated by scripts/fetch-wger.mjs — do not edit by hand */
/* ${exercises.length} exercices · ${withImage} avec photo · ${frDesc} desc FR · CC-BY-SA wger.de */
const WGER_CATALOG_META = ${JSON.stringify({
    fetchedAt: new Date().toISOString(),
    count: exercises.length,
    withImages: withImage,
    frenchDescriptions: frDesc,
    autoTranslated: TRANSLATE,
    license: 'CC-BY-SA — https://wger.de'
  })};
const WGER_EXERCISES = ${JSON.stringify(exercises)};
`;

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, js, 'utf8');

  console.log(`✓ ${exercises.length} exercices exportés`);
  console.log(`✓ ${withImage} avec photo`);
  console.log(`✓ ${frDesc} descriptions en français`);
  console.log(`→ ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
