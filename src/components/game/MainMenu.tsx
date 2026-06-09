import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SaveManager, type SaveData } from '@/lib/game/SaveManager';
import { CONTROL_GROUPS } from './controlBindings';
import { Volume2, VolumeX, ArrowLeft, Keyboard, Sliders, Play, Trash2 } from 'lucide-react';
import mainMenuBg from '@/assets/main-menu-bg.png';

interface MainMenuProps {
  onContinue: () => void;
  onNewGame: () => void;
  onLoadGame: () => void;
  volume: number;
  onVolumeChange: (vol: number) => void;
  isMuted: boolean;
  onMuteToggle: () => void;
}

const MAP_NAMES: Record<string, string> = {
  village: 'Greenleaf Village',
  forest: 'Whispering Woods',
  interior_ranger_cabin: "Ranger's Cabin",
  interior_surveyors_den: "Surveyor's Den",
  interior_travelers_inlet: "Traveler's Inlet",
  interior_hollow_clearing: 'Whispering Woods Clearing',
  interior_hollow_arena: 'The Hollow Arena',
  guilrhym: 'Guilrhym City',
  interior_guilrhym_cathedral: 'Guilrhym Cathedral',
};

/**
 * Dark Souls–style title screen. The thumbnail artwork is used as the full-bleed
 * background; the title and menu are restyled to match its purple-gothic Fraktur
 * aesthetic (blackletter title, violet glow, gold-on-hover menu entries).
 */
export const MainMenu = ({
  onContinue,
  onNewGame,
  onLoadGame,
  volume,
  onVolumeChange,
  isMuted,
  onMuteToggle,
}: MainMenuProps) => {
  const [activeTab, setActiveTab] = useState<'main' | 'load' | 'settings'>('main');
  const [hasSave, setHasSave] = useState(false);
  const [saveData, setSaveData] = useState<SaveData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    const exists = SaveManager.hasSave();
    setHasSave(exists);
    if (exists) {
      setSaveData(SaveManager.load());
    }
  }, []);

  const handleNewGameClick = () => {
    if (hasSave) {
      setShowDeleteConfirm(true);
    } else {
      onNewGame();
    }
  };

  const handleConfirmDeleteNewGame = () => {
    SaveManager.clearSave();
    onNewGame();
  };

  type MenuEntry = { id: string; label: string; onClick: () => void; primary?: boolean };
  const entries: MenuEntry[] = hasSave
    ? [
        { id: 'continue', label: 'Continue', onClick: onContinue, primary: true },
        { id: 'new', label: 'New Game', onClick: handleNewGameClick },
        { id: 'load', label: 'Load Game', onClick: () => setActiveTab('load') },
        { id: 'settings', label: 'Settings', onClick: () => setActiveTab('settings') },
      ]
    : [
        { id: 'new', label: 'New Game', onClick: onNewGame, primary: true },
        { id: 'settings', label: 'Settings', onClick: () => setActiveTab('settings') },
      ];

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-between text-[#E8DBF5] select-none overflow-hidden bg-[#0a0612]"
      style={{
        backgroundImage: `url(${mainMenuBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
        imageRendering: 'pixelated',
      }}
    >
      <style>{`
        @keyframes embers {
          0% { transform: translateY(0) translateX(0) scale(1); opacity: 1; }
          50% { transform: translateY(-130px) translateX(12px) scale(0.8); opacity: 0.7; }
          100% { transform: translateY(-260px) translateX(-8px) scale(0.35); opacity: 0; }
        }
        @keyframes titleGlow {
          0%, 100% { text-shadow: 0 0 18px rgba(150,90,220,0.55), 0 0 42px rgba(110,60,180,0.4), 0 4px 10px rgba(0,0,0,0.9); }
          50% { text-shadow: 0 0 26px rgba(180,120,255,0.75), 0 0 60px rgba(130,80,210,0.55), 0 4px 10px rgba(0,0,0,0.9); }
        }
        .animate-title-glow { animation: titleGlow 4.5s ease-in-out infinite; }
        .menu-ember {
          position: absolute;
          bottom: 16%;
          width: 4px;
          height: 4px;
          background: radial-gradient(circle, #ffb347 0%, #ff5a00 100%);
          border-radius: 50%;
          filter: blur(0.5px);
          pointer-events: none;
        }
      `}</style>

      {/* Atmospheric scrims for legibility, tuned to keep the art readable */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-gradient-to-b from-[#0a0612]/85 via-transparent to-[#0a0612]/92" />
      <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_38%,rgba(8,4,16,0.72)_100%)]" />

      {/* Floating embers from the bonfire region */}
      <div className="absolute inset-0 z-10 overflow-hidden pointer-events-none">
        {Array.from({ length: 16 }).map((_, i) => {
          const left = 42 + Math.random() * 16;
          const delay = Math.random() * 6;
          const duration = 4 + Math.random() * 4;
          const size = 2 + Math.random() * 3.5;
          return (
            <div
              key={i}
              className="menu-ember"
              style={{
                left: `${left}%`,
                width: `${size}px`,
                height: `${size}px`,
                animation: `embers ${duration}s linear infinite`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>

      {/* Menu */}
      <div className="w-full max-w-md px-8 pb-2 flex-1 flex flex-col justify-end items-center z-20 mb-[7vh]">
        {activeTab === 'main' && (
          <div className="w-full flex flex-col items-center gap-2.5 animate-fade-in">
            {entries.map(entry => {
              const isHover = hovered === entry.id;
              return (
                <button
                  key={entry.id}
                  onClick={entry.onClick}
                  onMouseEnter={() => setHovered(entry.id)}
                  onMouseLeave={() => setHovered(null)}
                  className="group relative w-full max-w-[19rem] py-3 flex items-center justify-center transition-all duration-200"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  {/* selection backing — subtle so the art stays visible */}
                  <span
                    className={`absolute inset-0 rounded-sm border transition-all duration-200 ${
                      isHover
                        ? 'border-[#b98cff]/70 bg-gradient-to-r from-[#2a1840]/70 via-[#3a2560]/65 to-[#2a1840]/70 shadow-[0_0_18px_rgba(150,90,220,0.35)]'
                        : 'border-[#6b4f9e]/25 bg-[#120a22]/45'
                    }`}
                  />
                  {/* left + right gothic markers on hover */}
                  <span
                    className={`absolute left-3 text-[#e6c66a] transition-all duration-200 ${isHover ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'}`}
                  >
                    ◆
                  </span>
                  <span
                    className={`absolute right-3 text-[#e6c66a] transition-all duration-200 ${isHover ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-1'}`}
                  >
                    ◆
                  </span>
                  <span
                    className={`relative text-sm md:text-base font-semibold uppercase tracking-[0.28em] transition-colors duration-200 ${
                      isHover
                        ? 'text-[#ffe6a3] drop-shadow-[0_0_10px_rgba(230,200,120,0.6)]'
                        : entry.primary
                          ? 'text-[#e7d6ff]'
                          : 'text-[#bca9db]'
                    }`}
                  >
                    {entry.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Load Game */}
        {activeTab === 'load' && (
          <div className="w-full max-w-lg bg-[#120a22]/95 border-2 border-[#7b4bc7]/70 rounded-lg p-6 shadow-[0_0_40px_rgba(110,60,180,0.35)] animate-scale-in mb-[3vh]">
            <div className="flex items-center gap-3 mb-6 border-b border-[#7b4bc7]/40 pb-3">
              <Button
                onClick={() => setActiveTab('main')}
                variant="ghost"
                size="sm"
                className="text-[#cbb6ee] hover:text-[#ffe6a3] hover:bg-[#2a1840] p-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-bold text-[#caa6ff] uppercase tracking-widest" style={{ fontFamily: "'Cinzel', serif" }}>
                Load Saved Adventure
              </h2>
            </div>

            {saveData ? (
              <div className="space-y-5">
                <div className="p-4 bg-[#1c1030]/80 border border-[#7b4bc7]/50 rounded-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="text-xs text-[#a48fce] uppercase tracking-wider font-bold">Location</p>
                      <p className="text-lg font-bold text-[#F5DEB3]">{MAP_NAMES[saveData.currentMap] || saveData.currentMap}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#a48fce] uppercase tracking-wider font-bold">Level</p>
                      <p className="text-lg font-bold text-[#e6c66a]">{saveData.player.level ?? 1}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-[#7b4bc7]/30 pt-3 text-xs">
                    <div>
                      <span className="text-[#a48fce] font-semibold uppercase tracking-wider">Gold:</span>{' '}
                      <span className="text-[#e6c66a] font-bold">{saveData.player.gold}</span>
                    </div>
                    <div>
                      <span className="text-[#a48fce] font-semibold uppercase tracking-wider">Essence:</span>{' '}
                      <span className="text-[#b98cff] font-bold">{saveData.player.essence}</span>
                    </div>
                    <div className="col-span-2 text-[#a48fce] border-t border-[#7b4bc7]/20 pt-2 flex justify-between">
                      <span>Saved On:</span>
                      <span className="text-[#F5DEB3] font-mono">
                        {new Date(saveData.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={onLoadGame}
                    className="flex-1 bg-gradient-to-r from-[#5a3499] to-[#7b4bc7] hover:from-[#6b3fa0] hover:to-[#8d5bd8] text-white font-bold py-3 border border-[#7b4bc7] uppercase tracking-wider flex items-center justify-center gap-2 rounded-sm"
                  >
                    <Play className="w-4 h-4 fill-current" /> Load Save
                  </Button>
                  <Button
                    onClick={() => setShowDeleteConfirm(true)}
                    variant="destructive"
                    className="bg-red-950/80 hover:bg-red-900 border border-red-800 text-red-200 hover:text-white px-4 rounded-sm"
                    title="Delete Save"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-[#a48fce] uppercase tracking-wider text-sm">
                No saved games found.
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        {activeTab === 'settings' && (
          <div className="w-full max-w-lg bg-[#120a22]/95 border-2 border-[#7b4bc7]/70 rounded-lg p-6 shadow-[0_0_40px_rgba(110,60,180,0.35)] animate-scale-in max-h-[64vh] overflow-y-auto mb-[3vh]">
            <div className="flex items-center gap-3 mb-6 border-b border-[#7b4bc7]/40 pb-3 sticky top-0 bg-[#120a22] z-10">
              <Button
                onClick={() => setActiveTab('main')}
                variant="ghost"
                size="sm"
                className="text-[#cbb6ee] hover:text-[#ffe6a3] hover:bg-[#2a1840] p-1"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h2 className="text-xl font-bold text-[#caa6ff] uppercase tracking-widest" style={{ fontFamily: "'Cinzel', serif" }}>
                Settings
              </h2>
            </div>

            <div className="space-y-4 mb-8">
              <h3 className="text-xs text-[#caa6ff] uppercase tracking-[0.2em] font-bold flex items-center gap-2">
                <Sliders className="w-4 h-4" /> Audio Configuration
              </h3>
              <div className="p-4 bg-[#1c1030]/60 border border-[#7b4bc7]/30 rounded-sm space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-[#F5DEB3] uppercase tracking-wider">Volume</span>
                  <span className="text-sm font-bold text-[#e6c66a] font-mono">{Math.round(volume * 100)}%</span>
                </div>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={onMuteToggle}
                    variant="ghost"
                    className="text-[#cbb6ee] hover:text-[#ffe6a3] hover:bg-[#2a1840] p-2 border border-[#7b4bc7]/30 rounded-sm"
                  >
                    {isMuted || volume <= 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </Button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : Math.round(volume * 100)}
                    onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
                    className="flex-1 accent-[#9b6cd6] bg-[#1c1030] h-1.5 rounded-lg appearance-none cursor-pointer border border-[#7b4bc7]/40"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-xs text-[#caa6ff] uppercase tracking-[0.2em] font-bold flex items-center gap-2">
                <Keyboard className="w-4 h-4" /> Control Bindings
              </h3>
              <div className="space-y-4">
                {CONTROL_GROUPS.map((group) => (
                  <div key={group.title} className="space-y-1.5">
                    <p className="text-[10px] font-bold text-[#a48fce] uppercase tracking-[0.2em]">{group.title}</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {group.bindings.map((b) => (
                        <div
                          key={`${group.title}-${b.keys}`}
                          className="flex justify-between items-center bg-[#1c1030]/40 px-3 py-2 rounded-sm border border-[#7b4bc7]/20"
                        >
                          <span className="text-[#F5DEB3] text-xs uppercase tracking-wider">{b.action}</span>
                          <kbd className="bg-[#120a22] px-2 py-0.5 rounded border border-[#7b4bc7]/60 text-[#e6c66a] text-[10px] font-bold font-mono">
                            {b.keys}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete / Overwrite confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md pointer-events-auto">
          <div className="bg-[#120a22] border-2 border-red-800 rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl animate-scale-in text-center">
            <h3 className="text-2xl font-bold text-red-400 uppercase tracking-widest mb-4" style={{ fontFamily: "'Cinzel', serif" }}>
              Warning
            </h3>
            <p className="text-[#E8DBF5] text-sm mb-6 leading-relaxed uppercase tracking-wider">
              Starting a new game will permanently delete your existing save file. Are you absolutely sure you want to proceed?
            </p>
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleConfirmDeleteNewGame}
                className="w-full bg-red-950 hover:bg-red-900 border border-red-800 text-white font-bold py-3 uppercase tracking-wider rounded-sm"
              >
                Yes, Delete and Start Fresh
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full bg-[#1c1030] hover:bg-[#2a1840] text-[#cbb6ee] hover:text-white font-bold py-3 border border-[#7b4bc7]/50 uppercase tracking-wider rounded-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="w-full py-6 text-center text-[10px] text-[#8b7ab0] tracking-[0.3em] uppercase z-20">
        © 2026 Souls Slop. All Rights Reserved.
      </div>
    </div>
  );
};
