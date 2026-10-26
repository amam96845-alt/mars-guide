/* ------------------------------------------------------------------
   MarsScene — Three.js 3D Mars globe with data layers, atmosphere,
   waypoint drawing, route rendering and raycaster picking.
------------------------------------------------------------------- */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { LANDMARKS, MARS_RADIUS_KM, type Landmark } from './marsData';

export type LayerId = 'photo' | 'topo' | 'thermal' | 'slope';
export interface LayerState { photo: boolean; topo: boolean; thermal: boolean; slope: boolean; landmarks: boolean; grid: boolean; }

const R = 100; // scene units

export function latLonToVec3(latDeg: number, lonDeg: number, radius = R): THREE.Vector3 {
  const lat = (latDeg * Math.PI) / 180;
  const phi = Math.PI / 2 - lat;
  const theta = (lonDeg * Math.PI) / 180;
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = -radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

export class MarsScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private mars: THREE.Mesh;
  private marsMat: THREE.MeshStandardMaterial;
  private atmosphere: THREE.Mesh;
  private glow: THREE.Mesh;
  private stars: THREE.Points;
  private sunLight: THREE.DirectionalLight;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private clock = new THREE.Clock();
  private raf = 0;

  private photoTex: THREE.Texture;
  private overlayMeshes: Partial<Record<LayerId, THREE.Mesh>> = {};
  private overlayMats: Partial<Record<LayerId, THREE.MeshBasicMaterial>> = {};
  private landmarkGroup: THREE.Group;
  private gridGroup: THREE.Group;
  private routeGroup: THREE.Group;
  private markerGroup: THREE.Group;
  private hazardGroup: THREE.Group;
  private selectionRing: THREE.Mesh;
  private routeCurve: THREE.CatmullRomCurve3 | null = null;
  private routePulse: THREE.Mesh | null = null;

  private layers: LayerState = { photo: true, topo: false, thermal: false, slope: false, landmarks: true, grid: false };

  onSurfaceClick: ((lat: number, lon: number) => void) | null = null;
  onHover: ((lat: number, lon: number) => void) | null = null;
  onWaypointDrag: ((id: number, lat: number, lon: number) => void) | null = null;

  private waypointMeshes: Map<number, THREE.Group> = new Map();
  private dragTarget: THREE.Group | null = null;
  private dragPointerDown = false;
  private downPos = { x: 0, y: 0 };
  private moved = false;

  constructor(container: HTMLElement) {
    this.container = container;
    const w = container.clientWidth || 800, h = container.clientHeight || 600;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05070d);

    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 5000);
    this.camera.position.set(-40, 70, 330);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 112;
    this.controls.maxDistance = 760;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.55;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.4;

    /* lighting */
    this.sunLight = new THREE.DirectionalLight(0xfff1dd, 3.2);
    this.sunLight.position.set(420, 90, 140);
    this.scene.add(this.sunLight);
    this.scene.add(new THREE.HemisphereLight(0x93a7cc, 0x190c06, 0.55));
    const rim = new THREE.DirectionalLight(0xff8a5c, 0.8);
    rim.position.set(-320, -50, -220);
    this.scene.add(rim);

    /* mars body */
    const texLoader = new THREE.TextureLoader();
    this.photoTex = texLoader.load('/textures/mars_color.png', t => { t.colorSpace = THREE.SRGBColorSpace; });
    this.photoTex.colorSpace = THREE.SRGBColorSpace;
    this.photoTex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());

    this.marsMat = new THREE.MeshStandardMaterial({
      map: this.photoTex,
      roughness: 0.96,
      metalness: 0.02,
      emissive: 0x1a0a05,
      emissiveIntensity: 0.05,
    });
    this.mars = new THREE.Mesh(new THREE.SphereGeometry(R, 128, 96), this.marsMat);
    this.mars.rotation.y = Math.PI; // align texture seam (0/360°E) with our lon=0 axis
    this.scene.add(this.mars);

    /* overlay shells */
    const makeOverlay = (id: Exclude<LayerId, 'photo'>, path: string, op: number) => {
      const t = texLoader.load(path, x => { x.colorSpace = THREE.SRGBColorSpace; });
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      const m = new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: op, depthWrite: false });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(R * 1.0025, 96, 72), m);
      mesh.rotation.y = Math.PI;
      mesh.visible = false;
      this.scene.add(mesh);
      this.overlayMeshes[id] = mesh;
      this.overlayMats[id] = m;
    };
    makeOverlay('topo', '/textures/mars_topo_render.jpg', 0.95);
    makeOverlay('thermal', '/textures/mars_thermal.jpg', 0.88);
    makeOverlay('slope', '/textures/mars_slope.jpg', 0.88);

    /* atmosphere + outer glow */
    const atmoMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vN; varying vec3 vP;
        void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vP = mv.xyz; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `
        varying vec3 vN; varying vec3 vP;
        void main(){
          vec3 v = normalize(-vP);
          float rim = 1.0 - abs(dot(v, vN));
          float glow = pow(rim, 3.1);
          vec3 col = mix(vec3(0.96,0.52,0.26), vec3(1.0,0.80,0.55), pow(rim,6.0));
          gl_FragColor = vec4(col, glow*0.92);
        }`,
      transparent: true, side: THREE.FrontSide, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.atmosphere = new THREE.Mesh(new THREE.SphereGeometry(R * 1.03, 64, 48), atmoMat);
    this.scene.add(this.atmosphere);

    const glowMat = new THREE.ShaderMaterial({
      vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vN; void main(){ float d = dot(vec3(0,0,1), vN); float g = pow(max(0.0, 0.72 - d), 4.0); gl_FragColor = vec4(vec3(0.95,0.44,0.21), g*0.8); }`,
      transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.glow = new THREE.Mesh(new THREE.SphereGeometry(R * 1.17, 64, 48), glowMat);
    this.scene.add(this.glow);

    /* stars */
    const starGeo = new THREE.BufferGeometry();
    const N = 2800;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
    const rand = this.mulberry(20261023);
    for (let i = 0; i < N; i++) {
      const u = rand(), v = rand();
      const th = 2 * Math.PI * u, ph = Math.acos(2 * v - 1);
      const rr = 1500 + rand() * 1100;
      pos[i * 3] = rr * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = rr * Math.cos(ph);
      pos[i * 3 + 2] = rr * Math.sin(ph) * Math.sin(th);
      const t = rand();
      const c = t < 0.7 ? [1, 1, 1] : t < 0.87 ? [0.72, 0.83, 1] : [1, 0.82, 0.62];
      const b = 0.3 + rand() * 0.7;
      col[i * 3] = c[0] * b; col[i * 3 + 1] = c[1] * b; col[i * 3 + 2] = c[2] * b;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 1.7, vertexColors: true, sizeAttenuation: false, transparent: true, opacity: 0.95 }));
    this.scene.add(this.stars);

    /* groups */
    this.landmarkGroup = new THREE.Group(); this.scene.add(this.landmarkGroup);
    this.gridGroup = new THREE.Group(); this.scene.add(this.gridGroup);
    this.routeGroup = new THREE.Group(); this.scene.add(this.routeGroup);
    this.markerGroup = new THREE.Group(); this.scene.add(this.markerGroup);
    this.hazardGroup = new THREE.Group(); this.scene.add(this.hazardGroup);

    this.buildLandmarks();
    this.buildGraticule();

    const ringGeo = new THREE.RingGeometry(R * 0.013, R * 0.0175, 48);
    this.selectionRing = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false })
    );
    this.selectionRing.visible = false;
    this.scene.add(this.selectionRing);

    /* events */
    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointermove', this.onPointerMove);
    el.addEventListener('pointerup', this.onPointerUp);
    el.addEventListener('pointerleave', this.onPointerLeave);
    window.addEventListener('resize', this.onResize);

    this.animate();
  }

  private mulberry(seed: number) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------------- layers ---------------- */

  setLayer(id: LayerId | 'landmarks' | 'grid', on: boolean) {
    (this.layers as unknown as Record<string, boolean>)[id] = on;
    if (id === 'photo') {
      this.marsMat.map = on ? this.photoTex : null;
      this.marsMat.color = new THREE.Color(on ? 0xffffff : 0x9a938c);
      this.marsMat.needsUpdate = true;
    } else if (id === 'topo' || id === 'thermal' || id === 'slope') {
      const mesh = this.overlayMeshes[id];
      if (mesh) mesh.visible = on;
    } else if (id === 'landmarks') this.landmarkGroup.visible = on;
    else if (id === 'grid') this.gridGroup.visible = on;
  }

  isLayerOn(id: LayerId | 'landmarks' | 'grid') { return (this.layers as unknown as Record<string, boolean>)[id]; }

  setOverlayOpacity(v: number) {
    for (const id of ['topo', 'thermal', 'slope'] as LayerId[]) {
      const m = this.overlayMats[id];
      if (m) m.opacity = id === 'topo' ? Math.min(1, v * 0.6 + 0.35) : v;
    }
  }

  /* ---------------- landmarks & graticule ---------------- */

  private buildLandmarks() {
    for (const lm of LANDMARKS) {
      const color = lm.kind === 'rover' || lm.kind === 'lander' ? 0x67e8f9
        : lm.kind === 'volcano' ? 0xfb923c
        : lm.kind === 'polar' ? 0xe2e8f0
        : lm.kind === 'canyon' || lm.kind === 'basin' ? 0xc084fc
        : lm.kind === 'plain' ? 0x34d399 : 0xfbbf24;
      const p = latLonToVec3(lm.lat, lm.lon, R * 1.004);
      const g = new THREE.Group();
      g.position.copy(p);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.95, 14, 14), new THREE.MeshBasicMaterial({ color }));
      dot.userData.landmarkId = lm.id;
      g.add(dot);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.5, 1.9, 32),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false })
      );
      ring.userData.landmarkId = lm.id;
      g.add(ring);
      g.lookAt(p.clone().multiplyScalar(2));
      this.landmarkGroup.add(g);

      const label = this.makeLabelSprite(lm.name, color);
      label.position.copy(latLonToVec3(lm.lat, lm.lon, R * 1.032));
      label.userData.landmarkId = lm.id;
      this.landmarkGroup.add(label);
    }
  }

  private makeLabelSprite(text: string, colorHex: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const font = '600 30px "Space Grotesk", system-ui, sans-serif';
    ctx.font = font;
    canvas.width = Math.ceil(ctx.measureText(text).width) + 46;
    canvas.height = 54;
    const c = canvas.getContext('2d')!;
    c.font = font;
    c.fillStyle = 'rgba(7,9,17,0.82)';
    c.beginPath(); c.roundRect(0, 0, canvas.width, 54, 11); c.fill();
    c.strokeStyle = '#' + colorHex.toString(16).padStart(6, '0');
    c.globalAlpha = 0.8; c.lineWidth = 2;
    c.beginPath(); c.roundRect(1.5, 1.5, canvas.width - 3, 51, 11); c.stroke();
    c.globalAlpha = 1;
    c.fillStyle = '#eef2f7';
    c.textBaseline = 'middle';
    c.fillText(text, 23, 28);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
    sp.scale.set((canvas.width / canvas.height) * 4.4, 4.4, 1);
    sp.renderOrder = 30;
    return sp;
  }

  private buildGraticule() {
    const mat = new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.22 });
    const mk = (pts: THREE.Vector3[]) => {
      this.gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    };
    for (let lon = 0; lon < 360; lon += 30) {
      const pts: THREE.Vector3[] = [];
      for (let lat = -88; lat <= 88; lat += 2) pts.push(latLonToVec3(lat, lon, R * 1.002));
      mk(pts);
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const pts: THREE.Vector3[] = [];
      for (let lon = 0; lon <= 360; lon += 2) pts.push(latLonToVec3(lat, lon, R * 1.002));
      mk(pts);
    }
    const eq: THREE.Vector3[] = [];
    for (let lon = 0; lon <= 360; lon += 2) eq.push(latLonToVec3(0, lon, R * 1.002));
    this.gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(eq), new THREE.LineBasicMaterial({ color: 0xfda4af, transparent: true, opacity: 0.4 })));
    this.gridGroup.visible = false;
  }

  /* ---------------- waypoints / route / hazards ---------------- */

  addWaypoint(id: number, lat: number, lon: number, index: number): THREE.Group {
    const p = latLonToVec3(lat, lon, R * 1.004);
    const g = new THREE.Group();
    g.position.copy(p);
    const stemLen = 7;
    const idx = index + 1;
    const isStart = idx === 1, isEnd = false; // end determined at re-render time by caller via index
    const stemColor = 0x22d3ee;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, stemLen, 10), new THREE.MeshBasicMaterial({ color: stemColor }));
    stem.position.y = stemLen / 2;
    g.add(stem);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(1.75, 20, 20),
      new THREE.MeshStandardMaterial({ color: stemColor, emissive: 0x0e7490, emissiveIntensity: 1.0, roughness: 0.28 })
    );
    head.position.y = stemLen + 1.3;
    g.add(head);
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(2.7, 32),
      new THREE.MeshBasicMaterial({ color: stemColor, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = 0.15;
    g.add(disc);
    const num = this.makeNumberSprite(String(idx));
    num.position.y = stemLen + 5.1;
    g.add(num);
    g.lookAt(p.clone().multiplyScalar(2));
    g.rotateX(Math.PI / 2);
    g.userData.waypointId = id;
    this.waypointMeshes.set(id, g);
    this.markerGroup.add(g);
    return g;
  }

  private makeNumberSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 72; canvas.height = 72;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#062530';
    ctx.beginPath(); ctx.arc(36, 36, 33, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(36, 36, 30, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ecfeff';
    ctx.font = '700 38px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 36, 38);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false, transparent: true }));
    sp.scale.set(5.0, 5.0, 1);
    sp.renderOrder = 26;
    return sp;
  }

  removeWaypointMesh(id: number) {
    const g = this.waypointMeshes.get(id);
    if (g) { this.markerGroup.remove(g); this.waypointMeshes.delete(id); }
  }

  clearWaypoints() {
    this.waypointMeshes.forEach(g => this.markerGroup.remove(g));
    this.waypointMeshes.clear();
    this.clearRoute();
  }

  clearRoute() {
    this.routeGroup.clear();
    this.hazardGroup.clear();
    this.routeCurve = null;
    this.routePulse = null;
  }

  drawRoute(samples: { lat: number; lon: number; slope: number }[], verdict: 'safe' | 'caution' | 'dangerous') {
    this.clearRoute();
    if (samples.length < 2) return;
    const pts = samples.map(s => latLonToVec3(s.lat, s.lon, R * 1.004));
    const cSafe = new THREE.Color(0x34d399), cWarn = new THREE.Color(0xfbbf24), cBad = new THREE.Color(0xfb4b4b);
    for (let i = 0; i < pts.length - 1; i++) {
      const t = Math.min(1, samples[i].slope / 22);
      const c = t < 0.5 ? cSafe.clone().lerp(cWarn, t * 2) : cWarn.clone().lerp(cBad, (t - 0.5) * 2);
      this.routeGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([pts[i], pts[i + 1]]),
        new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.98 })
      ));
    }
    this.routeCurve = new THREE.CatmullRomCurve3(pts);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(this.routeCurve, Math.min(360, pts.length * 3), 0.62, 6, false),
      new THREE.MeshBasicMaterial({ color: verdict === 'safe' ? 0x67e8f9 : verdict === 'caution' ? 0xffd166 : 0xff6b6b, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    this.routeGroup.add(tube);
    this.routePulse = new THREE.Mesh(
      new THREE.SphereGeometry(1.35, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    this.routeGroup.add(this.routePulse);
  }

  drawHazards(hazards: { lat: number; lon: number; severity: 'warning' | 'critical' }[]) {
    this.hazardGroup.clear();
    const seen = new Set<string>();
    for (const h of hazards) {
      const key = `${Math.round(h.lat * 4)}:${Math.round(h.lon * 4)}:${h.severity}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const p = latLonToVec3(h.lat, h.lon, R * 1.006);
      const c = h.severity === 'critical' ? 0xfb4b4b : 0xfbbf24;
      const rIn = h.severity === 'critical' ? 2.3 : 1.6;
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(rIn, rIn + 0.75, 28),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false })
      );
      ring.position.copy(p);
      ring.lookAt(p.clone().multiplyScalar(2));
      this.hazardGroup.add(ring);
    }
  }

  /* ---------------- picking ---------------- */

  private setPointerFromEvent(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private raycastSurface(e: PointerEvent): { lat: number; lon: number } | null {
    this.setPointerFromEvent(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.mars, false);
    if (!hits.length) return null;
    const p = hits[0].point;
    const lat = 90 - (Math.acos(Math.max(-1, Math.min(1, p.y / R))) * 180) / Math.PI;
    let lon = (Math.atan2(-p.z, p.x) * 180) / Math.PI;
    lon = ((lon % 360) + 360) % 360;
    return { lat, lon };
  }

  private raycastWaypoint(e: PointerEvent): THREE.Group | null {
    this.setPointerFromEvent(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes: THREE.Object3D[] = [];
    this.waypointMeshes.forEach(g => g.traverse(o => { if (o.type === 'Mesh' || o.type === 'Sprite') meshes.push(o); }));
    if (!meshes.length) return null;
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (!hits.length) return null;
    let o: THREE.Object3D | null = hits[0].object;
    while (o && o.userData.waypointId === undefined) o = o.parent;
    return (o as THREE.Group) ?? null;
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    this.downPos = { x: e.clientX, y: e.clientY };
    this.moved = false;
    const wp = this.raycastWaypoint(e);
    if (wp) {
      this.dragTarget = wp;
      this.dragPointerDown = true;
      this.controls.enabled = false;
      try { this.renderer.domElement.setPointerCapture(e.pointerId); } catch { /* noop */ }
    }
  };

  private onPointerMove = (e: PointerEvent) => {
    if (Math.hypot(e.clientX - this.downPos.x, e.clientY - this.downPos.y) > 5) this.moved = true;
    if (this.dragPointerDown && this.dragTarget) {
      const s = this.raycastSurface(e);
      if (s) {
        const id = this.dragTarget.userData.waypointId as number;
        const p = latLonToVec3(s.lat, s.lon, R * 1.004);
        this.dragTarget.position.copy(p);
        this.dragTarget.lookAt(p.clone().multiplyScalar(2));
        this.dragTarget.rotateX(Math.PI / 2);
        this.onWaypointDrag?.(id, s.lat, s.lon);
      }
      return;
    }
    const s = this.raycastSurface(e);
    if (s) this.onHover?.(s.lat, s.lon);
    const wp = this.raycastWaypoint(e);
    this.renderer.domElement.style.cursor = wp ? 'grab' : s ? 'crosshair' : 'default';
  };

  private onPointerUp = (e: PointerEvent) => {
    const wasDragging = this.dragPointerDown;
    this.dragPointerDown = false;
    this.dragTarget = null;
    this.controls.enabled = true;
    try { this.renderer.domElement.releasePointerCapture(e.pointerId); } catch { /* noop */ }
    if (!this.moved && !wasDragging && e.button === 0) {
      const s = this.raycastSurface(e);
      if (s) this.onSurfaceClick?.(s.lat, s.lon);
    }
  };

  private onPointerLeave = () => this.onHover?.(NaN, NaN);

  /* ---------------- camera & lighting ---------------- */

  flyTo(latDeg: number, lonDeg: number, distance = 185) {
    const dir = latLonToVec3(latDeg, lonDeg, 1).normalize();
    const startPos = this.camera.position.clone();
    const endPos = dir.clone().multiplyScalar(distance);
    const t0 = performance.now();
    const dur = 1500;
    const ease = (t: number) => 1 - Math.pow(2, -9 * t);
    const step = () => {
      const t = Math.min(1, (performance.now() - t0) / dur);
      const k = ease(t);
      this.camera.position.lerpVectors(startPos, endPos, k);
      if (t < 1) requestAnimationFrame(step);
    };
    step();
  }

  setSun(azimuthDeg: number, elevationDeg: number) {
    const az = (azimuthDeg * Math.PI) / 180, el = (elevationDeg * Math.PI) / 180;
    const r = 600;
    this.sunLight.position.set(r * Math.cos(el) * Math.sin(az), r * Math.sin(el), r * Math.cos(el) * Math.cos(az));
    this.sunLight.intensity = elevationDeg > 0 ? 3.2 : 0.3;
  }

  setAutoRotate(on: boolean) { this.controls.autoRotate = on; }

  /* ---------------- loop ---------------- */

  private onResize = () => {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private animate = () => {
    this.raf = requestAnimationFrame(this.animate);
    const t = this.clock.getElapsedTime();
    this.controls.update();
    this.atmosphere.scale.setScalar(1 + Math.sin(t * 0.8) * 0.0016);
    if (this.routePulse && this.routeCurve) {
      const u = (t * 0.055) % 1;
      const p = this.routeCurve.getPointAt(u);
      this.routePulse.position.copy(p.multiplyScalar((R * 1.006) / R));
      const s = 0.8 + Math.sin(t * 6) * 0.25;
      this.routePulse.scale.setScalar(s);
    }
    if (this.selectionRing.visible) {
      const s = 1 + Math.sin(t * 3.2) * 0.14;
      this.selectionRing.scale.setScalar(s);
      (this.selectionRing.material as THREE.MeshBasicMaterial).opacity = 0.6 + Math.sin(t * 3.2) * 0.3;
    }
    this.renderer.render(this.scene, this.camera);
  };

  showSelectionAt(lat: number, lon: number) {
    const p = latLonToVec3(lat, lon, R * 1.006);
    this.selectionRing.position.copy(p);
    this.selectionRing.lookAt(p.clone().multiplyScalar(2));
    this.selectionRing.visible = true;
  }
  hideSelection() { this.selectionRing.visible = false; }

  dispose() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointerleave', this.onPointerLeave);
    this.controls.dispose();
    this.scene.traverse(o => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.Line || o instanceof THREE.Sprite) {
        (o as THREE.Mesh).geometry?.dispose?.();
        const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(m)) m.forEach(x => x.dispose()); else m?.dispose?.();
      }
    });
    this.renderer.dispose();
    if (el.parentElement === this.container) this.container.removeChild(el);
  }
}
