import { GameState } from '@/lib/game/GameState';
import { Button } from '@/components/ui/button';
import { Heart, Coins, Package, ScrollText, X } from 'lucide-react';
import { useState } from 'react';

interface GameUIProps {
  gameState: GameState;
}

export const GameUI = ({ gameState }: GameUIProps) => {
  const [showInventory, setShowInventory] = useState(false);
  const [showQuests, setShowQuests] = useState(false);

  const activeQuests = gameState.quests.filter(q => q.active && !q.completed);

  return (
    <>
      {/* Top HUD */}
      <div className="fixed top-4 left-4 right-4 z-40 pointer-events-none font-sans">
        <div className="max-w-7xl mx-auto flex justify-between items-start">
          {/* Player Stats */}
          <div className="bg-[#2D1B11]/95 border-4 border-[#8B5A2B] rounded-sm p-3 space-y-2 pointer-events-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500 drop-shadow-md" />
              <div className="flex-1 ml-2">
                <div className="w-40 h-4 bg-black/60 rounded-sm overflow-hidden border-2 border-[#5C3A21]">
                  <div 
                    className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all"
                    style={{ width: `${(gameState.player.health / gameState.player.maxHealth) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-bold text-[#F5DEB3] ml-2 tracking-wider">
                {gameState.player.health}/{gameState.player.maxHealth}
              </span>
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <Coins className="w-5 h-5 text-yellow-400 drop-shadow-md" />
              <span className="text-md font-bold text-[#F5DEB3] tracking-wider ml-1">{gameState.player.gold}</span>
            </div>
          </div>

          {/* Current Objective Tracker */}
          {activeQuests.length > 0 && (
            <div className="bg-[#2D1B11]/90 border-4 border-[#8B5A2B] rounded-sm p-3 max-w-[250px] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
              <p className="text-[#DAA520] text-xs font-bold uppercase mb-1 border-b border-[#5C3A21] pb-1">Current Objective</p>
              <p className="text-[#F5DEB3] text-sm leading-tight">{activeQuests[0].title}</p>
              <div className="mt-1 space-y-1">
                {activeQuests[0].objectives.slice(0, 2).map((obj, i) => (
                  <p key={i} className="text-[#D3D3D3] text-xs flex gap-1">
                    <span className="text-[#DAA520]">▶</span> {obj}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pointer-events-auto">
            <Button
              onClick={() => setShowInventory(!showInventory)}
              variant="outline"
              size="icon"
              className="bg-[#2D1B11] hover:bg-[#3D2B21] border-2 border-[#8B5A2B] text-[#DAA520] rounded-sm h-12 w-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] transition-transform hover:translate-y-[-2px]"
            >
              <Package className="w-6 h-6" />
            </Button>
            
            <Button
              onClick={() => setShowQuests(!showQuests)}
              variant="outline"
              size="icon"
              className="bg-[#2D1B11] hover:bg-[#3D2B21] border-2 border-[#8B5A2B] text-[#DAA520] rounded-sm h-12 w-12 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] transition-transform hover:translate-y-[-2px] relative"
            >
              <ScrollText className="w-6 h-6" />
              {activeQuests.length > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 text-white border-2 border-[#8B5A2B] rounded-full text-xs font-bold flex items-center justify-center">
                  {activeQuests.length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Inventory Panel */}
      {showInventory && (
        <div className="fixed top-24 right-4 w-80 max-h-[500px] bg-[#2D1B11]/95 border-4 border-[#8B5A2B] rounded-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] z-40 flex flex-col">
          <div className="p-3 border-b-4 border-[#5C3A21] flex justify-between items-center bg-[#1A0F0A]">
            <h3 className="font-bold text-lg text-[#DAA520] tracking-wider uppercase">Inventory</h3>
            <Button
              onClick={() => setShowInventory(false)}
              variant="ghost"
              size="icon"
              className="text-[#D3D3D3] hover:text-white hover:bg-transparent"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="p-3 overflow-y-auto max-h-[400px] bg-[#2D1B11]">
            {gameState.inventory.length === 0 ? (
              <p className="text-[#A0522D] text-center py-8 font-semibold">Your pack is empty</p>
            ) : (
              <div className="space-y-3">
                {gameState.inventory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#3D2B21] border-2 border-[#5C3A21] rounded-sm hover:border-[#DAA520] transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-[#F5DEB3]">{item.name}</h4>
                      <span className="text-[10px] text-[#DAA520] uppercase bg-[#1A0F0A] px-2 py-0.5 rounded-sm border border-[#5C3A21]">{item.type}</span>
                    </div>
                    <p className="text-sm text-[#D3D3D3] mt-2 leading-tight">{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quest Log */}
      {showQuests && (
        <div className="fixed top-24 right-4 w-96 max-h-[500px] bg-[#2D1B11]/95 border-4 border-[#8B5A2B] rounded-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)] z-40 flex flex-col">
          <div className="p-3 border-b-4 border-[#5C3A21] flex justify-between items-center bg-[#1A0F0A]">
            <h3 className="font-bold text-lg text-[#DAA520] tracking-wider uppercase">Quest Log</h3>
            <Button
              onClick={() => setShowQuests(false)}
              variant="ghost"
              size="icon"
              className="text-[#D3D3D3] hover:text-white hover:bg-transparent"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="p-4 overflow-y-auto max-h-[400px] bg-[#2D1B11]">
            {gameState.quests.length === 0 ? (
              <p className="text-[#A0522D] text-center py-8 font-semibold">Your journal is empty</p>
            ) : (
              <div className="space-y-4">
                {gameState.quests.map((quest) => (
                  <div
                    key={quest.id}
                    className={`p-4 rounded-sm border-2 shadow-inner ${
                      quest.completed
                        ? 'bg-[#1e2e1e] border-[#2e5e2e]'
                        : quest.active
                        ? 'bg-[#3D2B21] border-[#DAA520]'
                        : 'bg-[#1A0F0A] border-[#5C3A21]'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className={`font-bold ${quest.completed ? 'text-[#8FBC8F]' : 'text-[#F5DEB3]'}`}>{quest.title}</h4>
                      {quest.completed && (
                        <span className="text-[10px] uppercase font-bold text-[#8FBC8F] border border-[#2e5e2e] px-2 py-0.5 rounded-sm">
                          Completed
                        </span>
                      )}
                      {quest.active && !quest.completed && (
                        <span className="text-[10px] uppercase font-bold text-[#DAA520] border border-[#DAA520] px-2 py-0.5 rounded-sm">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#D3D3D3] mb-4 leading-relaxed">{quest.description}</p>
                    <div className="space-y-2 bg-[#1A0F0A]/50 p-2 rounded-sm border border-[#5C3A21]/50">
                      <p className="text-xs font-bold text-[#DAA520] uppercase tracking-wider">Objectives:</p>
                      {quest.objectives.map((obj, i) => (
                        <p key={i} className="text-sm text-[#F5DEB3] ml-1 flex gap-2">
                          <span className="text-[#DAA520]">{quest.completed ? '✓' : '▶'}</span> {obj}
                        </p>
                      ))}
                    </div>
                    {quest.reward && (
                      <div className="mt-3 pt-3 border-t border-[#5C3A21] flex items-center gap-2">
                        <p className="text-xs font-bold text-[#DAA520] uppercase">Reward:</p>
                        {quest.reward.gold && (
                          <p className="text-sm text-[#F5DEB3] font-bold flex items-center gap-1">
                            <Coins className="w-3 h-3 text-yellow-400" /> {quest.reward.gold} Gold
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls Help */}
      <div className="fixed bottom-4 left-4 bg-[#2D1B11]/80 border-2 border-[#8B5A2B] rounded-sm p-3 z-40 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
        <p className="text-xs font-bold mb-2 text-[#DAA520] uppercase tracking-wider border-b border-[#5C3A21] pb-1">Controls</p>
        <div className="space-y-1">
          <p className="text-xs text-[#F5DEB3]"><kbd className="bg-[#1A0F0A] px-1 rounded border border-[#5C3A21] text-[#DAA520]">W</kbd><kbd className="bg-[#1A0F0A] px-1 rounded border border-[#5C3A21] text-[#DAA520] mx-0.5">A</kbd><kbd className="bg-[#1A0F0A] px-1 rounded border border-[#5C3A21] text-[#DAA520] mx-0.5">S</kbd><kbd className="bg-[#1A0F0A] px-1 rounded border border-[#5C3A21] text-[#DAA520]">D</kbd> - Move</p>
          <p className="text-xs text-[#F5DEB3]"><kbd className="bg-[#1A0F0A] px-2 rounded border border-[#5C3A21] text-[#DAA520]">SPACE</kbd> - Attack</p>
          <p className="text-xs text-[#F5DEB3]"><kbd className="bg-[#1A0F0A] px-1.5 rounded border border-[#5C3A21] text-[#DAA520]">E</kbd> - Interact</p>
        </div>
      </div>
    </>
  );
};
