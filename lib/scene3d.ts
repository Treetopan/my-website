/**
 * A very small 3D renderer that draws to an ordinary 2D canvas.
 *
 * There is no WebGL and no scene graph here. A game space in this app is a
 * few dozen boxes standing on a plane, and the whole pipeline is: build
 * polygons in world space, move them into the camera's frame, clip whatever
 * crosses the near plane, sort back-to-front, fill.
 *
 * Sorting by average depth — the painter's algorithm — is exact only for
 * faces that neither intersect nor overlap in a cycle. Separated boxes on a
 * plane satisfy that, but a single large surface does not: one long road quad
 * averages out to one depth and paints over anything standing on its far
 * half. Big surfaces are therefore cut into segments, near to far.
 */

export type Vec3 = readonly [number, number, number];
export type RGB = readonly [number, number, number];

/** Everything is built Y-up: x across, y up, z into the screen. */
const UP: Vec3 = [0, 1, 0];

/** Faces are clipped against this rather than z = 0, which projects to infinity. */
const NEAR = 0.12;

export type Face = {
  points: readonly Vec3[];
  color: RGB;
  /** 1 is opaque. */
  alpha?: number;
  /** Fill flat instead of lighting it — for paint, shadows and other decals. */
  flat?: boolean;
  /**
   * Pulls a face this much nearer for sorting only. A marking lying on a
   * surface shares its depth exactly, so without a bias which of the two
   * lands on top comes down to sort stability rather than intent.
   */
  bias?: number;
};

export type Camera = {
  eye: Vec3;
  look: Vec3;
  /** Vertical field of view in radians. */
  fov?: number;
};

/* ── Vector maths ───────────────────────────────────────── */

export function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function scale(a: Vec3, k: number): Vec3 {
  return [a[0] * k, a[1] * k, a[2] * k];
}

export function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function unit(a: Vec3): Vec3 {
  const len = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / len, a[1] / len, a[2] / len];
}

/** Where the light comes from. One fixed sun, high and to the left. */
const SUN = unit([-0.42, 0.84, -0.34]);

/* ── Colour ─────────────────────────────────────────────── */

/** Parses `#rgb` and `#rrggbb`. Anything else comes back mid-grey. */
export function hexToRgb(value: string): RGB {
  const h = value.trim().replace("#", "");
  const full =
    h.length === 3
      ? h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
      : h.length === 6
        ? h
        : "808080";
  const n = Number.parseInt(full, 16);
  return Number.isNaN(n)
    ? [128, 128, 128]
    : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

export function css(color: RGB, lit = 1, alpha = 1): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * lit)));
  const rgb = `${c(color[0])} ${c(color[1])} ${c(color[2])}`;
  return alpha >= 1 ? `rgb(${rgb})` : `rgb(${rgb} / ${alpha})`;
}

/* ── Camera ─────────────────────────────────────────────── */

export type Basis = {
  eye: Vec3;
  right: Vec3;
  up: Vec3;
  fwd: Vec3;
  f: number;
  w: number;
  h: number;
};

export function basis(cam: Camera, w: number, h: number): Basis {
  const fwd = unit(sub(cam.look, cam.eye));
  // z runs into the screen, so this is a left-handed frame: `cross(fwd, UP)`
  // is the conventional right vector for a right-handed one and points the
  // wrong way here, which mirrors the whole scene. It costs nothing on a
  // symmetrical road and reverses the direction of play around a table.
  const right = unit(cross(UP, fwd));
  return {
    eye: cam.eye,
    right,
    up: cross(fwd, right),
    fwd,
    f: h / 2 / Math.tan((cam.fov ?? 0.95) / 2),
    w,
    h,
  };
}

/** World point → camera space. z is how far in front of the eye it sits. */
function toCamera(b: Basis, p: Vec3): Vec3 {
  const d = sub(p, b.eye);
  return [dot(d, b.right), dot(d, b.up), dot(d, b.fwd)];
}

function toScreen(b: Basis, c: Vec3): [number, number] {
  return [b.w / 2 + (c[0] * b.f) / c[2], b.h / 2 - (c[1] * b.f) / c[2]];
}

/**
 * World point → screen pixels, or null when it is behind the camera. Used to
 * hang a label off something in the scene once the scene has been drawn.
 */
export function project(b: Basis, p: Vec3): [number, number] | null {
  const c = toCamera(b, p);
  return c[2] < NEAR ? null : toScreen(b, c);
}

/** How far in front of the eye a world point sits. */
export function depthOf(b: Basis, p: Vec3): number {
  return dot(sub(p, b.eye), b.fwd);
}

/* ── Rendering ──────────────────────────────────────────── */

/** Sutherland–Hodgman against the near plane, in camera space. */
function clipNear(poly: Vec3[]): Vec3[] {
  const out: Vec3[] = [];

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const aIn = a[2] >= NEAR;
    const bIn = b[2] >= NEAR;

    if (aIn) out.push(a);
    if (aIn !== bIn) {
      const t = (NEAR - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, NEAR]);
    }
  }

  return out;
}

/** Newell's method — holds for any planar polygon, not just triangles. */
function normal(points: readonly Vec3[]): Vec3 {
  let x = 0;
  let y = 0;
  let z = 0;

  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    x += (a[1] - b[1]) * (a[2] + b[2]);
    y += (a[2] - b[2]) * (a[0] + b[0]);
    z += (a[0] - b[0]) * (a[1] + b[1]);
  }

  return unit([x, y, z]);
}

/**
 * Draws the faces and hands back the camera basis it used, so a caller that
 * wants to label something can project against the very same camera.
 */
export function render(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  faces: readonly Face[],
  w: number,
  h: number,
): Basis {
  const b = basis(cam, w, h);
  const drawn: { pts: [number, number][]; depth: number; fill: string }[] = [];

  for (const face of faces) {
    const inCamera = face.points.map((p) => toCamera(b, p));
    const clipped = inCamera.some((c) => c[2] < NEAR)
      ? clipNear(inCamera)
      : inCamera;
    if (clipped.length < 3) continue;

    let depth = 0;
    for (const c of clipped) depth += c[2];
    depth = depth / clipped.length - (face.bias ?? 0);

    let lit = 1;
    if (!face.flat) {
      let n = normal(face.points);
      // Turn the normal towards the eye first. Otherwise how a box is lit
      // depends on which way each of its faces happened to be wound.
      if (dot(n, sub(b.eye, face.points[0])) < 0) n = scale(n, -1);
      lit = 0.62 + 0.38 * Math.max(0, dot(n, SUN));
    }

    drawn.push({
      pts: clipped.map((c) => toScreen(b, c)),
      depth,
      fill: css(face.color, lit, face.alpha ?? 1),
    });
  }

  drawn.sort((a, z) => z.depth - a.depth);

  for (const d of drawn) {
    ctx.beginPath();
    ctx.moveTo(d.pts[0][0], d.pts[0][1]);
    for (let i = 1; i < d.pts.length; i++) ctx.lineTo(d.pts[i][0], d.pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = d.fill;
    ctx.fill();
    // Canvas antialiases every edge it fills, so two faces sharing an edge
    // leave a hairline of background showing between them. Stroking each face
    // in its own colour closes the seam.
    ctx.strokeStyle = d.fill;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  return b;
}

/* ── Shapes ─────────────────────────────────────────────── */

export function quad(
  a: Vec3,
  b: Vec3,
  c: Vec3,
  d: Vec3,
  color: RGB,
  extra: Omit<Face, "points" | "color"> = {},
): Face {
  return { points: [a, b, c, d], color, ...extra };
}

/** A box centred on `at`, optionally turned about its own vertical axis. */
export function boxAt(
  at: Vec3,
  size: Vec3,
  color: RGB,
  extra: Omit<Face, "points" | "color"> & { yaw?: number } = {},
): Face[] {
  const { yaw = 0, ...rest } = extra;
  const hx = size[0] / 2;
  const hy = size[1] / 2;
  const hz = size[2] / 2;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);

  const corner = (dx: number, dy: number, dz: number): Vec3 => [
    at[0] + dx * cos + dz * sin,
    at[1] + dy,
    at[2] - dx * sin + dz * cos,
  ];

  const p = [
    corner(-hx, -hy, -hz),
    corner(hx, -hy, -hz),
    corner(hx, -hy, hz),
    corner(-hx, -hy, hz),
    corner(-hx, hy, -hz),
    corner(hx, hy, -hz),
    corner(hx, hy, hz),
    corner(-hx, hy, hz),
  ];

  const face = (i: number, j: number, k: number, l: number) =>
    quad(p[i], p[j], p[k], p[l], color, rest);

  return [
    face(4, 5, 6, 7),
    face(0, 3, 2, 1),
    face(0, 1, 5, 4),
    face(2, 3, 7, 6),
    face(1, 2, 6, 5),
    face(3, 0, 4, 7),
  ];
}

/** A flat horizontal polygon — a disc, near enough, at 20 sides or more. */
export function disc(
  at: Vec3,
  radius: number,
  sides: number,
  color: RGB,
  extra: Omit<Face, "points" | "color"> = {},
): Face {
  const points: Vec3[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    points.push([
      at[0] + Math.cos(a) * radius,
      at[1],
      at[2] + Math.sin(a) * radius,
    ]);
  }
  return { points, color, ...extra };
}

/** A drum: a top disc and a skirt of quads. `at` is the centre of its base. */
export function column(
  at: Vec3,
  radius: number,
  height: number,
  sides: number,
  top: RGB,
  side: RGB,
): Face[] {
  const faces: Face[] = [
    disc([at[0], at[1] + height, at[2]], radius, sides, top),
  ];

  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const b = ((i + 1) / sides) * Math.PI * 2;
    const x1 = at[0] + Math.cos(a) * radius;
    const z1 = at[2] + Math.sin(a) * radius;
    const x2 = at[0] + Math.cos(b) * radius;
    const z2 = at[2] + Math.sin(b) * radius;
    faces.push(
      quad(
        [x1, at[1], z1],
        [x2, at[1], z2],
        [x2, at[1] + height, z2],
        [x1, at[1] + height, z1],
        side,
      ),
    );
  }

  return faces;
}
