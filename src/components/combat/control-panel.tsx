import { Link } from "@tanstack/react-router";
import { Copy, ExternalLink, Heart, RotateCcw, Send, Unplug, Volume2, Wifi } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CHARACTERS } from "@/lib/combat/characters";
import {
  FLAVIO_GIFTS,
  LULA_GIFTS,
  actionLabel,
  fighterLabel,
  giftLabel,
  giftsFor,
} from "@/lib/combat/gifts";
import { unlockAudio } from "@/lib/combat/audio";
import { postLive, subscribeLive } from "@/lib/combat/live-client";
import { useCombat } from "@/lib/combat/store";
import type { FighterId, GiftAction, GiftMapping, IncomingGift, LikeFighter } from "@/lib/combat/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDesc, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CharacterSelect } from "./character-select";
import { GiftIcon } from "./gift-icons";
import { OverlayStage } from "./overlay-stage";
import { SfxDirector } from "./sfx-director";

export function ControlPanel() {
  const hydrate = useCombat((s) => s.hydrate);
  const applyGift = useCombat((s) => s.applyGift);
  const applyGiftStreak = useCombat((s) => s.applyGiftStreak);
  const applyChat = useCombat((s) => s.applyChat);
  const applyLike = useCombat((s) => s.applyLike);
  const resetFight = useCombat((s) => s.resetFight);
  const setLive = useCombat((s) => s.setLive);
  const live = useCombat((s) => s.live);
  const hydrated = useCombat((s) => s.hydrated);
  const championId = useCombat((s) => s.config.championId);
  const config = useCombat((s) => s.config);
  const [qty, setQty] = useState(1);
  const qtyRef = useRef(qty);
  qtyRef.current = qty;

  const fire = (gift: { id: string; aliases: string[]; diamonds: number }, sender = "Simulação") => {
    unlockAudio();
    const payload: IncomingGift = {
      sender,
      giftName: giftLabel(gift.id) === gift.id ? (gift.aliases[0] ?? gift.id) : giftLabel(gift.id),
      giftId: gift.id,
      diamonds: gift.diamonds,
      repeatCount: qtyRef.current,
      source: "local",
    };
    applyGift(payload);
    void postLive("gift", payload).catch(() => undefined);
  };

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => {
      void postLive("config", useCombat.getState().config).catch(() => undefined);
    }, 400);
    return () => window.clearTimeout(t);
  }, [hydrated, config]);

  useEffect(() => {
    return subscribeLive(
      (ev) => {
        if (ev.type === "status") setLive(ev.live);
        if (ev.type === "hello") setLive(ev.live);
        if (ev.type === "chat") applyChat(ev.chat);
        if (ev.type === "like") applyLike(ev.like);
        if (ev.type === "giftStreak") applyGiftStreak(ev.gift);
        if (ev.type === "reset") resetFight(false);
        if (ev.type === "gift" && ev.gift.source !== "local") applyGift(ev.gift);
      },
      (transport) => setLive({ transport }),
    );
  }, [setLive, applyChat, applyLike, applyGiftStreak, resetFight, applyGift]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const lula = LULA_GIFTS;
      const flavio = FLAVIO_GIFTS;
      if (e.key >= "1" && e.key <= "5") {
        const g = lula[Number(e.key) - 1];
        if (g) fire(g);
      }
      if (e.key >= "6" && e.key <= "9") {
        const g = flavio[Number(e.key) - 6];
        if (g) fire(g);
      }
      if (e.key === "0") {
        const g = flavio[4];
        if (g) fire(g);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [applyGift]);

  return (
    <div className="panel-shell">
      <SfxDirector />
      {hydrated && !championId ? <CharacterSelect /> : null}

      <header className="panel-header">
        <div>
          <p className="panel-kicker">Overlay TikTok LIVE · 9:16</p>
          <h1 className="panel-title">Lula vs Flávio</h1>
        </div>
        <div className="panel-header-actions">
          <LiveBadge />
          <Button asChild variant="secondary" size="sm">
            <Link to="/overlay">
              Palco
              <ExternalLink />
            </Link>
          </Button>
        </div>
      </header>

      <div className="live-layout">
        <div className="phone-frame">
          <OverlayStage />
        </div>

        <div className="live-side">
          <Card className="panel-sim">
            <CardTitle>Mandar presente</CardTitle>
            <CardDesc>
              Cada presente dispara um ataque do lutador mapeado. O dano escala com diamantes; a
              quantidade vira golpes (Rosa ×10 = 10 socos). Curtidas acumulam e também viram golpe.
            </CardDesc>
            <div className="team-sim">
              <TeamColumn fighter="lula" fire={fire} shortcutStart={1} />
              <TeamColumn fighter="flavio" fire={fire} shortcutStart={6} />
            </div>
            <SimExtras qty={qty} setQty={setQty} />
            <CommandRow fire={fire} />
            <ResetRow />
          </Card>

          <Tabs defaultValue="conexao" className="panel-tabs">
            <TabsList>
              <TabsTrigger value="conexao">Conexão</TabsTrigger>
              <TabsTrigger value="elenco">Lutador</TabsTrigger>
              <TabsTrigger value="gifts">Gifts</TabsTrigger>
              <TabsTrigger value="historico">Histórico</TabsTrigger>
              <TabsTrigger value="guia">Guia</TabsTrigger>
            </TabsList>
            <TabsContent value="conexao">
              <ConnectCard />
            </TabsContent>
            <TabsContent value="elenco">
              <RosterCard />
            </TabsContent>
            <TabsContent value="gifts">
              <MappingCard />
            </TabsContent>
            <TabsContent value="historico">
              <HistoryCard />
            </TabsContent>
            <TabsContent value="guia">
              <GuideCard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      {live.status === "error" && live.error ? <p className="panel-error">{live.error}</p> : null}
    </div>
  );
}

function TeamColumn({
  fighter,
  fire,
  shortcutStart,
}: {
  fighter: FighterId;
  fire: (gift: GiftMapping, sender?: string) => void;
  shortcutStart: number;
}) {
  const gifts = giftsFor(fighter);
  const char = CHARACTERS.find((c) => c.id === fighter)!;
  return (
    <div className={`team-col team-${fighter}`}>
      <div className="team-col-head">
        <img src={char.portrait} alt="" crossOrigin="anonymous" />
        <div>
          <strong>{char.name}</strong>
          <small>{fighter === "lula" ? "Teclas 1–5" : "Teclas 6–0"}</small>
        </div>
      </div>
      <div className="team-btns">
        {gifts.map((g, i) => (
          <button
            key={g.id}
            type="button"
            className={`sim-btn sim-${fighter}`}
            onClick={() => fire(g)}
          >
            <span className="sim-key">{(shortcutStart + i) % 10}</span>
            <GiftIcon id={g.id} />
            <span>{giftLabel(g.id)}</span>
            <small>{actionLabel(g.action)}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function SimExtras({ qty, setQty }: { qty: number; setQty: (n: number) => void }) {
  const applyLike = useCombat((s) => s.applyLike);
  const config = useCombat((s) => s.config);
  const likePool = useCombat((s) => s.fight.likePool);
  const likeTotal = useCombat((s) => s.fight.likeTotal);

  const sendLikes = (count: number) => {
    unlockAudio();
    const payload = { sender: "Chat", count, source: "local" as const };
    applyLike(payload);
    void postLive("like", payload).catch(() => undefined);
  };

  return (
    <div className="sim-extras">
      <div className="qty-block">
        <Label htmlFor="qty">Quantidade</Label>
        <Input
          id="qty"
          type="number"
          min={1}
          max={99}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.min(99, Number(e.target.value) || 1)))}
        />
      </div>
      <Button type="button" variant="secondary" onClick={() => sendLikes(config.likesPerHit)}>
        <Heart />
        {config.likesPerHit} curtidas
      </Button>
      <p className="hint like-hint">
        Combo {likePool}/{config.likesPerHit} · total {likeTotal}
      </p>
    </div>
  );
}

function CommandRow({
  fire,
}: {
  fire: (gift: { id: string; aliases: string[]; diamonds: number }, sender?: string) => void;
}) {
  const [cmd, setCmd] = useState("");
  const [who, setWho] = useState("Chat");

  const send = () => {
    const name = cmd.trim();
    if (!name) return;
    fire({ id: name, aliases: [name], diamonds: 1 }, who.trim() || "Chat");
    setCmd("");
  };

  return (
    <form
      className="cmd-row"
      onSubmit={(e) => {
        e.preventDefault();
        send();
      }}
    >
      <div className="cmd-who">
        <Label htmlFor="who">Quem mandou</Label>
        <Input id="who" value={who} onChange={(e) => setWho(e.target.value)} />
      </div>
      <div className="cmd-gift">
        <Label htmlFor="cmd">Presente ou comando</Label>
        <Input
          id="cmd"
          value={cmd}
          placeholder="rosa, capivara, fogos…"
          onChange={(e) => setCmd(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={!cmd.trim()}>
        <Send />
        Mandar
      </Button>
    </form>
  );
}

function LiveBadge() {
  const live = useCombat((s) => s.live);
  const tone =
    live.status === "connected"
      ? "ok"
      : live.status === "connecting" || live.status === "reconnecting"
        ? "warn"
        : live.status === "error"
          ? "live"
          : "neutral";
  const text = {
    disconnected: "Desconectado",
    connecting: "Conectando",
    connected: "Ao vivo",
    reconnecting: "Reconectando",
    error: "Erro",
  }[live.status];
  return (
    <Badge tone={tone}>
      <span className={`live-dot ${live.status}`} />
      {text}
      {live.username ? ` · @${live.username}` : ""}
      {live.transport === "ws" ? " · WS" : live.transport === "sse" ? " · SSE" : ""}
    </Badge>
  );
}

function ResetRow() {
  const resetFight = useCombat((s) => s.resetFight);
  const patch = useCombat((s) => s.patchConfig);
  const sfx = useCombat((s) => s.config.sfxVolume);
  const crowd = useCombat((s) => s.config.crowdVolume);
  const shake = useCombat((s) => s.config.shakeEnabled);

  const hardReset = () => {
    unlockAudio();
    resetFight(false);
    void postLive("reset").catch(() => undefined);
  };

  return (
    <div className="reset-row">
      <Button variant="danger" onClick={hardReset}>
        <RotateCcw />
        Resetar luta
      </Button>
      <div className="vol-block">
        <Label htmlFor="sfx">
          <Volume2 className="inline size-3.5" /> Efeitos
        </Label>
        <input
          id="sfx"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={sfx}
          onChange={(e) => patch({ sfxVolume: Number(e.target.value) })}
        />
      </div>
      <div className="vol-block">
        <Label htmlFor="crowd">Plateia</Label>
        <input
          id="crowd"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={crowd}
          onChange={(e) => patch({ crowdVolume: Number(e.target.value) })}
        />
      </div>
      <label className="chk">
        <input type="checkbox" checked={shake} onChange={(e) => patch({ shakeEnabled: e.target.checked })} />
        Shake
      </label>
    </div>
  );
}

function ConnectCard() {
  const config = useCombat((s) => s.config);
  const patch = useCombat((s) => s.patchConfig);
  const setLive = useCombat((s) => s.setLive);
  const live = useCombat((s) => s.live);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  const overlayUrl = useMemo(() => {
    if (typeof window === "undefined") return "/overlay?transparent=1";
    return `${window.location.origin}/overlay?transparent=1`;
  }, []);

  const connect = async () => {
    unlockAudio();
    setPending(true);
    setLive({ status: "connecting", username: config.tiktokUser, error: undefined });
    try {
      await postLive("connect", { username: config.tiktokUser });
    } catch (err) {
      setLive({
        status: "error",
        username: config.tiktokUser,
        error: err instanceof Error ? err.message : "Falha ao conectar",
      });
    } finally {
      setPending(false);
    }
  };

  const disconnect = async () => {
    setPending(true);
    try {
      await postLive("disconnect");
      setLive({ status: "disconnected" });
    } finally {
      setPending(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(overlayUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <Card>
      <CardTitle>Conexão direta TikTok LIVE</CardTitle>
      <CardDesc>
        Backend Node + WebSocket: presentes, comentários e curtidas em tempo real. Sem TikFinity
        obrigatório — o simulador funciona mesmo sem live aberta.
      </CardDesc>
      <div className="connect-row">
        <div className="grow">
          <Label htmlFor="user">Usuário</Label>
          <div className="at-field">
            <span>@</span>
            <Input
              id="user"
              value={config.tiktokUser}
              placeholder="seuusuario"
              autoCapitalize="off"
              autoCorrect="off"
              onChange={(e) => patch({ tiktokUser: e.target.value.replace(/^@/, "") })}
            />
          </div>
        </div>
        {live.status === "connected" || live.status === "reconnecting" ? (
          <Button variant="secondary" onClick={() => void disconnect()} disabled={pending}>
            <Unplug />
            Sair
          </Button>
        ) : (
          <Button onClick={() => void connect()} disabled={pending || !config.tiktokUser.trim()}>
            <Wifi />
            {pending ? "Conectando…" : "Conectar"}
          </Button>
        )}
      </div>
      <div className="overlay-link-row">
        <Label>Fonte do OBS / palco</Label>
        <div className="at-field">
          <Input readOnly value={overlayUrl} />
          <Button variant="secondary" size="icon" onClick={() => void copy()} aria-label="Copiar URL">
            <Copy />
          </Button>
        </div>
        <p className="hint">{copied ? "Copiado." : "1080×1920 (9:16). Marque fundo transparente no OBS."}</p>
      </div>
      <LikesConfig />
    </Card>
  );
}

function LikesConfig() {
  const config = useCombat((s) => s.config);
  const patch = useCombat((s) => s.patchConfig);

  return (
    <div className="likes-config">
      <label className="chk">
        <input
          type="checkbox"
          checked={config.likesEnabled}
          onChange={(e) => patch({ likesEnabled: e.target.checked })}
        />
        Curtidas viram golpe
      </label>
      <div>
        <Label htmlFor="likes-n">Curtidas por golpe</Label>
        <Input
          id="likes-n"
          type="number"
          min={1}
          max={9999}
          value={config.likesPerHit}
          onChange={(e) => patch({ likesPerHit: Math.max(1, Number(e.target.value) || 50) })}
        />
      </div>
      <div>
        <Label htmlFor="like-dmg">Dano da curtida</Label>
        <Input
          id="like-dmg"
          type="number"
          min={1}
          max={200}
          value={config.likeDamage}
          onChange={(e) => patch({ likeDamage: Math.max(1, Number(e.target.value) || 6) })}
        />
      </div>
      <div>
        <Label htmlFor="like-who">Quem ataca</Label>
        <select
          id="like-who"
          className="sel"
          value={config.likeFighter}
          onChange={(e) => patch({ likeFighter: e.target.value as LikeFighter })}
        >
          <option value="champion">Lutador da esquerda</option>
          <option value="lula">Lula</option>
          <option value="flavio">Flávio</option>
        </select>
      </div>
    </div>
  );
}

function RosterCard() {
  const config = useCombat((s) => s.config);
  const pickChampion = useCombat((s) => s.pickChampion);

  return (
    <Card>
      <CardTitle>Quem fica à esquerda</CardTitle>
      <CardDesc>
        Os presentes continuam ligados ao lutador: Rosa sempre ataca com o Lula, mesmo se ele
        estiver à direita.
      </CardDesc>
      <div className="skin-list champ-list">
        {CHARACTERS.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`skin ${config.championId === c.id ? "is-on" : ""}`}
            onClick={() => {
              unlockAudio();
              pickChampion(c.id);
              void postLive("config", { ...useCombat.getState().config, championId: c.id }).catch(
                () => undefined,
              );
            }}
          >
            <img src={c.portrait} alt="" crossOrigin="anonymous" />
            <span>
              {c.name}
              <small className="block text-muted font-normal normal-case tracking-normal">
                {c.subtitle}
              </small>
            </span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function MappingCard() {
  const gifts = useCombat((s) => s.config.gifts);
  const setGifts = useCombat((s) => s.setGifts);

  const update = (id: string, patch: Partial<GiftMapping>) => {
    setGifts(gifts.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  };

  const add = () => {
    setGifts([
      ...gifts,
      {
        id: `custom-${Date.now()}`,
        aliases: ["novo gift"],
        action: "punch",
        fighter: "flavio",
        damage: 10,
        hits: 1,
        diamonds: 1,
      },
    ]);
  };

  return (
    <Card>
      <CardTitle>Mapeamento de presentes</CardTitle>
      <CardDesc>
        Cada gift pertence a um lutador. Dano final = dano × (diamantes recebidos ÷ diamantes do
        mapa) × quantidade. Aliases aceitam nome ou ID numérico. Sem mapa, o Flávio ataca (2 por
        diamante).
      </CardDesc>
      <ScrollArea className="map-scroll">
        <div className="map-list">
          {gifts.map((g) => (
            <div key={g.id} className="map-row">
              <GiftIcon id={g.id} className="mt-2" />
              <Input
                value={g.aliases.join(", ")}
                onChange={(e) =>
                  update(g.id, {
                    aliases: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
              <select
                className="sel"
                value={g.action}
                onChange={(e) => update(g.id, { action: e.target.value as GiftAction })}
              >
                <option value="punch">Golpe</option>
                <option value="special">Especial</option>
                <option value="combo">Combo</option>
                <option value="buff">Buff de dano</option>
                <option value="spectacle">Efeito de tela</option>
              </select>
              <select
                className="sel"
                value={g.fighter}
                onChange={(e) => update(g.id, { fighter: e.target.value as FighterId })}
              >
                <option value="lula">Lula</option>
                <option value="flavio">Flávio</option>
              </select>
              <Input
                type="number"
                aria-label="Dano"
                value={g.damage}
                onChange={(e) => update(g.id, { damage: Number(e.target.value) || 0 })}
              />
              <Input
                type="number"
                aria-label="Diamantes"
                value={g.diamonds}
                onChange={(e) => update(g.id, { diamonds: Number(e.target.value) || 1 })}
              />
              <Input
                type="number"
                aria-label="Hits"
                value={g.hits}
                onChange={(e) => update(g.id, { hits: Number(e.target.value) || 1 })}
              />
            </div>
          ))}
        </div>
      </ScrollArea>
      <p className="hint">Colunas: aliases · ação · lutador · dano · diamantes · hits</p>
      <Button variant="secondary" size="sm" className="mt-3" onClick={add}>
        Adicionar gift
      </Button>
    </Card>
  );
}

function HistoryCard() {
  const feed = useCombat((s) => s.fight.feed);
  const leftId = useCombat((s) => s.config.leftId);
  return (
    <Card>
      <CardTitle>Histórico desta live</CardTitle>
      <CardDesc>Presentes recebidos (simulados ou reais) nesta sessão.</CardDesc>
      {feed.length === 0 ? (
        <p className="empty">Nenhum presente ainda. Mande uma Rosa para o Lula atacar.</p>
      ) : (
        <ul className="hist">
          {feed.map((f) => {
            const who = f.side === "left" ? leftId : leftId === "lula" ? "flavio" : "lula";
            return (
              <li key={f.id}>
                <span className={who === "lula" ? "text-lula" : "text-flavio"}>{f.sender}</span>
                <span>{f.giftName}</span>
                <span className="text-muted">
                  {fighterLabel(who === "flavio" ? "flavio" : "lula")} · {f.actionLabel}
                  {f.damage ? ` · ${f.damage}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function GuideCard() {
  return (
    <Card className="guide">
      <CardTitle>Como usar na live</CardTitle>
      <ol>
        <li>Lula e Flávio já estão no palco em posição de luta. Troque o lado em Lutador se quiser.</li>
        <li>
          <strong>Lula:</strong> Rosa, Coração, Rosquinha, Perfume, Galáxia.
        </li>
        <li>
          <strong>Flávio:</strong> Rosa branca, Mini Dino, Óculos, Capivara, Fogos. Qualquer gift
          fora da lista também é golpe do Flávio.
        </li>
        <li>
          O dano escala com diamantes. Quantidade/repetição: Rosa ×10 vira 10 golpes; especiais
          somam o valor num único impacto.
        </li>
        <li>
          Curtidas acumulam. A cada N curtidas (ajuste em Conexão) o lutador escolhido ataca.
        </li>
        <li>Teste pelos botões, teclas 1–0, quantidade, ou digitando o nome do presente.</li>
        <li>
          Copie a URL do palco e cole no OBS como fonte de navegador, <strong>1080×1920</strong>,
          com fundo transparente.
        </li>
        <li>Abra a live no TikTok, digite o @ e clique em Conectar (WebSocket em tempo real).</li>
      </ol>
      <CardTitle className="mt-6">TikFinity / webhook</CardTitle>
      <p className="text-sm text-muted text-pretty">
        POST em <code>/api/live/webhook</code> com JSON
        <code> {"{ uniqueId, giftName, diamondCount, repeatCount }"}</code> ou
        <code> {"{ event: \"like\", uniqueId, likeCount }"}</code>.
      </p>
    </Card>
  );
}
