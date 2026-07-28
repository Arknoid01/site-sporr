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
    note
  });

  resetAddForm();
  refreshApp(selectedCalendarDate);
  showScreen('screen-home');
  showToast(randomEncouragement());
}

function handleSaveSettings() {
  const settings = {
    name: document.getElementById('settings-name').value.trim() || 'Sarah',
    goal: document.getElementById('settings-goal').value,
    theme: loadSettings().theme
  };

  saveSettings(settings);
  refreshApp(selectedCalendarDate);
  showToast('Réglages enregistrés');
  showScreen('screen-home');
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

  bindNavigation();
  bindAddForm(handleAddSession);
  bindSettingsForm(handleSaveSettings, handleResetData);

  initCalendar((date) => {
    selectedCalendarDate = date;
    renderCalendarSessions(loadSessions(), date);
  });

  refreshApp(selectedCalendarDate);
  showScreen('screen-home');
}

document.addEventListener('DOMContentLoaded', initApp);
