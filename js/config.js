const APP_BASE = (() => {
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (segments.length > 0 && !segments[segments.length - 1].includes('.')) {
    return `/${segments.join('/')}/`;
  }
  if (segments.length > 1) {
    return `/${segments.slice(0, -1).join('/')}/`;
  }
  return '/';
})();

function resolveAppUrl(path) {
  return new URL(path.replace(/^\//, ''), window.location.origin + APP_BASE).href;
}

function isStandaloneApp() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function isAndroidDevice() {
  return /Android/i.test(window.navigator.userAgent);
}

function canInstallPwa() {
  return isAndroidDevice() && !isStandaloneApp();
}
