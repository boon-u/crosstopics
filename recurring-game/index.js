/*
 * Recurring Appointments — interactive module.
 * Vanilla-JS port of <RecurringAppointmentsDiagram /> from the registration-trail app,
 * wrapped in an in-app page that opens from the "Create recurring group session" card.
 */

const SVGNS = 'http://www.w3.org/2000/svg';

const C = {
  ink: '#14283C', inkSoft: '#4A5C70', card: '#FFFFFF', line: '#E7E2D6',
  teal: '#0E9C8A', gold: '#F2B53B', goldSoft: '#FCF1D8', green: '#2FB872',
};
const REC_CHECKIN = '#EC4899';
const REC_SERVICE = '#FDE68A';
const REC_SERVICE_STROKE = '#CA8A04';
const DISP = `'Baloo 2', system-ui, -apple-system, 'Segoe UI', sans-serif`;

// Geometry (identical to the source component)
const RECURRING_APPTS = 4;
const APPT_YS = [62, 150, 238, 326];
const APPT_X = 278, APPT_ANCHOR = APPT_X, APPT_W = 52;
const ENC_W = 148, ENC_H = 72, ENC_APPT_GAP = 56;
const ENC_X = APPT_X - ENC_W - ENC_APPT_GAP;
const ENC_Y = APPT_YS[0] - 36;
const ENC_ANCHOR = ENC_X + ENC_W;
const ENC_CY = ENC_Y + ENC_H / 2;
const OUT_X = 510;
const ACTIONS_X = APPT_X + APPT_W + 22;

function svgEl(tag, attrs) {
  const e = document.createElementNS(SVGNS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}
function svgText(x, y, str, attrs) {
  const t = svgEl('text', Object.assign({ x, y }, attrs));
  t.textContent = str;
  return t;
}
function threadLine(x1, y1, x2, y2) { return `M ${x1} ${y1} L ${x2} ${y2}`; }

function calIcon(x, y, s = 36) {
  const g = svgEl('g', { transform: `translate(${x},${y})` });
  g.appendChild(svgEl('rect', { x: 0, y: 4, width: s, height: s - 4, rx: 3, fill: '#fff', stroke: C.ink, 'stroke-width': 1.5 }));
  g.appendChild(svgEl('rect', { x: 0, y: 4, width: s, height: 9, fill: C.green, rx: 3 }));
  g.appendChild(svgEl('circle', { cx: 9, cy: 7.5, r: 2, fill: C.ink }));
  g.appendChild(svgEl('circle', { cx: s - 9, cy: 7.5, r: 2, fill: C.ink }));
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    g.appendChild(svgEl('circle', { cx: 8 + c * 7, cy: 18 + r * 6, r: 1.2, fill: C.line }));
  }
  g.appendChild(svgEl('circle', { cx: 8, cy: s - 2, r: 7, fill: '#E2563B' }));
  g.appendChild(svgEl('path', { d: `M ${8 - 3} ${s - 2} l 2.5 2.5 l 5 -5`, fill: 'none', stroke: '#fff', 'stroke-width': 1.8, 'stroke-linecap': 'round' }));
  return g;
}

function buildDiagram() {
  const state = {
    encAppt: Array(RECURRING_APPTS).fill(false),
    clicks: Array(RECURRING_APPTS).fill(0),
    drag: null,      // { fromAppt: null | index }
    pointer: null,   // { x, y } in svg coords
  };

  const box = document.createElement('div');
  box.className = 'rec-cardbox';
  box.innerHTML =
    `<div class="rec-rowhead"><span class="rec-ic">🔗</span>` +
    `<span class="rec-lbl">RECURRING SERIES: CONNECT IT</span></div>` +
    `<p class="rec-lead">One pre-recurring encounter fans out to every visit in the series. ` +
    `Attach all encounter threads yourself, then use Actions on each appointment.</p>`;

  const svg = svgEl('svg', {
    viewBox: '0 0 700 400', class: 'rec-svg',
  });
  box.appendChild(svg);

  const status = document.createElement('div');
  status.className = 'rec-status';
  box.appendChild(status);

  const note = document.createElement('div');
  note.className = 'rec-note';
  note.innerHTML = `<b>Important:</b> The Service Interaction must be created <b>explicitly and manually</b> after the appointment is checked in. It does not happen on its own.`;
  box.appendChild(note);

  const toSvg = (e) => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const m = svg.getScreenCTM();
    if (!m) return null;
    return pt.matrixTransform(m.inverse());
  };
  const nearestAppt = (p) => {
    if (!p) return -1;
    let best = -1, bestD = 999;
    APPT_YS.forEach((y, i) => {
      if (state.encAppt[i]) return;
      const d = Math.hypot(p.x - APPT_ANCHOR, p.y - y);
      if (d < 48 && d < bestD) { best = i; bestD = d; }
    });
    return best;
  };
  const nearEnc = (p) => p && Math.hypot(p.x - ENC_ANCHOR, p.y - ENC_CY) < 52;
  const connectAppt = (i) => { state.encAppt[i] = true; render(); };
  const onApptAction = (i) => {
    if (!state.encAppt[i] || state.clicks[i] >= 2) return;
    state.clicks[i] += 1; render();
  };

  const onMove = (e) => {
    if (!state.drag) return;
    const p = toSvg(e);
    if (p) { state.pointer = p; render(); }
  };
  const onUp = (e) => {
    if (!state.drag) return;
    const p = toSvg(e) || state.pointer;
    if (state.drag.fromAppt != null) {
      if (nearEnc(p)) connectAppt(state.drag.fromAppt);
    } else {
      const hit = nearestAppt(p);
      if (hit >= 0) connectAppt(hit);
    }
    state.drag = null; state.pointer = null; render();
  };
  svg.addEventListener('pointermove', onMove);
  svg.addEventListener('pointerup', onUp);
  svg.addEventListener('pointerleave', onUp);

  const startDrag = (e, fromAppt) => {
    e.preventDefault();
    if (fromAppt != null) e.stopPropagation();
    state.drag = { fromAppt };
    const p = toSvg(e);
    if (p) state.pointer = p;
    try { svg.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
    render();
  };

  const statusMsg = () => {
    const allConnected = state.encAppt.every(Boolean);
    const allDone = allConnected && state.clicks.every((c) => c === 2);
    if (allDone) return 'All threads connected: one encounter, four visits, check-in and service interaction each.';
    if (!allConnected) return 'Drag a thread from the encounter or an appointment to connect them.';
    if (state.encAppt.some((ok, i) => ok && state.clicks[i] < 2)) {
      return 'Use Actions beside each connected appointment (2 times per appointment).';
    }
    return 'Keep going…';
  };

  const threadAttrs = { fill: 'none', stroke: C.green, 'stroke-width': 2.8, 'stroke-linecap': 'round' };

  function render() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const encRecurring = state.clicks.some((c) => c >= 1);

    // encounter ↔ appointment threads
    APPT_YS.forEach((y, i) => {
      if (state.encAppt[i]) {
        svg.appendChild(svgEl('path', Object.assign({ d: threadLine(ENC_ANCHOR, ENC_CY, APPT_ANCHOR, y) }, threadAttrs)));
      }
    });
    // drag preview
    if (state.drag && state.pointer) {
      const fromA = state.drag.fromAppt;
      svg.appendChild(svgEl('path', {
        d: threadLine(
          fromA != null ? APPT_ANCHOR : ENC_ANCHOR,
          fromA != null ? APPT_YS[fromA] : ENC_CY,
          state.pointer.x, state.pointer.y),
        fill: 'none', stroke: C.green, 'stroke-width': 2.5, 'stroke-dasharray': '6 5', 'stroke-linecap': 'round',
      }));
    }
    // appointment → check-in / service threads
    APPT_YS.forEach((y, i) => {
      if (state.clicks[i] >= 1) {
        svg.appendChild(svgEl('path', Object.assign({ d: threadLine(APPT_ANCHOR + APPT_W, y, OUT_X, y - 20) }, threadAttrs)));
      }
      if (state.clicks[i] >= 2) {
        svg.appendChild(svgEl('path', Object.assign({ d: threadLine(APPT_ANCHOR + APPT_W, y, OUT_X, y + 20) }, threadAttrs)));
      }
    });

    // encounter box
    const encG = svgEl('g');
    if (encRecurring) {
      encG.appendChild(svgEl('rect', {
        x: ENC_X - 8, y: ENC_Y - 8, width: ENC_W + 16, height: ENC_H + 16, rx: 14,
        fill: 'none', stroke: C.gold, 'stroke-width': 2.5, 'stroke-dasharray': '12 8', class: 'rec-enc-orbit',
      }));
    }
    encG.appendChild(svgEl('rect', {
      x: ENC_X, y: ENC_Y, width: ENC_W, height: ENC_H, rx: 10, fill: C.card,
      stroke: encRecurring ? C.teal : C.ink, 'stroke-width': encRecurring ? 2.5 : 1.5,
      class: encRecurring ? 'rec-enc-box-flash' : '',
    }));
    encG.appendChild(svgText(ENC_X + 12, ENC_Y + 28, encRecurring ? 'Recurring' : 'Pre-Recurring', {
      'font-family': DISP, 'font-size': 11, fill: encRecurring ? C.teal : C.inkSoft,
      'font-style': 'italic', 'font-weight': encRecurring ? 700 : 400,
    }));
    encG.appendChild(svgText(ENC_X + 12, ENC_Y + 50, 'encounter', { 'font-family': DISP, 'font-size': 14, 'font-weight': 800, fill: C.ink }));
    const allConnected = state.encAppt.every(Boolean);
    const encHandle = svgEl('circle', {
      cx: ENC_ANCHOR, cy: ENC_CY, r: 7, fill: C.green, stroke: '#fff', 'stroke-width': 2,
    });
    if (!allConnected) {
      encHandle.setAttribute('class', 'rt-interactive-drag');
      encHandle.style.cursor = 'grab';
      encHandle.addEventListener('pointerdown', (e) => startDrag(e, null));
    } else {
      encHandle.style.cursor = 'default';
    }
    encG.appendChild(encHandle);
    svg.appendChild(encG);

    // appointments
    APPT_YS.forEach((y, i) => {
      const g = svgEl('g');
      g.appendChild(calIcon(APPT_X + 8, y - 18, 36));
      g.appendChild(svgEl('circle', { cx: APPT_ANCHOR, cy: y, r: 6, fill: C.green }));
      if (!state.encAppt[i]) {
        const h = svgEl('circle', { cx: APPT_ANCHOR, cy: y, r: 10, fill: C.green, stroke: '#fff', 'stroke-width': 2, class: 'rt-interactive-drag' });
        h.style.cursor = 'grab';
        h.addEventListener('pointerdown', (e) => startDrag(e, i));
        g.appendChild(h);
      }
      if (state.encAppt[i] && state.clicks[i] < 2) {
        const ag = svgEl('g', { class: 'rt-interactive-tap' });
        ag.style.cursor = 'pointer';
        ag.addEventListener('click', () => onApptAction(i));
        ag.addEventListener('pointerdown', (e) => e.stopPropagation());
        ag.appendChild(svgEl('circle', { cx: ACTIONS_X, cy: y, r: 18, fill: C.goldSoft, stroke: C.gold, 'stroke-width': 2 }));
        ag.appendChild(svgText(ACTIONS_X, y - 3, 'actions', { 'text-anchor': 'middle', 'font-family': DISP, 'font-size': 8, 'font-weight': 800, fill: '#B8851A' }));
        ag.appendChild(svgText(ACTIONS_X, y + 9, '×' + (2 - state.clicks[i]), { 'text-anchor': 'middle', 'font-family': DISP, 'font-size': 10, 'font-weight': 800, fill: '#B8851A' }));
        g.appendChild(ag);
      }
      if (state.clicks[i] >= 1) {
        g.appendChild(svgEl('rect', { x: OUT_X, y: y - 37, width: 108, height: 34, rx: 8, fill: REC_CHECKIN }));
        g.appendChild(svgText(OUT_X + 54, y - 15, 'Check-in', { 'text-anchor': 'middle', 'font-family': DISP, 'font-size': 12, 'font-weight': 700, fill: '#fff' }));
        g.appendChild(svgEl('circle', { cx: OUT_X, cy: y - 20, r: 5, fill: C.green }));
      }
      if (state.clicks[i] >= 2) {
        g.appendChild(svgEl('rect', { x: OUT_X, y: y + 3, width: 148, height: 34, rx: 8, fill: REC_SERVICE, stroke: REC_SERVICE_STROKE, 'stroke-width': 1.5 }));
        g.appendChild(svgText(OUT_X + 74, y + 25, 'Service Interaction', { 'text-anchor': 'middle', 'font-family': DISP, 'font-size': 11, 'font-weight': 700, fill: C.ink }));
        g.appendChild(svgEl('circle', { cx: OUT_X, cy: y + 20, r: 5, fill: C.green }));
      }
      svg.appendChild(g);
    });

    // status
    const allDone = allConnected && state.clicks.every((c) => c === 2);
    status.textContent = statusMsg();
    status.classList.toggle('is-done', allDone);
  }

  render();
  return box;
}

function buildPage(onExit) {
  const page = document.createElement('div');
  page.className = 'rec-page';

  const bar = document.createElement('div');
  bar.className = 'rec-topbar';
  bar.innerHTML =
    `<h2 class="rec-title"><span class="rec-kicker">MHA Outpatient Group Program</span>Create recurring group session</h2>`;
  const exit = document.createElement('button');
  exit.type = 'button';
  exit.className = 'rec-exit';
  exit.innerHTML = '✕ Exit';
  exit.addEventListener('click', () => onExit && onExit());
  bar.appendChild(exit);
  page.appendChild(bar);

  page.appendChild(buildDiagram());
  return page;
}

let active = null;

export function openRecurringGame(opts = {}) {
  const view = document.getElementById('view-recurring-game');
  if (!view) { console.error('view-recurring-game missing'); return null; }

  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  view.classList.add('active');
  view.hidden = false;

  if (typeof window.__spotlightSetHidden === 'function') window.__spotlightSetHidden(true);

  const host = document.getElementById('recurringGameHost');
  if (active) { active.remove(); active = null; }
  const page = buildPage(() => { closeRecurringGame(); opts.onExit?.(); });
  host.innerHTML = '';
  host.appendChild(page);
  active = page;
  return active;
}

export function closeRecurringGame() {
  if (active) { active.remove(); active = null; }
  const host = document.getElementById('recurringGameHost');
  if (host) host.innerHTML = '';
  if (typeof window.__spotlightSetHidden === 'function') window.__spotlightSetHidden(false);
  const view = document.getElementById('view-recurring-game');
  if (view) { view.classList.remove('active'); view.hidden = true; }

  const boardTab = document.querySelector('.tab[data-view="board"]');
  const boardView = document.getElementById('view-board');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  if (boardTab) boardTab.classList.add('active');
  if (boardView) boardView.classList.add('active');
  if (typeof window.__pjRenderBoard === 'function') window.__pjRenderBoard();
}

export function isRecurringGameOpen() {
  const view = document.getElementById('view-recurring-game');
  return !!(view && view.classList.contains('active'));
}
