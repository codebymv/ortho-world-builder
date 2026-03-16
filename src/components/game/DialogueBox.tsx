import { useState, useEffect } from 'react';
import { DialogueNode } from '@/data/dialogues';
import { Button } from '@/components/ui/button';

interface DialogueBoxProps {
  node: DialogueNode | null;
  npcName?: string;
  onResponse: (nextId: string, givesQuest?: string) => void;
  onClose: () => void;
}

export const DialogueBox = ({ node, npcName, onResponse, onClose }: DialogueBoxProps) => {
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
      }, 30);
      return () => clearTimeout(timeout);
    } else {
      setIsTyping(false);
    }
  }, [currentIndex, isTyping, node]);

  const skipTyping = () => {
    if (node && isTyping) {
      setDisplayedText(node.text);
      setIsTyping(false);
    }
  };

  if (!node) return null;

  return (
    <div className="fixed bottom-8 left-0 right-0 px-8 z-50 font-sans flex justify-center">
      <div className="w-full max-w-4xl bg-[#2D1B11]/95 border-4 border-[#8B5A2B] rounded-sm shadow-[8px_8px_0px_0px_rgba(0,0,0,0.6)] flex flex-col relative">
        {/* Decorative corners */}
        <div className="absolute top-0 left-0 w-3 h-3 border-t-4 border-l-4 border-[#DAA520]" />
        <div className="absolute top-0 right-0 w-3 h-3 border-t-4 border-r-4 border-[#DAA520]" />
        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-4 border-l-4 border-[#DAA520]" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-4 border-r-4 border-[#DAA520]" />

        <div className="p-3 bg-[#1A0F0A] border-b-4 border-[#5C3A21]">
          {npcName && (
            <h3 className="font-bold text-xl text-[#DAA520] tracking-widest uppercase ml-2">{npcName}</h3>
          )}
        </div>
        
        <div className="p-6 min-h-[140px] cursor-pointer bg-[#2D1B11]" onClick={skipTyping}>
          <p className="text-[#F5DEB3] text-lg leading-relaxed font-medium">
            {displayedText}
            {isTyping && <span className="animate-pulse text-[#DAA520] ml-1">▼</span>}
          </p>
        </div>

        {!isTyping && (
          <div className="p-4 space-y-2 bg-[#1A0F0A]/50 border-t-4 border-[#5C3A21]">
            {node.responses && node.responses.length > 0 ? (
              node.responses.map((response, index) => (
                <Button
                  key={index}
                  onClick={() => onResponse(response.nextId, response.givesQuest)}
                  className="w-full justify-start text-left bg-[#3D2B21] hover:bg-[#4D3B31] border-2 border-[#8B5A2B] hover:border-[#DAA520] text-[#F5DEB3] hover:text-white rounded-sm py-6 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]"
                  variant="outline"
                >
                  <span className="text-[#DAA520] mr-2">▶</span> {response.text}
                </Button>
              ))
            ) : (
              <div className="flex justify-end">
                <Button
                  onClick={onClose}
                  className="bg-[#8B5A2B] hover:bg-[#A0522D] text-white font-bold py-2 px-8 rounded-sm border-2 border-[#5C3A21] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)]"
                >
                  Leave
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
