interface FatalRuntimeOverlayState {
  element: HTMLDivElement | null;
}

function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.stack || error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

export function createFatalRuntimeReporter(mountElement: HTMLDivElement) {
  const overlayState: FatalRuntimeOverlayState = { element: null };
  const host = document.body || mountElement;

  const clear = () => {
    if (overlayState.element && overlayState.element.parentNode) {
      overlayState.element.parentNode.removeChild(overlayState.element);
    }
    overlayState.element = null;
  };

  const report = (error: unknown, context: string) => {
    const message = normalizeErrorMessage(error);
    console.error(`[Game Runtime] Fatal error during ${context}`, error);

    if (!overlayState.element) {
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.inset = '0';
      overlay.style.zIndex = '9999';
      overlay.style.background = 'rgba(10, 8, 12, 0.94)';
      overlay.style.color = '#ffe7e7';
      overlay.style.padding = '24px';
      overlay.style.overflow = 'auto';
      overlay.style.fontFamily = 'Consolas, monospace';
      overlay.style.whiteSpace = 'pre-wrap';
      overlayState.element = overlay;
      host.appendChild(overlay);
    }

    overlayState.element.textContent =
      `Fatal runtime error during ${context}\n\n${message}\n\nCheck the browser console for the full stack trace.`;
  };

  return {
    report,
    clear,
  };
}
