import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { GameState } from '@/lib/game/GameState';

interface BonfireMenuProps {
  gameState: GameState;
  onRest: () => void;
  onClose: () => void;
  onLevelUp: (stat: 'vitality' | 'endurance' | 'strength') => boolean;
  triggerUIUpdate: () => void;
}

const STAT_INFO: Record<string, { label: string; description: string; color: string }> = {
  vitality: { label: 'Vigor', description: 'Max HP +20', color: '#E57373' },
  endurance: { label: 'Endurance', description: 'Max Stamina +15', color: '#81C784' },
  strength: { label: 'Strength', description: 'Attack +3', color: '#FFB74D' },
};

export const BonfireMenu = ({ gameState, onRest, onClose, onLevelUp, triggerUIUpdate }: BonfireMenuProps) => {
  const [view, setView] = useState<'main' | 'level-up'>('main');
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (view === 'level-up') {
          setView('main');
        } else {
          onClose();
        }
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
    if (onLevelUp(stat)) {
      bump();
      triggerUIUpdate();
    }
  };

  void version;

  if (view === 'level-up') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 pointer-events-auto">
        <div className="bg-[#1A0F0A]/95 border-2 border-[#8B5A2B] rounded-lg p-8 max-w-lg w-full mx-4 shadow-2xl animate-scale-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-[#DAA520] uppercase tracking-widest">Level Up</h2>
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#CE93D8]">
                <span className="text-[10px] uppercase tracking-wider text-[#BA68C8] mr-1">Essence</span>
                {p.essence}
              </span>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between p-3 bg-[#2D1B11]/60 border border-[#5C3A21] rounded-sm">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#DAA520]">Soul Level</span>
              <span className="ml-2 text-xl font-bold text-[#F5DEB3]">{p.level}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase tracking-wider text-[#DAA520]">Next Level</span>
              <span className={`ml-2 text-lg font-bold ${canAfford ? 'text-[#CE93D8]' : 'text-[#8B7355]'}`}>{cost}</span>
              <span className="ml-1 text-[10px] text-[#BA68C8]">essence</span>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            {(['vitality', 'endurance', 'strength'] as const).map(stat => {
              const info = STAT_INFO[stat];
              return (
                <div
                  key={stat}
                  className="flex items-center justify-between p-3 bg-[#2D1B11]/40 border border-[#5C3A21]/50 rounded-sm"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold uppercase tracking-wider" style={{ color: info.color }}>{info.label}</span>
                      <span className="text-lg font-bold text-[#F5DEB3]">{p[stat]}</span>
                    </div>
                    <span className="text-[10px] text-[#8B7355]">{info.description}</span>
                  </div>
                  <Button
                    onClick={() => handleLevelUp(stat)}
                    disabled={!canAfford}
                    className={`ml-4 px-4 py-2 text-xs font-bold uppercase tracking-wider border ${
                      canAfford
                        ? 'bg-[#4A148C]/60 hover:bg-[#6A1B9A]/70 text-[#E1BEE7] border-[#7B1FA2]'
                        : 'bg-[#2D1B11]/40 text-[#5C3A21] border-[#3E2723] cursor-not-allowed'
                    }`}
                  >
                    +1
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-6 text-center">
            <div className="p-2 bg-[#2D1B11]/30 rounded-sm border border-[#5C3A21]/30">
              <div className="text-[9px] uppercase tracking-wider text-[#E57373]">HP</div>
              <div className="text-sm font-bold text-[#F5DEB3]">{p.maxHealth}</div>
            </div>
            <div className="p-2 bg-[#2D1B11]/30 rounded-sm border border-[#5C3A21]/30">
              <div className="text-[9px] uppercase tracking-wider text-[#81C784]">Stamina</div>
              <div className="text-sm font-bold text-[#F5DEB3]">{p.maxStamina}</div>
            </div>
            <div className="p-2 bg-[#2D1B11]/30 rounded-sm border border-[#5C3A21]/30">
              <div className="text-[9px] uppercase tracking-wider text-[#FFB74D]">Attack</div>
              <div className="text-sm font-bold text-[#F5DEB3]">{p.attackDamage}</div>
            </div>
          </div>

          <Button
            onClick={() => setView('main')}
            className="w-full bg-[#5C3A21] hover:bg-[#8B5A2B] text-[#F5DEB3] font-bold py-3 border border-[#5C3A21] uppercase tracking-wider"
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/65 pointer-events-auto">
      <div className="bg-[#1A0F0A]/95 border-2 border-[#8B5A2B] rounded-lg p-8 max-w-sm w-full mx-4 shadow-2xl animate-scale-in">
        <div className="text-center mb-8">
          <div className="w-8 h-8 mx-auto mb-3 rounded-full bg-gradient-to-t from-[#FF6F00] via-[#FFD54F] to-[#E1BEE7] opacity-80" />
          <h2 className="text-2xl font-bold text-[#DAA520] uppercase tracking-[0.3em]"
            style={{ fontFamily: '"Times New Roman", Georgia, serif' }}
          >
            Bonfire
          </h2>
          <p className="text-[10px] text-[#8B7355] uppercase tracking-widest mt-1">Level {p.level}</p>
        </div>

        <div className="space-y-2 mb-6">
          <Button
            onClick={() => {
              onRest();
              onClose();
            }}
            className="w-full bg-[#8B5A2B] hover:bg-[#A0522D] text-white font-bold py-3 border border-[#5C3A21] uppercase tracking-wider"
          >
            Rest
          </Button>
          <Button
            onClick={() => setView('level-up')}
            className="w-full bg-[#4A148C]/50 hover:bg-[#6A1B9A]/60 text-[#E1BEE7] font-bold py-3 border border-[#7B1FA2]/50 uppercase tracking-wider"
          >
            Level Up
            <span className="ml-2 text-[10px] text-[#BA68C8] normal-case tracking-normal">({cost} essence)</span>
          </Button>
        </div>

        <Button
          onClick={onClose}
          variant="ghost"
          className="w-full text-[#8B7355] hover:text-[#DAA520] hover:bg-[#2D1B11] font-bold py-2 uppercase tracking-wider text-xs"
        >
          Leave
        </Button>
      </div>
    </div>
  );
};
