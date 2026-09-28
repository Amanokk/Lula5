import type { BusEvent, LiveTransport } from "./types";

type Handler = (ev: BusEvent) => void;

function wsUrl() {
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/api/live/ws`;
}

/**
 * Prefere WebSocket do hub Node; cai para SSE se o upgrade falhar
 * (preview serverless / proxy sem WS).
 */
export function subscribeLive(
  onEvent: Handler,
  onTransport?: (t: LiveTransport) => void,
): () => void {
  let closed = false;
  let es: EventSource | null = null;
  let ws: WebSocket | null = null;
  let ping: ReturnType<typeof setInterval> | undefined;
  let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

  const dispatch = (ev: BusEvent) => {
    if (!closed) onEvent(ev);
  };

  const parse = (raw: string) => {
    try {
      const data = JSON.parse(raw) as BusEvent | { type?: string };
      if (!data || data.type === "ping" || !("type" in data) || !data.type) return;
      dispatch(data as BusEvent);
    } catch {
      /* ignore malformed */
    }
  };

  const startSse = () => {
    if (closed || es) return;
    es = new EventSource("/api/live/events");
    es.onmessage = (msg) => parse(msg.data);
    onTransport?.("sse");
  };

  const startWs = () => {
    try {
      ws = new WebSocket(wsUrl());
    } catch {
      startSse();
      return;
    }

    fallbackTimer = setTimeout(() => {
      if (closed) return;
      if (ws && ws.readyState !== WebSocket.OPEN) {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        ws = null;
        startSse();
      }
    }, 1800);

    ws.onopen = () => {
      if (fallbackTimer) clearTimeout(fallbackTimer);
      onTransport?.("ws");
      ping = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) ws.send("ping");
      }, 20000);
    };

    ws.onmessage = (msg) => parse(String(msg.data));

    ws.onerror = () => {
      if (closed) return;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      if (!es) startSse();
    };

    ws.onclose = () => {
      if (ping) clearInterval(ping);
      if (closed) return;
      if (!es) startSse();
    };
  };

  startWs();

  return () => {
    closed = true;
    if (fallbackTimer) clearTimeout(fallbackTimer);
    if (ping) clearInterval(ping);
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
    es?.close();
  };
}

export async function postLive(action: string, body?: unknown) {
  const res = await fetch(`/api/live/${action}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
  if (!res.ok) throw new Error(json.error || `Falha em ${action}`);
  return json;
}

export async function getLiveStatus() {
  const res = await fetch("/api/live/status");
  return (await res.json()) as { live: { status: string; username: string; error?: string } };
}
