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
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50">
      <div className="max-w-3xl mx-auto bg-background/95 backdrop-blur-sm border-2 border-primary rounded-lg shadow-2xl">
        <div className="p-4 border-b border-border">
          {npcName && (
            <h3 className="font-bold text-lg text-primary">{npcName}</h3>
          )}
        </div>
        
        <div className="p-6 min-h-[120px]" onClick={skipTyping}>
          <p className="text-foreground leading-relaxed">
            {displayedText}
            {isTyping && <span className="animate-pulse">▊</span>}
          </p>
        </div>

        {!isTyping && (
          <div className="p-4 space-y-2 border-t border-border">
            {node.responses && node.responses.length > 0 ? (
              node.responses.map((response, index) => (
                <Button
                  key={index}
                  onClick={() => onResponse(response.nextId, response.givesQuest)}
                  className="w-full justify-start text-left"
                  variant="outline"
                >
                  {response.text}
                </Button>
              ))
            ) : (
              <Button onClick={onClose} className="w-full">
                Close
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
