/** Bird's-eye ED Registration workflow (IWK Visio layout). */

export const WORLD = { width: 1440, height: 560 };

export const NODES = {
  // ── Walk-in lane (top) ──
  start_walk: {
    id: 'start_walk',
    x: 70, y: 150, w: 56, h: 56,
    type: 'start',
    label: 'Start',
    role: null,
  },
  present: {
    id: 'present',
    x: 250, y: 150, w: 150, h: 48,
    type: 'process',
    label: 'Patient present in ED',
    role: null,
  },
  quick_reg: {
    id: 'quick_reg',
    x: 470, y: 150, w: 138, h: 48,
    type: 'task',
    label: 'ED Quick Reg',
    role: 'ED Nurse / Reg Clerk',
    checkpoint: true,
  },
  // ── Paramedic lane (bottom) ──
  start_ems: {
    id: 'start_ems',
    x: 70, y: 360, w: 56, h: 56,
    type: 'start',
    label: 'Start',
    role: null,
  },
  paramedics: {
    id: 'paramedics',
    x: 250, y: 360, w: 150, h: 48,
    type: 'process',
    label: 'Paramedics called in',
    role: null,
  },
  pre_arrival: {
    id: 'pre_arrival',
    x: 470, y: 360, w: 138, h: 48,
    type: 'task',
    label: 'Pre-Arrival form',
    role: 'ED Nurse',
    checkpoint: true,
  },
  attach_pre: {
    id: 'attach_pre',
    x: 670, y: 360, w: 148, h: 48,
    type: 'task',
    label: 'Attach Pre-Arrival',
    role: 'ED Nurse',
    checkpoint: true,
  },
  // ── Merge + decision ──
  decision: {
    id: 'decision',
    x: 870, y: 255, w: 108, h: 108,
    type: 'decision',
    label: "Is patient's condition critical?",
    role: null,
    branchKey: 'criticality',
  },
  see_doctor: {
    id: 'see_doctor',
    x: 1080, y: 150, w: 128, h: 46,
    type: 'place',
    label: 'See Doctor',
    role: null,
  },
  waiting: {
    id: 'waiting',
    x: 1080, y: 370, w: 150, h: 46,
    type: 'place',
    label: 'send to waiting room',
    role: null,
  },
  triage: {
    id: 'triage',
    x: 1260, y: 370, w: 128, h: 48,
    type: 'task',
    label: 'ED Triage',
    role: 'ED Nurse',
    checkpoint: true,
    branchKey: 'triageNext',
  },
  complete: {
    id: 'complete',
    x: 1260, y: 255, w: 180, h: 48,
    type: 'task',
    label: 'ED Complete Registration',
    role: 'Registration Clerk',
    checkpoint: true,
  },
  end: {
    id: 'end',
    x: 1400, y: 255, w: 56, h: 56,
    type: 'end',
    label: 'End',
    role: null,
  },
};

/** Diamond vertices (left→right horizontal layout). */
const DEC_TOP = NODES.decision.y - NODES.decision.h / 2;    // 201
const DEC_BOTTOM = NODES.decision.y + NODES.decision.h / 2; // 309
const DEC_LEFT = NODES.decision.x - NODES.decision.w / 2;   // 816

/** Orthogonal edges — horizontal flow, left to right. */
export const EDGES = [
  // Walk-in lane
  { id: 'e_sw_present', from: 'start_walk', to: 'present' },
  { id: 'e_present_qr', from: 'present', to: 'quick_reg' },
  { id: 'e_qr_dec', from: 'quick_reg', to: 'decision', d: `M470 150 H870 V${DEC_TOP}` },
  { id: 'e_qr_attach', from: 'quick_reg', to: 'attach_pre', d: 'M470 150 H570 V360 H670', cross: true },
  // Paramedic lane
  { id: 'e_se_par', from: 'start_ems', to: 'paramedics' },
  { id: 'e_par_pre', from: 'paramedics', to: 'pre_arrival' },
  { id: 'e_pre_present', from: 'pre_arrival', to: 'present', d: 'M470 360 H370 V150 H250', cross: true },
  // Attach Pre-Arrival → up into the LEFT vertex of the diamond
  { id: 'e_attach_dec', from: 'attach_pre', to: 'decision', d: `M670 360 V255 H${DEC_LEFT}` },
  // Decision fork (shared stub then split up / down)
  { id: 'e_dec_yes', from: 'decision', to: 'see_doctor', branch: 'critical', label: 'Yes', labelAt: [1006, 200], d: 'M870 255 H1000 V150 H1080' },
  { id: 'e_dec_no', from: 'decision', to: 'waiting', branch: 'noncritical', label: 'No', labelAt: [1006, 335], d: 'M870 255 H1000 V370 H1080' },
  { id: 'e_doc_comp', from: 'see_doctor', to: 'complete', d: 'M1080 150 H1260 V255' },
  { id: 'e_wait_tri', from: 'waiting', to: 'triage' },
  // Triage → proceed straight up into complete
  { id: 'e_tri_comp', from: 'triage', to: 'complete', branch: 'proceed', d: 'M1260 370 V255' },
  // Triage → recheck: down, back left, up into the BOTTOM vertex of the diamond
  { id: 'e_tri_dec', from: 'triage', to: 'decision', branch: 'recheck', d: `M1260 370 V500 H870 V${DEC_BOTTOM}` },
  { id: 'e_comp_end', from: 'complete', to: 'end' },
];

export const EMS_BOX = { x: 40, y: 305, w: 770, h: 108 };

/**
 * Linear next-node resolution for the active route / branch.
 * Returns null when a decision is still required.
 */
export function resolveNextNodeId(state) {
  const { currentNodeId, selectedArrivalRoute, selectedCriticalityBranch, selectedTriageBranch } = state;
  const id = currentNodeId;

  if (selectedArrivalRoute === 'walkin') {
    if (id === 'start_walk') return 'present';
    if (id === 'present') return 'quick_reg';
    if (id === 'quick_reg') return 'decision';
  }

  if (selectedArrivalRoute === 'paramedic') {
    if (id === 'start_ems') return 'paramedics';
    if (id === 'paramedics') return 'pre_arrival';
    if (id === 'pre_arrival') return 'attach_pre';
    if (id === 'attach_pre') return 'decision';
  }

  if (id === 'decision') {
    if (!selectedCriticalityBranch) return null;
    return selectedCriticalityBranch === 'critical' ? 'see_doctor' : 'waiting';
  }

  if (id === 'see_doctor') return 'complete';
  if (id === 'waiting') return 'triage';

  if (id === 'triage') {
    if (!selectedTriageBranch) return null;
    return selectedTriageBranch === 'recheck' ? 'decision' : 'complete';
  }

  if (id === 'complete') return 'end';
  return null;
}

export function startNodeForRoute(route) {
  return route === 'paramedic' ? 'start_ems' : 'start_walk';
}

export function routeEdgeIds(state) {
  const route = state.selectedArrivalRoute;
  const crit = state.selectedCriticalityBranch;
  const triage = state.selectedTriageBranch;
  const active = new Set();

  if (route === 'walkin') {
    ['e_sw_present', 'e_present_qr', 'e_qr_dec'].forEach(id => active.add(id));
  } else if (route === 'paramedic') {
    ['e_se_par', 'e_par_pre', 'e_attach_dec'].forEach(id => active.add(id));
  }

  if (crit === 'critical') {
    active.add('e_dec_yes');
    active.add('e_doc_comp');
  } else if (crit === 'noncritical') {
    active.add('e_dec_no');
    active.add('e_wait_tri');
    if (triage === 'recheck') active.add('e_tri_dec');
    if (triage === 'proceed') active.add('e_tri_comp');
  }

  if (state.visitedHistory.includes('complete') || state.currentNodeId === 'complete' || state.currentNodeId === 'end') {
    active.add('e_comp_end');
  }

  return active;
}

export function nodeCenter(nodeId) {
  const n = NODES[nodeId];
  if (!n) return { x: 0, y: 0 };
  return { x: n.x, y: n.y };
}

export function straightPath(fromId, toId) {
  const a = nodeCenter(fromId);
  const b = nodeCenter(toId);
  return `M${a.x} ${a.y} L${b.x} ${b.y}`;
}

export function edgePath(edge) {
  if (edge.d) return edge.d;
  return straightPath(edge.from, edge.to);
}

/** Sample points along an SVG path string for character travel. */
export function samplePath(d, steps = 24) {
  if (typeof document === 'undefined') return [];
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  svg.appendChild(path);
  document.body.appendChild(svg);
  const len = path.getTotalLength();
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const p = path.getPointAtLength((len * i) / steps);
    pts.push({ x: p.x, y: p.y });
  }
  svg.remove();
  return pts;
}

export function pathBetweenNodes(fromId, toId) {
  const edge = EDGES.find(e => e.from === fromId && e.to === toId)
    || EDGES.find(e => e.from === toId && e.to === fromId);
  if (edge) {
    const forward = edge.from === fromId;
    const d = edgePath(edge);
    if (forward) return d;
    return straightPath(fromId, toId);
  }
  return straightPath(fromId, toId);
}

export const BRANCH_LABELS = {
  critical: 'Yes — Critical',
  noncritical: 'No — Non-Critical',
  recheck: 'Return to criticality check',
  proceed: 'Proceed to complete registration',
};
