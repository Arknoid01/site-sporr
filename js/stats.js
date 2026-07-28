const ENCOURAGEMENTS = [
  'Bravo Sarah, continue comme ça !',
  'Une séance de plus, tu assures !',
  'Chaque effort compte, fière de toi !',
  'Tu progresses, garde le rythme !',
  'Super séance, tu mérites ce repos !'
];

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayString() {
  return formatDate(new Date());
}

function getWeekStart(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getWeekDates(date = new Date()) {
  const start = getWeekStart(date);
  const dates = [];

  for (let i = 0; i < 7; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    dates.push(formatDate(current));
  }

  return dates;
}

function filterSessionsByDate(sessions, date) {
  return sessions.filter((session) => session.date === date);
}

function filterSessionsByDates(sessions, dates) {
  const dateSet = new Set(dates);
  return sessions.filter((session) => dateSet.has(session.date));
}

function sumDuration(sessions) {
  return sessions.reduce((total, session) => total + Number(session.duration || 0), 0);
}

function sumCalories(sessions) {
  return sessions.reduce((total, session) => total + Number(session.calories || 0), 0);
}

function getActiveDates(sessions) {
  return [...new Set(sessions.map((session) => session.date))];
}

function calculateStreak(sessions) {
  const activeDates = getActiveDates(sessions).sort().reverse();
  if (activeDates.length === 0) return 0;

  let streak = 0;
  let cursor = new Date();

  if (!activeDates.includes(todayString())) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (activeDates.includes(formatDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function aggregateByType(sessions) {
  return sessions.reduce((acc, session) => {
    acc[session.type] = (acc[session.type] || 0) + Number(session.duration || 0);
    return acc;
  }, {});
}

function aggregateWeeklyMinutes(sessions, weeks = 6) {
  const labels = [];
  const values = [];
  const anchor = getWeekStart(new Date());

  for (let i = weeks - 1; i >= 0; i -= 1) {
    const weekStart = new Date(anchor);
    weekStart.setDate(anchor.getDate() - i * 7);
    const weekDates = getWeekDates(weekStart);
    const weekSessions = filterSessionsByDates(sessions, weekDates);
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);

    labels.push(
      weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    );
    values.push(sumDuration(weekSessions));
  }

  return { labels, values };
}

function randomEncouragement() {
  return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
}

function greetingForHour() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}
