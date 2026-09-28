/**
 * Barramento in-memory da live: TikTok LIVE (Node), painel, overlay OBS e webhook.
 * Clientes WebSocket + SSE no mesmo processo (globalThis sobrevive a HMR).
 *
 * Em hospedagem serverless o estado não persiste entre instâncias — o simulador
 * do painel continua funcionando 100% no cliente.
 */
import type {
  AppConfig,
  BusEvent,
  IncomingChat,
  IncomingGift,
  IncomingLike,
  LiveSnapshot,
} from "./types";
import { defaultConfig } from "./gifts";

type SseClient = ReadableStreamDefaultController<Uint8Array>;

export interface WsLike {
  readyState: number;
  send: (data: string) => void;
  close?: () => void;
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
}

const WS_OPEN = 1;

type Hub = {
  live: LiveSnapshot;
  config: AppConfig;
  sse: Set<SseClient>;
  ws: Set<WsLike>;
};

function hub(): Hub {
  const g = globalThis as typeof globalThis & { __lulaLiveHub?: Hub };
  if (!g.__lulaLiveHub) {
    g.__lulaLiveHub = {
      live: { status: "disconnected", username: "" },
      config: defaultConfig(),
      sse: new Set(),
      ws: new Set(),
    };
  }
  return g.__lulaLiveHub;
}

const encoder = new TextEncoder();

export function getLive() {
  return hub().live;
}

export function setLive(next: LiveSnapshot) {
  const h = hub();
  h.live = { ...h.live, ...next };
  broadcast({ type: "status", live: h.live });
}

export function getBusConfig() {
  return hub().config;
}

export function setBusConfig(next: AppConfig) {
  hub().config = next;
  broadcast({ type: "config", config: next });
}

export function broadcast(event: BusEvent) {
  const h = hub();
  const json = JSON.stringify(event);
  const ssePayload = encoder.encode(`data: ${json}\n\n`);
  for (const client of h.sse) {
    try {
      client.enqueue(ssePayload);
    } catch {
      h.sse.delete(client);
    }
  }
  for (const client of h.ws) {
    try {
      if (client.readyState === WS_OPEN) client.send(json);
      else h.ws.delete(client);
    } catch {
      h.ws.delete(client);
    }
  }
}

export function subscribe(client: SseClient) {
  hub().sse.add(client);
}

export function unsubscribe(client: SseClient) {
  hub().sse.delete(client);
}

export function helloEvent(): BusEvent {
  const h = hub();
  return { type: "hello", live: h.live, config: h.config };
}

export function attachWsClient(ws: WsLike) {
  const h = hub();
  h.ws.add(ws);
  try {
    if (ws.readyState === WS_OPEN) ws.send(JSON.stringify(helloEvent()));
  } catch {
    h.ws.delete(ws);
    return;
  }

  const drop = () => {
    h.ws.delete(ws);
  };

  if (typeof ws.on === "function") {
    ws.on("close", drop);
    ws.on("error", drop);
    ws.on("message", (raw: unknown) => {
      void handleWsMessage(raw);
    });
  }
}

async function handleWsMessage(raw: unknown) {
  let text = "";
  if (typeof raw === "string") text = raw;
  else if (raw instanceof ArrayBuffer) text = new TextDecoder().decode(raw);
  else if (ArrayBuffer.isView(raw)) {
    text = new TextDecoder().decode(raw);
  } else if (raw != null) text = String(raw);
  if (!text || text === "ping") return;

  let msg: { type?: string } & Record<string, unknown>;
  try {
    msg = JSON.parse(text) as { type?: string } & Record<string, unknown>;
  } catch {
    return;
  }

  if (msg.type === "gift") {
    pushGift({
      sender: String(msg.sender ?? "viewer"),
      giftName: String(msg.giftName ?? "gift"),
      giftId: (msg.giftId as string | number | undefined) ?? undefined,
      diamonds: Number(msg.diamonds ?? 1) || 1,
      repeatCount: Number(msg.repeatCount ?? 1) || 1,
      source: (msg.source as IncomingGift["source"]) ?? "local",
    });
    return;
  }
  if (msg.type === "like") {
    pushLike({
      sender: String(msg.sender ?? "viewer"),
      count: Math.max(1, Number(msg.count ?? 1) || 1),
      total: msg.total != null ? Number(msg.total) : undefined,
      source: (msg.source as IncomingLike["source"]) ?? "local",
    });
    return;
  }
  if (msg.type === "chat") {
    pushChat({ sender: String(msg.sender ?? "chat"), comment: String(msg.comment ?? "") });
    return;
  }
  if (msg.type === "reset") {
    pushReset();
    return;
  }
  if (msg.type === "config") {
    setBusConfig(msg as unknown as AppConfig);
    return;
  }
  if (msg.type === "connect") {
    const username = String(msg.username ?? "").replace(/^@/, "").trim();
    try {
      const { connectTikTok } = await import("./tiktok.server");
      await connectTikTok(username);
    } catch {
      /* status already set */
    }
    return;
  }
  if (msg.type === "disconnect") {
    const { disconnectTikTok } = await import("./tiktok.server");
    await disconnectTikTok();
  }
}

export function pushGift(gift: IncomingGift) {
  broadcast({ type: "gift", gift });
}

export function pushGiftStreak(gift: IncomingGift) {
  broadcast({ type: "giftStreak", gift: { ...gift, streak: true } });
}

export function pushChat(chat: IncomingChat) {
  broadcast({ type: "chat", chat });
}

export function pushLike(like: IncomingLike) {
  broadcast({ type: "like", like });
}

export function pushReset() {
  broadcast({ type: "reset" });
}

export function ssePing() {
  const payload = encoder.encode(`: ping\n\n`);
  const h = hub();
  for (const client of h.sse) {
    try {
      client.enqueue(payload);
    } catch {
      h.sse.delete(client);
    }
  }
  const ping = JSON.stringify({ type: "ping" });
  for (const client of h.ws) {
    try {
      if (client.readyState === WS_OPEN) client.send(ping);
      else h.ws.delete(client);
    } catch {
      h.ws.delete(client);
    }
  }
}

export function wsClientCount() {
  return hub().ws.size;
}
