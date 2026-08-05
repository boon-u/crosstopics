import { NODES } from '../data/edRegistrationWorkflow.js';
import { createEDGameState } from '../hooks/useEDGameState.js';
import { attachGameKeyboardControls } from '../hooks/useGameKeyboardControls.js';
import { renderGameWorld, placeCharacter, animateCharacterMove, fitWorldToViewport } from './GameWorld.js';
import { renderGameControls } from './GameControls.js';
import { renderProcessMiniMap } from './ProcessMiniMap.js';
import { renderFullProcessModal } from './FullProcessModal.js';
import { renderScenarioSelector } from './ScenarioSelector.js';
import { renderCheckpointChallenge } from './CheckpointChallenge.js';
import { renderCompletionSummary } from './CompletionSummary.js';

window.__ED_NODE_LABELS = Object.fromEntries(
  Object.values(NODES).map(n => [n.id, n.label.replace(/\n/g, ' ')])
);

export function mountEDRegistrationGamePage(root, { onExit } = {}) {
  const game = createEDGameState();
  let fullProcessOpen = false;
  let detachKeyboard = null;
  let worldDirty = true;

  root.innerHTML = `
    <div class="edg-page" id="edgPageRoot">
      <header class="edg-header">
        <div>
          <h1>ED Registration Scenario</h1>
          <p class="tag">Walk the IWK ED Registration flowchart at your own pace</p>
        </div>
        <div class="edg-header-actions">
          <button type="button" class="btn secondary" id="edgViewFullBtn">View Full Process</button>
          <button type="button" class="btn secondary" id="edgExitBtn">Exit Scenario</button>
        </div>
      </header>

      <div id="edgIntroSlot"></div>

      <div id="edgPlaySlot" class="edg-play-slot" hidden>
        <div id="edgMiniSlot"></div>
        <div class="edg-stage panel">
          <div class="edg-stage-top">
            <div class="edg-instructions">
              Move through each workflow step. Required checkpoints open a short question before you can continue.
              At the purple diamond, choose critical vs non-critical.
            </div>
            <button type="button" class="btn secondary" id="edgChangeDecisionBtn" hidden>Change Decision</button>
          </div>
          <div class="edg-viewport" id="edgViewport" tabindex="0" aria-label="ED Registration game world">
            <div id="edgWorldHost"></div>
          </div>
          <div id="edgControlsSlot"></div>
        </div>
      </div>

      <div id="edgCompleteSlot" hidden></div>
      <div id="edgModalHost"></div>
    </div>
  `;

  const pageRoot = root.querySelector('#edgPageRoot');
  const introSlot = root.querySelector('#edgIntroSlot');
  const playSlot = root.querySelector('#edgPlaySlot');
  const completeSlot = root.querySelector('#edgCompleteSlot');
  const miniSlot = root.querySelector('#edgMiniSlot');
  const controlsSlot = root.querySelector('#edgControlsSlot');
  const worldHost = root.querySelector('#edgWorldHost');
  const viewport = root.querySelector('#edgViewport');
  const modalHost = root.querySelector('#edgModalHost');
  const changeBtn = root.querySelector('#edgChangeDecisionBtn');

  function refitWorld() {
    fitWorldToViewport(viewport, worldHost);
  }

  let resizeTimer = null;
  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(refitWorld, 80);
  };
  window.addEventListener('resize', onResize);

  root.querySelector('#edgExitBtn')?.addEventListener('click', () => onExit?.());
  root.querySelector('#edgViewFullBtn')?.addEventListener('click', () => {
    fullProcessOpen = true;
    renderFullProcessModal(modalHost, { open: true, onClose: () => { fullProcessOpen = false; renderFullProcessModal(modalHost, { open: false, onClose: () => {} }); } });
  });

  changeBtn?.addEventListener('click', () => {
    game.requestChangeDecision();
    paint();
  });

  async function runMove(req) {
    if (!req.ok) {
      if (req.action === 'finished') paint();
      else paint();
      return;
    }
    game.setMoving(true);
    paintControlsOnly();
    const char = worldHost.querySelector('#edgCharacter');
    const reverse = req.action === 'history_back';
    await animateCharacterMove(viewport, char, req.fromId, req.toId, { reverse });
    if (req.action === 'append') {
      game.commitMove(req.toId, { append: true });
    } else {
      game.commitMove(req.toId, { nextIndex: req.nextIndex });
    }
    worldDirty = true;
    paint();
  }

  function onNext() {
    const st = game.getState();
    if (st.moving) return;
    const req = game.requestNext();
    runMove(req);
  }

  function onBack() {
    const st = game.getState();
    if (st.moving) return;
    const req = game.requestBack();
    runMove(req);
  }

  function attachStartHandlers() {
    worldHost.querySelectorAll('.edg-node.is-startable').forEach(nodeEl => {
      const begin = () => {
        const route = nodeEl.dataset.node === 'start_ems' ? 'paramedic' : 'walkin';
        game.beginFromStart(route);
        worldDirty = true;
        paint();
        queueMicrotask(() => {
          const st2 = game.getState();
          const char = worldHost.querySelector('#edgCharacter');
          if (char && st2.currentNodeId) placeCharacter(char, st2.currentNodeId);
          refitWorld();
        });
      };
      nodeEl.addEventListener('click', begin);
      nodeEl.setAttribute('role', 'button');
      nodeEl.setAttribute('tabindex', '0');
      nodeEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); begin(); }
      });
    });
  }

  function paintControlsOnly() {
    const state = game.getState();
    const node = NODES[state.currentNodeId];
    renderGameControls(controlsSlot, state, {
      next: game.nextButtonMeta(),
      back: game.backButtonMeta(),
      role: node?.role || (state.selectedArrivalRoute === 'paramedic' ? 'ED Nurse' : 'ED Nurse'),
    }, { onBack, onNext });
  }

  function paint() {
    const state = game.getState();

    pageRoot?.classList.toggle('is-playing', state.phase === 'playing');
    introSlot.hidden = state.phase !== 'intro';
    playSlot.hidden = state.phase !== 'playing';
    completeSlot.hidden = state.phase !== 'complete';

    if (state.phase === 'playing') {
      renderGameWorld(worldHost, state);
      placeCharacter(worldHost.querySelector('#edgCharacter'), state.currentNodeId);
      worldDirty = false;
      requestAnimationFrame(refitWorld);

      renderProcessMiniMap(miniSlot, state);

      if (!state.currentNodeId) {
        // Preview: whole diagram is shown; participant clicks a Start to choose a route.
        attachStartHandlers();
        controlsSlot.innerHTML =
          `<div class="edg-controls-hint">▶ Click a glowing green <b>Start</b> to begin — the upper Start is <b>Paramedic / EMS</b>, the lower Start is <b>Walk-in</b>.</div>`;
        changeBtn.hidden = true;
      } else {
        paintControlsOnly();
        const showChange =
          state.currentNodeId === 'decision' && !!state.selectedCriticalityBranch && !state.challengeOpen;
        changeBtn.hidden = !showChange;
      }
    }

    if (state.phase === 'complete') {
      renderCompletionSummary(completeSlot, state, {
        onReplay: () => {
          const route = state.selectedArrivalRoute;
          game.replay(true);
          game.selectArrivalRoute(route);
          game.beginScenario();
          worldDirty = true;
          paint();
        },
        onOtherRoute: () => {
          game.replay(false);
          worldDirty = true;
          paint();
        },
        onExit: () => onExit?.(),
      });
    }

    renderCheckpointChallenge(modalHost, state, {
      onAnswer: (opt) => { game.submitAnswer(opt); paint(); },
      onContinueFeedback: () => { game.continueAfterFeedback(); worldDirty = true; paint(); },
      onBranch: (id) => { game.selectBranch(id); worldDirty = true; paint(); },
      onConfirmChange: (ok) => { game.confirmChangeDecision(ok); worldDirty = true; paint(); },
    });

    renderFullProcessModal(modalHost, {
      open: fullProcessOpen,
      onClose: () => { fullProcessOpen = false; renderFullProcessModal(modalHost, { open: false, onClose: () => {} }); },
    });
  }

  detachKeyboard = attachGameKeyboardControls({
    getState: () => game.getState(),
    onNext,
    onBack,
    isEnabled: () => !root.hidden && root.offsetParent !== null && game.getState().phase === 'playing',
  });

  paint();

  return {
    destroy() {
      window.removeEventListener('resize', onResize);
      clearTimeout(resizeTimer);
      detachKeyboard?.();
      root.innerHTML = '';
    },
    getState: () => game.getState(),
  };
}
