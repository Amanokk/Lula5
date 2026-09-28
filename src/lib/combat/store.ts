import { create } from "zustand";
import { CHARACTERS, otherCharacter } from "./characters";
import { applyChat, applyGiftStreak, applyLike, createFight, enqueueGift, resetRound, stepFight } from "./engine";
import { defaultConfig } from "./gifts";
import type {
  AppConfig,
  FightState,
  GiftMapping,
  IncomingChat,
  IncomingGift,
  IncomingLike,
  LikeFighter,
  LiveSnapshot,
} from "./types";

const STORAGE_KEY = "combate-live-v4";

function migrateLikeFighter(raw: unknown, fallback: LikeFighter): LikeFighter {
  if (raw === "lula" || raw === "flavio" || raw === "champion") return raw;
  return fallback;
}

function migrateGifts(raw: unknown): GiftMapping[] {
  const base = defaultConfig().gifts;
  if (!Array.isArray(raw) || raw.length === 0) return base;
  const migrated: GiftMapping[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const g = item as Record<string, unknown>;
    const id = String(g.id ?? "");
    const fallback = base.find((b) => b.id === id);
    const fighter =
      g.fighter === "lula" || g.fighter === "flavio"
        ? g.fighter
        : g.side === "left"
          ? "lula"
          : g.side === "right"
            ? "flavio"
            : (fallback?.fighter ?? "flavio");
    migrated.push({
      id: id || `custom-${migrated.length}`,
      aliases: Array.isArray(g.aliases) ? g.aliases.map(String) : (fallback?.aliases ?? [id]),
      action:
        g.action === "punch" ||
        g.action === "special" ||
        g.action === "combo" ||
        g.action === "buff" ||
        g.action === "spectacle"
          ? g.action
          : (fallback?.action ?? "punch"),
      fighter,
      damage: Number(g.damage ?? fallback?.damage ?? 8) || 0,
      hits: Number(g.hits ?? fallback?.hits ?? 1) || 1,
      diamonds: Number(g.diamonds ?? fallback?.diamonds ?? 1) || 1,
    });
  }
  return migrated.length ? migrated : base;
}

function loadConfig(): AppConfig {
  const base = defaultConfig();
  if (typeof window === "undefined") return base;
  try {
    const raw =
      localStorage.getItem(STORAGE_KEY) ??
      localStorage.getItem("combate-live-v3") ??
      localStorage.getItem("combate-live-v2");
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<AppConfig> & { gifts?: unknown };
    return {
      ...base,
      ...parsed,
      championId: parsed.championId || "lula",
      leftId: parsed.leftId || "lula",
      rightId: parsed.rightId || "flavio",
      gifts: migrateGifts(parsed.gifts),
      likesEnabled: parsed.likesEnabled !== false,
      likesPerHit: Math.max(1, Number(parsed.likesPerHit ?? base.likesPerHit) || base.likesPerHit),
      likeDamage: Math.max(1, Number(parsed.likeDamage ?? base.likeDamage) || base.likeDamage),
      likeFighter: migrateLikeFighter(parsed.likeFighter, base.likeFighter),
    };
  } catch {
    return base;
  }
}

function saveConfig(config: AppConfig) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    /* ignore quota */
  }
}

export interface CombatStore {
  config: AppConfig;
  fight: FightState;
  live: LiveSnapshot;
  hydrated: boolean;
  hydrate: () => void;
  patchConfig: (partial: Partial<AppConfig>) => void;
  setGifts: (gifts: AppConfig["gifts"]) => void;
  pickChampion: (id: string) => void;
  applyGift: (gift: IncomingGift) => void;
  applyGiftStreak: (gift: IncomingGift) => void;
  applyChat: (chat: IncomingChat) => void;
  applyLike: (like: IncomingLike) => void;
  resetFight: (newRound?: boolean) => void;
  setLive: (live: Partial<LiveSnapshot>) => void;
  tick: (dt: number) => void;
}

export const useCombat = create<CombatStore>((set, get) => ({
  config: defaultConfig(),
  fight: createFight(defaultConfig()),
  live: { status: "disconnected", username: "" },
  hydrated: false,
  hydrate: () => {
    if (get().hydrated) return;
    const config = loadConfig();
    set({
      config,
      fight: createFight(config),
      hydrated: true,
      live: { status: "disconnected", username: config.tiktokUser },
    });
  },
  patchConfig: (partial) => {
    const config = { ...get().config, ...partial };
    saveConfig(config);
    set({ config });
  },
  setGifts: (gifts) => {
    const config = { ...get().config, gifts };
    saveConfig(config);
    set({ config });
  },
  pickChampion: (id) => {
    const champ = CHARACTERS.some((c) => c.id === id) ? id : CHARACTERS[0]!.id;
    const opp = otherCharacter(champ);
    const config = {
      ...get().config,
      championId: champ,
      leftId: champ,
      rightId: opp.id,
    };
    saveConfig(config);
    set({ config, fight: createFight(config) });
  },
  applyGift: (gift) => {
    set({ fight: enqueueGift(get().fight, get().config, gift) });
  },
  applyGiftStreak: (gift) => {
    set({ fight: applyGiftStreak(get().fight, gift) });
  },
  applyChat: (chat) => {
    set({ fight: applyChat(get().fight, get().config, chat) });
  },
  applyLike: (like) => {
    set({ fight: applyLike(get().fight, get().config, like) });
  },
  resetFight: (newRound = false) => {
    set({ fight: resetRound(get().fight, get().config, newRound) });
  },
  setLive: (live) => {
    set({ live: { ...get().live, ...live } });
  },
  tick: (dt) => {
    set({ fight: stepFight(get().fight, get().config, dt) });
  },
}));
