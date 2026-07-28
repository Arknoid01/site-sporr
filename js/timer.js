const TIMER_MESSAGES = {
  start: [
    'C’est parti Sarah, tu vas assurer !',
    'Belle séance en perspective, go !',
    'Concentre-toi, tu es capable !'
  ],
  mid: [
    'Tu es déjà à mi-parcours, continue !',
    'Ton corps te remercie, garde le rythme.',
    'Chaque minute compte, tu gères !',
    'Respire… et continue, tu assures !'
  ],
  late: [
    'Plus que quelques minutes, finis en beauté !',
    'La ligne d’arrivée est proche !',
    'Dernière ligne droite, tu es forte !'
  ],
  end: [
    'Séance terminée, bravo Sarah !',
    'Tu l’as fait, fière de toi !',
    'Mission accomplie, quelle championne !'
  ]
};

let timerInterval = null;
let timerWakeLock = null;
let timerState = {
  sport: '',
  totalSeconds: 0,
  remainingSeconds: 0,
  paused: false,
  milestones: new Set()
};

function pickMessage(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function formatTimerDisplay(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function updateTimerRing() {
  const ring = document.getElementById('timer-ring-progress');
  if (!ring || timerState.totalSeconds === 0) return;

  const progress = timerState.remainingSeconds / timerState.totalSeconds;
  const circumference = 2 * Math.PI * 54;
  ring.style.strokeDasharray = `${circumference}`;
  ring.style.strokeDashoffset = `${circumference * (1 - progress)}`;
}

function showTimerMessage(text) {
  const el = document.getElementById('timer-message');
  if (!el) return;
  el.textContent = text;
  el.classList.remove('timer-message-pop');
  void el.offsetWidth;
  el.classList.add('timer-message-pop');
}

function checkTimerEncouragement() {
  if (timerState.totalSeconds === 0) return;

  const ratio = timerState.remainingSeconds / timerState.totalSeconds;

  if (ratio <= 0.1 && !timerState.milestones.has('late')) {
    timerState.milestones.add('late');
    showTimerMessage(pickMessage(TIMER_MESSAGES.late));
    hapticSuccess();
  } else if (ratio <= 0.25 && !timerState.milestones.has('quarter')) {
    timerState.milestones.add('quarter');
    showTimerMessage(pickMessage(TIMER_MESSAGES.late));
  } else if (ratio <= 0.5 && !timerState.milestones.has('half')) {
    timerState.milestones.add('half');
    showTimerMessage(pickMessage(TIMER_MESSAGES.mid));
    hapticSuccess();
  } else if (ratio <= 0.75 && !timerState.milestones.has('threequarter')) {
    timerState.milestones.add('threequarter');
    showTimerMessage(pickMessage(TIMER_MESSAGES.mid));
  }
}

function renderTimerDisplay() {
  const display = document.getElementById('timer-display');
  const sportLabel = document.getElementById('timer-sport-label');
  if (display) display.textContent = formatTimerDisplay(timerState.remainingSeconds);
  if (sportLabel) sportLabel.textContent = timerState.sport;
  updateTimerRing();
}

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    timerWakeLock = await navigator.wakeLock.request('screen');
  } catch {
    timerWakeLock = null;
  }
}

function releaseWakeLock() {
  if (timerWakeLock) {
    timerWakeLock.release();
    timerWakeLock = null;
  }
}

function openTimerOverlay(sport, minutes) {
  timerState = {
    sport,
    totalSeconds: minutes * 60,
    remainingSeconds: minutes * 60,
    paused: false,
    milestones: new Set()
  };

  const overlay = document.getElementById('timer-overlay');
  if (!overlay) return;

  overlay.hidden = false;
  document.body.classList.add('timer-active');
  renderTimerDisplay();
  showTimerMessage(pickMessage(TIMER_MESSAGES.start));
  requestWakeLock();
  startTimerTick();
}

function closeTimerOverlay() {
  clearInterval(timerInterval);
  timerInterval = null;
  releaseWakeLock();
  document.body.classList.remove('timer-active');
  const overlay = document.getElementById('timer-overlay');
  if (overlay) overlay.hidden = true;
}

function startTimerTick() {
  clearInterval(timerInterval);
  timerInterval = window.setInterval(() => {
    if (timerState.paused) return;

    timerState.remainingSeconds -= 1;
    renderTimerDisplay();
    checkTimerEncouragement();

    if (timerState.remainingSeconds <= 0) {
      finishTimerSession(true);
    }
  }, 1000);
}

function toggleTimerPause() {
  timerState.paused = !timerState.paused;
  const btn = document.getElementById('timer-pause-btn');
  if (btn) btn.textContent = timerState.paused ? 'Reprendre' : 'Pause';
  if (!timerState.paused) showTimerMessage('On reprend, tu peux le faire !');
}

function stopTimerEarly() {
  const elapsedMinutes = Math.max(
    1,
    Math.ceil((timerState.totalSeconds - timerState.remainingSeconds) / 60)
  );

  if (!confirm(`Arrêter la séance ? Enregistrer ${elapsedMinutes} min ?`)) return;
  finishTimerSession(false, elapsedMinutes);
}

function finishTimerSession(completed, customMinutes) {
  clearInterval(timerInterval);
  timerInterval = null;

  const minutes = completed
    ? Math.round(timerState.totalSeconds / 60)
    : customMinutes;

  addSession({
    date: todayString(),
    type: timerState.sport,
    duration: String(minutes),
    calories: '',
    note: completed ? 'Séance au chronomètre' : 'Séance arrêtée avant la fin'
  });

  const settings = loadSettings();
  const newBadges = checkAchievements(loadSessions(), settings);

  closeTimerOverlay();
  refreshApp(todayString());
  showScreen('screen-home');
  triggerCelebration();
  hapticSuccess();

  if (newBadges.length > 0) {
    showToast(`${newBadges[0].emoji} Badge débloqué : ${newBadges[0].title}`);
  } else {
    showToast(pickMessage(TIMER_MESSAGES.end));
  }
}

function launchTimerFromForm() {
  const minutes = Number(document.getElementById('session-duration-custom').value);

  if (!selectedSport) {
    showToast('Choisis un type de séance');
    return;
  }

  if (!minutes || minutes < 1) {
    showToast('Indique une durée valide');
    return;
  }

  openTimerOverlay(selectedSport, minutes);
}

function bindTimerControls() {
  document.getElementById('launch-timer-btn')?.addEventListener('click', launchTimerFromForm);
  document.getElementById('timer-pause-btn')?.addEventListener('click', toggleTimerPause);
  document.getElementById('timer-stop-btn')?.addEventListener('click', stopTimerEarly);

  document.getElementById('timer-overlay')?.addEventListener('click', (event) => {
    if (event.target.id === 'timer-overlay') {
      if (timerState.paused) toggleTimerPause();
    }
  });
}

function switchAddTab(tab) {
  const timerPanel = document.getElementById('add-tab-timer');
  const manualPanel = document.getElementById('add-tab-manual');
  const tabs = document.querySelectorAll('.add-tab');

  tabs.forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tab);
  });

  if (timerPanel) timerPanel.hidden = tab !== 'timer';
  if (manualPanel) manualPanel.hidden = tab !== 'manual';
}

function bindAddTabs() {
  document.querySelectorAll('.add-tab').forEach((button) => {
    button.addEventListener('click', () => switchAddTab(button.dataset.tab));
  });

  document.getElementById('home-start-session')?.addEventListener('click', () => {
    switchAddTab('timer');
    showScreen('screen-add');
  });
}
