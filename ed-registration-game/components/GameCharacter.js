/** Character helpers (sprite lives in GameWorld). */
export function setCharacterWalking(el, walking) {
  if (!el) return;
  el.classList.toggle('is-walking', !!walking);
}
