const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const gravityControl = document.getElementById("gravity");
const gravityValue = document.getElementById("gravityValue");
const jumpControl = document.getElementById("jumpForce");
const jumpValue = document.getElementById("jumpValue");
const enemyTypeSelect = document.getElementById("enemyType");
const spawnEnemyBtn = document.getElementById("spawnEnemy");
const replaceEnemiesBtn = document.getElementById("replaceEnemies");
const randomEventBtn = document.getElementById("randomEvent");
const resetWorldBtn = document.getElementById("resetWorld");
const eventLog = document.getElementById("eventLog");
const openCustomizer = document.getElementById("openCustomizer");
const closeCustomizer = document.getElementById("closeCustomizer");
const customizerPanel = document.getElementById("customizerPanel");

const TILE = 16;
const worldWidth = 6200;
const groundY = 432;
let cameraX = 0;

const spriteSheet = new Image();
let spriteReady = false;
spriteSheet.src = "mario-spritesheet.png";
spriteSheet.onload = () => {
  spriteReady = true;
  logEvent("Loaded custom Mario sprite sheet.");
};
spriteSheet.onerror = () => {
  logEvent("Sprite sheet missing: add mario-spritesheet.png in project root.");
};

const palette = {
  sky: "#5c94fc",
  cloud: "#ffffff",
  brickA: "#b75000",
  brickB: "#f09030",
  blockQ: "#f8b800",
  blockQ2: "#f8d878",
  pipe: "#00b800",
  pipeDark: "#007800",
  hill: "#24a020",
  hillShade: "#1a7a16",
  bush: "#3ab43a",
  bushShade: "#228522",
};

const state = {
  gravity: Number(gravityControl.value),
  jumpForce: Number(jumpControl.value),
  keys: {},
  particles: [],
  power: "small",
};

const player = { x: 100, y: groundY - 40, w: 28, h: 40, vx: 0, vy: 0, onGround: false, facing: 1, onPipe: null };

const level = {
  clouds: [{ x: 120, y: 70 }, { x: 430, y: 66 }, { x: 740, y: 75 }, { x: 1080, y: 68 }, { x: 1470, y: 80 }, { x: 1880, y: 70 }, { x: 2330, y: 66 }, { x: 2780, y: 75 }, { x: 3300, y: 72 }, { x: 3730, y: 64 }, { x: 4190, y: 79 }, { x: 4680, y: 70 }, { x: 5180, y: 65 }, { x: 5620, y: 78 }],
  bushes: [{ x: 220, w: 95 }, { x: 840, w: 120 }, { x: 1650, w: 90 }, { x: 2490, w: 120 }, { x: 3420, w: 92 }, { x: 4380, w: 130 }, { x: 5260, w: 105 }],
  hills: [{ x: 40, w: 120, h: 70 }, { x: 1160, w: 140, h: 85 }, { x: 2040, w: 110, h: 75 }, { x: 2980, w: 150, h: 95 }, { x: 3940, w: 120, h: 80 }, { x: 5500, w: 130, h: 90 }],
  blocks: [
    { x: 320, y: 300, kind: "question" }, { x: 352, y: 300, kind: "brick" }, { x: 384, y: 300, kind: "question" },
    { x: 1040, y: 270, kind: "question" }, { x: 1072, y: 270, kind: "brick" }, { x: 1180, y: 220, kind: "brick" }, { x: 1212, y: 220, kind: "brick" }, { x: 1244, y: 220, kind: "brick" },
    { x: 1550, y: 300, kind: "question" }, { x: 1582, y: 300, kind: "question" }, { x: 1880, y: 250, kind: "brick" },
    { x: 2360, y: 270, kind: "question" }, { x: 2392, y: 270, kind: "brick" }, { x: 2424, y: 270, kind: "question" },
    { x: 3200, y: 300, kind: "brick" }, { x: 3232, y: 300, kind: "brick" }, { x: 4010, y: 250, kind: "question" },
  ],
  pipes: [
    { x: 520, h: 48, usable: false },
    { x: 770, h: 64, usable: true, exitX: 2140, exitBoost: -8 },
    { x: 980, h: 96, usable: false },
    { x: 1330, h: 64, usable: true, exitX: 4700, exitBoost: -10 },
    { x: 2140, h: 80, usable: false },
    { x: 3650, h: 50, usable: false },
    { x: 4700, h: 70, usable: false },
  ],
  stairs: [{ x: 2840, steps: 6 }, { x: 4380, steps: 8 }],
};

const originalKinds = level.blocks.map((b) => b.kind);
let enemies = [];
let powerups = [];

function createEnemy(x, type = "goomba") {
  const spec = {
    goomba: { w: 30, h: 28, speed: 1.1, c1: "#9c5a21", c2: "#e6bc88" },
    koopa: { w: 30, h: 40, speed: 0.9, c1: "#28a038", c2: "#f0dc80" },
    beetle: { w: 34, h: 24, speed: 1.25, c1: "#1a1d42", c2: "#6270b0" },
  }[type];
  return { type, x, y: groundY - spec.h, vx: Math.random() < 0.5 ? -spec.speed : spec.speed, alive: true, ...spec };
}

function createPowerup(kind, x, y) {
  if (kind === "mushroom") return { kind, x, y, w: 16, h: 16, vx: 1.3, vy: 0, active: true };
  if (kind === "star") return { kind, x, y, w: 16, h: 16, vx: 1.4, vy: -7.5, active: true };
  return { kind: "flower", x, y, w: 16, h: 16, vx: 0, vy: 0, active: true };
}

function seedEnemies() {
  enemies = [createEnemy(620, "goomba"), createEnemy(1420, "koopa"), createEnemy(2260, "goomba"), createEnemy(3490, "beetle"), createEnemy(4920, "koopa")];
}

function logEvent(msg) {
  const li = document.createElement("li");
  li.textContent = `${new Date().toLocaleTimeString()} — ${msg}`;
  eventLog.prepend(li);
  while (eventLog.children.length > 9) eventLog.lastChild.remove();
}

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const rect = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

function drawCloud(x, y) { rect(x, y + 8, 48, 16, palette.cloud); rect(x + 10, y, 28, 16, palette.cloud); rect(x + 20, y + 4, 24, 14, "#d8efff"); }
function drawBrick(x, y) { rect(x, y, TILE, TILE, palette.brickA); rect(x + 2, y + 2, TILE - 4, 3, palette.brickB); rect(x + 2, y + 8, TILE - 4, 2, palette.brickB); rect(x + 2, y + 12, TILE - 4, 2, palette.brickB); }
function drawQuestion(x, y) { rect(x, y, TILE, TILE, palette.blockQ); rect(x + 2, y + 2, TILE - 4, TILE - 4, palette.blockQ2); ctx.fillStyle = "#7a3e00"; ctx.font = "bold 12px monospace"; ctx.fillText("?", x + 4, y + 12); }
function drawPipe(x, h, usable) {
  const y = groundY - h;
  rect(x, y, 32, h, palette.pipe);
  rect(x - 4, y - 8, 40, 10, "#19da35");
  rect(x + 4, y + 2, 8, h - 2, "#3bef4f");
  rect(x + 24, y + 2, 4, h - 2, palette.pipeDark);
  if (usable) rect(x + 10, y - 5, 12, 2, "#fff");
}
function drawHill(x, w, h) { const y = groundY - h; rect(x, y + 18, w, h - 18, palette.hill); rect(x + 10, y + 10, w - 20, 20, palette.hill); rect(x + 28, y + 25, 8, 8, palette.hillShade); rect(x + w - 40, y + 34, 8, 8, palette.hillShade); }
function drawBush(x, w) { const y = groundY - 22; rect(x, y, w, 22, palette.bush); rect(x + 8, y - 10, w - 16, 12, palette.bush); rect(x + 20, y + 6, 12, 6, palette.bushShade); }
function drawStairs(baseX, steps) { for (let i = 0; i < steps; i++) for (let j = 0; j <= i; j++) drawBrick(baseX + i * TILE, groundY - TILE * (j + 1)); }

function drawBackground() { rect(0, 0, canvas.width, canvas.height, palette.sky); level.clouds.forEach((c) => drawCloud(c.x - cameraX * 0.35, c.y)); }
function drawGround() { rect(-cameraX, groundY, worldWidth, canvas.height - groundY, palette.brickA); for (let x = 0; x < worldWidth; x += TILE) drawBrick(x - cameraX, groundY); }

function drawWorld() {
  level.hills.forEach((h) => drawHill(h.x - cameraX, h.w, h.h));
  level.bushes.forEach((b) => drawBush(b.x - cameraX, b.w));
  level.blocks.forEach((b) => (b.kind === "question" ? drawQuestion(b.x - cameraX, b.y) : drawBrick(b.x - cameraX, b.y)));
  level.pipes.forEach((p) => drawPipe(p.x - cameraX, p.h, p.usable));
  level.stairs.forEach((s) => drawStairs(s.x - cameraX, s.steps));

  const fx = 5850 - cameraX;
  rect(fx, 145, 4, groundY - 145, "#ffffff");
  rect(fx + 4, 152, 14, 10, "#32d33e");
  rect(5980 - cameraX, groundY - 72, 80, 72, "#8a3f10");
  rect(6000 - cameraX, groundY - 88, 40, 18, "#8a3f10");
  rect(6012 - cameraX, groundY - 28, 16, 28, "#221000");
}

function drawMarioSprite() {
  const x = player.x - cameraX;
  if (!spriteReady) {
    rect(x + 7, player.y, 14, 8, "#a45122");
    rect(x + 5, player.y + 8, 18, 12, "#f0bf8c");
    rect(x + 3, player.y + 20, 22, 12, "#d8261d");
    rect(x + 5, player.y + 32, 8, 8, "#2f54bb");
    rect(x + 15, player.y + 32, 8, 8, "#2f54bb");
    return;
  }

  // Expected sprite cell size in provided sheet
  const frameW = 16;
  const frameH = 16;
  const runFrame = Math.floor(performance.now() / 120) % 3;
  const row = state.power === "fire" ? 3 : state.power === "super" ? 2 : 1;
  let col = 0;
  if (!player.onGround) col = 7;
  else if (Math.abs(player.vx) > 1) col = 2 + runFrame;
  const sx = col * frameW;
  const sy = row * frameH;

  ctx.save();
  if (player.facing < 0) {
    ctx.translate(Math.round(x + player.w), 0);
    ctx.scale(-1, 1);
    ctx.drawImage(spriteSheet, sx, sy, frameW, frameH, 0, player.y + 8, player.w, player.h - 8);
  } else {
    ctx.drawImage(spriteSheet, sx, sy, frameW, frameH, x, player.y + 8, player.w, player.h - 8);
  }
  ctx.restore();
}

function drawEnemy(e) {
  const x = e.x - cameraX;
  rect(x, e.y, e.w, e.h, e.c1);
  rect(x + 4, e.y + 4, e.w - 8, e.h - 8, e.c2);
  rect(x + 7, e.y + e.h - 6, 5, 3, "#000");
  rect(x + e.w - 12, e.y + e.h - 6, 5, 3, "#000");
}

function drawPowerup(p) {
  const x = p.x - cameraX;
  if (p.kind === "mushroom") {
    rect(x, p.y, 16, 8, "#d53030");
    rect(x + 2, p.y + 2, 12, 6, "#f25e5e");
    rect(x + 4, p.y + 8, 8, 8, "#f8d8a0");
  } else if (p.kind === "flower") {
    rect(x + 5, p.y + 9, 6, 7, "#1fad38");
    rect(x + 1, p.y + 1, 14, 8, "#f9a726");
    rect(x + 5, p.y + 3, 6, 4, "#ffeb8b");
  } else {
    const blink = Math.floor(performance.now() / 80) % 2;
    rect(x + 6, p.y, 4, 16, blink ? "#fff24a" : "#ffe27a");
    rect(x, p.y + 6, 16, 4, blink ? "#ffe27a" : "#fff24a");
    rect(x + 3, p.y + 3, 10, 10, "#fff");
  }
}

function handleControls() {
  const run = state.keys.ShiftLeft || state.keys.ShiftRight;
  const max = run ? 5.4 : 3.7;
  const accel = run ? 0.48 : 0.34;
  if (state.keys.ArrowLeft) { player.vx = Math.max(player.vx - accel, -max); player.facing = -1; }
  else if (state.keys.ArrowRight) { player.vx = Math.min(player.vx + accel, max); player.facing = 1; }
  else { player.vx *= 0.82; if (Math.abs(player.vx) < 0.1) player.vx = 0; }
}

function collideAABB(obj, block) {
  if (!overlap(obj, block)) return false;
  const prevBottom = obj.y + obj.h - obj.vy;
  const prevTop = obj.y - obj.vy;
  const prevRight = obj.x + obj.w - obj.vx;
  const prevLeft = obj.x - obj.vx;
  const hitTop = prevBottom <= block.y + 2;
  const hitBottom = prevTop >= block.y + block.h - 2;
  const hitLeft = prevRight <= block.x + 2;
  const hitRight = prevLeft >= block.x + block.w - 2;
  return { hitTop, hitBottom, hitLeft, hitRight };
}

function resolveCollisions() {
  player.onGround = false;
  player.onPipe = null;
  if (player.y + player.h >= groundY) { player.y = groundY - player.h; player.vy = 0; player.onGround = true; }

  level.blocks.forEach((b) => {
    const r = { x: b.x, y: b.y, w: TILE, h: TILE };
    const hit = collideAABB(player, r);
    if (!hit) return;
    if (player.vy >= 0 && hit.hitTop) { player.y = r.y - player.h; player.vy = 0; player.onGround = true; }
    else if (player.vy < 0 && hit.hitBottom) {
      player.y = r.y + r.h;
      player.vy = 0.4;
      if (b.kind === "question") {
        b.kind = "brick";
        const drop = ["mushroom", "flower", "star"][Math.floor(Math.random() * 3)];
        powerups.push(createPowerup(drop, b.x, b.y - 18));
        logEvent(`Block spawned ${drop}.`);
      }
    } else if (player.vx > 0 && hit.hitLeft) { player.x = r.x - player.w; player.vx = 0; }
    else if (player.vx < 0 && hit.hitRight) { player.x = r.x + r.w; player.vx = 0; }
  });

  level.pipes.forEach((p) => {
    const r = { x: p.x, y: groundY - p.h, w: 32, h: p.h };
    const hit = collideAABB(player, r);
    if (!hit) return;

    if (player.vy >= 0 && hit.hitTop) {
      player.y = r.y - player.h;
      player.vy = 0;
      player.onGround = true;
      player.onPipe = p.usable ? p : null;
    } else if (player.vx > 0 && hit.hitLeft) {
      player.x = r.x - player.w;
      player.vx = 0;
    } else if (player.vx < 0 && hit.hitRight) {
      player.x = r.x + r.w;
      player.vx = 0;
    } else if (player.vy < 0 && hit.hitBottom) {
      player.y = r.y + r.h;
      player.vy = 0.2;
    }
  });

  level.stairs.forEach((s) => {
    for (let i = 0; i < s.steps; i++) {
      for (let j = 0; j <= i; j++) {
        const r = { x: s.x + i * TILE, y: groundY - TILE * (j + 1), w: TILE, h: TILE };
        const hit = collideAABB(player, r);
        if (hit && player.vy >= 0 && hit.hitTop) {
          player.y = r.y - player.h;
          player.vy = 0;
          player.onGround = true;
        }
      }
    }
  });

  if (player.onPipe && (state.keys.ArrowDown || state.keys.KeyS) && player.onPipe.exitX) {
    const dest = player.onPipe.exitX;
    player.x = dest + 2;
    const exitPipe = level.pipes.find((p) => p.x === dest);
    player.y = groundY - player.h - (exitPipe ? exitPipe.h : 0);
    player.vy = player.onPipe.exitBoost || -8;
    logEvent("Entered usable pipe.");
  }
}

function updatePowerups() {
  powerups = powerups.filter((p) => p.active);
  powerups.forEach((p) => {
    if (p.kind === "flower") {
      p.vx = 0;
    } else {
      p.vy += state.gravity * 0.8;
      p.x += p.vx;
      p.y += p.vy;

      if (p.y + p.h >= groundY) {
        p.y = groundY - p.h;
        p.vy = p.kind === "star" ? -7.2 : 0;
      }

      level.pipes.forEach((pipe) => {
        const r = { x: pipe.x, y: groundY - pipe.h, w: 32, h: pipe.h };
        if (!overlap(p, r)) return;
        if (p.vx > 0) { p.x = r.x - p.w; p.vx *= -1; }
        else if (p.vx < 0) { p.x = r.x + r.w; p.vx *= -1; }
      });
    }

    if (overlap(player, p)) {
      p.active = false;
      if (p.kind === "mushroom") state.power = "super";
      if (p.kind === "flower") state.power = "fire";
      if (p.kind === "star") {
        for (let i = 0; i < 20; i++) state.particles.push({ x: player.x + Math.random() * 20, y: player.y + Math.random() * 25, t: 80 });
      }
      logEvent(`Collected ${p.kind}.`);
    }
  });
}

function physicsStep() {
  player.vy += state.gravity;
  player.x += player.vx;
  player.y += player.vy;
  if (player.x < 0) player.x = 0;
  if (player.x + player.w > worldWidth) player.x = worldWidth - player.w;

  resolveCollisions();

  enemies = enemies.filter((e) => e.alive);
  enemies.forEach((e) => {
    e.x += e.vx;
    if (e.x < 0 || e.x + e.w > worldWidth) e.vx *= -1;
    level.pipes.forEach((p) => {
      const r = { x: p.x, y: groundY - p.h, w: 32, h: p.h };
      if (overlap(e, r)) e.vx *= -1;
    });

    if (overlap(player, e)) {
      const stomp = player.vy > 0 && player.y + player.h - e.y < 18;
      if (stomp) { e.alive = false; player.vy = -8.4; logEvent(`Stomped ${e.type}.`); }
      else {
        player.x = 100; player.y = groundY - player.h; player.vx = 0; player.vy = 0;
        state.power = "small";
        logEvent("Enemy collision: player reset.");
      }
    }
  });

  updatePowerups();
  state.particles.forEach((p) => { p.y -= 0.9; p.t -= 1; });
  state.particles = state.particles.filter((p) => p.t > 0);
  cameraX = Math.max(0, Math.min(player.x - canvas.width * 0.35, worldWidth - canvas.width));
}

function drawParticles() { state.particles.forEach((p) => rect(p.x - cameraX, p.y, 4, 6, "#ffd84f")); }

function randomEvent() {
  const events = [
    () => {
      const prev = state.gravity;
      state.gravity = Number((Math.random() * 1.4 + 0.3).toFixed(1));
      gravityControl.value = state.gravity;
      gravityValue.textContent = state.gravity;
      logEvent(`Gravity shift: ${prev} → ${state.gravity}`);
    },
    () => {
      const type = ["goomba", "koopa", "beetle"][Math.floor(Math.random() * 3)];
      enemies.push(createEnemy(Math.min(worldWidth - 120, player.x + 220), type));
      logEvent(`Spawned random ${type}.`);
    },
    () => {
      const gift = ["mushroom", "flower", "star"][Math.floor(Math.random() * 3)];
      powerups.push(createPowerup(gift, player.x + 24, player.y - 20));
      logEvent(`Power-up event: ${gift}.`);
    },
  ];
  events[Math.floor(Math.random() * events.length)]();
}

function resetWorld() {
  player.x = 100; player.y = groundY - player.h; player.vx = 0; player.vy = 0;
  level.blocks.forEach((b, i) => { b.kind = originalKinds[i]; });
  state.particles = [];
  state.power = "small";
  powerups = [];
  seedEnemies();
  logEvent("World reset.");
}

function render() {
  drawBackground();
  drawGround();
  drawWorld();
  enemies.forEach(drawEnemy);
  powerups.forEach(drawPowerup);
  drawMarioSprite();
  drawParticles();
}

function loop() {
  handleControls();
  physicsStep();
  render();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (e) => {
  state.keys[e.code] = true;
  if (e.code === "Space" && player.onGround) player.vy = -state.jumpForce;
});
window.addEventListener("keyup", (e) => { state.keys[e.code] = false; });

gravityControl.addEventListener("input", () => { state.gravity = Number(gravityControl.value); gravityValue.textContent = state.gravity; });
jumpControl.addEventListener("input", () => { state.jumpForce = Number(jumpControl.value); jumpValue.textContent = state.jumpForce; });
spawnEnemyBtn.addEventListener("click", () => {
  const type = enemyTypeSelect.value;
  enemies.push(createEnemy(Math.min(worldWidth - 100, player.x + 150), type));
  logEvent(`Created ${type} near player.`);
});
replaceEnemiesBtn.addEventListener("click", () => {
  const type = enemyTypeSelect.value;
  enemies = enemies.map((_, i) => createEnemy(640 + i * 840, type));
  logEvent(`Replaced all enemies with ${type}.`);
});
randomEventBtn.addEventListener("click", randomEvent);
resetWorldBtn.addEventListener("click", resetWorld);
openCustomizer.addEventListener("click", () => { customizerPanel.classList.remove("hidden"); openCustomizer.setAttribute("aria-expanded", "true"); });
closeCustomizer.addEventListener("click", () => { customizerPanel.classList.add("hidden"); openCustomizer.setAttribute("aria-expanded", "false"); });

seedEnemies();
logEvent("World ready. Open Customizer to tweak gameplay.");
loop();
