const SESSIONS_KEY = 'sporrSessions';
const SETTINGS_KEY = 'sporrSettings';

const DEFAULT_SETTINGS = {
  name: 'Sarah',
  goal: '',
  theme: 'light'
};

function parseSession(raw) {
  const parts = raw.split(':');
  if (parts.length < 3) return null;

  return {
    date: parts[0],
    type: parts[1],
    duration: parts[2],
    calories: parts[3] || '',
    note: parts.slice(4).join(':') || ''
  };
}

function serializeSession(session) {
  return [
    session.date,
    session.type,
    session.duration,
    session.calories || '',
    session.note || ''
  ].join(':');
}

function loadSessions() {
  const data = localStorage.getItem(SESSIONS_KEY);
  if (!data) return [];

  return data
    .split('|')
    .filter((entry) => entry.trim() !== '')
    .map(parseSession)
    .filter(Boolean);
}

function saveSessions(sessions) {
  localStorage.setItem(SESSIONS_KEY, sessions.map(serializeSession).join('|'));
}

function loadSettings() {
  const data = localStorage.getItem(SETTINGS_KEY);
  if (!data) return { ...DEFAULT_SETTINGS };

  const settings = { ...DEFAULT_SETTINGS };
  data.split('|').forEach((entry) => {
    const [key, ...valueParts] = entry.split(':');
    if (key in settings) {
      settings[key] = valueParts.join(':');
    }
  });

  return settings;
}

function saveSettings(settings) {
  const serialized = Object.entries(settings)
    .map(([key, value]) => `${key}:${value}`)
    .join('|');
  localStorage.setItem(SETTINGS_KEY, serialized);
}

function addSession(session) {
  const sessions = loadSessions();
  sessions.push(session);
  saveSessions(sessions);
  return sessions;
}

function deleteSession(date, type, duration) {
  const sessions = loadSessions();
  const index = sessions.findIndex(
    (session) =>
      session.date === date &&
      session.type === type &&
      session.duration === String(duration)
  );

  if (index !== -1) {
    sessions.splice(index, 1);
  }

  saveSessions(sessions);
  return sessions;
}

function updateSession(original, updated) {
  const sessions = loadSessions();
  const index = sessions.findIndex(
    (session) =>
      session.date === original.date &&
      session.type === original.type &&
      session.duration === String(original.duration) &&
      (session.note || '') === (original.note || '') &&
      (session.calories || '') === String(original.calories || '')
  );

  if (index === -1) return sessions;

  sessions[index] = updated;
  saveSessions(sessions);
  return sessions;
}

function resetAllData() {
  localStorage.removeItem(SESSIONS_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem('sporrBadges');
}
