let selectedCalendarDate = todayString();

function handleAddSession() {
  const date = document.getElementById('session-date').value;
  const duration = document.getElementById('session-duration-custom').value;
  const calories = document.getElementById('session-calories').value;
  const note = document.getElementById('session-note').value.trim();

  if (!selectedSport) {
    showToast('Choisis un type de séance');
    return;
  }

  if (!date || !duration || Number(duration) < 1) {
    showToast('Indique une durée valide');
    return;
  }

  addSession({
    date,
    type: selectedSport,
    duration,
    calories,
    note,
    time: currentTimeString()
  });

  const settings = loadSettings();
  const newBadges = checkAchievements(loadSessions(), settings);

  resetAddForm();
  refreshApp(selectedCalendarDate);
  showScreen('screen-home');
  triggerCelebration();
  hapticSuccess();

  if (newBadges.length > 0) {
    showToast(`${newBadges[0].emoji} Badge débloqué : ${newBadges[0].title}`);
  } else {
    showToast(randomEncouragement());
  }
}

function handleEditSession() {
  if (!editingSession) return;

  const updated = {
    date: document.getElementById('edit-session-date').value,
    type: document.getElementById('edit-session-type').value,
    duration: document.getElementById('edit-session-duration').value,
    calories: document.getElementById('edit-session-calories').value,
    note: document.getElementById('edit-session-note').value.trim()
  };

  if (!updated.date || !updated.type || Number(updated.duration) < 1) {
    showToast('Vérifie les champs de la séance');
    return;
  }

  updateSession(editingSession, updated);
  checkAchievements(loadSessions(), loadSettings());
  closeEditModal();
  refreshApp(selectedCalendarDate);
  showToast('Séance mise à jour');
  hapticSuccess();
}

function handleSaveSettings() {
  const settings = {
    ...loadSettings(),
    name: document.getElementById('settings-name').value.trim() || 'Sarah',
    goal: document.getElementById('settings-goal').value,
    theme: document.getElementById('settings-theme-dark').checked ? 'dark' : 'light'
  };

  saveSettings(settings);
  applyTheme(settings.theme);
  checkAchievements(loadSessions(), settings);
  refreshApp(selectedCalendarDate);
  showToast('Réglages enregistrés');
  showScreen('screen-home');
}

function handleSaveAiSettings() {
  const settings = {
    ...loadSettings(),
    aiProvider: document.getElementById('settings-ai-provider').value,
    groqKey: document.getElementById('settings-groq-key').value.trim(),
    groqModel: document.getElementById('settings-groq-model').value
  };
  saveSettings(settings);
  showToast('Clé Groq enregistrée (local uniquement)');
}

function handleResetData() {
  if (!confirm('Supprimer toutes les séances et réinitialiser les réglages ?')) {
    return;
  }

  resetAllData();
  selectedCalendarDate = todayString();
  resetAddForm();
  refreshApp(selectedCalendarDate);
  setCalendarDate(selectedCalendarDate);
  showToast('Données réinitialisées');
  showScreen('screen-home');
}

function initApp() {
  const settings = loadSettings();
  if (!localStorage.getItem('sporrSettings')) {
    saveSettings(settings);
  }

  hideSplash();
  initTheme();
  initPwa();
  bindNavigation();
  bindAddTabs();
  bindTimerControls();
  bindWeeklySummary();
  bindSportsSettings();
  bindWorkoutUI();
  bindAddForm(handleAddSession);
  bindEditModal(handleEditSession);
  bindSettingsForm(handleSaveSettings, handleResetData, handleSaveAiSettings);

  initCalendar((date) => {
    selectedCalendarDate = date;
    renderCalendarSessions(loadSessions(), date);
  });

  populateSportSelect(document.getElementById('edit-session-type'));
  checkAchievements(loadSessions(), settings);
  refreshApp(selectedCalendarDate);
  showScreen('screen-home');
}

document.addEventListener('DOMContentLoaded', initApp);
