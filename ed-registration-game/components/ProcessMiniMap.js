import { NODES } from '../data/edRegistrationWorkflow.js';

const MINI_ORDER_WALK = ['start_walk', 'present', 'quick_reg', 'decision', 'see_doctor', 'waiting', 'triage', 'complete', 'end'];
const MINI_ORDER_EMS = ['start_ems', 'paramedics', 'pre_arrival', 'attach_pre', 'decision', 'see_doctor', 'waiting', 'triage', 'complete', 'end'];

export function renderProcessMiniMap(el, state) {
  const order = state.selectedArrivalRoute === 'paramedic' ? MINI_ORDER_EMS : MINI_ORDER_WALK;
  const visited = new Set(state.visitedHistory || []);
  const crit = state.selectedCriticalityBranch;

  const chips = order.map(id => {
    const n = NODES[id];
    if (!n) return '';
    // Hide opposite branch lightly
    let faded = false;
    if (crit === 'critical' && (id === 'waiting' || id === 'triage')) faded = true;
    if (crit === 'noncritical' && id === 'see_doctor') faded = true;
    const cls = [
      'edg-mini-chip',
      visited.has(id) ? 'is-visited' : '',
      id === state.currentNodeId ? 'is-current' : '',
      faded ? 'is-faded' : '',
      n.type === 'decision' ? 'is-decision' : '',
    ].filter(Boolean).join(' ');
    return `<span class="${cls}" title="${escapeHtml(n.label)}">${escapeHtml(shortLabel(n))}</span>`;
  }).join('<span class="edg-mini-sep">→</span>');

  el.innerHTML = `
    <div class="edg-minimap" aria-label="Bird's-eye workflow progress">
      <div class="edg-minimap-title">Bird’s-eye progress</div>
      <div class="edg-minimap-row">${chips}</div>
    </div>
  `;
}

function shortLabel(n) {
  if (n.type === 'start') return 'Start';
  if (n.type === 'end') return 'End';
  if (n.id === 'decision') return 'Critical?';
  if (n.id === 'quick_reg') return 'Quick Reg';
  if (n.id === 'pre_arrival') return 'Pre-Arrival';
  if (n.id === 'attach_pre') return 'Attach';
  if (n.id === 'see_doctor') return 'See Doctor';
  if (n.id === 'waiting') return 'Waiting';
  if (n.id === 'complete') return 'Complete Reg';
  return n.label.split(' ').slice(0, 2).join(' ');
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
