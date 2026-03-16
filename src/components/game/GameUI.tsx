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

  return (
    <>
      {/* Top HUD */}
      <div className="fixed top-4 left-4 right-4 z-40 pointer-events-none">
        <div className="max-w-7xl mx-auto flex justify-between items-start">
          {/* Player Stats */}
          <div className="bg-background/90 backdrop-blur-sm border-2 border-primary rounded-lg p-3 space-y-2 pointer-events-auto">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-500" />
              <div className="flex-1">
                <div className="w-32 h-3 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500 transition-all"
                    style={{ width: `${(gameState.player.health / gameState.player.maxHealth) * 100}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-bold text-foreground">
                {gameState.player.health}/{gameState.player.maxHealth}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-bold text-foreground">{gameState.player.gold}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pointer-events-auto">
            <Button
              onClick={() => setShowInventory(!showInventory)}
              variant="outline"
              size="icon"
              className="bg-background/90 backdrop-blur-sm"
            >
              <Package className="w-5 h-5" />
            </Button>
            
            <Button
              onClick={() => setShowQuests(!showQuests)}
              variant="outline"
              size="icon"
              className="bg-background/90 backdrop-blur-sm relative"
            >
              <ScrollText className="w-5 h-5" />
              {gameState.quests.filter(q => q.active && !q.completed).length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full text-xs flex items-center justify-center">
                  {gameState.quests.filter(q => q.active && !q.completed).length}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Inventory Panel */}
      {showInventory && (
        <div className="fixed top-20 right-4 w-80 max-h-[500px] bg-background/95 backdrop-blur-sm border-2 border-primary rounded-lg shadow-2xl z-40 overflow-hidden">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h3 className="font-bold text-lg text-foreground">Inventory</h3>
            <Button
              onClick={() => setShowInventory(false)}
              variant="ghost"
              size="icon"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="p-4 overflow-y-auto max-h-[400px]">
            {gameState.inventory.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No items yet</p>
            ) : (
              <div className="space-y-2">
                {gameState.inventory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
                  >
                    <h4 className="font-semibold text-foreground">{item.name}</h4>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <span className="text-xs text-primary capitalize">{item.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quest Log */}
      {showQuests && (
        <div className="fixed top-20 right-4 w-96 max-h-[500px] bg-background/95 backdrop-blur-sm border-2 border-primary rounded-lg shadow-2xl z-40 overflow-hidden">
          <div className="p-4 border-b border-border flex justify-between items-center">
            <h3 className="font-bold text-lg text-foreground">Quest Log</h3>
            <Button
              onClick={() => setShowQuests(false)}
              variant="ghost"
              size="icon"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="p-4 overflow-y-auto max-h-[400px]">
            {gameState.quests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No quests yet</p>
            ) : (
              <div className="space-y-4">
                {gameState.quests.map((quest) => (
                  <div
                    key={quest.id}
                    className={`p-4 rounded-lg border-2 ${
                      quest.completed
                        ? 'bg-green-500/10 border-green-500'
                        : quest.active
                        ? 'bg-primary/10 border-primary'
                        : 'bg-secondary border-border'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-foreground">{quest.title}</h4>
                      {quest.completed && (
                        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                          Completed
                        </span>
                      )}
                      {quest.active && !quest.completed && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{quest.description}</p>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-foreground">Objectives:</p>
                      {quest.objectives.map((obj, i) => (
                        <p key={i} className="text-xs text-muted-foreground ml-2">• {obj}</p>
                      ))}
                    </div>
                    {quest.reward && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <p className="text-xs font-semibold text-foreground">Reward:</p>
                        {quest.reward.gold && (
                          <p className="text-xs text-muted-foreground ml-2">• {quest.reward.gold} gold</p>
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
      <div className="fixed bottom-4 left-4 bg-background/90 backdrop-blur-sm border border-border rounded-lg p-3 z-40">
        <p className="text-xs font-bold mb-1 text-foreground">Controls:</p>
        <p className="text-xs text-muted-foreground">WASD/Arrows - Move</p>
        <p className="text-xs text-muted-foreground">SPACE - Attack</p>
        <p className="text-xs text-muted-foreground">E - Interact</p>
      </div>
    </>
  );
};
