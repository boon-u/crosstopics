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

export function renderGameWorld(container, state) {
  const activeEdges = routeEdgeIds(state);
  const visited = new Set(state.visitedHistory || []);
  const current = state.currentNodeId;
  const preview = !current; // no route chosen yet → whole diagram, pick a Start

  const edgeEls = EDGES.map(edge => {
    // Draw the arrow so its head lands on the border of the destination box.
    const pts = clipStartFromBox(clipEndToBox(routePoints(edge), NODES[edge.to], 4), NODES[edge.from], 2);
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
    return `<path class="${cls}" data-edge="${edge.id}" d="${d}" marker-end="url(#edgArrow)" />${label}`;
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

  container.innerHTML = `
    <div class="edg-world" style="width:${WORLD.width}px;height:${WORLD.height}px">
      <div class="edg-ems-box" style="left:${EMS_BOX.x}px;top:${EMS_BOX.y}px;width:${EMS_BOX.w}px;height:${EMS_BOX.h}px"
           aria-hidden="true"></div>
      <svg class="edg-svg" width="${WORLD.width}" height="${WORLD.height}" viewBox="0 0 ${WORLD.width} ${WORLD.height}">
        <defs>
          <marker id="edgArrow" markerWidth="10" markerHeight="10" refX="7" refY="3.5" orient="auto">
            <path d="M0,0 L8,3.5 L0,7 Z" fill="#94a3b8"></path>
          </marker>
          <marker id="edgArrowActive" markerWidth="11" markerHeight="11" refX="7.5" refY="4" orient="auto">
            <path d="M0,0 L9,4 L0,8 Z" fill="#0d9488"></path>
          </marker>
          <marker id="edgArrowDone" markerWidth="11" markerHeight="11" refX="7.5" refY="4" orient="auto">
            <path d="M0,0 L9,4 L0,8 Z" fill="#2dd4bf"></path>
          </marker>
        </defs>
        ${edgeEls}
      </svg>
      <div class="edg-nodes">${nodes}</div>
      <div class="edg-character" id="edgCharacter" aria-hidden="true">
        <div class="edg-char-sprite">🩹</div>
        <div class="edg-char-shadow"></div>
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

export function placeCharacter(charEl, nodeId, { facing = 1 } = {}) {
  if (!charEl) return;
  const n = NODES[nodeId];
  if (!n) { charEl.style.display = 'none'; return; }
  charEl.style.display = '';
  charEl.style.left = `${n.x}px`;
  charEl.style.top = `${n.y}px`;
  charEl.style.setProperty('--facing', String(facing));
  charEl.dataset.node = nodeId;
}

export function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Animate the character along the actual arrow path from → to.
 * Resolves when the animation completes.
 */
export function animateCharacterMove(viewport, charEl, fromId, toId, { reverse = false } = {}) {
  const from = NODES[fromId];
  const to = NODES[toId];
  if (!charEl || !from || !to) return Promise.resolve();

  const reduced = prefersReducedMotion();
  const pts = movementPointsFor(fromId, toId);
  const d = pointsToPath(pts);

  // Measure the path with a throwaway SVG in world coordinates.
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
  svg.style.position = 'absolute'; svg.style.left = '-9999px'; svg.style.overflow = 'hidden';
  const path = document.createElementNS(SVGNS, 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);
  document.body.appendChild(svg);
  const len = path.getTotalLength() || 1;

  charEl.style.display = '';
  charEl.classList.add('is-walking');
  charEl.classList.remove('is-reverse');

  const duration = reduced ? 80 : Math.min(1500, Math.max(520, len * 1.7));

  return new Promise(resolve => {
    const start = performance.now();
    let prevX = from.x;

    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const ease = reduced ? t : (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
      const p = path.getPointAtLength(len * ease);
      const dx = p.x - prevX;
      if (Math.abs(dx) > 0.4) charEl.style.setProperty('--facing', String(dx > 0 ? 1 : -1));
      prevX = p.x;
      charEl.style.left = `${p.x}px`;
      charEl.style.top = `${p.y}px`;
      if (t < 1) requestAnimationFrame(frame);
      else {
        charEl.classList.remove('is-walking', 'is-reverse');
        svg.remove();
        const facing = charEl.style.getPropertyValue('--facing') || '1';
        placeCharacter(charEl, toId, { facing });
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

export function keepCharacterVisible() {
  // Diagram is scaled to fit — no scrolling needed.
}
