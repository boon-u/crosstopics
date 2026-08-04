import { ARRIVAL_SCENARIOS, INTRO } from '../data/edRegistrationScenarios.js';

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

export function renderScenarioSelector(el, state, { onSelect, onBegin }) {
  const cards = ARRIVAL_SCENARIOS.map(s => {
    const selected = state.selectedArrivalRoute === s.id;
    return `
      <button type="button" class="edg-route-card${selected ? ' is-selected' : ''}" data-route="${s.id}">
        <span class="edg-route-emj">${s.emj}</span>
        <span class="edg-route-title">${escapeHtml(s.title)}</span>
        <span class="edg-route-desc">${escapeHtml(s.desc)}</span>
      </button>
    `;
  }).join('');

  el.innerHTML = `
    <div class="edg-intro panel">
      <h2>${escapeHtml(INTRO.title)}</h2>
      <p class="help">${escapeHtml(INTRO.subtitle)}</p>
      <p class="edg-intro-body">${escapeHtml(INTRO.body)}</p>
      <div class="edg-route-grid">${cards}</div>
      <div class="btn-row" style="margin-top:14px">
        <button type="button" class="btn" id="edgBeginBtn" ${state.selectedArrivalRoute ? '' : 'disabled'}>Begin Scenario</button>
      </div>
    </div>
  `;

  el.querySelectorAll('[data-route]').forEach(btn => {
    btn.addEventListener('click', () => onSelect(btn.dataset.route));
  });
  el.querySelector('#edgBeginBtn')?.addEventListener('click', onBegin);
}
