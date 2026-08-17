/* =====================================================================
   corpo.js — modulo "Corpo": paziente umano 3D reale (glTF) esplorabile.

   Il vecchio manichino era una pila di sfere e cilindri. Qui si carica
   una mesh umana rigata, e tutto ciò che si accende sopra (organi,
   irradiazione del dolore, segni adrenergici, punti cliccabili) è
   ancorato alle OSSA dello scheletro: resta al proprio posto anche
   quando il modello respira o cambia posizione.

   Nota tecnica: su una mesh skinnata Box3.setFromObject restituisce un
   riquadro inaffidabile appena il nodo viene ruotato. Per questo la
   misura viene presa una sola volta sul modello ancora intatto, e tutte
   le trasformazioni finiscono su un gruppo contenitore.
   ===================================================================== */

import * as THREE from 'three';
import { GLTFLoader } from 'GLTFLoader';
import { el, mount, clamp } from '../core/dom.js';
import { toast } from '../core/ui.js';
import { navigate } from '../core/router.js';
import {
  HOTSPOTS, PAIN_SITES, ADRENERGIC_SITES, ORGANS, POSITIONS, HOME_INFO,
} from '../data/anatomy.js';

const MODEL_URL = new URL('../../models/patient.glb', import.meta.url).href;
const TARGET_HEIGHT = 3.4;
const BONE_PREFIX = /^mixamorig:?/i;

let engine = null;

/* ===================== costruzione della scena ======================= */
function buildScene(stage, overlay, onPick, onProgress) {
  // Sui telefoni si abbassa la risoluzione e si spengono le ombre: la
  // differenza visiva è minima, quella sulla fluidità no.
  const leggero = window.matchMedia('(max-width: 900px), (pointer: coarse)').matches;

  const renderer = new THREE.WebGLRenderer({
    antialias: !leggero, alpha: true, powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, leggero ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !leggero;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.append(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xA8C6D8, 0x2A2320, 1.5));
  const key = new THREE.DirectionalLight(0xFFF3E6, 2.2);
  key.position.set(3.4, 6.2, 5.2);
  key.castShadow = !leggero;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.top = 4; key.shadow.camera.bottom = -1;
  key.shadow.camera.left = -3; key.shadow.camera.right = 3;
  key.shadow.bias = -0.0015;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xE0243C, 1.35);
  rim.position.set(-4.5, 2.6, -4.5);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0x5AA9E6, 0.8);
  fill.position.set(-3.2, -0.8, 4);
  scene.add(fill);

  const root = new THREE.Group();        // rotazione controllata dall'utente
  const pivot = new THREE.Group();       // posizione del paziente (tilt)
  root.add(pivot);
  scene.add(root);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3.6, 48),
    new THREE.ShadowMaterial({ opacity: 0.38 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.visible = !leggero;
  scene.add(floor);

  const skin = new THREE.MeshStandardMaterial({
    color: 0xC9A48F, roughness: 0.72, metalness: 0.03,
    transparent: true, opacity: 1,
  });

  const layers = {
    organi: new THREE.Group(),
    dolore: new THREE.Group(),
    adren: new THREE.Group(),
  };
  Object.values(layers).forEach((g) => { g.visible = false; pivot.add(g); });
  const hotGroup = new THREE.Group();
  pivot.add(hotGroup);

  const bones = new Map();
  const anchored = [];      // { obj, bone, off }
  const hotMeshes = [];
  const labels = [];
  let mixer = null;
  let bodyHeight = TARGET_HEIGHT;

  /* ---------------------------- caricamento -------------------------- */
  const loader = new GLTFLoader();
  const loaded = new Promise((resolve, reject) => {
    loader.load(MODEL_URL, (gltf) => {
      const model = gltf.scene;

      // Box3 su mesh skinnate è attendibile solo dopo updateMatrixWorld:
      // senza questa riga il riquadro esce sbagliato e il modello viene
      // scalato di un fattore 2,6 in più.
      model.updateMatrixWorld(true);
      const raw = new THREE.Box3().setFromObject(model);
      const size = raw.getSize(new THREE.Vector3());
      const scale = TARGET_HEIGHT / (size.y || 1);
      bodyHeight = TARGET_HEIGHT;

      const holder = new THREE.Group();
      holder.add(model);
      holder.scale.setScalar(scale);
      holder.position.set(
        -((raw.min.x + raw.max.x) / 2) * scale,
        -raw.min.y * scale,
        -((raw.min.z + raw.max.z) / 2) * scale,
      );
      pivot.add(holder);

      model.traverse((o) => {
        if (o.isBone) bones.set(o.name.replace(BONE_PREFIX, ''), o);
        if (!o.isMesh) return;
        o.castShadow = !leggero;
        o.material = skin;
        o.frustumCulled = false;   // la mesh skinnata inganna il culling
      });

      if (gltf.animations?.length) {
        mixer = new THREE.AnimationMixer(model);
        const idle = gltf.animations.find((a) => /idle/i.test(a.name)) || gltf.animations[0];
        const action = mixer.clipAction(idle);
        action.timeScale = 0.35;    // respiro appena percettibile
        action.play();
      }

      scene.updateMatrixWorld(true);
      buildLayers();
      resolve(model);
    }, (evt) => onProgress?.(evt), reject);
  });

  /* ------------------------- livelli sul corpo ------------------------ */
  function blob(r, color, opacity, emissive) {
    return new THREE.Mesh(
      new THREE.SphereGeometry(r, 20, 16),
      new THREE.MeshStandardMaterial({
        color, transparent: opacity < 1, opacity,
        roughness: 0.45, metalness: 0.04, depthWrite: opacity > 0.85,
        emissive: emissive ? color : 0x000000, emissiveIntensity: emissive || 0,
      }),
    );
  }

  function anchor(obj, spec, group) {
    const bone = bones.get(spec.bone);
    if (!bone) return false;                    // osso assente: salta l'elemento
    group.add(obj);
    anchored.push({ obj, bone, off: new THREE.Vector3(...spec.off).multiplyScalar(bodyHeight) });
    return true;
  }

  function buildLayers() {
    const H = bodyHeight;

    ORGANS.forEach((o) => {
      const s = o.s * H;
      let mesh;
      if (o.kind === 'heart') {
        mesh = new THREE.Group();
        const mat = new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.34, emissive: 0x300a10, emissiveIntensity: 0.5 });
        const a = new THREE.Mesh(new THREE.SphereGeometry(s, 22, 18), mat); a.scale.set(1, 1.2, 0.85);
        const b = new THREE.Mesh(new THREE.SphereGeometry(s * 0.78, 18, 14), mat);
        b.position.set(-s * 0.66, s * 0.46, 0); b.scale.set(1, 1.05, 0.85);
        const c = new THREE.Mesh(new THREE.ConeGeometry(s * 0.78, s * 1.5, 18), mat);
        c.position.set(s * 0.14, -s * 1.1, 0); c.rotation.z = 0.3;
        mesh.add(a, b, c);
        mesh.userData.beats = true;
      } else if (o.kind === 'lung') {
        mesh = blob(s, o.color, o.opacity, 0);
        mesh.scale.set(0.8, 1.55, 0.68);
        mesh.userData.breathes = true;
        mesh.userData.baseScale = [0.8, 1.55, 0.68];
      } else if (o.kind === 'brain') {
        mesh = blob(s, o.color, o.opacity, 0);
        mesh.scale.set(0.98, 0.88, 1.06);
      } else if (o.kind === 'aorta') {
        const mat = new THREE.MeshStandardMaterial({ color: o.color, transparent: true, opacity: o.opacity, roughness: 0.33 });
        mesh = new THREE.Mesh(new THREE.TorusGeometry(s, s * 0.3, 12, 26, 3.6), mat);
        mesh.rotation.set(0, 0, -0.32);
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.26, s * 0.2, s * 8, 14), mat);
        disc.position.set(-s * 0.08, -s * 4.2, 0);
        mesh.add(disc);
      } else if (o.kind === 'liver') {
        mesh = blob(s, o.color, o.opacity, 0);
        mesh.scale.set(1.5, 0.7, 0.8);
      } else if (o.kind === 'stomach') {
        mesh = blob(s, o.color, o.opacity, 0);
        mesh.scale.set(1.3, 0.9, 0.75);
      } else {
        mesh = blob(s, o.color, o.opacity, 0);
        mesh.scale.set(0.72, 1.25, 0.72);
      }
      mesh.renderOrder = 2;
      anchor(mesh, o, layers.organi);
    });

    PAIN_SITES.forEach((p) => {
      const m = blob(p.r * bodyHeight, 0xE0243C, 0.34, 0.55);
      m.userData.pulse = Math.random() * 6;
      m.renderOrder = 3;
      anchor(m, p, layers.dolore);
    });

    ADRENERGIC_SITES.forEach((p) => {
      const m = blob(p.r * bodyHeight, 0xF2B441, 0.55, 0.7);
      m.userData.pulse = Math.random() * 6;
      m.renderOrder = 3;
      anchor(m, p, layers.adren);
    });

    HOTSPOTS.forEach((h) => {
      const pip = blob(0.045 * bodyHeight * 0.32, 0xE0243C, 1, 1.1);
      pip.userData.key = h.key;
      if (!anchor(pip, h, hotGroup)) return;
      hotMeshes.push(pip);

      const node = el('button.hotlabel', {
        type: 'button', 'data-key': h.key,
        onclick: (e) => { e.stopPropagation(); onPick(h.key); },
      }, [el('span.pip'), h.label]);
      overlay.append(node);
      labels.push({ node, pip, key: h.key });
    });
  }

  /* ------------------------- interazione utente ---------------------- */
  const state = {
    ry: 0, rx: 0.03, dist: 7.4, spin: true, dragging: false, px: 0, py: 0,
    tilt: 0, tiltTarget: 0, yaw: 0,
  };

  /* Sul telefono lo stage lascia passare lo scorrimento verticale della
     pagina (touch-action: pan-y): si ruota trascinando in orizzontale e
     si ingrandisce con i pulsanti, senza rubare il gesto di scorrimento. */
  const pointers = new Map();
  let pinchStart = 0;
  let distStart = 0;

  const onDown = (e) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
      distStart = state.dist;
      state.dragging = false;
      return;
    }
    state.dragging = true;
    state.px = e.clientX; state.py = e.clientY;
    stage.classList.add('drag');
    stage.setPointerCapture?.(e.pointerId);
  };

  const onUp = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStart = 0;
    if (pointers.size === 0) { state.dragging = false; stage.classList.remove('drag'); }
  };

  const onMove = (e) => {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2 && pinchStart) {
      const [a, b] = [...pointers.values()];
      const now = Math.hypot(a.x - b.x, a.y - b.y);
      if (now > 0) state.dist = clamp(distStart * (pinchStart / now), 3.4, 13);
      return;
    }
    if (!state.dragging) return;
    state.ry += (e.clientX - state.px) * 0.009;
    state.rx = clamp(state.rx + (e.clientY - state.py) * 0.005, -0.55, 0.55);
    state.px = e.clientX; state.py = e.clientY;
  };

  const onWheel = (e) => {
    e.preventDefault();
    state.dist = clamp(state.dist + e.deltaY * 0.006, 3.4, 13);
  };

  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', onUp);
  stage.addEventListener('pointerleave', onUp);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('wheel', onWheel, { passive: false });

  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  const onClick = (e) => {
    if (e.target.closest('.hotlabel')) return;
    const r = renderer.domElement.getBoundingClientRect();
    ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(hotMeshes, false)[0];
    if (hit) onPick(hit.object.userData.key);
  };
  stage.addEventListener('click', onClick);

  /* ------------------------------ loop ------------------------------- */
  const clock = new THREE.Clock();
  const tmp = new THREE.Vector3();
  const camDir = new THREE.Vector3();
  const qtmp = new THREE.Quaternion();
  let raf = null;
  let alive = true;

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  function frame() {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    if (mixer) mixer.update(dt);
    if (state.spin && !state.dragging) state.ry += dt * 0.2;

    state.tilt += (state.tiltTarget - state.tilt) * Math.min(1, dt * 4.5);
    pivot.rotation.x = state.tilt;

    // Da steso il corpo viene girato di traverso e guardato dall'alto:
    // altrimenti punta verso l'orizzonte e si vede solo scorciato.
    const lying = Math.min(1, Math.max(0, -state.tilt / 1.5708));
    const yawTarget = lying > 0.55 ? Math.PI / 2 : 0;
    state.yaw += (yawTarget - state.yaw) * Math.min(1, dt * 4.5);
    root.rotation.set(state.rx + lying * 0.35, state.ry + state.yaw, 0);

    const focusY = TARGET_HEIGHT * 0.5 * Math.cos(state.tilt) + 0.15;
    camera.position.set(0, focusY + lying * 2.4, state.dist);
    camera.lookAt(0, focusY, 0);

    // gli elementi seguono le ossa
    scene.updateMatrixWorld();
    anchored.forEach(({ obj, bone, off }) => {
      bone.getWorldPosition(tmp);
      obj.parent.worldToLocal(tmp);
      obj.position.copy(tmp).add(off);
    });

    layers.organi.children.forEach((m) => {
      if (m.userData.beats) { const s = 1 + Math.sin(t * 4.6) * 0.07; m.scale.setScalar(s); }
      if (m.userData.breathes) {
        const k = 1 + Math.sin(t * 1.5) * 0.05;
        const [x, y, z] = m.userData.baseScale;
        m.scale.set(x * k, y * k, z * k);
      }
    });
    layers.dolore.children.forEach((m) => {
      m.material.opacity = 0.16 + Math.abs(Math.sin(t * 1.9 + m.userData.pulse)) * 0.3;
    });
    layers.adren.children.forEach((m) => {
      m.material.opacity = 0.26 + Math.abs(Math.sin(t * 3 + m.userData.pulse)) * 0.38;
    });
    hotMeshes.forEach((m, i) => m.scale.setScalar(1 + Math.sin(t * 3 + i) * 0.18));

    layoutLabels();

    renderer.render(scene, camera);
  }

  /* Le etichette vengono spostate di lato e distanziate fra loro, così
     restano leggibili anche quando i punti sono vicini sul torace. */
  const LABEL_GAP = 26;
  function layoutLabels() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    camera.getWorldDirection(camDir);

    const placed = [];
    labels.forEach((l) => {
      l.pip.getWorldPosition(tmp);
      const world = tmp.clone();
      tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * w;
      const y = (-tmp.y * 0.5 + 0.5) * h;
      const side = x < w / 2 ? -1 : 1;
      // "dietro" si calcola nello spazio del corpo (dove è sempre in piedi)
      // e poi si riporta nel mondo: così vale anche col paziente supino.
      const local = pivot.worldToLocal(world.clone());
      const normal = new THREE.Vector3(local.x, 0, local.z);
      const behind = normal.lengthSq() > 1e-5
        && normal.normalize().applyQuaternion(pivot.getWorldQuaternion(qtmp)).dot(camDir) > 0.12;
      l.node.classList.toggle('behind', behind);
      placed.push({ l, x, y, side });
    });

    const spinta = w < 420 ? 52 : 78;   // meno spinta su schermo stretto
    [-1, 1].forEach((side) => {
      const col = placed.filter((p) => p.side === side).sort((a, b) => a.y - b.y);
      let last = -Infinity;
      col.forEach((p) => {
        const y = Math.max(p.y, last + LABEL_GAP);
        last = y;
        // l'etichetta non deve mai uscire dal riquadro
        const mezza = (p.l.node.offsetWidth || 90) / 2 + 6;
        const x = clamp(p.x + side * spinta, mezza, w - mezza);
        p.l.node.style.left = `${Math.round(x)}px`;
        p.l.node.style.top = `${Math.round(clamp(y, 14, h - 14))}px`;
      });
    });
  }

  resize();
  frame();

  // gancio di ispezione, attivo solo in sviluppo locale
  if (location.hostname === 'localhost') window.__corpo = { state, root, pivot, camera, scene };

  return {
    loaded,
    setLayer(name, on) {
      if (layers[name]) layers[name].visible = on;
      if (name === 'organi') {
        skin.opacity = on ? 0.22 : 1;
        skin.depthWrite = !on;
        skin.needsUpdate = true;
      }
    },
    setSpin(on) { state.spin = on; },
    setPosition(key) {
      const pos = POSITIONS.find((p) => p.key === key) || POSITIONS[0];
      state.tiltTarget = pos.tilt;
      return pos;
    },
    zoom(delta) { state.dist = clamp(state.dist + delta, 3.4, 13); },
    resetView() { state.ry = 0; state.rx = 0.03; state.dist = 7.4; state.spin = true; },
    highlight(key) {
      labels.forEach((l) => l.node.classList.toggle('on', l.key === key));
      hotMeshes.forEach((m) => { m.material.emissiveIntensity = m.userData.key === key ? 2 : 1.1; });
    },
    destroy() {
      alive = false;
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('pointerup', onUp);
      stage.removeEventListener('pointercancel', onUp);
      stage.removeEventListener('pointerleave', onUp);
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('wheel', onWheel);
      stage.removeEventListener('click', onClick);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) [].concat(o.material).forEach((m) => m.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

/* ============================== VISTA ================================ */
function infoCard(data) {
  const node = el('div.card.organ-info');
  node.innerHTML = `
    <p class="kicker">${data.kicker}</p>
    <h3>${data.title}</h3>
    <p>${data.body}</p>
    <ul>${data.list.map((li) => `<li>${li}</li>`).join('')}</ul>
    ${data.quote ? `<p class="quote">${data.quote}</p>` : ''}`;
  if (data.chapter) {
    node.append(el('div.links-out', {}, [
      el('button.btn.sm', { type: 'button', onclick: () => navigate('studio', data.chapter) },
        ['Apri il capitolo sul manuale']),
    ]));
  }
  return node;
}

export function render() {
  const overlay = el('div.hot-overlay', {
    style: { position: 'absolute', inset: '0', pointerEvents: 'none' },
  });
  const progressBar = el('i', { style: { width: '6%' } });
  const loading = el('div.stage-loading', {}, [
    el('span', { text: 'caricamento del modello' }),
    el('div.meter', {}, [progressBar]),
  ]);

  const touch = window.matchMedia('(pointer: coarse)').matches;
  const zoomIn = el('button.iconbtn', { type: 'button', 'aria-label': 'Avvicina', text: '+' });
  const zoomOut = el('button.iconbtn', { type: 'button', 'aria-label': 'Allontana', text: '−' });
  const tools = el('div.stage-tools', {}, [zoomIn, zoomOut]);

  const stage = el('div', { id: 'stage' }, [
    el('div.stage-hint', {
      text: touch
        ? 'trascina in orizzontale per ruotare · tocca un punto rosso'
        : 'trascina per ruotare · rotella per lo zoom · tocca un punto rosso',
    }),
    tools,
    overlay,
    loading,
  ]);

  const info = el('div', {}, [infoCard(HOME_INFO)]);

  const layerChips = [
    ['organi', 'Organi'],
    ['dolore', 'Irradiazione del dolore'],
    ['adren', 'Segni adrenergici'],
  ].map(([k, label]) => el('button.chip', {
    type: 'button', 'aria-pressed': 'false', 'data-layer': k,
  }, [label]));

  const spinChip = el('button.chip', { type: 'button', 'aria-pressed': 'true' }, ['Rotazione']);
  const resetChip = el('button.chip', { type: 'button' }, ['Riporta la vista']);

  const posButtons = POSITIONS.map((p) => el('button.chip', {
    type: 'button', 'data-pos': p.key, 'aria-pressed': String(p.key === 'standing'),
  }, [p.label]));
  const posNote = el('p', {
    style: { margin: '10px 0 0', color: 'var(--ink-3)', fontSize: '13px' },
    text: POSITIONS[0].note,
  });

  const view = el('div.view', {}, [
    el('div.view-head', {}, [
      el('h2', { text: 'Il corpo del paziente' }),
      el('p', { text: 'Modello umano reale, non un manichino disegnato. Accendi i livelli per vedere quello che a lezione viene solo raccontato: dove stanno gli organi, dove si irradia il dolore cardiaco, dove compaiono i segni della scarica adrenergica.' }),
    ]),
    el('div.grid.g-2', {}, [
      el('div', {}, [
        el('div.stage-wrap', {}, [stage]),
        el('div.row', { style: { marginTop: '12px' } }, [...layerChips, spinChip, resetChip]),
        el('div.card.tight', { style: { marginTop: '12px' } }, [
          el('p.lbl', { text: 'Posizione del paziente' }),
          el('div.row', {}, posButtons),
          posNote,
        ]),
      ]),
      info,
    ]),
  ]);

  // setTimeout e non requestAnimationFrame: in una scheda in secondo
  // piano rAF non scatta e il modulo non si avvierebbe mai.
  setTimeout(start, 0);

  function start() {
    try {
      engine = buildScene(stage, overlay, (key) => {
        const h = HOTSPOTS.find((x) => x.key === key);
        if (!h) return;
        mount(info, infoCard(h));
        engine.highlight(key);
      }, (evt) => {
        if (!evt.lengthComputable) return;
        progressBar.style.width = `${Math.round((evt.loaded / evt.total) * 100)}%`;
      });
    } catch (err) {
      console.error('[corpo] WebGL non disponibile', err);
      mount(loading, el('span', { text: 'questo browser non supporta WebGL' }));
      return;
    }

    engine.loaded
      .then(() => loading.remove())
      .catch((err) => {
        console.error('[corpo] modello non caricato', err);
        mount(loading,
          el('span', { text: 'modello non caricato' }),
          el('small', { text: 'atteso in assets/models/patient.glb' }));
        toast('Modello 3D non disponibile', 'Manca il file assets/models/patient.glb.', 'err');
      });

    layerChips.forEach((chip) => chip.addEventListener('click', () => {
      const on = chip.getAttribute('aria-pressed') !== 'true';
      chip.setAttribute('aria-pressed', String(on));
      engine.setLayer(chip.dataset.layer, on);
    }));
    spinChip.addEventListener('click', () => {
      const on = spinChip.getAttribute('aria-pressed') !== 'true';
      spinChip.setAttribute('aria-pressed', String(on));
      engine.setSpin(on);
    });
    resetChip.addEventListener('click', () => {
      engine.resetView();
      spinChip.setAttribute('aria-pressed', 'true');
    });
    zoomIn.addEventListener('click', () => engine.zoom(-1.1));
    zoomOut.addEventListener('click', () => engine.zoom(1.1));
    posButtons.forEach((b) => b.addEventListener('click', () => {
      posButtons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      posNote.textContent = engine.setPosition(b.dataset.pos).note;
    }));
  }

  return view;
}

export function destroy() {
  engine?.destroy();
  engine = null;
}
