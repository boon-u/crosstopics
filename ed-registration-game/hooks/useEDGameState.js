import {
  NODES,
  resolveNextNodeId,
  startNodeForRoute,
} from '../data/edRegistrationWorkflow.js';
import { questionForNode, QUESTIONS } from '../data/edRegistrationQuestions.js';

function blankState() {
  return {
    phase: 'intro', // intro | playing | complete
    currentNodeId: null,
    visitedHistory: [],
    currentHistoryIndex: -1,
    completedCheckpointIds: [],
    selectedArrivalRoute: null,
    selectedCriticalityBranch: null,
    selectedTriageBranch: null,
    answers: {},
    attempts: {},
    score: 0,
    completionStatus: 'not_started',
    challengeOpen: false,
    challengeNodeId: null,
    challengeMode: 'question', // question | feedback | branch | changeConfirm
    challengeFeedback: null,
    moving: false,
    pendingContinue: false,
  };
}

export function createEDGameState(onChange) {
  let state = blankState();
  const listeners = new Set();
  if (onChange) listeners.add(onChange);

  function emit() {
    const snap = getState();
    listeners.forEach(fn => fn(snap));
  }

  function getState() {
    return { ...state, completedCheckpointIds: [...state.completedCheckpointIds], visitedHistory: [...state.visitedHistory], answers: { ...state.answers }, attempts: { ...state.attempts } };
  }

  function set(partial) {
    state = { ...state, ...partial };
    emit();
  }

  function selectArrivalRoute(routeId) {
    set({ selectedArrivalRoute: routeId });
  }

  function beginScenario() {
    if (!state.selectedArrivalRoute) return;
    const start = startNodeForRoute(state.selectedArrivalRoute);
    state = {
      ...blankState(),
      phase: 'playing',
      selectedArrivalRoute: state.selectedArrivalRoute,
      currentNodeId: start,
      visitedHistory: [start],
      currentHistoryIndex: 0,
      completionStatus: 'in_progress',
    };
    emit();
    maybeOpenChallenge();
  }

  function currentNode() {
    return NODES[state.currentNodeId] || null;
  }

  function isCheckpointComplete(nodeId) {
    return state.completedCheckpointIds.includes(nodeId);
  }

  function needsBranch(nodeId) {
    const node = NODES[nodeId];
    if (!node) return false;
    if (node.branchKey === 'criticality' && !state.selectedCriticalityBranch) return true;
    if (node.branchKey === 'triageNext' && !state.selectedTriageBranch) {
      // Only after triage question is done
      if (questionForNode(nodeId) && !isCheckpointComplete(nodeId)) return false;
      return true;
    }
    return false;
  }

  function needsQuestion(nodeId) {
    const q = questionForNode(nodeId);
    if (!q) return false;
    return !isCheckpointComplete(nodeId);
  }

  function nextButtonMeta() {
    if (state.phase !== 'playing' || state.moving) {
      return { label: 'Next', disabled: true, reason: 'idle' };
    }
    if (state.challengeOpen && state.challengeMode === 'question') {
      return { label: 'Answer to Continue', disabled: true, reason: 'question' };
    }
    if (state.challengeOpen && state.challengeMode === 'feedback') {
      return { label: 'Continue', disabled: false, reason: 'feedback' };
    }
    if (state.challengeOpen && (state.challengeMode === 'branch' || state.challengeMode === 'changeConfirm')) {
      return { label: 'Choose a Route', disabled: true, reason: 'branch' };
    }
    if (state.pendingContinue) {
      return { label: 'Continue', disabled: false, reason: 'pending' };
    }
    if (needsQuestion(state.currentNodeId)) {
      return { label: 'Answer to Continue', disabled: true, reason: 'need_question' };
    }
    if (needsBranch(state.currentNodeId)) {
      return { label: 'Choose a Route', disabled: true, reason: 'need_branch' };
    }
    if (state.currentNodeId === 'end') {
      return { label: 'Finish', disabled: false, reason: 'finish' };
    }
    const atTip = state.currentHistoryIndex >= state.visitedHistory.length - 1;
    if (!atTip) {
      return { label: 'Next', disabled: false, reason: 'replay_forward' };
    }
    const next = resolveNextNodeId(state);
    if (!next) {
      return { label: 'Choose a Route', disabled: true, reason: 'blocked' };
    }
    if (state.currentHistoryIndex === 0 && state.visitedHistory.length === 1) {
      return { label: 'Start', disabled: false, reason: 'start' };
    }
    return { label: 'Next', disabled: false, reason: 'forward' };
  }

  function backButtonMeta() {
    const disabled =
      state.phase !== 'playing' ||
      state.moving ||
      state.currentHistoryIndex <= 0 ||
      (state.challengeOpen && state.challengeMode === 'question');
    return { disabled };
  }

  function maybeOpenChallenge() {
    const id = state.currentNodeId;
    if (!id || state.moving) return;

    if (needsQuestion(id)) {
      set({
        challengeOpen: true,
        challengeNodeId: id,
        challengeMode: 'question',
        challengeFeedback: null,
        pendingContinue: false,
      });
      return;
    }

    if (needsBranch(id)) {
      set({
        challengeOpen: true,
        challengeNodeId: id,
        challengeMode: 'branch',
        challengeFeedback: null,
        pendingContinue: false,
      });
    }
  }

  function closeChallengeOnly() {
    // Informational close after feedback — does not discard unanswered questions
    if (state.challengeMode === 'feedback' || state.challengeMode === 'branch') {
      set({ challengeOpen: false, challengeNodeId: null, challengeFeedback: null, pendingContinue: state.challengeMode === 'feedback' });
    }
  }

  function submitAnswer(optionId) {
    const nodeId = state.challengeNodeId || state.currentNodeId;
    const q = questionForNode(nodeId);
    if (!q || state.challengeMode !== 'question') return;
    const opt = q.options.find(o => o.id === optionId);
    if (!opt) return;
    const attempts = { ...state.attempts, [nodeId]: (state.attempts[nodeId] || 0) + 1 };
    if (!opt.correct) {
      set({
        attempts,
        challengeFeedback: {
          correct: false,
          message: 'Not quite — try again.',
          explanation: null,
        },
      });
      return;
    }
    const answers = { ...state.answers, [nodeId]: optionId };
    const completed = state.completedCheckpointIds.includes(nodeId)
      ? state.completedCheckpointIds
      : [...state.completedCheckpointIds, nodeId];
    const alreadyScored = !!state.answers[nodeId];
    const score = alreadyScored ? state.score : state.score + (q.points || 10);
    set({
      answers,
      attempts,
      completedCheckpointIds: completed,
      score,
      challengeMode: 'feedback',
      challengeFeedback: {
        correct: true,
        message: 'Correct!',
        explanation: q.explanation,
      },
      pendingContinue: true,
    });
  }

  function continueAfterFeedback() {
    set({
      challengeOpen: false,
      challengeNodeId: null,
      challengeFeedback: null,
      challengeMode: 'question',
      pendingContinue: false,
    });
    // After triage question, open branch chooser
    if (needsBranch(state.currentNodeId)) {
      set({
        challengeOpen: true,
        challengeNodeId: state.currentNodeId,
        challengeMode: 'branch',
      });
    }
  }

  function selectBranch(branchId) {
    const node = NODES[state.currentNodeId];
    if (!node) return;

    if (node.branchKey === 'criticality') {
      // Changing an existing decision?
      if (state.selectedCriticalityBranch && state.selectedCriticalityBranch !== branchId) {
        set({
          challengeOpen: true,
          challengeMode: 'changeConfirm',
          challengeNodeId: 'decision',
          challengeFeedback: { pendingBranch: branchId, kind: 'criticality' },
        });
        return;
      }
      set({
        selectedCriticalityBranch: branchId,
        selectedTriageBranch: null,
        challengeOpen: false,
        challengeNodeId: null,
        challengeMode: 'question',
      });
      return;
    }

    if (node.branchKey === 'triageNext') {
      if (state.selectedTriageBranch && state.selectedTriageBranch !== branchId) {
        set({
          challengeOpen: true,
          challengeMode: 'changeConfirm',
          challengeNodeId: 'triage',
          challengeFeedback: { pendingBranch: branchId, kind: 'triageNext' },
        });
        return;
      }
      set({
        selectedTriageBranch: branchId,
        challengeOpen: false,
        challengeNodeId: null,
        challengeMode: 'question',
      });
    }
  }

  function confirmChangeDecision(confirm) {
    const pending = state.challengeFeedback;
    if (!confirm || !pending) {
      set({
        challengeOpen: true,
        challengeMode: 'branch',
        challengeFeedback: null,
      });
      return;
    }

    // Truncate history after the decision node
    const decisionId = pending.kind === 'criticality' ? 'decision' : 'triage';
    const idx = state.visitedHistory.lastIndexOf(decisionId);
    const keepHistory = idx >= 0 ? state.visitedHistory.slice(0, idx + 1) : [decisionId];
    const keepCompleted = state.completedCheckpointIds.filter(id => {
      const pos = keepHistory.indexOf(id);
      // Keep checkpoints that appear at or before decision in history, or are before decision in workflow sense
      if (pending.kind === 'criticality') {
        return !['see_doctor', 'waiting', 'triage', 'complete', 'end'].includes(id) || keepHistory.includes(id);
      }
      return !['complete', 'end'].includes(id) || keepHistory.includes(id);
    });

    const patch = {
      visitedHistory: keepHistory,
      currentHistoryIndex: keepHistory.length - 1,
      currentNodeId: decisionId,
      completedCheckpointIds: keepCompleted,
      challengeOpen: false,
      challengeNodeId: null,
      challengeMode: 'question',
      challengeFeedback: null,
      pendingContinue: false,
    };

    if (pending.kind === 'criticality') {
      patch.selectedCriticalityBranch = pending.pendingBranch;
      patch.selectedTriageBranch = null;
      const answers = { ...state.answers };
      delete answers.triage;
      delete answers.complete;
      patch.answers = answers;
      patch.score = keepCompleted.reduce((sum, id) => {
        const q = QUESTIONS[id];
        return sum + (q && answers[id] ? (q.points || 10) : 0);
      }, 0);
    } else {
      patch.selectedTriageBranch = pending.pendingBranch;
      const answers = { ...state.answers };
      delete answers.complete;
      patch.answers = answers;
      patch.completedCheckpointIds = keepCompleted.filter(id => id !== 'complete');
      patch.score = patch.completedCheckpointIds.reduce((sum, id) => {
        const q = QUESTIONS[id];
        return sum + (q && answers[id] ? (q.points || 10) : 0);
      }, 0);
    }

    set(patch);
  }

  function requestChangeDecision() {
    set({
      challengeOpen: true,
      challengeNodeId: state.currentNodeId,
      challengeMode: 'branch',
      challengeFeedback: null,
    });
  }

  /**
   * Attempt to move Next. Returns { ok, action, toId? } for the UI to animate.
   */
  function requestNext() {
    const meta = nextButtonMeta();
    if (meta.disabled && meta.reason !== 'feedback' && meta.reason !== 'pending') {
      if (meta.reason === 'need_question' || meta.reason === 'question') {
        maybeOpenChallenge();
      } else if (meta.reason === 'need_branch' || meta.reason === 'branch' || meta.reason === 'blocked') {
        maybeOpenChallenge();
      }
      return { ok: false, action: 'blocked' };
    }

    if (state.challengeOpen && state.challengeMode === 'feedback') {
      continueAfterFeedback();
      return { ok: false, action: 'closed_feedback' };
    }

    if (state.pendingContinue) {
      continueAfterFeedback();
      return { ok: false, action: 'closed_feedback' };
    }

    if (state.currentNodeId === 'end') {
      set({ phase: 'complete', completionStatus: 'completed', challengeOpen: false });
      return { ok: false, action: 'finished' };
    }

    // Moving forward within existing history (after Back)
    if (state.currentHistoryIndex < state.visitedHistory.length - 1) {
      const nextIndex = state.currentHistoryIndex + 1;
      const toId = state.visitedHistory[nextIndex];
      return { ok: true, action: 'history_forward', fromId: state.currentNodeId, toId, nextIndex };
    }

    if (needsQuestion(state.currentNodeId) || needsBranch(state.currentNodeId)) {
      maybeOpenChallenge();
      return { ok: false, action: 'blocked' };
    }

    const toId = resolveNextNodeId(state);
    if (!toId) {
      maybeOpenChallenge();
      return { ok: false, action: 'blocked' };
    }

    // Entering decision again via triage recheck — clear triage branch for new choice later,
    // but keep criticality unless they change it.
    return { ok: true, action: 'append', fromId: state.currentNodeId, toId };
  }

  function commitMove(toId, { append, nextIndex } = {}) {
    if (append) {
      // If looping back to a node already in history (triage → decision), truncate from first occurrence? 
      // Spec: visited history should reflect path. For recheck loop, append decision again.
      const visitedHistory = [...state.visitedHistory, toId];
      const patch = {
        currentNodeId: toId,
        visitedHistory,
        currentHistoryIndex: visitedHistory.length - 1,
        moving: false,
      };
      // When returning to decision via triage recheck, always re-ask criticality —
      // the patient's condition may have changed.
      if (toId === 'decision' && state.selectedTriageBranch === 'recheck') {
        patch.selectedTriageBranch = null;
        patch.selectedCriticalityBranch = null;
      }
      set(patch);
    } else if (typeof nextIndex === 'number') {
      set({
        currentNodeId: toId,
        currentHistoryIndex: nextIndex,
        moving: false,
      });
    } else {
      set({ currentNodeId: toId, moving: false });
    }
    maybeOpenChallenge();
  }

  function requestBack() {
    const meta = backButtonMeta();
    if (meta.disabled) return { ok: false };
    if (state.challengeOpen && state.challengeMode !== 'question') {
      set({ challengeOpen: false, challengeNodeId: null, challengeFeedback: null });
    }
    const nextIndex = state.currentHistoryIndex - 1;
    const toId = state.visitedHistory[nextIndex];
    return { ok: true, action: 'history_back', fromId: state.currentNodeId, toId, nextIndex };
  }

  function setMoving(moving) {
    set({ moving: !!moving });
  }

  function replay(keepRoute) {
    const route = keepRoute ? state.selectedArrivalRoute : null;
    state = { ...blankState(), selectedArrivalRoute: route, phase: route ? 'intro' : 'intro' };
    emit();
  }

  function finishFromEnd() {
    set({ phase: 'complete', completionStatus: 'completed' });
  }

  return {
    getState,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    selectArrivalRoute,
    beginScenario,
    currentNode,
    nextButtonMeta,
    backButtonMeta,
    submitAnswer,
    continueAfterFeedback,
    selectBranch,
    confirmChangeDecision,
    requestChangeDecision,
    requestNext,
    requestBack,
    commitMove,
    setMoving,
    closeChallengeOnly,
    maybeOpenChallenge,
    replay,
    finishFromEnd,
    needsQuestion,
    needsBranch,
    isCheckpointComplete,
  };
}
