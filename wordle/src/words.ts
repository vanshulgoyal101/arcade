// Word data for Wordle.
//  - ANSWERS: common, fair five-letter words used as hidden solutions.
//  - PACKED_GUESSES (wordlist.ts): a ~6.2k-word offline dictionary of valid
//    five-letter words that are both REAL and COMMON (dictionary ∩ top-100k
//    frequency list), so everyday words like "trams", "stare" or "wryly" are
//    accepted while obscure Scrabble-only entries like "aahed" are not. A guess
//    is accepted if it's in this dictionary or is one of the answers.

import { PACKED_GUESSES } from './wordlist';

export const ANSWERS: readonly string[] = [
  'about', 'above', 'abuse', 'actor', 'acute', 'admit', 'adopt', 'adult', 'after', 'again',
  'agent', 'agree', 'ahead', 'alarm', 'album', 'alert', 'alike', 'alive', 'allow', 'alone',
  'along', 'alter', 'among', 'anger', 'angle', 'angry', 'apart', 'apple', 'apply', 'arena',
  'argue', 'arise', 'array', 'aside', 'asset', 'audio', 'audit', 'avoid', 'award', 'aware',
  'badly', 'baker', 'basic', 'basis', 'beach', 'began', 'begin', 'begun', 'being', 'below',
  'bench', 'billy', 'birth', 'black', 'blame', 'blank', 'blast', 'blend', 'bless', 'blind',
  'block', 'blood', 'bloom', 'board', 'boast', 'bonus', 'boost', 'booth', 'bound', 'brain',
  'brand', 'brave', 'bread', 'break', 'breed', 'brick', 'bride', 'brief', 'bring', 'broad',
  'broke', 'brown', 'brush', 'build', 'built', 'bunch', 'burst', 'buyer', 'cabin', 'cable',
  'candy', 'cargo', 'carry', 'catch', 'cause', 'chain', 'chair', 'chalk', 'chaos', 'charm',
  'chart', 'chase', 'cheap', 'check', 'chess', 'chest', 'chief', 'child', 'chill', 'china',
  'chose', 'civic', 'civil', 'claim', 'class', 'clean', 'clear', 'clerk', 'click', 'cliff',
  'climb', 'cling', 'clock', 'close', 'cloth', 'cloud', 'clown', 'coach', 'coast', 'could',
  'count', 'court', 'cover', 'crack', 'craft', 'crash', 'crazy', 'cream', 'crime', 'crisp',
  'cross', 'crowd', 'crown', 'crude', 'cruel', 'crush', 'curve', 'cycle', 'daily', 'dairy',
  'dance', 'dated', 'dealt', 'death', 'debut', 'delay', 'dense', 'depth', 'devil', 'diary',
  'digit', 'dirty', 'ditch', 'dodge', 'doing', 'donor', 'doubt', 'dozen', 'draft', 'drain',
  'drama', 'drank', 'dream', 'dress', 'dried', 'drift', 'drill', 'drink', 'drive', 'drove',
  'drown', 'eager', 'eagle', 'early', 'earth', 'eight', 'elbow', 'elder', 'elect', 'elite',
  'empty', 'enemy', 'enjoy', 'enter', 'entry', 'equal', 'error', 'essay', 'event', 'every',
  'exact', 'exist', 'extra', 'faith', 'false', 'fancy', 'fatal', 'fault', 'favor', 'fence',
  'ferry', 'fever', 'field', 'fifth', 'fifty', 'fight', 'final', 'first', 'fixed', 'flame',
  'flash', 'fleet', 'flesh', 'float', 'flock', 'flood', 'floor', 'flour', 'fluid', 'flush',
  'focal', 'focus', 'force', 'forge', 'forth', 'forty', 'forum', 'found', 'frame', 'frank',
  'fraud', 'fresh', 'front', 'frost', 'fruit', 'fully', 'funny', 'gauge', 'ghost', 'giant',
  'given', 'glass', 'gleam', 'globe', 'glory', 'glove', 'grace', 'grade', 'grain', 'grand',
  'grant', 'grape', 'graph', 'grasp', 'grass', 'grave', 'great', 'greed', 'green', 'greet',
  'grief', 'grill', 'grind', 'gross', 'group', 'grove', 'grown', 'guard', 'guess', 'guest',
  'guide', 'guilt', 'habit', 'happy', 'harsh', 'haste', 'hasty', 'hatch', 'heart', 'heavy',
  'hedge', 'hello', 'hence', 'honey', 'honor', 'horse', 'hotel', 'house', 'hover', 'human',
  'humor', 'hurry', 'ideal', 'image', 'index', 'inner', 'input', 'issue', 'ivory', 'jeans',
  'jelly', 'jewel', 'joint', 'jolly', 'judge', 'juice', 'juicy', 'jumbo', 'knife', 'knock',
  'known', 'label', 'labor', 'large', 'laser', 'later', 'laugh', 'layer', 'learn', 'lease',
  'least', 'leave', 'legal', 'lemon', 'level', 'lever', 'light', 'limit', 'liver', 'local',
  'logic', 'loose', 'loser', 'lucky', 'lunar', 'lunch', 'lying', 'magic', 'major', 'maker',
  'maple', 'march', 'match', 'maybe', 'mayor', 'meant', 'medal', 'media', 'melon', 'mercy',
  'merge', 'merit', 'metal', 'meter', 'midst', 'might', 'minor', 'minus', 'mixed', 'model',
  'moist', 'money', 'month', 'moral', 'motor', 'mount', 'mouse', 'mouth', 'movie', 'music',
  'naive', 'naked', 'nasty', 'naval', 'nerve', 'never', 'newly', 'night', 'noble', 'noise',
  'north', 'noted', 'novel', 'nurse', 'occur', 'ocean', 'offer', 'often', 'olive', 'onion',
  'onset', 'opera', 'orbit', 'order', 'organ', 'other', 'ought', 'outer', 'owner', 'paint',
  'panel', 'panic', 'paper', 'party', 'pasta', 'patch', 'pause', 'peace', 'pearl', 'penny',
  'phase', 'phone', 'photo', 'piano', 'piece', 'pilot', 'pinch', 'pitch', 'pixel', 'place',
  'plain', 'plane', 'plant', 'plate', 'plaza', 'plead', 'point', 'polar', 'porch', 'pound',
  'power', 'press', 'price', 'pride', 'prime', 'print', 'prior', 'prize', 'proof', 'proud',
  'prove', 'pulse', 'punch', 'pupil', 'puppy', 'purse', 'queen', 'query', 'quest', 'queue',
  'quick', 'quiet', 'quite', 'quota', 'quote', 'radar', 'radio', 'raise', 'rally', 'ranch',
  'range', 'rapid', 'ratio', 'raven', 'reach', 'react', 'ready', 'realm', 'rebel', 'refer',
  'relax', 'relay', 'reply', 'rider', 'ridge', 'rifle', 'right', 'rigid', 'rival', 'river',
  'roast', 'robot', 'rocky', 'roman', 'rough', 'round', 'route', 'royal', 'rugby', 'ruler',
  'rumor', 'rural', 'sadly', 'saint', 'salad', 'sauce', 'scale', 'scare', 'scene', 'scent',
  'scope', 'score', 'scout', 'scrap', 'screw', 'sense', 'serve', 'seven', 'shade', 'shady',
  'shaft', 'shake', 'shall', 'shame', 'shape', 'share', 'shark', 'sharp', 'sheep', 'sheer',
  'sheet', 'shelf', 'shell', 'shift', 'shine', 'shiny', 'shirt', 'shock', 'shoot', 'shore',
  'short', 'shout', 'shown', 'sight', 'silly', 'since', 'sixth', 'sixty', 'skill', 'skirt',
  'skull', 'slate', 'sleep', 'slice', 'slide', 'slope', 'small', 'smart', 'smell', 'smile',
  'smoke', 'snake', 'sneak', 'solar', 'solid', 'solve', 'sorry', 'sound', 'south', 'space',
  'spare', 'spark', 'speak', 'spend', 'spent', 'spice', 'spicy', 'spike', 'split', 'spoke',
  'sport', 'spray', 'squad', 'stack', 'staff', 'stage', 'stain', 'stair', 'stake', 'stall',
  'stamp', 'stand', 'stark', 'start', 'state', 'steak', 'steal', 'steam', 'steel', 'steep',
  'steer', 'stern', 'stick', 'stiff', 'still', 'sting', 'stock', 'stone', 'stood', 'stool',
  'store', 'storm', 'story', 'stove', 'strap', 'straw', 'strip', 'stuck', 'study', 'stuff',
  'stump', 'style', 'sugar', 'suite', 'sunny', 'super', 'surge', 'swamp', 'swear', 'sweat',
  'sweep', 'sweet', 'swept', 'swift', 'swing', 'sword', 'table', 'taken', 'taste', 'teach',
  'teeth', 'tempo', 'tenth', 'thank', 'theft', 'their', 'theme', 'there', 'these', 'thick',
  'thief', 'thigh', 'thing', 'think', 'third', 'those', 'three', 'threw', 'throw', 'thumb',
  'tiger', 'tight', 'tired', 'title', 'toast', 'today', 'token', 'tooth', 'topic', 'torch',
  'total', 'touch', 'tough', 'tower', 'toxic', 'trace', 'track', 'trade', 'trail', 'train',
  'trait', 'tramp', 'trash', 'tread', 'treat', 'trend', 'trial', 'tribe', 'trick', 'tried',
  'troop', 'truck', 'truly', 'trunk', 'trust', 'truth', 'tulip', 'twice', 'twist', 'ultra',
  'uncle', 'under', 'union', 'unite', 'unity', 'until', 'upper', 'upset', 'urban', 'usage',
  'usual', 'vague', 'valid', 'value', 'vapor', 'vault', 'vinyl', 'viral', 'virus', 'visit',
  'vital', 'vivid', 'vocal', 'voice', 'voter', 'wagon', 'waist', 'waste', 'watch', 'water',
  'weary', 'weave', 'weigh', 'weird', 'whale', 'wheat', 'wheel', 'where', 'which', 'while',
  'white', 'whole', 'whose', 'widen', 'wider', 'width', 'witch', 'woman', 'world', 'worry',
  'worse', 'worst', 'worth', 'would', 'wound', 'wreck', 'wrist', 'write', 'wrong', 'wrote',
  'yacht', 'yield', 'young', 'youth', 'zebra',
];

const norm = (list: readonly string[]): string[] =>
  Array.from(new Set(list.map((w) => w.toLowerCase()))).filter((w) => /^[a-z]{5}$/.test(w));

/** Answer pool: common, fair five-letter solutions. */
export const ANSWER_WORDS: readonly string[] = norm(ANSWERS);

function unpack(packed: string): string[] {
  const out: string[] = [];
  for (let i = 0; i + 5 <= packed.length; i += 5) out.push(packed.slice(i, i + 5));
  return out;
}

/** Every valid guess: the bundled dictionary plus all answers. */
export const VALID_GUESSES: ReadonlySet<string> = new Set([
  ...unpack(PACKED_GUESSES),
  ...ANSWER_WORDS,
]);

/** Pick a random answer. */
export function randomAnswer(): string {
  return ANSWER_WORDS[Math.floor(Math.random() * ANSWER_WORDS.length)];
}

/** Whether a guess is an accepted dictionary word. */
export function isValidGuess(word: string): boolean {
  return VALID_GUESSES.has(word.toLowerCase());
}
