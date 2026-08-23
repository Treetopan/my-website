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

import {
  ALGEBRA_1,
  ALGEBRA_2,
  AP_CALCULUS_AB,
  AP_CALCULUS_BC,
  GEOMETRY,
  PRECALCULUS,
  type UnitSpec,
} from "./curriculum-math";
import { generatorCount } from "./templates";

export type Difficulty = "easy" | "medium" | "hard";

export type Question = {
  id: string;
  prompt: string;
  options: string[];
  /**
   * The concept this question tests. A subunit is one topic, but a student
   * misses individual ideas inside it — this is what the post-game summary
   * names back to them instead of just a score.
   */
  topic: string;
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

/**
 * [prompt, [4 options], topic] — no answer index. The correct option lives in
 * lib/answers.server.ts and is never shipped to the browser.
 */
type Row = [string, [string, string, string, string], string];

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
      topic: r[2],
    })),
  };
}

function unit(courseId: string, code: string, name: string, make: (id: string) => Subunit[]): Unit {
  const id = `${courseId}/${code}`;
  return { id, code, name, subunits: make(id) };
}

/**
 * Builds a course's units from an outline spec — the full unit and subunit
 * tree, with the question banks still empty. A student can read the whole
 * syllabus this way; `isStocked` keeps them out of a course that has nothing
 * to ask yet.
 */
function outline(courseId: string, specs: UnitSpec[]): Unit[] {
  return specs.map(([code, name, subunits]) =>
    unit(courseId, code, name, (u) =>
      subunits.map(([c, n, difficulty]) => sub(u, c, n, difficulty, [])),
    ),
  );
}

// ─── Science · AP Biology ────────────────────────────────
const bioU1 = unit("science/ap-biology", "unit-1", "Chemistry of Life", (u) => [
  sub(u, "1.1", "Structure of Water and Hydrogen Bonding", "easy", [
    ["Which property of water lets it climb up a narrow tube against gravity?", ["Capillary action", "Surface tension", "Specific heat", "Density"], "Properties of water"],
    ["Water molecules are held to one another by which type of bond?", ["Ionic bonds", "Hydrogen bonds", "Covalent bonds", "Peptide bonds"], "Hydrogen bonding"],
    ["Why does ice float on liquid water?", ["It is warmer", "It is less dense", "It is more dense", "It has more mass"], "Density of ice"],
    ["Water is described as polar because it has", ["An overall charge", "Uneven charge distribution", "Only nonpolar bonds", "No electrons"], "Polarity"],
    ["Water's high specific heat means it", ["Heats up very quickly", "Resists temperature change", "Cannot dissolve salts", "Boils below 100 °C"], "Specific heat"],
  ]),
  sub(u, "1.2", "Elements of Life", "easy", [
    ["Which four elements make up roughly 96% of living matter?", ["C, H, O, N", "C, H, O, S", "N, O, P, K", "C, N, P, Fe"], "Elements of life"],
    ["Which element forms the backbone of all organic molecules?", ["Nitrogen", "Carbon", "Oxygen", "Phosphorus"], "Organic molecule structure"],
    ["Phosphorus is a key component of which molecules?", ["Nucleic acids and ATP", "Only proteins", "Only lipids", "Only carbohydrates"], "Phosphorus in ATP and DNA"],
    ["Nitrogen is found in which two macromolecule classes?", ["Lipids and carbohydrates", "Proteins and nucleic acids", "Only proteins", "Only nucleic acids"], "Nitrogen in macromolecules"],
    ["How many bonds can a single carbon atom form?", ["Two", "Three", "Four", "Six"], "Carbon valence"],
  ]),
  sub(u, "1.3", "Biological Macromolecules", "medium", [
    ["Which reaction joins monomers by removing a water molecule?", ["Hydrolysis", "Dehydration synthesis", "Oxidation", "Phosphorylation"], "Building polymers"],
    ["The monomer of a protein is", ["A nucleotide", "An amino acid", "A monosaccharide", "A fatty acid"], "Protein monomers"],
    ["Which level of protein structure is the sequence of amino acids?", ["Primary", "Secondary", "Tertiary", "Quaternary"], "Levels of protein structure"],
    ["Which macromolecule class is not built from repeating monomers?", ["Proteins", "Lipids", "Nucleic acids", "Carbohydrates"], "Polymers and monomers"],
    ["A phospholipid is amphipathic, meaning it has", ["Two hydrophobic ends", "A hydrophilic head and hydrophobic tails", "No charge anywhere", "Only polar regions"], "Phospholipid structure"],
  ]),
]);

const bioU2 = unit("science/ap-biology", "unit-2", "Cell Structure and Function", (u) => [
  sub(u, "2.1", "Cell Structure and Subcellular Components", "easy", [
    ["Which organelle is the site of protein synthesis?", ["Ribosome", "Lysosome", "Golgi apparatus", "Vacuole"], "Protein synthesis site"],
    ["Rough endoplasmic reticulum is 'rough' because it is studded with", ["Lysosomes", "Ribosomes", "Vesicles", "Mitochondria"], "Rough ER"],
    ["Which structure packages and ships proteins out of the cell?", ["Nucleolus", "Golgi apparatus", "Peroxisome", "Centriole"], "Protein trafficking"],
    ["Which organelle contains hydrolytic enzymes for breaking down waste?", ["Lysosome", "Ribosome", "Chloroplast", "Nucleus"], "Cellular waste breakdown"],
    ["Prokaryotic cells are distinguished by lacking", ["A cell membrane", "A membrane-bound nucleus", "Ribosomes", "DNA"], "Prokaryote vs eukaryote"],
  ]),
  sub(u, "2.2", "Cell Size and Surface Area to Volume", "medium", [
    ["As a cell grows, its volume increases", ["Faster than its surface area", "Slower than its surface area", "At the same rate", "Not at all"], "Surface area to volume"],
    ["A high surface-area-to-volume ratio helps a cell", ["Store more waste", "Exchange materials efficiently", "Divide more slowly", "Reduce its metabolism"], "Surface area to volume"],
    ["Which shape gives a cell the greatest surface area for a fixed volume?", ["Sphere", "Cube", "Elongated and folded", "Perfectly flat disc"], "Cell shape"],
    ["Doubling the radius of a spherical cell multiplies its volume by", ["Two", "Four", "Six", "Eight"], "Scaling volume"],
    ["Root hair cells increase absorption primarily by", ["Increasing surface area", "Reducing volume", "Adding more nuclei", "Thickening the cell wall"], "Surface area adaptations"],
  ]),
  sub(u, "2.3", "Plasma Membranes and Transport", "hard", [
    ["Facilitated diffusion differs from simple diffusion because it", ["Requires ATP", "Uses transport proteins", "Moves against the gradient", "Only moves water"], "Facilitated diffusion"],
    ["The sodium-potassium pump moves ions", ["Down their gradients using no energy", "Against their gradients using ATP", "Only during osmosis", "Through the lipid bilayer directly"], "Active transport"],
    ["A cell placed in a hypertonic solution will", ["Swell and burst", "Lose water and shrink", "Stay exactly the same", "Gain solute only"], "Tonicity"],
    ["Which best describes the fluid mosaic model?", ["A rigid protein sheet", "A lipid bilayer with drifting proteins", "A solid crystalline lattice", "A single layer of phospholipids"], "Fluid mosaic model"],
    ["Water crosses membranes rapidly through channels called", ["Porins", "Aquaporins", "Ion pumps", "Desmosomes"], "Membrane water channels"],
  ]),
]);

// ─── History · AP World History ──────────────────────────
const worldU1 = unit("history/ap-world", "unit-1", "The Global Tapestry, 1200–1450", (u) => [
  sub(u, "1.1", "Developments in East Asia", "medium", [
    ["Which Chinese dynasty was in power at the start of the period in 1200?", ["Tang", "Song", "Ming", "Qing"], "Chinese dynasties"],
    ["The Song economy was transformed by the introduction of which rice variety?", ["Basmati", "Champa rice", "Japonica", "Wild rice"], "Song agriculture"],
    ["Neo-Confucianism combined Confucian thought with elements of", ["Islam and Judaism", "Buddhism and Daoism", "Christianity", "Shinto only"], "Neo-Confucianism"],
    ["The civil service examination system primarily recruited officials based on", ["Noble birth", "Merit through examination", "Military service", "Wealth alone"], "Civil service exams"],
    ["Which technology, spread from Song China, transformed maritime navigation?", ["The magnetic compass", "The telescope", "The chronometer", "The astrolabe"], "Song technology"],
  ]),
  sub(u, "1.2", "Developments in Dar al-Islam", "medium", [
    ["Which city became the intellectual centre of the Abbasid Caliphate?", ["Cairo", "Baghdad", "Damascus", "Córdoba"], "Abbasid centres of learning"],
    ["The House of Wisdom was renowned for", ["Military training", "Translation and scholarship", "Coin minting", "Shipbuilding"], "House of Wisdom"],
    ["Sufism is best described as", ["A legal school", "A mystical tradition within Islam", "A military order", "A trade guild"], "Sufism"],
    ["Which scholar's medical encyclopedia was used in Europe for centuries?", ["Ibn Sina", "Ibn Battuta", "Al-Khwarizmi", "Ibn Khaldun"], "Islamic scholarship"],
    ["Turkic peoples entered the Islamic world largely as", ["Missionaries", "Enslaved soldiers and migrants", "Sea traders", "Monastic scholars"], "Turkic migration"],
  ]),
  sub(u, "1.3", "State Building in the Americas", "easy", [
    ["The Inca Empire was centred in which mountain range?", ["Rockies", "Andes", "Sierra Madre", "Appalachians"], "Inca geography"],
    ["Which system required Incan subjects to provide labour to the state?", ["Mit'a", "Encomienda", "Corvée", "Serfdom"], "Inca labour obligations"],
    ["The Aztec capital Tenochtitlan was built on", ["A desert plateau", "An island in a lake", "A river delta", "A coastal cliff"], "Tenochtitlan"],
    ["Chinampas were used by the Aztecs for", ["Burial", "Agriculture", "Defence", "Astronomy"], "Chinampas"],
    ["The Incas recorded information using knotted cords called", ["Quipu", "Codices", "Glyphs", "Tablets"], "Inca record keeping"],
  ]),
]);

const worldU2 = unit("history/ap-world", "unit-2", "Networks of Exchange", (u) => [
  sub(u, "2.1", "The Silk Roads", "easy", [
    ["The Silk Roads primarily connected China with", ["The Americas", "The Mediterranean world", "Australia", "Southern Africa"], "Silk Road geography"],
    ["Which innovation allowed merchants to travel without carrying coin?", ["Flying cash and credit", "The gold standard", "Paper maps", "Bills of lading"], "Credit and flying cash"],
    ["Caravanserai were best described as", ["Roadside inns for traders", "Border fortresses", "Temples", "Marketplaces for slaves only"], "Caravanserai"],
    ["Besides goods, the Silk Roads spread", ["Only silk", "Religions and disease", "Only spices", "Only metals"], "Cultural diffusion"],
    ["Which pack animal made long desert crossings practical?", ["Horse", "Camel", "Ox", "Donkey"], "Desert transport"],
  ]),
  sub(u, "2.2", "The Mongol Empire", "medium", [
    ["Who unified the Mongol tribes in the early 13th century?", ["Kublai Khan", "Genghis Khan", "Timur", "Batu Khan"], "Mongol unification"],
    ["The Pax Mongolica refers to", ["A peace treaty with China", "A period of safe overland trade", "A Mongol religious code", "A military alliance with Persia"], "Pax Mongolica"],
    ["Kublai Khan founded which dynasty in China?", ["Ming", "Yuan", "Qing", "Jin"], "Mongol rule in China"],
    ["Mongol administration commonly relied on", ["Eliminating all local elites", "Employing local bureaucrats", "Direct rule from Mongolia only", "Rotating European advisors"], "Mongol administration"],
    ["The Mongol relay messenger system was known as the", ["Yam", "Divan", "Kuriltai", "Ordu"], "Mongol communications"],
  ]),
  sub(u, "2.3", "Indian Ocean Trade", "medium", [
    ["Indian Ocean trade depended most on which natural cycle?", ["Ocean currents only", "Monsoon winds", "Tidal ranges", "Solar seasons"], "Indian Ocean seasonality"],
    ["Which East African cities grew wealthy from this trade?", ["Swahili coast city-states", "Saharan oases", "Nile delta ports only", "Cape colonies"], "Swahili city-states"],
    ["Swahili emerged as a language blending Bantu with", ["Portuguese", "Arabic", "Hindi", "Persian only"], "Swahili language"],
    ["Which vessel, with a triangular sail, was characteristic of the region?", ["Junk", "Dhow", "Caravel", "Galley"], "Indian Ocean shipping"],
    ["Diasporic merchant communities formed mainly to", ["Wage war", "Sustain long-distance trade networks", "Collect taxes for empires", "Spread a single religion"], "Diasporic merchants"],
  ]),
]);

// ─── Math · AP Statistics ────────────────────────────────
const statsU1 = unit("math/ap-statistics", "unit-1", "Exploring One-Variable Data", (u) => [
  sub(u, "1.1", "Representing Categorical Data", "easy", [
    ["Which display is appropriate for categorical data?", ["Histogram", "Bar chart", "Boxplot", "Scatterplot"], "Displaying categorical data"],
    ["A relative frequency table reports each category as", ["A raw count", "A proportion of the total", "A running total", "A standard deviation"], "Relative frequency"],
    ["Bars in a bar chart are separated by gaps because", ["Categories are not continuous", "It looks better", "The data are sorted", "Counts are estimates"], "Why bars have gaps"],
    ["A two-way table is used to display", ["One categorical variable", "Two categorical variables", "One quantitative variable", "Residuals"], "Two-way tables"],
    ["A pie chart is most appropriate when the categories", ["Overlap freely", "Make up a whole", "Are quantitative", "Are time-ordered"], "Pie charts"],
  ]),
  sub(u, "1.2", "Describing Distributions", "medium", [
    ["A distribution with a long right tail is described as", ["Left-skewed", "Right-skewed", "Symmetric", "Uniform"], "Skew"],
    ["In a right-skewed distribution, the mean is usually", ["Less than the median", "Greater than the median", "Equal to the median", "Undefined"], "Mean vs median"],
    ["Which measure of centre is resistant to outliers?", ["Mean", "Median", "Range", "Standard deviation"], "Resistant measures"],
    ["The shape, centre, spread and unusual features should be described", ["In any single one", "All four, in context", "Only shape and centre", "Only spread"], "Describing distributions"],
    ["A distribution with two distinct peaks is called", ["Uniform", "Bimodal", "Skewed", "Normal"], "Modality"],
  ]),
  sub(u, "1.3", "Summary Statistics and Outliers", "medium", [
    ["The interquartile range is calculated as", ["Q3 − Q1", "Max − Min", "Q3 + Q1", "Mean − Median"], "Interquartile range"],
    ["By the 1.5 × IQR rule, an outlier lies beyond", ["Q1 − 1.5·IQR or Q3 + 1.5·IQR", "The mean ± 1.5", "Two standard deviations", "The median ± IQR"], "The 1.5 x IQR rule"],
    ["Standard deviation measures", ["Typical distance from the mean", "The middle value", "The most common value", "The total spread"], "Standard deviation"],
    ["Adding a constant to every value changes", ["The centre but not the spread", "The spread but not the centre", "Both equally", "Neither"], "Shifting data"],
    ["Which is most resistant to an extreme value?", ["Mean", "Standard deviation", "IQR", "Range"], "Resistant measures"],
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
    blurb: "Algebra 1 through AP Calculus BC, plus statistics",
    // AP Statistics leads because it is the one course with questions in it.
    // The six below are the Algebra 1 → AP Calculus BC sequence, in order.
    courses: [
      {
        id: "math/ap-statistics",
        name: "AP Statistics",
        blurb: "Data, sampling, inference",
        units: [statsU1],
      },
      {
        id: "math/algebra-1",
        name: "Algebra 1",
        blurb: "Expressions, linear systems, quadratics, exponentials",
        units: outline("math/algebra-1", ALGEBRA_1),
      },
      {
        id: "math/geometry",
        name: "Geometry",
        blurb: "Proof, congruence, similarity, circles, solids",
        units: outline("math/geometry", GEOMETRY),
      },
      {
        id: "math/algebra-2",
        name: "Algebra 2",
        blurb: "Polynomials, logarithms, trigonometry, conics",
        units: outline("math/algebra-2", ALGEBRA_2),
      },
      {
        id: "math/precalculus",
        name: "Precalculus",
        blurb: "Functions, polar and parametric forms, vectors, limits",
        units: outline("math/precalculus", PRECALCULUS),
      },
      {
        id: "math/ap-calculus-ab",
        name: "AP Calculus AB",
        blurb: "Limits, derivatives, integrals",
        units: outline("math/ap-calculus-ab", AP_CALCULUS_AB),
      },
      {
        id: "math/ap-calculus-bc",
        name: "AP Calculus BC",
        blurb: "Everything in AB, plus series, polar and parametric calculus",
        units: outline("math/ap-calculus-bc", AP_CALCULUS_BC),
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

/** Look a question up by the id the server hands back in a session order. */
export function questionById(id: string): Question | undefined {
  return SUBJECTS.flatMap((s) => s.courses)
    .flatMap((c) => c.units)
    .flatMap((u) => u.subunits)
    .flatMap((su) => su.questions)
    .find((q) => q.id === id);
}

/**
 * Whether a course can actually be played. A course may carry its full unit
 * and subunit outline and still have nothing to ask — the outline is there to
 * be read, but there is no session to start, so the library keeps it
 * selectable-looking but disabled rather than letting a student pick their way
 * down to an empty subunit.
 */
export function isStocked(course: Course) {
  return subunits(course).some(hasContent);
}

/** Whether one subunit can be played, from a bank or from generators. */
export function hasContent(subunit: Subunit) {
  return subunit.questions.length > 0 || generatorCount(subunit.id) > 0;
}

export function questionCount(course: Course) {
  return subunits(course).reduce((n, s) => n + s.questions.length, 0);
}

function subunits(course: Course) {
  return course.units.flatMap((u) => u.subunits);
}

/**
 * How a course's stock reads in the library.
 *
 * Generated subunits have no bank to count — a generator can produce questions
 * all day — so they are counted as generators and described as unlimited
 * rather than given a fake total.
 */
export function stockLabel(course: Course): string {
  const banked = questionCount(course);
  const generators = subunits(course).reduce(
    (n, s) => n + generatorCount(s.id),
    0,
  );

  const parts = [`${course.units.length} units`];
  if (banked) parts.push(`${banked} questions`);
  if (generators) parts.push(`${generators} generators · unlimited`);
  if (!banked && !generators) parts.push("no questions yet");

  return parts.join(" · ");
}

/** The same, for one subunit. */
export function subunitStockLabel(subunit: Subunit): string {
  const generators = generatorCount(subunit.id);
  if (generators) return `${generators} generators · unlimited`;
  return `${subunit.questions.length} questions`;
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
