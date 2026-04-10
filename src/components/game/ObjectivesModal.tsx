import React, { memo, useMemo, useState } from 'react';
import { Coins, ScrollText, ChevronDown, ChevronRight, Target } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { GameState, Quest } from '@/lib/game/GameState';
import type { AssetManager } from '@/lib/game/AssetManager';

interface ObjectivesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameState: GameState;
  assetManager: AssetManager | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "(1/3)" style progress from an objective string. */
function parseProgress(text: string): { current: number; total: number } | null {
  const m = text.match(/\((\d+)\/(\d+)\)/);
  if (!m) return null;
  return { current: Number(m[1]), total: Number(m[2]) };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const QuestCard = memo(({ quest, defaultExpanded }: { quest: Quest; defaultExpanded: boolean }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const statusColor = quest.completed
    ? 'border-[#2e5e2e] bg-[#1e2e1e]/40'
    : quest.active
    ? 'border-[#DAA520]/40 bg-[#2D1B11]/60'
    : 'border-[#5C3A21]/50 bg-[#1A0F0A]/60';

  const statusBadge = quest.completed
    ? <span className="text-[9px] uppercase font-bold text-[#8FBC8F] border border-[#2e5e2e] px-1.5 py-0.5 rounded-sm flex-shrink-0">Completed</span>
    : quest.active
    ? <span className="text-[9px] uppercase font-bold text-[#DAA520] border border-[#DAA520]/50 px-1.5 py-0.5 rounded-sm flex-shrink-0">Active</span>
    : null;

  return (
    <div className={cn('border rounded-sm transition-colors', statusColor)}>
      {/* Header — always visible, clickable to toggle */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          {expanded
            ? <ChevronDown className="w-3.5 h-3.5 text-[#8D6E63] flex-shrink-0" />
            : <ChevronRight className="w-3.5 h-3.5 text-[#8D6E63] flex-shrink-0" />
          }
          <h4 className={cn(
            'font-bold text-sm truncate',
            quest.completed ? 'text-[#8FBC8F]/80' : 'text-[#F5DEB3]',
          )}>
            {quest.title}
          </h4>
        </div>
        {statusBadge}
      </button>

      {/* Body — collapsible */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2.5">
          <p className={cn(
            'text-xs leading-relaxed',
            quest.completed ? 'text-[#8FBC8F]/50' : 'text-[#C9B8A8]',
          )}>
            {quest.description}
          </p>

          {/* Objectives */}
          <div className="bg-[#1A0F0A]/50 p-2.5 rounded-sm border border-[#5C3A21]/30 space-y-2">
            <p className="text-[10px] font-bold text-[#DAA520] uppercase tracking-wider">Objectives</p>
            {quest.objectives.map((obj, i) => {
              const prog = parseProgress(obj);
              return (
                <div key={i} className="flex items-start gap-2">
                  <span className={cn(
                    'text-xs mt-0.5 flex-shrink-0',
                    quest.completed ? 'text-[#8FBC8F]' : 'text-[#DAA520]',
                  )}>
                    {quest.completed ? '✓' : '▶'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'text-xs leading-snug',
                      quest.completed ? 'text-[#8FBC8F]/60 line-through' : 'text-[#F5DEB3]/90',
                    )}>
                      {obj}
                    </p>
                    {/* Progress bar for trackable objectives */}
                    {prog && !quest.completed && (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-[#1A0F0A] rounded-full overflow-hidden border border-[#5C3A21]/30">
                          <div
                            className="h-full bg-gradient-to-r from-[#DAA520] to-[#FFD700] rounded-full transition-[width] duration-300"
                            style={{ width: `${Math.min(100, (prog.current / prog.total) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-[#8D6E63]">{prog.current}/{prog.total}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Reward */}
          {quest.reward && (
            <div className="pt-2 border-t border-[#5C3A21]/30 flex items-center gap-2.5">
              <p className="text-[10px] font-bold text-[#DAA520] uppercase">Reward</p>
              {quest.reward.gold != null && quest.reward.gold > 0 && (
                <div className="flex items-center gap-1">
                  <Coins className="w-3 h-3 text-yellow-400" />
                  <span className="text-xs text-[#F5DEB3] font-bold">{quest.reward.gold}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

export const ObjectivesModal = memo(function ObjectivesModal({
  open,
  onOpenChange,
  gameState,
}: ObjectivesModalProps) {
  // Sort: active first, then incomplete, then completed
  const sortedQuests = useMemo(() => {
    return [...gameState.quests].sort((a, b) => {
      if (a.active && !a.completed && !(b.active && !b.completed)) return -1;
      if (b.active && !b.completed && !(a.active && !a.completed)) return 1;
      if (a.completed && !b.completed) return 1;
      if (b.completed && !a.completed) return -1;
      return 0;
    });
  }, [gameState.quests]);

  const activeCount = gameState.quests.filter(q => q.active && !q.completed).length;
  const completedCount = gameState.quests.filter(q => q.completed).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onOpenAutoFocus={e => e.preventDefault()}
        className={cn(
          'z-[85] flex max-h-[min(92vh,720px)] w-[min(96vw,640px)] max-w-[min(96vw,640px)] flex-col gap-0 border-2 border-[#5C3A21] bg-[#120A08]/97 p-0 text-left shadow-2xl backdrop-blur-md sm:rounded-sm',
        )}
      >
        <DialogTitle className="sr-only">Objectives</DialogTitle>

        {/* Header */}
        <div className="flex flex-shrink-0 items-end justify-between gap-2 border-b border-[#5C3A21]/60 px-5 py-3">
          <div>
            <h2 className="font-bold uppercase tracking-[0.2em] text-[#DAA520] flex items-center gap-2">
              <Target className="w-5 h-5" />
              Objectives
            </h2>
            <p className="mt-0.5 text-xs text-[#A1887F]">
              {gameState.quests.length === 0
                ? 'No objectives yet.'
                : `${activeCount} active${completedCount > 0 ? `, ${completedCount} completed` : ''}`}
            </p>
          </div>
          <p className="text-[11px] text-[#8D6E63] flex-shrink-0">
            <kbd className="rounded border border-[#5C3A21] bg-[#1A0F0A] px-1.5 py-0.5 font-mono text-[#DAA520]">O</kbd>{' '}
            or <kbd className="rounded border border-[#5C3A21] bg-[#1A0F0A] px-1.5 py-0.5 font-mono text-[#DAA520]">Esc</kbd>{' '}
            to close
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {gameState.quests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ScrollText className="w-10 h-10 text-[#5C3A21] mb-3" />
              <p className="text-[#A0522D] text-sm font-semibold">No objectives yet</p>
              <p className="text-[11px] text-[#8D6E63] mt-1">Speak with villagers to discover quests</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedQuests.map(quest => (
                <QuestCard
                  key={quest.id}
                  quest={quest}
                  defaultExpanded={quest.active && !quest.completed}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});
