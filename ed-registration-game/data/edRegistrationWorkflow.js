/** Bird's-eye ED Registration workflow (IWK Visio layout). */

export const WORLD = { width: 1640, height: 560 };

export const NODES = {
  // ── Paramedic / EMS lane (upper) ──
  start_ems: {
    id: 'start_ems',
    x: 90, y: 90, w: 56, h: 56,
    type: 'start',
    label: 'Start',
    role: null,
  },
  paramedics: {
    id: 'paramedics',
    x: 320, y: 90, w: 150, h: 48,
    type: 'process',
    label: 'Paramedics called in',
    role: null,
  },
  pre_arrival: {
    id: 'pre_arrival',
    x: 560, y: 90, w: 138, h: 48,
    type: 'task',
    label: 'Pre-Arrival form',
    role: 'ED Nurse',
    checkpoint: true,
  },
  // ── Walk-in lane (lower, its Start sits below the EMS Start) ──
  start_walk: {
    id: 'start_walk',
    x: 90, y: 250, w: 56, h: 56,
    type: 'start',
    label: 'Start',
    role: null,
  },
  // ── Shared trunk: both routes converge here ──
  present: {
    id: 'present',
    x: 360, y: 250, w: 150, h: 48,
    type: 'process',
    label: 'Patient present in ED',
    role: null,
  },
  quick_reg: {
    id: 'quick_reg',
    x: 610, y: 250, w: 138, h: 48,
    type: 'task',
    label: 'ED Quick Reg',
    role: 'ED Nurse / Reg Clerk',
    checkpoint: true,
  },
  // Paramedic-only extra step, off Quick Reg
  attach_pre: {
    id: 'attach_pre',
    x: 700, y: 430, w: 148, h: 48,
    type: 'task',
    label: 'Attach Pre-Arrival',
    role: 'ED Nurse',
    checkpoint: true,
  },
  // ── Decision + downstream ──
  decision: {
    id: 'decision',
    x: 900, y: 250, w: 108, h: 108,
    type: 'decision',
    label: "Is patient's condition critical?",
    role: null,
    branchKey: 'criticality',
  },
  see_doctor: {
    id: 'see_doctor',
    x: 1180, y: 150, w: 128, h: 46,
    type: 'place',
    label: 'See Doctor',
    role: null,
  },
  waiting: {
    id: 'waiting',
    x: 1180, y: 360, w: 150, h: 46,
    type: 'place',
    label: 'send to waiting room',
    role: null,
  },
  triage: {
    id: 'triage',
    x: 1400, y: 360, w: 128, h: 48,
    type: 'task',
    label: 'ED Triage',
    role: 'ED Nurse',
    checkpoint: true,
    branchKey: 'triageNext',
  },
  complete: {
    id: 'complete',
    x: 1400, y: 250, w: 180, h: 48,
    type: 'task',
    label: 'ED Complete Registration',
    role: 'Registration Clerk',
    checkpoint: true,
  },
  end: {
    id: 'end',
    x: 1560, y: 250, w: 56, h: 56,
    type: 'end',
    label: 'End',
    role: null,
  },
};

/** Diamond vertices — centre (900,250). */
const DEC_BOTTOM = NODES.decision.y + NODES.decision.h / 2; // 304

/** Orthogonal edges — horizontal flow, left to right. */
export const EDGES = [
  // Walk-in: Start → Patient present in ED (straight into the shared trunk)
  { id: 'e_sw_present', from: 'start_walk', to: 'present' },
  // Paramedic: Start → Paramedics → Pre-Arrival form → Patient present in ED
  { id: 'e_se_par', from: 'start_ems', to: 'paramedics' },
  { id: 'e_par_pre', from: 'paramedics', to: 'pre_arrival' },
  { id: 'e_pre_present', from: 'pre_arrival', to: 'present', d: 'M560 90 V180 H360 V250' },
  // Shared trunk
  { id: 'e_present_qr', from: 'present', to: 'quick_reg' },
  // Walk-in continues straight to the decision
  { id: 'e_qr_dec', from: 'quick_reg', to: 'decision' },
  // Paramedic detours through Attach Pre-Arrival, then into the decision
  { id: 'e_qr_attach', from: 'quick_reg', to: 'attach_pre', d: 'M610 250 V430 H700' },
  { id: 'e_attach_dec', from: 'attach_pre', to: 'decision', d: 'M700 430 V250 H900' },
  // Decision fork (shared stub then split up / down)
  { id: 'e_dec_yes', from: 'decision', to: 'see_doctor', branch: 'critical', label: 'Yes', labelAt: [1092, 198], d: 'M900 250 H1080 V150 H1180' },
  { id: 'e_dec_no', from: 'decision', to: 'waiting', branch: 'noncritical', label: 'No', labelAt: [1092, 332], d: 'M900 250 H1080 V360 H1180' },
  { id: 'e_doc_comp', from: 'see_doctor', to: 'complete', d: 'M1180 150 H1400 V250' },
  { id: 'e_wait_tri', from: 'waiting', to: 'triage' },
  // Triage → proceed straight up into complete
  { id: 'e_tri_comp', from: 'triage', to: 'complete', branch: 'proceed', d: 'M1400 360 V250' },
  // Triage → recheck: down, back left, up into the BOTTOM vertex of the diamond
  { id: 'e_tri_dec', from: 'triage', to: 'decision', branch: 'recheck', d: `M1400 360 V520 H900 V${DEC_BOTTOM}` },
  { id: 'e_comp_end', from: 'complete', to: 'end' },
];

export const EMS_BOX = { x: 40, y: 45, w: 650, h: 95 };

/**
 * Linear next-node resolution for the active route / branch.
 * Both routes converge at "present"; only Quick Reg's next step differs.
 * Returns null when a decision is still required.
 */
export function resolveNextNodeId(state) {
  const { currentNodeId, selectedArrivalRoute, selectedCriticalityBranch, selectedTriageBranch } = state;
  const id = currentNodeId;

  // Route-specific lead-in to the shared trunk
  if (selectedArrivalRoute === 'walkin') {
    if (id === 'start_walk') return 'present';
  }
  if (selectedArrivalRoute === 'paramedic') {
    if (id === 'start_ems') return 'paramedics';
    if (id === 'paramedics') return 'pre_arrival';
    if (id === 'pre_arrival') return 'present';
  }

  // Shared trunk
  if (id === 'present') return 'quick_reg';
  if (id === 'quick_reg') return selectedArrivalRoute === 'paramedic' ? 'attach_pre' : 'decision';
  if (id === 'attach_pre') return 'decision';

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
    ['e_se_par', 'e_par_pre', 'e_pre_present', 'e_present_qr', 'e_qr_attach', 'e_attach_dec'].forEach(id => active.add(id));
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
