# Sporr — Suivi sportif de Sarah

Application web mobile personnelle pour suivre les séances de Yoga, Renforcement et Running.

## Fonctionnalités

- **Accueil** : message personnalisé, stats du jour, objectif hebdo, série de jours
- **Ajout rapide** : 3 sports, durées rapides, calories et notes optionnelles
- **Statistiques** : camembert, tendance hebdomadaire, top activités
- **Calendrier** : Flatpickr avec jours actifs mis en évidence
- **Réglages** : prénom, objectif hebdomadaire configurable, réinitialisation

## Structure

```
index.html
css/
  style.css
  variables.css
  components.css
js/
  storage.js
  stats.js
  charts.js
  calendar.js
  ui.js
  app.js
```

## Stockage local (sans JSON)

Séances (`sporrSessions`) :
```
2026-07-28:Yoga:45:120:Yoga du matin|2026-07-28:Running:30:250:
```

Réglages (`sporrSettings`) :
```
name:Sarah|goal:150|theme:light
```

## Technologies

- HTML5 / CSS3 / JavaScript ES6
- Chart.js
- Flatpickr
- localStorage

## Lancer en local

Ouvrir `index.html` dans un navigateur, ou servir le dossier avec un serveur statique.
