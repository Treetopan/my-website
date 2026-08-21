/**
 * The curriculum tree: subject → course → unit → subunit → questions.
 *
 * Difficulty lives on the SUBUNIT and is never something the student picks.
 * It describes how hard the material is to answer *quickly*, which is why it
 * sets the clock and the XP rather than filtering anything. A student drills
 * down to what they're studying; the difficulty label just tells them what
 * they're walking into.
 *
 * Content here is a stocked slice, not a full syllabus. Courses with no units
 * are deliberate placeholders so the hierarchy reads honestly — swap real
 * curriculum in here and nothing else in the app has to change.
 */

export type Difficulty = "easy" | "medium" | "hard";

export type Question = {
  id: string;
  prompt: string;
  options: string[];
  /** Index into `options`. */
  answer: number;
};

export type Subunit = {
  id: string;
  code: string;
  name: string;
  difficulty: Difficulty;
  questions: Question[];
};

export type Unit = {
  id: string;
  code: string;
  name: string;
  subunits: Subunit[];
};

export type Course = {
  id: string;
  name: string;
  blurb: string;
  units: Unit[];
};

export type Subject = {
  id: string;
  name: string;
  blurb: string;
  courses: Course[];
};

export const DIFFICULTY: Record<
  Difficulty,
  { name: string; note: string; seconds: number; xp: number }
> = {
  easy: {
    name: "Easy",
    note: "Recall — you either know it or you don't",
    seconds: 15,
    xp: 10,
  },
  medium: {
    name: "Medium",
    note: "A step of reasoning before you answer",
    seconds: 22,
    xp: 20,
  },
  hard: {
    name: "Hard",
    note: "Multi-step. Slow to answer even when you know it",
    seconds: 30,
    xp: 35,
  },
};

/** [prompt, [4 options], answerIndex] */
type Row = [string, [string, string, string, string], number];

function sub(
  unitId: string,
  code: string,
  name: string,
  difficulty: Difficulty,
  rows: Row[],
): Subunit {
  const id = `${unitId}/${code}`;
  return {
    id,
    code,
    name,
    difficulty,
    questions: rows.map((r, i) => ({
      id: `${id}/q${i}`,
      prompt: r[0],
      options: [...r[1]],
      answer: r[2],
    })),
  };
}

function unit(courseId: string, code: string, name: string, make: (id: string) => Subunit[]): Unit {
  const id = `${courseId}/${code}`;
  return { id, code, name, subunits: make(id) };
}

// ─── Science · AP Biology ────────────────────────────────
const bioU1 = unit("science/ap-biology", "unit-1", "Chemistry of Life", (u) => [
  sub(u, "1.1", "Structure of Water and Hydrogen Bonding", "easy", [
    ["Which property of water lets it climb up a narrow tube against gravity?", ["Capillary action", "Surface tension", "Specific heat", "Density"], 0],
    ["Water molecules are held to one another by which type of bond?", ["Ionic bonds", "Hydrogen bonds", "Covalent bonds", "Peptide bonds"], 1],
    ["Why does ice float on liquid water?", ["It is warmer", "It is less dense", "It is more dense", "It has more mass"], 1],
    ["Water is described as polar because it has", ["An overall charge", "Uneven charge distribution", "Only nonpolar bonds", "No electrons"], 1],
    ["Water's high specific heat means it", ["Heats up very quickly", "Resists temperature change", "Cannot dissolve salts", "Boils below 100 °C"], 1],
  ]),
  sub(u, "1.2", "Elements of Life", "easy", [
    ["Which four elements make up roughly 96% of living matter?", ["C, H, O, N", "C, H, O, S", "N, O, P, K", "C, N, P, Fe"], 0],
    ["Which element forms the backbone of all organic molecules?", ["Nitrogen", "Carbon", "Oxygen", "Phosphorus"], 1],
    ["Phosphorus is a key component of which molecules?", ["Nucleic acids and ATP", "Only proteins", "Only lipids", "Only carbohydrates"], 0],
    ["Nitrogen is found in which two macromolecule classes?", ["Lipids and carbohydrates", "Proteins and nucleic acids", "Only proteins", "Only nucleic acids"], 1],
    ["How many bonds can a single carbon atom form?", ["Two", "Three", "Four", "Six"], 2],
  ]),
  sub(u, "1.3", "Biological Macromolecules", "medium", [
    ["Which reaction joins monomers by removing a water molecule?", ["Hydrolysis", "Dehydration synthesis", "Oxidation", "Phosphorylation"], 1],
    ["The monomer of a protein is", ["A nucleotide", "An amino acid", "A monosaccharide", "A fatty acid"], 1],
    ["Which level of protein structure is the sequence of amino acids?", ["Primary", "Secondary", "Tertiary", "Quaternary"], 0],
    ["Which macromolecule class is not built from repeating monomers?", ["Proteins", "Lipids", "Nucleic acids", "Carbohydrates"], 1],
    ["A phospholipid is amphipathic, meaning it has", ["Two hydrophobic ends", "A hydrophilic head and hydrophobic tails", "No charge anywhere", "Only polar regions"], 1],
  ]),
]);

const bioU2 = unit("science/ap-biology", "unit-2", "Cell Structure and Function", (u) => [
  sub(u, "2.1", "Cell Structure and Subcellular Components", "easy", [
    ["Which organelle is the site of protein synthesis?", ["Ribosome", "Lysosome", "Golgi apparatus", "Vacuole"], 0],
    ["Rough endoplasmic reticulum is 'rough' because it is studded with", ["Lysosomes", "Ribosomes", "Vesicles", "Mitochondria"], 1],
    ["Which structure packages and ships proteins out of the cell?", ["Nucleolus", "Golgi apparatus", "Peroxisome", "Centriole"], 1],
    ["Which organelle contains hydrolytic enzymes for breaking down waste?", ["Lysosome", "Ribosome", "Chloroplast", "Nucleus"], 0],
    ["Prokaryotic cells are distinguished by lacking", ["A cell membrane", "A membrane-bound nucleus", "Ribosomes", "DNA"], 1],
  ]),
  sub(u, "2.2", "Cell Size and Surface Area to Volume", "medium", [
    ["As a cell grows, its volume increases", ["Faster than its surface area", "Slower than its surface area", "At the same rate", "Not at all"], 0],
    ["A high surface-area-to-volume ratio helps a cell", ["Store more waste", "Exchange materials efficiently", "Divide more slowly", "Reduce its metabolism"], 1],
    ["Which shape gives a cell the greatest surface area for a fixed volume?", ["Sphere", "Cube", "Elongated and folded", "Perfectly flat disc"], 2],
    ["Doubling the radius of a spherical cell multiplies its volume by", ["Two", "Four", "Six", "Eight"], 3],
    ["Root hair cells increase absorption primarily by", ["Increasing surface area", "Reducing volume", "Adding more nuclei", "Thickening the cell wall"], 0],
  ]),
  sub(u, "2.3", "Plasma Membranes and Transport", "hard", [
    ["Facilitated diffusion differs from simple diffusion because it", ["Requires ATP", "Uses transport proteins", "Moves against the gradient", "Only moves water"], 1],
    ["The sodium-potassium pump moves ions", ["Down their gradients using no energy", "Against their gradients using ATP", "Only during osmosis", "Through the lipid bilayer directly"], 1],
    ["A cell placed in a hypertonic solution will", ["Swell and burst", "Lose water and shrink", "Stay exactly the same", "Gain solute only"], 1],
    ["Which best describes the fluid mosaic model?", ["A rigid protein sheet", "A lipid bilayer with drifting proteins", "A solid crystalline lattice", "A single layer of phospholipids"], 1],
    ["Water crosses membranes rapidly through channels called", ["Porins", "Aquaporins", "Ion pumps", "Desmosomes"], 1],
  ]),
]);

// ─── History · AP World History ──────────────────────────
const worldU1 = unit("history/ap-world", "unit-1", "The Global Tapestry, 1200–1450", (u) => [
  sub(u, "1.1", "Developments in East Asia", "medium", [
    ["Which Chinese dynasty was in power at the start of the period in 1200?", ["Tang", "Song", "Ming", "Qing"], 1],
    ["The Song economy was transformed by the introduction of which rice variety?", ["Basmati", "Champa rice", "Japonica", "Wild rice"], 1],
    ["Neo-Confucianism combined Confucian thought with elements of", ["Islam and Judaism", "Buddhism and Daoism", "Christianity", "Shinto only"], 1],
    ["The civil service examination system primarily recruited officials based on", ["Noble birth", "Merit through examination", "Military service", "Wealth alone"], 1],
    ["Which technology, spread from Song China, transformed maritime navigation?", ["The magnetic compass", "The telescope", "The chronometer", "The astrolabe"], 0],
  ]),
  sub(u, "1.2", "Developments in Dar al-Islam", "medium", [
    ["Which city became the intellectual centre of the Abbasid Caliphate?", ["Cairo", "Baghdad", "Damascus", "Córdoba"], 1],
    ["The House of Wisdom was renowned for", ["Military training", "Translation and scholarship", "Coin minting", "Shipbuilding"], 1],
    ["Sufism is best described as", ["A legal school", "A mystical tradition within Islam", "A military order", "A trade guild"], 1],
    ["Which scholar's medical encyclopedia was used in Europe for centuries?", ["Ibn Sina", "Ibn Battuta", "Al-Khwarizmi", "Ibn Khaldun"], 0],
    ["Turkic peoples entered the Islamic world largely as", ["Missionaries", "Enslaved soldiers and migrants", "Sea traders", "Monastic scholars"], 1],
  ]),
  sub(u, "1.3", "State Building in the Americas", "easy", [
    ["The Inca Empire was centred in which mountain range?", ["Rockies", "Andes", "Sierra Madre", "Appalachians"], 1],
    ["Which system required Incan subjects to provide labour to the state?", ["Mit'a", "Encomienda", "Corvée", "Serfdom"], 0],
    ["The Aztec capital Tenochtitlan was built on", ["A desert plateau", "An island in a lake", "A river delta", "A coastal cliff"], 1],
    ["Chinampas were used by the Aztecs for", ["Burial", "Agriculture", "Defence", "Astronomy"], 1],
    ["The Incas recorded information using knotted cords called", ["Quipu", "Codices", "Glyphs", "Tablets"], 0],
  ]),
]);

const worldU2 = unit("history/ap-world", "unit-2", "Networks of Exchange", (u) => [
  sub(u, "2.1", "The Silk Roads", "easy", [
    ["The Silk Roads primarily connected China with", ["The Americas", "The Mediterranean world", "Australia", "Southern Africa"], 1],
    ["Which innovation allowed merchants to travel without carrying coin?", ["Flying cash and credit", "The gold standard", "Paper maps", "Bills of lading"], 0],
    ["Caravanserai were best described as", ["Roadside inns for traders", "Border fortresses", "Temples", "Marketplaces for slaves only"], 0],
    ["Besides goods, the Silk Roads spread", ["Only silk", "Religions and disease", "Only spices", "Only metals"], 1],
    ["Which pack animal made long desert crossings practical?", ["Horse", "Camel", "Ox", "Donkey"], 1],
  ]),
  sub(u, "2.2", "The Mongol Empire", "medium", [
    ["Who unified the Mongol tribes in the early 13th century?", ["Kublai Khan", "Genghis Khan", "Timur", "Batu Khan"], 1],
    ["The Pax Mongolica refers to", ["A peace treaty with China", "A period of safe overland trade", "A Mongol religious code", "A military alliance with Persia"], 1],
    ["Kublai Khan founded which dynasty in China?", ["Ming", "Yuan", "Qing", "Jin"], 1],
    ["Mongol administration commonly relied on", ["Eliminating all local elites", "Employing local bureaucrats", "Direct rule from Mongolia only", "Rotating European advisors"], 1],
    ["The Mongol relay messenger system was known as the", ["Yam", "Divan", "Kuriltai", "Ordu"], 0],
  ]),
  sub(u, "2.3", "Indian Ocean Trade", "medium", [
    ["Indian Ocean trade depended most on which natural cycle?", ["Ocean currents only", "Monsoon winds", "Tidal ranges", "Solar seasons"], 1],
    ["Which East African cities grew wealthy from this trade?", ["Swahili coast city-states", "Saharan oases", "Nile delta ports only", "Cape colonies"], 0],
    ["Swahili emerged as a language blending Bantu with", ["Portuguese", "Arabic", "Hindi", "Persian only"], 1],
    ["Which vessel, with a triangular sail, was characteristic of the region?", ["Junk", "Dhow", "Caravel", "Galley"], 1],
    ["Diasporic merchant communities formed mainly to", ["Wage war", "Sustain long-distance trade networks", "Collect taxes for empires", "Spread a single religion"], 1],
  ]),
]);

// ─── Math · AP Statistics ────────────────────────────────
const statsU1 = unit("math/ap-statistics", "unit-1", "Exploring One-Variable Data", (u) => [
  sub(u, "1.1", "Representing Categorical Data", "easy", [
    ["Which display is appropriate for categorical data?", ["Histogram", "Bar chart", "Boxplot", "Scatterplot"], 1],
    ["A relative frequency table reports each category as", ["A raw count", "A proportion of the total", "A running total", "A standard deviation"], 1],
    ["Bars in a bar chart are separated by gaps because", ["Categories are not continuous", "It looks better", "The data are sorted", "Counts are estimates"], 0],
    ["A two-way table is used to display", ["One categorical variable", "Two categorical variables", "One quantitative variable", "Residuals"], 1],
    ["A pie chart is most appropriate when the categories", ["Overlap freely", "Make up a whole", "Are quantitative", "Are time-ordered"], 1],
  ]),
  sub(u, "1.2", "Describing Distributions", "medium", [
    ["A distribution with a long right tail is described as", ["Left-skewed", "Right-skewed", "Symmetric", "Uniform"], 1],
    ["In a right-skewed distribution, the mean is usually", ["Less than the median", "Greater than the median", "Equal to the median", "Undefined"], 1],
    ["Which measure of centre is resistant to outliers?", ["Mean", "Median", "Range", "Standard deviation"], 1],
    ["The shape, centre, spread and unusual features should be described", ["In any single one", "All four, in context", "Only shape and centre", "Only spread"], 1],
    ["A distribution with two distinct peaks is called", ["Uniform", "Bimodal", "Skewed", "Normal"], 1],
  ]),
  sub(u, "1.3", "Summary Statistics and Outliers", "medium", [
    ["The interquartile range is calculated as", ["Q3 − Q1", "Max − Min", "Q3 + Q1", "Mean − Median"], 0],
    ["By the 1.5 × IQR rule, an outlier lies beyond", ["Q1 − 1.5·IQR or Q3 + 1.5·IQR", "The mean ± 1.5", "Two standard deviations", "The median ± IQR"], 0],
    ["Standard deviation measures", ["Typical distance from the mean", "The middle value", "The most common value", "The total spread"], 0],
    ["Adding a constant to every value changes", ["The centre but not the spread", "The spread but not the centre", "Both equally", "Neither"], 0],
    ["Which is most resistant to an extreme value?", ["Mean", "Standard deviation", "IQR", "Range"], 2],
  ]),
]);

export const SUBJECTS: Subject[] = [
  {
    id: "science",
    name: "Science",
    blurb: "Biology, chemistry, physics",
    courses: [
      {
        id: "science/ap-biology",
        name: "AP Biology",
        blurb: "Molecules, cells, energetics, genetics",
        units: [bioU1, bioU2],
      },
      {
        id: "science/ap-chemistry",
        name: "AP Chemistry",
        blurb: "Atomic structure, bonding, kinetics",
        units: [],
      },
    ],
  },
  {
    id: "history",
    name: "History",
    blurb: "World, regional and thematic history",
    courses: [
      {
        id: "history/ap-world",
        name: "AP World History",
        blurb: "1200 to the present, across regions",
        units: [worldU1, worldU2],
      },
      {
        id: "history/ap-us",
        name: "AP US History",
        blurb: "Colonial period to the present",
        units: [],
      },
    ],
  },
  {
    id: "math",
    name: "Math",
    blurb: "Statistics and calculus",
    courses: [
      {
        id: "math/ap-statistics",
        name: "AP Statistics",
        blurb: "Data, sampling, inference",
        units: [statsU1],
      },
      {
        id: "math/ap-calculus-ab",
        name: "AP Calculus AB",
        blurb: "Limits, derivatives, integrals",
        units: [],
      },
    ],
  },
];

// ─── Lookups ─────────────────────────────────────────────

export function getSubject(id: string) {
  return SUBJECTS.find((s) => s.id === id);
}

export function getCourse(id: string) {
  return SUBJECTS.flatMap((s) => s.courses).find((c) => c.id === id);
}

export function getUnit(id: string) {
  return SUBJECTS.flatMap((s) => s.courses)
    .flatMap((c) => c.units)
    .find((u) => u.id === id);
}

export function getSubunit(id: string) {
  return SUBJECTS.flatMap((s) => s.courses)
    .flatMap((c) => c.units)
    .flatMap((u) => u.subunits)
    .find((su) => su.id === id);
}

/** Breadcrumb parts for a subunit id, for headers and results copy. */
export function describe(subunitId: string) {
  for (const subject of SUBJECTS) {
    for (const course of subject.courses) {
      for (const u of course.units) {
        const su = u.subunits.find((s) => s.id === subunitId);
        if (su) return { subject, course, unit: u, subunit: su };
      }
    }
  }
  return null;
}

export function isStocked(course: Course) {
  return course.units.length > 0;
}

export function questionCount(course: Course) {
  return course.units.reduce(
    (n, u) => n + u.subunits.reduce((m, s) => m + s.questions.length, 0),
    0,
  );
}

/**
 * Deterministic shuffle so every client in a room derives the same order from
 * the room seed — the question list never has to be broadcast.
 */
export function seededShuffle<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
