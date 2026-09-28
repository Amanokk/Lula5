import { WebSocketServer } from "ws";

/**
 * Attaches a Node.js WebSocket hub to the Vite HTTP server on /api/live/ws.
 * Must ignore every other upgrade (Vite HMR uses its own WebSocket).
 *
 * @returns {import("vite").Plugin}
 */
export function liveWsPlugin() {
  const attach = (httpServer, loadHub) => {
    if (!httpServer || httpServer.__lulaLiveWs) return;
    httpServer.__lulaLiveWs = true;
    const wss = new WebSocketServer({ noServer: true });
    httpServer.on("upgrade", (req, socket, head) => {
      const path = (req.url ?? "").split("?")[0];
      if (path !== "/api/live/ws") return;
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    });
    wss.on("connection", (ws) => {
      void Promise.resolve(loadHub())
        .then((mod) => {
          if (mod && typeof mod.attachWsClient === "function") {
            mod.attachWsClient(ws);
          } else {
            ws.close();
          }
        })
        .catch((err) => {
          console.error("[lula-live-ws] failed to attach client", err);
          try {
            ws.close();
          } catch {
            /* ignore */
          }
        });
    });
  };

  return {
    name: "lula-live-ws",
    configureServer(server) {
      const setup = () => {
        attach(server.httpServer, () => server.ssrLoadModule("/src/lib/combat/bus.server.ts"));
      };
      setup();
      return setup;
    },
    configurePreviewServer(server) {
      const setup = () => {
        attach(server.httpServer, () => server.ssrLoadModule("/src/lib/combat/bus.server.ts"));
      };
      setup();
      return setup;
    },
  };
}
