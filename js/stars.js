/* =====================================================================
   🌟 FONDO DE ESTRELLAS + CONFETI
   ===================================================================== */

(function () {
  "use strict";

  /* ---------- ESTRELLAS ---------- */
  const canvas = document.getElementById("stars-canvas");
  const ctx = canvas.getContext("2d");
  let estrellas = [];
  let cometas = [];
  let ancho = 0;
  let alto = 0;

  function redimensionar() {
    ancho = canvas.width = window.innerWidth;
    alto = canvas.height = window.innerHeight;
  }

  function crearEstrellas() {
    const cantidad = Math.min(220, Math.floor((ancho * alto) / 6000));
    estrellas = [];
    for (let i = 0; i < cantidad; i++) {
      estrellas.push({
        x: Math.random() * ancho,
        y: Math.random() * alto,
        r: Math.random() * 1.6 + 0.3,
        velocidad: Math.random() * 0.4 + 0.05,
        parpadeo: Math.random() * Math.PI * 2,
        rosa: Math.random() < 0.18, // algunas estrellas rosadas ✨
      });
    }
  }

  function crearCometas() {
    // Cometas ocasionales
    if (Math.random() < 0.004 && cometas.length < 2) {
      cometas.push({
        x: Math.random() * ancho,
        y: -30,
        vx: (Math.random() - 0.5) * 6 + 3,
        vy: Math.random() * 4 + 4,
        vida: 90,
      });
    }
  }

  function dibujar(t) {
    ctx.clearRect(0, 0, ancho, alto);

    for (const e of estrellas) {
      e.parpadeo += 0.02;
      const alpha = 0.4 + Math.sin(e.parpadeo) * 0.3 + 0.3;
      ctx.globalAlpha = Math.max(0.15, alpha);
      ctx.fillStyle = e.rosa ? "#ff9ed2" : "#ffffff";
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Cometas
    crearCometas();
    for (let i = cometas.length - 1; i >= 0; i--) {
      const c = cometas[i];
      c.x += c.vx;
      c.y += c.vy;
      c.vida--;

      ctx.strokeStyle = "rgba(255, 182, 217, " + Math.max(0, c.vida / 90) + ")";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x - c.vx * 5, c.y - c.vy * 5);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 220, 240, 0.9)";
      ctx.beginPath();
      ctx.arc(c.x, c.y, 2.5, 0, Math.PI * 2);
      ctx.fill();

      if (c.vida <= 0 || c.y > alto + 50) cometas.splice(i, 1);
    }
  }

  /* ---------- CONFETI 💖 ---------- */
  const confetiCanvas = document.getElementById("confeti-canvas");
  const cctx = confetiCanvas.getContext("2d");
  let piezas = [];

  function lanzarConfeti() {
    confetiCanvas.width = window.innerWidth;
    confetiCanvas.height = window.innerHeight;
    const colores = ["#ff69b4", "#ffb6d9", "#d63384", "#ffd700", "#ffffff", "#ff85c2"];
    piezas = [];
    const cantidad = 140;
    for (let i = 0; i < cantidad; i++) {
      piezas.push({
        x: Math.random() * confetiCanvas.width,
        y: -20 - Math.random() * confetiCanvas.height * 0.5,
        w: Math.random() * 10 + 5,
        h: Math.random() * 15 + 6,
        color: colores[Math.floor(Math.random() * colores.length)],
        vy: Math.random() * 3 + 2,
        vx: (Math.random() - 0.5) * 1.5,
        rotacion: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.2,
        forma: Math.random() < 0.3 ? "corazon" : "rect",
        vida: 280,
      });
    }

    if (confetiAnimacion) cancelAnimationFrame(confetiAnimacion);
    confetiAnimacion = requestAnimationFrame(animarConfeti);
  }

  let confetiAnimacion = null;

  function animarConfeti() {
    cctx.clearRect(0, 0, confetiCanvas.width, confetiCanvas.height);
    let activos = false;

    for (let i = piezas.length - 1; i >= 0; i--) {
      const p = piezas[i];
      p.x += p.vx + Math.sin((p.rotacion + i) * 0.05) * 0.8;
      p.y += p.vy;
      p.rotacion += p.vrot;
      p.vida--;

      cctx.save();
      cctx.translate(p.x, p.y);
      cctx.rotate(p.rotacion);
      cctx.fillStyle = p.color;
      cctx.globalAlpha = Math.max(0, Math.min(1, p.vida / 60));

      if (p.forma === "corazon") {
        // Corazón simple con dos círculos + triángulo
        cctx.beginPath();
        cctx.arc(0, -4, p.w / 2.5, 0, Math.PI * 2);
        cctx.arc(-p.w / 2.5, 0, p.w / 2.5, 0, Math.PI * 2);
        cctx.fill();
        cctx.beginPath();
        cctx.moveTo(-p.w / 2, 0);
        cctx.lineTo(0, p.h / 2);
        cctx.lineTo(p.w / 2, 0);
        cctx.closePath();
        cctx.fill();
      } else {
        cctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      }

      cctx.restore();

      if (p.y < confetiCanvas.height + 30 && p.vida > 0) activos = true;
    }

    cctx.globalAlpha = 1;

    if (activos) {
      confetiAnimacion = requestAnimationFrame(animarConfeti);
    } else {
      cctx.clearRect(0, 0, confetiCanvas.width, confetiCanvas.height);
      confetiAnimacion = null;
    }
  }

  /* ---------- ANIMACIÓN ---------- */
  function animar() {
    dibujar(performance.now());
    requestAnimationFrame(animar);
  }

  window.addEventListener("resize", () => {
    redimensionar();
    crearEstrellas();
  });

  // Exponer confeti para game.js
  window.SpaceStars = {
    lanzarConfeti: lanzarConfeti,
  };

  redimensionar();
  crearEstrellas();
  animar();
})();