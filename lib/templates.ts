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
 * Coverage is deliberately partial. A subunit earns a generator when its
 * questions are genuinely parameterised — when rolling new numbers makes a new
 * question rather than the same question wearing a hat. Proof, construction,
 * and interpretation subunits are absent on purpose; they need written
 * questions, and pretending otherwise would produce four-option trivia about
 * topics that deserve better.
 */
const OWN: Record<string, string[]> = {
  // ─── Algebra 1 ─────────────────────────────────────────
  "math/algebra-1/unit-1/1.1": ["Classifying real numbers"],
  "math/algebra-1/unit-1/1.6": [
    "Product rule",
    "Quotient rule",
    "Power of a power",
    "Negative exponents",
  ],
  "math/algebra-1/unit-1/1.7": ["Scientific notation"],
  "math/algebra-1/unit-2/2.1": [
    "One-step equations",
    "Two-step equations",
    "Negative coefficients",
  ],
  "math/algebra-1/unit-2/2.4": ["Rearranging for a value"],
  "math/algebra-1/unit-2/2.2": [
    "Variables on both sides",
    "Distributing before solving",
  ],
  "math/algebra-1/unit-2/2.8": ["Absolute value equations"],
  "math/algebra-1/unit-3/3.1": ["Plotting a point", "Reflecting a point"],
  "math/algebra-1/unit-3/3.3": ["Evaluating a function"],
  "math/algebra-1/unit-4/4.1": [
    "Slope from two points",
    "Reading the sign of a slope",
  ],
  "math/algebra-1/unit-4/4.2": [
    "Slope and intercept from an equation",
    "Evaluating a linear function",
  ],
  "math/algebra-1/unit-4/4.3": ["Graphing from an equation", "Graphing from two points"],
  "math/algebra-1/unit-4/4.6": ["Parallel and perpendicular slopes"],
  "math/algebra-1/unit-5/5.3": ["Systems by elimination"],
  "math/algebra-1/unit-6/6.3": ["Multiplying binomials"],
  "math/algebra-1/unit-6/6.4": [
    "Difference of squares",
    "Perfect square trinomials",
  ],
  "math/algebra-1/unit-6/6.6": ["Factoring trinomials"],
  "math/algebra-1/unit-7/7.8": ["Solving with the quadratic formula"],
  "math/algebra-1/unit-7/7.9": [
    "Computing the discriminant",
    "The nature of the roots",
  ],
  "math/algebra-1/unit-8/8.1": ["Finding the nth term"],
  "math/algebra-1/unit-9/9.1": ["Simplifying radicals"],
  "math/algebra-1/unit-10/10.1": ["Mean and median"],

  "math/algebra-1/unit-1/1.2": ["Naming the property"],
  "math/algebra-1/unit-1/1.3": ["Order of operations", "Brackets and powers"],
  "math/algebra-1/unit-1/1.4": ["Combining like terms"],
  "math/algebra-1/unit-1/1.5": ["Translating a phrase"],
  "math/algebra-1/unit-1/1.8": ["Simplifying a square root"],
  "math/algebra-1/unit-2/2.3": ["Clearing a fraction"],
  "math/algebra-1/unit-2/2.5": ["How many solutions"],
  "math/algebra-1/unit-2/2.6": ["Inequalities and the sign flip"],
  "math/algebra-1/unit-2/2.7": ["Compound inequalities"],
  "math/algebra-1/unit-2/2.9": ["Absolute value inequalities"],
  "math/algebra-1/unit-3/3.2": ["Recognising a function"],
  "math/algebra-1/unit-3/3.4": ["Discrete and continuous domains"],
  "math/algebra-1/unit-3/3.5": ["Finding an intercept"],
  "math/algebra-1/unit-3/3.6": ["Evaluating a piecewise function"],
  "math/algebra-1/unit-3/3.7": ["Evaluating an absolute value function"],
  "math/algebra-1/unit-3/3.8": ["Describing a transformation"],
  "math/algebra-1/unit-4/4.4": ["Intercepts from standard form"],
  "math/algebra-1/unit-4/4.5": ["Converting to standard form"],
  "math/algebra-1/unit-4/4.7": ["A line through two points"],
  "math/algebra-1/unit-4/4.8": ["Inequalities in two variables"],
  "math/algebra-1/unit-4/4.9": ["An arithmetic sequence as a rule"],
  "math/algebra-1/unit-5/5.1": ["Solving a system by graphing"],
  "math/algebra-1/unit-5/5.2": ["Systems by substitution"],
  "math/algebra-1/unit-5/5.4": ["Choosing a method"],
  "math/algebra-1/unit-5/5.5": ["Systems with no solution"],
  "math/algebra-1/unit-5/5.6": ["Break-even"],
  "math/algebra-1/unit-5/5.7": ["Systems of inequalities"],
  "math/algebra-1/unit-5/5.8": ["Maximising over a region"],

  "math/algebra-1/unit-6/6.1": ["Classifying a polynomial"],
  "math/algebra-1/unit-6/6.2": ["Adding and subtracting polynomials"],
  "math/algebra-1/unit-6/6.5": ["The greatest common factor"],
  "math/algebra-1/unit-6/6.7": ["Trinomials with a leading coefficient"],
  "math/algebra-1/unit-6/6.8": ["Factoring by grouping"],
  "math/algebra-1/unit-6/6.9": ["Sums and differences of cubes"],
  "math/algebra-1/unit-6/6.10": ["Factoring completely"],
  "math/algebra-1/unit-7/7.1": ["The axis of symmetry"],
  "math/algebra-1/unit-7/7.2": ["Placing a vertex"],
  "math/algebra-1/unit-7/7.3": ["Roots from factored form"],
  "math/algebra-1/unit-7/7.4": ["Reading a root off a graph"],
  "math/algebra-1/unit-7/7.5": ["The Zero Product Property"],
  "math/algebra-1/unit-7/7.6": ["Solving by square roots"],
  "math/algebra-1/unit-7/7.7": ["Completing the square"],
  "math/algebra-1/unit-7/7.10": ["Complex solutions"],
  "math/algebra-1/unit-7/7.11": ["Projectile motion"],
  "math/algebra-1/unit-8/8.2": ["Exponential growth"],
  "math/algebra-1/unit-8/8.3": ["Exponential decay"],
  "math/algebra-1/unit-8/8.4": ["The horizontal asymptote"],
  "math/algebra-1/unit-8/8.5": ["Comparing rates of growth"],
  "math/algebra-1/unit-8/8.6": ["Recursive and explicit rules"],
  "math/algebra-1/unit-8/8.7": ["Compound interest"],
  "math/algebra-1/unit-9/9.2": ["Adding radicals"],
  "math/algebra-1/unit-9/9.3": ["Radical equations"],
  "math/algebra-1/unit-9/9.4": ["Simplifying a rational expression"],
  "math/algebra-1/unit-9/9.5": ["Multiplying rational expressions"],
  "math/algebra-1/unit-9/9.6": ["Adding rational expressions"],
  "math/algebra-1/unit-9/9.7": ["Rational equations"],
  "math/algebra-1/unit-9/9.8": ["Direct and inverse variation"],
  "math/algebra-1/unit-10/10.2": ["The interquartile range"],
  "math/algebra-1/unit-10/10.3": ["The shape of a distribution"],
  "math/algebra-1/unit-10/10.4": ["Reading a correlation coefficient"],
  "math/algebra-1/unit-10/10.5": ["Residuals"],
  "math/algebra-1/unit-10/10.6": ["Two-way tables"],
  "math/algebra-1/unit-10/10.7": ["Correlation and causation"],

  // ─── Geometry ──────────────────────────────────────────
  "math/geometry/unit-1/1.2": ["Setting an angle"],
  "math/geometry/unit-1/1.3": ["Segment addition"],
  "math/geometry/unit-1/1.4": ["Complements and supplements"],
  "math/geometry/unit-1/1.5": ["Midpoint", "Distance"],
  "math/geometry/unit-5/5.1": ["The triangle angle sum"],
  "math/geometry/unit-5/5.2": ["The exterior angle theorem"],
  "math/geometry/unit-6/6.5": ["The midsegment theorem"],
  "math/geometry/unit-6/6.6": ["The triangle inequality"],
  "math/geometry/unit-7/7.2": ["Scale factor"],
  "math/geometry/unit-7/7.7": ["Area ratios of similar figures"],
  "math/geometry/unit-8/8.1": ["The Pythagorean theorem"],
  "math/geometry/unit-8/8.2": ["Finding the hypotenuse"],
  "math/geometry/unit-8/8.3": ["Special right triangles"],
  "math/geometry/unit-8/8.4": ["Trigonometric ratios"],
  "math/geometry/unit-9/9.1": ["Polygon angle sums"],
  "math/geometry/unit-10/10.3": ["Central and inscribed angles"],
  "math/geometry/unit-10/10.9": ["The equation of a circle"],
  "math/geometry/unit-10/10.10": ["Area of a sector"],
  "math/geometry/unit-11/11.7": ["Volume of prisms and cylinders"],
  "math/geometry/unit-11/11.8": ["Volume of cones"],
  "math/geometry/unit-11/11.9": ["Spheres"],
  "math/geometry/unit-11/11.11": ["Scaling solids"],
  "math/geometry/unit-12/12.2": ["Permutations and combinations"],
  "math/geometry/unit-12/12.5": ["Independent and dependent events"],

  "math/geometry/unit-1/1.1": ["Counting lines through points"],
  "math/geometry/unit-1/1.7": ["Area and perimeter", "Circumference"],
  "math/geometry/unit-2/2.1": ["Continuing a pattern"],
  "math/geometry/unit-2/2.2": ["Converse, inverse, contrapositive"],
  "math/geometry/unit-2/2.3": ["Biconditionals"],
  "math/geometry/unit-2/2.4": ["The laws of logic"],
  "math/geometry/unit-2/2.5": ["Properties of equality"],
  "math/geometry/unit-3/3.1": ["Angle pairs on a transversal"],
  "math/geometry/unit-3/3.2": ["Angles from parallel lines"],
  "math/geometry/unit-3/3.3": ["Proving lines parallel"],
  "math/geometry/unit-3/3.4": ["Distance to a line"],
  "math/geometry/unit-3/3.5": ["Parallel and perpendicular slopes"],
  "math/geometry/unit-3/3.6": ["Equations of parallel lines"],
  "math/geometry/unit-4/4.1": ["Translating a point"],
  "math/geometry/unit-4/4.2": ["Reflecting a point"],
  "math/geometry/unit-4/4.3": ["Rotating a point"],
  "math/geometry/unit-4/4.4": ["A composition of two transformations"],
  "math/geometry/unit-4/4.5": ["Lines of symmetry"],
  "math/geometry/unit-4/4.6": ["Dilating a point"],
  "math/geometry/unit-4/4.7": ["Rigid motions"],
  "math/geometry/unit-4/4.8": ["Similarity transformations"],
  "math/geometry/unit-5/5.3": ["Corresponding parts"],
  "math/geometry/unit-5/5.4": ["SSS and SAS"],
  "math/geometry/unit-5/5.5": ["ASA and AAS"],
  "math/geometry/unit-5/5.6": ["Right triangle congruence"],
  "math/geometry/unit-5/5.7": ["Isosceles triangles"],
  "math/geometry/unit-6/6.1": ["Bisectors"],
  "math/geometry/unit-6/6.2": ["Centres of a triangle"],
  "math/geometry/unit-6/6.3": ["The centroid"],
  "math/geometry/unit-6/6.4": ["Altitudes"],
  "math/geometry/unit-6/6.7": ["Sides and angles in order"],
  "math/geometry/unit-7/7.1": ["Solving a proportion"],
  "math/geometry/unit-7/7.3": ["Similarity criteria"],
  "math/geometry/unit-7/7.4": ["Triangle proportionality"],
  "math/geometry/unit-7/7.5": ["Proportional segments"],
  "math/geometry/unit-7/7.6": ["The geometric mean"],
  "math/geometry/unit-8/8.5": ["Solving a right triangle"],
  "math/geometry/unit-8/8.6": ["Inverse trigonometric ratios"],
  "math/geometry/unit-8/8.7": ["Angles of elevation"],
  "math/geometry/unit-8/8.8": ["The Law of Sines"],
  "math/geometry/unit-8/8.9": ["The Law of Cosines"],
  "math/geometry/unit-8/8.10": ["Area from two sides and an angle"],
  "math/geometry/unit-9/9.2": ["Angles in a parallelogram"],
  "math/geometry/unit-9/9.4": ["Naming a special parallelogram"],
  "math/geometry/unit-9/9.5": ["The midsegment of a trapezoid"],
  "math/geometry/unit-9/9.7": ["The quadrilateral hierarchy"],
  "math/geometry/unit-10/10.1": ["Radius and diameter"],
  "math/geometry/unit-10/10.2": ["Tangents and radii"],
  "math/geometry/unit-10/10.4": ["Arc length"],
  "math/geometry/unit-10/10.5": ["Intersecting chords"],
  "math/geometry/unit-10/10.6": ["Inscribed angles"],
  "math/geometry/unit-10/10.7": ["Angles from two secants"],
  "math/geometry/unit-10/10.8": ["Secant segments"],
  "math/geometry/unit-11/11.1": ["Area of a triangle"],
  "math/geometry/unit-11/11.2": ["Area of a regular polygon"],
  "math/geometry/unit-11/11.3": ["Composite areas"],
  "math/geometry/unit-11/11.4": ["Cross sections"],
  "math/geometry/unit-11/11.5": ["Surface area of a box"],
  "math/geometry/unit-11/11.6": ["Surface area of a cone"],
  "math/geometry/unit-11/11.10": ["Cavalieri's principle"],
  "math/geometry/unit-11/11.12": ["Density"],
  "math/geometry/unit-12/12.1": ["The counting principle"],
  "math/geometry/unit-12/12.3": ["Experimental probability"],
  "math/geometry/unit-12/12.4": ["Geometric probability"],
  "math/geometry/unit-12/12.6": ["Conditional probability"],
  "math/geometry/unit-12/12.7": ["Two-way tables and Venn diagrams"],

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
 * The generators that ask for their answer on a grid or a scale — a point, a
 * slider, a drawn line — rather than for one typed or chosen from four.
 * Subunit id → positions in that subunit's list above.
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
  // ─── Algebra 1 ─────────────────────────────────────────
  "math/algebra-1/unit-3/3.1": [0, 1],
  "math/algebra-1/unit-3/3.5": [0],
  "math/algebra-1/unit-4/4.3": [0, 1],
  "math/algebra-1/unit-4/4.4": [0],
  "math/algebra-1/unit-4/4.7": [0],
  "math/algebra-1/unit-5/5.1": [0],
  "math/algebra-1/unit-5/5.2": [0],
  "math/algebra-1/unit-7/7.1": [0],
  "math/algebra-1/unit-7/7.2": [0],
  "math/algebra-1/unit-8/8.4": [0],

  // ─── Geometry ──────────────────────────────────────────
  "math/geometry/unit-1/1.2": [0],
  "math/geometry/unit-1/1.5": [0],
  "math/geometry/unit-3/3.6": [0],
  "math/geometry/unit-4/4.1": [0],
  "math/geometry/unit-4/4.2": [0],
  "math/geometry/unit-4/4.3": [0],
  "math/geometry/unit-4/4.4": [0],
  "math/geometry/unit-4/4.6": [0],

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
 * has nothing to say.
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
