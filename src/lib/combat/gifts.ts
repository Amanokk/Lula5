import type {
  AppConfig,
  FighterId,
  GiftMapping,
  GiftVisual,
  IncomingGift,
  LikeFighter,
} from "./types";

/** Lula ataca com estes. Rosa é o golpe básico. */
export const LULA_GIFTS: GiftMapping[] = [
  {
    id: "rose",
    aliases: ["rose", "rosa", "roses", "5655", "rose gift"],
    action: "punch",
    fighter: "lula",
    damage: 8,
    hits: 1,
    diamonds: 1,
  },
  {
    id: "heart",
    aliases: ["finger heart", "coração", "coracao", "heart", "heart me", "7934"],
    action: "punch",
    fighter: "lula",
    damage: 14,
    hits: 1,
    diamonds: 1,
  },
  {
    id: "donut",
    aliases: ["donut", "doughnut", "rosquinha", "rosquinha de açúcar", "donut pink"],
    action: "special",
    fighter: "lula",
    damage: 42,
    hits: 1,
    diamonds: 30,
  },
  {
    id: "perfume",
    aliases: ["perfume", "fragrance", "colônia", "colonia"],
    action: "buff",
    fighter: "lula",
    damage: 0,
    hits: 1,
    diamonds: 20,
  },
  {
    id: "galaxy",
    aliases: ["galaxy", "galáxia", "galaxia", "universe", "universo", "universe gift"],
    action: "spectacle",
    fighter: "lula",
    damage: 90,
    hits: 1,
    diamonds: 1000,
  },
];

/** Flávio ataca com estes. Qualquer gift não mapeado também cai nele. */
export const FLAVIO_GIFTS: GiftMapping[] = [
  {
    id: "white-rose",
    aliases: ["white rose", "rosa branca", "rosa blanca", "whiterose"],
    action: "punch",
    fighter: "flavio",
    damage: 8,
    hits: 1,
    diamonds: 1,
  },
  {
    id: "dino",
    aliases: ["mini dino", "dino", "t-rex", "trex", "dinosaur", "dinossauro"],
    action: "combo",
    fighter: "flavio",
    damage: 12,
    hits: 3,
    diamonds: 5,
  },
  {
    id: "sunglasses",
    aliases: ["sunglasses", "óculos", "oculos", "glasses", "óculos de sol"],
    action: "punch",
    fighter: "flavio",
    damage: 18,
    hits: 1,
    diamonds: 10,
  },
  {
    id: "capybara",
    aliases: ["capybara", "capivara", "capy", "capybaras"],
    action: "special",
    fighter: "flavio",
    damage: 55,
    hits: 1,
    diamonds: 99,
  },
  {
    id: "fireworks",
    aliases: ["fireworks", "firework", "fogos", "fogos de artifício", "confetti", "confete"],
    action: "spectacle",
    fighter: "flavio",
    damage: 70,
    hits: 1,
    diamonds: 108,
  },
];

export const DEFAULT_GIFT_MAP: GiftMapping[] = [...LULA_GIFTS, ...FLAVIO_GIFTS];

export function defaultConfig(): AppConfig {
  return {
    tiktokUser: "",
    championId: "lula",
    leftId: "lula",
    rightId: "flavio",
    maxHp: 1000,
    maxEnergy: 100,
    sfxVolume: 0.85,
    crowdVolume: 0.4,
    shakeEnabled: true,
    transparent: false,
    autoResetSec: 5,
    gifts: DEFAULT_GIFT_MAP.map((g) => ({ ...g, aliases: [...g.aliases] })),
    likesEnabled: true,
    likesPerHit: 50,
    likeDamage: 6,
    likeFighter: "champion",
  };
}

export function giftsFor(fighter: FighterId, gifts: GiftMapping[] = DEFAULT_GIFT_MAP) {
  return gifts.filter((g) => g.fighter === fighter);
}

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function findGiftMapping(
  mappings: GiftMapping[],
  giftName: string,
  giftId?: string | number,
): GiftMapping | undefined {
  const id = giftId != null ? String(giftId) : "";
  const name = norm(giftName);
  return mappings.find((m) =>
    m.aliases.some((a) => {
      const na = norm(a);
      return na === name || na === id || (na.length > 3 && name.includes(na));
    }),
  );
}

export function isLikeGift(gift: Pick<IncomingGift, "giftName" | "giftId">) {
  const id = gift.giftId != null ? String(gift.giftId).toLowerCase() : "";
  const name = norm(gift.giftName);
  return id === "like" || name === "curtida" || name === "like" || name === "likes";
}

export function resolveLikeFighter(config: Pick<AppConfig, "likeFighter" | "championId">): FighterId {
  const pick: LikeFighter = config.likeFighter;
  if (pick === "lula" || pick === "flavio") return pick;
  return config.championId === "flavio" ? "flavio" : "lula";
}

export interface ResolvedAttack {
  fighter: FighterId;
  action: GiftMapping["action"];
  /** Dano por golpe. */
  damage: number;
  hits: number;
  /** Total de diamantes (unidade × quantidade). */
  diamonds: number;
  quantity: number;
  mapping?: GiftMapping;
}

/**
 * Dano proporcional aos diamantes e à quantidade:
 *   unit = mapping.damage × (diamantesDaUnidade / mapping.diamonds)
 * Punch: `quantity` golpes com `unit` cada (cap 16).
 * Combo: `hits × quantity` golpes.
 * Special/espetáculo: 1 golpe com `unit × quantity`.
 * Sem mapa: Flávio, 2 de dano por diamante total.
 */
export function resolveGiftAttack(config: AppConfig, gift: IncomingGift): ResolvedAttack {
  const quantity = Math.max(1, Math.min(99, Math.round(Number(gift.repeatCount ?? 1) || 1)));

  if (isLikeGift(gift)) {
    return {
      fighter: resolveLikeFighter(config),
      action: "punch",
      damage: Math.max(1, Math.round(config.likeDamage || 6)),
      hits: 1,
      diamonds: 0,
      quantity: 1,
    };
  }

  const mapping = findGiftMapping(config.gifts, gift.giftName, gift.giftId);
  const fromGift = Number(gift.diamonds);
  const unitDiamonds = Math.max(
    1,
    Math.round(Number.isFinite(fromGift) && fromGift > 0 ? fromGift : (mapping?.diamonds ?? 1)) || 1,
  );
  const totalDiamonds = unitDiamonds * quantity;

  if (!mapping) {
    const hits = Math.min(12, quantity);
    const totalDmg = Math.min(300, Math.max(5, Math.round(totalDiamonds * 2)));
    const perHit = Math.max(1, Math.round(totalDmg / hits));
    return {
      fighter: "flavio",
      action: "punch",
      damage: perHit,
      hits,
      diamonds: totalDiamonds,
      quantity,
    };
  }

  const diamondScale = unitDiamonds / Math.max(1, mapping.diamonds);
  const unitDamage = Math.max(0, Math.round(mapping.damage * diamondScale));

  if (mapping.action === "buff") {
    return {
      fighter: mapping.fighter,
      action: "buff",
      damage: 0,
      hits: 1,
      diamonds: totalDiamonds,
      quantity,
      mapping,
    };
  }

  if (mapping.action === "combo") {
    const hits = Math.min(24, Math.max(1, mapping.hits * quantity));
    return {
      fighter: mapping.fighter,
      action: "combo",
      damage: Math.max(1, unitDamage),
      hits,
      diamonds: totalDiamonds,
      quantity,
      mapping,
    };
  }

  if (mapping.action === "special" || mapping.action === "spectacle") {
    return {
      fighter: mapping.fighter,
      action: mapping.action,
      damage: Math.min(500, Math.max(1, unitDamage * quantity)),
      hits: 1,
      diamonds: totalDiamonds,
      quantity,
      mapping,
    };
  }

  const hits = Math.min(16, quantity);
  const overflow = quantity > 16 ? Math.round((unitDamage * (quantity - 16)) / hits) : 0;
  return {
    fighter: mapping.fighter,
    action: "punch",
    damage: Math.max(1, unitDamage + overflow),
    hits,
    diamonds: totalDiamonds,
    quantity,
    mapping,
  };
}

export function actionLabel(action: GiftMapping["action"]): string {
  switch (action) {
    case "punch":
      return "Golpe";
    case "special":
      return "Especial";
    case "combo":
      return "Combo";
    case "buff":
      return "Dano+";
    case "spectacle":
      return "Espetáculo";
  }
}

const VISUALS: GiftVisual[] = [
  "rose",
  "white-rose",
  "heart",
  "donut",
  "capybara",
  "dino",
  "perfume",
  "sunglasses",
  "galaxy",
  "fireworks",
];

export function giftVisual(idOrName: string): GiftVisual {
  const n = norm(idOrName);
  if (n === "curtida" || n === "like" || n === "likes") return "heart";
  for (const v of VISUALS) {
    if (n === v || n.includes(v.replace("-", " ")) || n.includes(v)) return v;
  }
  if (n.includes("rosa") && (n.includes("branca") || n.includes("white"))) return "white-rose";
  if (n.includes("rosa") || n.includes("rose")) return "rose";
  if (n.includes("coracao") || n.includes("heart")) return "heart";
  if (n.includes("rosquinha") || n.includes("donut")) return "donut";
  if (n.includes("capivara") || n.includes("capy")) return "capybara";
  if (n.includes("dino")) return "dino";
  if (n.includes("galaxy") || n.includes("galaxia") || n.includes("universo")) return "galaxy";
  if (n.includes("oculos") || n.includes("glass")) return "sunglasses";
  if (n.includes("perfume") || n.includes("colonia")) return "perfume";
  if (n.includes("fogo") || n.includes("firework") || n.includes("confete")) return "fireworks";
  return "generic";
}

export function giftLabel(id: string) {
  const map: Record<string, string> = {
    rose: "Rosa",
    "white-rose": "Rosa branca",
    heart: "Coração",
    donut: "Rosquinha",
    capybara: "Capivara",
    dino: "Mini Dino",
    perfume: "Perfume",
    sunglasses: "Óculos",
    galaxy: "Galáxia",
    fireworks: "Fogos",
    like: "Curtida",
  };
  return map[id] ?? id;
}

export function fighterLabel(id: FighterId) {
  return id === "lula" ? "Lula" : "Flávio";
}
