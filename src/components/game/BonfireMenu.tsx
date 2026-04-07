import { useState, useCallback, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import type { GameState } from '@/lib/game/GameState';
import { type BonfireEntry, getKindledBonfiresForMap } from '@/data/bonfires';

// Inline essence icon — matches the HUD's violet-300 sparkle (`size` bumps cost readouts)
const EssenceIcon = ({ size = 'sm' }: { size?: 'sm' | 'md' }) => (
  <Sparkles
    className={`inline-block text-violet-300 relative -top-px ml-0.5 ${size === 'md' ? 'w-4 h-4' : 'w-3 h-3'}`}
  />
);

interface BonfireMenuProps {
  gameState: GameState;
  onRest: () => void;
  onClose: () => void;
  onLevelUp: (stat: 'vitality' | 'endurance' | 'strength') => boolean;
  onTravel: (entry: BonfireEntry) => void;
  triggerUIUpdate: () => void;
}

// Pixel-art flame SVG matching the in-game bonfire sprite palette:
// pale-purple tip → deep-purple upper → gold mid → amber base → dark wood log
const PixelFlame = () => (
  <svg
    width="28"
    height="32"
    viewBox="0 0 7 8"
    style={{ imageRendering: 'pixelated', display: 'block', margin: '0 auto 8px' }}
  >
    <rect x="3" y="0" width="1" height="1" fill="#FFFFFF" />
    <rect x="2" y="1" width="3" height="1" fill="#E1BEE7" />
    <rect x="1" y="2" width="5" height="1" fill="#BA68C8" />
    <rect x="1" y="3" width="5" height="1" fill="#FFD54F" />
    <rect x="0" y="4" width="7" height="1" fill="#FF6F00" />
    <rect x="0" y="5" width="7" height="1" fill="#5D4037" />
    <rect x="1" y="6" width="5" height="1" fill="#4E342E" />
    <rect x="2" y="7" width="3" height="1" fill="#3E2723" />
  </svg>
);

const STAT_INFO: Record<string, { label: string; description: string }> = {
  vitality:  { label: 'Vigor',      description: 'Max HP +20'      },
  endurance: { label: 'Endurance',  description: 'Max Stamina +15' },
  strength:  { label: 'Strength',   description: 'Attack +3'       },
};

export const BonfireMenu = ({ gameState, onRest, onClose, onLevelUp, onTravel, triggerUIUpdate }: BonfireMenuProps) => {
  const [view, setView] = useState<'main' | 'level-up' | 'fast-travel'>('main');
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (view === 'level-up' || view === 'fast-travel') setView('main');
        else onClose();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [view, onClose]);

  const p = gameState.player;
  const cost = gameState.getLevelUpCost();
  const canAfford = p.essence >= cost;

  const handleLevelUp = (stat: 'vitality' | 'endurance' | 'strength') => {
    if (onLevelUp(stat)) { bump(); triggerUIUpdate(); }
  };

  void version;

  /* ─── Level-up view ─────────────────────────────────────────────── */
  if (view === 'level-up') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 pointer-events-auto">
        <div className="bg-[#1A0F0A]/95 border-2 border-[#8B5A2B] rounded-lg p-8 max-w-lg w-full mx-4 shadow-2xl animate-scale-in">

          {/* Header row */}
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-base font-bold text-[#DAA520] uppercase tracking-[0.25em]">
              Level Up
            </h2>
            <span className="text-xs text-[#8B7355] uppercase tracking-wider">
              {p.essence}<EssenceIcon size="md" />
            </span>
          </div>

          {/* Soul level + cost */}
          <div className="flex items-center justify-between px-3 py-2.5 border border-[#3A2215] bg-[#120806] mb-4">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#8B7355]">Soul Level</span>
              <span className="ml-2 text-base font-bold text-[#F5DEB3]">{p.level}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-[#8B7355]">Cost</span>
              <span className={`ml-2 text-base font-bold ${canAfford ? 'text-[#DAA520]' : 'text-[#5C4033]'}`}>
                {cost}<EssenceIcon />
              </span>
            </div>
          </div>

          {/* Stat rows — all labels share the same muted-amber tone */}
          <div className="space-y-[2px] mb-5">
            {(['vitality', 'endurance', 'strength'] as const).map(stat => {
              const info = STAT_INFO[stat];
              return (
                <div
                  key={stat}
                  className="flex items-center justify-between px-3 py-2.5 border border-[#3A2215] bg-[#1E1008]/40"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#A09070]">
                      {info.label}
                    </span>
                    <span className="ml-3 text-sm font-bold text-[#F5DEB3]">{p[stat]}</span>
                    <span className="ml-2 text-[10px] text-[#5C4033]">{info.description}</span>
                  </div>
                  <button
                    onClick={() => handleLevelUp(stat)}
                    disabled={!canAfford}
                    className={`ml-4 w-8 h-7 shrink-0 text-xs font-bold border transition-colors ${
                      canAfford
                        ? 'border-[#5C3A21] text-[#DAA520] hover:bg-[#3D2B21] hover:border-[#DAA520]'
                        : 'border-[#2A1A0F] text-[#3D2B21] cursor-not-allowed'
                    }`}
                  >
                    +1
                  </button>
                </div>
              );
            })}
          </div>

          {/* Current stat readout — horizontal dividers, no colored labels */}
          <div className="flex items-center justify-around px-3 py-2.5 border border-[#3A2215] bg-[#120806] mb-5">
            {[
              { label: 'HP',      value: p.maxHealth     },
              { label: 'Stamina', value: p.maxStamina    },
              { label: 'Attack',  value: p.attackDamage  },
            ].map((item, i, arr) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-[9px] uppercase tracking-wider text-[#8B7355]">{item.label}</div>
                  <div className="text-sm font-bold text-[#F5DEB3]">{item.value}</div>
                </div>
                {i < arr.length - 1 && <div className="w-px h-6 bg-[#3A2215]" />}
              </div>
            ))}
          </div>

          {/* Back */}
          <button
            onClick={() => setView('main')}
            className="w-full py-2.5 border border-[#5C3A21] text-[#8B7355] hover:text-[#F5DEB3] hover:bg-[#2D1B11] text-xs font-bold uppercase tracking-[0.2em] transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  /* ─── Fast travel view ──────────────────────────────────────────── */
  if (view === 'fast-travel') {
    const kindled = getKindledBonfiresForMap(gameState.currentMap, gameState.gameFlags as Record<string, boolean | number>);
    const lb = gameState.lastBonfire;
    const isCurrentBonfire = (entry: BonfireEntry) =>
      lb !== null &&
      Math.round(lb.x * 2) === Math.round((entry.tileX - 0.5) * 2) &&
      Math.round(lb.y * 2) === Math.round((entry.tileY - 0.5) * 2);
    const others = kindled.filter(e => !isCurrentBonfire(e));

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 pointer-events-auto">
        <div className="bg-[#1A0F0A]/95 border-2 border-[#8B5A2B] rounded-lg p-8 max-w-sm w-full mx-4 shadow-2xl animate-scale-in">

          <div className="flex items-baseline justify-between mb-5">
            <h2 className="text-base font-bold text-[#DAA520] uppercase tracking-[0.25em]">
              Fast Travel
            </h2>
            <span className="text-xs text-[#8B7355] uppercase tracking-wider">
              {gameState.currentMap.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="border-t border-[#3A2215] mb-4" />

          <div className="space-y-[2px] mb-5 max-h-64 overflow-y-auto">
            {kindled.map(entry => {
              const isCurrent = isCurrentBonfire(entry);
              return (
                <button
                  key={entry.id}
                  disabled={isCurrent}
                  onClick={() => { onTravel(entry); }}
                  className={`w-full text-left px-4 py-3 border text-sm font-bold uppercase tracking-wider transition-colors ${
                    isCurrent
                      ? 'border-[#2A1A0F] text-[#3D2B21] cursor-not-allowed bg-[#120806]/40'
                      : 'border-[#3A2215] text-[#F5DEB3] hover:bg-[#2D1B11] hover:border-[#8B5A2B] hover:text-[#FFD98A]'
                  }`}
                >
                  {entry.name}
                  {isCurrent && (
                    <span className="ml-2 text-[10px] normal-case tracking-normal text-[#5C4033]">
                      (here)
                    </span>
                  )}
                </button>
              );
            })}
            {others.length === 0 && (
              <p className="px-4 py-3 text-xs text-[#5C4033] italic">
                No other bonfires discovered in this area.
              </p>
            )}
          </div>

          <button
            onClick={() => setView('main')}
            className="w-full py-2.5 border border-[#5C3A21] text-[#8B7355] hover:text-[#F5DEB3] hover:bg-[#2D1B11] text-xs font-bold uppercase tracking-[0.2em] transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  /* ─── Main view ─────────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 pointer-events-auto">
      <div className="bg-[#1A0F0A]/95 border-2 border-[#8B5A2B] rounded-lg p-8 max-w-sm w-full mx-4 shadow-2xl animate-scale-in">

        {/* Pixel flame + title */}
        <div className="text-center mb-6">
          <PixelFlame />
          <h2
            className="text-xl font-bold text-[#DAA520] uppercase"
            style={{ fontFamily: '"Times New Roman", Georgia, serif', letterSpacing: '0.35em' }}
          >
            Bonfire
          </h2>
          <p className="text-xs text-[#8B7355] uppercase tracking-widest mt-1">
            Level {p.level}&nbsp;&nbsp;·&nbsp;&nbsp;{p.essence}<EssenceIcon />
          </p>
        </div>

        <div className="border-t border-[#3A2215] mb-4" />

        {/* Menu items — styled as text-list selections, not colored buttons */}
        <div className="space-y-[2px] mb-4">
          <button
            onClick={() => { onRest(); onClose(); }}
            className="w-full text-left px-4 py-3 border border-[#3A2215] text-[#F5DEB3] text-sm font-bold uppercase tracking-wider hover:bg-[#2D1B11] hover:border-[#8B5A2B] hover:text-[#FFD98A] transition-colors"
          >
            Rest at Flame
          </button>
          <button
            onClick={() => setView('level-up')}
            className="w-full text-left px-4 py-3 border border-[#3A2215] text-[#F5DEB3] text-sm font-bold uppercase tracking-wider hover:bg-[#2D1B11] hover:border-[#8B5A2B] hover:text-[#FFD98A] transition-colors"
          >
            Level Up
            <span className="ml-2 inline-flex items-center text-xs font-semibold text-[#B8A590] normal-case tracking-normal">
              ({cost}<EssenceIcon size="md" />)
            </span>
          </button>
          <button
            onClick={() => setView('fast-travel')}
            className="w-full text-left px-4 py-3 border border-[#3A2215] text-[#F5DEB3] text-sm font-bold uppercase tracking-wider hover:bg-[#2D1B11] hover:border-[#8B5A2B] hover:text-[#FFD98A] transition-colors"
          >
            Fast Travel
          </button>
        </div>

        <div className="border-t border-[#2A1A0F] mb-3" />

        {/* Leave — muted, at bottom */}
        <button
          onClick={onClose}
          className="w-full py-2 text-[#5C4033] hover:text-[#8B7355] text-xs font-bold uppercase tracking-[0.2em] transition-colors"
        >
          Leave
        </button>
      </div>
    </div>
  );
};
