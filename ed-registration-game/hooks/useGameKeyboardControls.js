/**
 * Keyboard navigation for the ED game.
 * Ignores input when typing, modifiers held, or a question modal needs answers.
 */

export function attachGameKeyboardControls({
  getState,
  onNext,
  onBack,
  isEnabled,
}) {
  function shouldIgnore(e) {
    if (!isEnabled()) return true;
    if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return true;

    const t = e.target;
    if (!t) return false;
    const tag = (t.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (t.isContentEditable) return true;

    const state = getState();
    if (state.moving) return true;
    if (state.challengeOpen && state.challengeMode === 'question') return true;
    if (state.challengeOpen && state.challengeMode === 'changeConfirm') return true;
    // Allow arrows for branch selection? Spec says arrows may select answers but must not move character.
    if (state.challengeOpen && state.challengeMode === 'branch') return true;
    if (state.challengeOpen && state.challengeMode === 'feedback') {
      // Right arrow / Enter can continue — handled separately
      return false;
    }
    return false;
  }

  function onKeyDown(e) {
    if (shouldIgnore(e) && !(getState().challengeOpen && getState().challengeMode === 'feedback' && (e.key === 'ArrowRight' || e.key === 'Enter'))) {
      // feedback: allow continue via right/enter
      const st = getState();
      if (!(st.challengeOpen && st.challengeMode === 'feedback' && (e.key === 'ArrowRight' || e.key === 'Enter'))) {
        return;
      }
    } else if (shouldIgnore(e)) {
      return;
    }

    const st = getState();
    if (st.phase !== 'playing') return;

    if (e.key === 'ArrowRight' || (e.key === 'Enter' && st.challengeMode === 'feedback')) {
      e.preventDefault();
      onNext();
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onBack();
      return;
    }
    if (e.key === 'Escape') {
      // Only close optional overlays — never discard an unanswered question
      if (st.challengeOpen && (st.challengeMode === 'feedback' || st.challengeMode === 'branch')) {
        e.preventDefault();
        // Leave branch open requirement — Escape on branch shouldn't skip
        if (st.challengeMode === 'feedback') onNext();
      }
    }
  }

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
