/* ==========================================================================
   MOTOR DE CANVAS — DENTE-DE-LEÃO GUIA (v3 — METAMORFOSE + PERFORMANCE)
   ==========================================================================
   HISTÓRICO: a v1 original tinha 3 flores completas + 92 sementes
   companheiras + metamorfose flor⇄semente, e travava (custo de
   trigonometria 3D recalculada a cada frame para ~450 objetos). A v2
   (Etapa 1 deste projeto) cortou a metamorfose inteira para resolver
   performance — corte grande demais, pois a metamorfose é a identidade
   central do site. Esta v3 restaura a metamorfose como guia narrativo
   real, com uma arquitetura de performance diferente:

   1. UMA ÚNICA ENTIDADE (não 3 flores simultâneas) que se transforma
      entre "dente-de-leão completo" e "semente-guia única" — o mesmo
      conceito da v1, sem a multiplicação por 3.

   2. COROA DE 45 SEMENTES (v1 usava 92) — ainda parece uma coroa cheia
      visualmente (a esfera de Fibonacci com 45 pontos já lê como "flor
      densa"), mas quase metade do custo de trigonometria por frame.

   3. TODA GEOMETRIA QUE NÃO MUDA É PRÉ-COMPUTADA NA CRIAÇÃO: posições
      normalizadas da esfera de Fibonacci, ângulos de bristles, tudo
      calculado 1x. Por frame, cada semente só recalcula sua posição
      2D projetada (rotação simples), não a estrutura 3D inteira.

   4. FPS CAP DE 30 + PAUSA FORA DA VIEWPORT/ABA OCULTA (mantido da
      Etapa 1 — isso sozinho já corta o custo pela metade sem afetar
      a fluidez percebida deste tipo de motion lento).

   5. METAMORFOSE NOS 8 PONTOS DE VIRADA (um por seção), com a transição
      de saída do hero integrada ao fim do vídeo: a flor só começa a
      existir quando o vídeo termina (igual v1), e a partir daí ela
      guia a leitura alternando forma a cada seção.
   ========================================================================== */

(() => {
  const canvas = document.getElementById('dandelion-guide-canvas');
  if (!canvas) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmallViewport = window.innerWidth < 768;

  if (prefersReducedMotion || isSmallViewport) {
    canvas.style.display = 'none';
    return;
  }

  const ctx = canvas.getContext('2d', { alpha: true });
  const heroVideo = document.getElementById('heroVideo');
  const heroVideoStage = document.getElementById('heroVideoStage');
  const heroSection = document.getElementById('inicio');
  const mainContent = document.querySelector('main') || heroSection;

  let width = window.innerWidth;
  let height = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.6);

  const TARGET_FPS = 30;
  const FRAME_BUDGET_MS = 1000 / TARGET_FPS;
  let lastFrameTime = 0;

  let canvasIsInViewport = true;
  let rafId = null;

  const viewportObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => { canvasIsInViewport = entry.isIntersecting; });
      if (canvasIsInViewport && rafId === null) rafId = requestAnimationFrame(render);
    },
    { threshold: 0 }
  );
  if (mainContent) viewportObserver.observe(mainContent);

  document.addEventListener('visibilitychange', () => {
    canvasIsInViewport = !document.hidden;
    if (canvasIsInViewport && rafId === null) rafId = requestAnimationFrame(render);
  });

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

  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  // --------------------------------------------------------------------
  // PROTEÇÃO DE CONTEÚDO
  // --------------------------------------------------------------------
  const CONTENT_SELECTORS = [
    '.hero-copy-column', '.editorial-h2', '.editorial-prose', '.editorial-pullquote',
    '.pillar-title', '.pillar-body', '.recognition-item',
    '.portrait-gallery-plate', '.editorial-quote-block', '.credentials-ledger',
    '.process-ledger-wrapper', '.faq-accordion', '.closing-inner'
  ].join(', ');

  let contentElements = [];
  let protectedRects = [];

  function refreshContentElements() {
    contentElements = Array.from(document.querySelectorAll(CONTENT_SELECTORS));
    updateProtectedRects();
  }

  function updateProtectedRects() {
    protectedRects = [];
    const padX = 22, padY = 16;
    for (const el of contentElements) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -60 || r.top > height + 60 || r.width === 0) continue;
      protectedRects.push({
        left: r.left - padX, right: r.right + padX,
        top: r.top - padY, bottom: r.bottom + padY,
        cx: (r.left + r.right) * 0.5, cy: (r.top + r.bottom) * 0.5
      });
    }
  }

  function avoidanceAt(x, y) {
    let pushX = 0, pushY = 0, alpha = 1;
    for (const r of protectedRects) {
      if (x > r.left - 44 && x < r.right + 44 && y > r.top - 44 && y < r.bottom + 44) {
        const inside = x > r.left && x < r.right && y > r.top && y < r.bottom;
        if (inside) {
          const dirX = x < r.cx ? -1 : 1;
          const dirY = y < r.cy ? -1 : 1;
          pushX += dirX * 0.5;
          pushY += dirY * 0.3;
          alpha = 0.06;
        } else {
          const dirX = x < r.cx ? -1 : 1;
          pushX += dirX * 0.14;
        }
      }
    }
    return { pushX, pushY, alpha };
  }

  // --------------------------------------------------------------------
  // BRISTLES — pré-computados 1x, nunca recriados por frame
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

  function drawSeedShape(x, y, angle, scale, beakLength, pappusRadius, bristles, opacity, alphaMul) {
    if (alphaMul <= 0.01) return;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const tx = x + dx * beakLength * scale;
    const ty = y + dy * beakLength * scale;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, opacity * alphaMul));

    ctx.strokeStyle = INK.beak;
    ctx.lineWidth = 0.44 * scale;
    ctx.beginPath();
    ctx.moveTo(x + dx * 3.8 * scale, y + dy * 3.8 * scale);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    ctx.strokeStyle = INK.achene;
    ctx.lineWidth = 1.4 * scale;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + dx * 4 * scale, y + dy * 4 * scale);
    ctx.stroke();

    const baseAng = Math.atan2(dy, dx);
    const pr = pappusRadius * scale;
    for (let i = 0; i < bristles.length; i++) {
      const br = bristles[i];
      const a = baseAng + br.spread;
      const r = pr * br.len;
      ctx.strokeStyle = i % 3 === 0 ? INK.sheen : (i % 2 === 0 ? INK.fine : INK.warm);
      ctx.lineWidth = (i % 3 === 0 ? 0.58 : 0.34) * scale;
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

  // ========================================================================
  // A ENTIDADE ÚNICA METAMÓRFICA (flor completa ⇄ semente-guia)
  // ========================================================================
  const CROWN_SEED_COUNT = 45; // v1 usava 92; 45 já lê como coroa cheia
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  function createCrownSeeds(count) {
    const list = [];
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 1.86;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = goldenAngle * i;
      list.push({
        // posição normalizada na esfera — pré-computada, nunca muda
        nx: Math.cos(theta) * r,
        ny: y,
        nz: Math.sin(theta) * r,
        frac: i / count,
        beakLength: 26 + (i % 6) * 1.6,
        pappusRadius: 11 + (i % 4) * 1.1,
        bristles: createBristles(10)
      });
    }
    return list;
  }

  const entity = {
    x: 0, y: 0, vx: 0, vy: 0,
    angle: -Math.PI / 2,
    scale: 1.25,
    morph: 1.0,        // 1 = flor completa; 0 = semente-guia única
    targetMorph: 1.0,
    axialSpin: 0,
    beakLength: 34,
    pappusRadius: 15,
    bristles: createBristles(16),
    crown: createCrownSeeds(CROWN_SEED_COUNT)
  };

  // 8 pontos de virada — 1 por seção, replicando a estrutura da v1
  // side define de que margem a entidade "observa" a seção; morph
  // define se ali ela deve estar como flor completa (1) ou semente (0)
  const SECTION_WAYPOINTS = [
    { id: 'inicio',               side: 'right',  morph: 1.00 },
    { id: 'abordagem',            side: 'left',   morph: 0.00 },
    { id: 'pilares',              side: 'right',  morph: 1.00 },
    { id: 'para-quem',            side: 'left',   morph: 0.00 },
    { id: 'sobre-ana',            side: 'right',  morph: 1.00 },
    { id: 'processo',             side: 'left',   morph: 0.00 },
    { id: 'perguntas-frequentes', side: 'right',  morph: 1.00 },
    { id: 'contato',              side: 'center', morph: 1.00 }
  ];

  function getStageAnchor() {
    if (heroVideoStage && width > 980) {
      const r = heroVideoStage.getBoundingClientRect();
      if (r.width > 100) return { x: r.left + r.width * 0.55, y: r.top + r.height * 0.48 };
    }
    return { x: width > 980 ? width * 0.72 : width * 0.7, y: height * 0.48 };
  }

  function computeChoreography() {
    const isDesktop = width > 1024;
    const leftX = isDesktop ? width * 0.10 : width * 0.12;
    const rightX = isDesktop ? width * 0.90 : width * 0.86;

    const boundaries = [];
    for (const wp of SECTION_WAYPOINTS) {
      const el = document.getElementById(wp.id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const anchorX = wp.side === 'left' ? leftX : (wp.side === 'right' ? rightX : width * 0.5);
      boundaries.push({ id: wp.id, top: rect.top, anchorX, anchorY: height * 0.46, morph: wp.morph });
    }
    if (boundaries.length === 0) {
      return { x: rightX, y: height * 0.46, scale: 1.22, morph: 1, spin: time * 1.2 };
    }

    const bandEnter = height * 0.86;
    const bandLeave = height * 0.14;

    for (let i = 1; i < boundaries.length; i++) {
      const prev = boundaries[i - 1];
      const curr = boundaries[i];
      if (curr.top <= bandEnter && curr.top >= bandLeave) {
        const rawP = (bandEnter - curr.top) / (bandEnter - bandLeave);
        const p = Math.max(0, Math.min(1, rawP));
        const smoothP = easeInOutCubic(p);
        const bell = Math.sin(p * Math.PI);

        const targetX = prev.anchorX + (curr.anchorX - prev.anchorX) * smoothP;
        const targetY = prev.anchorY + (curr.anchorY - prev.anchorY) * smoothP - bell * 30;
        const targetMorph = prev.morph + (curr.morph - prev.morph) * smoothP;
        const targetScale = 1.2 + bell * (isDesktop ? 0.9 : 0.5);

        return { x: targetX, y: targetY, scale: targetScale, morph: targetMorph, spin: time * 1.4 + p * Math.PI * 2, transition: bell };
      }
    }

    let active = boundaries[0];
    const mid = height * 0.48;
    for (const b of boundaries) if (b.top <= mid) active = b;

    return {
      x: active.anchorX + Math.sin(time * 0.8) * 14,
      y: active.anchorY + Math.cos(time * 0.65) * 22,
      scale: 1.2 + Math.sin(time * 1.0) * 0.06,
      morph: active.morph,
      spin: time * 1.1,
      transition: 0
    };
  }

  let revealed = false;
  let revealAlpha = 0;

  function init() {
    const anchor = getStageAnchor();
    entity.x = anchor.x;
    entity.y = anchor.y;
    refreshContentElements();
  }

  function reveal() {
    if (revealed) return;
    revealed = true;
    heroVideoStage?.classList.add('video-completed');
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

  function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    updateProtectedRects();
  }

  window.addEventListener('resize', resize, { passive: true });
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

  // Adendo Etapa 4: reação sutil à seção ativa (mantido — mescla bem
  // com a metamorfose, dando à flor um "olhar" para o conteúdo)
  let activeSectionTilt = 0;
  window.addEventListener('section:active', (e) => {
    const id = e.detail?.sectionId;
    const wp = SECTION_WAYPOINTS.find((w) => w.id === id);
    if (wp) activeSectionTilt = wp.side === 'left' ? -0.5 : (wp.side === 'right' ? 0.5 : 0);
  });

  resize();
  init();

  function render(now) {
    rafId = requestAnimationFrame(render);
    if (!canvasIsInViewport) return;
    if (now - lastFrameTime < FRAME_BUDGET_MS) return;
    lastFrameTime = now;

    time += 0.02;
    ctx.clearRect(0, 0, width, height);

    if (revealed && revealAlpha < 1) revealAlpha = Math.min(1, revealAlpha + 0.03);
    if (revealAlpha <= 0.01) return;

    const heroHeight = heroSection?.offsetHeight || height;
    const heroVisibility = Math.max(0, Math.min(1, 1 - scrollY / (heroHeight * 0.95)));
    // A entidade fica visível durante o hero E durante toda a rolagem
    // subsequente (ela é o guia do site inteiro, não só do hero) —
    // por isso globalAlpha não depende de heroVisibility sozinho.
    const globalAlpha = revealAlpha;

    const choreo = computeChoreography();

    const springK = 0.08 + (choreo.transition || 0) * 0.04;
    entity.vx = (entity.vx + (choreo.x - entity.x) * springK) * 0.8;
    entity.vy = (entity.vy + (choreo.y - entity.y) * springK) * 0.8;

    if (pointer.active) {
      const dx = entity.x - pointer.x;
      const dy = entity.y - pointer.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 140 && dist > 1) {
        const prox = (140 - dist) / 140;
        entity.vx += (dx / dist) * prox * 0.5;
        entity.vy += (dy / dist) * prox * 0.4;
      }
    }

    const avoid = avoidanceAt(entity.x, entity.y);
    const avoidWeight = 1 - (choreo.transition || 0) * 0.7;
    entity.vx += avoid.pushX * avoidWeight;
    entity.vy += avoid.pushY * avoidWeight;

    entity.x += entity.vx;
    entity.y += entity.vy;
    entity.scale += (choreo.scale - entity.scale) * 0.1;
    entity.morph += (choreo.morph - entity.morph) * 0.08;
    entity.axialSpin = choreo.spin + activeSectionTilt * 0.3;

    // ---- RENDERIZAÇÃO DA ENTIDADE METAMÓRFICA ----
    const morph = Math.max(0, Math.min(1, entity.morph));
    const dissolve = 1 - morph;
    const sc = entity.scale * (1 - morph * 0.18);
    const ax = entity.x, ay = entity.y;

    // PARTE A: caule + receptáculo + coroa (visível conforme morph > 0)
    if (morph > 0.02) {
      const crownScale = 0.85 * (0.82 + morph * 0.28);
      const stemAlpha = Math.pow(morph, 1.6) * globalAlpha;

      if (stemAlpha > 0.02) {
        const sway = Math.sin(time * 1.0) * 0.05;
        const stemLen = 170 * Math.pow(morph, 0.85);
        const baseX = ax - Math.sin(sway) * stemLen;
        const baseY = ay + Math.cos(sway) * stemLen;
        const ctrlX = baseX + (ax - baseX) * 0.45 - 8;
        const ctrlY = baseY - (baseY - ay) * 0.54;

        ctx.save();
        ctx.globalAlpha = stemAlpha;
        const grad = ctx.createLinearGradient(ax, ay, baseX, baseY);
        grad.addColorStop(0, 'rgba(43,61,50,0.78)');
        grad.addColorStop(0.65, 'rgba(68,84,71,0.38)');
        grad.addColorStop(1, 'rgba(247,245,240,0)');
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.3 * crownScale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(baseX, baseY);
        ctx.quadraticCurveTo(ctrlX, ctrlY, ax, ay + 2);
        ctx.stroke();
        ctx.restore();

        drawReceptacle(ax, ay, crownScale, stemAlpha);
      }

      // Coroa: cada semente projeta sua posição 3D pré-computada,
      // girando com spiralSpin conforme a dissolução avança
      for (let i = 0; i < entity.crown.length; i++) {
        const cs = entity.crown[i];
        const detach = Math.max(0, Math.min(1, dissolve * 1.3 - cs.frac * 0.3));
        const seedAlpha = (1 - Math.pow(detach, 1.3)) * globalAlpha * 0.9;
        if (seedAlpha <= 0.02) continue;

        const spin = entity.axialSpin * 0.5 + detach * Math.PI * 2.2;
        const rx = cs.nx * Math.cos(spin) - cs.nz * Math.sin(spin);
        const ry = cs.ny;
        const spiralR = (4.5 + Math.pow(detach, 1.4) * 110) * crownScale;
        const lift = -Math.pow(detach, 1.5) * 38;

        const sx = ax + rx * spiralR;
        const sy = ay + ry * (4.5 * crownScale + Math.pow(detach, 1.3) * 64) + lift;
        const angle = Math.atan2(ry, rx) + detach * 1.3;

        drawSeedShape(
          sx, sy, angle,
          (0.75 + (cs.nz + 1) * 0.1) * crownScale * (1 - detach * 0.2),
          cs.beakLength, cs.pappusRadius, cs.bristles, seedAlpha, 1
        );
      }
    }

    // PARTE B: semente-guia central (sempre presente, no topo da coroa
    // ou voando sozinha quando morph = 0)
    const dx = Math.cos(entity.angle);
    const dy = Math.sin(entity.angle);
    const beakLen = entity.beakLength * sc;
    const tx = ax + dx * beakLen;
    const ty = ay + dy * beakLen;

    ctx.save();
    ctx.globalAlpha = globalAlpha;

    const haloR = (24 + (choreo.transition || 0) * 20) * sc;
    const halo = ctx.createRadialGradient(tx, ty, 1, tx, ty, haloR);
    halo.addColorStop(0, `rgba(168,90,63,${(0.16 + (choreo.transition || 0) * 0.14).toFixed(3)})`);
    halo.addColorStop(0.55, 'rgba(212,162,128,0.07)');
    halo.addColorStop(1, 'rgba(247,245,240,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(tx, ty, haloR, 0, Math.PI * 2);
    ctx.fill();

    const pr = entity.pappusRadius * sc;
    for (let i = 0; i < entity.bristles.length; i++) {
      const br = entity.bristles[i];
      const a = Math.atan2(dy, dx) + br.spread;
      const r = pr * br.len;
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(168,90,63,0.7)' : 'rgba(72,62,50,0.5)';
      ctx.lineWidth = (i % 3 === 0 ? 0.6 : 0.4) * sc;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(
        tx + Math.cos(a + br.curve) * r * 0.55,
        ty + Math.sin(a + br.curve) * r * 0.55,
        tx + Math.cos(a) * r, ty + Math.sin(a) * r
      );
      ctx.stroke();
    }

    const stemGrad = ctx.createLinearGradient(ax, ay, tx, ty);
    stemGrad.addColorStop(0, '#4A382B');
    stemGrad.addColorStop(0.5, '#7A5B47');
    stemGrad.addColorStop(1, '#A85A3F');
    ctx.strokeStyle = stemGrad;
    ctx.lineWidth = 0.72 * sc;
    ctx.beginPath();
    ctx.moveTo(ax + dx * 4 * sc, ay + dy * 4 * sc);
    ctx.lineTo(tx, ty);
    ctx.stroke();

    ctx.fillStyle = '#A85A3F';
    ctx.beginPath();
    ctx.arc(tx, ty, 1.1 * sc, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  rafId = requestAnimationFrame(render);
})();
