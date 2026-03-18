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

// Renders text with **bold** and __underline__ markup
const RichText = ({ text }: { text: string }) => {
  // Parse **bold** and __underline__ markers
  const parts: { text: string; bold?: boolean; underline?: boolean }[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Find next marker
    const boldIdx = remaining.indexOf('**');
    const underIdx = remaining.indexOf('__');

    let nextIdx = -1;
    let marker = '';
    if (boldIdx >= 0 && (underIdx < 0 || boldIdx <= underIdx)) {
      nextIdx = boldIdx;
      marker = '**';
    } else if (underIdx >= 0) {
      nextIdx = underIdx;
      marker = '__';
    }

    if (nextIdx < 0) {
      parts.push({ text: remaining });
      break;
    }

    // Text before marker
    if (nextIdx > 0) {
      parts.push({ text: remaining.slice(0, nextIdx) });
    }

    // Find closing marker
    const closeIdx = remaining.indexOf(marker, nextIdx + marker.length);
    if (closeIdx < 0) {
      parts.push({ text: remaining.slice(nextIdx) });
      break;
    }

    const inner = remaining.slice(nextIdx + marker.length, closeIdx);
    parts.push({
      text: inner,
      bold: marker === '**',
      underline: marker === '__',
    });

    remaining = remaining.slice(closeIdx + marker.length);
    continue;
  }

  return (
    <>
      {parts.map((part, i) => {
        if (part.bold) {
          return <span key={i} className="font-bold text-[#FFD700]">{part.text}</span>;
        }
        if (part.underline) {
          return <span key={i} className="underline decoration-[#DAA520] underline-offset-2 text-[#E8D5B5]">{part.text}</span>;
        }
        return <span key={i}>{part.text}</span>;
      })}
    </>
  );
};

export const DialogueBox = ({ node, npcName, npcScreenPos, onResponse, onClose }: DialogueBoxProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Strip markers for character counting during typewriter
  const stripMarkers = (text: string) => text.replace(/\*\*|__/g, '');

  useEffect(() => {
    if (!node) return;
    setDisplayedText('');
    setCurrentIndex(0);
    setIsTyping(true);
  }, [node]);

  useEffect(() => {
    if (!node || !isTyping) return;
    const fullText = node.text;
    const stripped = stripMarkers(fullText);
    if (currentIndex < stripped.length) {
      const timeout = setTimeout(() => {
        // Map stripped index back to raw text position
        let rawPos = 0;
        let visibleCount = 0;
        while (visibleCount <= currentIndex && rawPos < fullText.length) {
          if (fullText.startsWith('**', rawPos) || fullText.startsWith('__', rawPos)) {
            rawPos += 2;
            continue;
          }
          visibleCount++;
          rawPos++;
        }
        setDisplayedText(fullText.slice(0, rawPos));
        setCurrentIndex(currentIndex + 1);
      }, 15);
      return () => clearTimeout(timeout);
    } else {
      setDisplayedText(fullText);
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
              <RichText text={displayedText} />
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
