/* Neon World Clock — Fixed Version
   Features:
   - World clock with timezone search
   - Alarm system with sound
   - Stopwatch with laps
*/

// --- DOM references ---
const searchBtn = document.getElementById('searchBtn');
const modal = document.getElementById('modal');
const closeModal = document.getElementById('closeModal');
const searchInput = document.getElementById('search');
const suggestionsEl = document.getElementById('suggestions');
const applyBtn = document.getElementById('apply');
const useLocalBtn = document.getElementById('useLocal');
const msgEl = document.getElementById('msg');

const timeText = document.getElementById('timeText');
const dateText = document.getElementById('dateText');
const tzText = document.getElementById('tzText');

const hourHand = document.getElementById('hourHand');
const minuteHand = document.getElementById('minuteHand');
const secondHand = document.getElementById('secondHand');
const analogFace = document.getElementById('analogFace');

const alarmTimeInput = document.getElementById('alarmTime');
const alarmTzSelect = document.getElementById('alarmTz');
const setAlarmBtn = document.getElementById('setAlarmBtn');
const stopAlarmBtn = document.getElementById('stopAlarmBtn');
const alarmsList = document.getElementById('alarmsList');
const alarmSound = document.getElementById('alarmSound');

const swDisplay = document.getElementById('swDisplay');
const swStartBtn = document.getElementById('swStartBtn');
const swLapBtn = document.getElementById('swLapBtn');
const swStopBtn = document.getElementById('swStopBtn');
const swResetBtn = document.getElementById('swResetBtn');
const lapsEl = document.getElementById('laps');

// --- TIMEZONES ---
let timezones = [];
try {
  if (typeof Intl.supportedValuesOf === 'function')
    timezones = Intl.supportedValuesOf('timeZone');
} catch (e) {}

if (!timezones || timezones.length === 0) {
  timezones = [
    'UTC',
    'Asia/Kolkata',
    'Europe/London',
    'Europe/Paris',
    'America/New_York',
    'America/Los_Angeles',
    'Asia/Tokyo',
    'Australia/Sydney'
  ];
}

// populate alarm timezone list
for (const tz of timezones) {
  const opt = document.createElement('option');
  opt.value = tz;
  opt.textContent = tz;
  alarmTzSelect.appendChild(opt);
}
try {
  const localTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
  alarmTzSelect.value = localTZ;
} catch (e) {}

// --- SEARCH MODAL ---
let tzFriendly = timezones.map(t => ({
  tz: t,
  label: t.split('/').slice(1).join('/').replace(/_/g, ' ') || t
}));

function showSuggestions(q) {
  suggestionsEl.innerHTML = '';
  if (!q) return;
  const ql = q.toLowerCase();
  const matches = tzFriendly
    .filter(t => t.tz.toLowerCase().includes(ql) || t.label.toLowerCase().includes(ql))
    .slice(0, 40);
  matches.forEach(m => {
    const div = document.createElement('div');
    div.className = 'sug-item';
    div.textContent = `${m.tz} — ${m.label}`;
    div.dataset.tz = m.tz;
    div.onclick = () => {
      searchInput.value = m.tz;
      suggestionsEl.innerHTML = '';
    };
    suggestionsEl.appendChild(div);
  });
}

searchBtn.addEventListener('click', () => {
  modal.setAttribute('aria-hidden', 'false');
  searchInput.value = '';
  suggestionsEl.innerHTML = '';
  msgEl.textContent = '';
  setTimeout(() => searchInput.focus(), 60);
});

closeModal.addEventListener('click', () =>
  modal.setAttribute('aria-hidden', 'true')
);

useLocalBtn.addEventListener('click', () => {
  setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  modal.setAttribute('aria-hidden', 'true');
});

searchInput.addEventListener('input', e => showSuggestions(e.target.value));

applyBtn.addEventListener('click', () => {
  const q = searchInput.value.trim();
  if (!q) {
    msgEl.textContent = 'Type a city or timezone.';
    return;
  }
  const found = tzFriendly.find(
    t =>
      t.tz.toLowerCase() === q.toLowerCase() ||
      t.tz.toLowerCase().includes(q.toLowerCase()) ||
      t.label.toLowerCase().includes(q.toLowerCase())
  );
  if (found) {
    setTimezone(found.tz);
    modal.setAttribute('aria-hidden', 'true');
  } else {
    msgEl.textContent = 'No timezone found. Try "Asia/Kolkata", "London" etc.';
  }
});

modal.addEventListener('click', e => {
  if (e.target === modal) modal.setAttribute('aria-hidden', 'true');
});

// --- CLOCK ---
let currentTZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

function getParts(tz, date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const parts = fmt
    .formatToParts(date)
    .reduce((acc, p) => ((acc[p.type] = p.value), acc), {});
  const dateFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
  return {
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    dateStr: dateFmt.format(date),
    ms: date.getMilliseconds()
  };
}

function updateClock() {
  const now = new Date();
  const p = getParts(currentTZ, now);
  const hh = String(p.hour).padStart(2, '0');
  const mm = String(p.minute).padStart(2, '0');
  const ss = String(p.second).padStart(2, '0');

  timeText.textContent = `${hh}:${mm}:${ss}`;
  dateText.textContent = p.dateStr;
  tzText.textContent = currentTZ;

  const secFrac = p.second + p.ms / 1000;
  const minFrac = p.minute + secFrac / 60;
  const hourFrac = (p.hour % 12) + minFrac / 60;

  hourHand.style.transform = `translate(-50%,-100%) rotate(${hourFrac * 30}deg)`;
  minuteHand.style.transform = `translate(-50%,-100%) rotate(${minFrac * 6}deg)`;
  secondHand.style.transform = `translate(-50%,-100%) rotate(${secFrac * 6}deg)`;

  checkAlarms(p.hour, p.minute, p.second);
}

setInterval(updateClock, 200);

function setTimezone(tz) {
  currentTZ = tz;
  tzText.textContent = tz;
  try {
    alarmTzSelect.value = tz;
  } catch (e) {}
}

// --- Draw analog ticks ---
(function makeTicks() {
  for (let i = 0; i < 60; i++) {
    const tick = document.createElement('div');
    tick.style.position = 'absolute';
    tick.style.left = '50%';
    tick.style.top = '8%';
    tick.style.width = i % 5 === 0 ? '6px' : '3px';
    tick.style.height = i % 5 === 0 ? '22px' : '12px';
    tick.style.background = 'rgba(255,255,255,0.05)';
    tick.style.transformOrigin = '50% 140px';
    tick.style.transform = `translate(-50%,0) rotate(${i * 6}deg)`;
    analogFace.appendChild(tick);
  }
})();

// --- ALARMS ---
let alarms = [];

function renderAlarms() {
  alarmsList.innerHTML = '';
  if (!alarms.length) {
    alarmsList.innerHTML = '<div>No alarms</div>';
    return;
  }
  alarms.forEach(a => {
    const el = document.createElement('div');
    el.style.display = 'flex';
    el.style.justifyContent = 'space-between';
    el.style.alignItems = 'center';
    el.style.marginBottom = '6px';
    el.innerHTML = `<div><b>${a.time}</b><div style="font-size:12px">${a.tz}</div></div>`;
    const btns = document.createElement('div');
    const toggle = document.createElement('button');
    toggle.textContent = a.active ? 'On' : 'Off';
    toggle.className = 'btn';
    toggle.onclick = () => {
      a.active = !a.active;
      renderAlarms();
    };
    const del = document.createElement('button');
    del.textContent = 'Del';
    del.className = 'btn';
    del.onclick = () => {
      alarms = alarms.filter(x => x.id !== a.id);
      renderAlarms();
    };
    btns.append(toggle, del);
    el.appendChild(btns);
    alarmsList.appendChild(el);
  });
}

function addAlarm(tz, timeStr) {
  const id = Date.now();
  alarms.push({ id, tz, time: timeStr, active: true });
  renderAlarms();
}

function playAlarm() {
  alarmSound.play().catch(() => {});
}

function checkAlarms(h, m, s) {
  if (s !== 0) return;
  alarms.forEach(a => {
    if (!a.active) return;
    const [ah, am] = a.time.split(':').map(Number);
    const parts = getParts(a.tz, new Date());
    if (parts.hour === ah && parts.minute === am && parts.second === 0) {
      playAlarm();
      alert(`⏰ Alarm for ${a.tz} (${a.time})`);
      a.active = false;
      renderAlarms();
    }
  });
}

setAlarmBtn.addEventListener('click', () => {
  const time = alarmTimeInput.value;
  const tz = alarmTzSelect.value;
  if (!time) return alert('Set a time first!');
  addAlarm(tz, time);
  alarmTimeInput.value = '';
  alert('Alarm set!');
});

stopAlarmBtn.addEventListener('click', () => {
  alarmSound.pause();
  alarmSound.currentTime = 0;
});

// --- STOPWATCH ---
let swStart = 0,
  swElapsed = 0,
  swTimer = null;

function formatMs(ms) {
  const t = Math.floor(ms);
  const h = Math.floor(t / 3600000);
  const m = Math.floor((t % 3600000) / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const msPart = t % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(
    s
  ).padStart(2, '0')}.${String(msPart).padStart(3, '0')}`;
}

function swTick() {
  const now = performance.now();
  const cur = swElapsed + (now - swStart);
  swDisplay.textContent = formatMs(cur);
  swTimer = requestAnimationFrame(swTick);
}

swStartBtn.addEventListener('click', () => {
  if (swTimer) return;
  swStart = performance.now();
  swTimer = requestAnimationFrame(swTick);
});

swStopBtn.addEventListener('click', () => {
  if (!swTimer) return;
  cancelAnimationFrame(swTimer);
  swElapsed += performance.now() - swStart;
  swTimer = null;
});

swResetBtn.addEventListener('click', () => {
  if (swTimer) cancelAnimationFrame(swTimer);
  swStart = 0;
  swElapsed = 0;
  swTimer = null;
  swDisplay.textContent = '00:00:00.000';
  lapsEl.innerHTML = '';
});

swLapBtn.addEventListener('click', () => {
  const cur = swTimer ? swElapsed + (performance.now() - swStart) : swElapsed;
  const div = document.createElement('div');
  div.textContent = `Lap ${lapsEl.children.length + 1}: ${formatMs(cur)}`;
  lapsEl.prepend(div);
});

// initial run
updateClock();