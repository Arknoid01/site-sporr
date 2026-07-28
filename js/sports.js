const SPORTS_KEY = 'sporrSports';

const DEFAULT_SPORTS = [
  { name: 'Yoga', icon: 'yoga' },
  { name: 'Renforcement', icon: 'strength' },
  { name: 'Running', icon: 'running' },
  { name: 'Équitation', icon: 'equestrian' }
];

const SPORT_SVG = {
  yoga: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-1 6.5 2 3.5 3-1.5V18h2v-7l-4 2-2.5-4.5H9v11h2v-6.5Z"/></svg>',
  strength: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h2v4H4v-4Zm14 0h2v4h-2v-4ZM7 11h10v2H7v-2Zm-3 3h2v2H4v-2Zm16 0h2v2h-2v-2Z"/></svg>',
  running: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2ZM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5V9c-1.9 0-3.5-.9-4.6-2.3l-1.1-1.6c-.4-.6-1-1-1.7-1.2l-.6-.2V4h-2v2.5l2.2.5Z"/></svg>',
  equestrian: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18c0-2 2-4 5-4h2c2 0 3-1 4-2l1-2h2l-1 3c-.5 1.5-2 3-4 3h-1.5c-2 0-3.5 1-3.5 2.5V18H4v0Zm8-11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm7 3-2 1-2-3 2-1 2 3Z"/></svg>',
  swim: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 15c2.5-1 4-2 6-2s3.5 1 6 2 4 2 6 2v2c-2.5-1-4-2-6-2s-3.5 1-6 2-4 2-6 2v-2Zm0-5c2.5-1 4-2 6-2s3.5 1 6 2 4 2 6 2v2c-2.5-1-4-2-6-2s-3.5 1-6 2-4 2-6 2v-2Z"/></svg>',
  bike: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM5 12h3l2-3 2 6 2.5-3H19l1 4H5v-4Z"/></svg>',
  walk: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 5.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7.5 22 9 13l3 2v7h2v-8.3l-2.8-1.9 1.2-5.4 4.3 5.5V22h2v-9.5l-5.2-6.7-.9-4H11l-1.2 5.3L7.5 22Z"/></svg>',
  dance: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-1 6 2 4 4-2v10h-2V13.5l-2.5 1.2L9 22H7l3.5-9.5L12 8Z"/></svg>',
  generic: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 6v6c0 5 3.4 9.4 8 10 4.6-.6 8-5 8-10V6l-8-4Z"/></svg>'
};

const ICON_PICKER_OPTIONS = [
  { key: 'yoga', label: 'Yoga' },
  { key: 'strength', label: 'Force' },
  { key: 'running', label: 'Course' },
  { key: 'equestrian', label: 'Équitation' },
  { key: 'swim', label: 'Natation' },
  { key: 'bike', label: 'Vélo' },
  { key: 'walk', label: 'Marche' },
  { key: 'dance', label: 'Danse' },
  { key: '🏋️', label: 'Emoji' },
  { key: '🧘', label: 'Emoji' },
  { key: '🏃', label: 'Emoji' },
  { key: '🚴', label: 'Emoji' },
  { key: '🏊', label: 'Emoji' },
  { key: '⚽', label: 'Emoji' },
  { key: 'generic', label: 'Autre' }
];

function loadSports() {
  const data = localStorage.getItem(SPORTS_KEY);
  if (!data) return DEFAULT_SPORTS.map((sport) => ({ ...sport }));

  return data.split('|').filter(Boolean).map((entry) => {
    const colon = entry.indexOf(':');
    if (colon === -1) return { name: entry, icon: 'generic' };
    return {
      name: entry.slice(0, colon),
      icon: entry.slice(colon + 1)
    };
  });
}

function saveSports(sports) {
  localStorage.setItem(
    SPORTS_KEY,
    sports.map((sport) => `${sport.name}:${sport.icon}`).join('|')
  );
}

function getSportNames() {
  return loadSports().map((sport) => sport.name);
}

function getSportIconHtml(sportName) {
  const sport = loadSports().find((item) => item.name === sportName);
  if (!sport) return SPORT_SVG.generic;

  if (SPORT_SVG[sport.icon]) {
    return SPORT_SVG[sport.icon];
  }

  return `<span class="sport-emoji-icon" aria-hidden="true">${sport.icon}</span>`;
}

function addCustomSport(name, icon) {
  const trimmed = name.trim();
  if (!trimmed) return false;

  const sports = loadSports();
  if (sports.some((sport) => sport.name.toLowerCase() === trimmed.toLowerCase())) {
    return false;
  }

  sports.push({ name: trimmed, icon: icon || 'generic' });
  saveSports(sports);
  return true;
}

function removeCustomSport(name) {
  const defaults = DEFAULT_SPORTS.map((sport) => sport.name);
  if (defaults.includes(name)) return false;

  const sports = loadSports().filter((sport) => sport.name !== name);
  saveSports(sports);
  return true;
}

function populateSportSelect(select) {
  if (!select) return;
  select.innerHTML = getSportNames()
    .map((name) => `<option value="${name}">${name}</option>`)
    .join('');
}
