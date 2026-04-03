interface RuntimeTeardownOptions {
  rafId: number;
  effectTimeouts: ReturnType<typeof setTimeout>[];
  cancelEnemyPrewarm?: () => void;
  clearRuntimeRefs: () => void;
  detachDomEvents: () => void;
  mountElement: HTMLDivElement;
  rendererDomElement: HTMLCanvasElement;
  cleanupResources: () => void;
}

export function performRuntimeTeardown({
  rafId,
  effectTimeouts,
  cancelEnemyPrewarm,
  clearRuntimeRefs,
  detachDomEvents,
  mountElement,
  rendererDomElement,
  cleanupResources,
}: RuntimeTeardownOptions) {
  cancelEnemyPrewarm?.();
  cancelAnimationFrame(rafId);
  effectTimeouts.forEach(clearTimeout);
  effectTimeouts.length = 0;

  clearRuntimeRefs();
  detachDomEvents();

  if (rendererDomElement.parentNode === mountElement) {
    mountElement.removeChild(rendererDomElement);
  }

  cleanupResources();
}
