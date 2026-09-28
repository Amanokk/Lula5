/**
 * Conexão TikTok LIVE via tiktok-live-connector (Webcast não oficial).
 * Só importe este módulo de rotas de servidor / hub WebSocket.
 */
import { getLive, pushChat, pushGift, pushGiftStreak, pushLike, setLive } from "./bus.server";

type ConnectionLike = {
  connect: () => Promise<unknown>;
  disconnect: () => Promise<unknown> | unknown;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
};

let connection: ConnectionLike | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnects = 0;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function giftNameOf(data: Record<string, unknown>): string {
  const ext = asRecord(data.extendedGiftInfo);
  const details = asRecord(data.giftDetails);
  const gift = asRecord(data.gift);
  const name =
    (ext.name as string) ||
    (details.giftName as string) ||
    (data.giftName as string) ||
    (gift.name as string) ||
    String(data.giftId ?? "Presente");
  return name;
}

/** Diamantes de 1 unidade — nunca usar repeatCount aqui. */
function diamondsOf(data: Record<string, unknown>): number {
  const ext = asRecord(data.extendedGiftInfo);
  const details = asRecord(data.giftDetails);
  const gift = asRecord(data.gift);
  const n =
    Number(ext.diamond_count) ||
    Number(data.diamondCount) ||
    Number(details.diamondCount) ||
    Number(gift.diamondCount) ||
    Number(gift.diamond_count) ||
    1;
  return Math.max(1, Number.isFinite(n) ? n : 1);
}

function userOf(data: Record<string, unknown>): string {
  const user = asRecord(data.user);
  return (
    (user.uniqueId as string) ||
    (user.nickname as string) ||
    (data.uniqueId as string) ||
    (data.nickname as string) ||
    "viewer"
  );
}

function giftTypeOf(data: Record<string, unknown>): number {
  const gift = asRecord(data.gift);
  const n = Number(data.giftType ?? gift.gift_type ?? gift.giftType ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function repeatCountOf(data: Record<string, unknown>): number {
  const n = Number(data.repeatCount ?? asRecord(data.gift).repeat_count ?? 1);
  return Math.max(1, Number.isFinite(n) ? n : 1);
}

function repeatEndOf(data: Record<string, unknown>): boolean {
  if (data.repeatEnd === true || data.repeatEnd === 1) return true;
  if (data.repeatEnd === false || data.repeatEnd === 0) return false;
  const gift = asRecord(data.gift);
  return gift.repeat_end === 1 || gift.repeat_end === true;
}

async function attach(username: string) {
  const mod = await import("tiktok-live-connector");
  const TikTokLiveConnection = (
    mod as { TikTokLiveConnection: new (u: string, o?: object) => ConnectionLike }
  ).TikTokLiveConnection;
  const WebcastEvent = (mod as { WebcastEvent?: Record<string, string> }).WebcastEvent;

  const conn = new TikTokLiveConnection(username.replace(/^@/, ""), {
    enableExtendedGiftInfo: true,
    processInitialData: false,
  });
  connection = conn;

  const giftEvent = WebcastEvent?.GIFT ?? "gift";
  const chatEvent = WebcastEvent?.CHAT ?? "chat";
  const likeEvent = WebcastEvent?.LIKE ?? "like";
  const roomEvent = WebcastEvent?.ROOM_USER ?? "roomUser";
  const disconnected = WebcastEvent?.DISCONNECTED ?? "disconnected";
  const errorEvent = "error";

  conn.on(giftEvent, (...args: unknown[]) => {
    const data = asRecord(args[0]);
    const payload = {
      sender: userOf(data),
      giftName: giftNameOf(data),
      giftId: (data.giftId as string | number) ?? undefined,
      diamonds: diamondsOf(data),
      repeatCount: repeatCountOf(data),
      source: "tiktok" as const,
    };
    // giftType 1 = streakable. Só aplica dano no repeatEnd (evita N golpes durante a combo).
    if (giftTypeOf(data) === 1 && !repeatEndOf(data)) {
      pushGiftStreak(payload);
      return;
    }
    pushGift(payload);
  });

  conn.on(chatEvent, (...args: unknown[]) => {
    const data = asRecord(args[0]);
    const comment = (data.comment as string) || ((data as { msg?: string }).msg ?? "");
    if (!comment) return;
    pushChat({ sender: userOf(data), comment });
  });

  conn.on(likeEvent, (...args: unknown[]) => {
    const data = asRecord(args[0]);
    const count = Math.max(1, Number(data.likeCount ?? data.count ?? 1) || 1);
    const total = data.totalLikeCount != null ? Number(data.totalLikeCount) : undefined;
    pushLike({
      sender: userOf(data),
      count,
      total: Number.isFinite(total) ? total : undefined,
      source: "tiktok",
    });
  });

  conn.on(roomEvent, (...args: unknown[]) => {
    const data = asRecord(args[0]);
    const viewers = Number(data.viewerCount ?? data.viewer_count ?? data.total ?? 0);
    if (!Number.isFinite(viewers)) return;
    const cur = getLive();
    if (cur.status !== "connected") return;
    setLive({ ...cur, viewers });
  });

  conn.on(disconnected, () => {
    if (getLive().status === "disconnected") return;
    setLive({ status: "reconnecting", username });
    scheduleReconnect(username);
  });

  conn.on(errorEvent, (...args: unknown[]) => {
    const err = args[0];
    const message = err instanceof Error ? err.message : String(err ?? "erro");
    setLive({ status: "error", username, error: message });
  });

  await conn.connect();
  reconnects = 0;
  setLive({ status: "connected", username });
}

function scheduleReconnect(username: string) {
  if (reconnectTimer) return;
  reconnects += 1;
  const wait = Math.min(15000, 1500 * reconnects);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connectTikTok(username).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      setLive({ status: "reconnecting", username, error: message });
      scheduleReconnect(username);
    });
  }, wait);
}

export async function connectTikTok(username: string) {
  const clean = username.replace(/^@/, "").trim();
  if (!clean) throw new Error("Informe o @ do TikTok");
  await disconnectTikTok();
  setLive({ status: "connecting", username: clean });
  try {
    await attach(clean);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setLive({
      status: "error",
      username: clean,
      error:
        message.includes("LIVE") || message.toLowerCase().includes("not found")
          ? "Não encontrei uma live aberta nesse @. Abra a live e tente de novo, ou use o simulador."
          : message,
    });
    throw err;
  }
}

export async function disconnectTikTok() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  const prev = connection;
  connection = null;
  reconnects = 0;
  if (prev) {
    try {
      await prev.disconnect();
    } catch {
      /* already closed */
    }
  }
  setLive({ status: "disconnected", username: getLive().username });
}
