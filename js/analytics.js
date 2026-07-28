const WEEKDAY_NAMES = [
  'dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'
];

function getSessionCountByDate(sessions) {
  return sessions.reduce((acc, session) => {
    acc[session.date] = (acc[session.date] || 0) + 1;
    return acc;
  }, {});
}

function getWeekComparison(sessions) {
  const thisWeek = filterSessionsByDates(sessions, getWeekDates());
  const lastWeekStart = getWeekStart(new Date());
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeek = filterSessionsByDates(sessions, getWeekDates(lastWeekStart));

  const thisMinutes = sumDuration(thisWeek);
  const lastMinutes = sumDuration(lastWeek);

  if (lastMinutes === 0) {
    return { thisMinutes, lastMinutes, delta: null, label: 'Première semaine active !' };
  }

  const delta = Math.round(((thisMinutes - lastMinutes) / lastMinutes) * 100);
  const sign = delta >= 0 ? '+' : '';
  return {
    thisMinutes,
    lastMinutes,
    delta,
    label: `${sign}${delta} % vs la semaine dernière`
  };
}

function getMaxStreak(sessions) {
  const dates = getActiveDates(sessions).sort();
  if (dates.length === 0) return 0;

  let max = 1;
  let current = 1;

  for (let i = 1; i < dates.length; i += 1) {
    const prev = new Date(`${dates[i - 1]}T12:00:00`);
    const curr = new Date(`${dates[i]}T12:00:00`);
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);

    if (diff === 1) {
      current += 1;
      max = Math.max(max, current);
    } else if (diff > 1) {
      current = 1;
    }
  }

  return max;
}

function getMaxWeekMinutes(sessions) {
  if (sessions.length === 0) return 0;

  const weekTotals = new Map();
  sessions.forEach((session) => {
    const weekKey = getWeekDates(new Date(`${session.date}T12:00:00`))[0];
    weekTotals.set(weekKey, (weekTotals.get(weekKey) || 0) + Number(session.duration || 0));
  });

  return Math.max(...weekTotals.values());
}

function getPersonalRecords(sessions) {
  const durations = sessions.map((session) => Number(session.duration || 0));
  return {
    longestSession: durations.length ? Math.max(...durations) : 0,
    biggestWeek: getMaxWeekMinutes(sessions),
    longestStreak: getMaxStreak(sessions)
  };
}

function getFavoriteWeekday(sessions) {
  const counts = [0, 0, 0, 0, 0, 0, 0];

  sessions.forEach((session) => {
    const day = new Date(`${session.date}T12:00:00`).getDay();
    counts[day] += 1;
  });

  const max = Math.max(...counts);
  if (max === 0) return null;

  const index = counts.indexOf(max);
  return { name: WEEKDAY_NAMES[index], count: max };
}

function getMonthMinutes(sessions, monthOffset = 0) {
  const anchor = new Date();
  anchor.setDate(1);
  anchor.setMonth(anchor.getMonth() + monthOffset);

  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  return sumDuration(
    sessions.filter((session) => {
      const date = new Date(`${session.date}T12:00:00`);
      return date.getFullYear() === year && date.getMonth() === month;
    })
  );
}

function getTypeMonthTrend(sessions, type) {
  const thisMonth = sumDuration(sessions.filter((session) => {
    const date = new Date(`${session.date}T12:00:00`);
    const now = new Date();
    return session.type === type &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
  }));

  const lastMonth = sumDuration(sessions.filter((session) => {
    const date = new Date(`${session.date}T12:00:00`);
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return session.type === type &&
      date.getMonth() === last.getMonth() &&
      date.getFullYear() === last.getFullYear();
  }));

  if (lastMonth === 0 && thisMonth === 0) return null;
  if (lastMonth === 0) return { type, label: `Plus de ${type} ce mois-ci qu'avant !`, delta: 100 };
  const delta = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
  const sign = delta >= 0 ? '+' : '';
  return {
    type,
    thisMonth,
    lastMonth,
    delta,
    label: `${sign}${delta} % de ${type} vs le mois dernier`
  };
}

function isProgressingWeeks(sessions, weeks = 4) {
  const anchor = getWeekStart(new Date());
  const totals = [];

  for (let i = weeks - 1; i >= 0; i -= 1) {
    const start = new Date(anchor);
    start.setDate(anchor.getDate() - i * 7);
    totals.push(sumDuration(filterSessionsByDates(sessions, getWeekDates(start))));
  }

  if (totals.every((value) => value === 0)) return false;

  let increases = 0;
  for (let i = 1; i < totals.length; i += 1) {
    if (totals[i] >= totals[i - 1] && totals[i] > 0) increases += 1;
  }

  return increases >= weeks - 2;
}

function daysSinceLastType(sessions, type) {
  const typeSessions = sessions
    .filter((session) => session.type === type)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (typeSessions.length === 0) return null;

  const last = new Date(`${typeSessions[0].date}T12:00:00`);
  const today = new Date(`${todayString()}T12:00:00`);
  return Math.floor((today - last) / (1000 * 60 * 60 * 24));
}

function generateInsights(sessions, settings) {
  const insights = [];
  const comparison = getWeekComparison(sessions);
  const goal = Number(settings.goal || 0);
  const weekMinutes = comparison.thisMinutes;
  const favDay = getFavoriteWeekday(sessions);

  if (sessions.length === 0) {
    insights.push('Ajoute ta première séance pour débloquer des insights personnalisés.');
    return insights;
  }

  if (isProgressingWeeks(sessions)) {
    insights.push('Tu progresses depuis plusieurs semaines — continue comme ça !');
  }

  if (comparison.delta !== null && comparison.delta > 0) {
    insights.push(`+${comparison.delta} % d'activité cette semaine par rapport à la précédente.`);
  }

  if (goal > 0 && weekMinutes >= goal) {
    insights.push('Bravo, ton objectif hebdomadaire est atteint !');
  }

  if (favDay && favDay.count >= 2) {
    insights.push(`Tu t'entraînes surtout le ${favDay.name}.`);
  }

  getSportNames().forEach((type) => {
    const trend = getTypeMonthTrend(sessions, type);
    if (trend && trend.delta > 15) {
      insights.push(trend.label);
    }

    const days = daysSinceLastType(sessions, type);
    if (days !== null && days >= 10) {
      insights.push(`Tu n'as pas fait de ${type} depuis ${days} jours.`);
    }
  });

  const records = getPersonalRecords(sessions);
  if (weekMinutes > 0 && weekMinutes >= records.biggestWeek * 0.9 && weekMinutes === records.biggestWeek) {
    insights.push('Record : ta meilleure semaine en minutes !');
  }

  return insights.slice(0, 5);
}

function buildWeeklySummary(sessions) {
  const weekSessions = filterSessionsByDates(sessions, getWeekDates());
  const comparison = getWeekComparison(sessions);
  const byType = aggregateByType(weekSessions);
  const top = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
  const favDay = getFavoriteWeekday(weekSessions);

  return {
    minutes: sumDuration(weekSessions),
    sessions: weekSessions.length,
    comparison,
    favoriteSport: top ? top[0] : '—',
    bestDay: favDay ? favDay.name : '—'
  };
}

function renderPersonalRecords(sessions) {
  const container = document.getElementById('records-list');
  if (!container) return;

  const records = getPersonalRecords(sessions);
  const items = [
    { label: 'Plus longue séance', value: `${records.longestSession} min` },
    { label: 'Plus grosse semaine', value: `${records.biggestWeek} min` },
    { label: 'Plus longue série', value: `${records.longestStreak} j` }
  ];

  container.innerHTML = items.map((item) => `
    <div class="record-item">
      <span>${item.label}</span>
      <strong>${item.value}</strong>
    </div>
  `).join('');
}

function renderTrends(sessions) {
  const container = document.getElementById('trends-list');
  if (!container) return;

  const trends = [];
  const comparison = getWeekComparison(sessions);
  if (comparison.delta !== null) trends.push(comparison.label);

  const favDay = getFavoriteWeekday(sessions);
  if (favDay && favDay.count >= 2) {
    trends.push(`Jour préféré : ${favDay.name} (${favDay.count} séances)`);
  }

  getSportNames().forEach((type) => {
    const monthTrend = getTypeMonthTrend(sessions, type);
    if (monthTrend && (monthTrend.delta > 0 || monthTrend.thisMonth > 0)) {
      trends.push(monthTrend.label);
    }
  });

  if (trends.length === 0) {
    container.innerHTML = '<p class="empty-state small">Les tendances apparaîtront après quelques séances.</p>';
    return;
  }

  container.innerHTML = trends.slice(0, 4).map((trend) => `
    <div class="insight-item trend-item">${trend}</div>
  `).join('');
}

function renderInsights(sessions, settings) {
  const container = document.getElementById('insights-list');
  if (!container) return;

  const insights = generateInsights(sessions, settings);
  container.innerHTML = insights.map((insight) => `
    <div class="insight-item">${insight}</div>
  `).join('');
}

function renderWeeklySummaryModal(sessions) {
  const summary = buildWeeklySummary(sessions);
  document.getElementById('summary-minutes').textContent = `${summary.minutes} min`;
  document.getElementById('summary-sessions').textContent = `${summary.sessions}`;
  document.getElementById('summary-delta').textContent = summary.comparison.label;
  document.getElementById('summary-sport').textContent = summary.favoriteSport;
  document.getElementById('summary-day').textContent = summary.bestDay;

  const deltaEl = document.getElementById('summary-delta');
  if (deltaEl && summary.comparison.delta !== null) {
    deltaEl.classList.toggle('negative', summary.comparison.delta < 0);
  }
}

function openWeeklySummary() {
  renderWeeklySummaryModal(loadSessions());
  const modal = document.getElementById('weekly-summary-modal');
  if (modal) modal.hidden = false;
}

function closeWeeklySummary() {
  const modal = document.getElementById('weekly-summary-modal');
  if (modal) modal.hidden = true;
}

function bindWeeklySummary() {
  document.getElementById('open-weekly-summary')?.addEventListener('click', openWeeklySummary);
  document.getElementById('close-weekly-summary')?.addEventListener('click', closeWeeklySummary);
  document.getElementById('weekly-summary-modal')?.addEventListener('click', (event) => {
    if (event.target.id === 'weekly-summary-modal') closeWeeklySummary();
  });
}

function renderSportsSettings() {
  const list = document.getElementById('sports-settings-list');
  if (!list) return;

  const sports = loadSports();
  list.innerHTML = sports.map((sport) => `
    <div class="sport-setting-item">
      <span class="sport-icon">${getSportIconHtml(sport.name)}</span>
      <span>${sport.name}</span>
      ${DEFAULT_SPORTS.some((item) => item.name === sport.name)
    ? '<span class="hint">Par défaut</span>'
    : `<button type="button" class="delete-btn compact" data-remove-sport="${sport.name}">Retirer</button>`}
    </div>
  `).join('');

  list.querySelectorAll('[data-remove-sport]').forEach((button) => {
    button.addEventListener('click', () => {
      if (removeCustomSport(button.dataset.removeSport)) {
        renderSportsSettings();
        renderSportButtons();
        populateSportSelect(document.getElementById('edit-session-type'));
        refreshApp();
        showToast('Sport retiré');
      }
    });
  });
}

function bindSportsSettings() {
  const iconSelect = document.getElementById('new-sport-icon');
  if (iconSelect) {
    iconSelect.innerHTML = ICON_PICKER_OPTIONS.map((option) => `
      <option value="${option.key}">${option.label} ${SPORT_SVG[option.key] ? '' : option.key}</option>
    `).join('');
  }

  document.getElementById('add-sport-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const name = document.getElementById('new-sport-name').value;
    const icon = document.getElementById('new-sport-icon').value;

    if (addCustomSport(name, icon)) {
      document.getElementById('new-sport-name').value = '';
      renderSportsSettings();
      renderSportButtons();
      populateSportSelect(document.getElementById('edit-session-type'));
      showToast(`${name.trim()} ajouté !`);
    } else {
      showToast('Ce sport existe déjà');
    }
  });

  renderSportsSettings();
}
