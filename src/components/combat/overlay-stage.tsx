import { useEffect, useRef, useState } from "react";
import { ALL_SPRITE_URLS, getCharacter, spriteUrl } from "@/lib/combat/characters";
import { spriteFrame } from "@/lib/combat/engine";
import { FLAVIO_GIFTS, LULA_GIFTS, giftLabel } from "@/lib/combat/gifts";
import { useCombat } from "@/lib/combat/store";
import type { Side } from "@/lib/combat/types";
import { cn } from "@/lib/utils";
import { GiftFxLayer } from "./gift-fx";

const BASE_W = 1080;
const BASE_H = 1920;

export function OverlayStage({
  transparent,
  interactive = false,
  className,
}: {
  transparent?: boolean;
  interactive?: boolean;
  className?: string;
}) {
  const config = useCombat((s) => s.config);
  const fight = useCombat((s) => s.fight);
  const live = useCombat((s) => s.live);
  const tick = useCombat((s) => s.tick);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.35);
  const last = useRef(0);

  const showArena = !(transparent ?? config.transparent);

  useEffect(() => {
    ALL_SPRITE_URLS.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      setScale(Math.min(r.width / BASE_W, r.height / BASE_H));
    };
    fit();
    const obs = new ResizeObserver(fit);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    last.current = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last.current) / 1000);
      last.current = now;
      tick(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [tick]);

  const reduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const shakeAmt = reduced || !config.shakeEnabled ? 0 : fight.trauma * fight.trauma;
  const sx = (noise(fight.trauma * 12.1) - 0.5) * 22 * shakeAmt;
  const sy = (noise(fight.trauma * 9.4 + 20) - 0.5) * 16 * shakeAmt;
  const rot = (noise(fight.trauma * 7.2 + 40) - 0.5) * 1.4 * shakeAmt;

  const left = getCharacter(config.leftId);
  const right = getCharacter(config.rightId);

  return (
    <div ref={wrapRef} className={cn("relative h-full w-full overflow-hidden", className)}>
      <div
        className="fight-stage absolute left-1/2 top-1/2 origin-center"
        style={{
          width: BASE_W,
          height: BASE_H,
          transform: `translate(-50%, -50%) scale(${scale}) translate(${sx}px, ${sy}px) rotate(${rot}deg)`,
        }}
      >
        {showArena ? (
          <img
            src="/arena/stage.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            crossOrigin="anonymous"
          />
        ) : null}
        <div className="stage-vignette" />
        {fight.spectacle > 0 ? <div className="stage-galaxy" style={{ opacity: fight.spectacle }} /> : null}

        <Hud />

        <FighterView side="left" />
        <FighterView side="right" />

        {fight.particles.map((p) => (
          <span
            key={p.id}
            className={cn("particle", `particle-${p.color}`)}
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size * 2,
              height: p.size * 2,
              opacity: p.life / p.maxLife,
            }}
          />
        ))}

        {fight.floaters.map((f) => (
          <div
            key={f.id}
            className={cn("floater", f.side === "left" ? "text-lula" : "text-fg")}
            style={{ left: `${f.x}%`, top: `${f.y}%`, opacity: f.life / f.maxLife }}
          >
            {f.text}
          </div>
        ))}

        <GiftFxLayer />

        {fight.callout ? (
          <div className="gift-callout">
            <span className="gift-callout-user">{fight.callout.sender}</span>
            <span className="gift-callout-gift">enviou {fight.callout.giftName}</span>
          </div>
        ) : null}

        <GiftFeed />
        <ChatTicker />

        <GiftLegend />

        <div className="hit-counter">
          <span className="hit-counter-label">Golpes</span>
          <span className="hit-counter-num tabular-nums">{fight.hits}</span>
        </div>

        {fight.combo > 1 ? (
          <div className="combo-pop">
            <span className="tabular-nums">{fight.combo}</span> HIT
          </div>
        ) : null}

        <div className="live-chip">
          <span className={cn("live-dot", live.status)} />
          {live.status === "connected"
            ? `@${live.username}`
            : live.status === "connecting" || live.status === "reconnecting"
              ? live.status === "reconnecting"
                ? "Reconectando"
                : "Conectando"
              : "Simulador"}
          {live.viewers ? ` · ${live.viewers}` : ""}
        </div>

        <LikeMeter />

        {fight.ko ? (
          <KoBanner loser={fight.ko === "left" ? left.name : right.name} resetIn={fight.resetIn} />
        ) : null}

        {fight.screenFlash > 0 ? (
          <div className="screen-flash" style={{ opacity: fight.screenFlash * 0.55 }} />
        ) : null}

        {interactive ? <div className="pointer-events-none absolute inset-0" /> : null}
      </div>
    </div>
  );
}

function Hud() {
  const config = useCombat((s) => s.config);
  const fight = useCombat((s) => s.fight);
  const left = getCharacter(config.leftId);
  const right = getCharacter(config.rightId);
  return (
    <div className="hud-top">
      <HpBlock
        side="left"
        name={left.name}
        sub={left.subtitle}
        hp={fight.left.hp}
        max={config.maxHp}
        energy={fight.left.energy}
        maxEnergy={config.maxEnergy}
        portrait={left.portrait}
        buff={fight.left.buffUntil > 0}
      />
      <div className="vs-badge">
        <span>VS</span>
        <small>ROUND {fight.round}</small>
      </div>
      <HpBlock
        side="right"
        name={right.name}
        sub={right.subtitle}
        hp={fight.right.hp}
        max={config.maxHp}
        energy={fight.right.energy}
        maxEnergy={config.maxEnergy}
        portrait={right.portrait}
        buff={fight.right.buffUntil > 0}
      />
    </div>
  );
}

function HpBlock({
  side,
  name,
  sub,
  hp,
  max,
  energy,
  maxEnergy,
  portrait,
  buff,
}: {
  side: Side;
  name: string;
  sub: string;
  hp: number;
  max: number;
  energy: number;
  maxEnergy: number;
  portrait: string;
  buff: boolean;
}) {
  const pct = Math.max(0, (hp / max) * 100);
  const epct = Math.max(0, (energy / maxEnergy) * 100);
  return (
    <div className={cn("hp-block", side)}>
      <img src={portrait} alt="" className="hp-avatar" crossOrigin="anonymous" />
      <div className="hp-meta">
        <div className="hp-names">
          <strong>{name}</strong>
          <em>{sub}</em>
        </div>
        <div className={cn("hp-bar", side)}>
          <div className="hp-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className={cn("en-bar", buff && "is-buff")}>
          <div className="en-fill" style={{ width: `${epct}%` }} />
        </div>
      </div>
    </div>
  );
}

function FighterView({ side }: { side: Side }) {
  const config = useCombat((s) => s.config);
  const f = useCombat((s) => s.fight[side]);
  const char = getCharacter(side === "left" ? config.leftId : config.rightId);
  const { sheet, frame } = spriteFrame(f.anim, f.animAge);
  const src = spriteUrl(char.sprite, sheet, frame);
  const lungePx = f.lunge * 90;
  const impactSrc = `/sprites/fx/impact-${Math.min(4, 1 + Math.floor(f.flash * 4))}.png`;
  return (
    <div
      className={cn(
        "fighter",
        side,
        char.color,
        f.anim === "idle" && "is-idle",
        f.anim === "special" && "is-special",
        f.anim === "ko" && "is-ko",
        f.glow > 0.3 && "is-glow",
      )}
      style={{
        transform:
          side === "left"
            ? `translateX(${lungePx}px) scale(${f.squash}, ${2 - f.squash})`
            : `scaleX(-1) translateX(${lungePx}px) scale(${f.squash}, ${2 - f.squash})`,
        filter: f.flash > 0.4 ? "brightness(2.15) contrast(1.05)" : undefined,
      }}
    >
      <img src={src} alt={char.name} draggable={false} crossOrigin="anonymous" />
      {f.anim === "special" ? (
        <div className={cn("special-beam", char.color)}>
          {char.id === "lula" ? (
            <span className="special-quote">Juntos somos mais fortes!</span>
          ) : null}
        </div>
      ) : null}
      {f.flash > 0.15 ? (
        <img src={impactSrc} alt="" className="impact-fx" crossOrigin="anonymous" />
      ) : null}
    </div>
  );
}

function LikeMeter() {
  const enabled = useCombat((s) => s.config.likesEnabled);
  const per = useCombat((s) => s.config.likesPerHit);
  const pool = useCombat((s) => s.fight.likePool);
  const total = useCombat((s) => s.fight.likeTotal);
  if (!enabled) return null;
  const pct = Math.max(0, Math.min(100, (pool / Math.max(1, per)) * 100));
  return (
    <div className="like-meter">
      <span>Curtidas</span>
      <div className="like-meter-bar">
        <div className="like-meter-fill" style={{ width: `${pct}%` }} />
      </div>
      <small className="tabular-nums">
        {pool}/{per}
        {total ? ` · ${total}` : ""}
      </small>
    </div>
  );
}

function GiftLegend() {
  return (
    <div className="gift-legend">
      <div className="legend-col legend-lula">
        <strong>Lula</strong>
        <span>{LULA_GIFTS.map((g) => giftLabel(g.id)).join(" · ")}</span>
      </div>
      <div className="legend-col legend-flavio">
        <strong>Flávio</strong>
        <span>{FLAVIO_GIFTS.map((g) => giftLabel(g.id)).join(" · ")}</span>
      </div>
    </div>
  );
}

function GiftFeed() {
  const feed = useCombat((s) => s.fight.feed);
  return (
    <div className="gift-feed">
      {feed.slice(0, 5).map((item) => (
        <div key={item.id} className={cn("gift-row", item.side)}>
          <span className="gift-row-user">{item.sender}</span>
          <span className="gift-row-gift">{item.giftName}</span>
          <span className="gift-row-dmg tabular-nums">
            {item.actionLabel}
            {item.damage ? ` ${item.damage}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChatTicker() {
  const chats = useCombat((s) => s.fight.chats);
  if (!chats.length) return null;
  return (
    <div className="chat-ticker">
      {chats.slice(0, 3).map((c) => (
        <div key={c.id}>
          <strong>{c.sender}</strong> {c.comment}
        </div>
      ))}
    </div>
  );
}

function KoBanner({ loser, resetIn }: { loser: string; resetIn: number | null }) {
  const winnerSide = useCombat((s) => (s.fight.ko === "left" ? "right" : "left"));
  const config = useCombat((s) => s.config);
  const winner = getCharacter(winnerSide === "left" ? config.leftId : config.rightId);
  return (
    <div className="ko-banner">
      <span className="ko-k">K</span>
      <span className="ko-o">O</span>
      <p>
        {winner.name} vence · {loser} nocauteado
      </p>
      {resetIn != null ? (
        <small>Próximo round em {Math.max(0, resetIn).toFixed(1)}s</small>
      ) : null}
    </div>
  );
}

function noise(t: number) {
  const x = Math.sin(t * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
