/**
 * Keyboard navigation for the ED game.
 * Ignores input when typing, modifiers held, or a question/branch modal is open.
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
    if (state.challengeOpen) return true;
    return false;
  }

  function onKeyDown(e) {
    if (shouldIgnore(e)) return;

    const st = getState();
    if (st.phase !== 'playing') return;

    if (e.key === 'ArrowRight' || e.key === 'Enter') {
      e.preventDefault();
      onNext();
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onBack();
    }
  }

  window.addEventListener('keydown', onKeyDown);
  return () => window.removeEventListener('keydown', onKeyDown);
}
