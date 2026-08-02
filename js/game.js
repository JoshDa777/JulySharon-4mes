/* =====================================================================
   🥔🚀 JUEGO PRINCIPAL — 4º MES 💖
   Minijuego roguelike espacial: la papa astronauta debe llegar a la carta
   Cada muerte / reinicio genera un mapa NUEVO (generación procedural).
   ===================================================================== */

(function () {
  "use strict";

  /* ---------- UTILIDADES ---------- */
  const $ = (id) => document.getElementById(id);
  const aleatorio = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function formatearTiempo(seg) {
    const m = Math.floor(seg / 60);
    const s = Math.floor(seg % 60);
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function apodoAleatorio() {
    return aleatorio(CONFIG.apodos);
  }

  /* ---------- CANVAS ---------- */
  const canvas = $("game-canvas");
  const ctx = canvas.getContext("2d");
  let VW = window.innerWidth;
  let VH = window.innerHeight;

  function ajustarCanvas() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    VW = window.innerWidth;
    VH = window.innerHeight;
  }
  ajustarCanvas();
  window.addEventListener("resize", ajustarCanvas);

  /* ---------- AUDIO (sonidos simples WebAudio) ---------- */
  let audioCtx = null;
  function sonido(tipo) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g);
      g.connect(audioCtx.destination);
      const t0 = audioCtx.currentTime;
      let f = 440, dur = 0.15, f2 = null;
      if (tipo === "saltar") { f = 540; dur = 0.1; }
      if (tipo === "checkpoint") { f = 740; f2 = 1046; dur = 0.25; }
      if (tipo === "muerte") { f = 180; f2 = 90; dur = 0.35; }
      if (tipo === "victoria") { f = 660; f2 = 1320; dur = 0.5; }
      if (tipo === "meta") { f = 880; dur = 0.15; }
      o.type = "sine";
      if (f2) { o.frequency.setValueAtTime(f, t0); o.frequency.exponentialRampToValueAtTime(f2, t0 + dur); }
      else o.frequency.setValueAtTime(f, t0);
      g.gain.setValueAtTime(0.12, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.start(t0);
      o.stop(t0 + dur);
    } catch (e) { /* silencio */ }
  }

  /* ---------- ESTADO ---------- */
  const estado = {
    jugando: false,
    pausado: false,
    vidas: 5,
    estaciones: 0,      // estaciones alcanzadas (0..5)
    tiempo: 0,          // segundos totales del viaje (acumula intentos)
    shake: 0,
  };

  /* ---------- JUGADOR ---------- */
  const jugador = {
    x: 60, y: 0,
    xPrev: 60, yPrev: 0,
    vx: 0, vy: 0,
    enSuelo: false,
    coyote: 0,
    invulnerable: 0,
  };

  const camara = { x: 0, y: 0 };
  const G = 1450;
  const VEL = 320;
  const SALTO = -720;

  /* ---------- MUNDO ---------- */
  let plataformas = [];
  let peligros = [];
  let estaciones = [];
  let meta = null;
  let particulas = [];
  let nivel = { ancho: 4000, inicioY: 0, baseY: 0 };

  let bufferSalto = 0;
  let proximaFrase = 18;

  /* ---------- TECLAS ---------- */
  const teclas = { izq: false, der: false, arriba: false, abajoHeld: false };

  window.addEventListener("keydown", (e) => {
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code)) e.preventDefault();
    switch (e.code) {
      case "KeyA": case "ArrowLeft": teclas.izq = true; break;
      case "KeyD": case "ArrowRight": teclas.der = true; break;
      case "KeyW": case "ArrowUp":
        if (!e.repeat) bufferSalto = 0.16;
        teclas.arriba = true;
        break;
      case "KeyS": case "ArrowDown": teclas.abajoHeld = true; break;
      case "Space":
        if (estado.jugando) togglePausa();
        break;
      case "KeyR":
        if (estado.jugando && !estado.pausado) regenerarMapa();
        break;
    }
  });

  window.addEventListener("keyup", (e) => {
    switch (e.code) {
      case "KeyA": case "ArrowLeft": teclas.izq = false; break;
      case "KeyD": case "ArrowRight": teclas.der = false; break;
      case "KeyW": case "ArrowUp": teclas.arriba = false; break;
      case "KeyS": case "ArrowDown": teclas.abajoHeld = false; break;
    }
  });

  window.addEventListener("blur", () => {
    if (estado.jugando && !estado.pausado) togglePausa();
  });

  /* ---------- TOAST ---------- */
  let toastTimer = null;
  function toast(msg, dur) {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("visible"), dur || 3600);
  }

  /* ---------- GENERACIÓN PROCEDURAL (ROGUELIKE) ---------- */
  function generarNivel() {
    const baseY = VH * 0.62;
    plataformas = [];
    peligros = [];
    estaciones = [];
    meta = null;
    particulas = [];
    nivel = { ancho: 4000, inicioY: baseY + 70, baseY: baseY };

    let x = 0;
    let y = baseY;

    // Plataforma de inicio amplia y segura
    plataformas.push({ x: -60, y: baseY + 70, w: 460, h: 40, segura: true });
    x = 400;

    for (let s = 0; s < 5; s++) {
      const numPlats = 9 + s * 1;
      for (let i = 0; i < numPlats; i++) {
        const w = 125 + Math.random() * 95;
        const gap = 70 + Math.random() * 50 + s * 3;
        x += gap;
        y += (Math.random() * 150 - 75);
        y = clamp(y, 100, VH - 160);
        plataformas.push({ x: x, y: y, w: w, h: 22 });

        // Picos de cristal rosa 💎
        if (i > 3 && Math.random() < 0.12 + s * 0.04) {
          const pw = 40 + Math.random() * 25;
          peligros.push({ tipo: "picos", x: x + w / 2 - pw / 2, y: y - 16, w: pw, h: 16 });
        }

        // Meteoros en zonas avanzadas ☄️
        if (i % 4 === 0 && s >= 2 && Math.random() < 0.2 + s * 0.06) {
          const mx = x - gap / 2;
          peligros.push({
            tipo: "meteoro",
            x: mx, origen: mx,
            y: y - 60 - Math.random() * 80,
            vx: (Math.random() < 0.5 ? -1 : 1) * (60 + s * 20 + Math.random() * 40),
            r: 7 + Math.random() * 4,
            rango: gap * 0.8,
          });
        }
        x += w;
      }

      // Estación espacial — punto de control 💖
      const ex = x;
      plataformas.push({ x: ex, y: baseY + 30, w: 300, h: 34, estacion: true });
      if (s === 4) {
        x = ex + 200;
        plataformas.push({ x: x, y: baseY - 30, w: 240, h: 30, esMeta: true });
        meta = { x: x + 120, y: baseY - 150 };
      }
      estaciones.push({
        x: ex + 150,
        y: baseY - 60,
        alcanzada: s < estado.estaciones,
      });
      x = ex + 190;
    }

    nivel.ancho = x + 320;
    respawnEnCheckpoint();
  }

  function respawnEnCheckpoint() {
    if (estado.estaciones > 0) {
      const c = estaciones[Math.min(estado.estaciones - 1, estaciones.length - 1)];
      if (c) {
        jugador.x = c.x;
        jugador.y = c.y - 30;
      }
    } else {
      jugador.x = 80;
      jugador.y = nivel.inicioY - 14;
    }
    jugador.vx = 0;
    jugador.vy = 0;
    jugador.enSuelo = false;
    jugador.invulnerable = 2.0;
    camara.x = Math.max(0, jugador.x - VW * 0.4);
    camara.y = Math.max(0, jugador.y - VH * 0.55);
  }

  function regenerarMapa() {
    // Roguelike: mapa NUEVO, mantiene estaciones alcanzadas
    generarNivel();
    toast("🗺️ Nuevo mapa generado. ¡Sigue, " + apodoAleatorio() + "!");
    sonido("meta");
  }

  /* ---------- PARTÍCULAS ---------- */
  function spawnParticulas(x, y, color, n, spd) {
    for (let i = 0; i < (n || 8); i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (Math.random() * 0.6 + 0.4) * (spd || 130);
      particulas.push({
        x: x, y: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 40,
        vida: 0.5 + Math.random() * 0.5,
        max: 0.9,
        color: color,
        t: 3 + Math.random() * 2,
      });
    }
  }

  /* ---------- FÍSICA / COLISIONES ---------- */
  function resolverColisiones(dt) {
    jugador.enSuelo = false;
    for (const pl of plataformas) {
      const dentroX = jugador.x + 13 > pl.x && jugador.x - 13 < pl.x + pl.w;
      const dentroY = jugador.y + 14 > pl.y && jugador.y - 14 < pl.y + pl.h;
      if (!dentroX || !dentroY) continue;

      const prevY = jugador.yPrev;
      if (prevY + 14 <= pl.y + 2) {
        // Aterrizar
        jugador.y = pl.y - 14;
        if (jugador.vy > 0) jugador.enSuelo = true;
        jugador.vy = 0;
      } else if (prevY - 14 >= pl.y + pl.h - 2) {
        // Golpe por debajo
        jugador.y = pl.y + pl.h + 14;
        if (jugador.vy < 0) jugador.vy = 0;
      } else {
        // Empuje lateral
        const desdeIzq = jugador.xPrev + 14 <= pl.x + 1;
        if (desdeIzq) jugador.x = pl.x - 14;
        else jugador.x = pl.x + pl.w + 14;
      }
    }
  }

  function comprobarPeligros() {
    for (const p of peligros) {
      if (p.tipo === "picos") {
        if (
          jugador.x + 12 > p.x && jugador.x - 12 < p.x + p.w &&
          jugador.y + 14 > p.y && jugador.y - 12 < p.y + p.h
        ) {
          danoAlJugador();
          return;
        }
      } else if (p.tipo === "meteoro") {
        const dx = jugador.x - p.x;
        const dy = (jugador.y - 6) - p.y;
        if (Math.hypot(dx, dy) < p.r + 13) {
          danoAlJugador();
          return;
        }
      }
    }
  }

  function danoAlJugador() {
    if (jugador.invulnerable > 0 || !estado.jugando) return;
    estado.vidas--;
    estado.shake = 0.35;
    jugador.invulnerable = 1.6;
    sonido("muerte");
    spawnParticulas(jugador.x, jugador.y, "#ff5fa2", 14, 180);
    if (estado.vidas <= 0) {
      gameOver();
    } else {
      // Roguelike: muere → nuevo mapa, respawn en última estación
      toast(CONFIG.frasesMuerte[Math.floor(Math.random() * CONFIG.frasesMuerte.length)], 3200);
      setTimeout(generarNivel, 600);
      estado.jugando = false;
      setTimeout(() => { estado.jugando = true; proximaFrase = 14; }, 650);
    }
  }

  /* ---------- PROGRESO ---------- */
  function comprobarProgreso() {
    for (let i = 0; i < estaciones.length; i++) {
      const st = estaciones[i];
      if (!st.alcanzada && Math.hypot(jugador.x - st.x, (jugador.y - 4) - st.y) < 95) {
        st.alcanzada = true;
        estado.estaciones = Math.max(estado.estaciones, i + 1);
        sonido("checkpoint");
        spawnParticulas(st.x, st.y, "#ff69b4", 20, 160);
        spawnParticulas(st.x, st.y, "#ffd700", 8, 120);
        toast(aleatorio(CONFIG.frasesEstacion) + "  💖  (" + estado.estaciones + "/5)", 3600);
      }
    }
    if (meta && estado.estaciones === 5 && Math.hypot(jugador.x - meta.x, (jugador.y - 14) - meta.y) < 95) {
      victoria();
    }
  }

  /* ---------- ACTUALIZAR ---------- */
  function actualizar(dt) {
    // Temporizador del viaje
    estado.tiempo += dt;
    EstadoActualizarHUD();

    // Frases motivacionales
    proximaFrase -= dt;
    if (proximaFrase <= 0) {
      proximaFrase = 18 + Math.random() * 10;
      toast(aleatorio(CONFIG.frasesJuego), 2400);
    }

    // Buffer de salto & coyote time
    bufferSalto = Math.max(0, bufferSalto - dt);
    if (jugador.enSuelo) jugador.coyote = 0.15;
    else jugador.coyote = Math.max(0, jugador.coyote - dt);

    // Movimiento horizontal
    jugador.vx = 0;
    if (teclas.izq) jugador.vx = -VEL;
    if (teclas.der) jugador.vx = VEL;
    if (teclas.izq && teclas.der) jugador.vx *= 0.3;

    // Gravedad
    jugador.vy += G * dt;
    if (teclas.abajoHeld && !jugador.enSuelo) jugador.vy += G * 1.6 * dt;
    if (!teclas.arriba && jugador.vy < 0) jugador.vy += G * 1.7 * dt;

    // Salto
    if (bufferSalto > 0 && (jugador.enSuelo || jugador.coyote > 0)) {
      jugador.vy = SALTO;
      bufferSalto = 0;
      jugador.coyote = 0;
      jugador.enSuelo = false;
      sonido("saltar");
      spawnParticulas(jugador.x, jugador.y + 12, "#ffb6d9", 5, 70);
    }

    // Guardar posición previa para colisiones
    jugador.xPrev = jugador.x;
    jugador.yPrev = jugador.y;

    // Integrar
    jugador.x += jugador.vx * dt;
    jugador.y += jugador.vy * dt;

    // Límites horizontales del nivel
    if (jugador.x < 10) { jugador.x = 10; }
    if (jugador.x > nivel.ancho - 10) { jugador.x = nivel.ancho - 10; }

    resolverColisiones(dt);

    // Estela de la papita al correr
    if ((teclas.izq || teclas.der) && jugador.enSuelo && Math.random() < 0.3) {
      particulas.push({
        x: jugador.x - (teclas.der ? 12 : -12),
        y: jugador.y + 12,
        vx: (Math.random() - 0.5) * 30,
        vy: Math.random() * 20,
        vida: 0.3, max: 0.3,
        color: "rgba(255,182,217,0.5)",
        t: 2 + Math.random() * 2,
      });
    }

    // Invulnerabilidad
    jugador.invulnerable = Math.max(0, jugador.invulnerable - dt);

    // Peligros
    comprobarPeligros();

    // Caída al vacío
    if (jugador.y > VH + 120) {
      danoAlJugador();
      if (estado.jugando) {
        // si sigue vivo, reaparece
        jugador.y = VH - 400;
        jugador.vy = 0;
      }
    }

    // Meteoros
    for (const p of peligros) {
      if (p.tipo === "meteoro") {
        p.x += p.vx * dt;
        if (p.x > p.origen + p.rango / 2 || p.x < p.origen - p.rango / 2) p.vx *= -1;
      }
    }

    // Partículas
    for (let i = particulas.length - 1; i >= 0; i--) {
      const p = particulas[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 180 * dt;
      p.vida -= dt;
      if (p.vida <= 0) particulas.splice(i, 1);
    }

    // Progreso (estaciones / meta)
    comprobarProgreso();

    // Cámara
    camara.x += (jugador.x - VW * 0.4 - camara.x) * Math.min(1, dt * 6);
    camara.y += (jugador.y - VH * 0.55 - camara.y) * Math.min(1, dt * 6);
    camara.x = clamp(camara.x, 0, Math.max(0, nivel.ancho - VW));
    camara.y = clamp(camara.y, 0, Math.max(0, nivel.baseY + 120));

    estado.shake = Math.max(0, estado.shake - dt);

    // Brújula
    actualizarBrujula();
  }

  /* ---------- DIBUJAR ---------- */
  function dibujarParallax() {
    const px = camara.x * 0.18;

    // Nebulosa
    const g = ctx.createRadialGradient(VW * 0.25 - px, VH * 0.22, 40, VW * 0.25 - px, VH * 0.22, VH * 0.65);
    g.addColorStop(0, "rgba(124,58,237,0.14)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VW, VH);

    // Planeta rosa lejano
    const cx = VW * 0.72 - px;
    const cy = VH * 0.16;
    ctx.fillStyle = "rgba(255,105,180,0.08)";
    ctx.beginPath();
    ctx.arc(cx, cy, 95, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,105,180,0.16)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 95, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,182,217,0.12)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + 12, 150, 32, -0.18, 0, Math.PI * 2);
    ctx.stroke();
  }

  function redondearRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function dibujarPlataforma(pl) {
    const x = pl.x, y = pl.y, w = pl.w, h = pl.h;

    // Resplandor suave
    ctx.fillStyle = "rgba(255,105,180,0.10)";
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2 + 8, h / 2 + 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cuerpo rocoso espacial
    const g = ctx.createLinearGradient(x, y, x, y + h);
    g.addColorStop(0, "#4a3b6b");
    g.addColorStop(1, "#2a2144");
    ctx.fillStyle = g;
    redondearRect(x, y, w, h, 8);
    ctx.fill();

    // Borde rosa si es meta
    ctx.strokeStyle = pl.esMeta ? "rgba(255,105,180,0.9)" : "rgba(255,105,180,0.4)";
    ctx.lineWidth = pl.esMeta ? 2.5 : 1.5;
    redondearRect(x, y, w, h, 8);
    ctx.stroke();

    // Cráteres
    if (!pl.segura) {
      ctx.fillStyle = "rgba(0,0,0,0.22)";
      const n = Math.max(1, Math.floor(w / 45));
      for (let i = 0; i < n; i++) {
        const cx = x + ((i * 37 + 20) % Math.max(1, w - 22)) + 10;
        const cy = y + ((i * 53 + 12) % Math.max(1, h - 8)) + 5;
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function dibujarPicos(p) {
    const n = 3;
    const bw = p.w / n;
    ctx.fillStyle = "#ff5fa2";
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.moveTo(p.x + i * bw, p.y + p.h);
      ctx.lineTo(p.x + i * bw + bw / 2, p.y);
      ctx.lineTo(p.x + (i + 1) * bw, p.y + p.h);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.moveTo(p.x + i * bw + bw * 0.2, p.y + p.h);
      ctx.lineTo(p.x + i * bw + bw / 2, p.y + p.h * 0.15);
      ctx.lineTo(p.x + i * bw + bw * 0.45, p.y + p.h);
      ctx.closePath();
      ctx.fill();
    }
  }

  function dibujarMeteoro(m) {
    ctx.fillStyle = "rgba(255,130,90,0.15)";
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r * 1.9, 0, Math.PI * 2);
    ctx.fill();
    const g = ctx.createRadialGradient(m.x - 2, m.y - 3, 1, m.x, m.y, m.r);
    g.addColorStop(0, "#ffd9a0");
    g.addColorStop(0.6, "#ff8c5a");
    g.addColorStop(1, "#b8452a");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,150,100,0.25)";
    ctx.beginPath();
    ctx.arc(m.x - Math.sign(m.vx || 1) * 14, m.y + 3, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  function dibujarEstacion(st, i) {
    const t = performance.now() / 1000;
    const pulso = 1 + Math.sin(t * 2.5 + i) * 0.12;
    ctx.save();
    ctx.translate(st.x, st.y);

    // Halo
    const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 48);
    g.addColorStop(0, "rgba(255,105,180,0.35)");
    g.addColorStop(1, "rgba(255,105,180,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.fill();

    // Poste
    ctx.strokeStyle = "rgba(255,182,217,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 30);
    ctx.stroke();

    // Corazón / bandera
    ctx.font = (26 * pulso) + "px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(st.alcanzada ? "⭐" : "❤️", 0, -8 * pulso);

    ctx.restore();
  }

  function dibujarMeta() {
    if (!meta) return;
    const t = performance.now() / 1000;
    const pulso = 1 + Math.sin(t * 3) * 0.08;
    ctx.save();
    ctx.translate(meta.x, meta.y);

    const g = ctx.createRadialGradient(0, 0, 5, 0, 0, 70);
    g.addColorStop(0, "rgba(255,105,180,0.6)");
    g.addColorStop(1, "rgba(255,105,180,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 70, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = (52 * pulso) + "px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("💌", 0, 0);

    for (let i = 0; i < 4; i++) {
      const a = t * 1.6 + i * Math.PI / 2;
      ctx.font = "16px serif";
      ctx.fillText("💖", Math.cos(a) * 52, Math.sin(a) * 52);
    }
    ctx.restore();
  }

  function dibujarJugador() {
    const p = jugador;
    const t = performance.now() / 1000;

    // Parpadeo de invulnerabilidad
    if (p.invulnerable > 0 && Math.floor(t * 12) % 2 === 0) return;

    const paso = p.enSuelo && (teclas.izq || teclas.der)
      ? Math.sin(t * 14) * 6
      : 0;
    const mirando = teclas.der ? 1 : teclas.izq ? -1 : 1;

    ctx.save();
    ctx.translate(p.x, p.y);

    // Sombrilla
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(0, 17, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Piernas
    ctx.fillStyle = "#7a4f2d";
    ctx.fillRect(-9 + paso, 10, 7, 7);
    ctx.fillRect(2 - paso, 10, 7, 7);
    // Botas espaciales
    ctx.fillStyle = "#333";
    ctx.fillRect(-11 + paso * mirando, 16, 9, 4);
    ctx.fillRect(2 - paso * mirando, 16, 9, 4);

    // Cuerpo (la papita) 🥔
    ctx.fillStyle = "#c89a61";
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(90,50,20,0.4)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 13, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Pecas
    ctx.fillStyle = "#a5713c";
    ctx.beginPath(); ctx.arc(-6, -2, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, 2, 1.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(1, 6, 1.2, 0, Math.PI * 2); ctx.fill();

    // Brazo que saluda
    ctx.strokeStyle = "#a5713c";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(14 * mirando, -2);
    ctx.lineTo(20 * mirando, -9 + Math.sin(t * 6) * 2);
    ctx.stroke();

    // Ojo
    ctx.fillStyle = "#222";
    ctx.beginPath();
    ctx.arc(5, -4, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(5.8, -5, 1, 0, Math.PI * 2);
    ctx.fill();

    // Sonrisa
    ctx.strokeStyle = "#5a3a17";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(5, 2, 4.5, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // Casco de astronauta 👨‍🚀
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#aee6ff";
    ctx.beginPath();
    ctx.arc(0, -6, 12, Math.PI, 0);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(200,255,255,0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -6, 12, Math.PI, 0);
    ctx.stroke();

    ctx.restore();
  }

  function dibujarFondoPolvo() {
    // Pequeño polvo estelar con parallax
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 197) % VW) - ((camara.x * (0.4 + (i % 3) * 0.15)) % VW);
      const sy = ((i * 331) % VH);
      ctx.globalAlpha = 0.25 + Math.sin(performance.now() / 800 + i) * 0.15;
      ctx.fillRect(sx, sy, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;
  }

  function dibujar() {
    ctx.clearRect(0, 0, VW, VH);

    if (!estado.jugando) return;

    dibujarParallax();
    dibujarFondoPolvo();

    // Screen shake
    ctx.save();
    if (estado.shake > 0) {
      ctx.translate(
        (Math.random() - 0.5) * estado.shake * 24,
        (Math.random() - 0.5) * estado.shake * 24
      );
    }

    ctx.translate(-camara.x, -camara.y);

    // Plataformas
    for (const pl of plataformas) dibujarPlataforma(pl);

    // Meta (la carta final)
    dibujarMeta();

    // Peligros
    for (const p of peligros) {
      if (p.tipo === "picos") dibujarPicos(p);
      else if (p.tipo === "meteoro") dibujarMeteoro(p);
    }

    // Estaciones
    estaciones.forEach(dibujarEstacion);

    // Partículas
    for (const p of particulas) {
      ctx.globalAlpha = Math.max(0, p.vida / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.t, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Jugador
    dibujarJugador();

    ctx.restore();
  }

  /* ---------- HUD / BRÚJULA ---------- */
  let hudIntervaloSeg = -1;
  function EstadoActualizarHUD() {
    if (Math.floor(estado.tiempo) !== hudIntervaloSeg) {
      hudIntervaloSeg = Math.floor(estado.tiempo);
      $("hud-timer").textContent = formatearTiempo(estado.tiempo);
    }
    $("hud-checkpoints-valor").textContent = estado.estaciones + "/5";
    $("hud-nivel").textContent = Math.min(6, estado.estaciones + 1);

    let corazones = "";
    for (let i = 0; i < 5; i++) corazones += i < estado.vidas ? "❤️" : "🖤";
    $("hud-corazones").textContent = corazones;
  }

  function actualizarBrujula() {
    let tx, ty;
    const siguiente = estaciones.find((e) => !e.alcanzada);
    if (siguiente) {
      tx = siguiente.x;
      ty = siguiente.y;
    } else if (meta) {
      tx = meta.x;
      ty = meta.y;
    } else {
      return;
    }
    const ang = Math.atan2(ty - jugador.y, tx - jugador.x);
    const flecha = $("brujula-flecha");
    flecha.style.transform = "rotate(" + (ang * 180 / Math.PI) + "deg)";
  }

  /* ---------- ESCENAS / FLUJO ---------- */
  function mostrarEscena(ocultar, mostrar) {
    $(ocultar).classList.add("hidden");
    $(mostrar).classList.remove("hidden");
  }

  const overlays = document.querySelectorAll(".overlay");
  function mostrarOverlay(id) {
    overlays.forEach((o) => o.classList.add("hidden"));
    if (id && id !== "none") $(id).classList.remove("hidden");
  }

  function iniciarViaje() {
    mostrarEscena("menu", "intro");
    const textos = [
      "Calculando ruta por las estrellas…",
      "Encendiendo motores de la papita 🥔🚀",
      "Ajustando gravedad cero…",
      "Cargando la cartica 💌…",
      "El viaje dura unos " + CONFIG.metaMinutos + " minutos, " + apodoAleatorio() + ". ¡Vamos! 💖",
    ];
    let i = 0;
    $("intro-texto").textContent = textos[0];
    const barra = $("barra-carga");
    barra.style.width = "0%";
    const paso = 600;
    const intervalo = setInterval(() => {
      i++;
      if (i < textos.length) {
        $("intro-texto").textContent = textos[i];
        barra.style.width = ((i / textos.length) * 100) + "%";
      } else {
        clearInterval(intervalo);
        barra.style.width = "100%";
        setTimeout(empezarJuego, 400);
      }
    }, paso);
  }

  function empezarJuego() {
    mostrarEscena("intro", "game");
    $("hud").classList.remove("hidden");
    $("brujula").classList.remove("hidden");
    $("btn-pausa").style.display = "block";
    mostrarOverlay("none");
    estado.vidas = 5;
    estado.jugando = true;
    estado.pausado = false;
    proximaFrase = 10;
    hudIntervaloSeg = -1;
    generarNivel();
    toast("Usa W A S D para moverte, " + apodoAleatorio() + " 💕", 3200);
    actualizarBrujula();
  }

  function togglePausa() {
    estado.pausado = !estado.pausado;
    if (estado.pausado) mostrarOverlay("overlay-pausa");
    else $("overlay-pausa").classList.add("hidden");
    $("btn-pausa").textContent = estado.pausado ? "▶️" : "⏸️";
  }

  function gameOver() {
    estado.jugando = false;
    estado.pausado = false;
    $("muerte-texto").textContent = aleatorio(CONFIG.frasesMuerte);
    mostrarOverlay("overlay-muerte");
    sonido("muerte");
  }

  function reintentarViaje() {
    mostrarOverlay("none");
    estado.vidas = 5;
    estado.estaciones = 0;
    estado.jugando = true;
    estado.pausado = false;
    proximaFrase = 10;
    hudIntervaloSeg = -1;
    generarNivel();
    toast("El mapa es nuevo, como cada vez que vamos a otro planeta 🌍💖", 3400);
  }

  function victoria() {
    estado.jugando = false;
    estado.pausado = false;
    sonido("victoria");
    spawnParticulas(jugador.x, jugador.y, "#ffd700", 24, 220);
    window.SpaceStars.lanzarConfeti();
    setTimeout(() => mostrarOverlay("overlay-victoria"), 900);
    setTimeout(() => {
      // pequeña rafaga extra de confeti
      if (window.SpaceStars) window.SpaceStars.lanzarConfeti();
    }, 2000);
  }

  function mostrarCarta() {
    mostrarOverlay("carta");
    $("carta-titulo").textContent = CONFIG.cartaTitulo;
    const cont = $("carta-parrafos");
    cont.innerHTML = "";
    for (const parrafo of CONFIG.carta) {
      const el = document.createElement("p");
      el.className = "carta-parrafo";
      el.textContent = parrafo;
      cont.appendChild(el);
    }
    $("carta-firma").textContent = CONFIG.remitente;

    const tmp = document.createElement("p");
    tmp.className = "carta-parrafo";
    tmp.style.textAlign = "center";
    tmp.style.marginTop = "1.6rem";
    tmp.style.fontWeight = "700";
    tmp.style.color = "#d63384";
    tmp.textContent = "⏱️ Tardaste " + formatearTiempo(estado.tiempo) +
      " en cruzar el universo para llegar a ti. 💘";
    cont.appendChild(tmp);
  }

  /* ---------- EVENTOS DE BOTONES ---------- */
  $("btn-jugar").addEventListener("click", iniciarViaje);
  $("btn-pausa").addEventListener("click", togglePausa);
  $("btn-reanudar").addEventListener("click", togglePausa);
  $("btn-reintentar").addEventListener("click", reintentarViaje);
  $("btn-menu-muerte").addEventListener("click", () => {
    mostrarOverlay("none");
    mostrarEscena("game", "menu");
    $("hud").classList.add("hidden");
    $("brujula").classList.add("hidden");
    $("btn-pausa").style.display = "none";
    estado.jugando = false;
  });
  $("btn-abrir-carta").addEventListener("click", mostrarCarta);
  $("btn-carta-menu").addEventListener("click", () => {
    mostrarOverlay("none");
    mostrarEscena("carta", "menu");
    $("hud").classList.add("hidden");
    $("brujula").classList.add("hidden");
    $("btn-pausa").style.display = "none";
    estado.jugando = false;
  });

  /* ---------- CONTROLES TÁCTILES (móvil) ---------- */
  (function crearControlesTactiles() {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const cont = document.createElement("div");
    cont.id = "touch-controls";
    cont.innerHTML =
      '<div class="t-btn" data-k="izq">◀</div>' +
      '<div class="t-btn" data-k="der">▶</div>' +
      '<div class="t-btn t-salto" data-k="salto">⬆</div>';
    document.body.appendChild(cont);

    const style = document.createElement("style");
    style.textContent = `
      #touch-controls {
        position: fixed; bottom: 1.2rem; left: 50%; transform: translateX(-50%);
        display: flex; gap: 1rem; z-index: 25; pointer-events: none;
      }
      .t-btn {
        width: 64px; height: 64px; border-radius: 50%;
        background: rgba(255,105,180,0.2);
        border: 2px solid rgba(255,105,180,0.5);
        color: #fff; font-size: 1.4rem;
        display: flex; align-items: center; justify-content: center;
        pointer-events: auto; user-select: none;
        -webkit-user-select: none; touch-action: none;
      }
      .t-btn:active { background: rgba(255,105,180,0.5); }
      .t-salto { margin-left: 1rem; }
    `;
    document.head.appendChild(style);

    const manejar = (e, activo) => {
      e.preventDefault();
      const k = e.target.getAttribute("data-k");
      if (k === "izq") teclas.izq = activo;
      if (k === "der") teclas.der = activo;
      if (k === "salto") { if (activo) bufferSalto = 0.16; teclas.arriba = activo; }
    };
    cont.querySelectorAll(".t-btn").forEach((b) => {
      b.addEventListener("pointerdown", (e) => manejar(e, true));
      b.addEventListener("pointerup", (e) => manejar(e, false));
      b.addEventListener("pointercancel", (e) => manejar(e, false));
      b.addEventListener("pointerleave", (e) => manejar(e, false));
    });
  })();

  /* ---------- BUCLE PRINCIPAL ---------- */
  let ultimoTiempo = performance.now();
  function bucle(now) {
    const dt = Math.min(0.033, (now - ultimoTiempo) / 1000);
    if (estado.jugando && !estado.pausado) actualizar(dt);
    dibujar();
    ultimoTiempo = now;
    requestAnimationFrame(bucle);
  }

  /* ---------- INIT ---------- */
  // Aplicar textos del menú desde CONFIG
  $("menu-titulo").textContent = CONFIG.titulo;
  $("menu-subtitulo").textContent = CONFIG.subtitulo;

  requestAnimationFrame(bucle);
})();