#!/usr/bin/env node
/**
 * Récupère le catalogue public wger (exercices + photos) et génère js/wger-catalog.js
 * Usage: node scripts/fetch-wger.mjs
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

const MUSCLE_MAP = {
  glutes: 'fessiers',
  gluteus: 'fessiers',
  quads: 'jambes',
  quadriceps: 'jambes',
  hamstrings: 'jambes',
  calves: 'jambes',
  soleus: 'jambes',
  gastrocnemius: 'jambes',
  'brachialis': 'bras',
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
  'none (bodyweight exercise)': 'none',
  'resistance band': 'elastiques',
  'resistance band ': 'elastiques',
  'resistance band': 'elastiques',
  barbell: 'barre',
  'ez barbell': 'barre',
  dumbbell: 'elastiques',
  kettlebell: 'elastiques',
  'gym mat': 'none',
  'pull-up bar': 'none',
  'bench': 'barre',
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

function mapMuscle(muscles) {
  for (const m of muscles) {
    const key = (m.name_en || m.name || '').toLowerCase();
    for (const [needle, group] of Object.entries(MUSCLE_MAP)) {
      if (key.includes(needle)) return group;
    }
  }
  const cat = (muscles[0]?.name_en || '').toLowerCase();
  if (cat) return 'jambes';
  return 'abdos';
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

function pickTranslation(translations) {
  return (
    translations.find((t) => t.language === LANG_FR) ||
    translations.find((t) => t.language === LANG_EN) ||
    translations[0]
  );
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

function normalizeExercise(raw) {
  const tr = pickTranslation(raw.translations || []);
  if (!tr?.name) return null;

  const plain = stripHtml(tr.description_source || tr.description || '');
  const desc = plain.slice(0, 650);
  const tips = extractTips(plain);
  const mainImage = (raw.images || []).find((img) => img.is_main) || raw.images?.[0];
  const imageUrl = mainImage?.thumbnails?.medium || mainImage?.image || '';

  const category = raw.category?.name || '';
  const isTimed = /cardio|stretch/i.test(category);

  return {
    id: `wger-${raw.id}`,
    wgerId: raw.id,
    name: tr.name.trim(),
    muscle: mapMuscle(raw.muscles || []),
    equipment: mapEquipment(raw.equipment || []),
    desc: desc || 'Consulte la description complète sur wger.de.',
    tips: tips.length ? tips : ['Contrôle le mouvement', 'Respire régulièrement', 'Adapte la charge'],
    image: imageUrl,
    defaultMode: isTimed ? 'time' : 'reps',
    defaultValue: isTimed ? 30 : 12,
    category,
    source: 'wger'
  };
}

async function main() {
  console.log('Téléchargement du catalogue wger (public, sans compte)…');
  const rawList = await fetchAllExercises();
  const exercises = rawList.map(normalizeExercise).filter(Boolean);

  const withImage = exercises.filter((e) => e.image).length;
  const frCount = rawList.filter((r) => r.translations?.some((t) => t.language === LANG_FR)).length;

  const payload = {
    fetchedAt: new Date().toISOString(),
    count: exercises.length,
    withImages: withImage,
    frenchTranslations: frCount,
    license: 'CC-BY-SA — https://wger.de',
    exercises
  };

  const js = `/* Generated by scripts/fetch-wger.mjs — do not edit by hand */
/* ${exercises.length} exercices · ${withImage} avec photo · CC-BY-SA wger.de */
const WGER_CATALOG_META = ${JSON.stringify({
    fetchedAt: payload.fetchedAt,
    count: payload.count,
    withImages: payload.withImages,
    license: payload.license
  })};
const WGER_EXERCISES = ${JSON.stringify(exercises)};
`;

  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, js, 'utf8');

  console.log(`✓ ${exercises.length} exercices exportés`);
  console.log(`✓ ${withImage} avec photo`);
  console.log(`✓ ${frCount} avec traduction FR sur wger`);
  console.log(`→ ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
