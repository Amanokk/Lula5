import { createFileRoute } from "@tanstack/react-router";
import {
  getBusConfig,
  getLive,
  helloEvent,
  pushChat,
  pushGift,
  pushLike,
  pushReset,
  setBusConfig,
  subscribe,
  unsubscribe,
} from "@/lib/combat/bus.server";
import type { AppConfig, IncomingGift, IncomingLike } from "@/lib/combat/types";

const encoder = new TextEncoder();

export const Route = createFileRoute("/api/live/$action")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const action = params.action;
        if (action === "ws") {
          return new Response("Upgrade Required — use WebSocket on /api/live/ws", {
            status: 426,
            headers: { upgrade: "websocket" },
          });
        }
        if (action === "events") {
          let ping: ReturnType<typeof setInterval> | undefined;
          let current: ReadableStreamDefaultController<Uint8Array> | undefined;
          const stream = new ReadableStream<Uint8Array>({
            start(controller) {
              current = controller;
              subscribe(controller);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(helloEvent())}\n\n`));
              ping = setInterval(() => {
                try {
                  controller.enqueue(encoder.encode(`: ping\n\n`));
                } catch {
                  if (ping) clearInterval(ping);
                  unsubscribe(controller);
                }
              }, 20000);
            },
            cancel() {
              if (ping) clearInterval(ping);
              if (current) unsubscribe(current);
            },
          });
          return new Response(stream, {
            headers: {
              "content-type": "text/event-stream; charset=utf-8",
              "cache-control": "no-cache, no-transform",
              connection: "keep-alive",
            },
          });
        }
        if (action === "status" || action === "config") {
          return Response.json({ live: getLive(), config: getBusConfig() });
        }
        return Response.json({ error: "unknown" }, { status: 404 });
      },
      POST: async ({ params, request }) => {
        const action = params.action;
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

        if (action === "connect") {
          const username = String(body.username ?? "").replace(/^@/, "").trim();
          try {
            const { connectTikTok } = await import("@/lib/combat/tiktok.server");
            await connectTikTok(username);
            return Response.json({ ok: true, live: getLive() });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return Response.json({ error: message, live: getLive() }, { status: 400 });
          }
        }

        if (action === "disconnect") {
          const { disconnectTikTok } = await import("@/lib/combat/tiktok.server");
          await disconnectTikTok();
          return Response.json({ ok: true, live: getLive() });
        }

        if (action === "gift") {
          const gift: IncomingGift = {
            sender: String(body.sender ?? "viewer"),
            giftName: String(body.giftName ?? "gift"),
            giftId: (body.giftId as string | number | undefined) ?? undefined,
            diamonds: Number(body.diamonds ?? 1) || 1,
            repeatCount: Number(body.repeatCount ?? 1) || 1,
            source: (body.source as IncomingGift["source"]) ?? "local",
          };
          pushGift(gift);
          return Response.json({ ok: true });
        }

        if (action === "like") {
          const like: IncomingLike = {
            sender: String(body.sender ?? "viewer"),
            count: Math.max(1, Number(body.count ?? body.likeCount ?? 1) || 1),
            total: body.total != null ? Number(body.total) : undefined,
            source: (body.source as IncomingLike["source"]) ?? "local",
          };
          pushLike(like);
          return Response.json({ ok: true });
        }

        if (action === "reset") {
          pushReset();
          return Response.json({ ok: true });
        }

        if (action === "config") {
          setBusConfig(body as unknown as AppConfig);
          return Response.json({ ok: true });
        }

        if (action === "webhook") {
          const event = String(body.event ?? body.type ?? "").toLowerCase();
          const giftName = String(body.giftName ?? body.name ?? body.gift ?? "");
          const comment = String(body.comment ?? body.message ?? "");
          const sender = String(body.uniqueId ?? body.nickname ?? body.sender ?? "viewer");
          const likeCount = Number(body.likeCount ?? body.likes ?? body.count ?? 0);
          if (event === "like" || (!giftName && likeCount > 0 && event !== "chat")) {
            pushLike({
              sender,
              count: Math.max(1, likeCount || 1),
              total: body.totalLikeCount != null ? Number(body.totalLikeCount) : undefined,
              source: "webhook",
            });
          } else if (giftName) {
            pushGift({
              sender,
              giftName,
              giftId: (body.giftId as string | number | undefined) ?? undefined,
              diamonds: Number(body.diamondCount ?? body.diamonds ?? 1) || 1,
              repeatCount: Number(body.repeatCount ?? body.repeat_count ?? 1) || 1,
              source: "webhook",
            });
          } else if (comment) {
            pushChat({ sender, comment });
          }
          return Response.json({ ok: true });
        }

        return Response.json({ error: "unknown" }, { status: 404 });
      },
    },
  },
});
