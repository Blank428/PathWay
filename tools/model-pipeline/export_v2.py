"""Export the v2 print assembly as a web model.

Reads the same assembly the print plates come from (source/ufe_v2_assembly.npz), so the
web model and the printed model always match part for part.

Output: tools/model-pipeline/out/ufe-v2-raw.glb  (then compress with gltfpack)
        src/content/procedures/ufe-model.json    (frame info + catheter path)
Frame: "model units" (1 = 60 mm), y up toward the fundus, z toward the viewer, uterus centred at the origin.
The printed display pose (lying on the base) is the same model rotated -90 degrees about x.
"""
import pickle, json, os
import numpy as np, trimesh, fast_simplification as fs

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SRC = f'{HERE}/source'          # assembly exported from the print build (v2/assembled.pkl)

_z = np.load(f'{SRC}/ufe_v2_assembly.npz')
P = {k[:-3]: (_z[k], _z[k[:-3] + '__f']) for k in _z.files if k.endswith('__v')}

# triangle budgets per part (print files run ~1.5 M triangles; web target ~450 k, still under 3 MB compressed)
BUDGET = {
    'Uterus': 170000, 'ArteryTree': 80000, 'UterineArteries': 20000, 'OvarianArteries': 8000,
    'Base': 40000, 'Tube_left': 16000, 'Tube_right': 16000, 'Ovary_left': 9000, 'Ovary_right': 9000,
}
DEFAULT = 10000  # fibroids and after-set

# web names: lower-case, stable ids the chapter data refers to
NAME = {
    'Uterus': 'uterus', 'ArteryTree': 'artery_tree', 'UterineArteries': 'uterine_arteries',
    'Riser_left': 'uterine_artery_post_left', 'Riser_right': 'uterine_artery_post_right',
    'OvarianArteries': 'ovarian_arteries', 'AccessPort': 'access_port',
    'Tube_left': 'tube_left', 'Tube_right': 'tube_right', 'Ovary_left': 'ovary_left', 'Ovary_right': 'ovary_right',
    'Fibroid_submucosal': 'fibroid_submucosal', 'Fibroid_intramural': 'fibroid_intramural',
    'Fibroid_subserosal': 'fibroid_subserosal', 'Fibroid_pedunculated': 'fibroid_pedunculated',
    'After_submucosal': 'after_submucosal', 'After_intramural': 'after_intramural',
    'After_subserosal': 'after_subserosal', 'After_pedunculated': 'after_pedunculated',
    'Disc_A': 'disc_a', 'Disc_B': 'disc_b', 'Disc_C': 'disc_c', 'Base': 'base',
}

def decimate(m, n):
    if len(m.faces) <= n:
        return m
    v, f = fs.simplify(m.vertices.astype(np.float32), m.faces.astype(np.int32), target_count=n)
    return trimesh.Trimesh(v, f, process=True)

body = trimesh.Trimesh(*P['Uterus'], process=False)
centre = body.bounds.mean(0)
S = 1 / 60.0                                   # 60 mm -> 1 unit
R = np.eye(4)   # print frame already reads as anatomy: x = patient's left/right, y = up toward the fundus, z = out of the cut face toward the viewer

scene = trimesh.Scene()
info = {}
for k, (v, f) in P.items():
    m = trimesh.Trimesh(v, f, process=True)
    m = decimate(m, BUDGET.get(k, DEFAULT))
    m.apply_translation(-centre); m.apply_scale(S); m.apply_transform(R)
    # split normals at sharp edges (cut faces, disc rims) so shading stays crisp
    m = trimesh.graph.smooth_shade(m, angle=np.radians(12 if k == 'Base' else 35))
    scene.add_geometry(m, node_name=NAME[k], geom_name=NAME[k])
    c = m.bounds.mean(0)
    # label anchor: the surface point nearest the part's centre, pushed toward the viewer side
    probe = c + np.array([0, 0, m.extents[2] * 0.5])
    anchor = m.vertices[np.argmin(np.linalg.norm(m.vertices - probe, axis=1))]
    info[NAME[k]] = {'tris': int(len(m.faces)), 'centre': c.round(4).tolist(), 'size': m.extents.round(4).tolist(), 'anchor': np.asarray(anchor).round(4).tolist()}

os.makedirs(f'{HERE}/out', exist_ok=True)
glb = trimesh.exchange.gltf.export_glb(scene, include_normals=True)
open(f'{HERE}/out/ufe-v2-raw.glb', 'wb').write(glb)

# catheter route along the tree's open groove, plus a lead-in outside the groin port
tip = json.load(open(f'{SRC}/lumen_meta.json'))['tip_index']
path = np.load(f'{SRC}/lumen_center.npy')[:tip - 4]
t0 = path[0] - path[4]; t0 /= np.linalg.norm(t0)
path = np.vstack([path[0] + t0 * 60, path[0] + t0 * 30, path[::3]])
path = ((path - centre) * S) @ R[:3, :3].T

meta = {'units': '1 unit = 60 mm', 'up': 'y', 'printedPose': 'rotate -90 deg about x', 'parts': info, 'catheterPath': path.round(4).tolist()}
json.dump(meta, open(f'{ROOT}/src/content/procedures/ufe-model.json', 'w'), indent=1)
print(round(len(glb) / 1e6, 2), 'MB raw,', sum(p['tris'] for p in info.values()), 'triangles')
