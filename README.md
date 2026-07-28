# Site de Suivi Sportif - Sporr

## Fonctionnalités

Ce site permet de suivre les séances d'entraînement sportif avec :
- Un graphique en secteurs (pie chart) pour visualiser les statistiques des séances
- Un calendrier pour sélectionner et filtrer les séances par date
- Stockage local des données d'entraînement
- Formulaire d'ajout de séance
- Tableau récapitulatif des séances
- Filtrage par date
- Réinitialisation des données

## Structure du projet

- `index.html` : Page principale avec le graphique et le calendrier
- `app.js` : Logique de gestion des séances et affichage du graphique
- `style.css` : Styles personnalisés pour l'interface

## Données stockées

Les séances sont stockées dans le localStorage sous forme de chaîne délimitée par des '|' :
```
2023-10-01:Running:30|2023-10-01:Cycling:45|2023-10-02:Swimming:60
```

Chaque séance contient une date, un nom d'exercice et une durée (en minutes).

## Technologies utilisées

- HTML5
- CSS3
- JavaScript ES6
- Chart.js pour les graphiques