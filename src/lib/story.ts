/*
 * Shared, mutable scroll state for the 3D story. Written by the DOM (scroll handler), read by the scene in useFrame.
 * Plain object + refs: no React state updates per frame.
 */

export const story = {
  /** scroll progress through the story section, 0..1 (where the page is) */
  target: 0,
  /** is the sticky stage on screen? */
  visible: true,
  /** pointer position in -1..1, used for a small parallax in full motion */
  pointerX: 0,
  pointerY: 0,
  /** set by the scene: asks R3F for a new frame */
  invalidate: null as null | (() => void),
};

export function requestFrame() {
  story.invalidate?.();
}
