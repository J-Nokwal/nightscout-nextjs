import { subscribe } from "@/lib/sse/broadcaster";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  // Hoisted so cancel() can clear it — otherwise the interval outlives the stream
  let hb: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\n"));

      unsubscribe = subscribe((payload) => {
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          // Controller closed — let cancel() handle cleanup
        }
      });

      hb = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          // Controller closed between ticks; cancel() will clear the interval
        }
      }, 30_000);
    },
    cancel() {
      if (hb) clearInterval(hb);
      if (unsubscribe) unsubscribe();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
