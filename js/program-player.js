let playerState = null;
let playerInterval = null;
let playerPhase = 'idle';

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
    elapsed: 0
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
  playerInterval = null;
  playerState = null;
}

function runNextPlayerStep() {
  if (!playerState || playerState.stepIndex >= playerState.steps.length) {
    finishProgramPlayer();
    return;
  }

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
      playerState.remaining = step.value;
      document.getElementById('player-action-btn').textContent = 'Pause';
      document.getElementById('player-mode-hint').textContent = 'Durée en secondes';
      startPlayerCountdown();
    } else {
      clearInterval(playerInterval);
      playerState.remaining = 0;
      document.getElementById('player-timer-display').textContent = step.mode === 'maxrep' ? 'Max rep' : `${step.value} reps`;
      document.getElementById('player-mode-hint').textContent = step.mode === 'maxrep'
        ? 'Fais un maximum de répétitions'
        : `Objectif : ${step.value} répétitions`;
      document.getElementById('player-action-btn').textContent = 'Série terminée ✓';
    }
  } else {
    playerPhase = 'rest';
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
      if (playerPhase === 'work') {
        playerState.stepIndex += 1;
        runNextPlayerStep();
      } else {
        playerState.stepIndex += 1;
        runNextPlayerStep();
      }
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
    playerState.stepIndex += 1;
    playerState.elapsed += step.mode === 'reps' ? step.value * 3 : 30;
    runNextPlayerStep();
    hapticSuccess();
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
  const programName = playerState.program.name;

  addSession({
    date: todayString(),
    type: 'Renforcement',
    duration: String(minutes),
    calories: '',
    note: `Programme : ${programName}`,
    time: currentTimeString()
  });

  checkAchievements(loadSessions(), loadSettings());
  hideProgramPlayerOverlay();
  refreshApp();
  showScreen('screen-renfo');
  triggerCelebration();
  hapticSuccess();
  showToast(`Programme « ${programName} » terminé !`);
}

function bindProgramPlayer() {
  document.getElementById('player-action-btn')?.addEventListener('click', handlePlayerAction);
  document.getElementById('player-stop-btn')?.addEventListener('click', () => {
    if (confirm('Arrêter le programme en cours ?')) {
      hideProgramPlayerOverlay();
      showToast('Programme interrompu');
    }
  });
}
