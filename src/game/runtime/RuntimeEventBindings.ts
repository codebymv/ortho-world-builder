interface RuntimeEventBindingsOptions {
  rendererDomElement: HTMLCanvasElement;
  handleKeyDown: (event: KeyboardEvent) => void;
  handleKeyUp: (event: KeyboardEvent) => void;
  resetInputState: () => void;
  handleResize: () => void;
  handleMouseDown: (event: MouseEvent) => void;
  handleMouseUp: (event: MouseEvent) => void;
  handleContextMenu: (event: MouseEvent) => void;
}

export function bindRuntimeDomEvents({
  rendererDomElement,
  handleKeyDown,
  handleKeyUp,
  resetInputState,
  handleResize,
  handleMouseDown,
  handleMouseUp,
  handleContextMenu,
}: RuntimeEventBindingsOptions) {
  const handleWindowBlur = () => {
    resetInputState();
  };
  const handleVisibilityChange = () => {
    if (document.hidden) {
      resetInputState();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('blur', handleWindowBlur);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('resize', handleResize);
  rendererDomElement.addEventListener('mousedown', handleMouseDown);
  rendererDomElement.addEventListener('mouseup', handleMouseUp);
  rendererDomElement.addEventListener('contextmenu', handleContextMenu);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('blur', handleWindowBlur);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('resize', handleResize);
    rendererDomElement.removeEventListener('mousedown', handleMouseDown);
    rendererDomElement.removeEventListener('mouseup', handleMouseUp);
    rendererDomElement.removeEventListener('contextmenu', handleContextMenu);
  };
}
