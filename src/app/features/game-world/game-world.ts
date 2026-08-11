import {
  Component, ElementRef, ViewChild, AfterViewInit, OnDestroy,
  effect, inject, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import * as THREE from 'three';
import { GameWorldService, PortfolioSectionKey } from '../../core/services/game-world.service';

interface Building3D {
  id: PortfolioSectionKey;
  name: string;
  sub: string;
  x: number;
  z: number;
  color: string;
  mesh: THREE.Group;
}

export interface DetailItem {
  text: string;
  logo?: string;       // path to logo image
  link?: string;       // URL for inline View button
  linkText?: string;   // label for the inline button
}

export interface PictureFrameData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  details: (string | DetailItem)[];
  tags?: string[];
  link?: { label: string; url: string };
  icon: string;
  imageIcon?: string;
  isMaintenance?: boolean;
  maintenanceNote?: string;
  color: string;
}

@Component({
  selector: 'app-game-world',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-world.html',
  styleUrl: './game-world.scss'
})
export class GameWorldComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly gameWorldService = inject(GameWorldService);

  // ── Three.js Core ─────────────────────────────────────────────
  private renderer!: THREE.WebGLRenderer;
  private raycaster = new THREE.Raycaster();
  private mouseVec = new THREE.Vector2(-100, -100);

  // Exterior Scene & Camera
  private extScene!: THREE.Scene;
  private extCamera!: THREE.PerspectiveCamera;

  // Interior 5-Star Hotel Scene & Camera
  private intScene!: THREE.Scene;
  private intCamera!: THREE.PerspectiveCamera;

  private animId: number | null = null;

  // ── Exterior Camera Orbit Controls ─────────────────────────────
  private cameraYaw = 0;                // Camera starts behind character's back looking North
  private cameraHeight = 6.0;           // Raised but same tilt angle (ratio 6/30 = 0.2)
  private cameraDist = 30.0;
  private mouseDragging = false;
  private prevMouseX = 0;
  private prevMouseY = 0;

  // ── Exterior Player Physics State (Starts FURTHER BACK on Southern Highway at z=140)
  player = {
    x: 0, z: 140,          // Started further back along central highway
    vx: 0, vz: 0,
    speed: 1.92,           // Grounded realistic human speed
    friction: 0.84,
    rotation: 0,           // 0 = Facing NORTH (-Z) down the highway looking at banners!
    strideTime: 0
  };

  // ── Interior 5-Star Hotel Player & Camera State ────────────────
  intPlayer = {
    x: 0, z: 18,
    vx: 0, vz: 0,
    speed: 1.8,
    friction: 0.84,
    rotation: 0,           // 0 = Facing NORTH (-Z) toward Reception Desk!
    strideTime: 0
  };

  private intCameraOrbit = {
    yaw: 0,
    pitch: 0.22,
    dist: 12
  };

  // Interior Character Mesh References
  private intPlayerGroup!: THREE.Group;
  private intBodyGroup!: THREE.Group;
  private intLeftThigh!: THREE.Group;
  private intLeftCalf!: THREE.Group;
  private intRightThigh!: THREE.Group;
  private intRightCalf!: THREE.Group;
  private intLeftUpperArm!: THREE.Group;
  private intLeftForearm!: THREE.Group;
  private intRightUpperArm!: THREE.Group;
  private intRightForearm!: THREE.Group;

  // 3D Hotel Manager Reference
  private managerGroup!: THREE.Group;

  // 3D Floating Clouds Reference
  private clouds: THREE.Group[] = [];

  // ── 🦸‍♂️ HOMELANDER LASER & EXPLOSION SYSTEM STATE ─────────────
  private treeData: {
    group: THREE.Group;
    trunk: THREE.Mesh;
    foliage: THREE.Mesh[];
    x: number;
    z: number;
    isDestroyed: boolean;
  }[] = [];

  private activeParticles: {
    mesh: THREE.Mesh;
    vx: number;
    vy: number;
    vz: number;
    life: number;
    maxLife: number;
    scale: number;
    color: THREE.Color;
    isSmoke?: boolean;
    isDebris?: boolean;
    rotV?: THREE.Vector3;
  }[] = [];

  private cameraShakeTimer = 0;
  private isShootingLaser = false;

  // Buildings & Interior State
  buildings: Building3D[] = [];
  nearbyBuilding: Building3D | null = null;
  private lastDoorTransitionTime = 0;   // Cooldown timestamp to prevent door glitching loops

  isInsideBuilding = false;
  enteredBuilding: Building3D | null = null;

  // 3D Picture Frames & Hover State
  pictureFrameMeshes: THREE.Mesh[] = [];
  pictureFrameGroups: THREE.Group[] = [];
  pictureFrameDataMap = new Map<THREE.Mesh, PictureFrameData>();
  hoveredFrameData: PictureFrameData | null = null;
  private _hideCardTimer: any = null;
  private _mouseOnCard = false;   // true while mouse is physically inside the card element
  isNearReception = false;

  // Exterior Character Limb References
  private playerGroup!: THREE.Group;
  private bodyGroup!: THREE.Group;
  private leftThigh!: THREE.Group;
  private leftCalf!: THREE.Group;
  private rightThigh!: THREE.Group;
  private rightCalf!: THREE.Group;
  private leftUpperArm!: THREE.Group;
  private leftForearm!: THREE.Group;
  private rightUpperArm!: THREE.Group;
  private rightForearm!: THREE.Group;

  // Controls & 🕹️ Virtual Analog Joystick
  private keys: Record<string, boolean> = {};
  touchDirs = { up: false, down: false, left: false, right: false };

  joystickVector = { x: 0, z: 0 };
  joystickKnobTransform = 'translate(0px, 0px)';
  private joystickTouchId: number | null = null;
  private joystickOrigin = { x: 0, y: 0 };
  private readonly maxJoystickRadius = 38;

  constructor() {
    effect(() => {
      const active = this.gameWorldService.isInteractiveMode();
      if (active) {
        setTimeout(() => this.boot(), 50);
      } else {
        this.destroy();
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.gameWorldService.isInteractiveMode()) this.boot();
  }

  ngOnDestroy(): void { this.destroy(); }

  hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
  }

  /** Type guard: returns true if a detail list item is a rich DetailItem object (not a plain string). */
  isDetailItem(item: string | DetailItem): item is DetailItem {
    return typeof item === 'object' && item !== null;
  }

  // ── Input Listeners ────────────────────────────────────────────
  @HostListener('window:keydown', ['$event'])
  onKeyDown(e: KeyboardEvent) {
    if (!this.gameWorldService.isInteractiveMode()) return;
    this.keys[e.code.toLowerCase()] = true;
    this.keys[e.key.toLowerCase()] = true;

    if ((e.code === 'KeyE' || e.key === 'e' || e.key === 'E' || e.code === 'Space') && this.nearbyBuilding && !this.isInsideBuilding) {
      this.enterBuilding(this.nearbyBuilding);
    }

    if ((e.code === 'KeyL' || e.key === 'l' || e.key === 'L') && !this.isInsideBuilding) {
      this.fireHomelanderLaserBeam();
    }
    if (e.code === 'Escape' && this.isInsideBuilding) {
      this.exitBuilding();
    }
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(e: KeyboardEvent) {
    if (!this.gameWorldService.isInteractiveMode()) return;
    this.keys[e.code.toLowerCase()] = false;
    this.keys[e.key.toLowerCase()] = false;
  }

  @HostListener('window:pointerdown', ['$event'])
  onPointerDown(e: PointerEvent) {
    if (!this.gameWorldService.isInteractiveMode()) return;
    this.mouseDragging = true;
    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;
  }

  @HostListener('window:pointermove', ['$event'])
  onPointerMove(e: PointerEvent) {
    if (!this.gameWorldService.isInteractiveMode()) return;

    this.mouseVec.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouseVec.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if (!this.mouseDragging) return;

    const dx = e.clientX - this.prevMouseX;
    const dy = e.clientY - this.prevMouseY;
    this.prevMouseX = e.clientX;
    this.prevMouseY = e.clientY;

    if (this.isInsideBuilding) {
      this.intCameraOrbit.yaw -= dx * 0.006;
      this.intCameraOrbit.pitch = Math.max(0.05, Math.min(0.8, this.intCameraOrbit.pitch + dy * 0.005));
    } else {
      this.cameraYaw += dx * 0.007;
      this.cameraHeight = Math.max(3.0, Math.min(14.0, this.cameraHeight - dy * 0.08));
    }
  }

  @HostListener('window:pointerup')
  onPointerUp() { this.mouseDragging = false; }

  @HostListener('window:resize')
  onResize() {
    if (!this.renderer) return;
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    [this.extCamera, this.intCamera].forEach(cam => {
      if (cam) { cam.aspect = w / h; cam.updateProjectionMatrix(); }
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  BOOT ENGINE
  // ══════════════════════════════════════════════════════════════
  private boot(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;

    this.buildExteriorScene();
    this.buildHotelInteriorScene();

    let last = performance.now();
    const loop = (now: number) => {
      if (!this.gameWorldService.isInteractiveMode()) return;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;

      if (this.isInsideBuilding) {
        this.tickHotelInterior(dt);
        this.renderer.render(this.intScene, this.intCamera);
      } else {
        this.tickExterior(dt);
        this.renderer.render(this.extScene, this.extCamera);
      }
      this.animId = requestAnimationFrame(loop);
    };
    if (this.animId) cancelAnimationFrame(this.animId);
    this.animId = requestAnimationFrame(loop);
  }

  private destroy(): void {
    if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
    this.renderer?.dispose();
  }

  // ══════════════════════════════════════════════════════════════
  //  EXTERIOR CITY SCENE WITH CLOUDS, GRASS, AND SPORTS CARS
  // ══════════════════════════════════════════════════════════════
  private buildExteriorScene(): void {
    this.extScene = new THREE.Scene();
    this.extScene.background = new THREE.Color('#38bdf8');
    this.extScene.fog = new THREE.FogExp2('#7dd3fc', 0.00045);

    const aspect = window.innerWidth / window.innerHeight;
    this.extCamera = new THREE.PerspectiveCamera(50, aspect, 0.1, 4000);
    this.updateExteriorCamera();

    const hemi = new THREE.HemisphereLight('#bae6fd', '#15803d', 1.6);
    this.extScene.add(hemi);

    const sun = new THREE.DirectionalLight('#fff7ed', 3.2);
    sun.position.set(100, 140, 80);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 650;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -260;
    sun.shadow.camera.right = sun.shadow.camera.top = 260;
    sun.shadow.bias = -0.0005;
    this.extScene.add(sun);

    this.buildNatureEnvironment();
    this.buildFloatingSkyClouds();
    this.buildSpaciousCityRoads();
    this.buildSpaciousBuildings();
    this.buildParkedSportsCars();
    this.buildStreetProps();
    this.buildCharacter();
  }

  // ─── Nature: Visible 3D Grass Blades, Endless Ocean & Mountain Ring ───
  private buildNatureEnvironment(): void {
    // City Land Mass (550x550 Grass Island)
    const grassMat = new THREE.MeshStandardMaterial({ color: '#4d7c0f', roughness: 0.85 });
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(550, 550), grassMat);
    grass.rotation.x = -Math.PI / 2;
    grass.receiveShadow = true;
    this.extScene.add(grass);

    // VAST ENDLESS OCEAN EXTENDING ALL THE WAY TO THE HORIZON BEYOND MOUNTAINS
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#0284c7', roughness: 0.15, metalness: 0.75,
      transparent: true, opacity: 0.94
    });
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), waterMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(0, -0.4, 0);
    this.extScene.add(ocean);

    // Visible 3D Grass Blades (Clusters of green blades scattered on ground)
    const bladeMat = new THREE.MeshStandardMaterial({ color: '#65a30d', roughness: 0.7 });
    for (let g = 0; g < 180; g++) {
      const a = Math.random() * Math.PI * 2;
      const r = 30 + Math.random() * 220;
      const gx = Math.sin(a) * r;
      const gz = Math.cos(a) * r;

      if (Math.abs(gx) < 20 || Math.abs(gz) < 20) continue;

      const tuft = new THREE.Group();
      tuft.position.set(gx, 0, gz);

      for (let b = 0; b < 5; b++) {
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.2 + Math.random() * 0.6, 4), bladeMat);
        blade.position.set((Math.random() - 0.5) * 0.6, 0.6, (Math.random() - 0.5) * 0.6);
        blade.rotation.z = (Math.random() - 0.5) * 0.3;
        tuft.add(blade);
      }
      this.extScene.add(tuft);
    }

    const sandMat = new THREE.MeshStandardMaterial({ color: '#d97706', roughness: 0.9 });
    for (let a = 0; a < Math.PI * 2; a += 0.12) {
      const r = 265 + Math.random() * 15;
      const sw = new THREE.Mesh(new THREE.BoxGeometry(25 + Math.random() * 10, 1.2, 25 + Math.random() * 10), sandMat);
      sw.position.set(Math.sin(a) * r, -0.2, Math.cos(a) * r);
      sw.rotation.y = a;
      this.extScene.add(sw);
    }

    const rockMats = [
      new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.85 }),
      new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.75 })
    ];
    const snowMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.4 });

    const placeMountain = (x: number, z: number, h: number, r: number) => {
      const mat = rockMats[Math.floor(Math.random() * rockMats.length)];
      const cone = new THREE.Mesh(new THREE.ConeGeometry(r, h, 10), mat);
      cone.position.set(x, h / 2, z);
      cone.castShadow = true;
      this.extScene.add(cone);

      if (h > 45) {
        const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.42, h * 0.25, 10), snowMat);
        cap.position.set(x, h * 0.84, z);
        this.extScene.add(cap);
      }
    };

    // Mountain Ring Encircling Island
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2 + (Math.random() - 0.5) * 0.2;
      const r = 275 + Math.random() * 60;
      const h = 45 + Math.random() * 85;
      const rad = 25 + Math.random() * 40;
      placeMountain(Math.sin(a) * r, Math.cos(a) * r, h, rad);
    }

    const trunkMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.9 });
    const foliageMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.7 });

    this.treeData = [];
    for (let t = 0; t < 150; t++) {
      const a = Math.random() * Math.PI * 2;
      const r = 40 + Math.random() * 240;
      const cx = Math.sin(a) * r;
      const cz = Math.cos(a) * r;

      const isOnRoad = Math.abs(cx) < 22 || Math.abs(cz) < 22;
      const nearBuilding1 = Math.hypot(cx - (-65), cz - (-65)) < 35;
      const nearBuilding2 = Math.hypot(cx - 65, cz - (-65)) < 35;
      const nearBuilding3 = Math.hypot(cx - (-65), cz - 65) < 35;
      const nearBuilding4 = Math.hypot(cx - 65, cz - 65) < 35;

      if (isOnRoad || nearBuilding1 || nearBuilding2 || nearBuilding3 || nearBuilding4) continue;

      const tg = new THREE.Group();
      tg.position.set(cx, 0, cz);

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 4, 8), trunkMat.clone());
      trunk.position.y = 2;
      trunk.castShadow = true;
      tg.add(trunk);

      const foliageArr: THREE.Mesh[] = [];
      for (let l = 0; l < 3; l++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(3.2 - l * 0.6, 4, 8), foliageMat.clone());
        cone.position.y = 4 + l * 2;
        cone.castShadow = true;
        tg.add(cone);
        foliageArr.push(cone);
      }
      this.extScene.add(tg);
      this.treeData.push({ group: tg, trunk, foliage: foliageArr, x: cx, z: cz, isDestroyed: false });
    }
  }

  // ─── Floating Volumetric Sky Clouds ───────────────────────────
  private buildFloatingSkyClouds(): void {
    const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9, transparent: true, opacity: 0.88 });
    this.clouds = [];

    for (let c = 0; c < 16; c++) {
      const cloudGroup = new THREE.Group();
      const cx = (Math.random() - 0.5) * 400;
      const cy = 60 + Math.random() * 30;
      const cz = (Math.random() - 0.5) * 400;
      cloudGroup.position.set(cx, cy, cz);

      const count = 5 + Math.floor(Math.random() * 4);
      for (let i = 0; i < count; i++) {
        const size = 12 + Math.random() * 14;
        const sphere = new THREE.Mesh(new THREE.SphereGeometry(size, 10, 10), cloudMat);
        sphere.position.set(i * 10 - 20, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 6);
        cloudGroup.add(sphere);
      }

      this.extScene.add(cloudGroup);
      this.clouds.push(cloudGroup);
    }
  }

  private buildSpaciousCityRoads(): void {
    const aspMat = new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.7 });

    const hRoad = new THREE.Mesh(new THREE.PlaneGeometry(400, 18), aspMat);
    hRoad.rotation.x = -Math.PI / 2;
    hRoad.position.set(0, 0.05, 0);
    hRoad.receiveShadow = true;
    this.extScene.add(hRoad);

    const vRoad = new THREE.Mesh(new THREE.PlaneGeometry(18, 400), aspMat);
    vRoad.rotation.x = -Math.PI / 2;
    vRoad.position.set(0, 0.06, 0);
    vRoad.receiveShadow = true;
    this.extScene.add(vRoad);

    const lineMat = new THREE.MeshBasicMaterial({ color: '#fbbf24' });
    for (let x = -190; x < 190; x += 8) {
      if (Math.abs(x) < 14) continue;
      const line = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.5), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 0.07, 0);
      this.extScene.add(line);
    }
    for (let z = -190; z < 190; z += 8) {
      if (Math.abs(z) < 14) continue;
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 4), lineMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(0, 0.07, z);
      this.extScene.add(line);
    }

    const swMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.6 });
    [[-75, -75], [75, -75], [-75, 75], [75, 75]].forEach(([x, z]) => {
      const sw = new THREE.Mesh(new THREE.BoxGeometry(90, 0.4, 90), swMat);
      sw.position.set(x, 0.2, z);
      sw.receiveShadow = true;
      sw.castShadow = true;
      this.extScene.add(sw);
    });
  }

  private buildSpaciousBuildings(): void {
    const defs = [
      { id: 'about' as PortfolioSectionKey, name: 'ABOUT ME HQ', sub: 'Bio & Experience', x: -65, z: -65, color: '#00f0ff', h: 26, w: 26, d: 26, icon: '👤' },
      { id: 'skills' as PortfolioSectionKey, name: 'SKILLS WORKSHOP', sub: 'Tech Stack Hub', x: 65, z: -65, color: '#a855f7', h: 22, w: 28, d: 24, icon: '⚡' },
      { id: 'projects' as PortfolioSectionKey, name: 'PROJECTS TOWER', sub: 'Featured Applications', x: -65, z: 65, color: '#f59e0b', h: 34, w: 24, d: 24, icon: '💻' },
      { id: 'contact' as PortfolioSectionKey, name: 'CONTACT POST', sub: 'Get In Touch', x: 65, z: 65, color: '#10b981', h: 20, w: 26, d: 26, icon: '📮' }
    ];

    this.buildings = [];

    defs.forEach(b => {
      const g = new THREE.Group();
      g.position.set(b.x, 0, b.z);

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(b.w, b.h, b.d),
        new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.25, metalness: 0.8 })
      );
      body.position.y = b.h / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      g.add(body);

      const winMat = new THREE.MeshStandardMaterial({ color: b.color, emissive: b.color, emissiveIntensity: 0.6 });
      for (let fl = 3; fl < b.h - 3; fl += 5) {
        const wn = new THREE.Mesh(new THREE.BoxGeometry(b.w - 1.5, 1.4, b.d + 0.2), winMat);
        wn.position.y = fl;
        g.add(wn);
      }

      const door = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshBasicMaterial({ color: b.color, side: THREE.DoubleSide }));
      door.position.set(0, 2.0, b.d / 2 + 0.1);
      g.add(door);

      // Ultra-thin 3D Glass Entrance Door Frame (Depth 0.05 - paper thin, zero view block!)
      const doorFrameMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.9, roughness: 0.1 });
      const doorGlassMat = new THREE.MeshStandardMaterial({ color: b.color, emissive: b.color, emissiveIntensity: 0.3, transparent: true, opacity: 0.15, roughness: 0.05 });
      const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(6.8, 5.2, 0.05), doorFrameMat);
      doorFrame.position.set(0, 2.6, b.d / 2 + 0.05);
      g.add(doorFrame);

      const glassDoorLeft = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 4.8), doorGlassMat);
      glassDoorLeft.position.set(-1.4, 2.5, b.d / 2 + 0.08);
      g.add(glassDoorLeft);

      const glassDoorRight = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 4.8), doorGlassMat);
      glassDoorRight.position.set(1.4, 2.5, b.d / 2 + 0.08);
      g.add(glassDoorRight);

      // Glowing Entrance Rug
      const rugMat = new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.6 });
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 4.0), rugMat);
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(0, 0.08, b.d / 2 + 2.2);
      g.add(rug);

      const spire = new THREE.Mesh(new THREE.ConeGeometry(2.5, 8, 4), new THREE.MeshStandardMaterial({ color: b.color, emissive: b.color, emissiveIntensity: 1.2 }));
      spire.position.y = b.h + 4;
      g.add(spire);

      // 3D Illuminated Banner Outside Building (50% LARGER for maximum readability)
      const bannerGroup = new THREE.Group();
      bannerGroup.position.set(0, 12, b.d / 2 + 5);

      const poleMat = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8 });
      const leftPole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 12, 12), poleMat);
      leftPole.position.set(-9.5, -5.5, 0);
      bannerGroup.add(leftPole);

      const rightPole = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 12, 12), poleMat);
      rightPole.position.set(9.5, -5.5, 0);
      bannerGroup.add(rightPole);

      const canvas = document.createElement('canvas');
      canvas.width = 768; canvas.height = 192;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 768, 192);
      ctx.strokeStyle = b.color; ctx.lineWidth = 18; ctx.strokeRect(9, 9, 750, 174);
      ctx.fillStyle = b.color; ctx.font = 'bold 54px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${b.icon} ${b.name}`, 384, 78);
      ctx.fillStyle = '#cbd5e1'; ctx.font = '33px sans-serif'; ctx.fillText(b.sub, 384, 142);

      const bannerTexture = new THREE.CanvasTexture(canvas);
      const bannerMat = new THREE.MeshStandardMaterial({
        map: bannerTexture, emissiveMap: bannerTexture, emissive: '#ffffff', emissiveIntensity: 0.4, roughness: 0.3
      });

      const bannerBoard = new THREE.Mesh(new THREE.BoxGeometry(21, 5.1, 0.6), bannerMat);
      bannerBoard.castShadow = true;
      bannerGroup.add(bannerBoard);

      const bannerLight = new THREE.PointLight(b.color, 6.0, 45);
      bannerLight.position.set(0, 0, 3);
      bannerGroup.add(bannerLight);

      g.add(bannerGroup);

      this.extScene.add(g);
      this.buildings.push({ id: b.id, name: b.name, sub: b.sub, x: b.x, z: b.z, color: b.color, mesh: g });
    });
  }

  // ─── High-End Luxury Sports Cars Parked at Each Building ─────
  private buildParkedSportsCars(): void {
    const carColors = ['#ef4444', '#00f0ff', '#f59e0b', '#10b981'];
    const carPlacements = [
      { x: -50, z: -48, rot: Math.PI / 4, color: carColors[0] },
      { x: 50, z: -48, rot: -Math.PI / 4, color: carColors[1] },
      { x: -50, z: 48, rot: (3 * Math.PI) / 4, color: carColors[2] },
      { x: 50, z: 48, rot: -(3 * Math.PI) / 4, color: carColors[3] }
    ];

    carPlacements.forEach(pos => {
      const carGroup = new THREE.Group();
      carGroup.position.set(pos.x, 0.2, pos.z);
      carGroup.rotation.y = pos.rot;

      const paintMat = new THREE.MeshStandardMaterial({ color: pos.color, metalness: 0.9, roughness: 0.15 });
      const glassMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.9, roughness: 0.1, transparent: true, opacity: 0.85 });
      const tireMat  = new THREE.MeshStandardMaterial({ color: '#111827', roughness: 0.8 });
      const rimMat   = new THREE.MeshStandardMaterial({ color: '#f1f5f9', metalness: 0.95, roughness: 0.1 });
      const headMat  = new THREE.MeshBasicMaterial({ color: '#fef08a' });

      // Lower Car Chassis
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.8, 6.8), paintMat);
      chassis.position.y = 0.6;
      chassis.castShadow = true;
      carGroup.add(chassis);

      // Aerodynamic Cabin Roof
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.75, 3.4), glassMat);
      cabin.position.set(0, 1.35, -0.2);
      cabin.castShadow = true;
      carGroup.add(cabin);

      // Rear Spoiler
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.15, 0.8), paintMat);
      spoiler.position.set(0, 1.4, -3.1);
      carGroup.add(spoiler);

      // Dual Headlights
      [-1.3, 1.3].forEach(hx => {
        const hl = new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 10), headMat);
        hl.position.set(hx, 0.6, 3.4);
        carGroup.add(hl);

        const hLight = new THREE.PointLight('#fef08a', 2.0, 10);
        hLight.position.set(hx, 0.6, 3.6);
        carGroup.add(hLight);
      });

      // 4 Sports Alloy Wheels
      [[-1.8, 2.0], [1.8, 2.0], [-1.8, -2.0], [1.8, -2.0]].forEach(([wx, wz]) => {
        const wheelGroup = new THREE.Group();
        wheelGroup.position.set(wx, 0.5, wz);

        const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16), tireMat);
        tire.rotation.z = Math.PI / 2;
        tire.castShadow = true;
        wheelGroup.add(tire);

        const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.42, 12), rimMat);
        rim.rotation.z = Math.PI / 2;
        wheelGroup.add(rim);

        carGroup.add(wheelGroup);
      });

      this.extScene.add(carGroup);
    });
  }

  private buildStreetProps(): void {
    const pm = new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8 });
    const bm = new THREE.MeshBasicMaterial({ color: '#fef08a' });

    [
      [-15, -15], [15, -15], [-15, 15], [15, 15],
      [-50, -15], [50, -15], [-50, 15], [50, 15],
      [-15, -50], [15, -50], [-15, 50], [15, 50]
    ].forEach(([x, z]) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 9, 12), pm);
      pole.position.y = 4.5; pole.castShadow = true; g.add(pole);

      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.16, 0.16), pm);
      arm.position.set(0.7, 8.8, 0); g.add(arm);

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 12), bm);
      bulb.position.set(1.4, 8.6, 0); g.add(bulb);

      const light = new THREE.PointLight('#fef3c7', 2.8, 24);
      light.position.set(1.4, 8.2, 0); light.castShadow = true; g.add(light);

      this.extScene.add(g);
    });
  }

  private buildCharacter(): void {
    this.playerGroup = new THREE.Group();
    this.bodyGroup = new THREE.Group();

    // 🦸‍♂️ HOMELANDER SUIT & APPAREL MATERIALS
    const skin = new THREE.MeshStandardMaterial({ color: '#fca5a5', roughness: 0.4 });
    const hair = new THREE.MeshStandardMaterial({ color: '#eab308', metalness: 0.2, roughness: 0.3 }); // Blonde slicked hair
    const suitBlue = new THREE.MeshStandardMaterial({ color: '#1e3a8a', metalness: 0.3, roughness: 0.35 }); // Royal blue hero suit
    const goldArmor = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.95, roughness: 0.15 }); // Gold eagle epaulets & belt
    const redCape = new THREE.MeshStandardMaterial({ color: '#b91c1c', roughness: 0.4, side: THREE.DoubleSide }); // Flowing red superhero cape
    const redLeather = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.3 }); // Red boots & gloves
    const laserMat = new THREE.MeshBasicMaterial({ color: '#ef4444' }); // Glowing laser eyes

    // Royal Blue Torso Suit
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.42, 1.4, 16), suitBlue);
    torso.position.y = 1.9; torso.castShadow = true; this.bodyGroup.add(torso);

    // Eagle Armor Gold Chest Emblems & Gold Belt
    const goldBelt = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.18, 16), goldArmor);
    goldBelt.position.y = 1.25; this.bodyGroup.add(goldBelt);

    // Gold Eagle Shoulder Epaulets
    const leftEpaulet = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.42), goldArmor);
    leftEpaulet.position.set(-0.54, 2.5, 0); this.bodyGroup.add(leftEpaulet);

    const rightEpaulet = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.18, 0.42), goldArmor);
    rightEpaulet.position.set(0.54, 2.5, 0); this.bodyGroup.add(rightEpaulet);

    // Flowing Red Superhero Cape (Behind Back)
    const capeShape = new THREE.BufferGeometry();
    const capeVerts = new Float32Array([
      -0.5, 2.5, -0.25,   0.5, 2.5, -0.25,  -0.7, 0.3, -0.4,
       0.5, 2.5, -0.25,   0.7, 0.3, -0.4,   -0.7, 0.3, -0.4
    ]);
    capeShape.setAttribute('position', new THREE.BufferAttribute(capeVerts, 3));
    capeShape.computeVertexNormals();
    const capeMesh = new THREE.Mesh(capeShape, redCape);
    capeMesh.castShadow = true;
    this.bodyGroup.add(capeMesh);

    // Neck & Head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.3, 12), skin);
    neck.position.y = 2.75; this.bodyGroup.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 20), skin);
    head.position.y = 3.25; head.castShadow = true; this.bodyGroup.add(head);

    // Slicked Blonde Hero Hair
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.85), hair);
    hairCap.position.set(0, 3.32, -0.02); this.bodyGroup.add(hairCap);

    const hairSlick = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.32), hair);
    hairSlick.position.set(0, 3.62, 0.12); hairSlick.rotation.x = -0.2; this.bodyGroup.add(hairSlick);

    // Glowing Laser Eyes
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), laserMat);
    leftEye.position.set(-0.14, 3.3, 0.38); this.bodyGroup.add(leftEye);

    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), laserMat);
    rightEye.position.set(0.14, 3.3, 0.38); this.bodyGroup.add(rightEye);

    const laserLight = new THREE.PointLight('#ef4444', 1.5, 4);
    laserLight.position.set(0, 3.3, 0.5); this.bodyGroup.add(laserLight);

    // Legs with Red Superhero Boots
    const thighGeo = new THREE.CylinderGeometry(0.21, 0.16, 0.75, 14);
    const calfGeo = new THREE.CylinderGeometry(0.16, 0.12, 0.75, 14);
    const shoeGeo = new THREE.BoxGeometry(0.28, 0.22, 0.55);

    const makeLeg = (sx: number): [THREE.Group, THREE.Group] => {
      const thigh = new THREE.Group(); thigh.position.set(sx, 1.25, 0);
      const tm = new THREE.Mesh(thighGeo, suitBlue); tm.position.y = -0.375; tm.castShadow = true; thigh.add(tm);

      const calf = new THREE.Group(); calf.position.set(0, -0.75, 0);
      const cm = new THREE.Mesh(calfGeo, redLeather); cm.position.y = -0.375; cm.castShadow = true; calf.add(cm);

      const sm = new THREE.Mesh(shoeGeo, redLeather); sm.position.set(0, -0.82, 0.12); sm.castShadow = true; calf.add(sm);
      thigh.add(calf);
      return [thigh, calf];
    };

    [this.leftThigh, this.leftCalf] = makeLeg(-0.26);
    [this.rightThigh, this.rightCalf] = makeLeg(0.26);
    this.bodyGroup.add(this.leftThigh, this.rightThigh);

    // Arms with Red Gauntlets/Gloves
    const uArmGeo = new THREE.CylinderGeometry(0.155, 0.13, 0.65, 12);
    const fArmGeo = new THREE.CylinderGeometry(0.13, 0.1, 0.65, 12);
    const handGeo = new THREE.SphereGeometry(0.115, 10, 10);

    const makeArm = (sx: number): [THREE.Group, THREE.Group] => {
      const upper = new THREE.Group(); upper.position.set(sx, 2.4, 0);
      const um = new THREE.Mesh(uArmGeo, suitBlue); um.position.y = -0.325; um.castShadow = true; upper.add(um);

      const fore = new THREE.Group(); fore.position.set(0, -0.65, 0);
      const fm = new THREE.Mesh(fArmGeo, redLeather); fm.position.y = -0.325; fm.castShadow = true; fore.add(fm);

      const hm = new THREE.Mesh(handGeo, redLeather); hm.position.y = -0.7; fore.add(hm);
      upper.add(fore);
      return [upper, fore];
    };

    [this.leftUpperArm, this.leftForearm] = makeArm(-0.62);
    [this.rightUpperArm, this.rightForearm] = makeArm(0.62);
    this.bodyGroup.add(this.leftUpperArm, this.rightUpperArm);

    const pLight = new THREE.PointLight('#38bdf8', 1.8, 9);
    pLight.position.set(0, 2.5, 0);
    this.playerGroup.add(pLight);

    this.playerGroup.add(this.bodyGroup);
    this.playerGroup.position.set(this.player.x, 0, this.player.z);
    this.playerGroup.rotation.y = this.player.rotation;
    this.extScene.add(this.playerGroup);
  }

  // ══════════════════════════════════════════════════════════════
  //  BRIGHT & LUXURIOUS 5-STAR HOTEL INTERIOR WITH MANAGER
  // ══════════════════════════════════════════════════════════════
  private buildHotelInteriorScene(): void {
    this.intScene = new THREE.Scene();
    this.intScene.background = new THREE.Color('#1e293b');

    const aspect = window.innerWidth / window.innerHeight;
    this.intCamera = new THREE.PerspectiveCamera(50, aspect, 0.1, 300);

    const ambientSky = new THREE.AmbientLight('#fef08a', 2.2);
    this.intScene.add(ambientSky);

    const chandelierLight = new THREE.PointLight('#fef9c3', 7.0, 80);
    chandelierLight.position.set(0, 15, 0);
    chandelierLight.castShadow = true;
    this.intScene.add(chandelierLight);

    const receptionSpot = new THREE.SpotLight('#fbbf24', 6.0, 50, Math.PI / 3, 0.3);
    receptionSpot.position.set(0, 17, -8);
    receptionSpot.target.position.set(0, 3, -18);
    this.intScene.add(receptionSpot);
    this.intScene.add(receptionSpot.target);

    [[-18, -8], [18, -8], [-18, 8], [18, 8]].forEach(([x, z]) => {
      const sconceLight = new THREE.PointLight('#fef08a', 3.0, 20);
      sconceLight.position.set(x, 9, z);
      this.intScene.add(sconceLight);
    });

    const floorMat = new THREE.MeshStandardMaterial({
      color: '#334155', roughness: 0.1, metalness: 0.85
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(42, 52), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.intScene.add(floor);

    const carpetMat = new THREE.MeshStandardMaterial({ color: '#854d0e', roughness: 0.7 });
    const carpet = new THREE.Mesh(new THREE.PlaneGeometry(10, 44), carpetMat);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(0, 0.05, 1);
    carpet.receiveShadow = true;
    this.intScene.add(carpet);

    const goldEdgeMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.9, roughness: 0.2 });
    [-5.1, 5.1].forEach(x => {
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 44), goldEdgeMat);
      edge.position.set(x, 0.06, 1);
      this.intScene.add(edge);
    });

    const wallMat = new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.4 });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(42, 18), wallMat);
    backWall.position.set(0, 9, -20);
    this.intScene.add(backWall);

    [[-21, 0], [21, 0]].forEach(([x]) => {
      const sw = new THREE.Mesh(new THREE.PlaneGeometry(52, 18), wallMat);
      sw.position.set(x, 9, 0);
      sw.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      this.intScene.add(sw);
    });

    // Ultra-thin 3D SOUTH EXIT DOOR (Walk South to step outside)
    const exitDoorMat = new THREE.MeshStandardMaterial({ color: '#78350f', transparent: true, opacity: 0.35, roughness: 0.3 });
    const exitDoorFrame = new THREE.Mesh(new THREE.BoxGeometry(8.5, 6.2, 0.05), goldEdgeMat);
    exitDoorFrame.position.set(0, 3.1, 20.0);
    this.intScene.add(exitDoorFrame);

    const exitDoorLeft = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5.6), exitDoorMat);
    exitDoorLeft.position.set(-1.9, 2.8, 19.9);
    this.intScene.add(exitDoorLeft);

    const exitDoorRight = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5.6), exitDoorMat);
    exitDoorRight.position.set(1.9, 2.8, 19.9);
    this.intScene.add(exitDoorRight);

    const exitSignCanvas = document.createElement('canvas');
    exitSignCanvas.width = 256; exitSignCanvas.height = 64;
    const exitCtx = exitSignCanvas.getContext('2d')!;
    exitCtx.fillStyle = '#0f172a'; exitCtx.fillRect(0, 0, 256, 64);
    exitCtx.fillStyle = '#ef4444'; exitCtx.font = 'bold 26px sans-serif'; exitCtx.textAlign = 'center';
    exitCtx.fillText('🚪 EXIT TO CITY', 128, 42);

    const exitSignTexture = new THREE.CanvasTexture(exitSignCanvas);
    const exitSignMesh = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 1.2), new THREE.MeshBasicMaterial({ map: exitSignTexture }));
    exitSignMesh.position.set(0, 6.8, 19.6);
    this.intScene.add(exitSignMesh);

    const pillarMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.2, metalness: 0.7 });
    [[-14, -10], [14, -10], [-14, 8], [14, 8]].forEach(([x, z]) => {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 17, 16), pillarMat);
      p.position.set(x, 8.5, z);
      p.castShadow = true;
      this.intScene.add(p);

      const cap = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.6, 2.3), goldEdgeMat);
      cap.position.set(x, 16.8, z);
      this.intScene.add(cap);
    });

    // GRAND RECEPTION DESK WITH ACCESSORIES & COMPUTER MONITOR
    const deskGroup = new THREE.Group();
    deskGroup.position.set(0, 0, -15);

    const deskFront = new THREE.Mesh(new THREE.BoxGeometry(15, 2.6, 3.8), new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.9, roughness: 0.2 }));
    deskFront.position.y = 1.3;
    deskFront.castShadow = true;
    deskGroup.add(deskFront);

    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.3, 4.2), goldEdgeMat);
    deskTop.position.y = 2.75;
    deskGroup.add(deskTop);

    // Realistic Accessories: Bell, Vase, Computer Monitor
    const bellMat = new THREE.MeshStandardMaterial({ color: '#fbbf24', metalness: 0.95, roughness: 0.1 });
    const bell = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.3, 12), bellMat);
    bell.position.set(-3.5, 3.0, 0.5);
    deskGroup.add(bell);

    const vaseMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.1 });
    const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.9, 12), vaseMat);
    vase.position.set(3.5, 3.3, 0.5);
    deskGroup.add(vase);

    const flowerMat = new THREE.MeshBasicMaterial({ color: '#f43f5e' });
    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), flowerMat);
    flower.position.set(3.5, 3.9, 0.5);
    deskGroup.add(flower);

    // Desk Computer Monitor
    const monStand = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 0.8, 12), new THREE.MeshStandardMaterial({ color: '#334155', metalness: 0.8 }));
    monStand.position.set(0, 3.3, 0.2);
    deskGroup.add(monStand);

    const monScreen = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 0.1), new THREE.MeshBasicMaterial({ color: '#00f0ff' }));
    monScreen.position.set(0, 4.1, 0.2);
    deskGroup.add(monScreen);

    this.intScene.add(deskGroup);

    // 3D HOTEL MANAGER CHARACTER STANDING BEHIND RECEPTION DESK
    this.buildHotelManagerCharacter();

    this.buildHotelDecorations();
    this.buildHotelInteriorCharacter();
  }

  private buildHotelManagerCharacter(): void {
    this.managerGroup = new THREE.Group();
    this.managerGroup.position.set(0, 0, -17.2); // Positioned behind desk at z=-17.2 facing South (+Z)
    this.managerGroup.rotation.y = Math.PI;

    const suitMat  = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.3, roughness: 0.4 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.3 });
    const tieMat   = new THREE.MeshStandardMaterial({ color: '#dc2626', roughness: 0.3 });
    const skinMat  = new THREE.MeshStandardMaterial({ color: '#fed7aa', roughness: 0.5 });
    const hairMat  = new THREE.MeshStandardMaterial({ color: '#172554', roughness: 0.3 });

    // Suit Torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.4, 1.4, 16), suitMat);
    torso.position.y = 1.9;
    this.managerGroup.add(torso);

    // White Shirt V-Neck & Red Tie
    const shirtV = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.6), shirtMat);
    shirtV.position.set(0, 2.2, 0.22);
    this.managerGroup.add(shirtV);

    const tie = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.5), tieMat);
    tie.position.set(0, 2.15, 0.23);
    this.managerGroup.add(tie);

    // Head & Hair
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.4, 20, 20), skinMat);
    head.position.y = 3.25;
    this.managerGroup.add(head);

    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.44, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.9), hairMat);
    hair.position.set(0, 3.3, -0.02);
    this.managerGroup.add(hair);

    this.intScene.add(this.managerGroup);
  }

  private buildHotelDecorations(): void {
    const sofaMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.6 });
    const tableMat = new THREE.MeshStandardMaterial({ color: '#0f172a', metalness: 0.9, roughness: 0.2 });
    const potMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', metalness: 0.8, roughness: 0.3 });
    const palmMat = new THREE.MeshStandardMaterial({ color: '#16a34a', roughness: 0.6 });

    [[-16, 0], [16, 0]].forEach(([x, z]) => {
      const loungeGroup = new THREE.Group();
      loungeGroup.position.set(x, 0, z);
      loungeGroup.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;

      const seat = new THREE.Mesh(new THREE.BoxGeometry(6, 0.8, 2.5), sofaMat);
      seat.position.set(0, 0.6, 0);
      seat.castShadow = true;
      loungeGroup.add(seat);

      const back = new THREE.Mesh(new THREE.BoxGeometry(6, 1.8, 0.6), sofaMat);
      back.position.set(0, 1.5, -1.0);
      back.castShadow = true;
      loungeGroup.add(back);

      const table = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.8, 16), tableMat);
      table.position.set(0, 0.4, 2.5);
      table.castShadow = true;
      loungeGroup.add(table);

      this.intScene.add(loungeGroup);
    });

    [[-17, -16], [17, -16], [-17, 16], [17, 16]].forEach(([x, z]) => {
      const plantGroup = new THREE.Group();
      plantGroup.position.set(x, 0, z);

      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.7, 1.8, 16), potMat);
      pot.position.y = 0.9;
      pot.castShadow = true;
      plantGroup.add(pot);

      for (let i = 0; i < 4; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.5, 8), palmMat);
        leaf.rotation.z = (Math.PI / 6) * (i % 2 === 0 ? 1 : -1);
        leaf.position.set(0, 2.8 + i * 0.4, 0);
        leaf.castShadow = true;
        plantGroup.add(leaf);
      }

      this.intScene.add(plantGroup);
    });
  }

  private buildHotelInteriorCharacter(): void {
    this.intPlayerGroup = new THREE.Group();
    this.intBodyGroup = new THREE.Group();

    const skin = new THREE.MeshStandardMaterial({ color: '#fdba74', roughness: 0.5 });
    const hair = new THREE.MeshStandardMaterial({ color: '#1e1b4b', roughness: 0.3 });
    const shirt = new THREE.MeshStandardMaterial({ color: '#2563eb', metalness: 0.2, roughness: 0.4 });
    const pants = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.7 });
    const shoe = new THREE.MeshStandardMaterial({ color: '#f1f5f9', roughness: 0.3 });

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.42, 1.4, 16), shirt);
    torso.position.y = 1.9; torso.castShadow = true; this.intBodyGroup.add(torso);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.3, 12), skin);
    neck.position.y = 2.75; this.intBodyGroup.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 20, 20), skin);
    head.position.y = 3.25; head.castShadow = true; this.intBodyGroup.add(head);

    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.46, 16, 16, 0, Math.PI * 2, 0, Math.PI / 1.85), hair);
    hairCap.position.set(0, 3.3, -0.02); this.intBodyGroup.add(hairCap);

    const thighGeo = new THREE.CylinderGeometry(0.21, 0.16, 0.75, 14);
    const calfGeo = new THREE.CylinderGeometry(0.16, 0.12, 0.75, 14);
    const shoeGeo = new THREE.BoxGeometry(0.28, 0.2, 0.55);

    const makeLeg = (sx: number): [THREE.Group, THREE.Group] => {
      const thigh = new THREE.Group(); thigh.position.set(sx, 1.25, 0);
      const tm = new THREE.Mesh(thighGeo, pants); tm.position.y = -0.375; tm.castShadow = true; thigh.add(tm);

      const calf = new THREE.Group(); calf.position.set(0, -0.75, 0);
      const cm = new THREE.Mesh(calfGeo, pants); cm.position.y = -0.375; cm.castShadow = true; calf.add(cm);

      const sm = new THREE.Mesh(shoeGeo, shoe); sm.position.set(0, -0.82, 0.12); sm.castShadow = true; calf.add(sm);
      thigh.add(calf);
      return [thigh, calf];
    };

    [this.intLeftThigh, this.intLeftCalf] = makeLeg(-0.26);
    [this.intRightThigh, this.intRightCalf] = makeLeg(0.26);
    this.intBodyGroup.add(this.intLeftThigh, this.intRightThigh);

    const uArmGeo = new THREE.CylinderGeometry(0.155, 0.13, 0.65, 12);
    const fArmGeo = new THREE.CylinderGeometry(0.13, 0.1, 0.65, 12);
    const handGeo = new THREE.SphereGeometry(0.115, 10, 10);

    const makeArm = (sx: number): [THREE.Group, THREE.Group] => {
      const upper = new THREE.Group(); upper.position.set(sx, 2.4, 0);
      const um = new THREE.Mesh(uArmGeo, shirt); um.position.y = -0.325; um.castShadow = true; upper.add(um);

      const fore = new THREE.Group(); fore.position.set(0, -0.65, 0);
      const fm = new THREE.Mesh(fArmGeo, skin); fm.position.y = -0.325; fm.castShadow = true; fore.add(fm);

      const hm = new THREE.Mesh(handGeo, skin); hm.position.y = -0.7; fore.add(hm);
      upper.add(fore);
      return [upper, fore];
    };

    [this.intLeftUpperArm, this.intLeftForearm] = makeArm(-0.62);
    [this.intRightUpperArm, this.intRightForearm] = makeArm(0.62);
    this.intBodyGroup.add(this.intLeftUpperArm, this.intRightUpperArm);

    this.intPlayerGroup.add(this.intBodyGroup);
    this.intPlayerGroup.position.set(this.intPlayer.x, 0, this.intPlayer.z);
    this.intScene.add(this.intPlayerGroup);
  }

  // ══════════════════════════════════════════════════════════════
  //  ENTER HOTEL BUILDING & POPULATE WIDER 3D PICTURE FRAMES
  // ══════════════════════════════════════════════════════════════
  enterBuilding(building: Building3D): void {
    const now = performance.now();
    if (now - this.lastDoorTransitionTime < 1200) return; // 1.2s cooldown to prevent glitching loop
    this.lastDoorTransitionTime = now;

    this.isInsideBuilding = true;
    this.enteredBuilding = building;
    this.hoveredFrameData = null;
    this.isNearReception = false;

    // Spawn Player safely inside Hotel Lobby at z=12.0 facing North (-Z) toward Reception Desk
    this.intPlayer.x = 0;
    this.intPlayer.z = 12.0;
    this.intPlayer.vx = 0;
    this.intPlayer.vz = 0;
    this.intPlayer.rotation = 0; // 0 = Facing NORTH (-Z) toward reception desk
    this.intCameraOrbit.yaw = 0;
    this.intCameraOrbit.pitch = 0.22;

    // 100% CLEAN UP PREVIOUS BUILDING'S PICTURE FRAMES FROM SCENE
    if (this.pictureFrameMeshes.length > 0) {
      this.pictureFrameMeshes.forEach(mesh => {
        if (mesh.parent) mesh.parent.remove(mesh);
        this.intScene.remove(mesh);
      });
      this.pictureFrameMeshes = [];
    }

    if (this.pictureFrameGroups.length > 0) {
      this.pictureFrameGroups.forEach(group => {
        this.intScene.remove(group);
      });
      this.pictureFrameGroups = [];
    }

    this.pictureFrameDataMap.clear();

    const framesData = this.getPictureFramesDataForBuilding(building.id);
    const totalFrames = framesData.length;

    // DYNAMICALLY PROPORTIONED 3D PICTURE FRAMES (Zero overlap, perfectly spaced per building)
    const availableSpan = 34.0;
    const spacing = Math.min(11.0, availableSpan / Math.max(1, totalFrames));
    const frameWidth = Math.max(5.4, spacing - 1.0); // Ensures 1.0 unit clear gap between adjacent frames
    const frameHeight = frameWidth * 0.58;
    const startX = -((totalFrames - 1) * spacing) / 2;

    framesData.forEach((frameData, index) => {
      const posX = startX + index * spacing;
      const posY = 7.5;
      const posZ = -19.5;

      const frameGroup = new THREE.Group();
      frameGroup.position.set(posX, posY, posZ);

      const borderMat = new THREE.MeshStandardMaterial({
        color: '#f59e0b', metalness: 0.9, roughness: 0.2, emissive: building.color, emissiveIntensity: 0.35
      });
      const borderMesh = new THREE.Mesh(new THREE.BoxGeometry(frameWidth, frameHeight, 0.35), borderMat);
      frameGroup.add(borderMesh);

      const canvas = document.createElement('canvas');
      canvas.width = 1024; canvas.height = 512;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, 1024, 512);
      ctx.strokeStyle = building.color; ctx.lineWidth = 18; ctx.strokeRect(14, 14, 996, 484);

      if (frameData.imageIcon) {
        const img = new Image();
        img.src = frameData.imageIcon;
        img.onload = () => {
          ctx.drawImage(img, 512 - 55, 50, 110, 110);
          texture.needsUpdate = true;
        };
      } else {
        ctx.font = '105px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(frameData.icon, 512, 150);
      }

      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 48px "Space Grotesk", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(frameData.title, 512, 270);
      ctx.fillStyle = '#cbd5e1'; ctx.font = '32px sans-serif';
      ctx.fillText(frameData.subtitle, 512, 350);

      ctx.fillStyle = building.color; ctx.font = 'bold 28px sans-serif';
      ctx.fillText('HOVER FOR FULL DETAILS', 512, 440);

      const texture = new THREE.CanvasTexture(canvas);
      const canvasMat = new THREE.MeshBasicMaterial({ map: texture });
      const pictureCanvasMesh = new THREE.Mesh(new THREE.PlaneGeometry(frameWidth - 0.45, frameHeight - 0.45), canvasMat);
      pictureCanvasMesh.position.z = 0.2;
      frameGroup.add(pictureCanvasMesh);

      const hitMesh = new THREE.Mesh(
        new THREE.BoxGeometry(frameWidth, frameHeight, 0.4),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hitMesh.position.set(posX, posY, posZ);
      this.intScene.add(hitMesh);

      this.pictureFrameMeshes.push(hitMesh);
      this.pictureFrameGroups.push(frameGroup);
      this.pictureFrameDataMap.set(hitMesh, frameData);

      this.intScene.add(frameGroup);
    });

    this.gameWorldService.currentInteractionPrompt.set(null);
  }

  exitBuilding(): void {
    const now = performance.now();
    if (now - this.lastDoorTransitionTime < 1200) return; // 1.2s cooldown to prevent glitching loop
    this.lastDoorTransitionTime = now;

    // Spawn exterior character safely outside the entrance door (z = doorZ + 8.0) facing South (+Z)
    if (this.enteredBuilding) {
      const b = this.enteredBuilding;
      this.player.x = b.x;
      this.player.z = b.z + 22.0; // Safely 8 units outside entrance door trigger area (dist < 4.5)
      this.player.vx = 0;
      this.player.vz = 0;
      this.player.rotation = Math.PI; // Facing South away from building
    }

    this.isInsideBuilding = false;
    this.enteredBuilding = null;
    this.hoveredFrameData = null;
    if (this._hideCardTimer) { clearTimeout(this._hideCardTimer); this._hideCardTimer = null; }
    this.gameWorldService.currentInteractionPrompt.set(null);
  }

  // _mouseOnCard blocks raycaster from scheduling hide timers while cursor is inside the card
  onCardMouseEnter(): void {
    this._mouseOnCard = true;
    // Cancel any in-flight hide timer — mouse entered the card
    if (this._hideCardTimer) { clearTimeout(this._hideCardTimer); this._hideCardTimer = null; }
  }

  onCardMouseLeave(): void {
    this._mouseOnCard = false;
    // Mouse left the card boundary — hide after short delay
    this._hideCardTimer = setTimeout(() => {
      this.hoveredFrameData = null;
      this._hideCardTimer = null;
    }, 300);
  }

  // ══════════════════════════════════════════════════════════════
  //  TICK HOTEL INTERIOR (Player Walking + Camera + Raycasting)
  // ══════════════════════════════════════════════════════════════
  private tickHotelInterior(dt: number): void {
    let rawX = 0, rawZ = 0;
    if (this.keys['arrowleft'] || this.keys['keya'] || this.touchDirs.left) rawX -= 1;
    if (this.keys['arrowright'] || this.keys['keyd'] || this.touchDirs.right) rawX += 1;
    if (this.keys['arrowup'] || this.keys['keyw'] || this.touchDirs.up) rawZ -= 1;   // W/UP = move FORWARD (-Z) toward Reception Desk!
    if (this.keys['arrowdown'] || this.keys['keys'] || this.touchDirs.down) rawZ += 1; // S/DOWN = move BACKWARD (+Z) toward Entrance!

    if (this.joystickVector.x !== 0 || this.joystickVector.z !== 0) {
      rawX += this.joystickVector.x;
      rawZ += this.joystickVector.z;
    }

    const isMoving = rawX !== 0 || rawZ !== 0;

    if (isMoving) {
      const len = Math.hypot(rawX, rawZ);
      rawX /= len; rawZ /= len;

      const dx = this.intPlayer.x - this.intCamera.position.x;
      const dz = this.intPlayer.z - this.intCamera.position.z;
      const camLen = Math.hypot(dx, dz) || 1;

      const fwdX = dx / camLen;
      const fwdZ = dz / camLen;
      const rgtX = -fwdZ;
      const rgtZ = fwdX;

      const moveX = rawX * rgtX - rawZ * fwdX;
      const moveZ = rawX * rgtZ - rawZ * fwdZ;

      const acc = this.intPlayer.speed * dt * 6;
      this.intPlayer.vx += moveX * acc;
      this.intPlayer.vz += moveZ * acc;

      const targetAngle = Math.atan2(moveX, moveZ);
      this.intPlayer.rotation = THREE.MathUtils.lerp(this.intPlayer.rotation, targetAngle, 0.2);

      this.intPlayer.strideTime += dt * 7.5;
      const s = Math.sin(this.intPlayer.strideTime);

      this.intBodyGroup.position.y = Math.abs(s) * 0.1;
      this.intLeftThigh.rotation.x = s * 0.6;
      this.intRightThigh.rotation.x = -s * 0.6;
      this.intLeftCalf.rotation.x = Math.max(0, -s * 0.7);
      this.intRightCalf.rotation.x = Math.max(0, s * 0.7);
      this.intLeftUpperArm.rotation.x = -s * 0.45;
      this.intRightUpperArm.rotation.x = s * 0.45;
    } else {
      this.intPlayer.strideTime += dt * 1.8;
      this.intBodyGroup.position.y = Math.sin(this.intPlayer.strideTime) * 0.02;
    }

    this.intPlayer.vx *= this.intPlayer.friction;
    this.intPlayer.vz *= this.intPlayer.friction;

    this.intPlayer.x = Math.max(-16, Math.min(16, this.intPlayer.x + this.intPlayer.vx));
    this.intPlayer.z = Math.max(-12, Math.min(23, this.intPlayer.z + this.intPlayer.vz));

    this.intPlayerGroup.position.set(this.intPlayer.x, 0, this.intPlayer.z);
    this.intPlayerGroup.rotation.y = this.intPlayer.rotation;

    // AUTOMATIC EXIT DOOR TRIGGER: Walk south to entrance doors (z >= 21.0)
    if (this.intPlayer.z >= 21.0) {
      this.exitBuilding();
      return;
    }

    // Manager Idle Breathing Animation
    if (this.managerGroup) {
      this.managerGroup.position.y = Math.sin(performance.now() * 0.002) * 0.03;
    }

    this.isNearReception = this.intPlayer.z <= -2;

    const behindX = this.intPlayer.x + Math.sin(this.intCameraOrbit.yaw) * this.intCameraOrbit.dist;
    const behindZ = this.intPlayer.z + Math.cos(this.intCameraOrbit.yaw) * this.intCameraOrbit.dist;
    const height = 4.5 + Math.sin(this.intCameraOrbit.pitch) * 6;

    this.intCamera.position.x = THREE.MathUtils.lerp(this.intCamera.position.x, behindX, 0.1);
    this.intCamera.position.y = THREE.MathUtils.lerp(this.intCamera.position.y, height, 0.1);
    this.intCamera.position.z = THREE.MathUtils.lerp(this.intCamera.position.z, behindZ, 0.1);

    this.intCamera.lookAt(this.intPlayer.x, 3.5, this.intPlayer.z - 4);

    // Raycaster: show card on hit; only schedule hide when mouse is NOT on the card
    if (this.pictureFrameMeshes.length > 0) {
      this.raycaster.setFromCamera(this.mouseVec, this.intCamera);
      const intersects = this.raycaster.intersectObjects(this.pictureFrameMeshes);
      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        if (this.pictureFrameDataMap.has(hitMesh)) {
          // Hit a frame — cancel any hide timer and show immediately
          if (this._hideCardTimer) { clearTimeout(this._hideCardTimer); this._hideCardTimer = null; }
          this.hoveredFrameData = this.pictureFrameDataMap.get(hitMesh)!;
        }
      } else if (!this._mouseOnCard) {
        // No hit AND mouse is NOT on the card — schedule hide (once)
        if (this.hoveredFrameData && !this._hideCardTimer) {
          this._hideCardTimer = setTimeout(() => {
            this.hoveredFrameData = null;
            this._hideCardTimer = null;
          }, 500);
        }
      }
      // If _mouseOnCard is true and no frame hit: do nothing — card stays visible
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  PICTURE FRAMES SUBSECTION DATA (MATCHING MAIN SITE 100%)
  // ══════════════════════════════════════════════════════════════
  private getPictureFramesDataForBuilding(section: PortfolioSectionKey): PictureFrameData[] {
    switch (section) {
      case 'about':
        return [
          {
            id: 'about-edu',
            title: 'Education & Academics',
            subtitle: 'Degrees & Institutions',
            description: 'Academic background across Computer Science, Web Technologies, and Data Engineering.',
            details: [
              { text: 'M.S. Web and Data Science - University of Koblenz, Germany (Apr 2026 - Mar 2028)', logo: 'assets/uni_koblenz.jpg' } as DetailItem,
              { text: 'B.E. Information Technology - University of Mumbai, India (Aug 2019 - May 2023)', logo: 'assets/uni_mumbai.jpg' } as DetailItem,
              { text: 'High School - Rustomjee International School, Mumbai', logo: 'assets/rustomjee_international_school_logo.jpg' } as DetailItem
            ],
            icon: '🎓',
            color: '#00f0ff'
          },
          {
            id: 'about-exp',
            title: 'Work Experience',
            subtitle: 'Professional Career',
            description: 'Full-stack software engineering and startup product development.',
            details: [
              { text: 'Founder @ Docuvia (July 2025 - Present) - AI document intelligence platform (Angular, C#, Ollama Llama 3 LLM)', logo: 'assets/docuvia.jpg' } as DetailItem,
              { text: 'Software Developer @ ARCON (June 2023 - July 2025) - Security Compliance Management product, .NET APIs & Angular UI', logo: 'assets/arcon_risk_control_logo.jpg' } as DetailItem,
              { text: 'Web Dev Intern @ Lets Grow More (Sep 2022 - Oct 2022) - React web applications', logo: 'assets/letsgrowmore_logo.jpg' } as DetailItem
            ],
            icon: '💼',
            color: '#38bdf8'
          },
          {
            id: 'about-certs',
            title: 'Certifications & Honors',
            subtitle: 'Credentials & Verified Badges',
            description: 'Official industry certifications and hackathon recognitions.',
            details: [
              { text: 'SIH 2022 Finalist (Aug 2022) - Ministry of Education, India', logo: 'assets/SIH2.webp', link: 'https://drive.google.com/file/d/1rep4XwLAc0HXHqXVMGrxIdphP9-vRR-m/view', linkText: 'View' } as DetailItem,
              { text: 'Apache Spark™ Application Dev - Databricks (Jun 2026)', logo: 'assets/databricks_logo.jpg', link: 'https://drive.google.com/file/d/1td3uZgAych_iDe8J1Rlp7-Aztp3zMQ7H/view', linkText: 'View' } as DetailItem,
              { text: 'Digital Marketing - Google (Mar 2023)', logo: 'assets/google_logo.jpg', link: 'https://drive.google.com/file/d/12QA-_6O1Ra2CR9buRuS-zGfPbeZpp0uy/view', linkText: 'View' } as DetailItem,
              { text: 'Entrepreneurial Management - Great Learning (Dec 2025)', logo: 'assets/great_learning_academy_logo.jpg', link: 'https://mygreatlearning.com/certificate/XFCTJCOC', linkText: 'View' } as DetailItem
            ],
            icon: '🏆',
            color: '#f59e0b'
          },
          {
            id: 'about-lang',
            title: 'Language Proficiency',
            subtitle: 'Multilingual Capabilities',
            description: 'Spoken and written language fluency across global communication standards.',
            details: [
              'Marathi - Native Speaker',
              'English - C1 Level (Listening, Reading, Writing, Speaking)',
              'Hindi - C1 Level (Listening, Reading, Writing, Speaking)',
              'German - A2 Level (Ongoing Studies in Germany)',
              'French - A2 Level (High School Certificate)'
            ],
            icon: '🗣️',
            color: '#10b981'
          },
          {
            id: 'about-exams',
            title: 'Exams & Test Scores',
            subtitle: 'Standardized Qualifications',
            description: 'Official test scores for international academic qualifications.',
            details: [
              'GRE (Graduate Record Exam): 299 / 340 (Quant & Verbal)',
              'TOEFL iBT (Test of English as a Foreign Language): 103 / 120'
            ],
            icon: '📝',
            color: '#ec4899'
          }
        ];

      case 'skills':
        return [
          {
            id: 'skills-frontend',
            title: 'Frontend',
            subtitle: 'Client-Side Stack',
            description: 'Building modern responsive interfaces and single-page Web apps.',
            details: [
              { text: 'Angular - Framework & Architecture', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angularjs/angularjs-original.svg' } as DetailItem,
              { text: 'TypeScript - Strongly Typed Code', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg' } as DetailItem,
              { text: 'SCSS - Modular & Component Styling', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/sass/sass-original.svg' } as DetailItem,
              { text: 'HTML5/CSS3 - Semantic Markup', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg' } as DetailItem,
              { text: 'Bootstrap - Responsive Layout Grid', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/bootstrap/bootstrap-original.svg' } as DetailItem
            ],
            tags: ['Angular', 'TypeScript', 'SCSS', 'HTML5/CSS3', 'Bootstrap'],
            icon: '🖥️',
            color: '#a855f7'
          },
          {
            id: 'skills-backend',
            title: 'Backend',
            subtitle: 'Server & API Architecture',
            description: 'Scalable web APIs, object-oriented services, and server pipelines.',
            details: [
              { text: '.NET - Core & Web Framework', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dotnetcore/dotnetcore-original.svg' } as DetailItem,
              { text: 'C# - System & API Development', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg' } as DetailItem,
              { text: 'Python - Scripting & Logic', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg' } as DetailItem,
              { text: 'Django - Full-Stack Web Framework', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/django/django-plain.svg' } as DetailItem,
              { text: 'REST APIs - Microservices & Endpoints', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/visualstudio/visualstudio-original.svg' } as DetailItem
            ],
            tags: ['.NET', 'C#', 'Python', 'Django', 'REST APIs'],
            icon: '⚙️',
            color: '#c084fc'
          },
          {
            id: 'skills-databases',
            title: 'Data & Database',
            subtitle: 'Storage & Analytics',
            description: 'Relational database systems, data analytics, and query optimization.',
            details: [
              { text: 'SQL Server - Database Design & Administration', logo: 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/microsoftsqlserver/microsoftsqlserver-original.svg' } as DetailItem,
              { text: 'Data Analytics - Databricks Platform', logo: 'https://cdn.prod.website-files.com/601064f495f4b4967f921aa9/64246984585c9225aa4e4fc4_databricks.png' } as DetailItem,
              { text: 'Query Optimization - LINQ & Dapper Tuning', logo: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSmNYlKiwU0LjNNf3s1PeKRtSi1bDOqQ7Mt47sDclIhDA&s=10' } as DetailItem
            ],
            tags: ['SQL Server', 'Data Analytics', 'Query Optimization'],
            icon: '🗄️',
            color: '#38bdf8'
          },
          {
            id: 'skills-domain',
            title: 'Domain Experience',
            subtitle: 'Industry Sectors',
            description: 'Specialized experience across cybersecurity, financial trading, and media.',
            details: [
              { text: 'Cybersecurity and IT - ARCON Security Compliance Management', logo: 'assets/arcon_risk_control_logo.jpg' } as DetailItem,
              { text: 'Equity Trading - Zerodha Kite', logo: 'https://pnghdpro.com/wp-content/themes/pnghdpro/download/social-media-and-brands/zerodha-kite-app-icon-hd.png' } as DetailItem,
              { text: 'Video Editing - Adobe Premiere Pro', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Adobe_Premiere_Pro_CC_icon.svg/3840px-Adobe_Premiere_Pro_CC_icon.svg.png' } as DetailItem
            ],
            tags: ['Cybersecurity', 'Equity Trading', 'Video Editing'],
            icon: '💼',
            color: '#f59e0b'
          }
        ];

      case 'projects':
        return [
          {
            id: 'proj-docuvia',
            title: 'Docuvia (AI Platform)',
            subtitle: 'Founder Project - In Development',
            description: 'AI-powered document intelligence & risk analytics platform built with Angular, C#, and Ollama Llama 3 Large Language Model (LLM).',
            details: [
              'Automated insights extraction from unstructured documents',
              'Angular frontend with PrimeNG UI components & C# backend',
              'Ollama Llama 3 LLM integration for natural language analysis'
            ],
            tags: ['Angular', 'C#', 'Llama 3 LLM', 'PrimeNG', 'SQLite'],
            link: { label: 'Visit Live App', url: 'https://docuvia-frontend.onrender.com' },
            icon: '🤖',
            imageIcon: 'assets/docuvia.jpg',
            color: '#00f0ff'
          },
          {
            id: 'proj-auto',
            title: 'Automobile Verification System',
            subtitle: 'Research Publication (April 2023)',
            description: 'Authentication system for manufacturing units using yawn detection and vehicle verification. Published in IRJMETS Volume 5.',
            details: [
              'Computer vision yawn detection & driver fatigue analysis',
              'Automated vehicle credential verification system',
              'Published research paper in IRJMETS Vol. 5'
            ],
            tags: ['Python', 'Automation', 'Computer Vision', 'Research'],
            link: { label: 'View Certificate', url: 'https://drive.google.com/file/d/19Ozql_o579aWcmxLB9Pm3-683A_AVIPi/view' },
            icon: '🚗',
            color: '#38bdf8'
          },
          {
            id: 'proj-ally',
            title: 'Translation Ally',
            subtitle: 'National Hackathon Project (Aug 2022)',
            description: 'National Level Hackathon Project',
            details: [
              'Real-time multi-lingual document & speech translation platform',
              'Django web backend with NLP language models',
              'National Finalist project in Smart India Hackathon 2022'
            ],
            tags: ['Django', 'Python', 'NLP', 'SIH 2022'],
            link: { label: 'Visit Deployed Site', url: 'https://translation-ally-6wbv.onrender.com/' },
            icon: '🌐',
            color: '#a855f7'
          },
          {
            id: 'proj-skin',
            title: 'Skin Cancer Detection',
            subtitle: 'Deep Learning (2022)',
            description: 'CNN and YOLO-powered diagnostic website detecting skin cancer from images to aid early classification.',
            details: [
              'PyTorch CNN, DenseNet & YOLO model pipelines',
              'High-accuracy medical image classification interface'
            ],
            tags: ['PyTorch', 'YOLO', 'CNN', 'DenseNet', 'Machine Learning'],
            isMaintenance: true,
            maintenanceNote: 'Server Down',
            icon: '🔬',
            color: '#f43f5e'
          },
          {
            id: 'proj-shooter',
            title: 'Space Shooter PyGame',
            subtitle: 'Personal Project',
            description: 'Retro arcade space shooter built with Python & Pygame featuring multi-level enemy waves and local high-score tracking.',
            details: [
              'Custom 60 FPS PyGame game loop physics & audio synthesizer',
              'Multi-level enemy waves & power-up item drops'
            ],
            tags: ['Python', 'Pygame', 'Game Dev'],
            link: { label: 'Play Game on Main Site', url: '#space-shooter' },
            icon: '🚀',
            color: '#f59e0b'
          },
          {
            id: 'proj-aero',
            title: 'AeroWeather',
            subtitle: 'Side Project',
            description: 'Full-stack app featuring a dynamic weather-reactive UI with custom CSS micro-animations based on real-time Open-Meteo API data.',
            details: [
              'Real-time weather API integration with dynamic background animations',
              'Containerized deployment ready on GitHub Pages'
            ],
            tags: ['Angular 17', '.NET 6', 'SQLite', 'Docker'],
            link: { label: 'Visit Deployed Site', url: 'https://yashchande.github.io/AeroWeather-/' },
            icon: '🌤️',
            imageIcon: 'assets/aeroweather_icon.png',
            color: '#10b981'
          }
        ];

      case 'contact':
        return [
          {
            id: 'contact-email',
            title: 'Email Contact',
            subtitle: 'Direct Communication',
            description: 'Send an email directly for career opportunities, engineering inquiries, or technical collaboration.',
            details: [
              'Email: yashchande3@gmail.com',
              'Response Time: Within 24 hours',
              'Status: Open for Full-Time Roles & Contracting'
            ],
            link: { label: 'Send Email', url: 'mailto:yashchande3@gmail.com' },
            icon: '✉️',
            imageIcon: 'assets/gmail_icon.svg',
            color: '#10b981'
          },
          {
            id: 'contact-linkedin',
            title: 'LinkedIn Profile',
            subtitle: 'Professional Network',
            description: 'Connect on LinkedIn to view full professional work history, recommendations, and credentials.',
            details: [
              'URL: linkedin.com/in/yashchande',
              'Network: Software Engineering & Data Science',
              'Connection: Open to connect'
            ],
            link: { label: 'Open LinkedIn', url: 'https://linkedin.com/in/yashchande' },
            icon: '💼',
            imageIcon: 'assets/linkedin_icon.svg',
            color: '#0288D1'
          },
          {
            id: 'contact-github',
            title: 'GitHub Repositories',
            subtitle: 'Open Source & Projects',
            description: 'Explore my open-source codebases, side projects, and public repositories on GitHub.',
            details: [
              'URL: github.com/YashChande',
              'Repositories: AeroWeather, Space Shooter, Portfolio',
              'Code Stack: Angular, C#, Python, TypeScript'
            ],
            link: { label: 'Open GitHub', url: 'https://github.com/YashChande' },
            icon: '🐙',
            imageIcon: 'assets/github_icon.svg',
            color: '#a855f7'
          },
          {
            id: 'contact-instagram',
            title: 'Instagram Profile',
            subtitle: 'Personal & Creative Updates',
            description: 'Follow on Instagram for personal updates, travel, and creative design snapshots.',
            details: [
              'Handle: @yash.chande',
              'URL: instagram.com/yash.chande/',
              'Updates: Life & Tech Journey'
            ],
            link: { label: 'Open Instagram', url: 'https://www.instagram.com/yash.chande/' },
            icon: '📸',
            imageIcon: 'assets/instagram_icon.svg',
            color: '#ec4899'
          }
        ];

      default:
        return [];
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  EXTERIOR TICKS (INCLUDING CLOUDS DRIFT ANIMATION & PARTICLES)
  // ══════════════════════════════════════════════════════════════
  private tickExterior(dt: number): void {
    this.updateMovement(dt);
    this.updateExteriorCamera();
    this.checkProximity();
    this.updateParticles(dt);

    // Slowly drift floating 3D sky clouds across the horizon
    this.clouds.forEach(cloud => {
      cloud.position.x += dt * 1.5;
      if (cloud.position.x > 250) cloud.position.x = -250;
    });
  }

  private updateMovement(dt: number): void {
    let rawX = 0, rawZ = 0;
    if (this.keys['arrowleft'] || this.keys['keya'] || this.touchDirs.left) rawX -= 1;
    if (this.keys['arrowright'] || this.keys['keyd'] || this.touchDirs.right) rawX += 1;
    if (this.keys['arrowup'] || this.keys['keyw'] || this.touchDirs.up) rawZ -= 1;
    if (this.keys['arrowdown'] || this.keys['keys'] || this.touchDirs.down) rawZ += 1;

    if (this.joystickVector.x !== 0 || this.joystickVector.z !== 0) {
      rawX += this.joystickVector.x;
      rawZ += this.joystickVector.z;
    }

    const isMoving = rawX !== 0 || rawZ !== 0;

    if (isMoving) {
      const len = Math.hypot(rawX, rawZ);
      rawX /= len; rawZ /= len;

      const dx = this.player.x - this.extCamera.position.x;
      const dz = this.player.z - this.extCamera.position.z;
      const camLen = Math.hypot(dx, dz) || 1;

      const fwdX = dx / camLen;
      const fwdZ = dz / camLen;
      const rgtX = -fwdZ;
      const rgtZ = fwdX;

      const moveX = rawX * rgtX - rawZ * fwdX;
      const moveZ = rawX * rgtZ - rawZ * fwdZ;

      const acc = this.player.speed * dt * 6;
      this.player.vx += moveX * acc;
      this.player.vz += moveZ * acc;

      const targetAngle = Math.atan2(moveX, moveZ);
      this.player.rotation = THREE.MathUtils.lerp(this.player.rotation, targetAngle, 0.2);

      this.player.strideTime += dt * 7.5;
      const s = Math.sin(this.player.strideTime);

      this.bodyGroup.position.y = Math.abs(s) * 0.1;
      this.bodyGroup.rotation.y = s * 0.12;

      this.leftThigh.rotation.x = s * 0.62;
      this.rightThigh.rotation.x = -s * 0.62;
      this.leftCalf.rotation.x = Math.max(0, -s * 0.75);
      this.rightCalf.rotation.x = Math.max(0, s * 0.75);
      this.leftUpperArm.rotation.x = -s * 0.48;
      this.rightUpperArm.rotation.x = s * 0.48;
      this.leftForearm.rotation.x = -0.38 - Math.abs(s) * 0.28;
      this.rightForearm.rotation.x = -0.38 - Math.abs(s) * 0.28;
    } else {
      this.player.strideTime += dt * 1.8;
      this.bodyGroup.position.y = Math.sin(this.player.strideTime) * 0.025;
    }

    this.player.vx *= this.player.friction;
    this.player.vz *= this.player.friction;

    this.player.x = Math.max(-300, Math.min(300, this.player.x + this.player.vx));
    this.player.z = Math.max(-300, Math.min(300, this.player.z + this.player.vz));

    this.playerGroup.position.set(this.player.x, 0, this.player.z);
    this.playerGroup.rotation.y = this.player.rotation;
  }

  private updateExteriorCamera(): void {
    const behindX = this.player.x + Math.sin(this.cameraYaw) * this.cameraDist;
    const behindZ = this.player.z + Math.cos(this.cameraYaw) * this.cameraDist;

    this.extCamera.position.x = THREE.MathUtils.lerp(this.extCamera.position.x, behindX, 0.1);
    this.extCamera.position.y = THREE.MathUtils.lerp(this.extCamera.position.y, this.cameraHeight, 0.1);
    this.extCamera.position.z = THREE.MathUtils.lerp(this.extCamera.position.z, behindZ, 0.1);

    this.extCamera.lookAt(this.player.x, 0.0, this.player.z);
  }

  private checkProximity(): void {
    this.nearbyBuilding = null;
    for (const b of this.buildings) {
      const doorZ = b.z + 14;
      const dist = Math.hypot(this.player.x - b.x, this.player.z - doorZ);

      // AUTOMATIC ENTRANCE DOOR TRIGGER: Walk into building door to enter!
      if (dist < 4.5) {
        this.enterBuilding(b);
        return;
      }

      if (dist < 18) {
        this.nearbyBuilding = b;
      }
    }
    this.gameWorldService.currentInteractionPrompt.set(
      this.nearbyBuilding ? `Walk through ${this.nearbyBuilding.name} entrance door to enter` : null
    );
  }

  // 🔊 WEB AUDIO API SOUND SYNTHESIZERS (Zero external files needed)
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // 🔊 Homelander Laser Sound Effect (Cropped Voicemod Audio)
  private laserAudio = new Audio('assets/homelander_laser.mp3');
  private explosionAudio = new Audio('assets/explosion.mp3');

  private playLaserSound(): void {
    try {
      this.laserAudio.currentTime = 0;
      this.laserAudio.volume = 0.45; // 50% reduced volume
      this.laserAudio.play().catch(() => {});
    } catch (e) {}
  }

  // 💥 Explosion FX Sound Effect (1.0s soundreality-explosion-fx)
  private playExplosionSound(): void {
    try {
      this.explosionAudio.currentTime = 0;
      this.explosionAudio.volume = 0.85;
      this.explosionAudio.play().catch(() => {});
    } catch (e) {}
  }

  // ══════════════════════════════════════════════════════════════
  // 💥 HOMELANDER EYE LASER BEAM & TREE EXPLOSION SYSTEM
  // ══════════════════════════════════════════════════════════════
  fireHomelanderLaserBeam(): void {
    if (this.isShootingLaser || this.isInsideBuilding) return;

    // Always play Homelander eye laser sound when L key is pressed
    this.playLaserSound();

    // Find nearest non-destroyed tree within 60 units
    let targetTree: typeof this.treeData[0] | null = null;
    let minDist = 60.0;

    for (const tree of this.treeData) {
      if (tree.isDestroyed) continue;
      const d = Math.hypot(tree.x - this.player.x, tree.z - this.player.z);
      if (d < minDist) {
        minDist = d;
        targetTree = tree;
      }
    }

    let tx: number, ty: number, tz: number;

    if (targetTree) {
      tx = targetTree.x;
      ty = 3.5;
      tz = targetTree.z;
      targetTree.isDestroyed = true;

      // Play explosion boom sound ONLY when a tree is destroyed!
      this.playExplosionSound();
    } else {
      // Target point in front of Homelander
      tx = this.player.x + Math.sin(this.player.rotation) * 22;
      ty = 0.5;
      tz = this.player.z + Math.cos(this.player.rotation) * 22;
    }

    // Turn Homelander to face target
    const angleToTarget = Math.atan2(tx - this.player.x, tz - this.player.z);
    this.player.rotation = angleToTarget;
    if (this.playerGroup) this.playerGroup.rotation.y = angleToTarget;

    this.isShootingLaser = true;
    this.cameraShakeTimer = 0.55;

    // Eye Origin Positions in World Space
    const eyeY = 3.3;
    const sinA = Math.sin(angleToTarget);
    const cosA = Math.cos(angleToTarget);

    const leftEyeWorld = new THREE.Vector3(
      this.player.x + sinA * 0.4 - cosA * 0.14,
      eyeY,
      this.player.z + cosA * 0.4 + sinA * 0.14
    );

    const rightEyeWorld = new THREE.Vector3(
      this.player.x + sinA * 0.4 + cosA * 0.14,
      eyeY,
      this.player.z + cosA * 0.4 - sinA * 0.14
    );

    const targetVec = new THREE.Vector3(tx, ty, tz);

    // Create 3D Laser Beam Group
    const laserGroup = new THREE.Group();

    const createBeam = (start: THREE.Vector3, end: THREE.Vector3) => {
      const dir = new THREE.Vector3().subVectors(end, start);
      const len = dir.length();
      const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

      // Outer Red Glow Cylinder
      const outerMat = new THREE.MeshBasicMaterial({ color: '#ef4444' });
      const outerGeo = new THREE.CylinderGeometry(0.14, 0.14, len, 8);
      const outerMesh = new THREE.Mesh(outerGeo, outerMat);
      outerMesh.position.copy(mid);
      outerMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      laserGroup.add(outerMesh);

      // Inner White Hot Core Cylinder
      const innerMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
      const innerGeo = new THREE.CylinderGeometry(0.06, 0.06, len, 8);
      const innerMesh = new THREE.Mesh(innerGeo, innerMat);
      innerMesh.position.copy(mid);
      innerMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
      laserGroup.add(innerMesh);
    };

    createBeam(leftEyeWorld, targetVec);
    createBeam(rightEyeWorld, targetVec);

    // Intense Red Impact Light
    const impactLight = new THREE.PointLight('#ff0000', 14.0, 50);
    impactLight.position.copy(targetVec);
    laserGroup.add(impactLight);

    this.extScene.add(laserGroup);

    // Trigger Explosive Fire, Smoke & Debris Particles
    this.spawnExplosionParticles(tx, ty, tz);

    // Animate Tree Destruction
    if (targetTree) {
      const foliageList = targetTree.foliage;
      const trunkMesh = targetTree.trunk;

      // Char the trunk to black wood
      (trunkMesh.material as THREE.MeshStandardMaterial).color.set('#1c1917');

      // Burn mark on ground
      const burnMat = new THREE.MeshBasicMaterial({ color: '#09090b', transparent: true, opacity: 0.85 });
      const burnMark = new THREE.Mesh(new THREE.CircleGeometry(4.0, 16), burnMat);
      burnMark.rotation.x = -Math.PI / 2;
      burnMark.position.set(tx, 0.05, tz);
      this.extScene.add(burnMark);

      // Shrink foliage over time
      let scaleProgress = 1.0;
      const shrinkInterval = setInterval(() => {
        scaleProgress -= 0.15;
        if (scaleProgress <= 0.05) {
          scaleProgress = 0.05;
          foliageList.forEach(f => (f.visible = false));
          clearInterval(shrinkInterval);
        } else {
          foliageList.forEach(f => f.scale.set(scaleProgress, scaleProgress, scaleProgress));
        }
      }, 30);
    }

    // Clean up laser beam after 400ms
    setTimeout(() => {
      this.extScene.remove(laserGroup);
      this.isShootingLaser = false;
    }, 400);
  }

  // 💥 MINIMAL EXPLOSION (ultra-lightweight, no lag)
  private spawnExplosionParticles(x: number, y: number, z: number): void {
    const fireGeo  = new THREE.SphereGeometry(0.5, 4, 4);
    const smokeGeo = new THREE.SphereGeometry(0.6, 4, 4);
    const boxGeo   = new THREE.BoxGeometry(0.4, 0.4, 0.4);

    const fireColors = ['#ff4400', '#ff8800', '#ffcc00'];

    // 6 fire sparks
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: fireColors[i % 3], transparent: true, opacity: 1.0 });
      const p = new THREE.Mesh(fireGeo, mat);
      p.position.set(x, y + 0.5, z);
      this.extScene.add(p);
      const theta = (i / 6) * Math.PI * 2;
      const speed = 6 + Math.random() * 8;
      this.activeParticles.push({
        mesh: p,
        vx: Math.cos(theta) * speed,
        vy: 5 + Math.random() * 6,
        vz: Math.sin(theta) * speed,
        life: 0.5, maxLife: 0.5,
        scale: 0.5, color: new THREE.Color(fireColors[i % 3])
      });
    }

    // 4 smoke puffs
    const smokeMat = new THREE.MeshBasicMaterial({ color: '#555555', transparent: true, opacity: 0.55 });
    for (let i = 0; i < 4; i++) {
      const p = new THREE.Mesh(smokeGeo, smokeMat.clone());
      const ang = (i / 4) * Math.PI * 2;
      p.position.set(x + Math.cos(ang), y + 1, z + Math.sin(ang));
      this.extScene.add(p);
      this.activeParticles.push({
        mesh: p,
        vx: Math.cos(ang) * 1.5,
        vy: 2 + Math.random() * 2,
        vz: Math.sin(ang) * 1.5,
        life: 1.0, maxLife: 1.0,
        scale: 0.6, color: new THREE.Color('#555555'), isSmoke: true
      });
    }

    // 3 debris chunks
    const woodMat = new THREE.MeshBasicMaterial({ color: '#3a1000' });
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(boxGeo, woodMat);
      p.position.set(x, y + 1, z);
      this.extScene.add(p);
      const ang = (i / 3) * Math.PI * 2;
      this.activeParticles.push({
        mesh: p,
        vx: Math.cos(ang) * 8,
        vy: 6 + Math.random() * 6,
        vz: Math.sin(ang) * 8,
        life: 0.8, maxLife: 0.8,
        scale: 0.4, color: new THREE.Color('#3a1000'),
        isDebris: true,
        rotV: new THREE.Vector3(8, 8, 8)
      });
    }
  }

  // 🔄 PARTICLE & CAMERA SHAKE ANIMATION UPDATE LOOP
  private updateParticles(dt: number): void {
    // Camera shake effect
    if (this.cameraShakeTimer > 0) {
      this.cameraShakeTimer -= dt;
      const shakeAmt = this.cameraShakeTimer * 0.35;
      this.extCamera.position.x += (Math.random() - 0.5) * shakeAmt;
      this.extCamera.position.y += (Math.random() - 0.5) * shakeAmt;
    }

    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.extScene.remove(p.mesh);
        this.activeParticles.splice(i, 1);
        continue;
      }

      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;

      if (p.isDebris) {
        p.vy -= 18.0 * dt; // Gravity on debris chunks
        if (p.rotV) {
          p.mesh.rotation.x += p.rotV.x * dt;
          p.mesh.rotation.y += p.rotV.y * dt;
        }
        if (p.mesh.position.y < 0.2) p.mesh.position.y = 0.2;
      } else if (p.isSmoke) {
        // Smoke expands and rises while fading out
        const progress = 1 - p.life / p.maxLife;
        const currentScale = p.scale * (1 + progress * 2.5);
        p.mesh.scale.set(currentScale, currentScale, currentScale);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.75 * (1 - progress));
      } else {
        // Fire particles shrink and fade
        const progress = 1 - p.life / p.maxLife;
        // Custom per-particle animation callback (fireball, shockwave, flash)
        if ((p as any)._onTick) {
          (p as any)._onTick(progress);
        } else {
          const currentScale = p.scale * Math.max(0.01, 1 - progress);
          p.mesh.scale.set(currentScale, currentScale, currentScale);
          (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 1 - progress);
        }
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  UI Event Handlers
  // ══════════════════════════════════════════════════════════════
  exitGameMode(): void { this.gameWorldService.disableInteractiveMode(); }
  closeModal(): void { this.gameWorldService.closeSectionModal(); }
  onTouchMove(dir: 'up' | 'down' | 'left' | 'right', event?: TouchEvent): void {
    if (event) event.preventDefault();
    this.touchDirs[dir] = true;
  }
  onTouchStop(dir: 'up' | 'down' | 'left' | 'right'): void { this.touchDirs[dir] = false; }
  onActionPress(): void {
    if (this.nearbyBuilding && !this.isInsideBuilding) {
      this.enterBuilding(this.nearbyBuilding);
    }
  }

  // ── 🕹️ Virtual Joystick Handlers ───────────────────────────────
  onJoystickStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.changedTouches.length === 0) return;
    const touch = e.changedTouches[0];
    this.joystickTouchId = touch.identifier;
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.joystickOrigin = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
    this.updateJoystickTouch(touch);
  }

  onJoystickMove(e: TouchEvent): void {
    e.preventDefault();
    if (this.joystickTouchId === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === this.joystickTouchId) {
        this.updateJoystickTouch(e.changedTouches[i]);
        break;
      }
    }
  }

  onJoystickEnd(e: TouchEvent): void {
    e.preventDefault();
    this.joystickTouchId = null;
    this.joystickVector = { x: 0, z: 0 };
    this.joystickKnobTransform = 'translate(0px, 0px)';
  }

  private updateJoystickTouch(touch: Touch): void {
    const dx = touch.clientX - this.joystickOrigin.x;
    const dy = touch.clientY - this.joystickOrigin.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, this.maxJoystickRadius);
    const angle = Math.atan2(dy, dx);

    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;
    this.joystickKnobTransform = `translate(${knobX}px, ${knobY}px)`;

    // Normalized analog vector clamped to (-1 … +1)
    const norm = clampedDist / this.maxJoystickRadius;
    this.joystickVector.x = Math.cos(angle) * norm;
    this.joystickVector.z = Math.sin(angle) * norm;
  }

  onFrameLinkClick(event: MouseEvent, url: string): void {
    if (url === '#space-shooter') {
      event.preventDefault();
      this.exitGameMode();
      setTimeout(() => {
        const el = document.getElementById('projects') || document.querySelector('app-projects');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    }
  }
}
