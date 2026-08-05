import { NODES, EDGES, WORLD, EMS_BOX, edgePath, routeEdgeIds } from '../data/edRegistrationWorkflow.js';

const SVGNS = 'http://www.w3.org/2000/svg';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/* ---------- path geometry helpers ---------- */

/** Parse an orthogonal path string (M/L/H/V, absolute) into a list of points. */
function parsePathToPoints(d) {
  const pts = [];
  let cx = 0, cy = 0;
  const re = /([MLHV])\s*(-?\d*\.?\d+)(?:[ ,]+(-?\d*\.?\d+))?/gi;
  let m;
  while ((m = re.exec(d))) {
    const cmd = m[1].toUpperCase();
    if (cmd === 'M' || cmd === 'L') { cx = parseFloat(m[2]); cy = parseFloat(m[3]); }
    else if (cmd === 'H') { cx = parseFloat(m[2]); }
    else if (cmd === 'V') { cy = parseFloat(m[2]); }
    pts.push({ x: cx, y: cy });
  }
  return pts;
}

/** Absolute waypoints for an edge (source-centre → target). */
function routePoints(edge) {
  if (edge.d) return parsePathToPoints(edge.d);
  const a = NODES[edge.from], b = NODES[edge.to];
  return [{ x: a.x, y: a.y }, { x: b.x, y: b.y }];
}

function pointsToPath(pts) {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
}

/** Pull the final point back to the target node's border (so the arrowhead lands on the edge of the box). */
function clipEndToBox(pts, node, gap = 4) {
  if (pts.length < 2 || !node) return pts;
  const end = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const dx = end.x - prev.x, dy = end.y - prev.y;
  const p = { x: end.x, y: end.y };
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx > 0) p.x = node.x - node.w / 2 - gap;       // entering from the left
    else if (dx < 0) p.x = node.x + node.w / 2 + gap;  // entering from the right
    p.y = prev.y;
  } else {
    if (dy > 0) p.y = node.y - node.h / 2 - gap;       // entering from the top
    else if (dy < 0) p.y = node.y + node.h / 2 + gap;  // entering from the bottom
    p.x = prev.x;
  }
  return [...pts.slice(0, -1), p];
}

/** Push the first point out to the source node's border. */
function clipStartFromBox(pts, node, gap = 2) {
  if (pts.length < 2 || !node) return pts;
  const start = pts[0];
  const next = pts[1];
  const dx = next.x - start.x, dy = next.y - start.y;
  const p = { x: start.x, y: start.y };
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx > 0) p.x = node.x + node.w / 2 + gap;
    else if (dx < 0) p.x = node.x - node.w / 2 - gap;
    p.y = next.y;
  } else {
    if (dy > 0) p.y = node.y + node.h / 2 + gap;
    else if (dy < 0) p.y = node.y - node.h / 2 - gap;
    p.x = next.x;
  }
  return [p, ...pts.slice(1)];
}

/** Centre-to-centre waypoints for the character to walk, oriented from → to. */
function movementPointsFor(fromId, toId) {
  let pts = null;
  let edge = EDGES.find(e => e.from === fromId && e.to === toId);
  if (edge) pts = routePoints(edge);
  else {
    edge = EDGES.find(e => e.from === toId && e.to === fromId);
    if (edge) pts = routePoints(edge).slice().reverse();
  }
  const a = NODES[fromId], b = NODES[toId];
  if (!pts) pts = [{ x: a.x, y: a.y }, { x: b.x, y: b.y }];
  // Anchor the ends exactly on the node centres.
  pts[0] = { x: a.x, y: a.y };
  pts[pts.length - 1] = { x: b.x, y: b.y };
  return pts;
}

/* ---------- node shapes ---------- */

function shapeMarkup(node, classes) {
  const label = escapeHtml(node.label).replace(/\n/g, '<br>');
  const role = node.role
    ? `<div class="edg-role-tag">${escapeHtml(node.role)}</div>`
    : '';

  if (node.type === 'start' || node.type === 'end') {
    return `
      <div class="edg-node edg-oval ${classes}" data-node="${node.id}"
           style="left:${node.x - node.w / 2}px;top:${node.y - node.h / 2}px;width:${node.w}px;height:${node.h}px">
        <span>${label}</span>
      </div>`;
  }
  if (node.type === 'decision') {
    return `
      <div class="edg-node edg-diamond ${classes}" data-node="${node.id}"
           style="left:${node.x - node.w / 2}px;top:${node.y - node.h / 2}px;width:${node.w}px;height:${node.h}px">
        <div class="edg-diamond-inner"><span>${label}</span></div>
      </div>`;
  }
  if (node.type === 'task') {
    return `
      <div class="edg-node-wrap" style="left:${node.x - node.w / 2}px;top:${node.y - node.h / 2 - (node.role ? 18 : 0)}px">
        ${role}
        <div class="edg-node edg-para ${classes}" data-node="${node.id}"
             style="width:${node.w}px;height:${node.h}px">
          <span>${label}</span>
        </div>
      </div>`;
  }
  if (node.type === 'place') {
    return `
      <div class="edg-node edg-place ${classes}" data-node="${node.id}"
           style="left:${node.x - node.w / 2}px;top:${node.y - node.h / 2}px;width:${node.w}px;height:${node.h}px">
        <span>${label}</span>
      </div>`;
  }
  // process
  return `
    <div class="edg-node edg-process ${classes}" data-node="${node.id}"
         style="left:${node.x - node.w / 2}px;top:${node.y - node.h / 2}px;width:${node.w}px;height:${node.h}px">
      <span>${label}</span>
    </div>`;
}

/** Resting / travel anchor just above a node's box (above role tags when present). */
function hoverAnchor(node) {
  const topPad = node.role ? 22 : 0;
  return { x: node.x, y: node.y - node.h / 2 - topPad };
}

function iconsHtml(icons) {
  return (icons || [])
    .map(e => `<span class="edg-hover-emj">${escapeHtml(e)}</span>`)
    .join('');
}

function setTravelerIcons(travelerEl, icons) {
  const row = travelerEl?.querySelector('.edg-hover-row');
  if (row) row.innerHTML = iconsHtml(icons);
}

export function renderGameWorld(container, state) {
  const activeEdges = routeEdgeIds(state);
  const visited = new Set(state.visitedHistory || []);
  const current = state.currentNodeId;
  const preview = !current; // no route chosen yet → whole diagram, pick a Start

  const edgeEls = EDGES.map(edge => {
    // Draw the arrow so its head lands on the border of the destination box.
    const pts = clipStartFromBox(clipEndToBox(routePoints(edge), NODES[edge.to], 6), NODES[edge.from], 2);
    const d = pointsToPath(pts);
    const isActive = activeEdges.has(edge.id);
    const travelled = visited.has(edge.to) || edge.to === current;
    const cls = [
      'edg-edge',
      isActive ? 'is-active' : '',
      (!isActive && travelled) ? 'is-travelled' : '',
    ].filter(Boolean).join(' ');
    const label = edge.label
      ? `<text class="edg-edge-label" x="${edge.labelAt[0]}" y="${edge.labelAt[1]}">${escapeHtml(edge.label)}</text>`
      : '';
    return `<path class="${cls}" data-edge="${edge.id}" d="${d}" />${label}`;
  }).join('');

  const nodes = Object.values(NODES).map(node => {
    const classes = [
      visited.has(node.id) ? 'is-visited' : '',
      node.id === current ? 'is-current' : '',
      (state.completedCheckpointIds || []).includes(node.id) ? 'is-done' : '',
      preview && (node.id === 'start_walk' || node.id === 'start_ems') ? 'is-startable' : '',
    ].filter(Boolean).join(' ');
    return shapeMarkup(node, classes);
  }).join('');

  // Single traveler: only the current state's icons are ever shown (no band-aid).
  container.innerHTML = `
    <div class="edg-world" style="width:${WORLD.width}px;height:${WORLD.height}px">
      <div class="edg-ems-box" style="left:${EMS_BOX.x}px;top:${EMS_BOX.y}px;width:${EMS_BOX.w}px;height:${EMS_BOX.h}px"
           aria-hidden="true"></div>
      <svg class="edg-svg" width="${WORLD.width}" height="${WORLD.height}" viewBox="0 0 ${WORLD.width} ${WORLD.height}">
        <defs>
          <marker id="edgArrow" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" refX="12" refY="5" orient="auto">
            <path d="M0,0 L12,5 L0,10 Z" fill="#94a3b8"></path>
          </marker>
          <marker id="edgArrowActive" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" refX="12" refY="5" orient="auto">
            <path d="M0,0 L12,5 L0,10 Z" fill="#0d9488"></path>
          </marker>
          <marker id="edgArrowDone" markerUnits="userSpaceOnUse" markerWidth="14" markerHeight="14" refX="12" refY="5" orient="auto">
            <path d="M0,0 L12,5 L0,10 Z" fill="#2dd4bf"></path>
          </marker>
        </defs>
        ${edgeEls}
      </svg>
      <div class="edg-nodes">${nodes}</div>
      <div class="edg-traveler" id="edgCharacter" aria-hidden="true" hidden>
        <div class="edg-hover-row"></div>
        <span class="edg-hover-arrow">▼</span>
      </div>
    </div>
  `;
}

/** Scale the flowchart so the full diagram fits in the viewport with no scrolling. */
export function fitWorldToViewport(viewport, host) {
  if (!viewport || !host) return 1;
  const world = host.querySelector('.edg-world');
  if (!world) return 1;
  const pad = 8;
  const vw = Math.max(120, viewport.clientWidth - pad);
  const vh = Math.max(120, viewport.clientHeight - pad);
  const scale = Math.min(vw / WORLD.width, vh / WORLD.height);
  host.style.width = `${WORLD.width * scale}px`;
  host.style.height = `${WORLD.height * scale}px`;
  world.style.transform = `scale(${scale})`;
  world.style.transformOrigin = 'top left';
  host.dataset.scale = String(scale);
  return scale;
}

/**
 * Park the traveler above a node with that node's icons.
 * @param {{ pop?: boolean }} opts — when true, play the arrival pop animation
 */
export function placeCharacter(charEl, nodeId, { pop = false } = {}) {
  if (!charEl) return;
  const n = NODES[nodeId];
  if (!n) {
    charEl.hidden = true;
    charEl.style.display = 'none';
    return;
  }
  const a = hoverAnchor(n);
  setTravelerIcons(charEl, n.hover);
  charEl.hidden = false;
  charEl.style.display = '';
  charEl.style.left = `${a.x}px`;
  charEl.style.top = `${a.y}px`;
  charEl.dataset.node = nodeId;
  charEl.classList.remove('is-traveling');
  if (pop) {
    charEl.classList.remove('is-pop');
    // Force reflow so the pop animation restarts even on consecutive arrivals.
    void charEl.offsetWidth;
    charEl.classList.add('is-pop');
    const clear = () => charEl.classList.remove('is-pop');
    charEl.addEventListener('animationend', clear, { once: true });
  }
}

export function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Move the current state's icons along the arrow path; on arrival, swap to the
 * destination state's icons and pop them in. Only one state's icons are visible.
 */
export function animateCharacterMove(viewport, charEl, fromId, toId, { reverse = false } = {}) {
  const from = NODES[fromId];
  const to = NODES[toId];
  if (!charEl || !from || !to) return Promise.resolve();

  const reduced = prefersReducedMotion();
  // Travel along the centre-line of the edge, but float slightly above the stroke.
  const pts = movementPointsFor(fromId, toId);
  const floatY = 28;
  const travelPts = pts.map(p => ({ x: p.x, y: p.y - floatY }));
  // Start / end at the resting hover anchors so the hand-off is seamless.
  const startA = hoverAnchor(from);
  const endA = hoverAnchor(to);
  travelPts[0] = { x: startA.x, y: startA.y };
  travelPts[travelPts.length - 1] = { x: endA.x, y: endA.y };
  const d = pointsToPath(travelPts);

  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.style.position = 'absolute'; svg.style.left = '-9999px'; svg.style.overflow = 'hidden';
  const path = document.createElementNS(SVGNS, 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);
  document.body.appendChild(svg);
  const len = path.getTotalLength() || 1;

  // Carry the departing state's icons while traveling.
  setTravelerIcons(charEl, from.hover);
  charEl.hidden = false;
  charEl.style.display = '';
  charEl.classList.add('is-traveling');
  charEl.classList.remove('is-pop');

  const duration = reduced ? 80 : Math.min(1500, Math.max(520, len * 1.7));

  return new Promise(resolve => {
    const start = performance.now();

    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const ease = reduced ? t : (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
      const p = path.getPointAtLength(len * ease);
      charEl.style.left = `${p.x}px`;
      charEl.style.top = `${p.y}px`;
      if (t < 1) requestAnimationFrame(frame);
      else {
        charEl.classList.remove('is-traveling');
        svg.remove();
        // Park on destination; page re-paint will pop the next state's icons.
        placeCharacter(charEl, toId, { pop: false });
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

export function keepCharacterVisible() {
  // Diagram is scaled to fit — no scrolling needed.
}
