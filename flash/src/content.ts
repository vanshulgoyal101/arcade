// Original short passages with comprehension questions.
// All text is written for this app to avoid any copyright concerns.

export interface Question {
  q: string;
  options: string[];
  answer: number; // index into options
}

export interface Passage {
  id: string;
  title: string;
  text: string;
  questions: Question[];
}

export const PASSAGES: Passage[] = [
  {
    id: 'octopus',
    title: 'The Clever Octopus',
    text: `An octopus has three hearts and blue blood. Two of its hearts pump blood to the gills, while the third pushes it around the rest of the body. Strangely, that main heart stops beating whenever the animal swims, which is one reason octopuses often prefer to crawl. Each of their eight arms can taste and touch on its own, and roughly two thirds of their neurons live in the arms rather than the brain.`,
    questions: [
      { q: 'How many hearts does an octopus have?', options: ['One', 'Two', 'Three', 'Eight'], answer: 2 },
      { q: 'What happens to the main heart when the octopus swims?', options: ['It beats faster', 'It stops beating', 'It changes colour', 'It splits in two'], answer: 1 },
      { q: 'Where do most of an octopus\u2019s neurons live?', options: ['In the brain', 'In the eyes', 'In the arms', 'In the gills'], answer: 2 },
    ],
  },
  {
    id: 'honey',
    title: 'Honey Never Spoils',
    text: `Archaeologists once opened ancient Egyptian tombs and found pots of honey that were still perfectly edible after thousands of years. Honey lasts because it holds very little water and is naturally acidic, so bacteria cannot grow in it. Bees also add an enzyme that produces a small amount of hydrogen peroxide. As long as the jar stays sealed and dry, honey can outlast almost every other food a kitchen has ever stored.`,
    questions: [
      { q: 'Where was the ancient edible honey found?', options: ['Roman baths', 'Egyptian tombs', 'Greek temples', 'Viking ships'], answer: 1 },
      { q: 'Why can bacteria not grow in honey?', options: ['It is frozen', 'It is very sweet only', 'Low water and acidity', 'It contains salt'], answer: 2 },
      { q: 'What must stay true for honey to last?', options: ['Kept sealed and dry', 'Kept warm', 'Stirred daily', 'Exposed to air'], answer: 0 },
    ],
  },
  {
    id: 'moon',
    title: 'The Drifting Moon',
    text: `The Moon is slowly moving away from Earth at about four centimetres every year, roughly the speed your fingernails grow. This happens because the Moon\u2019s gravity raises tides, and those tides gently push energy back and forth between the two bodies. As the Moon drifts outward, Earth\u2019s spin also slows, making our days a tiny bit longer over millions of years. Long ago, a day on Earth lasted only about six hours.`,
    questions: [
      { q: 'How fast is the Moon moving away each year?', options: ['Four metres', 'Four centimetres', 'Four kilometres', 'It is not moving'], answer: 1 },
      { q: 'What causes the Moon to drift outward?', options: ['Solar wind', 'Tides and gravity', 'Meteor impacts', 'Earth\u2019s magnetism'], answer: 1 },
      { q: 'How long was a day on Earth long ago?', options: ['About six hours', 'About twelve hours', 'About thirty hours', 'Exactly the same'], answer: 0 },
    ],
  },
  {
    id: 'sleep',
    title: 'Why We Sleep',
    text: `During deep sleep, the brain runs a kind of nightly cleaning service. Channels between its cells widen, and fluid washes through to carry away waste that builds up while we are awake. Sleep also helps lock in memories, moving the day\u2019s important moments into longer storage. People who regularly sleep too little tend to struggle with focus and mood, which is why a steady bedtime often matters more than any single late night of rest.`,
    questions: [
      { q: 'What does the brain do during deep sleep?', options: ['Grows new eyes', 'Washes away waste', 'Stops all activity', 'Shrinks permanently'], answer: 1 },
      { q: 'What else does sleep help with?', options: ['Locking in memories', 'Digesting food', 'Cooling the blood', 'Building muscle only'], answer: 0 },
      { q: 'What matters more than one late night?', options: ['A big breakfast', 'A steady bedtime', 'A dark room only', 'Loud music'], answer: 1 },
    ],
  },
  {
    id: 'trees',
    title: 'The Hidden Forest Network',
    text: `Beneath a forest floor, tree roots connect to threadlike fungi that spread through the soil in vast webs. Through this network, trees can trade sugar, water, and warning signals. A large old tree may share food with younger seedlings growing in its shade, and a tree under attack by insects can send chemical alerts that prompt its neighbours to raise their defences. Scientists sometimes call this quiet underground system the wood wide web.`,
    questions: [
      { q: 'What connects tree roots underground?', options: ['Plastic pipes', 'Threadlike fungi', 'Metal wires', 'Nothing at all'], answer: 1 },
      { q: 'What can trees trade through the network?', options: ['Only oxygen', 'Sugar, water, signals', 'Seeds only', 'Sunlight'], answer: 1 },
      { q: 'What nickname is given to this system?', options: ['The root road', 'The wood wide web', 'The green grid', 'The soil net'], answer: 1 },
    ],
  },
  {
    id: 'lightning',
    title: 'A Bolt of Lightning',
    text: `A single bolt of lightning heats the air around it to roughly five times hotter than the surface of the Sun. That sudden burst of heat makes the air expand so violently that it creates the shockwave we hear as thunder. Because light travels far faster than sound, you always see the flash before the rumble arrives. Counting the seconds between them gives a rough idea of how many kilometres away the storm really is.`,
    questions: [
      { q: 'How hot does lightning make the air?', options: ['As hot as the Sun', 'Five times hotter than the Sun', 'Slightly warm', 'Colder than ice'], answer: 1 },
      { q: 'What do we hear as thunder?', options: ['A shockwave from expanding air', 'The bolt landing', 'Rain falling', 'Wind only'], answer: 0 },
      { q: 'Why do we see the flash first?', options: ['Light travels faster than sound', 'Sound travels faster', 'Our eyes are quicker', 'Thunder is delayed on purpose'], answer: 0 },
    ],
  },
  {
    id: 'memory',
    title: 'How Memory Works',
    text: `Memory is less like a video recording and more like a story we rebuild each time we recall it. Every time you remember an event, your brain reassembles the pieces, and small details can quietly change in the process. This is why two people can honestly recall the same day quite differently. Writing things down or repeating them out loud helps because each careful review strengthens the connections that hold the memory together.`,
    questions: [
      { q: 'Memory is compared to what?', options: ['A video recording', 'A rebuilt story', 'A locked safe', 'A photograph'], answer: 1 },
      { q: 'Why can two people recall a day differently?', options: ['Memory is rebuilt each time', 'One person lies', 'Brains are identical', 'Days repeat'], answer: 0 },
      { q: 'What helps strengthen a memory?', options: ['Ignoring it', 'Careful review or repetition', 'Sleeping less', 'Eating sugar'], answer: 1 },
    ],
  },
  {
    id: 'volcano',
    title: 'Islands Born of Fire',
    text: `Many islands begin their lives underwater as volcanoes. Molten rock rises through cracks in the ocean floor, cools in the cold water, and slowly piles up layer by layer. After countless eruptions, a peak may finally break the surface and become dry land. Over time, wind and birds carry seeds to the bare rock, plants take hold, and a living landscape grows on ground that was once nothing but fire and stone.`,
    questions: [
      { q: 'How do many islands begin?', options: ['As sandbars', 'As underwater volcanoes', 'As floating ice', 'As coral only'], answer: 1 },
      { q: 'What finally makes the peak become land?', options: ['It breaks the surface', 'It freezes solid', 'It drifts ashore', 'It is built by people'], answer: 0 },
      { q: 'How do plants reach the bare rock?', options: ['They grow from lava', 'Wind and birds carry seeds', 'They were always there', 'Fish plant them'], answer: 1 },
    ],
  },
  {
    id: 'penguins',
    title: 'Penguins in the Cold',
    text: `Emperor penguins survive brutal winters by huddling together in enormous groups. The birds on the outside face the biting wind, so the huddle constantly shuffles, letting each penguin take a turn in the warm centre before rotating back to the edge. This slow, fair rotation keeps the whole colony alive. A tightly packed huddle can be dozens of degrees warmer inside than the freezing air just beyond its outer wall.`,
    questions: [
      { q: 'How do emperor penguins stay warm?', options: ['They fly south', 'They huddle together', 'They dig burrows', 'They eat more'], answer: 1 },
      { q: 'Why does the huddle keep shuffling?', options: ['To find food', 'So each takes a turn inside', 'To scare predators', 'To stay awake'], answer: 1 },
      { q: 'How warm can the huddle centre be?', options: ['The same as outside', 'Dozens of degrees warmer', 'Colder than the edge', 'Below freezing'], answer: 1 },
    ],
  },
  {
    id: 'reading',
    title: 'The Art of Fast Reading',
    text: `Faster reading is mostly about moving your eyes with purpose. Slow readers tend to stop on every single word and silently pronounce each one in their head. Trained readers take in small groups of words at a glance and trust their brain to fill in the gaps. The goal is never to skip understanding, but to stop wasting time on habits that add nothing. With steady practice, comfortable speed climbs on its own.`,
    questions: [
      { q: 'What do slow readers tend to do?', options: ['Read in groups', 'Stop on every word', 'Skip whole lines', 'Read backwards'], answer: 1 },
      { q: 'What do trained readers do instead?', options: ['Take in groups of words', 'Read one letter at a time', 'Avoid reading', 'Move their lips'], answer: 0 },
      { q: 'What is the real goal of fast reading?', options: ['Skipping understanding', 'Cutting wasteful habits', 'Reading less often', 'Memorising fonts'], answer: 1 },
    ],
  },
];
