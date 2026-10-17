"""GIRLÉ packshots. Run: blender -b --factory-startup -P scene.py -- <scratch_dir> <preview|final> [shot ...]"""
import bpy, bmesh, math, sys, os, json
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
S, MODE = argv[0], argv[1]
ONLY = set(argv[2:])
FINAL = MODE == 'final'
# Web models (glb mode) use half the radial detail; smooth shading hides the difference.
SEG_SCALE = 0.5 if MODE == 'glb' else 1.0
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
    bmesh.ops.spin(bm, geom=vs + es, cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * math.pi, steps=int(segs * SEG_SCALE), use_merge=True)
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
    segs = int(segs * SEG_SCALE)
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
    sub = cream.modifiers.new('sub', 'SUBSURF'); sub.levels = sub.render_levels = 0 if MODE == 'glb' else 1
    lid_prof = fillet([(3.3, 5.05, 0), (3.62, 5.05, 0.08), (3.62, 6.35, 0.18), (0, 6.42, 0)])
    lid = lathe('butter_lid', lid_prof, WHITE_PP, segs=480)
    for v in lid.data.vertices:
        r = math.hypot(v.co.x, v.co.y) / CM
        z = v.co.z / CM
        if r > 3.5 and 5.2 < z < 6.2:
            th = math.atan2(v.co.y, v.co.x)
            k = 1 + (0.03 * (0.5 + 0.5 * math.cos(120 * th))) / r
            v.co.x *= k; v.co.y *= k
    pr = band('butter_print', 3.505, 0.9, 4.1, 105, os.path.join(TEX, 'butter.png'))
    return [jar, cream, lid, pr], (7.3, 6.42)

def body_lotion():
    outer = fillet([(0, 0.25, 0), (1.7, 0.0, 0.3), (2.2, 0.0, 0.45), (2.2, 11.3, 1.3), (1.0, 12.6, 0.3), (1.0, 13.2, 0), (0, 13.2, 0)])
    parts = [lathe('lotion_bottle', outer, HDPE)]
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

def export_web_models():
    """GLB per product for the storefront's 3D viewer. Real-time engines can't show a refractive
    liquid inside a refractive bottle, so plastics become glossy alpha-blended shells and
    liquids become solid colour."""
    def web(mat, base=None, alpha=1.0, rough=None):
        bsdf = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        bsdf.inputs['Transmission Weight'].default_value = 0.0
        bsdf.inputs['Subsurface Weight'].default_value = 0.0
        bsdf.inputs['Emission Strength'].default_value = 0.0
        if base:
            bsdf.inputs['Base Color'].default_value = srgb(base)
        if rough is not None:
            bsdf.inputs['Roughness'].default_value = rough
        bsdf.inputs['Alpha'].default_value = alpha
        if alpha < 1:
            mat.surface_render_method = 'BLENDED'
    web(PET, '#ffffff', alpha=0.16, rough=0.04)
    web(OVERCAP, '#ffffff', alpha=0.14, rough=0.04)
    web(TUBE, '#ffffff', alpha=0.5, rough=0.2)
    web(GEL, '#ff8db0', rough=0.12)
    web(MIST, '#ffc4d5', rough=0.08)
    web(BUTTER, '#ffc2d3', rough=0.55)
    web(WHITE_PP); web(HDPE)
    radius = {'wash': 2.75, 'mist': 2.2, 'butter': 3.5, 'lotion': 2.2}
    for m in bpy.data.materials:
        if not m.name.endswith('_ink'):
            continue
        nt = m.node_tree
        tex = next(n for n in nt.nodes if n.type == 'TEX_IMAGE')
        bsdf = next(n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED')
        nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])  # glTF reads alpha from the base colour texture
        tex.image.scale(2048, 1024)
        m.surface_render_method = 'BLENDED'
    out = os.path.join(S, 'models'); os.makedirs(out, exist_ok=True)
    for k, (root, _, _) in products.items():
        root.location = (0, 0, 0); root.rotation_euler.z = 0
        for o in root.children:
            if o.name.endswith('_print'):  # lift the print clear of the surface to avoid depth fighting
                f = 1 + 0.03 / radius[k]; o.scale = (f, f, 1)
        bpy.ops.object.select_all(action='DESELECT')
        for o in [root] + list(root.children):
            o.hide_set(False); o.select_set(True)
        bpy.context.view_layer.objects.active = root
        path = os.path.join(out, f'{k}.glb')
        bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                                  export_yup=True, export_cameras=False, export_lights=False)
        print('wrote', path, os.path.getsize(path) // 1024, 'KB')

if MODE == 'glb':
    export_web_models()
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
