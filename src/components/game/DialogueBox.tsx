import { useState, useEffect, useCallback, useRef } from 'react';
import { DialogueNode } from '@/data/dialogues';

interface DialogueBoxProps {
  node: DialogueNode | null;
  npcName?: string;
  npcScreenPos?: { x: number; y: number } | null;
  onResponse: (nextId: string, givesQuest?: string, opensVendor?: string) => void;
  onClose: () => void;
  playAdvanceSound?: () => void;
  startTypewriterLoop?: () => void;
  stopTypewriterLoop?: () => void;
}

// Renders text with **bold** and __underline__ markup
const RichText = ({ text }: { text: string }) => {
  const parts: { text: string; bold?: boolean; underline?: boolean }[] = [];
  let remaining = text;

  while (remaining.length > 0) {
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

    if (nextIdx > 0) {
      parts.push({ text: remaining.slice(0, nextIdx) });
    }

    const closeIdx = remaining.indexOf(marker, nextIdx + marker.length);
    if (closeIdx < 0) {
      parts.push({ text: remaining.slice(nextIdx) });
      break;
    }

    const inner = remaining.slice(nextIdx + marker.length, closeIdx);
    parts.push({ text: inner, bold: marker === '**', underline: marker === '__' });
    remaining = remaining.slice(closeIdx + marker.length);
  }

  return (
    <>
      {parts.map((part, i) => {
        if (part.bold) return <span key={i} className="font-bold text-[#FFD700]">{part.text}</span>;
        if (part.underline) return <span key={i} className="underline decoration-[#DAA520] underline-offset-2 text-[#E8D5B5]">{part.text}</span>;
        return <span key={i}>{part.text}</span>;
      })}
    </>
  );
};

export const DialogueBox = ({
  node,
  npcName,
  npcScreenPos,
  onResponse,
  onClose,
  playAdvanceSound,
  startTypewriterLoop,
  stopTypewriterLoop,
}: DialogueBoxProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playAdvanceSoundRef = useRef(playAdvanceSound);
  const startTypewriterLoopRef = useRef(startTypewriterLoop);
  const stopTypewriterLoopRef = useRef(stopTypewriterLoop);

  useEffect(() => {
    playAdvanceSoundRef.current = playAdvanceSound;
    startTypewriterLoopRef.current = startTypewriterLoop;
    stopTypewriterLoopRef.current = stopTypewriterLoop;
  }, [playAdvanceSound, startTypewriterLoop, stopTypewriterLoop]);

  const stripMarkers = (text: string) => text.replace(/\*\*|__/g, '');

  useEffect(() => {
    if (!node) return;
    stopTypewriterLoopRef.current?.();
    setDisplayedText('');
    setCurrentIndex(0);
    setIsTyping(true);
    setHoveredIdx(null);
    startTypewriterLoopRef.current?.();
  }, [node]);

  useEffect(() => {
    if (!node || !isTyping) return;
    const fullText = node.text;
    const stripped = stripMarkers(fullText);
    if (currentIndex < stripped.length) {
      const timeout = setTimeout(() => {
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
      stopTypewriterLoopRef.current?.();
      setDisplayedText(node.text);
      setIsTyping(false);
    }
  }, [node, isTyping]);

  const hasResponses = !!(node?.responses && node.responses.length > 0);

  const advanceDialogue = useCallback((nextId: string, givesQuest?: string, opensVendor?: string) => {
    playAdvanceSoundRef.current?.();
    onResponse(nextId, givesQuest, opensVendor);
  }, [onResponse]);

  useEffect(() => {
    if (!node) {
      stopTypewriterLoopRef.current?.();
      return;
    }

    if (isTyping) {
      startTypewriterLoopRef.current?.();
    } else {
      stopTypewriterLoopRef.current?.();
    }

    return () => {
      stopTypewriterLoopRef.current?.();
    };
  }, [node, isTyping]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!node) return;

      // Space / Enter: skip typing or close terminal node
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();

        if (isTyping) {
          skipTyping();
        } else if (!hasResponses) {
          onClose();
        } else if (node.responses!.length === 1) {
          // Single response — advance immediately
          const r = node.responses![0];
          advanceDialogue(r.nextId, r.givesQuest, r.opensVendor);
        }
        return;
      }

      // Number keys 1–9 select responses (only when done typing)
      if (!isTyping && hasResponses) {
        const num = parseInt(e.key, 10);
        if (!isNaN(num) && num >= 1 && num <= node.responses!.length) {
          e.preventDefault();
          const r = node.responses![num - 1];
          advanceDialogue(r.nextId, r.givesQuest, r.opensVendor);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [node, isTyping, hasResponses, skipTyping, advanceDialogue, onClose]);

  if (!node) return null;

  const bubbleStyle: React.CSSProperties = npcScreenPos
    ? {
        left: `${Math.max(220, Math.min(window.innerWidth - 220, npcScreenPos.x))}px`,
        bottom: `${Math.max(140, window.innerHeight - npcScreenPos.y + 60)}px`,
        transform: 'translateX(-50%)',
      }
    : {
        left: '50%',
        bottom: '300px',
        transform: 'translateX(-50%)',
      };

  return (
    <>
      {/* Speech bubble above NPC */}
      <div className="fixed z-50 pointer-events-none" style={bubbleStyle}>
        <div className="relative max-w-sm bg-[#2D1B11]/95 border-2 border-[#8B5A2B] rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] pointer-events-auto">
          {npcName && (
            <div className="px-3 py-1.5 bg-[#1A0F0A] border-b-2 border-[#5C3A21] rounded-t-lg flex items-center gap-2">
              <span className="font-bold text-sm text-[#DAA520] tracking-widest uppercase">{npcName}</span>
            </div>
          )}

          <div className="px-4 py-3 cursor-pointer" onClick={skipTyping}>
            <p className="text-[#F5DEB3] text-sm leading-relaxed min-h-[1.5rem]">
              <RichText text={displayedText} />
              {isTyping && <span className="animate-pulse text-[#DAA520] ml-1">▌</span>}
            </p>
            {isTyping && (
              <p className="text-[#8B6914] text-xs mt-1">[Space] to skip</p>
            )}
          </div>

          {/* Bubble tail */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-[#8B5A2B]" />
          <div className="absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#2D1B11]" />
        </div>
      </div>

      {/* Response panel — bottom of screen */}
      {!isTyping && (
        <div
          ref={containerRef}
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-auto px-4"
        >
          <div className="bg-[#1A0F0A]/92 backdrop-blur-sm border-2 border-[#5C3A21] rounded-lg p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] min-w-[220px]">
            {hasResponses ? (
              <div className="flex flex-col gap-1.5">
                {node.responses!.map((response, index) => {
                  const keyHint = node.responses!.length <= 9 ? index + 1 : null;
                  const isHovered = hoveredIdx === index;
                  return (
                    <button
                      key={index}
                      onMouseEnter={() => setHoveredIdx(index)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      onClick={() => advanceDialogue(response.nextId, response.givesQuest, response.opensVendor)}
                      className={`
                        flex items-center gap-2 text-left rounded-md py-2.5 px-3 text-sm transition-all border
                        ${isHovered
                          ? 'bg-[#3D2B21] border-[#DAA520] text-white'
                          : 'bg-[#2D1B11]/80 border-[#5C3A21] text-[#F5DEB3]'}
                      `}
                    >
                      {keyHint !== null && (
                        <span className={`
                          shrink-0 w-5 h-5 flex items-center justify-center rounded text-xs font-bold border
                          ${isHovered ? 'bg-[#DAA520] border-[#DAA520] text-black' : 'bg-[#1A0F0A] border-[#5C3A21] text-[#DAA520]'}
                        `}>
                          {keyHint}
                        </span>
                      )}
                      <span>{response.text}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="bg-[#8B5A2B] hover:bg-[#A0522D] text-white font-bold py-2 px-6 rounded-md border border-[#5C3A21] text-sm transition-colors"
                >
                  Leave
                </button>
                <span className="text-[#8B6914] text-xs">[Space] / [Enter]</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
