import { CHARACTERS } from "@/lib/combat/characters";
import { unlockAudio } from "@/lib/combat/audio";
import { useCombat } from "@/lib/combat/store";

export function CharacterSelect() {
  const pickChampion = useCombat((s) => s.pickChampion);

  const choose = (id: string) => {
    unlockAudio();
    pickChampion(id);
  };

  return (
    <div className="pick-screen">
      <p className="pick-kicker">TikTok LIVE · 9:16</p>
      <h1 className="pick-title">Escolha seu lutador</h1>
      <p className="pick-sub">Quem você representa na live. O outro entra no canto oposto.</p>
      <div className="pick-grid">
        {CHARACTERS.map((c) => (
          <button key={c.id} type="button" className={`pick-card pick-${c.color}`} onClick={() => choose(c.id)}>
            <img src={`/sprites/${c.sprite}/cutout.png`} alt={c.name} crossOrigin="anonymous" />
            <span className="pick-name">{c.name}</span>
            <span className="pick-role">{c.subtitle}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
