interface RuntimeTeardownOptions {
  rafId: number;
  effectTimeouts: ReturnType<typeof setTimeout>[];
  cancelEnemyPrewarm?: () => void;
  portalVignette: HTMLDivElement | null;
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
  portalVignette,
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

  if (portalVignette) {
    portalVignette.style.opacity = '0';
  }

  clearRuntimeRefs();
  detachDomEvents();

  if (rendererDomElement.parentNode === mountElement) {
    mountElement.removeChild(rendererDomElement);
  }

  cleanupResources();
}
