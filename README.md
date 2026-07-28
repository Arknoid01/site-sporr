# Sport — Suivi sportif de Sarah

Application web mobile (PWA) pour suivre Yoga, Renforcement, Course à pied et préparation physique cavalier.

## Fonctionnalités

### Accueil & suivi
- Tableau de bord personnalisé, stats du jour, objectif hebdo, badges
- Ajout rapide de séances (Yoga, Renfo, Running, Équitation…)
- Statistiques (camembert, tendance), calendrier Flatpickr
- Mode sombre, export JSON des données

### Renforcement
- **Programmes** : création, générateur par muscles/temps, import exemples wger
- **Exercices** : catalogue Sarah (21) + wger (~828, photos)
- **Coach IA** : séance unique ou programme 8/12/16 sem
  - Plan local instantané (défaut), Groq auto, ou mode manuel JSON
  - Validation par aperçu avant enregistrement
  - Adaptation **cycle menstruel** (phases hormonales)
  - Abdos **plancher pelvien** (transverse, périnée, nombril vers la colonne)
- Lecteur de séance guidé (reps, chrono, repos)

### Course à pied
- GPS live, carte, distance, dénivelé, allure
- Types : footing, endurance, fractionné, sortie longue, récupération
- Objectifs distance/temps avec progression en direct
- Pause / reprise, historique avec suppression

### Équitation
- Préparation physique **cavalier** (gainage, jambes, équilibre…)
- Historique avec relecture et suppression
- Ne pollue plus la liste Programmes à chaque lancement

### Réglages
- Prénom, objectif hebdo, thème, sports personnalisés
- Coach IA : mode local / manuel / Groq + clé API
- Export backup JSON, réinitialisation complète

## Installation (PWA Android)

1. Déployer sur **GitHub Pages** (HTTPS) — chemin `/site-sporr/`
2. Ouvrir dans **Chrome**
3. Menu **⋮ → Installer l’application** ou bannière d’installation
4. Fonctionne hors ligne pour les écrans principaux (cartes GPS / photos wger nécessitent le réseau)

## Développement local

```bash
# Servir le dossier (HTTPS recommandé pour PWA/GPS)
npx serve .

# Régénérer le catalogue wger
npm run fetch-wger
```

## Structure

```
index.html
css/          styles, thèmes, workout
js/
  app.js      navigation, réglages
  storage.js  sessions, export, reset
  programs.js programmes, courses GPS
  workout-ui.js  hubs Renfo / Course / Équitation
  ai-program.js  Coach IA prompts & formulaire
  ai-plans.js    génération locale, plans IA
  cycle-sync.js  adaptation cycle menstruel
  pelvic-floor.js abdos plancher pelvien
  running.js    course GPS
  equitation.js prépa cavalier
  program-player.js lecteur séance
  wger-catalog.js   catalogue exercices (généré)
sw.js           service worker (cache PWA)
manifest.webmanifest
```

## Données (localStorage)

| Clé | Contenu |
|-----|---------|
| `sporrSessions` | Séances manuelles / chrono |
| `sporrPrograms` | Programmes renfo |
| `sporrRuns` | Courses GPS |
| `sporrAiPlans` | Plans Coach IA |
| `sporrAiCoachProfile` | Profil formulaire IA |
| `sporrEquitationSessions` | Historique prépa cavalier |
| `sporrSettings` | Réglages |

Export complet via **Réglages → Exporter mes données**.

## Coach IA (Groq)

1. Créer une clé sur [console.groq.com](https://console.groq.com)
2. Réglages → mode **Groq** → coller la clé
3. Ou rester en **plan local** (sans clé, immédiat)

Modèle recommandé : `openai/gpt-oss-120b`.

## Prochaine étape

- Intégration **Garmin Connect** (OAuth + sync activités / cycle) — nécessite un backend léger

## Licence wger

Exercices wger : [wger.de](https://wger.de) — CC-BY-SA. Crédit affiché dans l’app.
