import { useEffect, useState, type ReactNode } from 'react';
import { CheckCircle2, Info, AlertCircle } from 'lucide-react';
import { getEntries, subscribe, type NotifEntry } from '@/lib/game/notificationBus';

const TYPE_ICON: Record<string, ReactNode> = {
  success: <CheckCircle2 className="w-2.5 h-2.5" />, 
  info: <Info className="w-2.5 h-2.5" />, 
  error: <AlertCircle className="w-2.5 h-2.5" /> 
};
const TYPE_COLOR: Record<string, string> = {
  success: '#DAA520',
  info: '#DAA520',
  error: '#f87171',
};

function relativeTime(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m`;
}

export const NotificationFeed = () => {
  const [entries, setEntries] = useState<NotifEntry[]>(() => getEntries());
  const [now, setNow] = useState(Date.now);

  useEffect(() => subscribe(() => setEntries(getEntries())), []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const visible = entries.slice(0, 3);
  if (visible.length === 0) return null;

  return (
    <div className="bg-[#1A0F0A]/90 backdrop-blur-sm p-2 rounded-sm border-2 border-[#5C3A21] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] font-sans pointer-events-none transition-all"
      style={{ maxWidth: '220px' }}
    >
      <div className="space-y-1.5">
        {visible.map((e) => {
          const ageSec = (now - e.createdAt) / 1000;
          const fadeRatio = Math.max(0, 1 - ageSec / (e.ttl / 1000));
          const opacity = 0.4 + fadeRatio * 0.6;
          return (
            <div
              key={e.uid}
              className="flex items-start gap-1.5"
              style={{ opacity, transition: 'opacity 0.8s' }}
            >
              <span
                className="text-[10px] leading-none mt-[2px] flex-shrink-0"
                style={{ color: TYPE_COLOR[e.type] }}
              >
                {TYPE_ICON[e.type]}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-[#DAA520] text-[10px] font-bold leading-tight truncate block">
                  {e.title}
                </span>
                {e.description && (
                  <span className="text-[#F5DEB3] text-[9px] leading-tight truncate block">
                    {e.description}
                  </span>
                )}
              </div>
              <span className="text-[9px] text-[#5C3A21] flex-shrink-0 tabular-nums leading-tight mt-[1px]">
                {relativeTime(now - e.createdAt)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
