import { mountEDRegistrationGamePage } from './components/EDRegistrationGamePage.js';

let active = null;

/**
 * Open the ED Registration game as an in-app view.
 * @param {{ onExit?: () => void }} opts
 */
export function openEDRegistrationGame(opts = {}) {
  const view = document.getElementById('view-ed-game');
  if (!view) {
    console.error('view-ed-game missing');
    return null;
  }

  // Hide other app views without destroying them
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  view.classList.add('active');
  view.hidden = false;

  // Hide main chrome tabs title area slightly? Keep wrap + h1 visible for continuity.
  const host = document.getElementById('edGameHost');
  if (active) {
    active.destroy();
    active = null;
  }
  active = mountEDRegistrationGamePage(host, {
    onExit: () => {
      closeEDRegistrationGame();
      opts.onExit?.();
    },
  });
  return active;
}

export function closeEDRegistrationGame() {
  if (active) {
    active.destroy();
    active = null;
  }
  const view = document.getElementById('view-ed-game');
  if (view) {
    view.classList.remove('active');
    view.hidden = true;
  }
  // Return to Journey Board
  const boardTab = document.querySelector('.tab[data-view="board"]');
  const boardView = document.getElementById('view-board');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  if (boardTab) boardTab.classList.add('active');
  if (boardView) boardView.classList.add('active');
  // Re-render board if available
  if (typeof window.__pjRenderBoard === 'function') window.__pjRenderBoard();
}

export function isEDRegistrationGameOpen() {
  const view = document.getElementById('view-ed-game');
  return !!(view && view.classList.contains('active'));
}
