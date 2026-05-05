/**
 * Developer-only footer overlay showing version and build info.
 * Intended for local builds and debugging; production builds may hide this.
 */
export const DevFooter = () => {
  const version = import.meta.env.VITE_APP_VERSION || 'dev';
  const buildTime = new Date().toISOString();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[5] pointer-events-none">
      <div className="bg-black/70 text-[10px] text-gray-400 px-2 py-0.5 flex justify-between items-center font-mono border-t border-gray-800">
        <span>Ortho World Builder v{version}</span>
        <span className="opacity-60">{buildTime}</span>
      </div>
    </div>
  );
};
