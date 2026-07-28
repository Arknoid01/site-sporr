function animateValue(element, endValue, suffix = '', duration = 700) {
  if (!element) return;

  const start = Number(element.dataset.value || 0);
  const end = Number(endValue);
  if (start === end) {
    element.textContent = `${end}${suffix}`;
    element.dataset.value = String(end);
    return;
  }

  const startTime = performance.now();

  function frame(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    const current = Math.round(start + (end - start) * eased);
    element.textContent = `${current}${suffix}`;
    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      element.dataset.value = String(end);
    }
  }

  requestAnimationFrame(frame);
}

function hapticSuccess() {
  if ('vibrate' in navigator) {
    navigator.vibrate([12, 40, 12]);
  }
}

function hideSplash() {
  const splash = document.getElementById('splash');
  if (!splash) return;

  window.setTimeout(() => {
    splash.classList.add('splash-hide');
    window.setTimeout(() => splash.remove(), 500);
  }, 900);
}
