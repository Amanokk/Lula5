export type Side = "left" | "right";

export type FighterId = "lula" | "flavio";

export type AnimName = "idle" | "attack" | "special" | "hurt" | "ko";

export type GiftAction = "punch" | "special" | "combo" | "buff" | "spectacle";

export type GiftVisual =
  | "rose"
  | "white-rose"
  | "heart"
  | "donut"
  | "capybara"
  | "dino"
  | "perfume"
  | "sunglasses"
  | "galaxy"
  | "fireworks"
  | "generic";

export type LikeFighter = FighterId | "champion";

export type LiveTransport = "ws" | "sse";

export interface CharacterDef {
  id: FighterId;
  name: string;
  subtitle: string;
  sprite: string;
  color: FighterId;
  portrait: string;
}

export interface GiftMapping {
  id: string;
  /** Nomes e IDs do TikTok que disparam esta ação (minúsculas). */
  aliases: string[];
  action: GiftAction;
  /** Quem ataca quando este presente chega. */
  fighter: FighterId;
  /** Dano base de 1 unidade do gift (escala com diamantes recebidos). */
  damage: number;
  /** Golpes em sequência por unidade (combo); punches usam a quantidade. */
  hits: number;
  /** Valor de referência em diamantes de 1 unidade (escala o dano). */
  diamonds: number;
}

export interface AppConfig {
  tiktokUser: string;
  /** Lutador escolhido pelo streamer; vazio = ainda não escolheu. */
  championId: string;
  leftId: FighterId | string;
  rightId: FighterId | string;
  maxHp: number;
  maxEnergy: number;
  sfxVolume: number;
  crowdVolume: number;
  shakeEnabled: boolean;
  transparent: boolean;
  autoResetSec: number;
  gifts: GiftMapping[];
  likesEnabled: boolean;
  /** Curtidas acumuladas para disparar um golpe. */
  likesPerHit: number;
  likeDamage: number;
  likeFighter: LikeFighter;
}

export interface IncomingGift {
  sender: string;
  giftName: string;
  giftId?: string | number;
  /** Diamantes de 1 unidade (não o total da streak). */
  diamonds?: number;
  /** Quantidade / repetição do presente. */
  repeatCount?: number;
  /** Streak ainda em andamento (só overlay; não causa dano). */
  streak?: boolean;
  /** Gifts postados pelo simulador do painel; o painel ignora o eco do SSE/WS. */
  source?: "local" | "tiktok" | "webhook";
}

export interface IncomingChat {
  sender: string;
  comment: string;
}

export interface IncomingLike {
  sender: string;
  count: number;
  total?: number;
  source?: "local" | "tiktok" | "webhook";
}

export interface CombatAction {
  id: string;
  kind: GiftAction;
  attacker: Side;
  damage: number;
  hitsLeft: number;
  sender: string;
  giftName: string;
  diamonds: number;
  quantity: number;
}

export interface FighterRuntime {
  hp: number;
  energy: number;
  anim: AnimName;
  animAge: number;
  flash: number;
  lunge: number;
  squash: number;
  buffUntil: number;
  buffMult: number;
  glow: number;
}

export interface FeedItem {
  id: string;
  at: number;
  sender: string;
  giftName: string;
  actionLabel: string;
  side: Side;
  damage: number;
  visual: GiftVisual;
  quantity: number;
}

export interface ChatItem {
  id: string;
  at: number;
  sender: string;
  comment: string;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: "lula" | "flavio" | "spark" | "white";
}

export interface Floater {
  id: number;
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  side: Side;
}

export interface Callout {
  sender: string;
  giftName: string;
  visual: GiftVisual;
  age: number;
}

export interface GiftReaction {
  id: string;
  visual: GiftVisual;
  giftName: string;
  sender: string;
  action: GiftAction;
  side: Side;
  diamonds: number;
  age: number;
  maxAge: number;
}

export interface FightState {
  left: FighterRuntime;
  right: FighterRuntime;
  round: number;
  hits: number;
  ko: Side | null;
  koAge: number;
  resetIn: number | null;
  queue: CombatAction[];
  active: CombatAction | null;
  hitstop: number;
  trauma: number;
  screenFlash: number;
  particles: Particle[];
  floaters: Floater[];
  callout: Callout | null;
  reactions: GiftReaction[];
  feed: FeedItem[];
  chats: ChatItem[];
  lastAutoSide: Side;
  chatBias: Side | null;
  combo: number;
  comboAge: number;
  spectacle: number;
  likePool: number;
  likeTotal: number;
}

export type LiveStatus = "disconnected" | "connecting" | "connected" | "reconnecting" | "error";

export interface LiveSnapshot {
  status: LiveStatus;
  username: string;
  error?: string;
  viewers?: number;
  transport?: LiveTransport;
}

export type BusEvent =
  | { type: "hello"; live: LiveSnapshot; config: AppConfig }
  | { type: "status"; live: LiveSnapshot }
  | { type: "gift"; gift: IncomingGift }
  | { type: "giftStreak"; gift: IncomingGift }
  | { type: "chat"; chat: IncomingChat }
  | { type: "like"; like: IncomingLike }
  | { type: "reset" }
  | { type: "config"; config: AppConfig };
