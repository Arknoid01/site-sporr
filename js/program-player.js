let playerState = null;
let playerInterval = null;
let playerPhase = 'idle';
let repAutoAdvanceTimer = null;

function startProgramPlayer(program) {
  const steps = [];
  program.items.forEach((item, exIndex) => {
    const ex = getExerciseById(item.exerciseId);
    if (!ex) return;
    for (let s = 1; s <= item.sets; s += 1) {
      steps.push({
        type: 'work',
        exerciseId: item.exerciseId,
        setNum: s,
        totalSets: item.sets,
        mode: item.mode,
        value: item.value,
        exIndex,
        exTotal: program.items.length
      });
      if (s < item.sets) {
        steps.push({ type: 'rest', label: 'Repos entre séries', seconds: item.restSets, exerciseId: item.exerciseId });
      }
    }
    if (exIndex < program.items.length - 1) {
      steps.push({ type: 'rest', label: 'Repos entre exercices', seconds: item.restAfter, exerciseId: item.exerciseId });
    }
  });

  playerState = {
    program,
    steps,
    stepIndex: 0,
    remaining: 0,
    paused: false,
    elapsed: 0,
    repCount: 0
  };

  showProgramPlayerOverlay();
  runNextPlayerStep();
}

function showProgramPlayerOverlay() {
  document.getElementById('program-player-overlay').hidden = false;
  document.body.classList.add('timer-active');
}

function hideProgramPlayerOverlay() {
  document.getElementById('program-player-overlay').hidden = true;
  document.body.classList.remove('timer-active');
  clearInterval(playerInterval);
  clearTimeout(repAutoAdvanceTimer);
  playerInterval = null;
  repAutoAdvanceTimer = null;
  playerState = null;
}

function setRepsPanelVisible(visible) {
  const panel = document.getElementById('player-reps-panel');
  const timer = document.getElementById('player-timer-display');
  if (panel) panel.hidden = !visible;
  if (timer) timer.hidden = visible;
}

function resetRepCounter() {
  if (!playerState) return;
  playerState.repCount = 0;
  updateRepDisplay();
}

function updateRepDisplay() {
  if (!playerState) return;
  const step = playerState.steps[playerState.stepIndex];
  const currentEl = document.getElementById('player-rep-current');
  const targetEl = document.getElementById('player-rep-target');
  const hintEl = document.getElementById('player-rep-hint');
  const tapBtn = document.getElementById('player-rep-tap');
  if (!currentEl) return;

  currentEl.textContent = String(playerState.repCount);

  if (step.mode === 'maxrep') {
    if (targetEl) targetEl.textContent = ' reps';
    if (hintEl) hintEl.textContent = 'Tape à chaque répétition, puis valide quand tu as fini';
    if (tapBtn) tapBtn.classList.remove('rep-target-reached');
    return;
  }

  if (targetEl) targetEl.textContent = ` / ${step.value}`;
  const reached = playerState.repCount >= step.value;
  if (tapBtn) tapBtn.classList.toggle('rep-target-reached', reached);
  if (hintEl) {
    hintEl.textContent = reached
      ? 'Objectif atteint — série validée !'
      : `Tape pour compter · ${step.value - playerState.repCount} restante(s)`;
  }
}

function incrementRep() {
  if (!playerState || playerPhase !== 'work') return;
  const step = playerState.steps[playerState.stepIndex];
  if (step.mode === 'time') return;

  playerState.repCount += 1;
  playerState.elapsed += 3;
  updateRepDisplay();
  updatePlayerProgress();
  hapticTick();

  if (step.mode === 'reps' && playerState.repCount >= step.value) {
    clearTimeout(repAutoAdvanceTimer);
    repAutoAdvanceTimer = window.setTimeout(() => completeRepSet(true), 600);
  }
}

function decrementRep() {
  if (!playerState || playerPhase !== 'work') return;
  const step = playerState.steps[playerState.stepIndex];
  if (step.mode === 'time') return;

  clearTimeout(repAutoAdvanceTimer);
  if (playerState.repCount <= 0) return;

  playerState.repCount -= 1;
  playerState.elapsed = Math.max(0, playerState.elapsed - 3);
  updateRepDisplay();
  updatePlayerProgress();
  hapticTick();
}

function completeRepSet(fromAuto = false) {
  if (!playerState) return;
  clearTimeout(repAutoAdvanceTimer);
  playerState.stepIndex += 1;
  if (!fromAuto) {
    const step = playerState.steps[playerState.stepIndex - 1];
    if (step?.mode === 'reps' && playerState.repCount < step.value) {
      playerState.elapsed += Math.max(0, (step.value - playerState.repCount) * 3);
    } else if (step?.mode === 'maxrep') {
      playerState.elapsed += Math.max(15, playerState.repCount * 3);
    }
  }
  hapticSuccess();
  runNextPlayerStep();
}

function runNextPlayerStep() {
  if (!playerState || playerState.stepIndex >= playerState.steps.length) {
    finishProgramPlayer();
    return;
  }

  clearTimeout(repAutoAdvanceTimer);
  const step = playerState.steps[playerState.stepIndex];
  const ex = getExerciseById(step.exerciseId);

  document.getElementById('player-exercise-name').textContent = ex?.name || '';
  document.getElementById('player-exercise-image').innerHTML = ex ? getExerciseImageHtml(ex) : '';
  document.getElementById('player-exercise-desc').textContent = ex?.desc || '';
  document.getElementById('player-exercise-tips').innerHTML = ex
    ? ex.tips.map((t) => `<li>${t}</li>`).join('')
    : '';

  if (step.type === 'work') {
    playerPhase = 'work';
    document.getElementById('player-phase-label').textContent =
      `Série ${step.setNum}/${step.totalSets} · Exercice ${step.exIndex + 1}/${step.exTotal}`;

    if (step.mode === 'time') {
      setRepsPanelVisible(false);
      playerState.remaining = step.value;
      document.getElementById('player-action-btn').textContent = 'Pause';
      document.getElementById('player-mode-hint').textContent = 'Durée en secondes';
      startPlayerCountdown();
    } else {
      clearInterval(playerInterval);
      playerState.remaining = 0;
      playerState.repCount = 0;
      setRepsPanelVisible(true);
      document.getElementById('player-mode-hint').textContent = step.mode === 'maxrep'
        ? 'Fais un maximum de répétitions'
        : `Objectif : ${step.value} répétitions`;
      document.getElementById('player-action-btn').textContent =
        step.mode === 'maxrep' ? 'Série terminée ✓' : 'Passer la série';
      updateRepDisplay();
    }
  } else {
    playerPhase = 'rest';
    setRepsPanelVisible(false);
    playerState.remaining = step.seconds;
    document.getElementById('player-phase-label').textContent = step.label;
    document.getElementById('player-mode-hint').textContent = 'Récupère…';
    document.getElementById('player-action-btn').textContent = 'Passer';
    showTimerMessage('Respire, tu assures ! 💪');
    startPlayerCountdown();
  }

  updatePlayerProgress();
}

function startPlayerCountdown() {
  clearInterval(playerInterval);
  renderPlayerTimer();
  playerInterval = setInterval(() => {
    if (playerState.paused) return;
    playerState.remaining -= 1;
    playerState.elapsed += 1;
    renderPlayerTimer();
    if (playerState.remaining <= 0) {
      clearInterval(playerInterval);
      playerState.stepIndex += 1;
      runNextPlayerStep();
    }
  }, 1000);
}

function renderPlayerTimer() {
  const display = document.getElementById('player-timer-display');
  if (!display || !playerState) return;
  if (playerPhase === 'work' && playerState.steps[playerState.stepIndex]?.mode !== 'time') return;
  const sec = Math.max(0, playerState.remaining);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  display.textContent = `${m}:${String(s).padStart(2, '0')}`;
  display.classList.toggle('rest-mode', playerPhase === 'rest');
}

function updatePlayerProgress() {
  if (!playerState) return;
  const pct = (playerState.stepIndex / playerState.steps.length) * 100;
  document.getElementById('player-progress-fill').style.width = `${pct}%`;
  document.getElementById('player-total-elapsed').textContent =
    formatDurationSeconds(playerState.elapsed);
}

function handlePlayerAction() {
  if (!playerState) return;
  const step = playerState.steps[playerState.stepIndex];
  if (playerPhase === 'work' && step.mode !== 'time') {
    completeRepSet(false);
    return;
  }
  if (playerPhase === 'rest') {
    clearInterval(playerInterval);
    playerState.stepIndex += 1;
    runNextPlayerStep();
    return;
  }
  playerState.paused = !playerState.paused;
  document.getElementById('player-action-btn').textContent =
    playerState.paused ? 'Reprendre' : 'Pause';
}

function finishProgramPlayer() {
  if (!playerState) return;
  const minutes = Math.max(1, Math.round(playerState.elapsed / 60));
  const program = playerState.program;
  const programName = program.name;
  const sportType = program.sportType || 'Renforcement';

  addSession({
    date: todayString(),
    type: sportType,
    duration: String(minutes),
    calories: '',
    note: `${sportType === 'Équitation' ? 'Prépa cavalier' : 'Programme'} : ${programName}`,
    time: currentTimeString()
  });

  if (sportType === 'Équitation' && typeof logEquitationProgramComplete === 'function') {
    logEquitationProgramComplete(program, minutes);
  }

  checkAchievements(loadSessions(), loadSettings());
  hideProgramPlayerOverlay();
  refreshApp();
  showScreen(sportType === 'Équitation' ? 'screen-equitation' : 'screen-renfo');
  triggerCelebration();
  hapticSuccess();
  showToast(`Séance « ${programName} » terminée !`);
}

function bindProgramPlayer() {
  document.getElementById('player-action-btn')?.addEventListener('click', handlePlayerAction);
  document.getElementById('player-rep-tap')?.addEventListener('click', incrementRep);
  document.getElementById('player-rep-minus')?.addEventListener('click', (event) => {
    event.stopPropagation();
    decrementRep();
  });
  document.getElementById('player-stop-btn')?.addEventListener('click', () => {
    if (confirm('Arrêter le programme en cours ?')) {
      hideProgramPlayerOverlay();
      showToast('Programme interrompu');
    }
  });
}
