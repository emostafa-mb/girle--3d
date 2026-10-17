"""GIRLÉ packshots. Run: blender -b --factory-startup -P scene.py -- <scratch_dir> <preview|final> [shot ...]"""
import bpy, bmesh, math, sys, os, json
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index('--') + 1:]
S, MODE = argv[0], argv[1]
ONLY = list(argv[2:])
FINAL = MODE == 'final'
CM = 0.01
OUT = os.path.join(S, 'renders' if FINAL else 'preview')
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
coll = scene.collection

# ---------------------------------------------------------------- helpers
def principled(name, **inputs):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    for k, v in inputs.items():
        bsdf.inputs[k].default_value = v
    return m

def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (*lin, 1.0)

def fillet(pts, steps=10):
    """pts: (r, z, radius) in cm. Rounds each corner with a quadratic bezier."""
    out = [(pts[0][0], pts[0][1])]
    for i in range(1, len(pts) - 1):
        a, p, b = Vector(pts[i - 1][:2]), Vector(pts[i][:2]), Vector(pts[i + 1][:2])
        rad = pts[i][2]
        if rad <= 0:
            out.append(tuple(p)); continue
        rad = min(rad, (a - p).length * 0.49, (b - p).length * 0.49)
        p1, p2 = p + (a - p).normalized() * rad, p + (b - p).normalized() * rad
        for s in range(steps + 1):
            t = s / steps
            q = (1 - t) ** 2 * p1 + 2 * (1 - t) * t * p + t * t * p2
            out.append((q.x, q.y))
    out.append((pts[-1][0], pts[-1][1]))
    return out

def offset_inward(line, t):
    res = []
    for i, (r, z) in enumerate(line):
        a = Vector(line[max(i - 1, 0)]); b = Vector(line[min(i + 1, len(line) - 1)])
        T = (b - a).normalized()
        n = Vector((-T.y, T.x))
        res.append((max(r + n.x * t, 0.0), z + n.y * t))
    res[0] = (0.0, res[0][1])
    return res

def clip_below(line, h):
    out = []
    for i, (r, z) in enumerate(line):
        if z <= h:
            out.append((r, z))
        else:
            pr, pz = line[i - 1]
            k = (h - pz) / (z - pz)
            out.append((pr + (r - pr) * k, h))
            break
    out.append((0.0, h))
    return out

def lathe(name, prof, mat, segs=128, loc=(0, 0, 0), smooth=True):
    bm = bmesh.new()
    vs = [bm.verts.new((r * CM, 0, z * CM)) for r, z in prof]
    es = [bm.edges.new((vs[i], vs[i + 1])) for i in range(len(vs) - 1)]
    bmesh.ops.spin(bm, geom=vs + es, cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * math.pi, steps=segs, use_merge=True)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = smooth
    ob = bpy.data.objects.new(name, me); ob.location = loc
    ob.data.materials.append(mat)
    coll.objects.link(ob)
    return ob

def shell(name, outer, t, mat, **kw):
    inner = offset_inward(outer, t)
    return lathe(name, outer + list(reversed(inner)), mat, **kw)

def band(name, radius, z0, z1, arc_deg, img_path, segs=96):
    """Partial cylinder facing -Y carrying a transparent print texture."""
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new()
    a0 = -math.pi / 2 - math.radians(arc_deg) / 2
    cols = []
    for i in range(segs + 1):
        a = a0 + math.radians(arc_deg) * i / segs
        x, y = math.cos(a) * radius * CM, math.sin(a) * radius * CM
        cols.append((bm.verts.new((x, y, z0 * CM)), bm.verts.new((x, y, z1 * CM)), i / segs))
    for i in range(segs):
        (b0, t0, u0), (b1, t1, u1) = cols[i], cols[i + 1]
        f = bm.faces.new((b0, b1, t1, t0))
        for loop, (u, v) in zip(f.loops, ((u0, 0), (u1, 0), (u1, 1), (u0, 1))):
            loop[uv].uv = (u, v)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    m = bpy.data.materials.new(name + '_ink'); m.use_nodes = True
    nt = m.node_tree
    bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
    bsdf.inputs['Base Color'].default_value = (0.004, 0.004, 0.004, 1)
    bsdf.inputs['Roughness'].default_value = 0.38
    tex = nt.nodes.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(img_path)
    tex.interpolation = 'Cubic'
    nt.links.new(tex.outputs['Alpha'], bsdf.inputs['Alpha'])
    ob = bpy.data.objects.new(name, me); ob.data.materials.append(m)
    coll.objects.link(ob)
    return ob

def group(name, objs, loc=(0, 0, 0), rot_z=0.0):
    root = bpy.data.objects.new(name, None); coll.objects.link(root)
    for o in objs:
        o.parent = root
    root.location = loc; root.rotation_euler.z = math.radians(rot_z)
    return root

# ---------------------------------------------------------------- materials
PET = principled('PET', **{'Base Color': (1, 1, 1, 1), 'Roughness': 0.015, 'IOR': 1.57, 'Transmission Weight': 1.0})
OVERCAP = principled('Overcap', **{'Base Color': (0.97, 0.97, 0.98, 1), 'Roughness': 0.04, 'IOR': 1.49, 'Transmission Weight': 1.0})
WHITE_PP = principled('WhitePP', **{'Base Color': (0.86, 0.86, 0.86, 1), 'Roughness': 0.32, 'Subsurface Weight': 0.15, 'Subsurface Radius': (0.2, 0.2, 0.2), 'Subsurface Scale': 0.002})
HDPE = principled('HDPE', **{'Base Color': (0.83, 0.83, 0.83, 1), 'Roughness': 0.48, 'Subsurface Weight': 0.25, 'Subsurface Radius': (0.3, 0.3, 0.3), 'Subsurface Scale': 0.003})
GEL = principled('PinkGel', **{'Base Color': srgb('#ff9fbd'), 'Roughness': 0.03, 'IOR': 1.36, 'Transmission Weight': 1.0})
MIST = principled('MistLiquid', **{'Base Color': srgb('#ffd3e0'), 'Roughness': 0.0, 'IOR': 1.34, 'Transmission Weight': 1.0})
BUTTER = principled('Butter', **{'Base Color': srgb('#ffc8d7'), 'Roughness': 0.5, 'Emission Color': srgb('#ffc8d7'), 'Emission Strength': 0.18, 'Subsurface Weight': 0.4, 'Subsurface Radius': (1.0, 0.4, 0.4), 'Subsurface Scale': 0.004})
TUBE = principled('DipTube', **{'Base Color': (0.95, 0.95, 0.95, 1), 'Roughness': 0.2, 'Transmission Weight': 0.8, 'IOR': 1.45})
LOTION = principled('Lotion', **{'Base Color': srgb('#fff1f5'), 'Roughness': 0.3, 'Subsurface Weight': 0.3, 'Subsurface Radius': (1.0, 0.6, 0.6), 'Subsurface Scale': 0.003})
INK_G = principled('GlossInk', **{'Base Color': (0.0, 0.0, 0.0, 1), 'Roughness': 0.22, 'Coat Weight': 1.0, 'Coat Roughness': 0.05})
TEX = os.path.join(S, 'tex')

# ---------------------------------------------------------------- products
def body_wash():
    outer = fillet([(0, 0.35, 0), (1.9, 0.05, 0.3), (2.75, 0.05, 0.55), (2.75, 12.4, 1.9), (1.25, 14.5, 0.5), (1.25, 15.6, 0)])
    parts = [shell('wash_bottle', outer, 0.06, PET)]
    inner = offset_inward(outer, 0.075)
    parts.append(lathe('wash_gel', clip_below(inner, 12.2), GEL))
    cap = fillet([(0, 15.0, 0), (1.47, 15.0, 0.08), (1.5, 16.55, 0.12), (1.42, 16.62, 0.03), (1.42, 16.7, 0.05), (1.35, 17.15, 0.25), (0, 17.25, 0)])
    parts.append(lathe('wash_cap', cap, WHITE_PP))
    parts.append(band('wash_print', 2.755, 3.6, 8.4, 200, os.path.join(TEX, 'wash.png')))
    return parts, (5.5, 17.25)

def body_mist():
    outer = fillet([(0, 0.3, 0), (1.6, 0.05, 0.3), (2.2, 0.05, 0.4), (2.2, 11.9, 0.55), (1.15, 12.5, 0.15), (1.15, 13.2, 0)])
    parts = [shell('mist_bottle', outer, 0.06, PET)]
    inner = offset_inward(outer, 0.075)
    parts.append(lathe('mist_liquid', clip_below(inner, 11.45), MIST))
    collar = fillet([(0, 12.55, 0), (1.6, 12.55, 0.06), (1.62, 13.95, 0.06), (0, 13.95, 0)])
    parts.append(lathe('mist_collar', collar, WHITE_PP))
    act = fillet([(0, 13.9, 0), (1.3, 13.9, 0.04), (1.3, 14.45, 0.04), (1.05, 14.45, 0.03), (1.05, 14.95, 0.03),
                  (0.82, 14.95, 0.03), (0.82, 15.45, 0.03), (0.66, 15.45, 0.02), (0.66, 16.0, 0.12), (0, 16.05, 0)])
    parts.append(lathe('mist_actuator', act, WHITE_PP))
    over = fillet([(1.76, 13.95, 0), (1.76, 19.1, 0.35), (0, 19.15, 0)])
    parts.append(lathe('mist_overcap', over + list(reversed(offset_inward(over, 0.08)))[:-1] + [(1.68, 13.95)], OVERCAP))
    cu = bpy.data.curves.new('tube', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 0.1 * CM; cu.bevel_resolution = 3
    sp = cu.splines.new('BEZIER'); pts = [(0, 0, 13.0), (0.05, 0, 8.5), (0.9, 0, 4.2), (1.75, 0, 0.45)]
    sp.bezier_points.add(len(pts) - 1)
    for bp, p in zip(sp.bezier_points, pts):
        bp.co = Vector(p) * CM; bp.handle_left_type = bp.handle_right_type = 'AUTO'
    tube = bpy.data.objects.new('mist_tube', cu); tube.data.materials.append(TUBE); coll.objects.link(tube)
    tube.rotation_euler.z = math.radians(-25)
    parts.append(tube)
    parts.append(band('mist_print', 2.205, 3.4, 7.6, 210, os.path.join(TEX, 'mist.png')))
    return parts, (4.4, 19.15)

def body_butter():
    outer = fillet([(0, 0.2, 0), (2.8, 0.0, 0.25), (3.5, 0.0, 0.35), (3.5, 4.85, 0.25), (3.28, 5.05, 0.05), (3.28, 5.6, 0)])
    inner = [(0, 0.55)] + [(r, z) for r, z in offset_inward(outer, 0.22)[1:]]
    inner = [(0.0, 0.55), (2.9, 0.55), (3.18, 0.8)] + [(r, z) for r, z in inner if z > 0.8]
    jar = lathe('butter_jar', outer + list(reversed(inner)), PET, segs=160)
    # whipped top
    top = [(0, 0.6), (3.24, 0.6), (3.24, 4.2)] + [(3.24 * (1 - i / 24), 4.2 + 0.55 * math.sin(math.pi / 2 * i / 24) ** 0.7) for i in range(1, 25)]
    cream = lathe('butter_cream', top, BUTTER, segs=200)
    for v in cream.data.vertices:
        r = math.hypot(v.co.x, v.co.y) / CM
        if v.co.z / CM > 4.15 and r < 3.1:
            th = math.atan2(v.co.y, v.co.x)
            v.co.z += CM * 0.22 * math.sin(3 * th + r * 2.4) * (r / 3.1) ** 0.6 * (1 - r / 3.2)
    sub = cream.modifiers.new('sub', 'SUBSURF'); sub.levels = sub.render_levels = 1
    lid_prof = fillet([(3.3, 5.05, 0), (3.62, 5.05, 0.08), (3.62, 6.35, 0.18), (0, 6.42, 0)])
    lid = lathe('butter_lid', lid_prof, WHITE_PP, segs=480)
    for v in lid.data.vertices:
        r = math.hypot(v.co.x, v.co.y) / CM
        z = v.co.z / CM
        if r > 3.5 and 5.2 < z < 6.2:
            th = math.atan2(v.co.y, v.co.x)
            k = 1 + (0.03 * (0.5 + 0.5 * math.cos(120 * th))) / r
            v.co.x *= k; v.co.y *= k
    pr = band('butter_print', 3.505, 0.9, 4.1, 105, os.path.join(TEX, 'scrub.png'))
    return [jar, cream, lid, pr], (7.3, 6.42)

def body_lotion():
    outer = fillet([(0, 0.25, 0), (1.7, 0.0, 0.3), (2.2, 0.0, 0.45), (2.2, 11.3, 1.3), (1.0, 12.6, 0.3), (1.0, 13.2, 0), (0, 13.2, 0)])
    parts = [lathe('lotion_bottle', outer, HDPE)]
    parts.append(lathe('lotion_formula', clip_below(offset_inward(outer, 0.12), 12.2), LOTION))
    cap = fillet([(0, 12.95, 0), (1.25, 12.95, 0.08), (1.25, 13.85, 0.06), (1.74, 13.88, 0.1), (1.76, 14.6, 0.22), (0, 14.75, 0)])
    parts.append(lathe('lotion_cap', cap, WHITE_PP))
    parts.append(band('lotion_print', 2.205, 3.3, 7.5, 210, os.path.join(TEX, 'lotion.png')))
    return parts, (4.4, 14.75)

def g_mark(height_cm=24.0, depth_cm=2.4):
    data = json.load(open(os.path.join(S, 'g-mark.json')))
    cu = bpy.data.curves.new('G', 'CURVE'); cu.dimensions = '2D'; cu.fill_mode = 'BOTH'
    cu.extrude = depth_cm / 2 * CM; cu.bevel_depth = 0.35 * CM; cu.bevel_resolution = 6
    y0, y1, x0, x1 = 303, 795, 333, 759
    k = height_cm * CM / (y1 - y0)
    P = lambda p: Vector(((p[0] - (x0 + x1) / 2) * k, (y1 - p[1]) * k, 0))
    for c in data:
        sp = cu.splines.new('BEZIER')
        pts = []  # (co, hl, hr)
        cur = P(c['start']); pts.append([cur, cur.copy(), cur.copy()])
        for s in c['segs']:
            if s['corner']:
                pts[-1][2] = pts[-1][0].copy()
                cpt = P(s['c']); pts.append([cpt, cpt.copy(), cpt.copy()])
                e = P(s['end']); pts.append([e, e.copy(), e.copy()])
            else:
                pts[-1][2] = P(s['c1'])
                e = P(s['end']); pts.append([e, P(s['c2']), e.copy()])
        # last point == start: merge
        pts[0][1] = pts[-1][1]; pts.pop()
        sp.bezier_points.add(len(pts) - 1)
        for bp, (co, hl, hr) in zip(sp.bezier_points, pts):
            bp.handle_left_type = bp.handle_right_type = 'FREE'
            bp.co, bp.handle_left, bp.handle_right = co, hl, hr
        sp.use_cyclic_u = True
    ob = bpy.data.objects.new('G_mark', cu); ob.data.materials.append(INK_G); coll.objects.link(ob)
    ob.rotation_euler.x = math.radians(90)
    ob.location.z = 0
    return ob

# ---------------------------------------------------------------- studio
def studio(pink='#f4b1c3'):
    bm = bmesh.new()
    prof = [(-3.0, 0.0)] + [(0.9 + 0.6 * math.sin(a), 0.6 - 0.6 * math.cos(a)) for a in [i / 16 * math.pi / 2 for i in range(17)]] + [(1.5, 3.0)]
    prev = None
    rows = []
    for y, z in prof:
        rows.append((bm.verts.new((-4, y, z)), bm.verts.new((4, y, z))))
    for (a0, a1), (b0, b1) in zip(rows, rows[1:]):
        bm.faces.new((a0, a1, b1, b0))
    me = bpy.data.meshes.new('sweep'); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new('sweep', me); coll.objects.link(ob)
    m = principled('Backdrop', **{'Base Color': tuple(c * 0.3 for c in srgb(pink)[:3]) + (1,), 'Roughness': 0.9, 'Emission Color': srgb(pink), 'Emission Strength': float(os.environ.get('BG', '0.55'))})
    ob.data.materials.append(m)

    def area(name, loc, size, power, color=(1, 1, 1), shape='RECTANGLE', size_y=None, target=(0, 0, 0.1)):
        L = bpy.data.lights.new(name, 'AREA'); L.energy = power; L.color = color; L.shape = shape
        L.size = size; L.size_y = size_y or size
        o = bpy.data.objects.new(name, L); o.location = loc; coll.objects.link(o)
        d = Vector(target) - Vector(loc); o.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        return o
    LS = float(os.environ.get('LS', '0.12'))
    area('key', (-0.7, -0.9, 1.1), 1.0, 160 * LS)
    area('fill', (0.9, -0.6, 0.35), 1.2, 35 * LS, color=(1, 0.93, 0.96))
    area('rimL', (-0.45, 0.45, 0.25), 0.08, 40 * LS, shape='RECTANGLE', size_y=0.9)
    area('rimR', (0.45, 0.45, 0.25), 0.08, 40 * LS, shape='RECTANGLE', size_y=0.9)
    area('top', (0, 0.05, 0.9), 0.8, 50 * LS)
    w = bpy.data.worlds.new('w'); scene.world = w; w.use_nodes = True
    bg = next(n for n in w.node_tree.nodes if n.type == 'BACKGROUND')
    bg.inputs['Color'].default_value = (1, 0.85, 0.9, 1); bg.inputs['Strength'].default_value = 0.7

def camera(target, frame_h, aspect, lens=85, elev=6.0, yaw=0.0, shift_x=0.0, name='cam'):
    cd = bpy.data.cameras.new(name); cd.lens = lens; cd.sensor_fit = 'VERTICAL'; cd.sensor_height = 24
    cd.shift_x = shift_x
    fov = 2 * math.atan(12 / lens)
    dist = frame_h / 2 / math.tan(fov / 2)
    e, y = math.radians(elev), math.radians(yaw)
    loc = Vector(target) + Vector((math.sin(y) * math.cos(e), -math.cos(y) * math.cos(e), math.sin(e))) * dist
    cam = bpy.data.objects.new(name, cd); cam.location = loc; coll.objects.link(cam)
    cam.rotation_euler = (Vector(target) - loc).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = cam
    return cam

# ---------------------------------------------------------------- render setup
r = scene.render
try:
    r.engine = 'CYCLES'
except TypeError as e:
    print('engine error', e)
cy = scene.cycles
try:
    prefs = bpy.context.preferences.addons['cycles'].preferences
    for dev in ('OPTIX', 'CUDA'):
        try:
            prefs.compute_device_type = dev
            prefs.refresh_devices()
            if any(d.type == dev for d in prefs.devices):
                break
        except Exception as e:
            print('device', dev, e)
    for d in prefs.devices:
        d.use = d.type == prefs.compute_device_type
    cy.device = 'GPU'
    print('devices', [(d.name, d.type, d.use) for d in prefs.devices])
except Exception as e:
    print('gpu setup failed', e)
cy.samples = 200 if FINAL else 48
cy.use_denoising = True
cy.max_bounces = 24; cy.transmission_bounces = 24; cy.transparent_max_bounces = 24; cy.glossy_bounces = 12
cy.caustics_reflective = False; cy.caustics_refractive = False
cy.blur_glossy = 0.5
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.view_settings.exposure = 0.0
r.image_settings.file_format = 'PNG'
r.image_settings.color_mode = 'RGB'
r.resolution_percentage = 100 if FINAL else 30

studio()
builders = {'wash': body_wash, 'mist': body_mist, 'butter': body_butter, 'lotion': body_lotion}
products = {}
for k, fn in builders.items():
    parts, (w, h) = fn()
    products[k] = (group(k, parts), w, h)
G = g_mark()
CLEAR = {'PET', 'Overcap', 'PinkGel', 'MistLiquid', 'DipTube'}
for o in bpy.data.objects:
    if o.name == 'butter_lid':
        o.visible_shadow = False
for o in bpy.data.objects:
    if o.type in ('MESH', 'CURVE') and o.data.materials and o.data.materials[0].name in CLEAR:
        o.visible_shadow = False

def show_only(names):
    for k, (root, _, _) in products.items():
        hide = k not in names
        for o in [root] + list(root.children):
            o.hide_render = hide
    G.hide_render = 'G' not in names

def render(name):
    path = os.path.join(OUT, name + '.png')
    r.filepath = path
    bpy.ops.render.render(write_still=True)
    print('wrote', path)

FILM_FRAMES = 120
# Timeline (frames of 120). The storefront captions in src/brand/films.ts follow the same beats:
#   texture 1-36 (bottle drops in 22-38) | pour 40-80 | cap 80-100 | finish 98-110 | G + pull back 104-120
FILM_PARTS = {
    'wash': {'formula': ['wash_gel'], 'bottle': ['wash_bottle'], 'cap': ['wash_cap'], 'over': [], 'print': 'wash_print',
             'top': 15.6, 'pour': 0.30, 'mat': GEL, 'element': 'bubble'},
    'mist': {'formula': ['mist_liquid'], 'bottle': ['mist_bottle', 'mist_tube'], 'cap': ['mist_collar', 'mist_actuator'],
             'over': ['mist_overcap'], 'print': 'mist_print', 'top': 13.2, 'pour': 0.16, 'mat': MIST, 'element': 'droplet'},
    'butter': {'formula': ['butter_cream'], 'bottle': ['butter_jar'], 'cap': ['butter_lid'], 'over': [], 'print': 'butter_print',
               'top': 5.6, 'pour': 0.75, 'mat': BUTTER, 'element': 'peak'},
    'lotion': {'formula': ['lotion_formula'], 'bottle': ['lotion_bottle'], 'cap': ['lotion_cap'], 'over': [], 'print': 'lotion_print',
               'top': 13.2, 'pour': 0.34, 'mat': LOTION, 'element': 'drop'},
}
BUBBLE = principled('Bubble', **{'Base Color': (1, 1, 1, 1), 'Roughness': 0.0, 'IOR': 1.02, 'Transmission Weight': 1.0,
                                 'Thin Film Thickness': 420.0, 'Thin Film IOR': 1.33})
DROPLET = principled('Droplet', **{'Base Color': srgb('#ffe9f0'), 'Roughness': 0.0, 'IOR': 1.33, 'Transmission Weight': 1.0})
ELEMENT_MAT = {'bubble': BUBBLE, 'droplet': DROPLET, 'peak': BUTTER, 'drop': LOTION}


def key(obj, path, frame, value, index=-1):
    setattr(obj, path, value) if index < 0 else getattr(obj, path).__setitem__(index, value)
    obj.keyframe_insert(path, frame=frame, index=index)


def visible_from(obj, frame):
    for f, hidden in ((1, True), (frame - 1, True), (frame, False)):
        obj.hide_render = hidden; obj.keyframe_insert('hide_render', frame=f)


def element_mesh(kind):
    """One mesh per element type, shared by every copy."""
    if kind in ('bubble', 'droplet'):
        bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=1.0)
        me = bpy.data.meshes.new(kind); bm.to_mesh(me); bm.free()
    elif kind == 'peak':  # a piped kiss of whipped butter
        prof = fillet([(0, 0, 0), (1.0, 0.0, 0.3), (0.9, 0.55, 0.35), (0.35, 1.1, 0.25), (0.0, 1.7, 0)])
        src = lathe('peak_src', prof, BUTTER, segs=48)
    else:  # a teardrop of lotion
        prof = [(math.sin(t) * (1 - math.cos(t)) * 0.75, 1 + math.cos(t)) for t in [i / 24 * math.pi for i in range(25)]]
        prof = [(0.0, 0.0)] + [(r, z) for r, z in prof[::-1][1:-1]] + [(0.0, 2.0)]  # bottom to top
        src = lathe('drop_src', prof, LOTION, segs=48)
    if kind in ('peak', 'drop'):  # lathe builds in centimetres and links an object; keep a unit-size mesh only
        me = src.data; bpy.data.objects.remove(src)
        me.transform(Matrix.Scale(1 / CM, 4))
    for p in me.polygons:
        p.use_smooth = True
    return me


def scatter(kind, n, centre, radii, seed, keep_out, frames, converge=None, size=(0.35, 1.3)):
    """Floating texture elements. They drift up and turn; with `converge` they fly into that point and vanish."""
    import random
    rnd = random.Random(seed)
    me = element_mesh(kind)
    if not me.materials:
        me.materials.append(ELEMENT_MAT[kind])
    made = []
    while len(made) < n:
        x, y, z = (rnd.uniform(-1, 1) for _ in range(3))
        if x * x + y * y + z * z > 1:
            continue
        p = Vector((centre[0] + x * radii[0], centre[1] + y * radii[1], centre[2] + z * radii[2]))
        if math.hypot(p.x, p.y) < keep_out or p.z < 0.6 * CM:
            continue
        o = bpy.data.objects.new(f'{kind}_{len(made)}', me); coll.objects.link(o)
        s = rnd.uniform(*size) * CM
        sc = (s, s, s * (1.25 if kind == 'droplet' else 1))
        rot = Vector((rnd.uniform(-0.6, 0.6), rnd.uniform(-0.6, 0.6), rnd.uniform(0, 6.28)))
        f0, f1 = frames
        key(o, 'location', 1, p); key(o, 'scale', 1, sc); key(o, 'rotation_euler', 1, rot)
        drift = p + Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(2, 5))) * CM
        if converge is None:
            key(o, 'location', f1, drift); key(o, 'rotation_euler', f1, rot + Vector((0.4, -0.3, 1.2)))
        else:
            key(o, 'location', f0, drift); key(o, 'scale', f0, sc); key(o, 'rotation_euler', f0, rot + Vector((0.3, -0.2, 0.9)))
            key(o, 'location', f1 + rnd.randint(-4, 4), Vector(converge)); key(o, 'scale', f1 + 6, (0, 0, 0))
        made.append(o)
    return made


def ribbon(name, top_cm, radius_cm, mat, bottom_cm=1.2):
    """A spiral of product pouring from above the frame down through the neck."""
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'
    cu.bevel_depth = radius_cm * CM; cu.bevel_resolution = 6; cu.use_fill_caps = True
    cu.bevel_factor_mapping_start = cu.bevel_factor_mapping_end = 'SPLINE'
    sp = cu.splines.new('POLY')
    pts = []
    for i in range(60):
        t = i / 59
        r = 3.2 * (1 - t) ** 1.4
        a = t * math.pi * 2.6
        pts.append((math.cos(a) * r, math.sin(a) * r, top_cm + 10 - t * 9))
    pts += [(0, 0, top_cm - 2), (0, 0, bottom_cm)]
    sp.points.add(len(pts) - 1)
    for p, c in zip(sp.points, pts):
        p.co = (c[0] * CM, c[1] * CM, c[2] * CM, 1)
    o = bpy.data.objects.new(name, cu); o.data.materials.append(mat); coll.objects.link(o)
    return o


def light_ramp():
    for L in [o for o in bpy.data.objects if o.type == 'LIGHT' and o.name in ('key', 'rimL', 'rimR')]:
        full = L.data.energy
        L.data.energy = full * 0.35; L.data.keyframe_insert('energy', frame=1)
        L.data.energy = full; L.data.keyframe_insert('energy', frame=24)


def rim_only(objs):
    """Rim lights outline the products only; on the floor they leave a white streak glass refracts."""
    rx = bpy.data.collections.new('rim_receivers')
    for o in dict.fromkeys(objs):
        if o.type in ('MESH', 'CURVE'):
            rx.objects.link(o)
    for n in ('rimL', 'rimR'):
        bpy.data.objects[n].light_linking.receiver_collection = rx


def film_camera(tgt_keys, cam_keys):
    tgt = bpy.data.objects.new('film_target', None); coll.objects.link(tgt)
    for f, loc in tgt_keys:
        key(tgt, 'location', f, loc)
    cd = bpy.data.cameras.new('film_cam'); cd.lens = 50; cd.sensor_fit = 'HORIZONTAL'; cd.sensor_width = 36
    cam = bpy.data.objects.new('film_cam', cd); coll.objects.link(cam); scene.camera = cam
    for f, loc in cam_keys:
        key(cam, 'location', f, loc)
    c = cam.constraints.new('TRACK_TO'); c.target = tgt; c.track_axis = 'TRACK_NEGATIVE_Z'; c.up_axis = 'UP_Y'


def orbit_point(dist, yaw, elev, tz):
    y, e = math.radians(yaw), math.radians(elev)
    return (math.sin(y) * math.cos(e) * dist, -math.cos(y) * math.cos(e) * dist, tz + math.sin(e) * dist)


def film(k):
    root, w, h = products[k]
    show_only({k, 'G'})
    root.location = (0, 0, 0); root.rotation_euler.z = 0
    P = FILM_PARTS[k]
    ob = bpy.data.objects
    H = max(h, w * 1.25) * CM  # framing size; wide jars are framed by width
    top = P['top']
    # 1. texture: elements drift around the empty studio, then fly into the neck as the pour starts
    els = scatter(P['element'], 16 if P['element'] != 'droplet' else 24, (0, 2 * CM, max(h * 0.55 * CM, 0.45 * H)),
                  (0.8 * H, 0.35 * H, 0.42 * H), seed=len(k) * 7, keep_out=w * 0.75 * CM,
                  frames=(34, 50), converge=(0, 0, (top + 2) * CM),
                  size=(0.6, 1.6) if P['element'] == 'bubble' else (0.4, 0.95) if P['element'] == 'droplet' else (0.5, 1.1))
    for n in P['bottle']:
        key(ob[n], 'location', 1, 0.34, 2); key(ob[n], 'location', 22, 0.34, 2); key(ob[n], 'location', 38, 0.0, 2)
    # 2. pour: a ribbon spirals in and the formula rises
    rb = ribbon(f'{k}_ribbon', top, P['pour'], P['mat']); rb.parent = root
    cu = rb.data
    cu.bevel_factor_end = 0.0; cu.keyframe_insert('bevel_factor_end', frame=40)
    cu.bevel_factor_end = 1.0; cu.keyframe_insert('bevel_factor_end', frame=54)
    cu.bevel_factor_start = 0.0; cu.keyframe_insert('bevel_factor_start', frame=68)
    cu.bevel_factor_start = 1.0; cu.keyframe_insert('bevel_factor_start', frame=80)
    visible_from(rb, 40)
    for n in P['formula']:
        visible_from(ob[n], 46)
        key(ob[n], 'scale', 46, (0.97, 0.97, 0.002)); key(ob[n], 'scale', 76, (1, 1, 1))
    # 3. cap screws on
    for n in P['cap']:
        o = ob[n]
        key(o, 'location', 1, 0.14, 2); key(o, 'location', 80, 0.14, 2); key(o, 'location', 96, 0.0, 2)
        key(o, 'rotation_euler', 80, math.radians(540), 2); key(o, 'rotation_euler', 96, 0.0, 2)
    for n in P['over']:
        key(ob[n], 'location', 1, 0.16, 2); key(ob[n], 'location', 90, 0.16, 2); key(ob[n], 'location', 100, 0.0, 2)
    # 4. finish: the print wraps round, the G rises behind
    pr = ob[P['print']]
    visible_from(pr, 98)
    key(pr, 'rotation_euler', 98, math.radians(-220), 2); key(pr, 'rotation_euler', 110, 0.0, 2)
    s = max(h, 12) / 17.25
    G.hide_render = False; G.scale = (s, s, s); G.rotation_euler.z = math.radians(-6)
    G.location = (-2.5 * CM * s, 15.0 * CM * s, -0.30)
    key(G, 'location', 1, -0.30, 2); key(G, 'location', 104, -0.30, 2); key(G, 'location', 118, 0.0, 2)
    rim_only([G, rb] + els + list(root.children))
    light_ramp()
    film_camera(
        [(1, (0, 0, h * 0.55 * CM)), (36, (0, 0, h * 0.7 * CM)), (60, (0, 0, h * 0.8 * CM)), (80, (0, 0, h * 0.78 * CM)),
         (100, (0, 0, h * 0.5 * CM)), (120, (-0.5 * CM * s, 0, 10.5 * CM * s))],
        [(1, orbit_point(3.4 * H, 18, 6, h * 0.55 * CM)), (36, orbit_point(2.7 * H, 26, 10, h * 0.7 * CM)),
         (60, orbit_point(2.1 * H, 16, 14, h * 0.8 * CM)), (80, orbit_point(2.3 * H, 10, 10, h * 0.78 * CM)),
         (100, orbit_point(2.8 * H, 4, 6, h * 0.5 * CM)), (120, (0.08 * s, -0.82 * s, 0.16 * s))])
    return k


def brand_film():
    """Home page: the four products drop into a line-up in routine order, the G rises behind."""
    # routine order; the 'butter' jar is the body scrub
    order = [('wash', -10.8), ('butter', -3.2), ('lotion', 4.0), ('mist', 11.0)]
    show_only({'wash', 'lotion', 'butter', 'mist', 'G'})
    roots = []
    for i, (k, x) in enumerate(order):
        root = products[k][0]; roots.append(root)
        root.rotation_euler.z = 0
        f0 = 16 + i * 16
        key(root, 'location', 1, (x * CM, 0, 0.36)); key(root, 'location', f0, (x * CM, 0, 0.36))
        key(root, 'location', f0 + 12, (x * CM, 0, -0.004)); key(root, 'location', f0 + 15, (x * CM, 0, 0.0))
    els = []
    for i, kind in enumerate(('bubble', 'droplet', 'peak', 'drop')):
        els += scatter(kind, 7, ((-12 + i * 8) * CM, 4 * CM, 13 * CM), (14 * CM, 8 * CM, 11 * CM), seed=40 + i,
                       keep_out=0, frames=(1, 120), size=(0.5, 1.3) if kind == 'bubble' else (0.3, 0.8))
    G.hide_render = False; G.scale = (1, 1, 1); G.rotation_euler.z = math.radians(-4)
    G.location = (0.5 * CM, 14 * CM, -0.30)
    key(G, 'location', 1, -0.30, 2); key(G, 'location', 88, -0.30, 2); key(G, 'location', 104, 0.0, 2)
    rim_only([G] + els + [c for r in roots for c in r.children])
    light_ramp()
    tk, ck = [], []
    for i, (_, x) in enumerate(order):  # follow each drop
        f = 22 + i * 16
        tk.append((f, (x * CM, 0, 8 * CM))); ck.append((f, (x * CM + 0.12, -0.40, 0.11)))
    # the closing frame keeps the line-up right of centre so the storefront's reveal copy sits on clear backdrop
    film_camera([(1, (-14 * CM, 0, 10 * CM))] + tk + [(120, (-9 * CM, 0, 10.5 * CM))],
                [(1, (-14 * CM + 0.14, -0.46, 0.13))] + ck + [(120, (-9 * CM + 0.03, -0.74, 0.17))])
    return 'brand'


def render_film(name):
    scene.frame_start, scene.frame_end = 1, FILM_FRAMES
    r.resolution_x, r.resolution_y = 1280, 720
    out = os.path.join(S, 'films', name); os.makedirs(out, exist_ok=True)
    frames = sorted(int(f) for f in ONLY_FRAMES) if ONLY_FRAMES else range(1, FILM_FRAMES + 1)
    for f in frames:
        scene.frame_set(f)
        r.filepath = os.path.join(out, f'f{f:03d}.png')
        bpy.ops.render.render(write_still=True)
    print('film done', name)


if MODE in ('film', 'film-preview'):
    # One film per Blender run: keyframes from one film would leak into the next.
    cy.samples = 48 if MODE == 'film' else 12
    r.use_persistent_data = True  # keep the BVH between frames
    r.resolution_percentage = 100 if MODE == 'film' else 40
    name = ONLY[0]
    ONLY_FRAMES = [a for a in ONLY[1:] if a.isdigit()]
    render_film(brand_film() if name == 'brand' else film(name))
    print('ALL DONE')
    sys.exit(0)


shots = []
for k, (root, w, h) in products.items():
    for view, yaw in (('front', 0.0), ('angle', 32.0)):
        shots.append((f'{k}-{view}', k, w, h, yaw))

for name, k, w, h, yaw in shots:
    if ONLY and name not in ONLY:
        continue
    show_only({k})
    root = products[k][0]
    root.location = (0, 0, 0); root.rotation_euler.z = math.radians(-yaw)
    r.resolution_x, r.resolution_y = 1600, 2000
    fh = max(h / 0.72, w / (0.8 * 0.6)) * CM
    camera((0, 0, h * 0.48 * CM), fh, 0.8, elev=7)
    render(name)

if not ONLY or 'hero' in ONLY:
    layout = {'butter': (-12.5, -5.0, 18), 'wash': (-4.8, 0.5, -10), 'mist': (2.4, 3.0, 12), 'lotion': (9.2, -2.5, -6)}
    show_only(set(layout) | {'G'})
    for k, (x, y, rz) in layout.items():
        root = products[k][0]; root.location = (x * CM, y * CM, 0); root.rotation_euler.z = math.radians(rz)
    G.location = (-2.0 * CM, 14.0 * CM, 0); G.rotation_euler.z = math.radians(-6)
    r.resolution_x, r.resolution_y = 2560, 1440
    camera((-1.5 * CM, 0, 12.5 * CM), 34 * CM, 16 / 9, lens=70, elev=8, shift_x=-0.27, name='hero_cam')
    render('hero')

if not ONLY or 'hero-rtl' in ONLY:
    # Arabic pages put the headline on the right, so the group moves left.
    layout = {'butter': (12.5, -5.0, -18), 'wash': (4.8, 0.5, 10), 'mist': (-2.4, 3.0, -12), 'lotion': (-9.2, -2.5, 6)}
    show_only(set(layout) | {'G'})
    for k, (x, y, rz) in layout.items():
        root = products[k][0]; root.location = (x * CM, y * CM, 0); root.rotation_euler.z = math.radians(rz)
    G.location = (2.0 * CM, 14.0 * CM, 0); G.rotation_euler.z = math.radians(6)
    r.resolution_x, r.resolution_y = 2560, 1440
    camera((1.5 * CM, 0, 12.5 * CM), 34 * CM, 16 / 9, lens=70, elev=8, shift_x=0.27, name='hero_rtl_cam')
    render('hero-rtl')

if not ONLY or 'lineup' in ONLY:
    layout = {'wash': (-10.5, 0, 0), 'mist': (-3.6, 0, 0), 'lotion': (3.4, 0, 0), 'butter': (11.2, 0, 0)}
    show_only(set(layout))
    for k, (x, y, rz) in layout.items():
        root = products[k][0]; root.location = (x * CM, y * CM, 0); root.rotation_euler.z = 0
    r.resolution_x, r.resolution_y = 2400, 1350
    camera((0.3 * CM, 0, 9.5 * CM), 25 * CM, 16 / 9, lens=85, elev=5, name='lineup_cam')
    render('lineup')

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(S, 'girle-packshots.blend'))
print('ALL DONE')
