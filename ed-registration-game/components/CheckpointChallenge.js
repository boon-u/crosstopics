import { questionForNode } from '../data/edRegistrationQuestions.js';
import { NODES, BRANCH_LABELS } from '../data/edRegistrationWorkflow.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function renderCheckpointChallenge(root, state, handlers) {
  let backdrop = root.querySelector('#edgChallenge');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'edgChallenge';
    backdrop.className = 'modal-back edg-challenge-back';
    backdrop.innerHTML = `<div class="modal edg-challenge-modal" role="dialog" aria-modal="true"><div id="edgChallengeBody"></div></div>`;
    root.appendChild(backdrop);
  }

  const open = !!state.challengeOpen;
  backdrop.classList.toggle('open', open);
  backdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
  if (!open) return;

  const body = backdrop.querySelector('#edgChallengeBody');
  const mode = state.challengeMode;
  const nodeId = state.challengeNodeId || state.currentNodeId;

  if (mode === 'question') {
    const q = questionForNode(nodeId);
    if (!q) return;
    body.innerHTML = `
      <h3>${escapeHtml(q.title)}</h3>
      <p>${escapeHtml(q.prompt)}</p>
      <div class="edg-options" role="radiogroup" aria-label="Answer choices">
        ${q.options.map(o => `
          <button type="button" class="edg-option" data-opt="${o.id}">
            <span class="edg-opt-key">${o.id.toUpperCase()}</span>
            <span>${escapeHtml(o.label)}</span>
          </button>
        `).join('')}
      </div>
      ${state.challengeFeedback && !state.challengeFeedback.correct
        ? `<p class="edg-feedback-bad">${escapeHtml(state.challengeFeedback.message)}</p>`
        : ''}
    `;
    body.querySelectorAll('[data-opt]').forEach(btn => {
      btn.addEventListener('click', () => handlers.onAnswer(btn.dataset.opt));
    });
    return;
  }

  if (mode === 'changeConfirm') {
    body.innerHTML = `
      <h3>Change decision?</h3>
      <p>Changing this route removes downstream steps from the other branch. Progress before this decision is kept. Answers and points from discarded steps are cleared.</p>
      <div class="btn-row">
        <button type="button" class="btn secondary" id="edgChangeNo">Keep current</button>
        <button type="button" class="btn danger" id="edgChangeYes">Change decision</button>
      </div>
    `;
    body.querySelector('#edgChangeNo')?.addEventListener('click', () => handlers.onConfirmChange(false));
    body.querySelector('#edgChangeYes')?.addEventListener('click', () => handlers.onConfirmChange(true));
    return;
  }

  if (mode === 'branch') {
    const node = NODES[nodeId];
    let choices = [];
    let title = 'Choose a route';
    let blurb = '';

    if (node?.branchKey === 'criticality') {
      title = "Is the patient's condition critical?";
      blurb = 'Yes sends the patient to See Doctor. No sends them to the waiting room for triage.';
      choices = [
        { id: 'critical', emj: '🚨', label: BRANCH_LABELS.critical },
        { id: 'noncritical', emj: '🪑', label: BRANCH_LABELS.noncritical },
      ];
    } else if (node?.branchKey === 'triageNext') {
      title = 'After ED Triage';
      blurb = 'Return to the criticality check, or proceed to complete registration.';
      choices = [
        { id: 'recheck', emj: '↺', label: BRANCH_LABELS.recheck },
        { id: 'proceed', emj: '✅', label: BRANCH_LABELS.proceed },
      ];
    }

    const selected =
      node?.branchKey === 'criticality'
        ? state.selectedCriticalityBranch
        : state.selectedTriageBranch;

    body.innerHTML = `
      <h3>${escapeHtml(title)}</h3>
      <p>${escapeHtml(blurb)}</p>
      <div class="edg-branch-grid">
        ${choices.map(c => `
          <button type="button" class="edg-branch-btn${selected === c.id ? ' is-selected' : ''}" data-branch="${c.id}">
            <span class="edg-route-emj">${c.emj}</span>
            <span>${escapeHtml(c.label)}</span>
          </button>
        `).join('')}
      </div>
      ${selected ? `<p class="status">Previously selected: <strong>${escapeHtml(BRANCH_LABELS[selected] || selected)}</strong></p>` : ''}
    `;
    body.querySelectorAll('[data-branch]').forEach(btn => {
      btn.addEventListener('click', () => handlers.onBranch(btn.dataset.branch));
    });
  }
}
