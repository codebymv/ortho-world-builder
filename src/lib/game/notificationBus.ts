export type NotifType = 'success' | 'info' | 'error';

export interface NotifEntry {
  uid: number;
  id?: string;
  type: NotifType;
  title: string;
  description?: string;
  createdAt: number;
  ttl: number;
}

let _uid = 0;
let _entries: NotifEntry[] = [];
const _subs = new Set<() => void>();
const MAX_HISTORY = 12;
const DEFAULT_TTL = 5000;

export function notify(
  title: string,
  opts?: { id?: string; type?: NotifType; description?: string; duration?: number }
) {
  const dedup = opts?.id;
  const ttl = opts?.duration ?? DEFAULT_TTL;

  if (dedup) {
    const idx = _entries.findIndex(e => e.id === dedup);
    if (idx !== -1) {
      const updated: NotifEntry = {
        ..._entries[idx],
        title,
        description: opts?.description,
        createdAt: Date.now(),
        ttl,
      };
      _entries = [updated, ..._entries.filter((_, i) => i !== idx)].slice(0, MAX_HISTORY);
      _emit();
      return;
    }
  }

  const entry: NotifEntry = {
    uid: _uid++,
    id: dedup,
    type: opts?.type ?? 'info',
    title,
    description: opts?.description,
    createdAt: Date.now(),
    ttl,
  };
  _entries = [entry, ..._entries].slice(0, MAX_HISTORY);
  _emit();

  setTimeout(() => {
    _entries = _entries.filter(e => e.uid !== entry.uid);
    _emit();
  }, ttl + 300);
}

export function getEntries(): NotifEntry[] {
  return [..._entries];
}

export function subscribe(fn: () => void): () => void {
  _subs.add(fn);
  return () => _subs.delete(fn);
}

function _emit() {
  _subs.forEach(fn => fn());
}
