/**
 * The public half of generated questions.
 *
 * A generated subunit has no question bank. It has generators: little programs
 * that invent a fresh question each time they run and work out the answer
 * rather than looking it up. This file says only which subunits have them and
 * what each one asks about — enough for the library to describe a subunit
 * honestly, and nothing a student could answer a question with.
 *
 * The generators themselves live under `generators/`, behind `server-only`,
 * for the same reason the answer key does: a generator that computes the
 * answer IS the answer key. Ship it to the browser and every question it could
 * ever produce is solved. `templates.server.ts` checks itself against this list
 * at load, so the two cannot drift apart.
 */

import { AP_CALCULUS_BC } from "./curriculum-math";

/**
 * Subunit id → the topic each of its generators drills, in order. A generator's
 * position here is its id: index 2 is generator `2` forever, so an instance id
 * minted last week still resolves today. Insert in the middle and old ids point
 * at the wrong generator — append instead.
 *
 * Every subunit of the Algebra 1 → AP Calculus BC sequence is stocked. The
 * ones that came last are the ones that resisted: proof and construction do not
 * reduce to rolled numbers, so they are not asked as though they did. They are
 * asked as orderings, because a proof is a sequence — the given first, the
 * claim last, and no line using a fact it has not yet established. The
 * coordinate proofs roll over numbers like everything else.
 */
const OWN: Record<string, string[]> = {
  // ─── Grade 5 ───────────────────────────────────────────
  "math/grade-5/unit-1/1.1": [
    "Digits and their places",
    "The value of a digit",
    "Naming a place",
  ],
  "math/grade-5/unit-1/1.2": [
    "Comparing decimals",
    "Placing a decimal",
    "Decimals written in words",
  ],
  "math/grade-5/unit-1/1.3": [
    "Rounding a decimal",
    "Placing a rounding boundary",
    "Rounding a measurement",
  ],
  "math/grade-5/unit-1/1.4": [
    "Powers of ten",
    "Recovering an exponent",
    "Placing a power of ten",
  ],
  "math/grade-5/unit-1/1.5": [
    "Multiplying by a power of ten",
    "Dividing by a power of ten",
    "Placing the missing power of ten",
  ],
  "math/grade-5/unit-1/1.6": [
    "Adding decimals",
    "Change from a payment",
    "Placing a missing addend",
  ],
  "math/grade-5/unit-1/1.7": [
    "Multiplying decimals",
    "A price times a quantity",
    "Placing the decimal places in a product",
  ],
  "math/grade-5/unit-1/1.8": [
    "Dividing decimals",
    "Splitting a bill",
    "Placing a decimal quotient",
  ],
  "math/grade-5/unit-2/2.1": [
    "Multi-digit multiplication",
    "Rows and columns",
    "Placing a missing factor",
  ],
  "math/grade-5/unit-2/2.2": [
    "A whole-number quotient",
    "A remainder",
    "Placing a number from its remainder",
  ],
  "math/grade-5/unit-2/2.3": [
    "Rounding a remainder up",
    "Rounding a remainder down",
    "Placing what is left over",
  ],
  "math/grade-5/unit-2/2.4": [
    "Counting factors",
    "The next multiple",
    "Placing a multiple",
  ],
  "math/grade-5/unit-2/2.5": [
    "Prime or composite",
    "Counting primes in a range",
    "Placing the largest prime",
  ],
  "math/grade-5/unit-2/2.6": [
    "The largest prime factor",
    "An exponent in a factorization",
    "Placing a count of prime factors",
  ],
  "math/grade-5/unit-2/2.7": [
    "The greatest common factor",
    "Sharing into identical groups",
    "Placing a greatest common factor",
  ],
  "math/grade-5/unit-2/2.8": [
    "The least common multiple",
    "When two cycles meet again",
    "Placing a least common multiple",
  ],
  "math/grade-5/unit-3/3.1": [
    "A missing numerator",
    "Lowest terms",
    "Placing a missing denominator",
  ],
  "math/grade-5/unit-3/3.2": [
    "Comparing two fractions",
    "Ordering fractions",
    "Placing a fraction on a number line",
  ],
  "math/grade-5/unit-3/3.3": [
    "Adding unlike denominators",
    "A missing addend",
    "Placing a fraction sum",
  ],
  "math/grade-5/unit-3/3.4": [
    "Subtracting unlike denominators",
    "What is left in the jug",
    "Placing a fraction difference",
  ],
  "math/grade-5/unit-3/3.5": [
    "Adding mixed numbers",
    "Subtracting mixed numbers",
    "Placing a mixed-number sum",
  ],
  "math/grade-5/unit-3/3.6": [
    "Regrouping a mixed number",
    "Subtracting with regrouping",
    "Placing the whole part of a difference",
  ],
  "math/grade-5/unit-3/3.7": [
    "Estimating with benchmarks",
    "Rounding a fraction",
    "Placing an estimated sum",
  ],
  "math/grade-5/unit-3/3.8": [
    "A fraction of a fraction",
    "What is left of the tank",
    "Placing the distance left",
  ],
  "math/grade-5/unit-4/4.1": [
    "A fraction as a division",
    "Sharing whole things",
    "Placing a quotient as a decimal",
  ],
  "math/grade-5/unit-4/4.2": [
    "A fraction times a whole number",
    "Repeated fractional amounts",
    "Placing a fraction product",
  ],
  "math/grade-5/unit-4/4.3": [
    "Multiplying two fractions",
    "A missing factor",
    "Placing a product of fractions",
  ],
  "math/grade-5/unit-4/4.4": [
    "Area from fractional sides",
    "Double-shading an area model",
    "Placing a shaded fraction",
  ],
  "math/grade-5/unit-4/4.5": [
    "Scaling up or down",
    "Comparing a product to its factor",
    "Placing a scale factor",
  ],
  "math/grade-5/unit-4/4.6": [
    "Multiplying mixed numbers",
    "Scaling up a recipe",
    "Placing a mixed-number product",
  ],
  "math/grade-5/unit-4/4.7": [
    "Dividing by a unit fraction",
    "Cutting into fractional pieces",
    "Placing a unit-fraction quotient",
  ],
  "math/grade-5/unit-4/4.8": [
    "Dividing a unit fraction",
    "Sharing a fractional amount",
    "Placing a shared fraction",
  ],
  "math/grade-5/unit-4/4.9": [
    "A fraction as a decimal",
    "A decimal as a fraction",
    "Placing a fraction as a decimal",
  ],
  "math/grade-5/unit-5/5.1": [
    "Grouping symbols first",
    "A missing number inside brackets",
    "Placing the value of an expression",
  ],
  "math/grade-5/unit-5/5.2": [
    "An expression from words",
    "Which expression matches",
    "Placing the value of a phrase",
  ],
  "math/grade-5/unit-5/5.3": [
    "Reading a scaled expression",
    "Comparing without evaluating",
    "Placing a scaling factor",
  ],
  "math/grade-5/unit-5/5.4": [
    "The next term of a pattern",
    "A multiplying rule",
    "Placing a term of a pattern",
  ],
  "math/grade-5/unit-5/5.5": [
    "Matching two patterns",
    "The ratio between two patterns",
    "Plotting a pattern pair",
  ],
  "math/grade-5/unit-5/5.6": [
    "Plotting a rule",
    "A missing coordinate",
    "Placing an output",
  ],
  "math/grade-5/unit-5/5.7": [
    "Evaluating with a variable",
    "Solving for a variable",
    "Placing an unknown price",
  ],
  "math/grade-5/unit-6/6.1": [
    "Plotting on an axis",
    "Which axis a point lies on",
    "Reading an ordered pair",
  ],
  "math/grade-5/unit-6/6.2": [
    "Plotting an ordered pair",
    "Plotting from a description",
    "A coordinate from a description",
  ],
  "math/grade-5/unit-6/6.3": [
    "Reading a coordinate off a graph",
    "Reading a distance off a graph",
    "Placing a coordinate read off a graph",
  ],
  "math/grade-5/unit-6/6.4": [
    "Distance along a line",
    "Distance on a map",
    "Plotting from a distance",
  ],
  "math/grade-5/unit-6/6.5": [
    "Plotting a place on a map",
    "Blocks between two places",
    "Placing a distance travelled",
  ],
  "math/grade-5/unit-6/6.6": [
    "Plotting in four quadrants",
    "Naming a quadrant",
    "Reflecting across an axis",
  ],
  "math/grade-5/unit-7/7.1": [
    "Metric conversion",
    "Litres to millilitres",
    "Placing a mass in grams",
  ],
  "math/grade-5/unit-7/7.2": [
    "Customary conversion",
    "Quarts to cups",
    "Placing a weight in ounces",
  ],
  "math/grade-5/unit-7/7.3": [
    "Cutting a length into pieces",
    "Filling from a larger container",
    "Placing a count of bottles",
  ],
  "math/grade-5/unit-7/7.4": [
    "Counting unit cubes",
    "Cubes in a layer",
    "Placing a volume in cubes",
  ],
  "math/grade-5/unit-7/7.5": [
    "Volume of a prism",
    "A height from a volume",
    "Placing a volume in litres",
  ],
  "math/grade-5/unit-7/7.6": [
    "Base area times height",
    "A base area from a volume",
    "Placing a height from a volume",
  ],
  "math/grade-5/unit-7/7.7": [
    "Volume of a joined solid",
    "Volume with a piece removed",
    "Placing the volume of a stack",
  ],
  "math/grade-5/unit-7/7.8": [
    "Totalling a line plot",
    "Sharing a line plot equally",
    "Placing a total height",
  ],
  "math/grade-5/unit-8/8.1": [
    "Classifying by sides",
    "The third angle",
    "Placing the third angle",
  ],
  "math/grade-5/unit-8/8.2": [
    "Naming a quadrilateral",
    "The fourth angle",
    "Placing a side from a perimeter",
  ],
  "math/grade-5/unit-8/8.3": [
    "The quadrilateral hierarchy",
    "Counting parallelograms",
    "Testing a hierarchy claim",
  ],
  "math/grade-5/unit-8/8.4": [
    "Counting parallel sides",
    "Naming a side relationship",
    "Completing a rectangle",
  ],
  "math/grade-5/unit-8/8.5": [
    "Area with fractional sides",
    "A side from an area",
    "Placing an area",
  ],
  "math/grade-5/unit-8/8.6": [
    "Perimeter of a rectangle",
    "Area from a perimeter",
    "Placing a garden's area",
  ],
  // ─── Grade 6 ───────────────────────────────────────────
  "math/grade-6/unit-1/1.1": [
    "Writing a ratio",
    "A part-to-whole ratio",
    "Placing an equivalent ratio",
  ],
  "math/grade-6/unit-1/1.2": [
    "Completing a ratio table",
    "Scaling a price",
    "Placing a missing ratio term",
  ],
  "math/grade-6/unit-1/1.3": [
    "A unit rate",
    "The cost of one",
    "Placing a rate",
  ],
  "math/grade-6/unit-1/1.4": [
    "Comparing two prices",
    "The faster rate",
    "Placing the better unit price",
  ],
  "math/grade-6/unit-1/1.5": [
    "Plotting a ratio",
    "A point on a ratio graph",
    "Placing the unit rate from a graph",
  ],
  "math/grade-6/unit-1/1.6": [
    "Converting with a ratio",
    "Converting between systems",
    "Placing a converted amount",
  ],
  "math/grade-6/unit-1/1.7": [
    "A percent as a fraction",
    "A part as a percentage",
    "Placing the rest of a percent",
  ],
  "math/grade-6/unit-1/1.8": [
    "A percent of a number",
    "A reduction in price",
    "Placing a percent of a number",
  ],
  "math/grade-6/unit-1/1.9": [
    "The whole from a part",
    "A deposit as a percent",
    "Placing the whole from a part",
  ],
  "math/grade-6/unit-2/2.1": [
    "Dividing by a fraction",
    "How many fit inside",
    "Placing a fraction quotient",
  ],
  "math/grade-6/unit-2/2.2": [
    "Cutting a length into fractional pieces",
    "Filling fractional bags",
    "Placing a count of stages",
  ],
  "math/grade-6/unit-2/2.3": [
    "Adding and subtracting decimals",
    "A running total in litres",
    "Placing a decimal quotient",
  ],
  "math/grade-6/unit-2/2.4": [
    "The division algorithm",
    "Recovering a dividend",
    "Placing an exact quotient",
  ],
  "math/grade-6/unit-2/2.5": [
    "Identical groups from two amounts",
    "When two pack sizes agree",
    "Placing when two cycles meet",
  ],
  "math/grade-6/unit-2/2.6": [
    "Factoring a sum",
    "The factor to take out",
    "Placing the factor outside the bracket",
  ],
  "math/grade-6/unit-2/2.7": [
    "A decimal as a percentage",
    "A score as a percentage",
    "Placing a fraction as a percentage",
  ],
  "math/grade-6/unit-3/3.1": [
    "A temperature below zero",
    "Signs in a situation",
    "Placing a negative number",
  ],
  "math/grade-6/unit-3/3.2": [
    "Counting down past zero",
    "Comparing signed numbers",
    "Distance on the number line",
  ],
  "math/grade-6/unit-3/3.3": [
    "The opposite of a number",
    "The additive inverse",
    "Placing an opposite",
  ],
  "math/grade-6/unit-3/3.4": [
    "Absolute value",
    "A negative from its size",
    "Placing an absolute value",
  ],
  "math/grade-6/unit-3/3.5": [
    "Ordering rational numbers",
    "Comparing rational numbers",
    "Placing a rational number",
  ],
  "math/grade-6/unit-3/3.6": [
    "Comparing two debts",
    "Distance above and below",
    "Placing what is owed",
  ],
  "math/grade-6/unit-3/3.7": [
    "Plotting in four quadrants",
    "Naming a quadrant from signs",
    "Plotting a move on the grid",
  ],
  "math/grade-6/unit-3/3.8": [
    "Reflecting a point",
    "A coordinate after reflecting",
    "What a reflection changes",
  ],
  "math/grade-6/unit-3/3.9": [
    "Distance along a row",
    "Distance on a grid map",
    "Plotting from a vertical distance",
  ],
  "math/grade-6/unit-4/4.1": [
    "Repeated multiplication as a power",
    "Evaluating a power",
    "Placing the value of a power",
  ],
  "math/grade-6/unit-4/4.2": [
    "Order of operations with exponents",
    "A missing number under a square",
    "Placing the value of an expression",
  ],
  "math/grade-6/unit-4/4.3": [
    "An expression in words",
    "Which expression matches the words",
    "An expression in context",
  ],
  "math/grade-6/unit-4/4.4": [
    "Counting terms",
    "Reading a coefficient",
    "Naming a part of an expression",
  ],
  "math/grade-6/unit-4/4.5": [
    "Substituting two variables",
    "Substituting into a square",
    "Placing a substituted value",
  ],
  "math/grade-6/unit-4/4.6": [
    "Expanding a bracket",
    "Factoring a linear expression",
    "Placing the common factor",
  ],
  "math/grade-6/unit-4/4.7": [
    "Combining like terms",
    "A coefficient after simplifying",
    "Placing a combined coefficient",
  ],
  "math/grade-6/unit-4/4.8": [
    "Testing two expressions",
    "Completing an equivalent expression",
    "Which expression is equivalent",
  ],
  "math/grade-6/unit-4/4.9": [
    "Evaluating an area formula",
    "Rearranging a perimeter formula",
    "Placing a distance from a formula",
  ],
  "math/grade-6/unit-5/5.1": [
    "Checking a solution",
    "Finding the value that works",
    "Placing a solution",
  ],
  "math/grade-6/unit-5/5.2": [
    "One-step addition equations",
    "Working back to the start",
    "Placing a solution to a subtraction",
  ],
  "math/grade-6/unit-5/5.3": [
    "One-step multiplication equations",
    "Recovering a total from a share",
    "Placing a solution to a division",
  ],
  "math/grade-6/unit-5/5.4": [
    "An equation from a charge",
    "Which equation says it",
    "Placing a count from a total cost",
  ],
  "math/grade-6/unit-5/5.5": [
    "Testing an inequality",
    "The smallest whole number that fits",
    "The words an inequality stands for",
  ],
  "math/grade-6/unit-5/5.6": [
    "Placing an inequality boundary",
    "Open or closed circle",
    "Which way the shading goes",
  ],
  "math/grade-6/unit-5/5.7": [
    "Which variable depends",
    "Evaluating a relationship",
    "Placing a dependent value",
  ],
  "math/grade-6/unit-5/5.8": [
    "Reading a table of pairs",
    "Plotting from an equation",
    "Placing a value from a graph",
  ],
  "math/grade-6/unit-6/6.1": [
    "Area of a parallelogram",
    "A height from an area",
    "Placing a parallelogram's area",
  ],
  "math/grade-6/unit-6/6.2": [
    "Area of a triangle",
    "A height from a triangle's area",
    "Placing a triangle's area",
  ],
  "math/grade-6/unit-6/6.3": [
    "Area of a trapezoid",
    "A parallel side from an area",
    "Placing a trapezoid's area",
  ],
  "math/grade-6/unit-6/6.4": [
    "Area with a piece removed",
    "Area of a rectangle and a triangle",
    "Placing a composite area",
  ],
  "math/grade-6/unit-6/6.5": [
    "Area from coordinates",
    "Completing a rectangle",
    "Placing a perimeter from coordinates",
  ],
  "math/grade-6/unit-6/6.6": [
    "Which solid a net folds into",
    "Counting faces",
    "Placing the faces of a prism",
  ],
  "math/grade-6/unit-6/6.7": [
    "Surface area of a box",
    "An edge from a surface area",
    "Placing a cube's surface area",
  ],
  "math/grade-6/unit-6/6.8": [
    "Volume with a fractional edge",
    "A fractional height from a volume",
    "Placing a fractional volume",
  ],
  "math/grade-6/unit-7/7.1": [
    "Which question is statistical",
    "Testing a question",
    "Counting statistical questions",
  ],
  "math/grade-6/unit-7/7.2": [
    "Counting values on a dot plot",
    "Totalling a histogram",
    "Placing the mode",
  ],
  "math/grade-6/unit-7/7.3": [
    "The mean",
    "The median",
    "Placing a mean",
  ],
  "math/grade-6/unit-7/7.4": [
    "A missing value from the mean",
    "The value that shifts a mean",
    "Placing a total from a mean",
  ],
  "math/grade-6/unit-7/7.5": [
    "The range",
    "The interquartile range",
    "Placing a range",
  ],
  "math/grade-6/unit-7/7.6": [
    "Mean absolute deviation",
    "Total distance from the mean",
    "Placing a mean absolute deviation",
  ],
  "math/grade-6/unit-7/7.7": [
    "The interquartile range of a box plot",
    "The range of a summary",
    "Placing the width of a box",
  ],
  "math/grade-6/unit-7/7.8": [
    "Which measure resists an outlier",
    "Mean against median",
    "The pull of an outlier",
  ],
  "math/grade-6/unit-7/7.9": [
    "The range of a data set in context",
    "Reading a skewed distribution",
    "Placing a median in context",
  ],
  // ─── Grade 7 ───────────────────────────────────────────
  "math/grade-7/unit-1/1.1": [
    "A unit rate from fractions",
    "A rate the other way up",
    "Placing a fractional amount",
  ],
  "math/grade-7/unit-1/1.2": [
    "A proportional table",
    "Testing a table for proportion",
    "Placing a proportional value",
  ],
  "math/grade-7/unit-1/1.3": [
    "Proportional or not on a graph",
    "Reading a proportional graph",
    "Plotting a proportional point",
  ],
  "math/grade-7/unit-1/1.4": [
    "The constant of proportionality",
    "Working back from the constant",
    "Placing a constant of proportionality",
  ],
  "math/grade-7/unit-1/1.5": [
    "Using the constant",
    "Writing a proportional equation",
    "Placing a value from an equation",
  ],
  "math/grade-7/unit-1/1.6": [
    "A unit rate from a graph",
    "What the point at one means",
    "Placing the unit rate",
  ],
  "math/grade-7/unit-1/1.7": [
    "Solving a proportion",
    "Scaling a weight",
    "Placing a missing term",
  ],
  "math/grade-7/unit-1/1.8": [
    "Reading a scale drawing",
    "Finding the scale",
    "Placing a real distance",
  ],
  "math/grade-7/unit-1/1.9": [
    "Sharing in a ratio",
    "The larger share",
    "Placing part of a mixture",
  ],
  "math/grade-7/unit-2/2.1": [
    "Moving along the number line",
    "Adding a negative",
    "A temperature rising",
  ],
  "math/grade-7/unit-2/2.2": [
    "Adding signed decimals",
    "Rising from below zero",
    "Placing a signed sum",
  ],
  "math/grade-7/unit-2/2.3": [
    "Subtracting as adding the opposite",
    "Which addition it becomes",
    "Placing a signed difference",
  ],
  "math/grade-7/unit-2/2.4": [
    "Distance as a difference",
    "A change in temperature",
    "Placing a distance",
  ],
  "math/grade-7/unit-2/2.5": [
    "Multiplying signed numbers",
    "The sign rule",
    "Placing a signed product",
  ],
  "math/grade-7/unit-2/2.6": [
    "Dividing signed numbers",
    "Sharing a debt",
    "Placing a signed quotient",
  ],
  "math/grade-7/unit-2/2.7": [
    "A terminating decimal",
    "Which fraction repeats",
    "Placing a decimal from a fraction",
  ],
  "math/grade-7/unit-2/2.8": [
    "Order of operations with signs",
    "Working inside the bracket first",
    "Placing a signed value",
  ],
  "math/grade-7/unit-2/2.9": [
    "A running balance",
    "A falling price",
    "Placing a floor",
  ],
  "math/grade-7/unit-3/3.1": [
    "Percent increase",
    "A reduced price",
    "Placing a grown population",
  ],
  "math/grade-7/unit-3/3.2": [
    "Working out a tip",
    "Commission on a sale",
    "Placing a total with tax",
  ],
  "math/grade-7/unit-3/3.3": [
    "A sale price",
    "A marked-up price",
    "Placing a discount",
  ],
  "math/grade-7/unit-3/3.4": [
    "Simple interest",
    "The years from the interest",
    "Placing simple interest",
  ],
  "math/grade-7/unit-3/3.5": [
    "Percent error",
    "The size of an error",
    "Placing a percent error",
  ],
  "math/grade-7/unit-3/3.6": [
    "Two changes in a row",
    "Why two changes do not cancel",
    "Placing a twice-discounted price",
  ],
  "math/grade-7/unit-3/3.7": [
    "Back to the original price",
    "The price before tax",
    "Placing a wage before a rise",
  ],
  "math/grade-7/unit-4/4.1": [
    "Collecting like terms",
    "Subtracting a bracket",
    "Placing a coefficient",
  ],
  "math/grade-7/unit-4/4.2": [
    "Factoring a linear expression",
    "The greatest common factor of a term",
    "Placing the factor taken out",
  ],
  "math/grade-7/unit-4/4.3": [
    "Expanding a bracket",
    "Expanding and collecting",
    "Placing a constant term",
  ],
  "math/grade-7/unit-4/4.4": [
    "A percent as a multiplier",
    "Which form shows the increase",
    "Placing a decrease multiplier",
  ],
  "math/grade-7/unit-4/4.5": [
    "Two-step equations",
    "Months from a total",
    "Placing a two-step solution",
  ],
  "math/grade-7/unit-4/4.6": [
    "An equation with a fraction",
    "Clearing a decimal",
    "Placing a fractional solution",
  ],
  "math/grade-7/unit-4/4.7": [
    "The variable on both sides",
    "When two plans agree",
    "Placing a both-sides solution",
  ],
  "math/grade-7/unit-4/4.8": [
    "Two-step inequalities",
    "How many fit the budget",
    "Placing an inequality boundary",
  ],
  "math/grade-7/unit-4/4.9": [
    "Which way the sign turns",
    "When the sign reverses",
    "Placing a reversed boundary",
  ],
  "math/grade-7/unit-4/4.10": [
    "Modelling a budget",
    "A width from a perimeter",
    "Placing the weeks needed",
  ],
  "math/grade-7/unit-5/5.1": [
    "Complementary angles",
    "Supplementary angles",
    "Placing a supplement",
  ],
  "math/grade-7/unit-5/5.2": [
    "Vertical angles",
    "Angles on a straight line",
    "What vertical angles are",
  ],
  "math/grade-7/unit-5/5.3": [
    "Angles on a line as an equation",
    "An unknown in a complement",
    "Placing an unknown angle",
  ],
  "math/grade-7/unit-5/5.4": [
    "The smallest third side",
    "Whether three sides make a triangle",
    "Placing the largest third side",
  ],
  "math/grade-7/unit-5/5.5": [
    "Which conditions fix a triangle",
    "Testing a condition",
    "Counting the triangles that fit",
  ],
  "math/grade-7/unit-5/5.6": [
    "The shape of a cross section",
    "Sides of a cross section",
    "The area of a cross section",
  ],
  "math/grade-7/unit-5/5.7": [
    "Circumference in terms of pi",
    "Circumference with 3.14",
    "Placing a radius from a circumference",
  ],
  "math/grade-7/unit-5/5.8": [
    "Area in terms of pi",
    "Area with 3.14",
    "Placing a radius from an area",
  ],
  "math/grade-7/unit-5/5.9": [
    "The area of a semicircle",
    "A square with a piece cut out",
    "Placing the multiple of pi",
  ],
  "math/grade-7/unit-5/5.10": [
    "Volume of a prism",
    "Surface area from a volume",
    "Placing a box's volume",
  ],
  "math/grade-7/unit-6/6.1": [
    "Placing a probability",
    "Certain and impossible",
    "Likely or unlikely",
  ],
  "math/grade-7/unit-6/6.2": [
    "Theoretical probability",
    "Probability on a die",
    "Placing a percentage chance",
  ],
  "math/grade-7/unit-6/6.3": [
    "Experimental probability",
    "An experimental percentage",
    "Placing an experimental chance",
  ],
  "math/grade-7/unit-6/6.4": [
    "More than expected",
    "How many to expect",
    "Placing an expected count",
  ],
  "math/grade-7/unit-6/6.5": [
    "What a simulation models",
    "The result of a simulation",
    "Placing expected successes",
  ],
  "math/grade-7/unit-6/6.6": [
    "Counting outcomes",
    "Outcomes from two menus",
    "Placing a sample space",
  ],
  "math/grade-7/unit-6/6.7": [
    "Branches on a tree diagram",
    "Ways to make a total",
    "Placing a count of branches",
  ],
  "math/grade-7/unit-6/6.8": [
    "All heads in a row",
    "The same sector twice",
    "Placing the ways to a total",
  ],
  "math/grade-7/unit-6/6.9": [
    "Independent or dependent",
    "Two draws with replacement",
    "Two draws without replacement",
  ],
  "math/grade-7/unit-7/7.1": [
    "Naming the population",
    "The sampling fraction",
    "Placing a sample size",
  ],
  "math/grade-7/unit-7/7.2": [
    "Which sample is biased",
    "Testing a survey for bias",
    "Everyone's chance of selection",
  ],
  "math/grade-7/unit-7/7.3": [
    "Estimating from a sample",
    "Capture and recapture",
    "Placing a population estimate",
  ],
  "math/grade-7/unit-7/7.4": [
    "The range of estimates",
    "Which sample is more reliable",
    "Placing a mean estimate",
  ],
  "math/grade-7/unit-7/7.5": [
    "The difference in means",
    "Measuring a gap in MADs",
    "Placing a difference in means",
  ],
  "math/grade-7/unit-7/7.6": [
    "What overlap suggests",
    "Comparing a gap with the MAD",
    "Placing a gap in MADs",
  ],
  "math/grade-7/unit-7/7.7": [
    "A sample as a percentage",
    "Scaling a sample to a population",
    "Placing a sample percentage",
  ],
  // ─── Grade 8 ───────────────────────────────────────────
  "math/grade-8/unit-1/1.1": [
    "Spotting an irrational number",
    "Counting irrationals",
    "Placing a whole square root",
  ],
  "math/grade-8/unit-1/1.2": [
    "A repeating decimal as a fraction",
    "The numerator over ninety-nine",
    "Placing a repeating numerator",
  ],
  "math/grade-8/unit-1/1.3": [
    "Between two whole numbers",
    "Rounding a square root",
    "Placing a square root",
  ],
  "math/grade-8/unit-1/1.4": [
    "Ordering irrational numbers",
    "Comparing a root with a whole number",
    "Placing a root to a tenth",
  ],
  "math/grade-8/unit-1/1.5": [
    "A whole square root",
    "A cube root",
    "Placing a cube root",
  ],
  "math/grade-8/unit-1/1.6": [
    "Solving a squared equation",
    "Solving a cubed equation",
    "Placing a square root solution",
  ],
  "math/grade-8/unit-2/2.1": [
    "Multiplying powers",
    "Dividing powers",
    "Placing a power of a power",
  ],
  "math/grade-8/unit-2/2.2": [
    "A negative exponent",
    "The zero exponent",
    "Placing a combined exponent",
  ],
  "math/grade-8/unit-2/2.3": [
    "Simplifying a power of a power",
    "A negative exponent in a product",
    "Placing a bracketed exponent",
  ],
  "math/grade-8/unit-2/2.4": [
    "Writing scientific notation",
    "Back to a plain number",
    "Placing the exponent",
  ],
  "math/grade-8/unit-2/2.5": [
    "Multiplying in scientific notation",
    "Dividing in scientific notation",
    "Placing a product's exponent",
  ],
  "math/grade-8/unit-2/2.6": [
    "How many times larger",
    "Which magnitude is larger",
    "Placing a difference of exponents",
  ],
  "math/grade-8/unit-2/2.7": [
    "Choosing a unit",
    "Metres to kilometres",
    "Placing a mass in kilograms",
  ],
  "math/grade-8/unit-3/3.1": [
    "Solving through a bracket",
    "Collecting before solving",
    "Placing a multi-step solution",
  ],
  "math/grade-8/unit-3/3.2": [
    "Variables on both sides",
    "When two charges meet",
    "Placing a both-sides solution",
  ],
  "math/grade-8/unit-3/3.3": [
    "An equation with a fraction",
    "Multiplying through a decimal",
    "Placing a fractional solution",
  ],
  "math/grade-8/unit-3/3.4": [
    "How many solutions",
    "Making it always true",
    "Counting the solutions",
  ],
  "math/grade-8/unit-3/3.5": [
    "The order of solving",
    "Naming the property",
    "The first step",
  ],
  "math/grade-8/unit-3/3.6": [
    "Modelling a phone bill",
    "A width from a perimeter",
    "Placing hours from a rate",
  ],
  "math/grade-8/unit-4/4.1": [
    "Drawing a line through the origin",
    "An equation through the origin",
    "Plotting on a proportional line",
  ],
  "math/grade-8/unit-4/4.2": [
    "Slope as rise over run",
    "A rate from a total",
    "Placing a slope",
  ],
  "math/grade-8/unit-4/4.3": [
    "Scaling a slope triangle",
    "Why slope stays constant",
    "Placing a similar rise",
  ],
  "math/grade-8/unit-4/4.4": [
    "Slope from two points",
    "A point from a slope",
    "Placing a slope from two points",
  ],
  "math/grade-8/unit-4/4.5": [
    "Reading the intercept",
    "Drawing a line from its equation",
    "Placing a slope from an equation",
  ],
  "math/grade-8/unit-4/4.6": [
    "Graphing a line",
    "Plotting an intercept",
    "A value on a line",
  ],
  "math/grade-8/unit-4/4.7": [
    "An equation from two points",
    "A value from slope and intercept",
    "Drawing from a slope and intercept",
  ],
  "math/grade-8/unit-4/4.8": [
    "Comparing two slopes",
    "A slope from a table",
    "Placing the greater slope",
  ],
  "math/grade-8/unit-4/4.9": [
    "The fixed charge",
    "The cost per unit",
    "Placing a starting amount",
  ],
  "math/grade-8/unit-5/5.1": [
    "Testing a solution",
    "Plotting a system's solution",
    "Writing a solution as a pair",
  ],
  "math/grade-8/unit-5/5.2": [
    "Plotting an intersection",
    "The x where two lines meet",
    "Placing an intersection",
  ],
  "math/grade-8/unit-5/5.3": [
    "An exact crossing between whole numbers",
    "Placing a half-way crossing",
    "Between which whole numbers",
  ],
  "math/grade-8/unit-5/5.4": [
    "Substituting a known value",
    "Finding y at the solution",
    "Placing x by substitution",
  ],
  "math/grade-8/unit-5/5.5": [
    "Elimination by adding",
    "Two numbers from a sum and difference",
    "Placing x by elimination",
  ],
  "math/grade-8/unit-5/5.6": [
    "Parallel lines as a system",
    "Same slope, different intercepts",
    "Reading a system's solution count",
  ],
  "math/grade-8/unit-5/5.7": [
    "Two ticket prices",
    "A sum and a difference",
    "Placing the month two plans meet",
  ],
  "math/grade-8/unit-6/6.1": [
    "Testing a relation",
    "What a function is",
    "The repeated input",
  ],
  "math/grade-8/unit-6/6.2": [
    "Evaluating a function",
    "Finding the input",
    "Placing a function value",
  ],
  "math/grade-8/unit-6/6.3": [
    "A function from a table",
    "A graph as a function",
    "Plotting a function value",
  ],
  "math/grade-8/unit-6/6.4": [
    "Spotting a nonlinear equation",
    "Linear from a table",
    "A changing rise",
  ],
  "math/grade-8/unit-6/6.5": [
    "A value from a rate",
    "Rate of change from two points",
    "Placing an initial value",
  ],
  "math/grade-8/unit-6/6.6": [
    "Comparing rates of change",
    "Comparing initial values",
    "Placing the greater rate",
  ],
  "math/grade-8/unit-6/6.7": [
    "Drawing a description",
    "When a distance reaches zero",
    "Placing a burnt-down height",
  ],
  "math/grade-8/unit-6/6.8": [
    "Reading the shape of a graph",
    "Increasing or decreasing",
    "Average rate of change",
  ],
  "math/grade-8/unit-7/7.1": [
    "Translating a point",
    "The size of a translation",
    "Translating left and down",
  ],
  "math/grade-8/unit-7/7.2": [
    "Reflecting a point",
    "A coordinate after reflecting",
    "Which coordinate reflects",
  ],
  "math/grade-8/unit-7/7.3": [
    "Rotating a quarter turn",
    "A half turn about the origin",
    "Rotational symmetry in a full turn",
  ],
  "math/grade-8/unit-7/7.4": [
    "Translate then reflect",
    "Reflect then translate",
    "Placing a there-and-back translation",
  ],
  "math/grade-8/unit-7/7.5": [
    "Which motion is not rigid",
    "Counting rigid motions",
    "Congruent after a motion",
  ],
  "math/grade-8/unit-7/7.6": [
    "Dilating a point",
    "A scale factor from an image",
    "Placing a scale factor",
  ],
  "math/grade-8/unit-7/7.7": [
    "Similar after a dilation",
    "A matching side",
    "Placing a similarity factor",
  ],
  "math/grade-8/unit-7/7.8": [
    "Co-interior angles",
    "Corresponding angles",
    "What alternate interior angles are",
  ],
  "math/grade-8/unit-7/7.9": [
    "The third angle",
    "An exterior angle",
    "Placing an exterior angle",
  ],
  "math/grade-8/unit-7/7.10": [
    "Testing for similar triangles",
    "How many angle pairs",
    "The third angle in both",
  ],
  "math/grade-8/unit-8/8.1": [
    "What c squared is",
    "What the theorem says",
    "A hypotenuse from two legs",
  ],
  "math/grade-8/unit-8/8.2": [
    "The order of a Pythagorean proof",
    "The area of the big square",
    "Adding the pieces",
  ],
  "math/grade-8/unit-8/8.3": [
    "Finding a hypotenuse",
    "Finding a leg",
    "Placing a hypotenuse",
  ],
  "math/grade-8/unit-8/8.4": [
    "Testing for a right triangle",
    "Which side is the hypotenuse",
    "The sum of the two squares",
  ],
  "math/grade-8/unit-8/8.5": [
    "A ladder against a wall",
    "A rectangle's diagonal",
    "Placing a straight-line distance",
  ],
  "math/grade-8/unit-8/8.6": [
    "Distance between two points",
    "Distance from the origin",
    "Placing a distance",
  ],
  "math/grade-8/unit-8/8.7": [
    "The diagonal of a base",
    "A space diagonal",
    "Placing a space diagonal",
  ],
  "math/grade-8/unit-9/9.1": [
    "Volume of a cylinder",
    "A cylinder with 3.14",
    "Placing a height from a volume",
  ],
  "math/grade-8/unit-9/9.2": [
    "Volume of a cone",
    "A cylinder against a cone",
    "Placing a cone's multiple of pi",
  ],
  "math/grade-8/unit-9/9.3": [
    "Volume of a sphere",
    "A radius from a volume",
    "Placing a sphere's multiple of pi",
  ],
  "math/grade-8/unit-9/9.4": [
    "A cylinder with a cone on top",
    "A hollowed cylinder",
    "Placing a hemisphere's volume",
  ],
  "math/grade-8/unit-9/9.5": [
    "Naming an association",
    "Positive or negative",
    "Points off the trend",
  ],
  "math/grade-8/unit-9/9.6": [
    "Spotting an outlier",
    "What a straight run of points shows",
    "Counting two clusters",
  ],
  "math/grade-8/unit-9/9.7": [
    "Drawing a line of best fit",
    "The slope of a fitted line",
    "Placing a fitted slope",
  ],
  "math/grade-8/unit-9/9.8": [
    "What the slope means",
    "Predicting from a fitted line",
    "Placing a prediction",
  ],
  "math/grade-8/unit-9/9.9": [
    "A conditional fraction",
    "A relative frequency",
    "Placing a relative frequency",
  ],
  // ─── Algebra 1 ─────────────────────────────────────────
  "math/algebra-1/unit-1/1.1": [
    "Classifying real numbers",
    "Classifying real numbers",
    "Nesting the number sets",
  ],
  "math/algebra-1/unit-1/1.6": [
    "Product rule",
    "Quotient rule",
    "Power of a power",
    "Negative exponents",
    "Recovering an exponent",
    "Placing an exponent",
  ],
  "math/algebra-1/unit-1/1.7": [
    "Scientific notation",
    "Back to a plain number",
    "Multiplying in scientific notation",
  ],
  "math/algebra-1/unit-2/2.1": [
    "One-step equations",
    "Two-step equations",
    "Negative coefficients",
    "Recovering the coefficient",
    "Placing the solution of an equation",
  ],
  "math/algebra-1/unit-2/2.4": [
    "Rearranging for a value",
    "Rearranging and evaluating",
    "The order of a rearrangement",
  ],
  "math/algebra-1/unit-2/2.2": [
    "Variables on both sides",
    "Distributing before solving",
    "The order of solving steps",
  ],
  "math/algebra-1/unit-2/2.8": [
    "Absolute value equations",
    "The second solution",
    "Placing an absolute value solution",
  ],
  "math/algebra-1/unit-3/3.1": [
    "Plotting a point",
    "Reflecting a point",
    "Reading a range",
  ],
  "math/algebra-1/unit-3/3.3": [
    "Evaluating a function",
    "Recovering a rule",
    "Finding the input",
  ],
  "math/algebra-1/unit-4/4.1": [
    "Slope from two points",
    "Reading the sign of a slope",
    "Placing a slope",
  ],
  "math/algebra-1/unit-4/4.2": [
    "Slope and intercept from an equation",
    "Evaluating a linear function",
    "The order of graphing a line",
  ],
  "math/algebra-1/unit-4/4.3": [
    "Graphing from an equation",
    "Graphing from two points",
    "Using point-slope to predict",
  ],
  "math/algebra-1/unit-4/4.6": [
    "Parallel and perpendicular slopes",
    "Drawing a perpendicular",
    "The intercept of a parallel line",
  ],
  "math/algebra-1/unit-5/5.3": [
    "Systems by elimination",
    "The multiplier for elimination",
    "Placing a system's solution",
  ],
  "math/algebra-1/unit-6/6.3": [
    "Multiplying binomials",
    "The middle coefficient",
    "The constant of a product",
    "The order of multiplying binomials",
  ],
  "math/algebra-1/unit-6/6.4": [
    "Difference of squares",
    "Perfect square trinomials",
    "The root of a difference of squares",
    "Placing a root of a difference of squares",
  ],
  "math/algebra-1/unit-6/6.6": [
    "Factoring trinomials",
    "A factor of a trinomial",
    "The larger factor pair",
  ],
  "math/algebra-1/unit-7/7.8": [
    "Solving with the quadratic formula",
    "The sum of the roots",
    "Placing a root of a quadratic",
  ],
  "math/algebra-1/unit-7/7.9": [
    "Computing the discriminant",
    "The nature of the roots",
    "Forcing a repeated root",
  ],
  "math/algebra-1/unit-8/8.1": [
    "Finding the nth term",
    "The common ratio",
    "The order of finding a term",
  ],
  "math/algebra-1/unit-9/9.1": [
    "Simplifying radicals",
    "Simplifying a radical",
    "Multiplying radicals",
  ],
  "math/algebra-1/unit-10/10.1": [
    "Mean and median",
    "The range of a data set",
    "The mode",
  ],

  "math/algebra-1/unit-1/1.2": [
    "Naming the property",
    "Identity and inverse elements",
    "Using the distributive property",
  ],
  "math/algebra-1/unit-1/1.3": [
    "Order of operations",
    "Brackets and powers",
    "The order you work in",
    "Placing the value of an expression",
  ],
  "math/algebra-1/unit-1/1.4": [
    "Combining like terms",
    "Combining like terms",
    "Recovering a coefficient",
  ],
  "math/algebra-1/unit-1/1.5": [
    "Translating a phrase",
    "Evaluating a translated phrase",
    "Reading a phrase backwards",
  ],
  "math/algebra-1/unit-1/1.8": [
    "Simplifying a square root",
    "Simplifying a square root",
    "Estimating a root",
  ],
  "math/algebra-1/unit-2/2.3": [
    "Clearing a fraction",
    "Recovering a numerator",
    "Placing a solution",
  ],
  "math/algebra-1/unit-2/2.5": [
    "How many solutions",
    "Forcing no solution",
    "Forcing infinitely many",
    "Reading the end of a solve",
  ],
  "math/algebra-1/unit-2/2.6": [
    "Inequalities and the sign flip",
    "The boundary of a solution set",
    "The largest integer that works",
  ],
  "math/algebra-1/unit-2/2.7": [
    "Compound inequalities",
    "Counting integer solutions",
    "A bound of a compound inequality",
  ],
  "math/algebra-1/unit-2/2.9": [
    "Absolute value inequalities",
    "The width of the band",
    "An endpoint of the band",
  ],
  "math/algebra-1/unit-3/3.2": [
    "Recognising a function",
    "Finding the repeat",
    "Repairing a relation",
  ],
  "math/algebra-1/unit-3/3.4": [
    "Discrete and continuous domains",
    "Sizing a discrete range",
    "A point on a discrete graph",
  ],
  "math/algebra-1/unit-3/3.5": [
    "Finding an intercept",
    "Reading an extremum",
    "Reading the y-intercept",
  ],
  "math/algebra-1/unit-3/3.6": [
    "Evaluating a piecewise function",
    "Where a piecewise rule switches",
    "A point on a piecewise graph",
  ],
  "math/algebra-1/unit-3/3.7": [
    "Evaluating an absolute value function",
    "The vertex of an absolute value graph",
    "Counting intersections",
  ],
  "math/algebra-1/unit-3/3.8": [
    "Describing a transformation",
    "Transforming a point",
    "The order of transformations",
  ],
  "math/algebra-1/unit-4/4.4": [
    "Intercepts from standard form",
    "The x-intercept from standard form",
    "Graphing from standard form",
  ],
  "math/algebra-1/unit-4/4.5": [
    "Converting to standard form",
    "The leading coefficient in standard form",
    "The constant in standard form",
  ],
  "math/algebra-1/unit-4/4.7": [
    "A line through two points",
    "The intercept through two points",
    "A rate from a context",
  ],
  "math/algebra-1/unit-4/4.8": [
    "Inequalities in two variables",
    "The boundary of an inequality",
    "Testing points against an inequality",
  ],
  "math/algebra-1/unit-4/4.9": [
    "An arithmetic sequence as a rule",
    "A term of an arithmetic sequence",
    "The common difference",
  ],
  "math/algebra-1/unit-5/5.1": [
    "Solving a system by graphing",
    "The x where lines cross",
    "The order of graphing a system",
  ],
  "math/algebra-1/unit-5/5.2": [
    "Systems by substitution",
    "The second variable",
    "The order of substitution",
  ],
  "math/algebra-1/unit-5/5.4": [
    "Choosing a method",
    "Solving the efficient way",
    "The solution as a point",
  ],
  "math/algebra-1/unit-5/5.5": [
    "Systems with no solution",
    "Making a system parallel",
    "Deciding how many solutions",
  ],
  "math/algebra-1/unit-5/5.6": [
    "Break-even",
    "Placing break-even",
    "Profit at a quantity",
  ],
  "math/algebra-1/unit-5/5.7": [
    "Systems of inequalities",
    "A corner of the region",
    "Testing a point against a system",
  ],
  "math/algebra-1/unit-5/5.8": [
    "Maximising over a region",
    "The optimal corner",
    "The order of a linear programme",
  ],

  "math/algebra-1/unit-6/6.1": [
    "Classifying a polynomial",
    "The degree of a polynomial",
    "Counting terms",
  ],
  "math/algebra-1/unit-6/6.2": [
    "Adding and subtracting polynomials",
    "A coefficient after subtracting",
    "The constant after adding",
  ],
  "math/algebra-1/unit-6/6.5": [
    "The greatest common factor",
    "The power in the GCF",
    "The order of factoring out",
  ],
  "math/algebra-1/unit-6/6.7": [
    "Trinomials with a leading coefficient",
    "The product ac",
    "The smaller of the split",
  ],
  "math/algebra-1/unit-6/6.8": [
    "Factoring by grouping",
    "The shared bracket",
    "The order of grouping",
  ],
  "math/algebra-1/unit-6/6.9": [
    "Sums and differences of cubes",
    "The cube root in a difference of cubes",
    "The middle term of the cube factor",
  ],
  "math/algebra-1/unit-6/6.10": [
    "Factoring completely",
    "Counting factors",
    "The order of factoring completely",
  ],
  "math/algebra-1/unit-7/7.1": [
    "The axis of symmetry",
    "Computing the axis of symmetry",
    "The height of the vertex",
  ],
  "math/algebra-1/unit-7/7.2": [
    "Placing a vertex",
    "Reading h from vertex form",
    "The vertex from standard form",
  ],
  "math/algebra-1/unit-7/7.3": [
    "Roots from factored form",
    "The larger root",
    "The vertex from factored form",
  ],
  "math/algebra-1/unit-7/7.4": [
    "Reading a root off a graph",
    "Counting x-intercepts",
    "Placing a root",
  ],
  "math/algebra-1/unit-7/7.5": [
    "The Zero Product Property",
    "A root from a factor",
    "The order of the Zero Product Property",
  ],
  "math/algebra-1/unit-7/7.6": [
    "Solving by square roots",
    "The larger square-root solution",
    "Counting square-root solutions",
  ],
  "math/algebra-1/unit-7/7.7": [
    "Completing the square",
    "The number that completes the square",
    "The order of completing the square",
  ],
  "math/algebra-1/unit-7/7.10": [
    "Complex solutions",
    "The imaginary part",
    "A conjugate product",
  ],
  "math/algebra-1/unit-7/7.11": [
    "Projectile motion",
    "The time of the peak",
    "The maximum height",
  ],
  "math/algebra-1/unit-8/8.2": [
    "Exponential growth",
    "The growth factor",
    "Recovering the initial amount",
  ],
  "math/algebra-1/unit-8/8.3": [
    "Exponential decay",
    "The decay rate",
    "When decay passes a threshold",
  ],
  "math/algebra-1/unit-8/8.4": [
    "The horizontal asymptote",
    "Computing the asymptote",
    "The y-intercept of an exponential",
  ],
  "math/algebra-1/unit-8/8.5": [
    "Comparing rates of growth",
    "Comparing two values",
    "Where exponential overtakes",
  ],
  "math/algebra-1/unit-8/8.6": [
    "Recursive and explicit rules",
    "Unrolling a recursion",
    "From recursive to explicit",
  ],
  "math/algebra-1/unit-8/8.7": [
    "Compound interest",
    "Counting compoundings",
    "The rule of 72",
  ],
  "math/algebra-1/unit-9/9.2": [
    "Adding radicals",
    "Adding like radicals",
    "Simplifying before adding",
    "Counting like radicals",
  ],
  "math/algebra-1/unit-9/9.3": [
    "Radical equations",
    "Solving a simple radical equation",
    "Counting extraneous solutions",
  ],
  "math/algebra-1/unit-9/9.4": [
    "Simplifying a rational expression",
    "Where a rational expression is undefined",
    "Placing a hole",
  ],
  "math/algebra-1/unit-9/9.5": [
    "Multiplying rational expressions",
    "The numerator of a product",
    "Dividing by a reciprocal",
  ],
  "math/algebra-1/unit-9/9.6": [
    "Adding rational expressions",
    "The common denominator",
    "Adding over a common denominator",
  ],
  "math/algebra-1/unit-9/9.7": [
    "Rational equations",
    "Solving a proportion equation",
    "An excluded value",
  ],
  "math/algebra-1/unit-9/9.8": [
    "Direct and inverse variation",
    "The constant of variation",
    "An inverse variation value",
  ],
  "math/algebra-1/unit-10/10.2": [
    "The interquartile range",
    "The first quartile",
    "Placing the median",
  ],
  "math/algebra-1/unit-10/10.3": [
    "The shape of a distribution",
    "Mean against median",
    "Counting above the mean",
  ],
  "math/algebra-1/unit-10/10.4": [
    "Reading a correlation coefficient",
    "Placing a correlation",
    "The coefficient of determination",
  ],
  "math/algebra-1/unit-10/10.5": [
    "Residuals",
    "A prediction from the line",
    "Placing a residual",
  ],
  "math/algebra-1/unit-10/10.6": [
    "Two-way tables",
    "A row total",
    "A conditional proportion",
  ],
  "math/algebra-1/unit-10/10.7": [
    "Correlation and causation",
    "Ordering evidence of causation",
    "Variation left over",
  ],

  // ─── Geometry ──────────────────────────────────────────
  "math/geometry/unit-1/1.2": [
    "Setting an angle",
    "Bisecting an angle",
    "Ordering angles by size",
  ],
  "math/geometry/unit-1/1.3": [
    "Segment addition",
    "Segment addition as an equation",
    "Placing a midpoint",
    "The order of finding a midpoint",
  ],
  "math/geometry/unit-1/1.4": [
    "Complements and supplements",
    "A ratio of complements",
    "Placing a supplement",
  ],
  "math/geometry/unit-1/1.5": [
    "Midpoint",
    "Distance",
    "The order of the distance formula",
  ],
  "math/geometry/unit-5/5.1": [
    "The triangle angle sum",
    "Angles in a given ratio",
    "Placing the third angle",
  ],
  "math/geometry/unit-5/5.2": [
    "The exterior angle theorem",
    "The exterior angle as an equation",
    "Placing an exterior angle",
  ],
  "math/geometry/unit-6/6.5": [
    "The midsegment theorem",
    "The side from a midsegment",
    "Placing a midsegment length",
  ],
  "math/geometry/unit-6/6.6": [
    "The triangle inequality",
    "The range for a third side",
    "Counting possible third sides",
    "Placing the smallest third side",
  ],
  "math/geometry/unit-7/7.2": [
    "Scale factor",
    "A scale factor from perimeters",
    "Checking two polygons are similar",
  ],
  "math/geometry/unit-7/7.7": [
    "Area ratios of similar figures",
    "A perimeter ratio from an area ratio",
    "Placing an area ratio",
    "The order of comparing similar areas",
  ],
  "math/geometry/unit-8/8.1": [
    "The Pythagorean theorem",
    "Counting right triangles",
    "Placing a hypotenuse",
  ],
  "math/geometry/unit-8/8.2": [
    "Finding the hypotenuse",
    "Completing a triple",
    "Scaling a triple",
  ],
  "math/geometry/unit-8/8.3": [
    "Special right triangles",
    "Special right triangle ratios",
    "Placing a 30-60-90 hypotenuse",
  ],
  "math/geometry/unit-8/8.4": [
    "Trigonometric ratios",
    "A ratio from a triple",
    "The order of using a ratio",
    "Placing the numerator of a tangent",
  ],
  "math/geometry/unit-9/9.1": [
    "Polygon angle sums",
    "An interior angle of a regular polygon",
    "Placing a polygon exterior angle",
  ],
  "math/geometry/unit-10/10.3": [
    "Central and inscribed angles",
    "Arcs that fill a circle",
    "Placing a major arc",
  ],
  "math/geometry/unit-10/10.9": [
    "The equation of a circle",
    "Placing the centre of a circle",
    "A radius from the equation",
  ],
  "math/geometry/unit-10/10.10": [
    "Area of a sector",
    "Computing sector area",
    "A central angle from a sector area",
    "Placing the multiple of pi in a sector",
  ],
  "math/geometry/unit-11/11.7": [
    "Volume of prisms and cylinders",
    "Volume of a cylinder",
    "Placing a height from a volume",
    "The order of a prism's volume",
  ],
  "math/geometry/unit-11/11.8": [
    "Volume of cones",
    "Volume of a pyramid or cone",
    "Placing the volume of a pyramid",
  ],
  "math/geometry/unit-11/11.9": [
    "Spheres",
    "Sphere volume and surface area",
    "Placing a radius from a surface area",
  ],
  "math/geometry/unit-11/11.11": [
    "Scaling solids",
    "The volume ratio of similar solids",
    "Placing a surface area ratio",
    "The order of comparing similar solids",
  ],
  "math/geometry/unit-12/12.2": [
    "Permutations and combinations",
    "Choosing without order",
    "Placing a count of arrangements",
  ],
  "math/geometry/unit-12/12.5": [
    "Independent and dependent events",
    "Both of two independent events",
    "Drawing twice without replacement",
    "Placing a single-spin chance",
  ],

  "math/geometry/unit-1/1.1": [
    "Counting lines through points",
    "Counting planes",
    "Ordering by dimension",
  ],
  "math/geometry/unit-1/1.7": [
    "Area and perimeter",
    "Circumference",
    "A radius from an area",
  ],
  "math/geometry/unit-2/2.1": [
    "Continuing a pattern",
    "Finding a counterexample",
    "The order of inductive reasoning",
  ],
  "math/geometry/unit-2/2.2": [
    "Converse, inverse, contrapositive",
    "Which related conditionals hold",
    "The order of forming a contrapositive",
  ],
  "math/geometry/unit-2/2.3": [
    "Biconditionals",
    "Counting reversible definitions",
    "Testing a definition",
  ],
  "math/geometry/unit-2/2.4": [
    "The laws of logic",
    "Chaining implications",
    "Following a chain",
  ],
  "math/geometry/unit-2/2.5": [
    "Properties of equality",
    "Ordering an algebraic proof",
    "Naming what changed",
  ],
  "math/geometry/unit-3/3.1": [
    "Angle pairs on a transversal",
    "Counting congruent angles",
    "Placing a co-interior angle",
    "The order of naming an angle pair",
  ],
  "math/geometry/unit-3/3.2": [
    "Angles from parallel lines",
    "Counting equal angles",
    "Placing an alternate exterior angle",
  ],
  "math/geometry/unit-3/3.3": [
    "Proving lines parallel",
    "Angles that make lines parallel",
    "The order of a parallel-lines proof",
  ],
  "math/geometry/unit-3/3.4": [
    "Distance to a line",
    "Distance to a vertical line",
    "Placing the foot of a perpendicular",
  ],
  "math/geometry/unit-3/3.5": [
    "Parallel and perpendicular slopes",
    "A perpendicular slope from two points",
    "Placing a perpendicular slope",
  ],
  "math/geometry/unit-3/3.6": [
    "Equations of parallel lines",
    "The intercept of a parallel line",
    "The order of writing a parallel line",
  ],
  "math/geometry/unit-4/4.1": [
    "Translating a point",
    "The horizontal part of a shift",
    "Placing a vertical shift",
  ],
  "math/geometry/unit-4/4.2": [
    "Reflecting a point",
    "A coordinate after reflecting",
    "Reflecting across a vertical line",
  ],
  "math/geometry/unit-4/4.3": [
    "Rotating a point",
    "A coordinate after rotating",
    "The smallest turn onto itself",
  ],
  "math/geometry/unit-4/4.4": [
    "A composition of two transformations",
    "A coordinate after two moves",
    "The order of a composition",
  ],
  "math/geometry/unit-4/4.5": [
    "Lines of symmetry",
    "The order of rotational symmetry",
    "Placing a symmetry angle",
  ],
  "math/geometry/unit-4/4.6": [
    "Dilating a point",
    "A coordinate after dilating",
    "A scale factor from two lengths",
  ],
  "math/geometry/unit-4/4.7": [
    "Rigid motions",
    "Counting rigid motions",
    "The order of a congruence argument",
  ],
  "math/geometry/unit-4/4.8": [
    "Similarity transformations",
    "Perimeter under a similarity",
    "Placing a scale factor",
  ],
  "math/geometry/unit-5/5.3": [
    "Corresponding parts",
    "Corresponding parts as an equation",
    "The order of a CPCTC argument",
  ],
  "math/geometry/unit-5/5.4": [
    "SSS and SAS",
    "What congruence gives you",
    "The order of an SAS argument",
  ],
  "math/geometry/unit-5/5.5": [
    "ASA and AAS",
    "Counting valid criteria",
    "The third angle in ASA",
  ],
  "math/geometry/unit-5/5.6": [
    "Right triangle congruence",
    "The missing leg",
    "The order of an HL argument",
  ],
  "math/geometry/unit-5/5.7": [
    "Isosceles triangles",
    "A base angle from the vertex",
    "Placing a vertex angle",
    "Placing an isosceles apex",
  ],
  "math/geometry/unit-6/6.1": [
    "Bisectors",
    "Equidistance as an equation",
    "Placing an equidistant point",
  ],
  "math/geometry/unit-6/6.2": [
    "Centres of a triangle",
    "Distances from a centre",
    "The order of locating a circumcenter",
  ],
  "math/geometry/unit-6/6.3": [
    "The centroid",
    "The long part of a median",
    "Placing the short part",
  ],
  "math/geometry/unit-6/6.4": [
    "Altitudes",
    "The altitude to the hypotenuse",
    "The order of locating an orthocenter",
  ],
  "math/geometry/unit-6/6.7": [
    "Sides and angles in order",
    "Ordering sides by angle",
    "The side facing the largest angle",
  ],
  "math/geometry/unit-7/7.1": [
    "Solving a proportion",
    "Scaling a recipe",
    "Placing a missing term",
  ],
  "math/geometry/unit-7/7.3": [
    "Similarity criteria",
    "Counting similarity criteria",
    "The third angle by AA",
  ],
  "math/geometry/unit-7/7.4": [
    "Triangle proportionality",
    "A segment cut proportionally",
    "Placing a proportional segment",
    "The order of triangle proportionality",
  ],
  "math/geometry/unit-7/7.5": [
    "Proportional segments",
    "Parallel lines across two transversals",
    "Placing a piece of a ratio",
    "Placing a point that divides a segment",
  ],
  "math/geometry/unit-7/7.6": [
    "The geometric mean",
    "Computing a geometric mean",
    "Placing an altitude",
  ],
  "math/geometry/unit-8/8.5": [
    "Solving a right triangle",
    "A side from a 30 degree angle",
    "Placing the other acute angle",
    "The order of solving a right triangle",
  ],
  "math/geometry/unit-8/8.6": [
    "Inverse trigonometric ratios",
    "An angle from a ratio",
    "Placing an angle from a ratio",
  ],
  "math/geometry/unit-8/8.7": [
    "Angles of elevation",
    "A height from a 45 degree elevation",
    "Placing an angle of depression",
  ],
  "math/geometry/unit-8/8.8": [
    "The Law of Sines",
    "A side by the Law of Sines",
    "The order of the Law of Sines",
  ],
  "math/geometry/unit-8/8.9": [
    "The Law of Cosines",
    "A side by the Law of Cosines",
    "The order of the Law of Cosines",
  ],
  "math/geometry/unit-8/8.10": [
    "Area from two sides and an angle",
    "Area from an included angle",
    "Placing a right-angled area",
  ],
  "math/geometry/unit-9/9.2": [
    "Angles in a parallelogram",
    "Opposite angles as an equation",
    "Placing a consecutive angle",
  ],
  "math/geometry/unit-9/9.4": [
    "Naming a special parallelogram",
    "Congruent diagonals as an equation",
    "Counting rhombus properties",
  ],
  "math/geometry/unit-9/9.5": [
    "The midsegment of a trapezoid",
    "A parallel side from a midsegment",
    "Placing a trapezoid midsegment",
  ],
  "math/geometry/unit-9/9.7": [
    "The quadrilateral hierarchy",
    "Ordering the quadrilateral hierarchy",
    "Counting parallelograms",
  ],
  "math/geometry/unit-10/10.1": [
    "Radius and diameter",
    "Counting descriptions of a radius",
    "Placing a diameter",
  ],
  "math/geometry/unit-10/10.2": [
    "Tangents and radii",
    "A tangent segment",
    "The order of a tangent problem",
  ],
  "math/geometry/unit-10/10.4": [
    "Arc length",
    "Computing arc length",
    "The order of finding an arc length",
  ],
  "math/geometry/unit-10/10.5": [
    "Intersecting chords",
    "A chord piece",
    "Placing a chord piece",
  ],
  "math/geometry/unit-10/10.6": [
    "Inscribed angles",
    "An inscribed angle from its arc",
    "Placing an intercepted arc",
  ],
  "math/geometry/unit-10/10.7": [
    "Angles from two secants",
    "An angle outside the circle",
    "Placing an angle inside the circle",
    "The order of a secant angle",
  ],
  "math/geometry/unit-10/10.8": [
    "Secant segments",
    "A secant segment",
    "The order of a secant problem",
  ],
  "math/geometry/unit-11/11.1": [
    "Area of a triangle",
    "The area of a trapezoid",
    "Placing a height from an area",
  ],
  "math/geometry/unit-11/11.2": [
    "Area of a regular polygon",
    "An apothem from an area",
    "The order of a regular polygon area",
  ],
  "math/geometry/unit-11/11.3": [
    "Composite areas",
    "Area with a piece removed",
    "Placing a composite area",
  ],
  "math/geometry/unit-11/11.4": [
    "Cross sections",
    "Counting faces and edges",
    "The order of identifying a cross section",
  ],
  "math/geometry/unit-11/11.5": [
    "Surface area of a box",
    "Surface area of a cylinder",
    "Placing the surface area of a cube",
    "The order of a cylinder's surface area",
  ],
  "math/geometry/unit-11/11.6": [
    "Surface area of a cone",
    "Total surface area of a cone",
    "A slant height from a surface area",
  ],
  "math/geometry/unit-11/11.10": [
    "Cavalieri's principle",
    "Equal volumes by Cavalieri",
    "The order of a Cavalieri argument",
  ],
  "math/geometry/unit-11/11.12": [
    "Density",
    "Mass from density",
    "Placing a density",
    "The order of a density calculation",
  ],
  "math/geometry/unit-12/12.1": [
    "The counting principle",
    "Counting outcomes",
    "Placing a count of outcomes",
  ],
  "math/geometry/unit-12/12.3": [
    "Experimental probability",
    "Theoretical probability",
    "Placing an expected count",
  ],
  "math/geometry/unit-12/12.4": [
    "Geometric probability",
    "Probability from areas",
    "Placing a percentage chance",
    "The order of geometric probability",
  ],
  "math/geometry/unit-12/12.6": [
    "Conditional probability",
    "A conditional probability",
    "Placing a conditional percentage",
  ],
  "math/geometry/unit-12/12.7": [
    "Two-way tables and Venn diagrams",
    "Counting at least one",
    "Counting neither",
  ],

  // The proof and construction subunits, which the first two passes left out.
  // They are asked about the parts a proof is assembled from rather than about
  // writing one, and the coordinate proofs are asked on the grid.
  "math/geometry/unit-1/1.6": [
    "Naming a construction",
    "Why a construction works",
    "Ordering a construction",
  ],
  "math/geometry/unit-2/2.6": [
    "The reason for a step",
    "The shape of a two-column proof",
    "Ordering a two-column proof",
  ],
  "math/geometry/unit-2/2.7": [
    "Paragraph proofs",
    "Flowchart proofs",
    "Ordering a flowchart proof",
  ],
  "math/geometry/unit-2/2.8": [
    "Choosing the theorem",
    "Congruent supplements and complements",
    "Ordering an angle proof",
  ],
  "math/geometry/unit-3/3.7": [
    "Constructing a perpendicular",
    "Constructing a parallel",
    "Ordering a line construction",
  ],
  "math/geometry/unit-5/5.8": [
    "CPCTC",
    "What CPCTC allows",
    "Ordering a congruence proof",
  ],
  "math/geometry/unit-5/5.9": [
    "Proving with the distance formula",
    "Placing a figure on the axes",
    "Ordering a coordinate proof",
  ],
  "math/geometry/unit-6/6.8": [
    "The assumption in an indirect proof",
    "Reaching a contradiction",
    "Ordering an indirect proof",
  ],
  "math/geometry/unit-9/9.3": [
    "Tests for a parallelogram",
    "Diagonals that bisect each other",
    "Ordering a parallelogram proof",
  ],
  "math/geometry/unit-9/9.6": [
    "Where the diagonals cross",
    "Perpendicular diagonals",
    "The order of a quadrilateral coordinate proof",
  ],

  // ─── Algebra 2 ─────────────────────────────────────────
  "math/algebra-2/unit-1/1.5": ["Matrix multiplication"],
  "math/algebra-2/unit-1/1.6": ["Determinants"],
  "math/algebra-2/unit-2/2.5": ["Powers of i"],
  "math/algebra-2/unit-2/2.6": ["Multiplying complex numbers"],
  "math/algebra-2/unit-2/2.7": ["Complex conjugates"],
  "math/algebra-2/unit-3/3.5": ["The Remainder Theorem"],
  "math/algebra-2/unit-3/3.7": ["The Rational Root Theorem"],
  "math/algebra-2/unit-4/4.5": ["Horizontal asymptotes"],
  "math/algebra-2/unit-5/5.2": ["Rational exponents"],
  "math/algebra-2/unit-5/5.8": ["Function composition"],
  "math/algebra-2/unit-5/5.9": ["Inverse functions"],
  "math/algebra-2/unit-6/6.5": ["Evaluating a logarithm"],
  "math/algebra-2/unit-6/6.6": ["Properties of logarithms"],
  "math/algebra-2/unit-6/6.8": ["Solving exponential equations"],
  "math/algebra-2/unit-7/7.1": ["Degrees to radians"],
  "math/algebra-2/unit-7/7.2": ["The unit circle"],
  "math/algebra-2/unit-7/7.7": ["Amplitude and period"],
  "math/algebra-2/unit-8/8.2": ["Arithmetic sequences"],
  "math/algebra-2/unit-8/8.3": ["Arithmetic series"],
  "math/algebra-2/unit-8/8.6": ["Infinite geometric series"],
  "math/algebra-2/unit-9/9.4": ["Ellipses"],
  "math/algebra-2/unit-10/10.2": ["Probability as a percentage"],
  "math/algebra-2/unit-10/10.5": ["z-scores"],

  "math/algebra-2/unit-1/1.1": ["Evaluating a linear function"],
  "math/algebra-2/unit-1/1.2": ["Systems in two variables"],
  "math/algebra-2/unit-1/1.3": ["Systems in three variables"],
  "math/algebra-2/unit-1/1.4": ["Adding matrices"],
  "math/algebra-2/unit-1/1.7": ["Entries of an inverse matrix"],
  "math/algebra-2/unit-1/1.8": ["When a system can be solved by matrices"],
  "math/algebra-2/unit-2/2.1": ["The vertex from vertex form"],
  "math/algebra-2/unit-2/2.2": ["Solving by factoring"],
  "math/algebra-2/unit-2/2.3": ["Completing the square"],
  "math/algebra-2/unit-2/2.4": ["The discriminant"],
  "math/algebra-2/unit-2/2.8": ["Complex solutions"],
  "math/algebra-2/unit-2/2.9": ["Quadratic inequalities"],
  "math/algebra-2/unit-2/2.10": ["A line meeting a parabola"],
  "math/algebra-2/unit-3/3.1": ["End behaviour"],
  "math/algebra-2/unit-3/3.2": ["Intercepts of a factored polynomial"],
  "math/algebra-2/unit-3/3.3": ["Multiplying polynomials"],
  "math/algebra-2/unit-3/3.4": ["Polynomial division"],
  "math/algebra-2/unit-3/3.6": ["The Factor Theorem"],
  "math/algebra-2/unit-3/3.8": ["Counting roots"],
  "math/algebra-2/unit-3/3.9": ["Conjugate pairs"],
  "math/algebra-2/unit-3/3.10": ["Building a polynomial from zeros"],
  "math/algebra-2/unit-3/3.11": ["Turning points"],
  "math/algebra-2/unit-3/3.12": ["Polynomial inequalities"],
  "math/algebra-2/unit-3/3.13": ["Binomial coefficients"],
  "math/algebra-2/unit-4/4.1": ["Simplifying a rational expression"],
  "math/algebra-2/unit-4/4.2": ["Dividing rational expressions"],
  "math/algebra-2/unit-4/4.3": ["Adding rational expressions"],
  "math/algebra-2/unit-4/4.4": ["Complex fractions"],
  "math/algebra-2/unit-4/4.6": ["Holes"],
  "math/algebra-2/unit-4/4.7": ["Slant asymptotes"],
  "math/algebra-2/unit-4/4.8": ["Zeros of a rational function"],
  "math/algebra-2/unit-4/4.9": ["Excluded values"],
  "math/algebra-2/unit-4/4.10": ["Rational inequalities"],
  "math/algebra-2/unit-4/4.11": ["The constant of variation"],
  "math/algebra-2/unit-5/5.1": ["nth roots"],
  "math/algebra-2/unit-5/5.3": ["Simplifying radicals"],
  "math/algebra-2/unit-5/5.4": ["Rationalising a denominator"],
  "math/algebra-2/unit-5/5.5": ["The domain of a square root"],
  "math/algebra-2/unit-5/5.6": ["Radical equations"],
  "math/algebra-2/unit-5/5.7": ["Combining two functions"],
  "math/algebra-2/unit-5/5.10": ["Recognising an inverse"],

  "math/algebra-2/unit-6/6.1": ["Growth and decay factors"],
  "math/algebra-2/unit-6/6.2": ["The natural base"],
  "math/algebra-2/unit-6/6.3": ["Graphing an exponential"],
  "math/algebra-2/unit-6/6.4": ["Logarithmic notation"],
  "math/algebra-2/unit-6/6.7": ["Change of base"],
  "math/algebra-2/unit-6/6.9": ["Logarithmic equations"],
  "math/algebra-2/unit-6/6.10": ["Compound interest"],
  "math/algebra-2/unit-6/6.11": ["Doubling"],
  "math/algebra-2/unit-6/6.12": ["Logistic growth"],
  "math/algebra-2/unit-7/7.3": ["Right triangle ratios"],
  "math/algebra-2/unit-7/7.4": ["Signs by quadrant"],
  "math/algebra-2/unit-7/7.5": ["Reference angles"],
  "math/algebra-2/unit-7/7.6": ["Amplitude and midline"],
  "math/algebra-2/unit-7/7.8": ["Asymptotes of the tangent graph"],
  "math/algebra-2/unit-7/7.9": ["Inverse trigonometric functions"],
  "math/algebra-2/unit-7/7.10": ["Solving a trigonometric equation"],
  "math/algebra-2/unit-7/7.11": ["The Pythagorean identity"],
  "math/algebra-2/unit-7/7.12": ["Simplifying with identities"],
  "math/algebra-2/unit-7/7.13": ["Sum and difference formulas"],
  "math/algebra-2/unit-7/7.14": ["Double-angle formulas"],
  "math/algebra-2/unit-7/7.15": ["The Law of Sines"],
  "math/algebra-2/unit-7/7.16": ["Period of a sinusoid"],
  "math/algebra-2/unit-8/8.1": ["Recursive sequences"],
  "math/algebra-2/unit-8/8.4": ["Geometric sequences"],
  "math/algebra-2/unit-8/8.5": ["Geometric series"],
  "math/algebra-2/unit-8/8.7": ["Sigma notation"],
  "math/algebra-2/unit-8/8.8": ["The inductive step"],
  "math/algebra-2/unit-9/9.1": ["Distance between points"],
  "math/algebra-2/unit-9/9.2": ["The focus of a parabola"],
  "math/algebra-2/unit-9/9.3": ["The centre of a circle"],
  "math/algebra-2/unit-9/9.5": ["Asymptotes of a hyperbola"],
  "math/algebra-2/unit-9/9.6": ["Classifying a conic"],
  "math/algebra-2/unit-9/9.7": ["A line meeting a circle"],
  "math/algebra-2/unit-10/10.1": ["Permutations and combinations"],
  "math/algebra-2/unit-10/10.3": ["Drawing without replacement"],
  "math/algebra-2/unit-10/10.4": ["Binomial probability"],
  "math/algebra-2/unit-10/10.6": ["Sampling"],
  "math/algebra-2/unit-10/10.7": ["Margin of error"],
  "math/algebra-2/unit-10/10.8": ["Choosing a model"],

  // ─── Precalculus ───────────────────────────────────────
  "math/precalculus/unit-1/1.4": ["Average rate of change"],
  "math/precalculus/unit-1/1.8": ["Function composition"],
  "math/precalculus/unit-2/2.7": ["Vertical asymptotes"],
  "math/precalculus/unit-3/3.6": ["Properties of logarithms"],
  "math/precalculus/unit-3/3.7": ["Solving exponential equations"],
  "math/precalculus/unit-4/4.2": ["Arc length"],
  "math/precalculus/unit-4/4.5": ["Sinusoidal transformations"],
  "math/precalculus/unit-4/4.11": ["Pythagorean identities"],
  "math/precalculus/unit-5/5.2": ["Vector magnitude"],
  "math/precalculus/unit-5/5.4": ["The dot product"],
  "math/precalculus/unit-5/5.7": ["Eliminating the parameter"],
  "math/precalculus/unit-6/6.4": ["Eccentricity"],
  "math/precalculus/unit-7/7.2": ["Geometric series"],
  "math/precalculus/unit-7/7.5": ["The Binomial Theorem"],
  "math/precalculus/unit-7/7.9": ["Evaluating limits algebraically"],
  "math/precalculus/unit-7/7.10": ["One-sided limits"],
  "math/precalculus/unit-7/7.12": ["The difference quotient"],

  "math/precalculus/unit-1/1.1": ["Domain of a rational function"],
  "math/precalculus/unit-1/1.2": ["Extrema"],
  "math/precalculus/unit-1/1.3": ["Even and odd functions"],
  "math/precalculus/unit-1/1.5": ["Concavity"],
  "math/precalculus/unit-1/1.6": ["Piecewise functions"],
  "math/precalculus/unit-1/1.7": ["Transformations"],
  "math/precalculus/unit-1/1.9": ["Restricting a domain"],
  "math/precalculus/unit-1/1.10": ["Building a linear model"],
  "math/precalculus/unit-2/2.1": ["Zeros and degree"],
  "math/precalculus/unit-2/2.2": ["Multiplicity"],
  "math/precalculus/unit-2/2.3": ["Complex zeros"],
  "math/precalculus/unit-2/2.4": ["The Remainder Theorem"],
  "math/precalculus/unit-2/2.5": ["Odd and even degree"],
  "math/precalculus/unit-2/2.6": ["Holes"],
  "math/precalculus/unit-2/2.8": ["Vertical asymptotes"],
  "math/precalculus/unit-2/2.9": ["Polynomial inequalities"],
  "math/precalculus/unit-2/2.10": ["Modelling with a polynomial"],
  "math/precalculus/unit-2/2.11": ["Residuals"],
  "math/precalculus/unit-3/3.1": ["Arithmetic and geometric sequences"],
  "math/precalculus/unit-3/3.2": ["Growth factors"],
  "math/precalculus/unit-3/3.3": ["Continuous rates"],
  "math/precalculus/unit-3/3.4": ["Asymptotes of an exponential"],
  "math/precalculus/unit-3/3.5": ["Logarithms as inverses"],
  "math/precalculus/unit-3/3.8": ["Exponential inequalities"],
  "math/precalculus/unit-3/3.9": ["Semi-log plots"],
  "math/precalculus/unit-3/3.10": ["Doubling models"],
  "math/precalculus/unit-4/4.1": ["Cycles and periods"],
  "math/precalculus/unit-4/4.3": ["The unit circle"],
  "math/precalculus/unit-4/4.4": ["Period of a sinusoid"],
  "math/precalculus/unit-4/4.6": ["Sinusoidal models"],
  "math/precalculus/unit-4/4.7": ["The tangent function"],
  "math/precalculus/unit-4/4.8": ["Reciprocal functions"],
  "math/precalculus/unit-4/4.9": ["Ranges of inverse functions"],
  "math/precalculus/unit-4/4.10": ["Solving trigonometric equations"],
  "math/precalculus/unit-4/4.12": ["Double-angle identities"],
  "math/precalculus/unit-4/4.13": ["Simplifying with identities"],
  "math/precalculus/unit-4/4.14": ["The Law of Cosines"],
  "math/precalculus/unit-4/4.15": ["Polar to rectangular"],
  "math/precalculus/unit-4/4.16": ["Polar graphs"],
  "math/precalculus/unit-4/4.17": ["Rates in polar form"],
  "math/precalculus/unit-5/5.1": ["Adding vectors"],
  "math/precalculus/unit-5/5.3": ["Unit vectors"],
  "math/precalculus/unit-5/5.5": ["Resultants"],
  "math/precalculus/unit-5/5.6": ["A point on a parametric curve"],
  "math/precalculus/unit-5/5.8": ["Parametric motion"],
  "math/precalculus/unit-5/5.9": ["Determinants"],
  "math/precalculus/unit-5/5.10": ["Matrices as transformations"],
  "math/precalculus/unit-5/5.11": ["Systems as matrices"],
  "math/precalculus/unit-5/5.12": ["Determinants and area"],
  "math/precalculus/unit-6/6.1": ["The directrix"],
  "math/precalculus/unit-6/6.2": ["Axes of an ellipse"],
  "math/precalculus/unit-6/6.3": ["Vertices of a hyperbola"],
  "math/precalculus/unit-6/6.5": ["Rotating the axes"],
  "math/precalculus/unit-6/6.6": ["Conics in polar form"],
  "math/precalculus/unit-6/6.7": ["Conics in parametric form"],
  "math/precalculus/unit-7/7.1": ["Explicit sequences"],
  "math/precalculus/unit-7/7.3": ["Summation formulas"],
  "math/precalculus/unit-7/7.4": ["Infinite geometric series"],
  "math/precalculus/unit-7/7.6": ["The inductive step"],
  "math/precalculus/unit-7/7.7": ["Limits by substitution"],
  "math/precalculus/unit-7/7.8": ["Limits from a table"],
  "math/precalculus/unit-7/7.11": ["Limits at infinity"],

  // ─── AP Calculus AB ────────────────────────────────────
  "math/ap-calculus-ab/unit-1/1.6": ["Limits by algebraic manipulation"],
  "math/ap-calculus-ab/unit-1/1.15": ["Limits at infinity"],
  "math/ap-calculus-ab/unit-2/2.5": ["The Power Rule"],
  "math/ap-calculus-ab/unit-2/2.8": ["The Product Rule"],
  "math/ap-calculus-ab/unit-2/2.9": ["The Quotient Rule"],
  "math/ap-calculus-ab/unit-3/3.1": ["The Chain Rule"],
  "math/ap-calculus-ab/unit-3/3.6": ["Higher-order derivatives"],
  "math/ap-calculus-ab/unit-4/4.2": ["Straight-line motion"],
  "math/ap-calculus-ab/unit-4/4.5": ["Related rates"],
  "math/ap-calculus-ab/unit-4/4.7": ["L'Hospital's Rule"],
  "math/ap-calculus-ab/unit-5/5.2": ["Finding a critical point"],
  "math/ap-calculus-ab/unit-5/5.3": ["Increasing and decreasing intervals"],
  "math/ap-calculus-ab/unit-5/5.7": ["The Second Derivative Test"],
  "math/ap-calculus-ab/unit-6/6.7": ["Definite integrals"],
  "math/ap-calculus-ab/unit-6/6.8": ["Antiderivatives"],
  "math/ap-calculus-ab/unit-6/6.9": ["Integration by substitution"],
  "math/ap-calculus-ab/unit-8/8.1": ["Average value"],
  "math/ap-calculus-ab/unit-8/8.4": ["Area between curves"],

  "math/ap-calculus-ab/unit-1/1.1": ["Average and instantaneous rates"],
  "math/ap-calculus-ab/unit-1/1.2": ["Reading limit notation"],
  "math/ap-calculus-ab/unit-1/1.3": ["Limits from a graph"],
  "math/ap-calculus-ab/unit-1/1.4": ["Limits from a table"],
  "math/ap-calculus-ab/unit-1/1.5": ["Properties of limits"],
  "math/ap-calculus-ab/unit-1/1.7": ["Choosing a procedure"],
  "math/ap-calculus-ab/unit-1/1.8": ["The Squeeze Theorem"],
  "math/ap-calculus-ab/unit-1/1.9": ["One-sided limits that disagree"],
  "math/ap-calculus-ab/unit-1/1.10": ["Types of discontinuity"],
  "math/ap-calculus-ab/unit-1/1.11": ["Continuity at a point"],
  "math/ap-calculus-ab/unit-1/1.12": ["Continuity on an interval"],
  "math/ap-calculus-ab/unit-1/1.13": ["Removing a discontinuity"],
  "math/ap-calculus-ab/unit-1/1.14": ["Vertical asymptotes"],
  "math/ap-calculus-ab/unit-1/1.16": ["The Intermediate Value Theorem"],
  "math/ap-calculus-ab/unit-2/2.1": ["Average rate of change"],
  "math/ap-calculus-ab/unit-2/2.2": ["The definition of the derivative"],
  "math/ap-calculus-ab/unit-2/2.3": ["Estimating a derivative"],
  "math/ap-calculus-ab/unit-2/2.4": ["Differentiability"],
  "math/ap-calculus-ab/unit-2/2.6": ["Sum and constant multiple rules"],
  "math/ap-calculus-ab/unit-2/2.7": ["Standard derivatives"],
  "math/ap-calculus-ab/unit-2/2.10": ["Derivatives of the other ratios"],
  "math/ap-calculus-ab/unit-3/3.2": ["Implicit differentiation"],
  "math/ap-calculus-ab/unit-3/3.3": ["Derivatives of inverses"],
  "math/ap-calculus-ab/unit-3/3.4": ["Inverse trigonometric derivatives"],
  "math/ap-calculus-ab/unit-3/3.5": ["Choosing a rule"],
  "math/ap-calculus-ab/unit-4/4.1": ["The derivative in context"],
  "math/ap-calculus-ab/unit-4/4.3": ["Rates in context"],
  "math/ap-calculus-ab/unit-4/4.4": ["Setting up a related rate"],
  "math/ap-calculus-ab/unit-4/4.6": ["Linearisation"],
  "math/ap-calculus-ab/unit-5/5.1": ["The Mean Value Theorem"],
  "math/ap-calculus-ab/unit-5/5.4": ["The First Derivative Test"],
  "math/ap-calculus-ab/unit-5/5.5": ["The Candidates Test"],
  "math/ap-calculus-ab/unit-5/5.6": ["Points of inflection"],
  "math/ap-calculus-ab/unit-5/5.8": ["A function and its derivative"],
  "math/ap-calculus-ab/unit-5/5.9": ["The Second Derivative Test"],
  "math/ap-calculus-ab/unit-5/5.10": ["Setting up an optimisation"],
  "math/ap-calculus-ab/unit-5/5.11": ["Solving an optimisation"],
  "math/ap-calculus-ab/unit-5/5.12": ["Tangents to an implicit curve"],
  "math/ap-calculus-ab/unit-6/6.1": ["Accumulating change"],
  "math/ap-calculus-ab/unit-6/6.2": ["Riemann sums"],
  "math/ap-calculus-ab/unit-6/6.3": ["What an integral means"],
  "math/ap-calculus-ab/unit-6/6.4": ["Accumulation functions"],
  "math/ap-calculus-ab/unit-6/6.5": ["Reading an accumulation function"],
  "math/ap-calculus-ab/unit-6/6.6": ["Properties of definite integrals"],
  "math/ap-calculus-ab/unit-6/6.10": ["Rewriting before integrating"],
  "math/ap-calculus-ab/unit-6/6.14": ["Choosing a technique"],
  "math/ap-calculus-ab/unit-7/7.1": ["Writing a differential equation"],
  "math/ap-calculus-ab/unit-7/7.2": ["Verifying a solution"],
  "math/ap-calculus-ab/unit-7/7.3": ["Slope fields"],
  "math/ap-calculus-ab/unit-7/7.4": ["Reading a slope field"],
  "math/ap-calculus-ab/unit-7/7.6": ["Separation of variables"],
  "math/ap-calculus-ab/unit-7/7.7": ["Particular solutions"],
  "math/ap-calculus-ab/unit-7/7.8": ["Exponential models"],
  "math/ap-calculus-ab/unit-8/8.2": ["Motion from velocity"],
  "math/ap-calculus-ab/unit-8/8.3": ["Accumulation in context"],
  "math/ap-calculus-ab/unit-8/8.5": ["Area integrated in y"],
  "math/ap-calculus-ab/unit-8/8.6": ["Curves that cross three times"],
  "math/ap-calculus-ab/unit-8/8.7": ["Square cross sections"],
  "math/ap-calculus-ab/unit-8/8.8": ["Other cross sections"],
  "math/ap-calculus-ab/unit-8/8.9": ["The disc method"],
  "math/ap-calculus-ab/unit-8/8.10": ["Discs about another axis"],
  "math/ap-calculus-ab/unit-8/8.11": ["The washer method"],
  "math/ap-calculus-ab/unit-8/8.12": ["Washers about another axis"],

  // ─── AP Calculus BC ────────────────────────────────────
  // Units 1–5 are shared with AB, and so are its generators — a BC student
  // drilling the Chain Rule does it in the AB course rather than in a second
  // copy of it here.
  "math/ap-calculus-bc/unit-6/6.11": ["Integration by parts"],
  "math/ap-calculus-bc/unit-6/6.13": ["Improper integrals"],
  "math/ap-calculus-bc/unit-7/7.5": ["Euler's method"],
  "math/ap-calculus-bc/unit-8/8.13": ["Arc length"],
  "math/ap-calculus-bc/unit-9/9.1": ["Parametric derivatives"],
  "math/ap-calculus-bc/unit-9/9.8": ["Area of a polar region"],
  "math/ap-calculus-bc/unit-10/10.2": ["Geometric series"],
  "math/ap-calculus-bc/unit-10/10.5": ["p-series"],
  "math/ap-calculus-bc/unit-10/10.8": ["The Ratio Test"],
  "math/ap-calculus-bc/unit-10/10.11": ["Taylor coefficients"],
  "math/ap-calculus-bc/unit-10/10.13": ["Radius of convergence"],
  "math/ap-calculus-bc/unit-6/6.12": ["Partial fractions"],
  "math/ap-calculus-bc/unit-7/7.9": ["Logistic models"],
  "math/ap-calculus-bc/unit-9/9.2": ["Second derivatives in parametric form"],
  "math/ap-calculus-bc/unit-9/9.3": ["Parametric arc length"],
  "math/ap-calculus-bc/unit-9/9.4": ["Differentiating a vector function"],
  "math/ap-calculus-bc/unit-9/9.5": ["Integrating a vector function"],
  "math/ap-calculus-bc/unit-9/9.6": ["Speed from a velocity vector"],
  "math/ap-calculus-bc/unit-9/9.7": ["Differentiating in polar form"],
  "math/ap-calculus-bc/unit-9/9.9": ["Area between polar curves"],
  "math/ap-calculus-bc/unit-10/10.1": ["Convergence and divergence"],
  "math/ap-calculus-bc/unit-10/10.3": ["The nth Term Test"],
  "math/ap-calculus-bc/unit-10/10.4": ["The Integral Test"],
  "math/ap-calculus-bc/unit-10/10.6": ["Comparison tests"],
  "math/ap-calculus-bc/unit-10/10.7": ["The Alternating Series Test"],
  "math/ap-calculus-bc/unit-10/10.9": ["Absolute and conditional convergence"],
  "math/ap-calculus-bc/unit-10/10.10": ["The alternating series error bound"],
  "math/ap-calculus-bc/unit-10/10.12": ["The Lagrange error bound"],
  "math/ap-calculus-bc/unit-10/10.14": ["Maclaurin series"],
  "math/ap-calculus-bc/unit-10/10.15": ["Functions as power series"],
};

/**
 * Every subunit id AP Calculus BC actually has. Read off the course outline
 * rather than written out, because it is only used to answer one question:
 * does BC have a subunit with this code?
 */
const BC_SUBUNITS = new Set(
  AP_CALCULUS_BC.flatMap(([unit, , subunits]) =>
    subunits.map(([code]) => `math/ap-calculus-bc/${unit}/${code}`),
  ),
);

/**
 * BC's share of AB.
 *
 * Units 1–5 of the two courses are the same material, and so is most of 6 to 8.
 * A BC student drilling the Chain Rule used to have to walk into the AB course
 * to find it, because the generators were filed under AB's subunit ids and
 * nothing pointed BC's at them.
 *
 * Now every BC subunit whose code AB also covers, and which BC does not answer
 * for itself, takes AB's topics — and, on the server, AB's generator functions.
 * One list, derived once: the generator file reads the result of this rather than
 * repeating the rule, so the manifest and the generators cannot disagree about
 * which subunits are shared.
 */
function sharedWithAb<T>(values: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = {};

  for (const [id, value] of Object.entries(values)) {
    if (!id.startsWith("math/ap-calculus-ab/")) continue;

    const twin = id.replace("/ap-calculus-ab/", "/ap-calculus-bc/");
    // Checked against the manifest rather than against whatever is being
    // mirrored: a BC subunit that brings its own generators brings its own
    // answer kinds with them, and must not inherit AB's either way.
    if (BC_SUBUNITS.has(twin) && !OWN[twin]) out[twin] = value;
  }

  return out;
}

export const GENERATED: Record<string, string[]> = {
  ...OWN,
  ...sharedWithAb(OWN),
};

/** How many generators back a subunit. Zero for an ordinary question bank. */
export function generatorCount(subunitId: string): number {
  return GENERATED[subunitId]?.length ?? 0;
}

// ─── Where an answer is placed rather than typed ─────────

/**
 * The generators that ask for their answer on a grid, on a scale, or as a
 * sequence — a point, a slider, a drawn line, an ordering — rather than for
 * one typed or chosen from four. Subunit id → positions in that subunit's list
 * above.
 *
 * This is here, on the public side, because the mirror duel is settled on how
 * close two answers were, which only means anything when closeness is what
 * the question measures. The library has to know that before a game starts,
 * and the generators themselves are server-only. It gives nothing away:
 * knowing that a question will ask you to place a point says nothing at all
 * about where the point goes.
 *
 * A generator belongs here only if it asks for a placed answer on *every*
 * seed. One that sometimes asks for a typed one would quietly seed a duel
 * with questions it cannot settle. `npm run check:templates` checks both
 * directions of that against what the generators actually produce, so this
 * list cannot drift away from them.
 */
const SPATIAL_OWN: Record<string, number[]> = {
  // ─── Grade 5 ───────────────────────────────────────────
  "math/grade-5/unit-1/1.2": [1],
  "math/grade-5/unit-1/1.3": [1],
  "math/grade-5/unit-1/1.4": [2],
  "math/grade-5/unit-1/1.5": [2],
  "math/grade-5/unit-1/1.6": [2],
  "math/grade-5/unit-1/1.7": [2],
  "math/grade-5/unit-1/1.8": [2],
  "math/grade-5/unit-2/2.1": [2],
  "math/grade-5/unit-2/2.2": [2],
  "math/grade-5/unit-2/2.3": [2],
  "math/grade-5/unit-2/2.4": [2],
  "math/grade-5/unit-2/2.5": [2],
  "math/grade-5/unit-2/2.6": [2],
  "math/grade-5/unit-2/2.7": [2],
  "math/grade-5/unit-2/2.8": [2],
  "math/grade-5/unit-3/3.1": [2],
  "math/grade-5/unit-3/3.2": [1, 2],
  "math/grade-5/unit-3/3.3": [2],
  "math/grade-5/unit-3/3.4": [2],
  "math/grade-5/unit-3/3.5": [2],
  "math/grade-5/unit-3/3.6": [2],
  "math/grade-5/unit-3/3.7": [2],
  "math/grade-5/unit-3/3.8": [2],
  "math/grade-5/unit-4/4.1": [2],
  "math/grade-5/unit-4/4.2": [2],
  "math/grade-5/unit-4/4.3": [2],
  "math/grade-5/unit-4/4.4": [2],
  "math/grade-5/unit-4/4.5": [2],
  "math/grade-5/unit-4/4.6": [2],
  "math/grade-5/unit-4/4.7": [2],
  "math/grade-5/unit-4/4.8": [2],
  "math/grade-5/unit-4/4.9": [2],
  "math/grade-5/unit-5/5.1": [2],
  "math/grade-5/unit-5/5.2": [2],
  "math/grade-5/unit-5/5.3": [2],
  "math/grade-5/unit-5/5.4": [2],
  "math/grade-5/unit-5/5.5": [2],
  "math/grade-5/unit-5/5.6": [0, 2],
  "math/grade-5/unit-5/5.7": [2],
  "math/grade-5/unit-6/6.1": [0],
  "math/grade-5/unit-6/6.2": [0, 1],
  "math/grade-5/unit-6/6.3": [2],
  "math/grade-5/unit-6/6.4": [2],
  "math/grade-5/unit-6/6.5": [0, 2],
  "math/grade-5/unit-6/6.6": [0, 2],
  "math/grade-5/unit-7/7.1": [2],
  "math/grade-5/unit-7/7.2": [2],
  "math/grade-5/unit-7/7.3": [2],
  "math/grade-5/unit-7/7.4": [2],
  "math/grade-5/unit-7/7.5": [2],
  "math/grade-5/unit-7/7.6": [2],
  "math/grade-5/unit-7/7.7": [2],
  "math/grade-5/unit-7/7.8": [2],
  "math/grade-5/unit-8/8.1": [2],
  "math/grade-5/unit-8/8.2": [2],
  "math/grade-5/unit-8/8.3": [0],
  "math/grade-5/unit-8/8.4": [2],
  "math/grade-5/unit-8/8.5": [2],
  "math/grade-5/unit-8/8.6": [2],

  // ─── Grade 6 ───────────────────────────────────────────
  "math/grade-6/unit-1/1.1": [2],
  "math/grade-6/unit-1/1.2": [2],
  "math/grade-6/unit-1/1.3": [2],
  "math/grade-6/unit-1/1.4": [2],
  "math/grade-6/unit-1/1.5": [0, 2],
  "math/grade-6/unit-1/1.6": [2],
  "math/grade-6/unit-1/1.7": [2],
  "math/grade-6/unit-1/1.8": [2],
  "math/grade-6/unit-1/1.9": [2],
  "math/grade-6/unit-2/2.1": [2],
  "math/grade-6/unit-2/2.2": [2],
  "math/grade-6/unit-2/2.3": [2],
  "math/grade-6/unit-2/2.4": [2],
  "math/grade-6/unit-2/2.5": [2],
  "math/grade-6/unit-2/2.6": [2],
  "math/grade-6/unit-2/2.7": [2],
  "math/grade-6/unit-3/3.1": [2],
  "math/grade-6/unit-3/3.2": [0],
  "math/grade-6/unit-3/3.3": [2],
  "math/grade-6/unit-3/3.4": [2],
  "math/grade-6/unit-3/3.5": [0, 2],
  "math/grade-6/unit-3/3.6": [2],
  "math/grade-6/unit-3/3.7": [0, 2],
  "math/grade-6/unit-3/3.8": [0],
  "math/grade-6/unit-3/3.9": [2],
  "math/grade-6/unit-4/4.1": [2],
  "math/grade-6/unit-4/4.2": [2],
  "math/grade-6/unit-4/4.5": [2],
  "math/grade-6/unit-4/4.6": [2],
  "math/grade-6/unit-4/4.7": [2],
  "math/grade-6/unit-4/4.9": [2],
  "math/grade-6/unit-5/5.1": [2],
  "math/grade-6/unit-5/5.2": [2],
  "math/grade-6/unit-5/5.3": [2],
  "math/grade-6/unit-5/5.4": [2],
  "math/grade-6/unit-5/5.6": [0],
  "math/grade-6/unit-5/5.7": [2],
  "math/grade-6/unit-5/5.8": [1, 2],
  "math/grade-6/unit-6/6.1": [2],
  "math/grade-6/unit-6/6.2": [2],
  "math/grade-6/unit-6/6.3": [2],
  "math/grade-6/unit-6/6.4": [2],
  "math/grade-6/unit-6/6.5": [1, 2],
  "math/grade-6/unit-6/6.6": [2],
  "math/grade-6/unit-6/6.7": [2],
  "math/grade-6/unit-6/6.8": [2],
  "math/grade-6/unit-7/7.2": [2],
  "math/grade-6/unit-7/7.3": [2],
  "math/grade-6/unit-7/7.4": [2],
  "math/grade-6/unit-7/7.5": [2],
  "math/grade-6/unit-7/7.6": [2],
  "math/grade-6/unit-7/7.7": [2],
  "math/grade-6/unit-7/7.9": [2],

  // ─── Grade 7 ───────────────────────────────────────────
  "math/grade-7/unit-1/1.1": [2],
  "math/grade-7/unit-1/1.2": [2],
  "math/grade-7/unit-1/1.3": [2],
  "math/grade-7/unit-1/1.4": [2],
  "math/grade-7/unit-1/1.5": [2],
  "math/grade-7/unit-1/1.6": [2],
  "math/grade-7/unit-1/1.7": [2],
  "math/grade-7/unit-1/1.8": [2],
  "math/grade-7/unit-1/1.9": [2],
  "math/grade-7/unit-2/2.1": [0],
  "math/grade-7/unit-2/2.2": [2],
  "math/grade-7/unit-2/2.3": [2],
  "math/grade-7/unit-2/2.4": [2],
  "math/grade-7/unit-2/2.5": [2],
  "math/grade-7/unit-2/2.6": [2],
  "math/grade-7/unit-2/2.7": [2],
  "math/grade-7/unit-2/2.8": [2],
  "math/grade-7/unit-2/2.9": [2],
  "math/grade-7/unit-3/3.1": [2],
  "math/grade-7/unit-3/3.2": [2],
  "math/grade-7/unit-3/3.3": [2],
  "math/grade-7/unit-3/3.4": [2],
  "math/grade-7/unit-3/3.5": [2],
  "math/grade-7/unit-3/3.6": [2],
  "math/grade-7/unit-3/3.7": [2],
  "math/grade-7/unit-4/4.1": [2],
  "math/grade-7/unit-4/4.2": [2],
  "math/grade-7/unit-4/4.3": [2],
  "math/grade-7/unit-4/4.4": [2],
  "math/grade-7/unit-4/4.5": [2],
  "math/grade-7/unit-4/4.6": [2],
  "math/grade-7/unit-4/4.7": [2],
  "math/grade-7/unit-4/4.8": [2],
  "math/grade-7/unit-4/4.9": [2],
  "math/grade-7/unit-4/4.10": [2],
  "math/grade-7/unit-5/5.1": [2],
  "math/grade-7/unit-5/5.3": [2],
  "math/grade-7/unit-5/5.4": [2],
  "math/grade-7/unit-5/5.7": [2],
  "math/grade-7/unit-5/5.8": [2],
  "math/grade-7/unit-5/5.9": [2],
  "math/grade-7/unit-5/5.10": [2],
  "math/grade-7/unit-6/6.1": [0],
  "math/grade-7/unit-6/6.2": [2],
  "math/grade-7/unit-6/6.3": [2],
  "math/grade-7/unit-6/6.4": [2],
  "math/grade-7/unit-6/6.5": [2],
  "math/grade-7/unit-6/6.6": [2],
  "math/grade-7/unit-6/6.7": [2],
  "math/grade-7/unit-6/6.8": [2],
  "math/grade-7/unit-7/7.1": [2],
  "math/grade-7/unit-7/7.3": [2],
  "math/grade-7/unit-7/7.4": [2],
  "math/grade-7/unit-7/7.5": [2],
  "math/grade-7/unit-7/7.6": [2],
  "math/grade-7/unit-7/7.7": [2],

  // ─── Grade 8 ───────────────────────────────────────────
  "math/grade-8/unit-1/1.1": [2],
  "math/grade-8/unit-1/1.2": [2],
  "math/grade-8/unit-1/1.3": [2],
  "math/grade-8/unit-1/1.4": [0, 2],
  "math/grade-8/unit-1/1.5": [2],
  "math/grade-8/unit-1/1.6": [2],
  "math/grade-8/unit-2/2.1": [2],
  "math/grade-8/unit-2/2.2": [2],
  "math/grade-8/unit-2/2.3": [2],
  "math/grade-8/unit-2/2.4": [2],
  "math/grade-8/unit-2/2.5": [2],
  "math/grade-8/unit-2/2.6": [2],
  "math/grade-8/unit-2/2.7": [2],
  "math/grade-8/unit-3/3.1": [2],
  "math/grade-8/unit-3/3.2": [2],
  "math/grade-8/unit-3/3.3": [2],
  "math/grade-8/unit-3/3.5": [0],
  "math/grade-8/unit-3/3.6": [2],
  "math/grade-8/unit-4/4.1": [0, 2],
  "math/grade-8/unit-4/4.2": [2],
  "math/grade-8/unit-4/4.3": [2],
  "math/grade-8/unit-4/4.4": [2],
  "math/grade-8/unit-4/4.5": [1, 2],
  "math/grade-8/unit-4/4.6": [0, 1],
  "math/grade-8/unit-4/4.7": [2],
  "math/grade-8/unit-4/4.8": [2],
  "math/grade-8/unit-4/4.9": [2],
  "math/grade-8/unit-5/5.1": [1],
  "math/grade-8/unit-5/5.2": [0, 2],
  "math/grade-8/unit-5/5.3": [1],
  "math/grade-8/unit-5/5.4": [2],
  "math/grade-8/unit-5/5.5": [2],
  "math/grade-8/unit-5/5.7": [2],
  "math/grade-8/unit-6/6.2": [2],
  "math/grade-8/unit-6/6.3": [2],
  "math/grade-8/unit-6/6.5": [2],
  "math/grade-8/unit-6/6.6": [2],
  "math/grade-8/unit-6/6.7": [0, 2],
  "math/grade-8/unit-7/7.1": [0, 2],
  "math/grade-8/unit-7/7.2": [0],
  "math/grade-8/unit-7/7.3": [0],
  "math/grade-8/unit-7/7.4": [0, 2],
  "math/grade-8/unit-7/7.6": [0, 2],
  "math/grade-8/unit-7/7.7": [2],
  "math/grade-8/unit-7/7.9": [2],
  "math/grade-8/unit-8/8.2": [0],
  "math/grade-8/unit-8/8.3": [2],
  "math/grade-8/unit-8/8.5": [2],
  "math/grade-8/unit-8/8.6": [2],
  "math/grade-8/unit-8/8.7": [2],
  "math/grade-8/unit-9/9.1": [2],
  "math/grade-8/unit-9/9.2": [2],
  "math/grade-8/unit-9/9.3": [2],
  "math/grade-8/unit-9/9.4": [2],
  "math/grade-8/unit-9/9.7": [0, 2],
  "math/grade-8/unit-9/9.8": [2],
  "math/grade-8/unit-9/9.9": [2],

  // ─── Algebra 1 ─────────────────────────────────────────
  "math/algebra-1/unit-3/3.1": [0, 1],
  "math/algebra-1/unit-3/3.5": [0, 2],
  "math/algebra-1/unit-4/4.3": [0, 1],
  "math/algebra-1/unit-4/4.4": [0, 2],
  "math/algebra-1/unit-4/4.7": [0, 2],
  "math/algebra-1/unit-5/5.1": [0, 2],
  "math/algebra-1/unit-5/5.2": [0, 2],
  "math/algebra-1/unit-7/7.1": [0],
  "math/algebra-1/unit-7/7.2": [0],
  "math/algebra-1/unit-8/8.4": [0, 2],

  // ─── Geometry ──────────────────────────────────────────
  "math/geometry/unit-1/1.2": [0, 2],
  "math/geometry/unit-1/1.5": [0, 2],
  "math/geometry/unit-3/3.6": [0, 2],
  "math/geometry/unit-4/4.1": [0, 2],
  "math/geometry/unit-4/4.2": [0, 2],
  "math/geometry/unit-4/4.3": [0],
  "math/geometry/unit-4/4.4": [0, 2],
  "math/geometry/unit-4/4.6": [0],
  "math/geometry/unit-9/9.6": [0, 2],
  "math/geometry/unit-10/10.9": [1],

  // The orderings. A duel is settled on whose answer was closer, and an
  // ordering has a real distance — pairs the wrong way round — so two players
  // sequencing the same proof is a game that can actually be won.
  "math/geometry/unit-1/1.6": [2],
  "math/geometry/unit-2/2.4": [1],
  "math/geometry/unit-2/2.5": [1],
  "math/geometry/unit-2/2.6": [2],
  "math/geometry/unit-2/2.7": [2],
  "math/geometry/unit-2/2.8": [2],
  "math/geometry/unit-3/3.7": [2],
  "math/geometry/unit-5/5.8": [2],
  "math/geometry/unit-5/5.9": [2],
  "math/geometry/unit-6/6.7": [1],
  "math/geometry/unit-6/6.8": [2],
  "math/geometry/unit-9/9.3": [2],
  "math/geometry/unit-9/9.7": [1],

  // ─── Algebra 2 ─────────────────────────────────────────
  "math/algebra-2/unit-1/1.2": [0],
  "math/algebra-2/unit-2/2.1": [0],
  "math/algebra-2/unit-4/4.6": [0],
  "math/algebra-2/unit-9/9.2": [0],
  "math/algebra-2/unit-9/9.3": [0],
  "math/algebra-2/unit-10/10.2": [0],

  // ─── Precalculus ───────────────────────────────────────
  "math/precalculus/unit-2/2.6": [0],
  "math/precalculus/unit-2/2.7": [0],
  "math/precalculus/unit-2/2.8": [0],
  "math/precalculus/unit-4/4.15": [0],
  "math/precalculus/unit-5/5.6": [0],
  "math/precalculus/unit-5/5.10": [0],
  "math/precalculus/unit-6/6.1": [0],

  // ─── AP Calculus AB ────────────────────────────────────
  "math/ap-calculus-ab/unit-1/1.9": [0],
  "math/ap-calculus-ab/unit-1/1.13": [0],
  "math/ap-calculus-ab/unit-1/1.14": [0],
  "math/ap-calculus-ab/unit-2/2.3": [0],
  "math/ap-calculus-ab/unit-5/5.1": [0],
  "math/ap-calculus-ab/unit-5/5.3": [0],
  "math/ap-calculus-ab/unit-5/5.6": [0],
  "math/ap-calculus-ab/unit-5/5.8": [0],
  "math/ap-calculus-ab/unit-5/5.9": [0],
  "math/ap-calculus-ab/unit-5/5.12": [0],
  "math/ap-calculus-ab/unit-6/6.5": [0],
  "math/ap-calculus-ab/unit-7/7.3": [0],
  "math/ap-calculus-ab/unit-7/7.4": [0],
  "math/algebra-1/unit-1/1.1": [2],
  "math/algebra-1/unit-1/1.3": [2, 3],
  "math/algebra-1/unit-1/1.5": [2],
  "math/algebra-1/unit-1/1.8": [2],
  "math/algebra-1/unit-2/2.2": [2],
  "math/algebra-1/unit-2/2.3": [2],
  "math/algebra-1/unit-2/2.4": [2],
  "math/algebra-1/unit-2/2.6": [1],
  "math/algebra-1/unit-2/2.7": [2],
  "math/algebra-1/unit-2/2.8": [2],
  "math/algebra-1/unit-2/2.9": [2],
  "math/algebra-1/unit-3/3.3": [2],
  "math/algebra-1/unit-3/3.4": [2],
  "math/algebra-1/unit-3/3.6": [2],
  "math/algebra-1/unit-3/3.7": [1],
  "math/algebra-1/unit-3/3.8": [1, 2],
  "math/algebra-1/unit-4/4.1": [2],
  "math/algebra-1/unit-4/4.2": [2],
  "math/algebra-1/unit-4/4.5": [2],
  "math/algebra-1/unit-4/4.6": [1],
  "math/algebra-1/unit-4/4.8": [1],
  "math/algebra-1/unit-4/4.9": [2],
  "math/algebra-1/unit-5/5.3": [2],
  "math/algebra-1/unit-5/5.4": [2],
  "math/algebra-1/unit-5/5.5": [2],
  "math/algebra-1/unit-5/5.6": [1],
  "math/algebra-1/unit-5/5.7": [1],
  "math/algebra-1/unit-5/5.8": [1, 2],
  "math/algebra-1/unit-6/6.5": [2],
  "math/algebra-1/unit-6/6.8": [2],
  "math/algebra-1/unit-6/6.10": [2],
  "math/algebra-1/unit-7/7.3": [2],
  "math/algebra-1/unit-7/7.4": [2],
  "math/algebra-1/unit-7/7.5": [2],
  "math/algebra-1/unit-7/7.7": [2],
  "math/algebra-1/unit-7/7.8": [2],
  "math/algebra-1/unit-7/7.11": [1],
  "math/algebra-1/unit-8/8.1": [2],
  "math/algebra-1/unit-8/8.2": [2],
  "math/algebra-1/unit-8/8.6": [2],
  "math/algebra-1/unit-8/8.7": [2],
  "math/algebra-1/unit-9/9.4": [2],
  "math/algebra-1/unit-9/9.8": [2],
  "math/algebra-1/unit-10/10.2": [2],
  "math/algebra-1/unit-10/10.4": [1],
  "math/algebra-1/unit-10/10.5": [2],
  "math/algebra-1/unit-10/10.7": [1],
  "math/algebra-1/unit-2/2.1": [4],
  "math/algebra-1/unit-1/1.6": [5],
  "math/algebra-1/unit-6/6.3": [3],
  "math/algebra-1/unit-6/6.4": [3],
  "math/geometry/unit-1/1.1": [2],
  "math/geometry/unit-1/1.3": [2, 3],
  "math/geometry/unit-1/1.4": [2],
  "math/geometry/unit-2/2.1": [2],
  "math/geometry/unit-2/2.2": [2],
  "math/geometry/unit-2/2.3": [2],
  "math/geometry/unit-3/3.1": [2, 3],
  "math/geometry/unit-3/3.2": [2],
  "math/geometry/unit-3/3.3": [2],
  "math/geometry/unit-3/3.4": [2],
  "math/geometry/unit-3/3.5": [2],
  "math/geometry/unit-4/4.5": [2],
  "math/geometry/unit-4/4.7": [2],
  "math/geometry/unit-4/4.8": [2],
  "math/geometry/unit-5/5.1": [2],
  "math/geometry/unit-5/5.2": [2],
  "math/geometry/unit-5/5.3": [2],
  "math/geometry/unit-5/5.4": [2],
  "math/geometry/unit-5/5.5": [2],
  "math/geometry/unit-5/5.6": [2],
  "math/geometry/unit-5/5.7": [2, 3],
  "math/geometry/unit-6/6.1": [2],
  "math/geometry/unit-6/6.2": [2],
  "math/geometry/unit-6/6.3": [2],
  "math/geometry/unit-6/6.4": [2],
  "math/geometry/unit-6/6.5": [2],
  "math/geometry/unit-7/7.1": [2],
  "math/geometry/unit-7/7.2": [2],
  "math/geometry/unit-7/7.3": [2],
  "math/geometry/unit-7/7.4": [2, 3],
  "math/geometry/unit-7/7.5": [2, 3],
  "math/geometry/unit-7/7.6": [2],
  "math/geometry/unit-7/7.7": [2, 3],
  "math/geometry/unit-8/8.1": [2],
  "math/geometry/unit-8/8.3": [2],
  "math/geometry/unit-8/8.4": [2, 3],
  "math/geometry/unit-8/8.5": [2, 3],
  "math/geometry/unit-8/8.6": [2],
  "math/geometry/unit-8/8.7": [2],
  "math/geometry/unit-8/8.8": [2],
  "math/geometry/unit-8/8.9": [2],
  "math/geometry/unit-8/8.10": [2],
  "math/geometry/unit-9/9.1": [2],
  "math/geometry/unit-9/9.2": [2],
  "math/geometry/unit-9/9.5": [2],
  "math/geometry/unit-10/10.1": [2],
  "math/geometry/unit-10/10.2": [2],
  "math/geometry/unit-10/10.3": [2],
  "math/geometry/unit-10/10.4": [2],
  "math/geometry/unit-10/10.5": [2],
  "math/geometry/unit-10/10.6": [2],
  "math/geometry/unit-10/10.7": [2, 3],
  "math/geometry/unit-10/10.8": [2],
  "math/geometry/unit-11/11.1": [2],
  "math/geometry/unit-11/11.2": [2],
  "math/geometry/unit-11/11.3": [2],
  "math/geometry/unit-11/11.4": [2],
  "math/geometry/unit-11/11.5": [2, 3],
  "math/geometry/unit-11/11.7": [2, 3],
  "math/geometry/unit-11/11.8": [2],
  "math/geometry/unit-11/11.9": [2],
  "math/geometry/unit-11/11.10": [2],
  "math/geometry/unit-11/11.11": [2, 3],
  "math/geometry/unit-11/11.12": [2, 3],
  "math/geometry/unit-12/12.1": [2],
  "math/geometry/unit-12/12.2": [2],
  "math/geometry/unit-12/12.3": [2],
  "math/geometry/unit-12/12.4": [2, 3],
  "math/geometry/unit-12/12.6": [2],
  "math/geometry/unit-6/6.6": [3],
  "math/geometry/unit-10/10.10": [3],
  "math/geometry/unit-12/12.5": [3],
};

export const SPATIAL: Record<string, number[]> = {
  ...SPATIAL_OWN,
  ...sharedWithAb(SPATIAL_OWN),
};

/** Which of a subunit's generators ask for a placed answer. Usually none. */
export function spatialGenerators(subunitId: string): number[] {
  return SPATIAL[subunitId] ?? [];
}

/**
 * Whether a subunit can host a duel.
 *
 * A duel is decided by which answer was closer, so it needs questions where
 * closeness exists. On a typed or chosen answer two right answers are equally
 * right, every round between two good players is a dead heat, and the game
 * has nothing to say. A point, a slider, a line and an ordering all have a
 * real distance; the other two kinds do not.
 */
export function hasSpatial(subunitId: string): boolean {
  return spatialGenerators(subunitId).length > 0;
}

/**
 * Instance ids look like `<subunitId>/gen/<generator>/<seed>`, which keeps them
 * distinguishable from bank ids (`<subunitId>/q<n>`) and self-describing: the
 * grader can rebuild the exact question from the id alone, so a generated
 * question needs no more server state than a bank one.
 */
export function instanceId(
  subunitId: string,
  generator: number,
  seed: number,
): string {
  return `${subunitId}/gen/${generator}/${seed.toString(36)}`;
}

export type InstanceRef = {
  subunitId: string;
  generator: number;
  seed: number;
};

/** Reads an instance id back apart. Null if it is not one, or is malformed. */
export function parseInstanceId(id: string): InstanceRef | null {
  const parts = id.split("/");
  if (parts.length < 4) return null;

  const [seedText, generatorText, marker] = [
    parts[parts.length - 1],
    parts[parts.length - 2],
    parts[parts.length - 3],
  ];
  if (marker !== "gen") return null;

  const generator = Number(generatorText);
  const seed = Number.parseInt(seedText, 36);
  if (!Number.isInteger(generator) || !Number.isInteger(seed)) return null;

  const subunitId = parts.slice(0, -3).join("/");
  if (generator < 0 || generator >= generatorCount(subunitId)) return null;

  return { subunitId, generator, seed };
}

export function isInstanceId(id: string): boolean {
  return parseInstanceId(id) !== null;
}
