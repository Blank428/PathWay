// What the 3D model does in each UFE chapter.
// Positions are in model units (1 unit = 60 mm), y up toward the fundus, z toward the viewer.
// Part names match the printed parts (see ufe-model.json).

export type Vec3 = [number, number, number];

export const GROUPS: Record<string, string[]> = {
  uterus: ['uterus'],
  fibroids: ['fibroid_submucosal', 'fibroid_intramural', 'fibroid_subserosal', 'fibroid_pedunculated'],
  after: ['after_submucosal', 'after_intramural', 'after_subserosal', 'after_pedunculated'],
  uterineArteries: ['uterine_arteries', 'uterine_artery_post_left', 'uterine_artery_post_right'],
  tree: ['artery_tree', 'access_port'],
  ovarianArteries: ['ovarian_arteries'],
  adnexa: ['tube_left', 'tube_right', 'ovary_left', 'ovary_right'],
  discs: ['disc_a', 'disc_b', 'disc_c'],
  base: ['base'],
};

export const ARTERIES = [...GROUPS.uterineArteries, ...GROUPS.tree, ...GROUPS.ovarianArteries];

// Where each part slides to when the model is taken apart (added to its position at explode = 1).
export const EXPLODE: Record<string, Vec3> = {
  uterus: [0, 0, 0],
  fibroid_submucosal: [0.25, -0.1, 1.0],
  fibroid_intramural: [-0.5, -0.15, 0.95],
  fibroid_subserosal: [0.75, 0.05, 0.85],
  fibroid_pedunculated: [0.3, 0.55, 0.8],
  after_submucosal: [0.25, -0.1, 1.0],
  after_intramural: [-0.5, -0.15, 0.95],
  after_subserosal: [0.75, 0.05, 0.85],
  after_pedunculated: [0.3, 0.55, 0.8],
  disc_a: [-0.5, -0.15, 1.25],
  disc_b: [0.25, -0.1, 1.3],
  disc_c: [1.2, 0, 0.5],
  tube_left: [-0.55, 0.1, 0.25],
  tube_right: [0.55, 0.1, 0.25],
  ovary_left: [-0.95, 0, 0.35],
  ovary_right: [0.95, 0, 0.35],
  uterine_arteries: [0, 0.35, 0.75],
  uterine_artery_post_left: [-0.15, 0.1, 0.6],
  uterine_artery_post_right: [0.15, 0.1, 0.6],
  ovarian_arteries: [0, 0.45, 0.3],
  artery_tree: [0, 0, -0.9],
  access_port: [-0.2, -0.2, -0.6],
  base: [0, 0, -1.4],
};

export type Label = { id: string; text: string; at?: Vec3; part?: string[] };  // no `at`: pinned to the part's surface

export type View = {
  camera: Vec3;
  target: Vec3;
  show: string[];            // groups visible
  highlight?: string[];      // parts that glow
  ghost?: string[];          // parts drawn see-through
  explode?: number;          // default explode amount 0..1
  catheter?: [number, number]; // catheter drawn from..to along its route (0..1), animated to "to"
  particles?: boolean;
  after?: boolean;           // six-month fibroids instead of today's
  markers?: boolean;         // risk markers A to E
  labels?: Label[];
  hint?: string;             // one "try this" line
};

const FIBROID_LABELS: Label[] = [
  { id: 'submucosal', text: 'Into the cavity', at: [0.15, 0.34, 0.16], part: ['fibroid_submucosal', 'after_submucosal'] },
  { id: 'intramural', text: 'Inside the wall', at: [-0.48, 0.27, 0.18], part: ['fibroid_intramural', 'after_intramural'] },
  { id: 'subserosal', text: 'On the outside', at: [0.6, 0.57, 0.28], part: ['fibroid_subserosal', 'after_subserosal'] },
  { id: 'pedunculated', text: 'On a stalk', at: [0.24, 1.25, 0.46], part: ['fibroid_pedunculated', 'after_pedunculated'] },
];

export const VIEWS: Record<string, View> = {
  'where-fibroids-grow': {
    camera: [0.5, 0.45, 5.7], target: [0.05, 0.15, 0],
    show: ['uterus', 'fibroids', 'adnexa'],
    highlight: GROUPS.fibroids,
    labels: FIBROID_LABELS,
    hint: 'Drag the model to turn it. Tap a fibroid to find it in the list.',
  },
  'take-it-apart': {
    camera: [2.3, 1.2, 6.6], target: [0, 0.35, 0.1],
    show: ['uterus', 'fibroids', 'adnexa', 'uterineArteries', 'tree', 'ovarianArteries'],
    explode: 0.7,
    labels: [
      { id: 'l-uterus', text: 'Uterus', at: [-0.35, -0.75, 0.3], part: ['uterus'] },
      { id: 'l-fibroids', text: 'Fibroids', part: ['fibroid_intramural', ...GROUPS.fibroids] },
      { id: 'l-uterine', text: 'Uterine arteries', part: GROUPS.uterineArteries },
      { id: 'l-tree', text: 'Pelvic arteries', at: [-1.22, 0.1, -0.22], part: ['artery_tree'] },
      { id: 'l-ovary', text: 'Ovary', part: ['ovary_right', 'ovary_left'] },
      { id: 'l-tube', text: 'Fallopian tube', part: ['tube_left', 'tube_right'] },
    ],
    hint: 'Slide the model apart, or tap a part name to light it up.',
  },
  'blood-supply': {
    camera: [0.4, 0.9, 6.2], target: [0, 0.55, 0],
    show: ['uterus', 'fibroids', 'adnexa', 'uterineArteries', 'tree', 'ovarianArteries'],
    ghost: ['uterus', 'tube_left', 'tube_right', 'ovary_left', 'ovary_right', 'artery_tree', 'access_port', 'ovarian_arteries'],
    highlight: GROUPS.uterineArteries,
    labels: [
      { id: 's-uterine', text: 'Uterine arteries feed the fibroids', part: GROUPS.uterineArteries },
    ],
  },
  'getting-in': {
    camera: [-0.5, -0.3, 6.0], target: [-0.65, -0.35, -0.2],
    show: ['uterus', 'fibroids', 'adnexa', 'uterineArteries', 'tree', 'ovarianArteries'],
    highlight: ['access_port'],
    catheter: [0, 0.1],
    labels: [{ id: 'g-port', text: 'Entry point at the groin', at: [-1.42, -0.72, -0.25], part: ['access_port'] }],
  },
  'the-catheter': {
    camera: [0.3, 0.3, 7.0], target: [-0.25, 0.25, -0.1],
    show: ['uterus', 'fibroids', 'adnexa', 'uterineArteries', 'tree', 'ovarianArteries'],
    ghost: ['uterus'],
    catheter: [0, 1],
    labels: [{ id: 'c-cath', text: 'Catheter', at: [-1.28, -0.2, -0.25] }],
    hint: 'Watch the catheter follow the arteries up and over to the uterus.',
  },
  'blocking-the-supply': {
    camera: [1.1, 0.6, 3.9], target: [0.35, 0.3, 0],
    show: ['uterus', 'fibroids', 'adnexa', 'uterineArteries', 'tree', 'ovarianArteries'],
    ghost: ['uterus'],
    catheter: [1, 1],
    particles: true,
    labels: [{ id: 'b-part', text: 'Particles block the vessels', at: [0.62, 0.2, 0.2] }],
  },
  finishing: {
    camera: [-0.5, -0.3, 6.0], target: [-0.65, -0.35, -0.2],
    show: ['uterus', 'fibroids', 'adnexa', 'uterineArteries', 'tree', 'ovarianArteries'],
    highlight: ['access_port'],
    catheter: [1, 0],
    labels: [{ id: 'f-port', text: 'Pressure here until it seals', at: [-1.42, -0.72, -0.25], part: ['access_port'] }],
  },
  'six-months-later': {
    camera: [0.5, 0.45, 5.7], target: [0.05, 0.15, 0],
    show: ['uterus', 'fibroids', 'adnexa', 'uterineArteries'],
    highlight: GROUPS.after,
    after: true,
    hint: 'Switch between today and six months later.',
  },
  'where-risks-come-from': {
    camera: [0.2, 0.25, 6.6], target: [-0.25, 0.2, -0.1],
    show: ['uterus', 'fibroids', 'adnexa', 'uterineArteries', 'tree', 'ovarianArteries', 'discs'],
    highlight: GROUPS.discs,
    markers: true,
    hint: 'Tap a lettered marker to read about that risk.',
  },
};

// Render-only views for the home page and project page stills (?still&view=hero).
export const STILL_VIEWS: Record<string, View> = {
  home: {
    camera: [-2.55, 1.15, 7.6], target: [0.1, 0.22, -0.3],
    show: ['uterus', 'fibroids', 'adnexa', 'uterineArteries', 'tree', 'ovarianArteries', 'discs', 'base'],
  },
  hero: {
    camera: [-2.9, 1.5, 5.75], target: [0.05, 0.42, -0.3],
    show: ['uterus', 'fibroids', 'adnexa', 'uterineArteries', 'tree', 'ovarianArteries', 'discs', 'base'],
  },
  exploded: {
    camera: [-3.2, 1.75, 6.4], target: [0.1, 0.45, -0.15],
    show: ['uterus', 'fibroids', 'adnexa', 'uterineArteries', 'tree', 'ovarianArteries', 'discs', 'base'],
    explode: 0.6,
  },
  'exploded-wide': {
    camera: [-3.6, 1.6, 7.9], target: [0.15, 0.62, -0.15],
    show: ['uterus', 'fibroids', 'adnexa', 'uterineArteries', 'tree', 'ovarianArteries', 'discs', 'base'],
    explode: 0.6,
  },
  front: {
    camera: [0.0, 0.3, 7.2], target: [0.0, 0.35, -0.3],
    show: ['uterus', 'fibroids', 'adnexa', 'uterineArteries', 'tree', 'ovarianArteries', 'discs', 'base'],
  },
};

// Risk markers: A to C are the orange discs on the printed model; D and E are on-screen
// until discs for the entry point and the artery route are printed.
export const RISK_MARKERS: Record<string, { letter: string; at: Vec3; printed: boolean }> = {
  pes: { letter: 'A', at: [-0.4, 0.33, 0.24], printed: true },
  expulsion: { letter: 'B', at: [0.14, 0.34, 0.22], printed: true },
  ovarian: { letter: 'C', at: [0.84, 0.49, 0.25], printed: true },
  access: { letter: 'D', at: [-1.42, -0.72, -0.24], printed: false },
  vessel: { letter: 'E', at: [-1.2, 0.2, -0.2], printed: false },
};
