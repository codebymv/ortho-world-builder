import { useState, useEffect, useCallback } from 'react';
import { DialogueNode } from '@/data/dialogues';
import { Button } from '@/components/ui/button';

interface DialogueBoxProps {
  node: DialogueNode | null;
  npcName?: string;
  npcScreenPos?: { x: number; y: number } | null;
  onResponse: (nextId: string, givesQuest?: string) => void;
  onClose: () => void;
}

export const DialogueBox = ({ node, npcName, npcScreenPos, onResponse, onClose }: DialogueBoxProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!node) return;
    setDisplayedText('');
    setCurrentIndex(0);
    setIsTyping(true);
  }, [node]);

  useEffect(() => {
    if (!node || !isTyping) return;
    if (currentIndex < node.text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(node.text.slice(0, currentIndex + 1));
        setCurrentIndex(currentIndex + 1);
      }, 15); // Faster typing
      return () => clearTimeout(timeout);
    } else {
      setIsTyping(false);
    }
  }, [currentIndex, isTyping, node]);

  const skipTyping = useCallback(() => {
    if (node && isTyping) {
      setDisplayedText(node.text);
      setIsTyping(false);
    }
  }, [node, isTyping]);

  // Space to skip typing
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        skipTyping();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [skipTyping]);

  if (!node) return null;

  // Bubble position - clamp to viewport
  const bubbleStyle: React.CSSProperties = npcScreenPos
    ? {
        left: `${Math.max(200, Math.min(window.innerWidth - 200, npcScreenPos.x))}px`,
        bottom: `${Math.max(120, window.innerHeight - npcScreenPos.y + 60)}px`,
        transform: 'translateX(-50%)',
      }
    : {
        left: '50%',
        bottom: '280px',
        transform: 'translateX(-50%)',
      };

  const hasResponses = node.responses && node.responses.length > 0;

  return (
    <>
      {/* Chat Bubble above NPC */}
      <div
        className="fixed z-50 pointer-events-none"
        style={bubbleStyle}
      >
        <div className="relative max-w-sm bg-[#2D1B11]/95 border-2 border-[#8B5A2B] rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] pointer-events-auto">
          {/* NPC Name tag */}
          {npcName && (
            <div className="px-3 py-1.5 bg-[#1A0F0A] border-b-2 border-[#5C3A21] rounded-t-lg">
              <span className="font-bold text-sm text-[#DAA520] tracking-widest uppercase">{npcName}</span>
            </div>
          )}
          
          <div className="px-4 py-3 cursor-pointer" onClick={skipTyping}>
            <p className="text-[#F5DEB3] text-sm leading-relaxed">
              {displayedText}
              {isTyping && <span className="animate-pulse text-[#DAA520] ml-1">▼</span>}
            </p>
          </div>

          {/* Speech bubble tail */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#8B5A2B]" />
          <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#2D1B11]" />
        </div>
      </div>

      {/* Response Options - compact bottom bar */}
      {!isTyping && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto w-full max-w-2xl px-4">
          <div className="bg-[#1A0F0A]/90 backdrop-blur-sm border-2 border-[#5C3A21] rounded-lg p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)]">
            {hasResponses ? (
              <div className="flex flex-col gap-1.5">
                {node.responses!.map((response, index) => (
                  <Button
                    key={index}
                    onClick={() => onResponse(response.nextId, response.givesQuest)}
                    className="w-full justify-start text-left bg-[#2D1B11]/80 hover:bg-[#3D2B21] border border-[#5C3A21] hover:border-[#DAA520] text-[#F5DEB3] hover:text-white rounded-md py-3 text-sm transition-all"
                    variant="outline"
                  >
                    <span className="text-[#DAA520] mr-2 text-xs">▶</span> {response.text}
                  </Button>
                ))}
              </div>
            ) : (
              <div className="flex justify-center">
                <Button
                  onClick={onClose}
                  className="bg-[#8B5A2B] hover:bg-[#A0522D] text-white font-bold py-2 px-6 rounded-md border border-[#5C3A21] text-sm"
                >
                  Leave
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
