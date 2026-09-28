import { useEffect, useRef } from "react";
import {
  resumeAudioIfNeeded,
  setVolumes,
  sfxByVisual,
  sfxCombo,
  sfxHeavy,
  sfxKo,
  sfxPunch,
  sfxSpecial,
} from "@/lib/combat/audio";
import { useCombat } from "@/lib/combat/store";

export function SfxDirector() {
  const hits = useCombat((s) => s.fight.hits);
  const ko = useCombat((s) => s.fight.ko);
  const combo = useCombat((s) => s.fight.combo);
  const reactionHead = useCombat((s) => s.fight.reactions[0]?.id ?? "");
  const sfxVolume = useCombat((s) => s.config.sfxVolume);
  const crowdVolume = useCombat((s) => s.config.crowdVolume);
  const prevHits = useRef(0);
  const prevKo = useRef<typeof ko>(null);
  const prevReaction = useRef("");

  useEffect(() => {
    setVolumes(sfxVolume, crowdVolume);
  }, [sfxVolume, crowdVolume]);

  useEffect(() => {
    const vis = () => resumeAudioIfNeeded();
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);

  useEffect(() => {
    if (hits > prevHits.current) {
      const last = useCombat.getState().fight.feed[0];
      const n = useCombat.getState().fight.combo;
      if (last?.actionLabel === "Espetáculo") sfxSpecial();
      else if (last?.actionLabel === "Especial") sfxHeavy();
      else if (n > 2) sfxCombo(n);
      else sfxPunch();
    }
    prevHits.current = hits;
  }, [hits]);

  useEffect(() => {
    if (ko && !prevKo.current) sfxKo();
    prevKo.current = ko;
  }, [ko]);

  useEffect(() => {
    if (reactionHead && reactionHead !== prevReaction.current) {
      const r = useCombat.getState().fight.reactions[0];
      if (r) sfxByVisual(r.visual, r.action);
    }
    prevReaction.current = reactionHead;
  }, [reactionHead, combo]);

  return null;
}
