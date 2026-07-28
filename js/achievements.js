const BADGES_KEY = 'sporrBadges';

const ACHIEVEMENTS = {
  first_session: { emoji: '🌟', title: 'Première séance', desc: 'Le début de l\'aventure' },
  streak_3: { emoji: '🔥', title: 'En feu', desc: '3 jours consécutifs' },
  streak_7: { emoji: '💪', title: 'Une semaine !', desc: '7 jours consécutifs' },
  sessions_10: { emoji: '⭐', title: '10 séances', desc: 'La régularité paie' },
  goal_week: { emoji: '🎯', title: 'Objectif atteint', desc: 'Objectif hebdo validé' },
  minutes_300: { emoji: '🏆', title: '300 minutes', desc: 'Plus de 5h au total' }
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

function countSessionsByType(sessions, type) {
  return sessions.filter((session) => session.type === type).length;
}

function checkAchievements(sessions, settings) {
  const unlocked = [];
  const streak = calculateStreak(sessions);
  const weekSessions = filterSessionsByDates(sessions, getWeekDates());
  const weekMinutes = sumDuration(weekSessions);
  const goal = Number(settings.goal || 0);
  const totalMinutes = sumDuration(sessions);

  const checks = [
  { id: 'first_session', ok: sessions.length >= 1 },
  { id: 'streak_3', ok: streak >= 3 },
  { id: 'streak_7', ok: streak >= 7 },
  { id: 'sessions_10', ok: sessions.length >= 10 },
  { id: 'goal_week', ok: goal > 0 && weekMinutes >= goal },
  { id: 'minutes_300', ok: totalMinutes >= 300 }
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

  if (badges.length === 0) {
    container.innerHTML = '<p class="empty-state small">Débloque des badges en t\'entraînant !</p>';
    return;
  }

  container.innerHTML = badges.map((id) => {
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

function getWeekComparison(sessions) {
  const thisWeek = filterSessionsByDates(sessions, getWeekDates());
  const lastWeekStart = getWeekStart(new Date());
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeek = filterSessionsByDates(sessions, getWeekDates(lastWeekStart));

  const thisMinutes = sumDuration(thisWeek);
  const lastMinutes = sumDuration(lastWeek);

  if (lastMinutes === 0) {
    return { thisMinutes, delta: null, label: 'Première semaine active !' };
  }

  const delta = Math.round(((thisMinutes - lastMinutes) / lastMinutes) * 100);
  const sign = delta >= 0 ? '+' : '';
  return {
    thisMinutes,
    delta,
    label: `${sign}${delta}% vs la semaine dernière`
  };
}

function getSessionCountByDate(sessions) {
  return sessions.reduce((acc, session) => {
    acc[session.date] = (acc[session.date] || 0) + 1;
    return acc;
  }, {});
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
