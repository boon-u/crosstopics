import { BRANCH_LABELS } from '../data/edRegistrationWorkflow.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function renderCompletionSummary(el, state, { onReplay, onOtherRoute, onExit }) {
  const route = state.selectedArrivalRoute === 'paramedic' ? 'Paramedic Pre-Arrival' : 'Walk-In';
  const crit = BRANCH_LABELS[state.selectedCriticalityBranch] || '—';
  const checkpoints = (state.completedCheckpointIds || []).length;

  el.innerHTML = `
    <div class="edg-complete panel">
      <div class="edg-complete-hero">🏁</div>
      <h2>Scenario complete</h2>
      <p class="help">You walked the ED Registration workflow end to end.</p>
      <ul class="edg-complete-stats">
        <li><strong>Arrival route:</strong> ${escapeHtml(route)}</li>
        <li><strong>Criticality:</strong> ${escapeHtml(crit)}</li>
        <li><strong>Checkpoints answered:</strong> ${checkpoints}</li>
        <li><strong>Score:</strong> ${state.score}</li>
        <li><strong>Steps visited:</strong> ${(state.visitedHistory || []).length}</li>
      </ul>
      <div class="btn-row">
        <button type="button" class="btn" id="edgReplayBtn">Replay same route</button>
        <button type="button" class="btn secondary" id="edgOtherRouteBtn">Choose another route</button>
        <button type="button" class="btn secondary" id="edgExitCompleteBtn">Exit Scenario</button>
      </div>
    </div>
  `;

  el.querySelector('#edgReplayBtn')?.addEventListener('click', onReplay);
  el.querySelector('#edgOtherRouteBtn')?.addEventListener('click', onOtherRoute);
  el.querySelector('#edgExitCompleteBtn')?.addEventListener('click', onExit);
}
