const SPORT_ICONS = {
  Yoga: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-1 6.5 2 3.5 3-1.5V18h2v-7l-4 2-2.5-4.5H9v11h2v-6.5Z"/></svg>`,
  Renforcement: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h2v4H4v-4Zm14 0h2v4h-2v-4ZM7 11h10v2H7v-2Zm-3 3h2v2H4v-2Zm16 0h2v2h-2v-2Z"/></svg>`,
  Running: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2ZM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3c1.3 1.5 3.3 2.5 5.5 2.5V9c-1.9 0-3.5-.9-4.6-2.3l-1.1-1.6c-.4-.6-1-1-1.7-1.2l-.6-.2V4h-2v2.5l2.2.5Z"/></svg>`
};

let selectedSport = '';
let selectedDuration = 30;
let toastTimer = null;
let editingSession = null;

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.toggle('active', screen.id === screenId);
  });

  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.screen === screenId);
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('visible');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('visible');
  }, 2800);
}

function renderSportButtons() {
  const container = document.getElementById('sport-buttons');
  if (!container) return;

  container.innerHTML = SPORT_TYPES.map((sport) => `
    <button type="button" class="sport-btn ${selectedSport === sport ? 'selected' : ''}" data-sport="${sport}">
      <span class="sport-icon">${SPORT_ICONS[sport]}</span>
      <span>${sport}</span>
    </button>
  `).join('');

  container.querySelectorAll('.sport-btn').forEach((button) => {
    button.addEventListener('click', () => {
      selectedSport = button.dataset.sport;
      renderSportButtons();
    });
  });
}

function renderDurationButtons() {
  const container = document.getElementById('duration-buttons');
  if (!container) return;

  const durations = [15, 30, 45, 60];
  container.innerHTML = durations.map((duration) => `
    <button type="button" class="duration-btn ${selectedDuration === duration ? 'selected' : ''}" data-duration="${duration}">
      ${duration} min
    </button>
  `).join('');

  container.querySelectorAll('.duration-btn').forEach((button) => {
    button.addEventListener('click', () => {
      selectedDuration = Number(button.dataset.duration);
      renderDurationButtons();
      document.getElementById('session-duration-custom').value = selectedDuration;
    });
  });
}

function createSessionCard(session, showDate = false) {
  const note = session.note
    ? `<p class="session-note">${escapeHtml(session.note)}</p>`
    : '';
  const calories = session.calories ? `${session.calories} kcal` : '—';

  return `
    <article class="session-card" data-type="${session.type}">
      <div class="session-card-header">
        <span class="session-type-badge" data-type="${session.type}">
          <span class="sport-icon">${SPORT_ICONS[session.type] || ''}</span>
          ${session.type}
        </span>
        ${showDate ? `<span class="session-date">${formatDisplayDate(session.date)}</span>` : ''}
      </div>
      <div class="session-card-body">
        <span>${session.duration} min</span>
        <span>${calories}</span>
      </div>
      ${note}
      <div class="session-actions">
        <button
          type="button"
          class="edit-btn"
          data-date="${session.date}"
          data-type="${session.type}"
          data-duration="${session.duration}"
          data-calories="${session.calories || ''}"
          data-note="${encodeURIComponent(session.note || '')}"
        >
          Modifier
        </button>
        <button
          type="button"
          class="delete-btn"
          data-date="${session.date}"
          data-type="${session.type}"
          data-duration="${session.duration}"
        >
          Supprimer
        </button>
      </div>
    </article>
  `;
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatDisplayDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });
}

function renderSessionList(containerId, sessions, emptyMessage, showDate = false) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (sessions.length === 0) {
    container.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
    return;
  }

  container.innerHTML = sessions
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((session) => createSessionCard(session, showDate))
    .join('');

  container.querySelectorAll('.delete-btn').forEach((button) => {
    button.addEventListener('click', () => {
      deleteSession(
        button.dataset.date,
        button.dataset.type,
        button.dataset.duration
      );
      refreshApp();
      showToast('Séance supprimée');
    });
  });

  container.querySelectorAll('.edit-btn').forEach((button) => {
    button.addEventListener('click', () => {
      openEditModal({
        date: button.dataset.date,
        type: button.dataset.type,
        duration: button.dataset.duration,
        calories: button.dataset.calories,
        note: decodeURIComponent(button.dataset.note || '')
      });
    });
  });
}

function renderDashboard(sessions, settings) {
  const todaySessions = filterSessionsByDate(sessions, todayString());
  const weekSessions = filterSessionsByDates(sessions, getWeekDates());
  const weekMinutes = sumDuration(weekSessions);
  const goal = Number(settings.goal || 0);
  const progress = goal > 0 ? Math.min((weekMinutes / goal) * 100, 100) : 0;
  const streak = calculateStreak(sessions);
  const recap = getWeekComparison(sessions);

  document.getElementById('greeting').textContent = `${greetingForHour()}, ${settings.name} !`;

  const quoteEl = document.getElementById('daily-quote');
  if (quoteEl) quoteEl.textContent = dailyQuote();

  animateValue(document.getElementById('today-minutes'), sumDuration(todaySessions), ' min');
  document.getElementById('today-count').textContent = `${todaySessions.length} séance${todaySessions.length > 1 ? 's' : ''}`;
  animateValue(document.getElementById('today-calories'), sumCalories(todaySessions) || 0, ' kcal');
  animateValue(document.getElementById('week-minutes'), weekMinutes, ' min');
  document.getElementById('streak-count').textContent = `${streak} jour${streak > 1 ? 's' : ''}`;
  document.getElementById('goal-progress-fill').style.width = `${progress}%`;
  document.getElementById('goal-progress-text').textContent = goal > 0
    ? `${weekMinutes} / ${goal} min cette semaine`
    : 'Définis ton objectif hebdo dans les réglages';

  const recapMinutes = document.getElementById('recap-minutes');
  const recapDelta = document.getElementById('recap-delta');
  if (recapMinutes) recapMinutes.textContent = `${recap.thisMinutes} min`;
  if (recapDelta) {
    recapDelta.textContent = recap.label;
    recapDelta.classList.toggle('negative', recap.delta !== null && recap.delta < 0);
  }

  renderAchievements();
  renderSessionList(
    'today-sessions',
    todaySessions,
    'Aucune séance aujourd’hui. Une petite session ?'
  );
}

function renderStats(sessions, settings) {
  const weekSessions = filterSessionsByDates(sessions, getWeekDates());
  const goal = Number(settings.goal || 0);
  const weekMinutes = sumDuration(weekSessions);
  const byType = aggregateByType(sessions);

  document.getElementById('stats-week-total').textContent = `${weekMinutes} min`;
  document.getElementById('stats-total-sessions').textContent = `${sessions.length}`;
  document.getElementById('stats-streak').textContent = `${calculateStreak(sessions)}`;

  const topList = document.getElementById('top-activities');
  const topEntries = Object.entries(byType).sort((a, b) => b[1] - a[1]);

  if (topEntries.length === 0) {
    topList.innerHTML = '<p class="empty-state">Ajoute des séances pour voir tes tops activités.</p>';
  } else {
    topList.innerHTML = topEntries.map(([type, minutes]) => `
      <div class="top-item">
        <span>${type}</span>
        <strong>${minutes} min</strong>
      </div>
    `).join('');
  }

  if (goal > 0) {
    document.getElementById('stats-goal-summary').textContent =
      `Objectif hebdo : ${weekMinutes} / ${goal} min (${Math.round((weekMinutes / goal) * 100)}%)`;
  } else {
    document.getElementById('stats-goal-summary').textContent =
      'Fixe ton objectif hebdo dans les réglages pour suivre ta progression.';
  }

  refreshCharts(sessions);
}

function renderCalendarSessions(sessions, selectedDate) {
  const daySessions = filterSessionsByDate(sessions, selectedDate);
  document.getElementById('selected-date-label').textContent = formatDisplayDate(selectedDate);
  renderSessionList(
    'calendar-sessions',
    daySessions,
    'Aucune séance ce jour-là.'
  );
}

function renderSettingsForm(settings) {
  document.getElementById('settings-name').value = settings.name;
  document.getElementById('settings-goal').value = settings.goal;

  const themeToggle = document.getElementById('settings-theme-dark');
  if (themeToggle) {
    themeToggle.checked = settings.theme === 'dark';
  }
}

function resetAddForm() {
  selectedSport = '';
  selectedDuration = 30;
  document.getElementById('session-date').value = todayString();
  document.getElementById('session-duration-custom').value = '30';
  document.getElementById('session-calories').value = '';
  document.getElementById('session-note').value = '';
  renderSportButtons();
  renderDurationButtons();
}

function bindNavigation() {
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      showScreen(item.dataset.screen);
    });
  });

  document.getElementById('open-settings').addEventListener('click', () => {
    showScreen('screen-settings');
  });

  document.getElementById('back-from-settings').addEventListener('click', () => {
    showScreen('screen-home');
  });
}

function bindAddForm(onSubmit) {
  renderSportButtons();
  renderDurationButtons();

  document.getElementById('session-date').value = todayString();
  document.getElementById('session-duration-custom').addEventListener('input', (event) => {
    selectedDuration = Number(event.target.value) || 0;
    renderDurationButtons();
  });

  document.getElementById('add-session-form').addEventListener('submit', (event) => {
    event.preventDefault();
    onSubmit();
  });
}

function bindSettingsForm(onSave, onReset) {
  document.getElementById('settings-form').addEventListener('submit', (event) => {
    event.preventDefault();
    onSave();
  });

  document.getElementById('reset-data-btn').addEventListener('click', onReset);
}

function openEditModal(session) {
  editingSession = { ...session };
  const overlay = document.getElementById('edit-modal');
  if (!overlay) return;

  document.getElementById('edit-session-date').value = session.date;
  document.getElementById('edit-session-type').value = session.type;
  document.getElementById('edit-session-duration').value = session.duration;
  document.getElementById('edit-session-calories').value = session.calories || '';
  document.getElementById('edit-session-note').value = session.note || '';
  overlay.hidden = false;
}

function closeEditModal() {
  editingSession = null;
  const overlay = document.getElementById('edit-modal');
  if (overlay) overlay.hidden = true;
}

function bindEditModal(onSave) {
  const overlay = document.getElementById('edit-modal');
  if (!overlay) return;

  document.getElementById('close-edit-modal').addEventListener('click', closeEditModal);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) closeEditModal();
  });

  document.getElementById('edit-session-form').addEventListener('submit', (event) => {
    event.preventDefault();
    onSave();
  });
}

function refreshApp(selectedDate) {
  const sessions = loadSessions();
  const settings = loadSettings();
  const calendarDate = selectedDate || document.getElementById('calendar-picker')?.value || todayString();

  renderDashboard(sessions, settings);
  renderStats(sessions, settings);
  renderCalendarSessions(sessions, calendarDate);
  renderSettingsForm(settings);
  highlightActiveDays();
  refreshCharts(sessions);
}
