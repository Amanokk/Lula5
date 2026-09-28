import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { OverlayStage } from "@/components/combat/overlay-stage";
import { SfxDirector } from "@/components/combat/sfx-director";
import { unlockAudio } from "@/lib/combat/audio";
import { subscribeLive } from "@/lib/combat/live-client";
import { useCombat } from "@/lib/combat/store";

export const Route = createFileRoute("/overlay")({
  ssr: false,
  component: OverlayPage,
});

function OverlayPage() {
  const hydrate = useCombat((s) => s.hydrate);
  const applyGift = useCombat((s) => s.applyGift);
  const applyGiftStreak = useCombat((s) => s.applyGiftStreak);
  const applyChat = useCombat((s) => s.applyChat);
  const applyLike = useCombat((s) => s.applyLike);
  const resetFight = useCombat((s) => s.resetFight);
  const setLive = useCombat((s) => s.setLive);
  const patchConfig = useCombat((s) => s.patchConfig);
  const [transparent, setTransparent] = useState(false);

  useEffect(() => {
    hydrate();
    const params = new URLSearchParams(window.location.search);
    const obs = params.get("transparent") === "1" || params.get("obs") === "1";
    setTransparent(obs);
    if (obs) document.documentElement.classList.add("obs-mode");
    return () => document.documentElement.classList.remove("obs-mode");
  }, [hydrate]);

  useEffect(() => {
    return subscribeLive(
      (ev) => {
        if (ev.type === "gift") applyGift(ev.gift);
        if (ev.type === "giftStreak") applyGiftStreak(ev.gift);
        if (ev.type === "chat") applyChat(ev.chat);
        if (ev.type === "like") applyLike(ev.like);
        if (ev.type === "reset") resetFight(false);
        if (ev.type === "status") setLive(ev.live);
        if (ev.type === "config") patchConfig(ev.config);
        if (ev.type === "hello") {
          setLive(ev.live);
          patchConfig(ev.config);
        }
      },
      (transport) => setLive({ transport }),
    );
  }, [applyGift, applyGiftStreak, applyChat, applyLike, resetFight, setLive, patchConfig]);

  return (
    <main
      className={transparent ? "overlay-page is-obs" : "overlay-page"}
      onPointerDown={() => unlockAudio()}
    >
      <SfxDirector />
      <OverlayStage transparent={transparent} />
    </main>
  );
}
