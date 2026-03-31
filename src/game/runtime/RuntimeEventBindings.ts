interface RuntimeEventBindingsOptions {
  rendererDomElement: HTMLCanvasElement;
  handleKeyDown: (event: KeyboardEvent) => void;
  handleKeyUp: (event: KeyboardEvent) => void;
  handleResize: () => void;
  handleMouseDown: (event: MouseEvent) => void;
  handleMouseUp: (event: MouseEvent) => void;
  handleContextMenu: (event: MouseEvent) => void;
}

export function bindRuntimeDomEvents({
  rendererDomElement,
  handleKeyDown,
  handleKeyUp,
  handleResize,
  handleMouseDown,
  handleMouseUp,
  handleContextMenu,
}: RuntimeEventBindingsOptions) {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('resize', handleResize);
  rendererDomElement.addEventListener('mousedown', handleMouseDown);
  rendererDomElement.addEventListener('mouseup', handleMouseUp);
  rendererDomElement.addEventListener('contextmenu', handleContextMenu);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('resize', handleResize);
    rendererDomElement.removeEventListener('mousedown', handleMouseDown);
    rendererDomElement.removeEventListener('mouseup', handleMouseUp);
    rendererDomElement.removeEventListener('contextmenu', handleContextMenu);
  };
}
