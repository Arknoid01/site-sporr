let deferredInstallPrompt = null;

function initPwa() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    const banner = document.getElementById('install-banner');
    if (banner) {
      banner.hidden = false;
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    const banner = document.getElementById('install-banner');
    if (banner) {
      banner.hidden = true;
    }
    showToast('Sporr installé sur ton téléphone !');
  });

  const installBtn = document.getElementById('install-app-btn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) {
        showToast('Utilise le menu Chrome → Ajouter à l’écran d’accueil');
        return;
      }

      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;

      const banner = document.getElementById('install-banner');
      if (banner) {
        banner.hidden = true;
      }
    });
  }
}
