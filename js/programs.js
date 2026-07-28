const PROGRAMS_KEY = 'sporrPrograms';
const RUNS_KEY = 'sporrRuns';

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function parseProgramItem(raw) {
  const [exerciseId, sets, mode, value, restSets, restAfter] = raw.split('@');
  return {
    exerciseId,
    sets: Number(sets) || 3,
    mode: mode || 'reps',
    value: Number(value) || 12,
    restSets: Number(restSets) || 45,
    restAfter: Number(restAfter) || 60
  };
}

function serializeProgramItem(item) {
  return [
    item.exerciseId,
    item.sets,
    item.mode,
    item.value,
    item.restSets,
    item.restAfter
  ].join('@');
}

function parseProgram(raw) {
  const parts = raw.split('~');
  if (parts.length < 3) return null;
  return {
    id: parts[0],
    name: parts[1],
    created: parts[2],
    restBetween: Number(parts[3]) || 60,
    items: (parts[4] || '').split(';').filter(Boolean).map(parseProgramItem)
  };
}

function serializeProgram(program) {
  return [
    program.id,
    program.name,
    program.created,
    program.restBetween || 60,
    program.items.map(serializeProgramItem).join(';')
  ].join('~');
}

function loadPrograms() {
  const data = localStorage.getItem(PROGRAMS_KEY);
  if (!data) return [];
  return data.split('|').filter(Boolean).map(parseProgram).filter(Boolean);
}

function savePrograms(programs) {
  localStorage.setItem(PROGRAMS_KEY, programs.map(serializeProgram).join('|'));
}

function saveProgram(program) {
  const programs = loadPrograms().filter((p) => p.id !== program.id);
  programs.unshift(program);
  savePrograms(programs);
  return program;
}

function deleteProgram(id) {
  savePrograms(loadPrograms().filter((p) => p.id !== id));
}

function estimateExerciseSeconds(item) {
  const ex = getExerciseById(item.exerciseId);
  const workPerSet = item.mode === 'time' ? item.value : (ex?.defaultMode === 'time' ? item.value : item.value * 3);
  const setsWork = workPerSet * item.sets;
  const setsRest = item.restSets * Math.max(0, item.sets - 1);
  return setsWork + setsRest + item.restAfter;
}

function estimateProgramDuration(program) {
  if (!program.items.length) return 0;
  return program.items.reduce((total, item) => total + estimateExerciseSeconds(item), 0);
}

function formatDurationSeconds(totalSec) {
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec} s`;
  if (sec === 0) return `${min} min`;
  return `${min} min ${sec} s`;
}

function generateProgramByMuscles(muscles, exerciseCount = 5) {
  const pool = EXERCISE_CATALOG.filter((ex) => muscles.includes(ex.muscle));
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, exerciseCount);
  return shuffled.map((ex) => ({
    exerciseId: ex.id,
    sets: 3,
    mode: ex.defaultMode || 'reps',
    value: ex.defaultValue || 12,
    restSets: 45,
    restAfter: 60
  }));
}

function generateProgramByTime(muscles, targetMinutes) {
  const targetSec = targetMinutes * 60;
  const items = [];
  let total = 0;
  const pool = [...EXERCISE_CATALOG.filter((ex) => muscles.includes(ex.muscle))].sort(() => Math.random() - 0.5);

  for (const ex of pool) {
    if (total >= targetSec) break;
    const item = {
      exerciseId: ex.id,
      sets: 3,
      mode: ex.defaultMode || 'reps',
      value: ex.defaultValue || 12,
      restSets: 40,
      restAfter: 50
    };
    const dur = estimateExerciseSeconds(item);
    if (total + dur <= targetSec + 120) {
      items.push(item);
      total += dur;
    }
  }

  if (items.length === 0 && pool[0]) {
    items.push({
      exerciseId: pool[0].id,
      sets: 2,
      mode: pool[0].defaultMode || 'reps',
      value: pool[0].defaultValue || 12,
      restSets: 30,
      restAfter: 45
    });
  }

  return items;
}

function parseRun(raw) {
  const parts = raw.split('~');
  if (parts.length < 7) return null;
  return {
    id: parts[0],
    date: parts[1],
    name: parts[2],
    description: parts[3],
    durationSec: Number(parts[4]) || 0,
    distanceM: Number(parts[5]) || 0,
    elevationM: Number(parts[6]) || 0,
    route: (parts[7] || '').split(';').filter(Boolean).map((p) => {
      const [lat, lng, alt] = p.split(',');
      return { lat: Number(lat), lng: Number(lng), alt: Number(alt) || 0 };
    })
  };
}

function serializeRun(run) {
  const route = run.route.map((p) => `${p.lat},${p.lng},${p.alt || 0}`).join(';');
  return [run.id, run.date, run.name, run.description, run.durationSec, run.distanceM, run.elevationM, route].join('~');
}

function loadRuns() {
  const data = localStorage.getItem(RUNS_KEY);
  if (!data) return [];
  return data.split('|').filter(Boolean).map(parseRun).filter(Boolean);
}

function saveRuns(runs) {
  localStorage.setItem(RUNS_KEY, runs.map(serializeRun).join('|'));
}

function saveRun(run) {
  const runs = loadRuns().filter((r) => r.id !== run.id);
  runs.unshift(run);
  saveRuns(runs);
  return run;
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcRouteStats(points) {
  let distance = 0;
  let elevationGain = 0;
  for (let i = 1; i < points.length; i += 1) {
    distance += haversineMeters(points[i - 1].lat, points[i - 1].lng, points[i].lat, points[i].lng);
    const altDiff = (points[i].alt || 0) - (points[i - 1].alt || 0);
    if (altDiff > 0) elevationGain += altDiff;
  }
  return { distance, elevationGain };
}

function drawRouteCanvas(canvas, points) {
  if (!canvas || points.length < 2) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#1c1c28';
  ctx.fillRect(0, 0, w, h);

  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const pad = 20;
  const scaleX = (w - pad * 2) / (maxLng - minLng || 0.001);
  const scaleY = (h - pad * 2) / (maxLat - minLat || 0.001);

  ctx.strokeStyle = '#FF6B35';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  points.forEach((p, i) => {
    const x = pad + (p.lng - minLng) * scaleX;
    const y = h - pad - (p.lat - minLat) * scaleY;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  const start = points[0];
  const end = points[points.length - 1];
  [{ p: start, color: '#00C9A7' }, { p: end, color: '#7B2FF7' }].forEach(({ p, color }) => {
    const x = pad + (p.lng - minLng) * scaleX;
    const y = h - pad - (p.lat - minLat) * scaleY;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
  });
}
