import { useEffect, useState } from 'react';

interface TransitionOverlayProps {
  active: boolean;
  mapName?: string;
}

export const TransitionOverlay = ({ active, mapName }: TransitionOverlayProps) => {
  const [visible, setVisible] = useState(false);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    if (active) {
      setVisible(true);
      setShowText(true);
      const timer = setTimeout(() => setShowText(false), 800);
      const hideTimer = setTimeout(() => setVisible(false), 1200);
      return () => { clearTimeout(timer); clearTimeout(hideTimer); };
    }
  }, [active]);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[90] pointer-events-none flex items-center justify-center transition-opacity duration-500 ${
        showText ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
    >
      {mapName && (
        <h2 className="text-3xl font-bold text-[#DAA520] uppercase tracking-[0.3em] animate-fade-in">
          {mapName}
        </h2>
      )}
    </div>
  );
};
