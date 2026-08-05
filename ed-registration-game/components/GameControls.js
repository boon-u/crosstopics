export function renderGameControls(el, state, meta, { onBack, onNext }) {
  const nodeLabel = state.currentNodeId
    ? (window.__ED_NODE_LABELS && window.__ED_NODE_LABELS[state.currentNodeId]) || state.currentNodeId
    : '—';
  const step = Math.max(1, state.currentHistoryIndex + 1);
  const total = Math.max(state.visitedHistory.length, step);
  const role = meta.role || '—';
  const doneCount = (state.completedCheckpointIds || []).length;
  const nextCls = meta.next.disabled ? 'btn secondary edg-nav-btn' : 'btn edg-nav-btn';
  const backCls = meta.back.disabled ? 'btn secondary edg-nav-btn' : 'btn secondary edg-nav-btn';

  const nextLabel = meta.next.label;
  const nextSuffix = (nextLabel === 'Next' || nextLabel === 'Start') ? (nextLabel === 'Next' ? ' →' : '') : '';
  // Start stays "Start"; Next gets arrow; other labels unchanged

  el.innerHTML = `
    <div class="edg-controls">
      <div class="edg-controls-main">
        <button type="button" class="${backCls}" id="edgBackBtn" ${meta.back.disabled ? 'disabled' : ''}>← Back</button>
        <div class="edg-step-center">
          <div class="edg-step-label">Current Step: <strong>${escapeHtml(nodeLabel)}</strong></div>
          <div class="edg-step-meta">Step ${step} of ${total} · Role: ${escapeHtml(role)}${doneCount ? ` · Checkpoints ${doneCount} ✓` : ''}</div>
        </div>
        <button type="button" class="${nextCls}" id="edgNextBtn" ${meta.next.disabled ? 'disabled' : ''}>${escapeHtml(nextLabel)}${nextSuffix}</button>
      </div>
      <div class="edg-controls-hint">Use the ← and → arrow keys or the Back and Next buttons.</div>
    </div>
  `;

  el.querySelector('#edgBackBtn')?.addEventListener('click', onBack);
  el.querySelector('#edgNextBtn')?.addEventListener('click', onNext);
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}
