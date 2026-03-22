// utils.js — Shared utilities (concatenated first in build)
// Focus trap for modal dialogs (WCAG 2.4.3 compliance)

let _focusTrapContainer = null;
let _focusTrapHandler = null;
let _previousFocus = null;

/**
 * Trap keyboard focus within a container element.
 * Tab and Shift+Tab wrap around the focusable elements inside.
 * @param {HTMLElement} container - The container to trap focus within.
 */
export function trapFocus(container) {
  releaseFocus(); // clean up any existing trap
  _previousFocus = document.activeElement;
  _focusTrapContainer = container;

  const focusable = container.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  first.focus();

  _focusTrapHandler = (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  container.addEventListener('keydown', _focusTrapHandler);
}

/**
 * Release the current focus trap and restore focus to the previously focused element.
 */
export function releaseFocus() {
  if (_focusTrapContainer && _focusTrapHandler) {
    _focusTrapContainer.removeEventListener('keydown', _focusTrapHandler);
  }
  if (_previousFocus && typeof _previousFocus.focus === 'function') {
    _previousFocus.focus();
  }
  _focusTrapContainer = null;
  _focusTrapHandler = null;
  _previousFocus = null;
}
