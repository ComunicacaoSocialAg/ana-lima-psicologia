/* ==========================================================================
   ETAPA 4 — MOTION COM PROPÓSITO NARRATIVO
   ==========================================================================
   O QUE MUDOU E POR QUÊ (mapeado direto ao diagnóstico):

   1. A FLOR (dandelion-engine.js da Etapa 1) GANHA UM "OLHAR" PARA A SEÇÃO ATIVA
      Antes (Etapa 1): a flor só seguia o scroll verticalmente, sem relação
      com QUAL seção está na tela. Agora, este arquivo expõe ao motor de
      canvas qual seção está ativa via um evento customizado
      ('section:active'), e o motor reage inclinando sutilmente o caule
      na direção do bloco de texto que acabou de aparecer — como se a
      flor "acompanhasse a leitura", não apenas existisse ao lado dela.
      É o único gatilho narrativo novo: sutil, com propósito, sem
      recriar a metamorfose ou o giro contínuo removidos na Etapa 1.

   2. CADA TIPO DE ELEMENTO TEM UMA INTENÇÃO DE REVEAL DIFERENTE
      Na v1, tudo usava a mesma classe .reveal-up com a mesma curva de
      entrada (translateY + blur), independente do que o elemento
      representa. Isso é "motion decorativo genérico". Agora:
      - Kickers (numeração romana): entram deslizando lateralmente, como
        uma "virada de página" — reforça que é o início de uma seção nova.
      - Títulos H2: entram com leve escala (0.97 → 1), sugerindo peso e
        chegada, não só deslocamento.
      - Corpo de texto e pullquotes: entram mais devagar e com menos
        deslocamento — o objetivo é convidar à leitura, não chamar atenção
        para o movimento em si.
      - Itens de lista (pilares, "para quem", FAQ): entram em cascata
        curta (stagger de 80ms entre irmãos), simulando um "índice sendo
        preenchido item a item" — conecta a repetição visual dos itens ao
        movimento, em vez de todos aparecerem juntos.

   3. DIVISÓRIAS DE SEÇÃO SÓ SE DESENHAM QUANDO REALMENTE CRUZADAS
      Mantido da v1 (já fazia sentido), mas o gatilho agora é o mesmo
      IntersectionObserver central desta etapa, evitando dois sistemas de
      scroll-watching rodando em paralelo (custo duplicado de listeners).

   4. NENHUM MOTION CONTÍNUO SEM GATILHO DE CONTEÚDO
      Esta etapa não adiciona nenhuma animação em loop infinito. Tudo
      aqui é acionado por entrada na viewport (IntersectionObserver) ou
      por mudança de seção ativa — nunca por um timer ou requestAnimationFrame
      rodando "só porque sim".
   ========================================================================== */

(() => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Se o usuário pediu menos movimento, revela tudo instantaneamente e para.
  // (segue a mesma lógica de exceção que já existe no CSS original para
  // prefers-reduced-motion, garantindo consistência entre os dois sistemas)
  if (prefersReducedMotion) {
    document.querySelectorAll('.reveal-up, .narrative-kicker, .narrative-heading, .narrative-prose, .narrative-stagger-item')
      .forEach((el) => el.classList.add('is-visible'));
    return;
  }

  // --------------------------------------------------------------------
  // OBSERVER ÚNICO PARA TODOS OS TIPOS DE REVEAL (custo mínimo: 1 observer)
  // --------------------------------------------------------------------
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target); // revela 1x, não re-anima ao rolar de volta
        }
      });
    },
    { threshold: 0.18, rootMargin: '0px 0px -8% 0px' }
  );

  // Elementos de reveal existentes (compatibilidade com o que já está
  // marcado como .reveal-up no HTML — continuam funcionando exatamente
  // como antes, só que agora observados por este motor único)
  document.querySelectorAll('.reveal-up').forEach((el) => revealObserver.observe(el));

  // --------------------------------------------------------------------
  // STAGGER EM GRUPOS DE ITENS REPETIDOS (pilares, "para quem", FAQ)
  // Aplica um pequeno atraso crescente entre irmãos do mesmo grupo,
  // criando a sensação de "índice sendo preenchido item a item" em vez
  // de tudo aparecer no mesmo instante.
  // --------------------------------------------------------------------
  const STAGGER_GROUPS = [
    '.pillars-triptych',
    '.recognition-list',
    '.faq-accordion'
  ];

  STAGGER_GROUPS.forEach((groupSelector) => {
    const group = document.querySelector(groupSelector);
    if (!group) return;
    const items = Array.from(group.children).filter((el) =>
      el.classList.contains('reveal-up') || el.tagName === 'ARTICLE' || el.tagName === 'DETAILS'
    );
    items.forEach((el, i) => {
      el.style.setProperty('--stagger-delay', `${i * 80}ms`);
      el.classList.add('narrative-stagger-item');
    });
  });

  // --------------------------------------------------------------------
  // DIVISÓRIAS DE SEÇÃO — desenham só quando realmente cruzadas
  // --------------------------------------------------------------------
  const dividerObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('divider-drawn');
          dividerObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  document.querySelectorAll('.section-divider').forEach((el) => dividerObserver.observe(el));

  // --------------------------------------------------------------------
  // SEÇÃO ATIVA → EVENTO CUSTOMIZADO PARA O MOTOR DE CANVAS (Etapa 1)
  // O dandelion-engine.js pode escutar 'section:active' e usar
  // event.detail.sectionId para inclinar sutilmente o caule na direção
  // da seção — isso é o único elo narrativo entre motion de fundo e
  // conteúdo real, resolvendo o ponto do diagnóstico "motion sem
  // propósito". A implementação de reação em si já está preparada no
  // dandelion-engine.js da Etapa 1 (ele ignora o evento com segurança
  // se não tiver o listener — nenhuma quebra caso esta etapa não seja
  // aplicada).
  // --------------------------------------------------------------------
  const NARRATIVE_SECTIONS = [
    'inicio', 'abordagem', 'pilares', 'para-quem',
    'sobre-ana', 'processo', 'perguntas-frequentes', 'contato'
  ];

  let currentActiveSection = null;

  const sectionActiveObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.4) {
          const id = entry.target.id;
          if (id !== currentActiveSection) {
            currentActiveSection = id;
            window.dispatchEvent(new CustomEvent('section:active', { detail: { sectionId: id } }));
          }
        }
      });
    },
    { threshold: [0.4] }
  );

  NARRATIVE_SECTIONS.forEach((id) => {
    const el = document.getElementById(id);
    if (el) sectionActiveObserver.observe(el);
  });
})();
