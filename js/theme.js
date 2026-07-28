function applyTheme(theme) {
  const normalized = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', normalized);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.content = normalized === 'dark' ? '#12121a' : '#ff6b35';
  }

  document.body.classList.add('theme-transition');
  window.setTimeout(() => {
    document.body.classList.remove('theme-transition');
  }, 300);

  refreshCharts(loadSessions());
}

function initTheme() {
  const settings = loadSettings();
  applyTheme(settings.theme || 'light');

  const toggle = document.getElementById('settings-theme-dark');
  if (toggle) {
    toggle.checked = settings.theme === 'dark';
    toggle.addEventListener('change', () => {
      const theme = toggle.checked ? 'dark' : 'light';
      const settingsToSave = { ...loadSettings(), theme };
      saveSettings(settingsToSave);
      applyTheme(theme);
    });
  }
}

function triggerCelebration() {
  const container = document.getElementById('celebration');
  if (!container) return;

  container.innerHTML = '<div class="celebration-burst"></div>';
  window.setTimeout(() => {
    container.innerHTML = '';
  }, 700);

  const highlight = document.querySelector('.stat-card.highlight');
  if (highlight) {
    highlight.classList.remove('pulse');
    void highlight.offsetWidth;
    highlight.classList.add('pulse');
  }
}
