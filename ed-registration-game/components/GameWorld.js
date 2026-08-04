import { NODES, EDGES, WORLD, EMS_BOX, edgePath, routeEdgeIds } from '../data/edRegistrationWorkflow.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

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
  const crit = state.selectedCriticalityBranch;
  const triage = state.selectedTriageBranch;

  const edgeEls = EDGES.map(edge => {
    const d = edgePath(edge);
    const isActive = activeEdges.has(edge.id);
    const muted = !isActive && (
      (edge.branch === 'critical' && crit === 'noncritical') ||
      (edge.branch === 'noncritical' && crit === 'critical') ||
      (edge.branch === 'recheck' && triage === 'proceed') ||
      (edge.branch === 'proceed' && triage === 'recheck') ||
      (state.selectedArrivalRoute === 'walkin' && ['e_se_par', 'e_par_pre', 'e_attach_dec', 'e_pre_present'].includes(edge.id)) ||
      (state.selectedArrivalRoute === 'paramedic' && ['e_sw_present', 'e_present_qr', 'e_qr_dec', 'e_qr_attach'].includes(edge.id))
    );
    const cls = [
      'edg-edge',
      isActive ? 'is-active' : '',
      muted ? 'is-muted' : '',
      visited.has(edge.to) || edge.to === current ? 'is-travelled' : '',
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
      // Fade unused arrival column
      state.selectedArrivalRoute === 'walkin' && ['start_ems', 'paramedics', 'pre_arrival', 'attach_pre'].includes(node.id) ? 'is-faded' : '',
      state.selectedArrivalRoute === 'paramedic' && ['start_walk', 'present', 'quick_reg'].includes(node.id) ? 'is-faded' : '',
      crit === 'critical' && ['waiting', 'triage'].includes(node.id) ? 'is-faded' : '',
      crit === 'noncritical' && node.id === 'see_doctor' ? 'is-faded' : '',
    ].filter(Boolean).join(' ');
    return shapeMarkup(node, classes);
  }).join('');

  container.innerHTML = `
    <div class="edg-world" style="width:${WORLD.width}px;height:${WORLD.height}px">
      <div class="edg-ems-box" style="left:${EMS_BOX.x}px;top:${EMS_BOX.y}px;width:${EMS_BOX.w}px;height:${EMS_BOX.h}px"
           aria-hidden="true"></div>
      <svg class="edg-svg" width="${WORLD.width}" height="${WORLD.height}" viewBox="0 0 ${WORLD.width} ${WORLD.height}">
        <defs>
          <marker id="edgArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#111827"></path>
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
  const n = NODES[nodeId];
  if (!charEl || !n) return;
  charEl.style.left = `${n.x}px`;
  charEl.style.top = `${n.y}px`;
  charEl.style.setProperty('--facing', String(facing));
  charEl.dataset.node = nodeId;
}

export function prefersReducedMotion() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Animate character along path from → to.
 * Resolves when animation completes.
 */
export function animateCharacterMove(viewport, charEl, fromId, toId, { reverse = false } = {}) {
  const from = NODES[fromId];
  const to = NODES[toId];
  if (!charEl || !from || !to) return Promise.resolve();

  const reduced = prefersReducedMotion();
  const dx = to.x - from.x;
  const facing = reverse ? (dx > 0 ? -1 : 1) : (dx >= 0 ? 1 : -1);
  charEl.style.setProperty('--facing', String(facing));
  charEl.classList.add('is-walking');
  if (reverse) charEl.classList.add('is-reverse');
  else charEl.classList.remove('is-reverse');

  const duration = reduced ? 80 : 700;

  return new Promise(resolve => {
    const start = performance.now();
    const x0 = from.x;
    const y0 = from.y;
    const x1 = to.x;
    const y1 = to.y;

    // Orthogonal travel: horizontal then vertical (or vertical then horizontal)
    function pointAt(t) {
      if (Math.abs(x1 - x0) < 2) return { x: x1, y: y0 + (y1 - y0) * t };
      if (Math.abs(y1 - y0) < 2) return { x: x0 + (x1 - x0) * t, y: y1 };
      // L-shaped: go horizontal first for half, then vertical
      if (t < 0.5) {
        const u = t / 0.5;
        return { x: x0 + (x1 - x0) * u, y: y0 };
      }
      const u = (t - 0.5) / 0.5;
      return { x: x1, y: y0 + (y1 - y0) * u };
    }

    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const ease = reduced ? t : (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
      const p = pointAt(ease);
      charEl.style.left = `${p.x}px`;
      charEl.style.top = `${p.y}px`;
      if (t < 1) requestAnimationFrame(frame);
      else {
        charEl.classList.remove('is-walking', 'is-reverse');
        placeCharacter(charEl, toId, { facing });
        resolve();
      }
    }
    requestAnimationFrame(frame);
  });
}

export function keepCharacterVisible(viewport, x, y, instant) {
  // Diagram is scaled to fit — no scrolling needed.
  return;
}
