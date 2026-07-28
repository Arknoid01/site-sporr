// Logique de gestion des séances et affichage du graphique

// Récupération des éléments du DOM
const sessionForm = document.getElementById('add-session-form');
const datePicker = document.getElementById('date-picker');
const myChart = document.getElementById('myChart');
const sessionsBody = document.getElementById('sessions-body');
const resetBtn = document.getElementById('reset-btn');
const addSessionButton = document.getElementById('add-session-button');
const addSessionModal = document.getElementById('add-session-modal');
const modalDatePicker = document.getElementById('modal-date-picker');
const modalSessionName = document.getElementById('modal-session-name');
const saveSessionBtn = document.getElementById('save-session-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');

// Initialisation du graphique
let chart;

// Fonction pour charger les séances depuis le localStorage
function loadSessions() {
  const sessionsData = localStorage.getItem('sporrSessions');
  return sessionsData ? sessionsData.split('|').filter(session => session.trim() !== '') : [];
}

// Fonction pour sauvegarder les séances dans le localStorage
function saveSessions(sessions) {
  localStorage.setItem('sporrSessions', sessions.join('|'));
}

// Fonction pour afficher les séances dans le tableau
function displaySessions(sessions = loadSessions()) {
  sessionsBody.innerHTML = '';
  
  if (sessions.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5" style="text-align: center;">Aucune séance enregistrée</td>';
    sessionsBody.appendChild(row);
    return;
  }

  sessions.forEach(session => {
    const [date, type, duration, calories] = session.split(':');
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${date}</td>
      <td>${type}</td>
      <td>${duration}</td>
      <td>${calories || '-'}</td>
      <td><button class="delete-btn" data-date="${date}" data-type="${type}">Supprimer</button></td>
    `;
    
    sessionsBody.appendChild(row);
  });
  
  // Ajout des événements aux boutons de suppression
  document.querySelectorAll('.delete-btn').forEach(button => {
    button.addEventListener('click', function() {
      const date = this.getAttribute('data-date');
      const type = this.getAttribute('data-type');
      deleteSession(date, type);
    });
  });
}

// Fonction pour ajouter une séance
function addSession(e) {
  e.preventDefault();
  
  const date = document.getElementById('session-date').value;
  const type = document.getElementById('session-type').value;
  const duration = document.getElementById('session-duration').value;
  const calories = document.getElementById('session-calories').value;
  
  if (!date || !type || !duration) {
    alert('Veuillez remplir tous les champs obligatoires.');
    return;
  }
  
  // Récupération des séances existantes
  let sessions = loadSessions();
  
  // Ajout de la nouvelle séance
  sessions.push(`${date}:${type}:${duration}:${calories}`);
  
  // Sauvegarde dans le localStorage
  saveSessions(sessions);
  
  // Mise à jour de l'affichage
  displaySessions(sessions);
  
  // Mise à jour du graphique
  updateChart();
  
  // Réinitialisation du formulaire
  sessionForm.reset();
}

// Fonction pour supprimer une séance
function deleteSession(date, type) {
  let sessions = loadSessions();
  sessions = sessions.filter(session => {
    const [sessionDate, sessionType] = session.split(':');
    return !(sessionDate === date && sessionType === type);
  });
  
  saveSessions(sessions);
  displaySessions(sessions);
  updateChart();
}

// Fonction pour filtrer les séances par date
function filterSessionsByDate() {
  const selectedDate = datePicker.value;
  let sessions = loadSessions();
  
  if (selectedDate) {
    sessions = sessions.filter(session => session.startsWith(selectedDate));
  }
  
  displaySessions(sessions);
}

// Fonction pour mettre à jour le graphique
function updateChart() {
  const sessions = loadSessions();
  
  // Préparation des données pour le graphique
  const exerciseData = {};
  
  sessions.forEach(session => {
    const [date, type, duration] = session.split(':');
    if (!exerciseData[type]) {
      exerciseData[type] = 0;
    }
    exerciseData[type] += parseInt(duration);
  });
  
  // Mise à jour du graphique
  if (chart) {
    chart.destroy();
  }
  
  const ctx = myChart.getContext('2d');
  
  chart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(exerciseData),
      datasets: [{
        data: Object.values(exerciseData),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
          '#FF6384'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

// Fonction pour réinitialiser les données
function resetData() {
  if (confirm('Êtes-vous sûr de vouloir supprimer toutes les séances ?')) {
    localStorage.removeItem('sporrSessions');
    displaySessions([]);
    updateChart();
    datePicker.value = '';
  }
}

// Fonction pour ouvrir le modal d'ajout
function openAddSessionModal() {
  addSessionModal.style.display = 'block';
  // Initialiser la date du calendrier avec la date actuelle
  const today = new Date().toISOString().split('T')[0];
  modalDatePicker.value = today;
}

// Fonction pour fermer le modal d'ajout
function closeAddSessionModal() {
  addSessionModal.style.display = 'none';
  modalSessionName.value = '';
}

// Fonction pour enregistrer une nouvelle séance via le modal
function saveNewSession() {
  const name = modalSessionName.value.trim();
  const date = modalDatePicker.value;
  
  if (!name || !date) {
    alert('Veuillez remplir tous les champs.');
    return;
  }
  
  // Récupération des séances existantes
  let sessions = loadSessions();
  
  // Générer un type d'exercice basé sur le nom saisi
  const type = name.charAt(0).toUpperCase() + name.slice(1);
  
  // Ajout de la nouvelle séance (durée et calories par défaut)
  sessions.push(`${date}:${type}:30:`);
  
  // Sauvegarde dans le localStorage
  saveSessions(sessions);
  
  // Mise à jour de l'affichage
  displaySessions(sessions);
  
  // Mise à jour du graphique
  updateChart();
  
  // Fermer le modal
  closeAddSessionModal();
}

// Événements
sessionForm.addEventListener('submit', addSession);
datePicker.addEventListener('change', filterSessionsByDate);
resetBtn.addEventListener('click', resetData);
addSessionButton.addEventListener('click', openAddSessionModal);
saveSessionBtn.addEventListener('click', saveNewSession);
cancelModalBtn.addEventListener('click', closeAddSessionModal);

// Fermer le modal en cliquant en dehors
window.addEventListener('click', function(event) {
  if (event.target === addSessionModal) {
    closeAddSessionModal();
  }
});

// Initialisation
displaySessions();
updateChart();