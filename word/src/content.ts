// Curated bank of interesting words. Definitions and example sentences are written
// for this app; origins are brief factual etymologies.

export interface Word {
  word: string;
  say: string; // readable pronunciation respelling
  pos: string; // part of speech
  definition: string;
  examples: string[];
  synonyms: string[];
  origin: string;
}

export const WORDS: Word[] = [
  {
    word: 'petrichor',
    say: 'PET-ri-kor',
    pos: 'noun',
    definition: 'The earthy, pleasant smell produced when rain falls on dry soil.',
    examples: [
      'The first monsoon shower filled the streets with petrichor.',
      'She opened the window just to breathe in the petrichor.',
    ],
    synonyms: ['rain scent', 'earthy aroma'],
    origin: 'Greek petra “stone” + ichor, the fluid said to flow in the veins of the gods.',
  },
  {
    word: 'ephemeral',
    say: 'ih-FEM-er-uhl',
    pos: 'adjective',
    definition: 'Lasting for a very short time; fleeting.',
    examples: [
      'Fireflies give off an ephemeral glow that fades in seconds.',
      'Fame can be surprisingly ephemeral.',
    ],
    synonyms: ['fleeting', 'transient', 'momentary'],
    origin: 'Greek ephēmeros “lasting only a day”.',
  },
  {
    word: 'serendipity',
    say: 'ser-uhn-DIP-ih-tee',
    pos: 'noun',
    definition: 'The occurrence of happy or useful things by chance rather than design.',
    examples: [
      'Finding that book was pure serendipity.',
      'Their meeting was a moment of serendipity that changed both their lives.',
    ],
    synonyms: ['chance', 'fluke', 'fortune'],
    origin: 'Coined by Horace Walpole in 1754 after the fairy tale “The Three Princes of Serendip”.',
  },
  {
    word: 'mellifluous',
    say: 'muh-LIF-loo-uhs',
    pos: 'adjective',
    definition: 'Sweet and smooth to listen to; pleasingly musical.',
    examples: [
      'The narrator had a deep, mellifluous voice.',
      'A mellifluous melody drifted from the café.',
    ],
    synonyms: ['dulcet', 'honeyed', 'euphonious'],
    origin: 'Latin mel “honey” + fluere “to flow”.',
  },
  {
    word: 'ineffable',
    say: 'in-EF-uh-buhl',
    pos: 'adjective',
    definition: 'Too great or beautiful to be expressed in words.',
    examples: [
      'The view from the summit was ineffable.',
      'She felt an ineffable joy holding her newborn.',
    ],
    synonyms: ['indescribable', 'inexpressible', 'unutterable'],
    origin: 'Latin in- “not” + effabilis “able to be spoken”.',
  },
  {
    word: 'sonder',
    say: 'SON-der',
    pos: 'noun',
    definition:
      'The realization that every passerby is living a life as vivid and complex as your own.',
    examples: [
      'A wave of sonder hit her on the crowded platform.',
      'Sonder makes a busy street feel a little less lonely.',
    ],
    synonyms: ['empathy', 'awareness'],
    origin: 'A modern coinage from “The Dictionary of Obscure Sorrows” (2012).',
  },
  {
    word: 'quixotic',
    say: 'kwik-SOT-ik',
    pos: 'adjective',
    definition: 'Wildly idealistic and impractical; chasing lofty but unreachable goals.',
    examples: [
      'His quixotic plan to sail around the world in a rowboat worried his friends.',
      'It was a quixotic quest, but a noble one.',
    ],
    synonyms: ['idealistic', 'unrealistic', 'starry-eyed'],
    origin: 'After Don Quixote, the dreamer-hero of Cervantes’ novel.',
  },
  {
    word: 'ebullient',
    say: 'ih-BULL-yuhnt',
    pos: 'adjective',
    definition: 'Cheerful, enthusiastic, and full of energy.',
    examples: [
      'She gave an ebullient speech that lifted the whole room.',
      'The puppy was ebullient the moment its owner walked in.',
    ],
    synonyms: ['exuberant', 'buoyant', 'effervescent'],
    origin: 'Latin ebullire “to boil up”.',
  },
  {
    word: 'halcyon',
    say: 'HAL-see-uhn',
    pos: 'adjective',
    definition: 'Denoting a past time that was idyllically happy and peaceful.',
    examples: [
      'They spoke of the halcyon days of their youth.',
      'It was a halcyon summer none of them would forget.',
    ],
    synonyms: ['golden', 'serene', 'carefree'],
    origin: 'From the halcyon, a mythical bird said to calm the seas.',
  },
  {
    word: 'susurrus',
    say: 'soo-SUR-uhs',
    pos: 'noun',
    definition: 'A soft whispering or rustling sound.',
    examples: [
      'A susurrus of leaves followed the evening breeze.',
      'The library held only the susurrus of turning pages.',
    ],
    synonyms: ['whisper', 'murmur', 'rustle'],
    origin: 'Latin susurrus “a humming, muttering”.',
  },
  {
    word: 'luminous',
    say: 'LOO-mih-nuhs',
    pos: 'adjective',
    definition: 'Giving off light; bright, radiant, or glowing.',
    examples: [
      'The luminous dial glowed in the dark.',
      'She had a luminous smile that filled the room.',
    ],
    synonyms: ['radiant', 'glowing', 'brilliant'],
    origin: 'Latin lumen “light”.',
  },
  {
    word: 'nebulous',
    say: 'NEB-yuh-luhs',
    pos: 'adjective',
    definition: 'Vague, hazy, or hard to define.',
    examples: [
      'His plans for the future were still nebulous.',
      'The idea was exciting but nebulous.',
    ],
    synonyms: ['vague', 'hazy', 'unclear'],
    origin: 'Latin nebula “mist, cloud”.',
  },
  {
    word: 'wanderlust',
    say: 'WON-der-lust',
    pos: 'noun',
    definition: 'A strong, restless desire to travel and explore the world.',
    examples: [
      'A single travel photo was enough to reignite her wanderlust.',
      'His wanderlust took him across four continents.',
    ],
    synonyms: ['itchy feet', 'restlessness'],
    origin: 'German wandern “to hike” + Lust “desire”.',
  },
  {
    word: 'epiphany',
    say: 'ih-PIF-uh-nee',
    pos: 'noun',
    definition: 'A sudden, striking moment of insight or realization.',
    examples: [
      'She had an epiphany in the shower and finally solved the problem.',
      'The book led him to a quiet epiphany about his career.',
    ],
    synonyms: ['revelation', 'insight', 'realization'],
    origin: 'Greek epiphaneia “manifestation, appearance”.',
  },
  {
    word: 'resilient',
    say: 'rih-ZIL-yuhnt',
    pos: 'adjective',
    definition: 'Able to recover quickly from difficulty or setbacks.',
    examples: [
      'Children are remarkably resilient.',
      'A resilient economy bounced back within a year.',
    ],
    synonyms: ['tough', 'hardy', 'buoyant'],
    origin: 'Latin resilire “to leap back”.',
  },
  {
    word: 'cacophony',
    say: 'kuh-KOF-uh-nee',
    pos: 'noun',
    definition: 'A harsh, jarring mixture of sounds.',
    examples: [
      'The market was a cacophony of horns and shouting.',
      'Their first rehearsal was pure cacophony.',
    ],
    synonyms: ['din', 'racket', 'discord'],
    origin: 'Greek kakos “bad” + phōnē “sound”.',
  },
  {
    word: 'labyrinthine',
    say: 'lab-uh-RIN-thine',
    pos: 'adjective',
    definition: 'Twisting, intricate, and confusing, like a maze.',
    examples: [
      'The old city had labyrinthine alleys.',
      'He got lost in the labyrinthine rules of the contract.',
    ],
    synonyms: ['maze-like', 'tangled', 'convoluted'],
    origin: 'From the Labyrinth built for the Minotaur in Greek myth.',
  },
  {
    word: 'incandescent',
    say: 'in-kan-DES-uhnt',
    pos: 'adjective',
    definition: 'Glowing with heat and light; also, intensely passionate.',
    examples: [
      'The incandescent filament lit the room with a warm glow.',
      'She gave an incandescent performance.',
    ],
    synonyms: ['glowing', 'radiant', 'blazing'],
    origin: 'Latin incandescere “to glow with heat”.',
  },
  {
    word: 'verdant',
    say: 'VUR-dnt',
    pos: 'adjective',
    definition: 'Green and lush with growing plants.',
    examples: [
      'Rolling verdant hills stretched to the horizon.',
      'After the rains, the valley turned verdant.',
    ],
    synonyms: ['lush', 'green', 'leafy'],
    origin: 'Old French verdoyant “becoming green”.',
  },
  {
    word: 'reverie',
    say: 'REV-uh-ree',
    pos: 'noun',
    definition: 'A state of being pleasantly lost in one’s thoughts; a daydream.',
    examples: [
      'The train ride sent him into a long reverie.',
      'She was startled out of her reverie by the doorbell.',
    ],
    synonyms: ['daydream', 'trance', 'musing'],
    origin: 'French rêverie “dreaming”.',
  },
  {
    word: 'panacea',
    say: 'pan-uh-SEE-uh',
    pos: 'noun',
    definition: 'A supposed cure or solution for all problems.',
    examples: [
      'Technology is not a panacea for every social ill.',
      'They marketed the tonic as a panacea.',
    ],
    synonyms: ['cure-all', 'remedy', 'elixir'],
    origin: 'Greek panakeia “all-healing”.',
  },
  {
    word: 'zeitgeist',
    say: 'TSYTE-guyst',
    pos: 'noun',
    definition: 'The defining spirit, mood, or ideas of a particular period.',
    examples: [
      'The film captured the zeitgeist of the nineties.',
      'Memes are a window into the internet’s zeitgeist.',
    ],
    synonyms: ['spirit of the age', 'mood', 'ethos'],
    origin: 'German Zeit “time” + Geist “spirit”.',
  },
  {
    word: 'ethereal',
    say: 'ih-THEER-ee-uhl',
    pos: 'adjective',
    definition: 'Delicate and light in a way that seems too perfect for this world.',
    examples: [
      'The dancer moved with ethereal grace.',
      'Mist gave the forest an ethereal glow.',
    ],
    synonyms: ['delicate', 'airy', 'celestial'],
    origin: 'Greek aithēr “upper, purer air”.',
  },
  {
    word: 'gossamer',
    say: 'GOSS-uh-mer',
    pos: 'noun',
    definition: 'Something extremely light, thin, and delicate.',
    examples: [
      'The dress was made of gossamer silk.',
      'Dew clung to a gossamer of spider silk.',
    ],
    synonyms: ['filament', 'cobweb', 'wisp'],
    origin: 'Middle English, probably “goose summer”, the time when fine cobwebs appear.',
  },
  {
    word: 'lucid',
    say: 'LOO-sid',
    pos: 'adjective',
    definition: 'Clear and easy to understand; thinking clearly.',
    examples: [
      'She gave a lucid explanation of the theory.',
      'He remained lucid despite the fever.',
    ],
    synonyms: ['clear', 'coherent', 'intelligible'],
    origin: 'Latin lucidus “bright, clear”.',
  },
  {
    word: 'myriad',
    say: 'MEER-ee-uhd',
    pos: 'noun',
    definition: 'A countless or extremely large number of things.',
    examples: [
      'A myriad of stars filled the desert sky.',
      'The city offers a myriad of things to do.',
    ],
    synonyms: ['multitude', 'host', 'countless'],
    origin: 'Greek murias “ten thousand”.',
  },
  {
    word: 'nostalgia',
    say: 'nos-TAL-juh',
    pos: 'noun',
    definition: 'A sentimental longing for a happy time in the past.',
    examples: [
      'The old song filled her with nostalgia.',
      'There’s a warm nostalgia to hand-written letters.',
    ],
    synonyms: ['wistfulness', 'longing', 'reminiscence'],
    origin: 'Greek nostos “homecoming” + algos “pain”.',
  },
  {
    word: 'effervescent',
    say: 'ef-er-VES-uhnt',
    pos: 'adjective',
    definition: 'Bubbly and lively; full of cheerful energy.',
    examples: [
      'Her effervescent personality made her easy to like.',
      'The drink was cold and effervescent.',
    ],
    synonyms: ['bubbly', 'vivacious', 'sparkling'],
    origin: 'Latin effervescere “to boil up”.',
  },
  {
    word: 'solace',
    say: 'SOL-is',
    pos: 'noun',
    definition: 'Comfort or consolation in a time of sadness or distress.',
    examples: [
      'She found solace in long walks by the sea.',
      'His words were a solace to the grieving family.',
    ],
    synonyms: ['comfort', 'consolation', 'relief'],
    origin: 'Latin solacium “comfort”.',
  },
  {
    word: 'aurora',
    say: 'uh-ROR-uh',
    pos: 'noun',
    definition: 'The dawn; also the shimmering natural light seen near the poles.',
    examples: [
      'They drove north hoping to catch the aurora.',
      'An aurora of pink and green rippled overhead.',
    ],
    synonyms: ['dawn', 'daybreak', 'northern lights'],
    origin: 'Latin aurora “dawn”, and the Roman goddess of the dawn.',
  },
];
