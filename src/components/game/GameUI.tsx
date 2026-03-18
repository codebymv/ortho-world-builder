import { GameState } from '@/lib/game/GameState';
import { Button } from '@/components/ui/button';
import { Heart, Coins, Package, ScrollText, Zap } from 'lucide-react';
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
      {/* Minimal Top Bar */}
      <div className="fixed top-0 left-0 right-0 h-12 bg-[#1A0F0A]/85 backdrop-blur-sm border-b border-[#5C3A21] z-50 flex justify-between items-center px-4 pointer-events-auto shadow-md">

        {/* Left Side: Health, Stamina & Gold */}
        <div className="flex items-center gap-4">
          {/* Health */}
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-red-500 drop-shadow" />
            <div className="w-28 h-2.5 bg-black/60 rounded-full overflow-hidden border border-[#5C3A21]">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all"
                style={{ width: `${(gameState.player.health / gameState.player.maxHealth) * 100}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-[#F5DEB3] tracking-wide">
              {gameState.player.health}/{gameState.player.maxHealth}
            </span>
          </div>

          {/* Stamina */}
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-yellow-300 drop-shadow" />
            <div className="w-20 h-2 bg-black/60 rounded-full overflow-hidden border border-[#5C3A21]">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-yellow-300 transition-all"
                style={{ width: `${(gameState.player.stamina / gameState.player.maxStamina) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Coins className="w-4 h-4 text-yellow-400 drop-shadow" />
            <span className="text-xs font-bold text-[#F5DEB3] tracking-wide">{gameState.player.gold}</span>
          </div>
        </div>

        {/* Center: Current Objective */}
        <div className="flex-1 flex justify-center">
          {activeQuests.length > 0 && (
            <div className="flex items-center gap-2 bg-[#2D1B11]/50 px-3 py-1 rounded-full border border-[#5C3A21]">
              <span className="text-[#DAA520] text-xs font-bold uppercase tracking-wider">Objective:</span>
              <span className="text-[#F5DEB3] text-xs truncate max-w-[200px]">{activeQuests[0].title}</span>
            </div>
          )}
        </div>

        {/* Right Side: Toggles */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setShowInventory(!showInventory);
              if (!showInventory) setShowQuests(false);
            }}
            variant="ghost"
            size="sm"
            className={`h-8 px-3 text-xs font-bold tracking-wider rounded-sm transition-colors ${
              showInventory
                ? 'bg-[#3D2B21] text-[#DAA520] border border-[#DAA520]'
                : 'text-[#D3D3D3] hover:text-[#DAA520] hover:bg-[#2D1B11] border border-transparent'
            }`}
          >
            <Package className="w-4 h-4 mr-2" />
            INVENTORY
          </Button>

          <Button
            onClick={() => {
              setShowQuests(!showQuests);
              if (!showQuests) setShowInventory(false);
            }}
            variant="ghost"
            size="sm"
            className={`h-8 px-3 text-xs font-bold tracking-wider rounded-sm transition-colors relative ${
              showQuests
                ? 'bg-[#3D2B21] text-[#DAA520] border border-[#DAA520]'
                : 'text-[#D3D3D3] hover:text-[#DAA520] hover:bg-[#2D1B11] border border-transparent'
            }`}
          >
            <ScrollText className="w-4 h-4 mr-2" />
            QUESTS
            {activeQuests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center border border-[#1A0F0A]">
                {activeQuests.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Inventory Dropdown Menu */}
      {showInventory && (
        <div className="fixed top-12 right-24 w-72 bg-[#1A0F0A]/95 backdrop-blur-md border border-[#5C3A21] border-t-0 rounded-b-md shadow-xl z-40 flex flex-col pointer-events-auto">
          <div className="p-3 overflow-y-auto max-h-[400px]">
            {gameState.inventory.length === 0 ? (
              <p className="text-[#A0522D] text-center py-6 text-sm font-semibold">Your pack is empty</p>
            ) : (
              <div className="space-y-2">
                {gameState.inventory.map((item) => (
                  <div
                    key={item.id}
                    className="p-2 bg-[#2D1B11]/80 border border-[#5C3A21] rounded-sm hover:border-[#DAA520]/50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-[#F5DEB3] text-sm">{item.name}</h4>
                      <span className="text-[9px] text-[#DAA520] uppercase bg-[#1A0F0A] px-1.5 py-0.5 rounded-sm border border-[#5C3A21]">{item.type}</span>
                    </div>
                    <p className="text-xs text-[#D3D3D3] mt-1 leading-tight opacity-80">{item.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quest Dropdown Menu */}
      {showQuests && (
        <div className="fixed top-12 right-4 w-80 bg-[#1A0F0A]/95 backdrop-blur-md border border-[#5C3A21] border-t-0 rounded-b-md shadow-xl z-40 flex flex-col pointer-events-auto">
          <div className="p-3 overflow-y-auto max-h-[400px]">
            {gameState.quests.length === 0 ? (
              <p className="text-[#A0522D] text-center py-6 text-sm font-semibold">Your journal is empty</p>
            ) : (
              <div className="space-y-3">
                {gameState.quests.map((quest) => (
                  <div
                    key={quest.id}
                    className={`p-3 rounded-sm border shadow-inner ${
                      quest.completed
                        ? 'bg-[#1e2e1e]/60 border-[#2e5e2e]'
                        : quest.active
                        ? 'bg-[#2D1B11]/80 border-[#DAA520]/50'
                        : 'bg-[#1A0F0A] border-[#5C3A21]'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <h4 className={`font-bold text-sm ${quest.completed ? 'text-[#8FBC8F]' : 'text-[#F5DEB3]'}`}>{quest.title}</h4>
                      {quest.completed && (
                        <span className="text-[9px] uppercase font-bold text-[#8FBC8F] border border-[#2e5e2e] px-1.5 py-0.5 rounded-sm">
                          Completed
                        </span>
                      )}
                      {quest.active && !quest.completed && (
                        <span className="text-[9px] uppercase font-bold text-[#DAA520] border border-[#DAA520]/50 px-1.5 py-0.5 rounded-sm">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#D3D3D3] mb-3 leading-relaxed opacity-80">{quest.description}</p>
                    <div className="space-y-1.5 bg-[#1A0F0A]/50 p-2 rounded-sm border border-[#5C3A21]/30">
                      <p className="text-[10px] font-bold text-[#DAA520] uppercase tracking-wider">Objectives:</p>
                      {quest.objectives.map((obj, i) => (
                        <p key={i} className="text-xs text-[#F5DEB3] ml-1 flex gap-1.5 opacity-90">
                          <span className="text-[#DAA520]">{quest.completed ? '✓' : '▶'}</span> {obj}
                        </p>
                      ))}
                    </div>
                    {quest.reward && (
                      <div className="mt-2 pt-2 border-t border-[#5C3A21]/50 flex items-center gap-2">
                        <p className="text-[10px] font-bold text-[#DAA520] uppercase">Reward:</p>
                        {quest.reward.gold && (
                          <p className="text-xs text-[#F5DEB3] font-bold flex items-center gap-1">
                            <Coins className="w-3 h-3 text-yellow-400" /> {quest.reward.gold}
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

      {/* Controls Help (Minimal) */}
      <div className="fixed bottom-4 left-4 bg-[#1A0F0A]/80 backdrop-blur-sm border border-[#5C3A21] rounded-sm p-2 z-40 shadow-sm pointer-events-auto">
        <div className="flex gap-3 items-center">
          <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">WASD</kbd> Move</p>
          <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">SPACE</kbd> Attack</p>
          <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">HOLD</kbd> Charge</p>
          <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">SHIFT</kbd> Dodge</p>
          <p className="text-[10px] text-[#D3D3D3]"><kbd className="bg-[#2D1B11] px-1 rounded border border-[#5C3A21] text-[#DAA520] mr-0.5">E</kbd> Interact</p>
        </div>
      </div>
    </>
  );
};

export default GameUI;
