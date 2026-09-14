import type { SeedPassage } from "./seedPassages.types";

/**
 * Curated seed library. Every work below was published before 1930 and is in the
 * public domain (all texts are available through Project Gutenberg). The
 * selection skews toward plain, concrete, still-modern-sounding prose so the
 * eventual sentence-by-sentence alignment teaches rather than confuses the user
 * with archaic syntax.
 *
 * Works included:
 *   - Abraham Lincoln, The Gettysburg Address (1863)
 *   - Jane Austen, Pride and Prejudice (1813)
 *   - Robert Louis Stevenson, Travels with a Donkey in the Cévennes (1879)
 *   - Oscar Wilde, The Picture of Dorian Gray, Preface (1891)
 *   - Ambrose Bierce, The Devil's Dictionary (1906)
 *   - Mark Twain, Life on the Mississippi (1883)
 *   - Henry David Thoreau, Walden (1854)
 *   - William Hazlitt, On Going a Journey (1822)
 *   - Kenneth Grahame, The Wind in the Willows (1908)
 *   - Charles Dickens, Great Expectations (1861)
 *   - Stephen Crane, The Open Boat (1897)
 *   - Frederick Douglass, Narrative of the Life of Frederick Douglass (1845)
 *   - Jerome K. Jerome, Three Men in a Boat (1889)
 *   - Jack London, To Build a Fire (1908)
 *
 * A few excerpts drop an interjection or a clause to keep a passage inside the
 * length cap; those carry a "lightly-modernized" tag. The prose itself is the
 * author's. Em-dashes inside these historical texts are the author's own.
 */
export const seedPassages: SeedPassage[] = [
  {
    id: "lincoln-gettysburg-address",
    title: "The Gettysburg Address",
    author: "Abraham Lincoln",
    source: "Project Gutenberg",
    year: 1863,
    lengthBand: "short",
    tags: ["speech"],
    isCustom: false,
    sentences: [
      "Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal.",
      "Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure.",
      "We are met on a great battle-field of that war.",
    ],
  },
  {
    id: "austen-pride-and-prejudice",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    source: "Project Gutenberg",
    year: 1813,
    lengthBand: "short",
    tags: ["novel"],
    isCustom: false,
    sentences: [
      "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.",
      "However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.",
    ],
  },
  {
    id: "stevenson-travels-with-a-donkey",
    title: "Travels with a Donkey in the Cévennes",
    author: "Robert Louis Stevenson",
    source: "Project Gutenberg",
    year: 1879,
    lengthBand: "short",
    tags: ["essay", "travel"],
    isCustom: false,
    sentences: [
      "For my part, I travel not to go anywhere, but to go.",
      "I travel for travel's sake.",
      "The great affair is to move; to feel the needs and hitches of our life more nearly, to come down off this feather-bed of civilisation, and find the globe granite underfoot and strewn with cutting flints.",
    ],
  },
  {
    id: "wilde-dorian-gray-preface",
    title: "The Picture of Dorian Gray (Preface)",
    author: "Oscar Wilde",
    source: "Project Gutenberg",
    year: 1891,
    lengthBand: "short",
    tags: ["aphorism"],
    isCustom: false,
    sentences: [
      "The artist is the creator of beautiful things.",
      "To reveal art and conceal the artist is art's aim.",
      "Those who find beautiful meanings in beautiful things are the cultivated.",
    ],
  },
  {
    id: "bierce-devils-dictionary",
    title: "The Devil's Dictionary",
    author: "Ambrose Bierce",
    source: "Project Gutenberg",
    year: 1906,
    lengthBand: "short",
    tags: ["aphorism", "satire"],
    isCustom: false,
    sentences: [
      "Patience, n. A minor form of despair, disguised as a virtue.",
      "Bore, n. A person who talks when you wish him to listen.",
      "Positive, adj. Mistaken at the top of one's voice.",
    ],
  },
  {
    id: "twain-life-on-the-mississippi",
    title: "Life on the Mississippi",
    author: "Mark Twain",
    source: "Project Gutenberg",
    year: 1883,
    lengthBand: "medium",
    tags: ["memoir"],
    isCustom: false,
    sentences: [
      "The face of the water, in time, became a wonderful book.",
      "It was a book that was a dead language to the uneducated passenger, but which told its mind to me without reserve, delivering its most cherished secrets as clearly as if it uttered them with a voice.",
      "And it was not a book to be read once and thrown aside, for it had a new story to tell every day.",
      "Throughout the long twelve hundred miles there was never a page that was void of interest, never one that you could leave unread without loss, never one that you would want to skip.",
      "There never was so wonderful a book written by man; never one whose interest was so absorbing, so unflagging, so sparkling.",
      "The passenger who could not read it saw nothing but pretty pictures, painted by the sun and shaded by the clouds, whereas to the trained eye these were the grimmest and most dead-earnest of reading-matter.",
    ],
  },
  {
    id: "thoreau-walden",
    title: "Walden",
    author: "Henry David Thoreau",
    source: "Project Gutenberg",
    year: 1854,
    lengthBand: "medium",
    tags: ["essay"],
    isCustom: false,
    sentences: [
      "I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived.",
      "I did not wish to live what was not life, living is so dear; nor did I wish to practise resignation, unless it was quite necessary.",
      "I wanted to live deep and suck out all the marrow of life, to live so sturdily and Spartan-like as to put to rout all that was not life.",
      "Our life is frittered away by detail.",
      "Simplicity, simplicity, simplicity! I say, let your affairs be as two or three, and not a hundred or a thousand.",
    ],
  },
  {
    id: "hazlitt-on-going-a-journey",
    title: "On Going a Journey",
    author: "William Hazlitt",
    source: "Project Gutenberg",
    year: 1822,
    lengthBand: "medium",
    tags: ["essay"],
    isCustom: false,
    sentences: [
      "One of the pleasantest things in the world is going a journey; but I like to go by myself.",
      "I can enjoy society in a room; but out of doors, nature is company enough for me.",
      "I am then never less alone than when alone.",
      "When I am in the country, I wish to vegetate like the country.",
      "I go out of town in order to forget the town and all that is in it.",
    ],
  },
  {
    id: "grahame-wind-in-the-willows",
    title: "The Wind in the Willows",
    author: "Kenneth Grahame",
    source: "Project Gutenberg",
    year: 1908,
    lengthBand: "medium",
    tags: ["novel", "lightly-modernized"],
    isCustom: false,
    sentences: [
      "The Mole had been working very hard all the morning, spring-cleaning his little home.",
      "First with brooms, then with dusters; then on ladders and steps and chairs, with a brush and a pail of whitewash; till he had dust in his throat and eyes, and splashes of whitewash all over his black fur, and an aching back and weary arms.",
      "Spring was moving in the air above and in the earth below and around him, penetrating even his dark and lowly little house with its spirit of divine discontent and longing.",
      "It was small wonder, then, that he suddenly flung down his brush on the floor, said that he had had enough, and bolted out of the house without even waiting to put on his coat.",
      "Something up above was calling him imperiously, and he made for the steep little tunnel which answered in his case to the gravelled carriage-drive owned by animals whose residences are nearer to the sun and air.",
    ],
  },
  {
    id: "dickens-great-expectations",
    title: "Great Expectations",
    author: "Charles Dickens",
    source: "Project Gutenberg",
    year: 1861,
    lengthBand: "medium",
    tags: ["novel"],
    isCustom: false,
    sentences: [
      "My father's family name being Pirrip, and my Christian name Philip, my infant tongue could make of both names nothing longer or more explicit than Pip.",
      "So, I called myself Pip, and came to be called Pip.",
      "I give Pirrip as my father's family name, on the authority of his tombstone and my sister, Mrs. Joe Gargery, who married the blacksmith.",
      "As I never saw my father or my mother, and never saw any likeness of either of them, my first fancies regarding what they were like were unreasonably derived from their tombstones.",
      "The shape of the letters on my father's gave me an odd idea that he was a square, stout, dark man, with curly black hair.",
      "From the character and turn of the inscription, I drew a childish conclusion that my mother was freckled and sickly.",
    ],
  },
  {
    id: "crane-the-open-boat",
    title: "The Open Boat",
    author: "Stephen Crane",
    source: "Project Gutenberg",
    year: 1897,
    lengthBand: "medium",
    tags: ["short-story"],
    isCustom: false,
    sentences: [
      "None of them knew the colour of the sky.",
      "Their eyes glanced level, and were fastened upon the waves that swept toward them.",
      "These waves were of the hue of slate, save for the tops, which were of foaming white, and all of the men knew the colours of the sea.",
      "The horizon narrowed and widened, and dipped and rose, and at all times its edge was jagged with waves that seemed thrust up in points like rocks.",
      "Many a man ought to have a bath-tub larger than the boat which here rode upon the sea.",
      "These waves were most wrongfully and barbarously abrupt and tall, and each froth-top was a problem in small-boat navigation.",
    ],
  },
  {
    id: "douglass-narrative-of-the-life",
    title: "Narrative of the Life of Frederick Douglass",
    author: "Frederick Douglass",
    source: "Project Gutenberg",
    year: 1845,
    lengthBand: "long",
    tags: ["memoir"],
    isCustom: false,
    sentences: [
      "I was born in Tuckahoe, near Hillsborough, and about twelve miles from Easton, in Talbot county, Maryland.",
      "I have no accurate knowledge of my age, never having seen any authentic record containing it.",
      "By far the larger part of the slaves know as little of their ages as horses know of theirs, and it is the wish of most masters within my knowledge to keep their slaves thus ignorant.",
      "I do not remember to have ever met a slave who could tell of his birthday.",
      "They seldom come nearer to it than planting-time, harvest-time, cherry-time, spring-time, or fall-time.",
      "A want of information concerning my own was a source of unhappiness to me even during childhood.",
      "The white children could tell their ages.",
      "I could not tell why I ought to be deprived of the same privilege.",
      "I was not allowed to make any inquiries of my master concerning it.",
      "He deemed all such inquiries on the part of a slave improper and impertinent, and evidence of a restless spirit.",
    ],
  },
  {
    id: "jerome-three-men-in-a-boat",
    title: "Three Men in a Boat",
    author: "Jerome K. Jerome",
    source: "Project Gutenberg",
    year: 1889,
    lengthBand: "long",
    tags: ["novel", "comic"],
    isCustom: false,
    sentences: [
      "There were four of us — George, and William Samuel Harris, and myself, and Montmorency.",
      "We were sitting in my room, smoking, and talking about how bad we were, bad from a medical point of view I mean, of course.",
      "We were all feeling seedy, and we were getting quite nervous about it.",
      "Harris said he felt such extraordinary fits of giddiness come over him at times, that he hardly knew what he was doing.",
      "And then George said that he had fits of giddiness too, and hardly knew what he was doing.",
      "With me, it was my liver that was out of order.",
      "I knew it was my liver that was out of order, because I had just been reading a patent liver-pill circular, in which were detailed the various symptoms by which a man could tell when his liver was out of order.",
      "I had them all.",
      "It is a most extraordinary thing, but I never read a patent medicine advertisement without being impelled to the conclusion that I am suffering from the particular disease therein dealt with in its most virulent form.",
      "The diagnosis seems in every case to correspond exactly with all the sensations that I have ever felt.",
      "I remember going to the British Museum one day to read up the treatment for some slight ailment of which I had a touch.",
    ],
  },
  {
    id: "london-to-build-a-fire",
    title: "To Build a Fire",
    author: "Jack London",
    source: "Project Gutenberg",
    year: 1908,
    lengthBand: "long",
    tags: ["short-story"],
    isCustom: false,
    sentences: [
      "Day had broken cold and grey, exceedingly cold and grey, when the man turned aside from the main Yukon trail and climbed the high earth-bank, where a dim and little-travelled trail led eastward through the fat spruce timberland.",
      "It was a steep bank, and he paused for breath at the top, excusing the act to himself by looking at his watch.",
      "It was nine o'clock.",
      "There was no sun nor hint of sun, though there was not a cloud in the sky.",
      "It was a clear day, and yet there seemed an intangible pall over the face of things, a subtle gloom that made the day dark.",
      "This fact did not worry the man.",
      "He was used to the lack of sun.",
      "It had been days since he had seen the sun, and he knew that a few more days must pass before that cheerful orb would peep above the sky-line and dip immediately from view.",
      "The man flung a look back along the way he had come.",
      "The Yukon lay a mile wide and hidden under three feet of ice.",
      "On top of this ice were as many feet of snow.",
    ],
  },
];
