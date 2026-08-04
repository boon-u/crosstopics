export function renderFullProcessModal(root, { open, onClose }) {
  let backdrop = root.querySelector('#edgFullProcess');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'edgFullProcess';
    backdrop.className = 'modal-back';
    backdrop.innerHTML = `
      <div class="modal edg-full-modal" role="dialog" aria-labelledby="edgFullTitle">
        <h3 id="edgFullTitle">Full ED Registration Process</h3>
        <p>Original IWK workflow diagram. Use this as a facilitator reference while walking the scenario.</p>
        <div class="edg-full-img-wrap">
          <img src="ed-reg-flowchart.png" alt="ED Registration Workflow diagram at IWK" />
        </div>
        <div class="btn-row">
          <button type="button" class="btn secondary" id="edgFullClose">Close</button>
        </div>
      </div>
    `;
    root.appendChild(backdrop);
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) onClose();
    });
    backdrop.querySelector('#edgFullClose')?.addEventListener('click', onClose);
  }
  backdrop.classList.toggle('open', !!open);
  backdrop.setAttribute('aria-hidden', open ? 'false' : 'true');
}
