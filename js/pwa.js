let deferredInstallPrompt = null;

function showInstallBanner() {
  if (!canInstallPwa()) return;

  const banner = document.getElementById('install-banner');
  if (banner) {
    banner.hidden = false;
  }
}

function hideInstallBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) {
    banner.hidden = true;
  }
}

function updateInstallUi() {
  const settingsCard = document.getElementById('install-help');
  if (!settingsCard) return;

  if (isStandaloneApp()) {
    settingsCard.hidden = true;
    hideInstallBanner();
    return;
  }

  settingsCard.hidden = false;

  if (canInstallPwa()) {
    showInstallBanner();
  }
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    const swUrl = resolveAppUrl('sw.js');
    const scope = APP_BASE;
    await navigator.serviceWorker.register(swUrl, { scope });
  } catch (error) {
    console.warn('Service worker non enregistré', error);
  }
}

function initPwa() {
  const boot = () => {
    registerServiceWorker();
    updateInstallUi();
  };

  if (document.readyState === 'complete') {
    boot();
  } else {
    window.addEventListener('load', boot);
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    showInstallBanner();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    hideInstallBanner();
    showToast('Sporr installé sur ton téléphone !');
    updateInstallUi();
  });

  const installBtn = document.getElementById('install-app-btn');
  const installSettingsBtn = document.getElementById('install-app-settings-btn');

  const handleInstallClick = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      hideInstallBanner();
      return;
    }

    showToast('Menu Chrome ⋮ → Installer l’application');
  };

  if (installBtn) {
    installBtn.addEventListener('click', handleInstallClick);
  }

  if (installSettingsBtn) {
    installSettingsBtn.addEventListener('click', handleInstallClick);
  }
}
