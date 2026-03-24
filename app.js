/* =========================================================
   Weekly Logbook — app.js
   ========================================================= */

const STORAGE_KEY = 'weeklyLogbookData';
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

/* ── Day section definitions ── */
const DAY_SECTIONS = [
  {
    key:   'tasksCompleted',
    title: 'Tasks Completed Today',
    icon:  '✅',
    placeholder: 'Task 1\nAdditional details or notes about the task\n\nTask 2\nAdditional details or notes about the task\n\nTask 3',
    rows:  6,
  },
  {
    key:   'skillsLearned',
    title: 'New Skills Learned',
    icon:  '🧠',
    placeholder: 'Skill 1\nSkill 2\nSkill 3',
    rows:  4,
  },
  {
    key:   'challenges',
    title: 'Challenges Faced',
    icon:  '⚡',
    placeholder: 'Challenge 1 — how it was addressed\nChallenge 2 — how it was addressed',
    rows:  4,
  },
  {
    key:   'observations',
    title: 'Observations / Reflections',
    icon:  '💡',
    placeholder: 'Observation or reflection 1\nObservation or reflection 2\nObservation or reflection 3',
    rows:  4,
  },
  {
    key:   'questions',
    title: 'Questions / Concerns for Supervisor',
    icon:  '❓',
    placeholder: 'Question or concern 1\nQuestion or concern 2',
    rows:  3,
  },
  {
    key:   'goals',
    title: 'Goals for Tomorrow',
    icon:  '🎯',
    placeholder: 'Goal 1\nGoal 2',
    rows:  3,
  },
];

/* ── State ── */
let logbooks      = [];
let activeId      = null;
let pendingDelete = null;

/* ── DOM refs ── */
const appLayout         = document.getElementById('appLayout');
const sidebarToggle     = document.getElementById('sidebarToggle');
const sidebarNav        = document.getElementById('sidebarNav');
const sidebarBackdrop   = document.getElementById('sidebarBackdrop');
const emptySidebarState = document.getElementById('emptySidebarState');
const newWeekBtn        = document.getElementById('newWeekBtn');
const mobileMenuBtn     = document.getElementById('mobileMenuBtn');
const mobileNewWeekBtn  = document.getElementById('mobileNewWeekBtn');
const navHomeItem       = document.getElementById('navHomeItem');

// Views
const homeView          = document.getElementById('homeView');
const logbookView       = document.getElementById('logbookView');

// Home
const homeCreateBtn     = document.getElementById('homeCreateBtn');
const emptyCreateBtn    = document.getElementById('emptyCreateBtn');
const logbookCardsGrid  = document.getElementById('logbookCardsGrid');
const homeEmpty         = document.getElementById('homeEmpty');
const statTotal         = document.getElementById('statTotal');
const statEntries       = document.getElementById('statEntries');
const statMedia         = document.getElementById('statMedia');

// Logbook view
const logbookWeekBadge  = document.getElementById('logbookWeekBadge');
const breadcrumbWeek    = document.getElementById('breadcrumbWeek');
const backHomeBtn       = document.getElementById('backHomeBtn');
const daysGrid          = document.getElementById('daysGrid');
const saveBtn           = document.getElementById('saveBtn');

// Create modal
const modalOverlay      = document.getElementById('modalOverlay');
const modalClose        = document.getElementById('modalClose');
const modalCancelBtn    = document.getElementById('modalCancelBtn');
const modalCreateBtn    = document.getElementById('modalCreateBtn');
const weekInput         = document.getElementById('weekInput');
const modalError        = document.getElementById('modalError');

// Delete modal
const deleteOverlay     = document.getElementById('deleteOverlay');
const deleteCancelBtn   = document.getElementById('deleteCancelBtn');
const deleteConfirmBtn  = document.getElementById('deleteConfirmBtn');
const deleteConfirmText = document.getElementById('deleteConfirmText');

const toastContainer    = document.getElementById('toastContainer');


/* =========================================================
   Persistence
   ========================================================= */
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) logbooks = JSON.parse(raw);
  } catch { logbooks = []; }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(logbooks));
}

/* =========================================================
   UID
   ========================================================= */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/* =========================================================
   View switching
   ========================================================= */
function isMobile() { return window.innerWidth <= 767; }

function openMobileSidebar() {
  appLayout.classList.add('sidebar-open');
  sidebarBackdrop.classList.add('visible');
}

function closeMobileSidebar() {
  appLayout.classList.remove('sidebar-open');
  sidebarBackdrop.classList.remove('visible');
}

function showHome() {
  homeView.classList.remove('hidden');
  logbookView.classList.add('hidden');
  activeId = null;
  renderHome();
  renderSidebar();
  closeMobileSidebar();
}

function showLogbook(id) {
  const lb = logbooks.find(l => l.id === id);
  if (!lb) return;
  activeId = id;
  homeView.classList.add('hidden');
  logbookView.classList.remove('hidden');
  logbookWeekBadge.textContent = `Week ${lb.weekNumber}`;
  breadcrumbWeek.textContent   = `Week ${lb.weekNumber}`;
  renderDays(lb);
  renderSidebar();
  closeMobileSidebar();
  // Reset summary panel so stale content doesn't carry over
  if (typeof resetSummaryPanel === 'function') resetSummaryPanel();
  document.getElementById('mainContent').scrollTop = 0;
}

/* =========================================================
   Home View
   ========================================================= */
function renderHome() {
  // Update stats
  let totalEntries = 0;
  let totalMedia   = 0;
  logbooks.forEach(lb => {
    DAYS.forEach(d => {
      const day = lb.days[d];
      if (day) {
        if (day.task && day.task.trim()) totalEntries++;
        if (day.media) totalMedia += day.media.length;
      }
    });
  });

  statTotal.textContent   = logbooks.length;
  statEntries.textContent = totalEntries;
  statMedia.textContent   = totalMedia;

  // Cards
  logbookCardsGrid.innerHTML = '';
  if (logbooks.length === 0) {
    homeEmpty.classList.remove('hidden');
    logbookCardsGrid.classList.add('hidden');
    return;
  }

  homeEmpty.classList.add('hidden');
  logbookCardsGrid.classList.remove('hidden');

  const sorted = [...logbooks].sort((a, b) => a.weekNumber - b.weekNumber);
  sorted.forEach(lb => {
    const card = buildLogbookCard(lb);
    logbookCardsGrid.appendChild(card);
  });
}

function buildLogbookCard(lb) {
  // Compute fill stats
  let filledDays = 0;
  let mediaCount = 0;
  DAYS.forEach(d => {
    const day = lb.days[d];
    if (day) {
      if (day.task && day.task.trim()) filledDays++;
      if (day.media) mediaCount += day.media.length;
    }
  });
  const pct = Math.round((filledDays / 7) * 100);

  const card = document.createElement('div');
  card.className = 'logbook-card';

  card.innerHTML = `
    <div class="logbook-card-top">
      <div class="logbook-card-badge">Week ${lb.weekNumber}</div>
    </div>
    <div class="logbook-card-week">Week ${lb.weekNumber}</div>
    <div class="logbook-card-meta">
      <div class="logbook-card-stat">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
        ${filledDays} / 7 days logged
      </div>
      <div class="logbook-card-stat">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
        ${mediaCount} media file${mediaCount !== 1 ? 's' : ''}
      </div>
    </div>
    <div class="logbook-card-progress">
      <div class="progress-label">
        <span>Completion</span><span>${pct}%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${pct}%"></div>
      </div>
    </div>
    <div class="logbook-card-actions">
      <button class="card-btn-open" data-id="${lb.id}">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
        </svg>
        Open Logbook
      </button>
      <button class="card-btn-delete" data-id="${lb.id}" title="Delete Week ${lb.weekNumber}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/>
          <path d="M9 6V4h6v2"/>
        </svg>
      </button>
    </div>`;

  card.querySelector('.card-btn-open').addEventListener('click', () => showLogbook(lb.id));
  card.querySelector('.card-btn-delete').addEventListener('click', () => confirmDelete(lb.id));

  return card;
}

/* =========================================================
   Sidebar
   ========================================================= */
function renderSidebar() {
  // Remove all week nav items
  sidebarNav.querySelectorAll('.nav-item-week').forEach(n => n.remove());

  // Home item active state
  navHomeItem.classList.toggle('active', activeId === null);

  if (logbooks.length === 0) {
    emptySidebarState.classList.remove('hidden');
    return;
  }
  emptySidebarState.classList.add('hidden');

  const sorted = [...logbooks].sort((a, b) => a.weekNumber - b.weekNumber);
  sorted.forEach(lb => {
    const item = document.createElement('div');
    item.className = 'nav-item nav-item-week' + (lb.id === activeId ? ' active' : '');

    item.innerHTML = `
      <div class="nav-item-left">
        <span class="nav-item-icon">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
        </span>
        <span class="nav-item-label">Week ${lb.weekNumber}</span>
      </div>
      <button class="nav-item-delete" data-id="${lb.id}" title="Delete Week ${lb.weekNumber}">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
          <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
      </button>`;

    item.addEventListener('click', (e) => {
      if (e.target.closest('.nav-item-delete')) return;
      showLogbook(lb.id);
    });
    item.querySelector('.nav-item-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      confirmDelete(lb.id);
    });

    sidebarNav.appendChild(item);
  });
}

/* =========================================================
   Logbook / Days
   ========================================================= */
function migrateDay(dayData) {
  // Backward-compat: old data had a single `task` string field
  if (dayData && dayData.task !== undefined && dayData.tasksCompleted === undefined) {
    dayData.tasksCompleted = dayData.task || '';
    DAY_SECTIONS.forEach(s => { if (!dayData[s.key]) dayData[s.key] = ''; });
    delete dayData.task;
  }
  return dayData;
}

function emptyDay() {
  const d = { media: [] };
  DAY_SECTIONS.forEach(s => { d[s.key] = ''; });
  return d;
}

function renderDays(lb) {
  daysGrid.innerHTML = '';
  DAYS.forEach(day => {
    const raw     = lb.days[day] || emptyDay();
    const dayData = migrateDay(raw);
    lb.days[day]  = dayData;   // ensure migrated data is stored

    const card = document.createElement('div');
    card.className = 'day-card';
    card.dataset.day = day;

    // Build section HTML
    let sectionsHtml = '';
    DAY_SECTIONS.forEach(sec => {
      sectionsHtml += `
        <div class="day-section">
          <div class="day-section-header">
            <span class="day-section-icon">${sec.icon}</span>
            <span class="day-section-title">${sec.title}</span>
          </div>
          <textarea
            class="day-textarea"
            data-field="${sec.key}"
            rows="${sec.rows}"
            placeholder="${sec.placeholder.replace(/"/g, '&quot;')}">${escapeHtml(dayData[sec.key] || '')}</textarea>
        </div>`;
    });

    card.innerHTML = `
      <div class="day-card-header">
        <div class="day-dot"></div>
        <div class="day-name">${day}</div>
      </div>
      <div class="day-sections">${sectionsHtml}</div>
      <div class="day-media-block">
        <div class="field-label">Media Attachments</div>
        <div class="media-upload-zone" id="zone-${day}">
          <input type="file" accept="image/*,video/*" multiple id="file-${day}" />
          <div class="upload-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <div class="upload-text">Click or drag images / videos</div>
          <div class="upload-hint">JPEG · PNG · GIF · MP4 · WebM</div>
        </div>
        <div class="media-previews" id="previews-${day}"></div>
      </div>`;

    daysGrid.appendChild(card);

    dayData.media.forEach((src, idx) => addMediaPreview(day, src, idx));

    const fileInput = card.querySelector(`#file-${day}`);
    fileInput.addEventListener('change', () => handleFiles(day, fileInput.files));

    const zone = card.querySelector(`#zone-${day}`);
    zone.addEventListener('dragover',  (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', ()  => zone.classList.remove('drag-over'));
    zone.addEventListener('drop',      (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      handleFiles(day, e.dataTransfer.files);
    });
  });
}

/* =========================================================
   Media
   ========================================================= */
function handleFiles(day, files) {
  const lb = logbooks.find(l => l.id === activeId);
  if (!lb) return;
  if (!lb.days[day]) lb.days[day] = { task: '', media: [] };

  Array.from(files).forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target.result;
      lb.days[day].media.push(src);
      addMediaPreview(day, src, lb.days[day].media.length - 1);
    };
    reader.readAsDataURL(file);
  });
}

function addMediaPreview(day, src, idx) {
  const container = document.getElementById(`previews-${day}`);
  if (!container) return;

  const wrap = document.createElement('div');
  wrap.className = 'media-preview-item';
  wrap.dataset.idx = idx;

  if (src.startsWith('data:video')) {
    const vid = document.createElement('video');
    vid.src = src; vid.muted = true; vid.loop = true; vid.playsInline = true;
    vid.addEventListener('mouseenter', () => vid.play());
    vid.addEventListener('mouseleave', () => { vid.pause(); vid.currentTime = 0; });
    wrap.appendChild(vid);
  } else {
    const img = document.createElement('img');
    img.src = src; img.alt = 'Attachment';
    wrap.appendChild(img);
  }

  const btn = document.createElement('button');
  btn.className = 'media-preview-remove';
  btn.innerHTML = '✕';
  btn.title = 'Remove';
  btn.addEventListener('click', () => removeMedia(day, wrap));
  wrap.appendChild(btn);
  container.appendChild(wrap);
}

function removeMedia(day, wrapEl) {
  const lb = logbooks.find(l => l.id === activeId);
  if (!lb || !lb.days[day]) return;
  const idx = parseInt(wrapEl.dataset.idx, 10);
  lb.days[day].media.splice(idx, 1);
  const container = document.getElementById(`previews-${day}`);
  container.innerHTML = '';
  lb.days[day].media.forEach((src, i) => addMediaPreview(day, src, i));
}

function collectEdits() {
  const lb = logbooks.find(l => l.id === activeId);
  if (!lb) return;
  DAYS.forEach(day => {
    const card = document.querySelector(`.day-card[data-day="${day}"]`);
    if (!card) return;
    if (!lb.days[day]) lb.days[day] = emptyDay();
    // Collect each structured section
    card.querySelectorAll('.day-textarea[data-field]').forEach(ta => {
      lb.days[day][ta.dataset.field] = ta.value;
    });
  });
}

/* =========================================================
   Save
   ========================================================= */
saveBtn.addEventListener('click', () => {
  collectEdits();
  saveData();
  showToast('Logbook saved successfully!', 'success');
  renderSidebar();
});

/* =========================================================
   Weekly Summary
   ========================================================= */
const generateSummaryBtn = document.getElementById('generateSummaryBtn');
const copySummaryBtn     = document.getElementById('copySummaryBtn');
const summaryBody        = document.getElementById('summaryBody');
const summaryEmpty       = document.getElementById('summaryEmpty');
const summaryTextarea    = document.getElementById('summaryTextarea');

const SECTION_ICONS = {
  tasksCompleted: '✅',
  skillsLearned:  '🧠',
  challenges:     '⚡',
  observations:   '💡',
  questions:      '❓',
  goals:          '🎯',
};

function resetSummaryPanel() {
  summaryBody.classList.add('hidden');
  summaryEmpty.style.display = '';
  copySummaryBtn.style.display = 'none';
  summaryTextarea.value = '';
}

function generateSummary() {
  // First collect whatever is currently typed (not yet saved)
  collectEdits();

  const lb = logbooks.find(l => l.id === activeId);
  if (!lb) return;

  const SEP_THICK = '════════════════════════════════════════════════════';
  const SEP_THIN  = '────────────────────────────────────────────────────';

  const lines = [];
  lines.push(SEP_THICK);
  lines.push(`  WEEKLY ACTIVITY REPORT — Week ${lb.weekNumber}`);
  lines.push(SEP_THICK);
  lines.push('');

  let hasAnyContent = false;

  DAYS.forEach((day, idx) => {
    const dayData = lb.days[day];
    if (!dayData) return;

    // Check if this day has any content
    const dayHasContent = DAY_SECTIONS.some(s => dayData[s.key] && dayData[s.key].trim());
    const mediaCount = (dayData.media || []).length;

    if (!dayHasContent && mediaCount === 0) return;   // skip blank days

    hasAnyContent = true;

    lines.push(`  ${day.toUpperCase()}`);
    lines.push(SEP_THIN);

    DAY_SECTIONS.forEach(sec => {
      const val = (dayData[sec.key] || '').trim();
      if (!val) return;

      lines.push('');
      lines.push(`  ${SECTION_ICONS[sec.key]}  ${sec.title}`);

      // Indent each line of the entry
      val.split('\n').forEach(line => {
        lines.push(`     ${line}`);
      });
    });

    if (mediaCount > 0) {
      lines.push('');
      lines.push(`  📎  Media Attachments`);
      lines.push(`     ${mediaCount} file${mediaCount !== 1 ? 's' : ''} attached`);
    }

    lines.push('');
    lines.push('');
  });

  if (!hasAnyContent) {
    showToast('No entries found. Fill in some daily fields first.', 'error');
    return;
  }

  lines.push(SEP_THICK);
  lines.push(`  END OF REPORT — Week ${lb.weekNumber}`);
  lines.push(SEP_THICK);

  const text = lines.join('\n');
  summaryTextarea.value = text;

  // Auto-size the textarea to its content height (up to a cap)
  summaryTextarea.style.height = 'auto';
  summaryTextarea.style.height = Math.min(summaryTextarea.scrollHeight, 800) + 'px';

  summaryBody.classList.remove('hidden');
  summaryEmpty.style.display = 'none';
  copySummaryBtn.style.display = '';

  // Scroll to panel
  document.getElementById('summaryPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('Weekly summary generated!', 'success');
}

generateSummaryBtn.addEventListener('click', generateSummary);

copySummaryBtn.addEventListener('click', () => {
  const text = summaryTextarea.value;
  if (!text) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast('Summary copied to clipboard!', 'success'))
      .catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
});

function fallbackCopy(text) {
  summaryTextarea.select();
  try {
    document.execCommand('copy');
    showToast('Summary copied to clipboard!', 'success');
  } catch {
    showToast('Press Ctrl+A then Ctrl+C to copy.', 'error');
  }
}


/* =========================================================
   Navigation
   ========================================================= */
navHomeItem.addEventListener('click', showHome);
backHomeBtn.addEventListener('click', showHome);
sidebarToggle.addEventListener('click', () => appLayout.classList.toggle('collapsed'));

// Mobile sidebar
if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', () => {
  if (appLayout.classList.contains('sidebar-open')) closeMobileSidebar();
  else openMobileSidebar();
});
if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', closeMobileSidebar);
if (mobileNewWeekBtn) mobileNewWeekBtn.addEventListener('click', openCreateModal);

/* =========================================================
   Create Modal
   ========================================================= */
function openCreateModal() {
  const maxWeek = logbooks.length > 0 ? Math.max(...logbooks.map(l => l.weekNumber)) : 0;
  weekInput.value = maxWeek + 1;
  modalError.classList.add('hidden');
  modalOverlay.classList.remove('hidden');
  weekInput.focus();
  weekInput.select();
}

function closeCreateModal() { modalOverlay.classList.add('hidden'); }

[newWeekBtn, homeCreateBtn, emptyCreateBtn].forEach(btn => btn && btn.addEventListener('click', openCreateModal));
modalClose.addEventListener('click', closeCreateModal);
modalCancelBtn.addEventListener('click', closeCreateModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeCreateModal(); });
weekInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') modalCreateBtn.click(); if (e.key === 'Escape') closeCreateModal(); });

modalCreateBtn.addEventListener('click', () => {
  const num = parseInt(weekInput.value, 10);
  if (!weekInput.value.trim() || isNaN(num) || num < 1) {
    showModalError('Please enter a valid week number (minimum 1).');
    return;
  }
  if (logbooks.find(l => l.weekNumber === num)) {
    showModalError(`Week ${num} already exists. Choose a different number.`);
    return;
  }

  const newLb = { id: uid(), weekNumber: num, days: {} };
  DAYS.forEach(d => { newLb.days[d] = emptyDay(); });
  logbooks.push(newLb);
  saveData();
  closeCreateModal();
  renderSidebar();
  renderHome();
  showLogbook(newLb.id);
  showToast(`Week ${num} logbook created!`, 'success');
});

function showModalError(msg) {
  modalError.textContent = msg;
  modalError.classList.remove('hidden');
}

/* =========================================================
   Delete
   ========================================================= */
function confirmDelete(id) {
  const lb = logbooks.find(l => l.id === id);
  if (!lb) return;
  pendingDelete = id;
  deleteConfirmText.innerHTML = `Are you sure you want to delete <strong>Week ${lb.weekNumber}</strong>?`;
  deleteOverlay.classList.remove('hidden');
}

function closeDeleteModal() { deleteOverlay.classList.add('hidden'); pendingDelete = null; }

deleteCancelBtn.addEventListener('click', closeDeleteModal);
deleteOverlay.addEventListener('click', (e) => { if (e.target === deleteOverlay) closeDeleteModal(); });

deleteConfirmBtn.addEventListener('click', () => {
  if (!pendingDelete) return;
  const idx = logbooks.findIndex(l => l.id === pendingDelete);
  const week = idx !== -1 ? logbooks[idx].weekNumber : '?';
  if (idx !== -1) logbooks.splice(idx, 1);
  saveData();

  const wasActive = activeId === pendingDelete;
  closeDeleteModal();

  if (wasActive) showHome();
  else { renderSidebar(); renderHome(); }

  showToast(`Week ${week} deleted.`, 'success');
});

/* =========================================================
   Toast
   ========================================================= */
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success'
    ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
    : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  toast.innerHTML = `${icon}<span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-exit');
    toast.addEventListener('animationend', () => toast.remove());
  }, 3200);
}

/* =========================================================
   Utility
   ========================================================= */
function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/* =========================================================
   Init
   ========================================================= */
function init() {
  loadData();
  renderSidebar();
  showHome();
}

init();
