import { useEffect, useState } from 'react';
import { getEntries, subscribe, type NotifEntry } from '@/lib/game/notificationBus';

const TYPE_ICON: Record<string, string> = { success: '✦', info: '●', error: '✗' };
const TYPE_COLOR: Record<string, string> = {
  success: '#4ade80',
  info: '#93c5fd',
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
    <div className="bg-[#1A0F0A]/90 backdrop-blur-sm p-2 rounded-sm border-2 border-[#5C3A21] shadow-lg font-sans pointer-events-none"
      style={{ maxWidth: '220px' }}
    >
      <p className="text-[9px] text-[#DAA520]/80 uppercase tracking-wider font-bold mb-1.5">Recent</p>
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
                <span className="text-[#F5DEB3] text-[10px] font-semibold leading-tight truncate block">
                  {e.title}
                </span>
                {e.description && (
                  <span className="text-[#8D6E63] text-[9px] leading-tight truncate block">
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
