import type { CSSProperties } from "react";
import { GiftIcon } from "./gift-icons";
import { useCombat } from "@/lib/combat/store";
import { cn } from "@/lib/utils";

export function GiftFxLayer() {
  const reactions = useCombat((s) => s.fight.reactions);
  if (!reactions.length) return null;
  return (
    <div className="gift-fx-layer">
      {reactions.map((r) => {
        const t = r.age / r.maxAge;
        return (
          <div
            key={r.id}
            className={cn("gift-fx", `gift-fx-${r.visual}`, r.side)}
            style={{ "--t": t } as CSSProperties}
          >
            <div className="gift-fx-card">
              <GiftIcon id={r.visual} className="h-9 w-9" />
              <div>
                <strong>{r.sender}</strong>
                <span>enviou {r.giftName}</span>
              </div>
            </div>
            {r.visual === "rose" || r.visual === "white-rose" || r.visual === "heart" ? (
              <PetalRain white={r.visual === "white-rose"} />
            ) : null}
            {r.visual === "galaxy" || r.visual === "fireworks" ? <div className="gift-fx-cosmos" /> : null}
            {r.visual === "donut" ? <div className="gift-fx-orbit" /> : null}
            {r.visual === "dino" ? <div className="gift-fx-stomp" /> : null}
            {r.visual === "perfume" ? <div className="gift-fx-aura" /> : null}
            {r.visual === "sunglasses" ? <div className="gift-fx-flash" /> : null}
            {r.visual === "capybara" ? <div className="gift-fx-stamp" /> : null}
          </div>
        );
      })}
    </div>
  );
}

function PetalRain({ white }: { white: boolean }) {
  return (
    <div className="petal-rain">
      {Array.from({ length: 10 }, (_, i) => (
        <img
          key={i}
          src={`/sprites/fx/petal-${(i % 4) + 1}.png`}
          alt=""
          className={cn("petal", white && "is-white")}
          style={{
            left: `${8 + ((i * 9) % 84)}%`,
            animationDelay: `${(i % 5) * 0.12}s`,
            animationDuration: `${1.4 + (i % 3) * 0.2}s`,
          }}
          crossOrigin="anonymous"
        />
      ))}
    </div>
  );
}
