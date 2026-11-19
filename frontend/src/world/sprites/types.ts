// EarnKeep — Sprites: tiny fairy-scale kids who play all over the living
// world. Shared types.
//
// Scale rule (2026-11-10): even at the very front they are no bigger
// than the snail critter (~30 px tall). Deeper levels shrink them further.

import type { HairStyle } from './traits';

/** Every depth level of the world, back → front. far/mid/near live inside
 * the parallax backdrop (between its layers); behind sits under the
 * panels, front over them, fore over the dark front framing. */
export type Layer = 'far' | 'mid' | 'near' | 'behind' | 'front' | 'fore';

export type Pose =
  | 'idle' | 'walk' | 'run' | 'wave' | 'cheer' | 'jump' | 'fly' | 'sit' | 'dangle'
  | 'ride' | 'drive' | 'skate' | 'throw' | 'kick' | 'hang' | 'crouch' | 'hide' | 'peek'
  | 'cover' | 'look' | 'dance' | 'twirl' | 'push' | 'carry' | 'lie' | 'angel' | 'blow'
  | 'climb' | 'balance' | 'point' | 'sleep' | 'sword' | 'tuck' | 'catch' | 'rope' | 'holdup';

export type Expr = 'smile' | 'grin' | 'laugh' | 'o' | 'blow' | 'closed' | 'wink' | 'tongue' | 'smirk' | 'scrunch' | 'sparkle' | 'determined';

export type Emote = 'heart' | '!' | '?' | 'music' | 'zzz' | 'star' | 'ha' | 'boo' | 'hi' | 'sweat' | 'count';

export type Fx = 'splash' | 'leaves' | 'snow' | 'sparkle' | 'seeds' | 'bubbles' | 'confetti' | 'dust' | 'hearts' | 'smoke' | 'fireflies';

/** Things a kid holds in the right hand. */
export type Held =
  | 'wand' | 'net' | 'sword' | 'dandelion' | 'bubblewand' | 'lantern' | 'flashlight' | 'jar'
  | 'umbrella' | 'balloon' | 'balloons' | 'teddy' | 'bucket' | 'horn' | 'snowball' | 'stick'
  | 'flower' | 'kitestring' | 'hook' | 'rope' | 'leaf' | 'present' | 'popsicle' | 'flag';

/** Things a kid rides or sits in (drawn at the feet). */
export type Ride = 'bike' | 'kart' | 'scooter' | 'skateboard' | 'sled' | 'box' | 'leafpile' | 'cloud' | 'broom' | 'board' | 'snowpile' | 'tube';

/** Free-moving objects with their own track. */
export type Thing =
  | 'ball' | 'beachball' | 'frisbee' | 'snowball' | 'plane' | 'rocket' | 'kite' | 'hook'
  | 'present' | 'snowman' | 'puddle' | 'box' | 'leafpile' | 'butterfly' | 'balloon'
  | 'waterballoon' | 'pumpkin' | 'star' | 'firefly' | 'teddy'
  | 'pal'; // a critter friend who plays with a kid on their own (variant: 0 fox, 1 bunny)

export type Wings = 'fairy' | 'butterfly' | 'dragonfly' | 'dragon' | 'bat' | 'feather';

export interface Pt { x: number; y: number }

export interface Beat {
  dur: number; // seconds
  at?: Pt; // jump here instantly at the start of the beat
  to?: Pt; // move here over the beat
  ease?: 'linear' | 'inout' | 'out' | 'in';
  arc?: number; // parabolic hop height (px) over the beat
  swing?: Pt; // move along a circle around this pivot (grappling swing)
  hover?: number; // sine bob amplitude while flying (px)
  spin?: number; // degrees rotated over the beat (cartwheel / flip)
  rot?: number; // static tilt (deg)
  face?: 1 | -1; // 1 = facing right; default: direction of travel
  layer?: Layer;
  s?: number; // extra scale on top of the layer's
  hidden?: boolean;
  /* kid-only */
  pose?: Pose;
  expr?: Expr;
  look?: 'viewer' | 'up' | 'down';
  emote?: Emote;
  held?: Held | null;
  ride?: Ride | null;
  wings?: Wings | null;
  fx?: Fx; // one-shot burst at the start of the beat
  fxEvery?: Fx; // repeating while this beat runs (bubbles, seeds, sparkles…)
  /* thing-only */
  variant?: number; // e.g. snowman build stage, ball kind
  wobble?: boolean;
}

export interface Track {
  id: string;
  who?: string; // kid track: which sprite
  thing?: Thing; // object track
  tether?: string; // draw a line from this thing to that kid's hand
  beats: Beat[];
  /** Per-episode outfit overrides (helmet for karts, raincoat…). */
  dress?: Partial<Outfit>;
}

export interface Episode {
  name: string;
  tracks: Track[];
}

/* ------------------------------------------------------------------ */
/* outfits                                                             */
/* ------------------------------------------------------------------ */

export type Top =
  | 'tee' | 'tank' | 'ruffle' | 'dress' | 'hoodie' | 'raincoat' | 'puffer' | 'sweater'
  | 'overalls' | 'wetsuit' | 'pjs' | 'jersey' | 'tunic' | 'robe' | 'bones' | 'dragon' | 'gown' | 'flannel' | 'rashguard' | 'swim';
export type Bottom = 'shorts' | 'pants' | 'leggings' | 'skirt' | 'none';
export type Shoes = 'sneakers' | 'rainboots' | 'snowboots' | 'sandals' | 'bare' | 'lightup';
export type Hat =
  | 'none' | 'cap' | 'capback' | 'beanie' | 'sunhat' | 'hood' | 'flowercrown' | 'party'
  | 'witch' | 'santa' | 'elf' | 'earmuffs' | 'crown' | 'bandana' | 'helmet' | 'headband'
  | 'pumpkin' | 'knight' | 'bow' | 'sweatband' | 'goggles' | 'cowboy' | 'newsboy' | 'clip';
export type Extra = 'scarf' | 'mittens' | 'backpack' | 'cape' | 'necklace' | 'tail';

export interface Outfit {
  top: Top;
  top1: string; // main color
  top2: string; // accent / pattern color
  print: 'none' | 'star' | 'bolt' | 'heart' | 'flower' | 'mountain' | 'stripes' | 'number' | 'snowflake' | 'pony' | 'rainbow' | 'pixel' | 'saber';
  bottom: Bottom;
  bottom1: string;
  shoes: Shoes;
  shoe1: string;
  hat: Hat;
  hat1: string;
  hat2: string;
  hair: HairStyle;
  ribbon: string; // braid ties / bows
  extras: Extra[];
  extra1: string; // scarf / cape / backpack color
  wings: Wings | null; // the day's wings, used when an episode flies
}
