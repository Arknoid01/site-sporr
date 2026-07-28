const BADGES_KEY = 'sporrBadges';

const ACHIEVEMENTS = {
  first_session: { emoji: '🌟', title: 'Première séance', desc: 'Le début de l\'aventure' },
  streak_3: { emoji: '🔥', title: 'En feu', desc: '3 jours consécutifs' },
  streak_7: { emoji: '💪', title: 'Une semaine !', desc: '7 jours consécutifs' },
  streak_10: { emoji: '🚀', title: '10 jours', desc: '10 jours consécutifs' },
  streak_30: { emoji: '👑', title: 'Mois de feu', desc: '30 jours consécutifs' },
  sessions_10: { emoji: '⭐', title: '10 séances', desc: 'La régularité paie' },
  sessions_25: { emoji: '✨', title: '25 séances', desc: 'Belle constance' },
  sessions_50: { emoji: '💎', title: '50 séances', desc: 'Demi-centaine !' },
  sessions_100: { emoji: '🏅', title: '100 séances', desc: 'Centurion du sport' },
  minutes_300: { emoji: '🏆', title: '300 minutes', desc: 'Plus de 5 h au total' },
  minutes_500: { emoji: '🎖️', title: '500 minutes', desc: 'Plus de 8 h au total' },
  minutes_1000: { emoji: '🥇', title: '1000 minutes', desc: 'Plus de 16 h au total' },
  goal_week: { emoji: '🎯', title: 'Objectif atteint', desc: 'Objectif hebdo validé' },
  first_month: { emoji: '📅', title: 'Premier mois', desc: '4 semaines actives d\'affilée' },
  early_bird: { emoji: '🌅', title: 'Lève-tôt', desc: 'Séance avant 8 h' },
  evening: { emoji: '🌙', title: 'Séance du soir', desc: 'Séance après 20 h' },
  record_week: { emoji: '📈', title: 'Record semaine', desc: 'Meilleure semaine en minutes' }
};

function loadBadges() {
  const data = localStorage.getItem(BADGES_KEY);
  if (!data) return [];
  return data.split('|').filter(Boolean);
}

function saveBadges(badges) {
  localStorage.setItem(BADGES_KEY, badges.join('|'));
}

function unlockBadge(id) {
  const badges = loadBadges();
  if (badges.includes(id)) return null;
  badges.push(id);
  saveBadges(badges);
  return ACHIEVEMENTS[id];
}

function hasEarlySession(sessions) {
  return sessions.some((session) => {
    if (!session.time) return false;
    const hour = Number(session.time.split(':')[0]);
    return hour < 8;
  });
}

function hasEveningSession(sessions) {
  return sessions.some((session) => {
    if (!session.time) return false;
    const hour = Number(session.time.split(':')[0]);
    return hour >= 20;
  });
}

function hasFourActiveWeeks(sessions) {
  const anchor = getWeekStart(new Date());
  for (let i = 0; i < 4; i += 1) {
    const start = new Date(anchor);
    start.setDate(anchor.getDate() - i * 7);
    const week = filterSessionsByDates(sessions, getWeekDates(start));
    if (week.length === 0) return false;
  }
  return true;
}

function isRecordWeek(sessions) {
  const current = sumDuration(filterSessionsByDates(sessions, getWeekDates()));
  if (current === 0) return false;
  return current >= getMaxWeekMinutes(sessions);
}

function checkAchievements(sessions, settings) {
  const unlocked = [];
  const maxStreak = getMaxStreak(sessions);
  const weekMinutes = sumDuration(filterSessionsByDates(sessions, getWeekDates()));
  const goal = Number(settings.goal || 0);
  const totalMinutes = sumDuration(sessions);

  const checks = [
    { id: 'first_session', ok: sessions.length >= 1 },
    { id: 'streak_3', ok: maxStreak >= 3 },
    { id: 'streak_7', ok: maxStreak >= 7 },
    { id: 'streak_10', ok: maxStreak >= 10 },
    { id: 'streak_30', ok: maxStreak >= 30 },
    { id: 'sessions_10', ok: sessions.length >= 10 },
    { id: 'sessions_25', ok: sessions.length >= 25 },
    { id: 'sessions_50', ok: sessions.length >= 50 },
    { id: 'sessions_100', ok: sessions.length >= 100 },
    { id: 'minutes_300', ok: totalMinutes >= 300 },
    { id: 'minutes_500', ok: totalMinutes >= 500 },
    { id: 'minutes_1000', ok: totalMinutes >= 1000 },
    { id: 'goal_week', ok: goal > 0 && weekMinutes >= goal },
    { id: 'first_month', ok: hasFourActiveWeeks(sessions) },
    { id: 'early_bird', ok: hasEarlySession(sessions) },
    { id: 'evening', ok: hasEveningSession(sessions) },
    { id: 'record_week', ok: isRecordWeek(sessions) }
  ];

  checks.forEach(({ id, ok }) => {
    if (ok) {
      const badge = unlockBadge(id);
      if (badge) unlocked.push({ id, ...badge });
    }
  });

  return unlocked;
}

function renderAchievements() {
  const container = document.getElementById('achievements-list');
  if (!container) return;

  const badges = loadBadges();
  const allIds = Object.keys(ACHIEVEMENTS);

  if (badges.length === 0) {
    container.innerHTML = '<p class="empty-state small">Débloque des badges en t\'entraînant !</p>';
    return;
  }

  const sorted = [...badges].sort((a, b) => allIds.indexOf(a) - allIds.indexOf(b));
  container.innerHTML = sorted.map((id) => {
    const badge = ACHIEVEMENTS[id];
    if (!badge) return '';
    return `
      <div class="badge-chip" title="${badge.desc}">
        <span class="badge-emoji">${badge.emoji}</span>
        <span class="badge-label">${badge.title}</span>
      </div>
    `;
  }).join('');
}

const MOTIVATION_QUOTES = [
  'Chaque séance compte, Sarah.',
  'Tu es plus forte que tu ne le penses.',
  'Un pas à la fois, tu y arrives.',
  'Ton corps te dit merci.',
  'La constance bat la perfection.'
];

function dailyQuote() {
  const dayIndex = Number(todayString().replaceAll('-', '')) % MOTIVATION_QUOTES.length;
  return MOTIVATION_QUOTES[dayIndex];
}
