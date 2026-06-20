// In-memory SSE broadcaster — single-server only.
// When new CGM data is posted, call broadcast() to push an event to all connected clients.

type Listener = (data: string) => void;

const listeners = new Set<Listener>();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function broadcast(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const fn of listeners) {
    try { fn(payload); } catch { /* client disconnected */ }
  }
}
