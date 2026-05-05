import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { CONTROL_GROUPS } from './controlBindings';

interface PauseMenuProps {
  onResume: () => void;
  /** Title of the player's primary active quest, e.g. "The Missing Hunter". */
  questTitle?: string;
  /** Active (un-checked) objective step under that quest, e.g. "Find the Disparaged Cottage". */
  questObjective?: string;
}

export const PauseMenu = ({ onResume, questTitle, questObjective }: PauseMenuProps) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto">
      <div className="bg-[#1A0F0A]/95 border-2 border-[#8B5A2B] rounded-lg p-8 max-w-md w-full mx-4 shadow-2xl animate-scale-in">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-[#DAA520] uppercase tracking-widest">Paused</h2>
          <Button
            onClick={onResume}
            variant="ghost"
            size="sm"
            className="text-[#D3D3D3] hover:text-[#DAA520] hover:bg-[#2D1B11]"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {(questTitle || questObjective) && (
          <div className="mb-6 p-3 bg-[#2D1B11]/80 border border-[#5C3A21] rounded-sm">
            <p className="text-[10px] text-[#DAA520] uppercase tracking-wider font-bold mb-1">Current Objective</p>
            {questTitle && (
              <p className="text-[11px] uppercase tracking-wider text-[#A1887F] mb-0.5">{questTitle}</p>
            )}
            {questObjective && (
              <p className="text-sm text-[#F5DEB3]">{questObjective}</p>
            )}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <p className="text-[10px] text-[#DAA520] uppercase tracking-wider font-bold">Controls</p>
          {CONTROL_GROUPS.map(group => (
            <div key={group.title} className="space-y-1.5">
              <p className="text-[9px] font-bold text-[#DAA520]/70 uppercase tracking-[0.2em]">{group.title}</p>
              <div className="grid grid-cols-2 gap-2">
                {group.bindings.map(b => (
                  <div
                    key={`${group.title}-${b.keys}`}
                    className={`flex justify-between items-center bg-[#2D1B11]/50 px-2 py-1.5 rounded-sm border border-[#5C3A21]/30 ${b.wide ? 'col-span-2' : ''}`}
                  >
                    <kbd className="bg-[#1A0F0A] px-1.5 py-0.5 rounded border border-[#5C3A21] text-[#DAA520] text-[10px] font-bold">{b.keys}</kbd>
                    <span className="text-[#F5DEB3] text-xs">{b.action}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Button
          onClick={onResume}
          className="w-full bg-[#8B5A2B] hover:bg-[#A0522D] text-white font-bold py-3 border border-[#5C3A21] uppercase tracking-wider"
        >
          Resume
        </Button>
      </div>
    </div>
  );
};
