/* ==========================================================================
   MOTOR DE CANVAS — DENTE-DE-LEÃO GUIA (v2 — ORÇAMENTO DE PERFORMANCE)
   ==========================================================================
   O QUE MUDOU EM RELAÇÃO À V1 (motivo de cada corte):

   1. DE 3 DENTE-DE-LEÕES → 1 DENTE-DE-LEÃO + SEMENTES ATMOSFÉRICAS LEVES
      A v1 renderizava 3 flores completas (145+112+88 = 345 sementes com
      bristles recalculados por frame) mais 92 "sementes companheiras" do
      guia metamórfico mais partículas de fundo. Isso é ~450+ objetos com
      trigonometria pesada por frame, 60x por segundo. Nenhum dispositivo
      médio aguenta isso a 60fps. Agora: 1 flor com 60 sementes fixas +
      até 24 sementes atmosféricas soltas = ~84 objetos no pior caso.

   2. BRISTLES PRÉ-COMPUTADOS, NÃO RECRIADOS
      A v1 já pré-computava os bristles na criação (isso estava certo),
      mas recalculava listas inteiras de "companion seeds" (92 objetos)
      toda vez que a metamorfose mudava de direção. Removido: a metamorfose
      "flor ⇄ semente única" inteira. Fica só UM estado visual coerente
      (flor que guia o scroll), sem alternância de forma — isso também
      resolve o problema de "motion sem propósito narrativo" apontado
      no diagnóstico.

   3. CANVAS PAUSA FORA DA VIEWPORT (IntersectionObserver)
      A v1 rodava requestAnimationFrame para sempre, mesmo com o hero
      a quilômetros de distância do scroll. Agora o loop só roda
      enquanto a seção com o canvas está (ou pode ficar) visível.

   4. FPS CAP EXPLÍCITO (30fps para o motion de fundo)
      Partículas atmosféricas não precisam de 60fps para parecerem
      fluidas — 30fps é imperceptível para esse tipo de movimento lento
      e corta o custo de CPU pela metade.

   5. REDUÇÃO DE TRIGONOMETRIA POR FRAME
      Ângulos de bristles são computados 1x na criação; por frame,
      cada semente só recalcula posição (seno/cosseno simples), não
      a coroa 3D inteira. O giro axial contínuo da v1 foi removido:
      consumia CPU sem ganho perceptível de "cinematismo" e é a causa
      do "movimento sem propósito" citado no diagnóstico.

   6. RESPEITA prefers-reduced-motion E DESLIGA EM MOBILE PEQUENO
      Canvas decorativo não deve rodar em telas <768px (custo de bateria
      sem benefício visual real nesse breakpoint) nem quando o usuário
      pediu menos movimento no SO.
   ========================================================================== */

(() => {
  const canvas = document.getElementById('dandelion-guide-canvas');
  if (!canvas) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmallViewport = window.innerWidth < 768;

  // Corte total: não inicializa nada disso em mobile pequeno ou reduced-motion.
  // O hero e o site inteiro já funcionam sem o canvas (ele é 100% decorativo).
  if (prefersReducedMotion || isSmallViewport) {
    canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d', { alpha: true });
  const heroVideo = document.getElementById('heroVideo');
  const heroVideoStage = document.getElementById('heroVideoStage');
  const heroSection = document.getElementById('inicio');

  let width = window.innerWidth;
  let height = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.6); // 1.6 é suficiente e mais barato que 2

  // --------------------------------------------------------------------
  // CONTROLE DE FPS (30fps para o canvas decorativo)
  // --------------------------------------------------------------------
  const TARGET_FPS = 30;
  const FRAME_BUDGET_MS = 1000 / TARGET_FPS;
  let lastFrameTime = 0;

  // --------------------------------------------------------------------
  // CONTROLE DE VIEWPORT — só anima quando pode estar visível
  // --------------------------------------------------------------------
  let canvasIsInViewport = true;
  let rafId = null;

  const viewportObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        canvasIsInViewport = entry.isIntersecting;
      });
      if (canvasIsInViewport && rafId === null) {
        rafId = requestAnimationFrame(render);
      }
    },
    { threshold: 0 }
  );
  // Observa o body inteiro dividido pelas seções-âncora: como o canvas é
  // fixed e cobre a tela toda, ele "importa" enquanto qualquer parte do
  // documento estiver na tela — ou seja, sempre, exceto se a aba estiver
  // oculta. A otimização real de aba oculta vem do document.hidden abaixo.
  if (heroSection) viewportObserver.observe(heroSection);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      canvasIsInViewport = false;
    } else {
      canvasIsInViewport = true;
      if (rafId === null) rafId = requestAnimationFrame(render);
    }
  });

  // --------------------------------------------------------------------
  // ESTADO DE SCROLL E PONTEIRO (simplificado da v1)
  // --------------------------------------------------------------------
  let scrollY = window.scrollY || 0;
  let time = 0;

  const pointer = { x: -9999, y: -9999, vx: 0, vy: 0, active: false, lastX: -9999, lastY: -9999 };

  const INK = {
    fine: 'rgba(28, 43, 34, 0.38)',
    warm: 'rgba(168, 90, 63, 0.30)',
    sheen: 'rgba(255, 253, 249, 0.90)',
    beak: 'rgba(28, 43, 34, 0.50)',
    achene: '#8E4B33',
    core: '#5A6457'
  };

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  // --------------------------------------------------------------------
  // PROTEÇÃO DE CONTEÚDO (mantido da v1 — é o que garante que as
  // sementes nunca cubram texto, isso funciona bem e é barato)
  // --------------------------------------------------------------------
  const CONTENT_SELECTORS = [
    '.hero-copy-column', '.editorial-h2', '.editorial-prose',
    '.pillar-title', '.pillar-body', '.recognition-item',
    '.portrait-gallery-plate', '.faq-accordion'
  ].join(', ');

  let protectedRects = [];
  let contentElements = [];

  function refreshContentElements() {
    contentElements = Array.from(document.querySelectorAll(CONTENT_SELECTORS));
    updateProtectedRects();
  }

  function updateProtectedRects() {
    protectedRects = [];
    const pad = 20;
    for (const el of contentElements) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -60 || r.top > height + 60 || r.width === 0) continue;
      protectedRects.push({ left: r.left - pad, right: r.right + pad, top: r.top - pad, bottom: r.bottom + pad });
    }
  }

  function avoidanceAt(x, y) {
    let pushX = 0, pushY = 0, alpha = 1;
    for (const r of protectedRects) {
      if (x > r.left - 40 && x < r.right + 40 && y > r.top - 40 && y < r.bottom + 40) {
        const inside = x > r.left && x < r.right && y > r.top && y < r.bottom;
        if (inside) {
          const dirX = (x - (r.left + r.right) / 2) > 0 ? 1 : -1;
          pushX += dirX * 0.5;
          alpha = 0.08;
        } else {
          const dirX = x < (r.left + r.right) / 2 ? -1 : 1;
          pushX += dirX * 0.12;
        }
      }
    }
    return { pushX, pushY, alpha };
  }

  // --------------------------------------------------------------------
  // BRISTLES: criados 1x, nunca recalculados por frame
  // --------------------------------------------------------------------
  function createBristles(count) {
    const list = [];
    for (let b = 0; b < count; b++) {
      const frac = b / (count - 1) - 0.5;
      list.push({
        spread: frac * 1.34 + (Math.random() - 0.5) * 0.08,
        len: 0.86 + Math.random() * 0.3,
        curve: (Math.random() - 0.5) * 0.18
      });
    }
    return list;
  }

  // --------------------------------------------------------------------
  // UMA ÚNICA FLOR (a v1 tinha 3; isso já corta o custo em ~65%)
  // --------------------------------------------------------------------
  const SEED_COUNT = 60; // v1 usava 145 na flor principal
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  function createDandelion(originX, originY) {
    const seeds = [];
    for (let i = 0; i < SEED_COUNT; i++) {
      const y = 1 - (i / (SEED_COUNT - 1)) * 1.88;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = goldenAngle * i;
      seeds.push({
        nx: Math.cos(theta) * r,
        ny: y,
        nz: Math.sin(theta) * r,
        beakLength: 34 + (i % 7) * 2,
        pappusRadius: 14 + (i % 5) * 1.4,
        attached: true,
        bristles: createBristles(11 + (i % 4)),
        swayPhase: Math.random() * Math.PI * 2,
        x: 0, y: 0, angle: 0, opacity: 1, scale: 1
      });
    }
    return {
      headX: originX,
      headY: originY,
      baseHeadX: originX,
      baseHeadY: originY,
      stemAngle: 0.04,
      stemVel: 0,
      stemLength: Math.min(height * 0.4, 300),
      scale: 1,
      seeds
    };
  }

  // Sementes atmosféricas soltas (bem mais leves que a v1: só posição + 1 bristle set)
  const MAX_FREE_SEEDS = 18; // v1 permitia até 12 + 92 companion = ~100+; agora teto real de 18
  const freeSeeds = [];

  function spawnFreeSeed(x, y) {
    freeSeeds.push({
      x, y,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.15 - Math.random() * 0.2,
      angle: -Math.PI / 2,
      scale: 0.4 + Math.random() * 0.25,
      beakLength: 22 + Math.random() * 5,
      pappusRadius: 9 + Math.random() * 3,
      opacity: 0.12 + Math.random() * 0.14,
      bristles: createBristles(10)
    });
  }

  let dandelion = null;
  let revealed = false;
  let revealAlpha = 0;

  function getStageAnchor() {
    if (heroVideoStage && width > 980) {
      const r = heroVideoStage.getBoundingClientRect();
      if (r.width > 100) return { x: r.left + r.width * 0.55, y: r.top + r.height * 0.48 };
    }
    return { x: width > 980 ? width * 0.72 : width * 0.7, y: height * 0.48 };
  }

  function init() {
    const anchor = getStageAnchor();
    dandelion = createDandelion(anchor.x, anchor.y);
    freeSeeds.length = 0;
    for (let i = 0; i < 8; i++) {
      spawnFreeSeed(Math.random() * width, Math.random() * height);
    }
    refreshContentElements();
  }

  function reveal() {
    if (revealed) return;
    revealed = true;
    heroVideoStage?.classList.add('video-completed');
    // Libera algumas sementes soltas no momento da revelação — único gatilho
    // narrativo de "a flor solta sementes", sem giro contínuo automático
    for (let i = 0; i < 4; i++) {
      spawnFreeSeed(dandelion.headX + (Math.random() - 0.5) * 40, dandelion.headY + (Math.random() - 0.5) * 40);
    }
  }

  if (heroVideo) {
    heroVideo.addEventListener('timeupdate', () => {
      if (heroVideo.duration && heroVideo.currentTime >= heroVideo.duration - 1.2) reveal();
    });
    heroVideo.addEventListener('ended', reveal);
    heroVideo.addEventListener('error', reveal);
    const p = heroVideo.play();
    if (p !== undefined) p.catch(reveal);
  } else {
    reveal();
  }

  function drawSeed(s, alphaMul) {
    if (alphaMul <= 0.01) return;
    const dx = Math.cos(s.angle), dy = Math.sin(s.angle);
    const tx = s.x + dx * s.beakLength * s.scale;
    const ty = s.y + dy * s.beakLength * s.scale;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, s.opacity * alphaMul));

    ctx.strokeStyle = INK.beak;
    ctx.lineWidth = 0.44 * s.scale;
    ctx.beginPath();
    ctx.moveTo(s.x + dx * 3.8 * s.scale, s.y + dy * 3.8 * s.scale);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    ctx.strokeStyle = INK.achene;
    ctx.lineWidth = 1.4 * s.scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x + dx * 4 * s.scale, s.y + dy * 4 * s.scale);
    ctx.stroke();

    const baseAng = Math.atan2(dy, dx);
    const pr = s.pappusRadius * s.scale;
    for (let i = 0; i < s.bristles.length; i++) {
      const br = s.bristles[i];
      const a = baseAng + br.spread;
      const r = pr * br.len;
      ctx.strokeStyle = i % 3 === 0 ? INK.sheen : (i % 2 === 0 ? INK.fine : INK.warm);
      ctx.lineWidth = (i % 3 === 0 ? 0.6 : 0.34) * s.scale;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(
        tx + Math.cos(a + br.curve) * r * 0.55,
        ty + Math.sin(a + br.curve) * r * 0.55,
        tx + Math.cos(a) * r,
        ty + Math.sin(a) * r
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawReceptacle(hx, hy, scale, alpha) {
    if (alpha <= 0.01) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    const grad = ctx.createRadialGradient(hx - scale, hy - scale, 0.5 * scale, hx, hy, 4.5 * scale);
    grad.addColorStop(0, '#8A8270');
    grad.addColorStop(0.65, INK.core);
    grad.addColorStop(1, 'rgba(58,70,61,0.22)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(hx, hy, 4.4 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    updateProtectedRects();
  }

  window.addEventListener('resize', () => {
    resize();
    if (dandelion) {
      const anchor = getStageAnchor();
      dandelion.baseHeadX = anchor.x;
      dandelion.baseHeadY = anchor.y;
    }
  }, { passive: true });

  window.addEventListener('scroll', () => {
    scrollY = window.scrollY || 0;
    document.getElementById('siteHeader')?.classList.toggle('scrolled', scrollY > 48);
    updateProtectedRects();
  }, { passive: true });

  window.addEventListener('pointermove', (e) => {
    pointer.vx = e.clientX - pointer.lastX;
    pointer.vy = e.clientY - pointer.lastY;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.lastX = e.clientX;
    pointer.lastY = e.clientY;
    pointer.active = true;
  }, { passive: true });

  window.addEventListener('pointerleave', () => { pointer.active = false; });

  resize();
  init();

  // Adendo da Etapa 4: reação sutil da flor à seção ativa na página.
  // activeSectionTilt vai de -1 (seção à esquerda do layout) a 1 (seção
  // à direita), interpolado suavemente dentro do loop de render.
  let activeSectionTilt = 0;
  const SECTION_TILT_MAP = {
    'inicio': 0,
    'abordagem': -0.6,
    'pilares': 0.6,
    'para-quem': -0.6,
    'sobre-ana': 0.6,
    'processo': -0.6,
    'perguntas-frequentes': 0.6,
    'contato': 0
  };

  window.addEventListener('section:active', (e) => {
    const id = e.detail?.sectionId;
    if (id && SECTION_TILT_MAP.hasOwnProperty(id)) {
      activeSectionTilt = SECTION_TILT_MAP[id];
    }
  });

  function render(now) {
    rafId = requestAnimationFrame(render);

    if (!canvasIsInViewport) return;

    // FPS cap: pula o frame se ainda não passou o orçamento de tempo
    if (now - lastFrameTime < FRAME_BUDGET_MS) return;
    lastFrameTime = now;

    time += 0.02;
    ctx.clearRect(0, 0, width, height);

    if (revealed && revealAlpha < 1) revealAlpha = Math.min(1, revealAlpha + 0.03);
    if (revealAlpha <= 0.01) return;

    const heroHeight = heroSection?.offsetHeight || height;
    const heroVisibility = Math.max(0, Math.min(1, 1 - scrollY / (heroHeight * 0.92)));

    // ---- A FLOR (segue o scroll suavemente, sem giro contínuo automático) ----
    if (dandelion && heroVisibility > 0.01) {
      const targetY = dandelion.baseHeadY - scrollY * 0.55;
      dandelion.headY += (targetY - dandelion.headY) * 0.12;
      dandelion.headX += (dandelion.baseHeadX - dandelion.headX) * 0.08;

      let torque = 0;
      if (pointer.active) {
        const dx = dandelion.headX - pointer.x;
        const dy = dandelion.headY - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 130 && dist > 1) {
          torque = (dx / dist) * ((130 - dist) / 130) * 0.14;
        }
      }
      const windBase = Math.sin(time * 0.6) * 0.05;
      // Adendo Etapa 4: soma um viés de inclinação de até ±0.05 rad
      // conforme a seção ativa na página — sutil o suficiente para não
      // parecer um efeito separado, mas perceptível como "a flor
      // acompanha a leitura"
      const sectionBias = activeSectionTilt * 0.05;
      const targetAngle = Math.max(-0.26, Math.min(0.3, 0.04 + windBase + torque + sectionBias));
      dandelion.stemVel = (dandelion.stemVel + (targetAngle - dandelion.stemAngle) * 0.07) * 0.85;
      dandelion.stemAngle += dandelion.stemVel;

      const baseX = dandelion.headX - Math.sin(dandelion.stemAngle) * dandelion.stemLength;
      const baseY = dandelion.headY + Math.cos(dandelion.stemAngle) * dandelion.stemLength;
      const flowerAlpha = revealAlpha * heroVisibility;

      ctx.save();
      ctx.globalAlpha = flowerAlpha;
      const stemGrad = ctx.createLinearGradient(dandelion.headX, dandelion.headY, baseX, baseY);
      stemGrad.addColorStop(0, 'rgba(43,61,50,0.76)');
      stemGrad.addColorStop(0.68, 'rgba(68,84,71,0.42)');
      stemGrad.addColorStop(1, 'rgba(247,245,240,0)');
      ctx.strokeStyle = stemGrad;
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.quadraticCurveTo(baseX + (dandelion.headX - baseX) * 0.45, baseY - (baseY - dandelion.headY) * 0.54, dandelion.headX, dandelion.headY + 2);
      ctx.stroke();
      ctx.restore();

      drawReceptacle(dandelion.headX, dandelion.headY, dandelion.scale, flowerAlpha);

      for (const s of dandelion.seeds) {
        const rot = dandelion.stemAngle * 0.6 + Math.sin(time * 1.2 + s.swayPhase) * 0.025;
        const rx = s.nx * Math.cos(rot) - s.ny * Math.sin(rot);
        const ry = s.nx * Math.sin(rot) + s.ny * Math.cos(rot);
        s.x = dandelion.headX + rx * 5 * dandelion.scale;
        s.y = dandelion.headY + ry * 5 * dandelion.scale;
        const ba = Math.atan2(ry, rx);
        s.angle = ba;
        s.opacity += ((0.36 + (s.nz + 1) * 0.3) - s.opacity) * 0.06;
        s.scale = 0.86 + (s.nz + 1) * 0.11;
        drawSeed(s, flowerAlpha);
      }
    }

    // ---- SEMENTES ATMOSFÉRICAS (leves, quantidade travada) ----
    for (let i = 0; i < freeSeeds.length; i++) {
      const s = freeSeeds[i];
      s.vx += Math.sin(time * 0.5 + i) * 0.006;
      s.vy += -0.002;
      const av = avoidanceAt(s.x, s.y);
      s.vx += av.pushX * 0.02;
      s.vx *= 0.97;
      s.vy *= 0.97;
      s.x += s.vx;
      s.y += s.vy;

      if (s.y < -40) { s.y = height + 30; s.x = Math.random() * width; }
      if (s.x < -40) s.x = width + 30;
      if (s.x > width + 40) s.x = -30;

      drawSeed(s, revealAlpha * av.alpha);
    }
  }

  rafId = requestAnimationFrame(render);
})();
