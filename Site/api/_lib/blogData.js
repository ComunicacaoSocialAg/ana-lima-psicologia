const FIRESTORE_QUERY_URL =
  'https://firestore.googleapis.com/v1/projects/ana-lima-psi-app/databases/(default)/documents:runQuery';

const BASE_URL = 'https://analimapsicologia.com.br';

const CURATED_POSTS = [
  {
    id: 'post_referencia_ansiedade',
    title: 'Ansiedade não é um defeito individual: a compreensão histórico-cultural',
    slug: 'ansiedade-compreensao-historico-cultural',
    category: 'Ansiedade & Sobrecarga',
    tags: ['ansiedade', 'psicologia histórico-cultural', 'desenvolvimento humano', 'poços de caldas'],
    excerpt:
      'Na clínica psicológica, a ansiedade raramente surge do nada. Ela é frequentemente a melhor resposta que o sujeito conseguiu estruturar diante das pressões sociais, familiares e da sobrecarga da vida moderna.',
    coverImageUrl: '/ana-lima-portrait.webp',
    coverImagePosition: 'top',
    coverImageCaption: 'Espaço de acolhimento e escuta clínica com a Psicóloga Ana Lima',
    readTimeMinutes: 4,
    publishedAt: '2026-10-26T10:00:00Z',
    updatedAt: '2026-10-26T10:00:00Z',
    authorName: 'Ana Lima',
    authorCrp: '04/60205',
    seoTitle: 'Ansiedade na Psicologia Histórico-Cultural • Psicóloga Ana Lima',
    seoDescription:
      'Compreenda como a abordagem histórico-cultural acolhe a ansiedade sem julgamentos individuais. Atendimento em Poços de Caldas e online.',
    contentHtml: `
      <p class="lead">Na clínica psicológica contemporânea, um dos fenômenos mais frequentes é a sensação de culpa que acompanha a ansiedade. O paciente chega ao consultório acreditando que há uma falha biológica ou moral intrínseca em sua mente — uma incapacidade de 'dar conta' das demandas cotidianas.</p>
      <h2>O Sofrimento não Surge Descolado da Realidade</h2>
      <p>Pela Psicologia Histórico-Cultural, fundamentada nas contribuições de Lev Vygotsky e nos estudos do desenvolvimento humano, as funções psicológicas superiores não se desenvolvem no vácuo. Nós nos constituímos como sujeitos na relação ativa com o mundo e com os outros.</p>
      <p>Isso significa que o que hoje se manifesta como aperto no peito, insônia ou ruminação mental incessante foi, em muitos momentos da sua trajetória, a <strong>estratégia mais adaptativa e protetiva</strong> que você encontrou para sobreviver a ambientes de hipervigilância, cobrança desmedida ou desamparo emocional.</p>
      <blockquote>“A clareza sobre quem você é abre espaço para o que você pode ser. A consciência individual é construída na história viva das relações humanas.”</blockquote>
      <h2>O Papel Organizador da Palavra na Terapia</h2>
      <p>Quando a angústia não encontra mediação simbólica, ela se expressa no corpo através de sintomas físicos. O processo psicoterapêutico oferece exatamente a mediação intencional: através da palavra dita a uma profissional ética e qualificada, aquilo que parecia confuso e silencioso começa a ganhar contorno, lógica e sentido histórico.</p>
      <p>Compreender a raiz do seu sofrimento não significa resignar-se a ele, mas sim desarmar a culpa para construir uma posição de maturidade e autonomia prática diante da própria história.</p>
    `,
    faqItems: [
      {
        question: 'Como a psicologia histórico-cultural trata a ansiedade?',
        answer:
          'A abordagem não compreende a ansiedade como um defeito biológico isolado, mas como o resultado de relações, contextos sociais e exigências que o sujeito assimilou ao longo de sua história singular.'
      },
      {
        question: 'Quando é o momento de procurar a psicoterapia?',
        answer:
          'Quando padrões de sofrimento, autocobrança ou exaustão emocional passam a se repetir e as estruturas antigas já não sustentam seu bem-estar, autonomia e relações.'
      }
    ]
  },
  {
    id: 'post_referencia_vinculos',
    title: 'Por que repetimos dinâmicas que nos machucam? O papel dos vínculos',
    slug: 'por-que-repetimos-dinamicas-relacionais',
    category: 'Relacionamentos & Vínculos',
    tags: ['relacionamentos', 'vínculos afetivos', 'psicoterapia', 'autoconhecimento', 'desenvolvimento humano'],
    excerpt:
      'A repetição de padrões afetivos e comportamentais não decorre de falta de força de vontade, mas de estruturas relacionais assimiladas na história singular de cada sujeito que pedem ressignificação consciente.',
    coverImageUrl: '/hero-poster.webp',
    coverImagePosition: 'center',
    coverImageCaption: 'Compreensão profunda das estruturas relacionais e mediação afetiva na clínica psicológica',
    readTimeMinutes: 4,
    publishedAt: '2026-10-24T14:30:00Z',
    updatedAt: '2026-10-24T14:30:00Z',
    authorName: 'Ana Lima',
    authorCrp: '04/60205',
    seoTitle: 'Por que Repetimos Padrões nos Relacionamentos? • Psicóloga Ana Lima',
    seoDescription:
      'Compreenda como as primeiras mediações afetivas moldam nossas escolhas e como transformar padrões relacionais na terapia.',
    contentHtml: `
      <p class="lead">É muito comum ouvir na clínica relatos de pessoas que se percebem presas a ciclos relacionais repetitivos: a escolha por parceiros emocionalmente indisponíveis, a dificuldade crônica em estabelecer limites saudáveis ou a tendência involuntária de assumir a responsabilidade pelo bem-estar do outro.</p>
      <h2>O Passado que se Faz Presente sem Aviso</h2>
      <p>Na perspectiva histórico-cultural, nossas formas de amar, confiar e temer não nascem prontas no cérebro; elas são internalizadas através das primeiras mediações afetivas que experimentamos no mundo. Aquilo que vivenciamos intersubjetivamente na infância e juventude torna-se a nossa gramática relacional interna.</p>
      <p>Muitas vezes, a repetição de uma dinâmica dolorosa acontece porque ela é <strong>familiar e previsível</strong> para o nosso psiquismo. O desconhecido, ainda que mais saudável, gera estranhamento inicial.</p>
      <blockquote>“Aquilo que não é conscientizado e elaborado na palavra tende a se repetir como destino involuntário no cotidiano.”</blockquote>
      <h2>Transformando a Repetição em Escolha Consciente</h2>
      <p>O objetivo do processo psicoterapêutico não é apontar culpados no passado, mas desvelar o sentido das escolhas presentes. Ao reconhecer as origens das suas necessidades emocionais e dos seus medos de abandono ou rejeição, abre-se a possibilidade de construir novas respostas relacionais.</p>
      <p>A autonomia afetiva nasce da coragem de olhar para a própria história sem resignação, aprendendo a sustentar vínculos que respeitem sua integridade e seu valor.</p>
    `,
    faqItems: [
      {
        question: 'Por que é tão difícil quebrar padrões em relacionamentos?',
        answer:
          'Porque os padrões relacionais foram aprendidos como mecanismos de segurança em fases anteriores da vida. Modificá-los exige desconstruir crenças profundas e experimentar novas posturas na prática psicoterapêutica.'
      },
      {
        question: 'Como a psicoterapia ajuda na resolução de conflitos afetivos?',
        answer:
          'A terapia oferece um espaço de reflexão crítica para que o sujeito identifique suas feridas de origem, estabeleça limites claros e aprenda a se posicionar com firmeza e afeto diante dos outros.'
      }
    ]
  }
];

function decodeFirestoreValue(val) {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    const values = val.arrayValue && Array.isArray(val.arrayValue.values) ? val.arrayValue.values : [];
    return values.map(decodeFirestoreValue);
  }
  if ('mapValue' in val) {
    const fields = (val.mapValue && val.mapValue.fields) || {};
    const out = {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeFirestoreValue(v);
    }
    return out;
  }
  return undefined;
}

function decodeDocument(doc) {
  if (!doc || !doc.fields) return null;
  const out = { id: doc.name ? doc.name.split('/').pop() : '' };
  for (const [k, v] of Object.entries(doc.fields)) {
    out[k] = decodeFirestoreValue(v);
  }
  return out;
}

function normalizeSlug(value) {
  if (!value) return '';
  try {
    return decodeURIComponent(String(value)).replace(/\.html$/i, '').trim().toLowerCase();
  } catch {
    return String(value).replace(/\.html$/i, '').trim().toLowerCase();
  }
}

async function fetchPublishedPosts() {
  const map = new Map();
  for (const p of CURATED_POSTS) {
    map.set(normalizeSlug(p.slug), p);
  }

  try {
    const response = await fetch(FIRESTORE_QUERY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'blog_posts' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'status' },
              op: 'EQUAL',
              value: { stringValue: 'published' }
            }
          }
        }
      }),
      signal: AbortSignal.timeout(3500)
    });

    if (response.ok) {
      const rows = await response.json();
      if (Array.isArray(rows)) {
        for (const row of rows) {
          if (row && row.document) {
            const parsed = decodeDocument(row.document);
            if (parsed && (parsed.slug || parsed.id)) {
              const key = normalizeSlug(parsed.slug || parsed.id);
              map.set(key, parsed);
            }
          }
        }
      }
    }
  } catch {
    // Fallback graceful para os ensaios curados
  }

  return Array.from(map.values()).sort((a, b) => {
    const da = new Date(a.publishedAt || a.updatedAt || 0).getTime();
    const db = new Date(b.publishedAt || b.updatedAt || 0).getTime();
    return db - da;
  });
}

async function findPostBySlug(rawSlug) {
  const target = normalizeSlug(rawSlug);
  if (!target) return null;
  const posts = await fetchPublishedPosts();
  return posts.find((p) => normalizeSlug(p.slug) === target || normalizeSlug(p.id) === target) || null;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function htmlToMarkdown(html) {
  let md = String(html || '');
  md = md.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, (_, t) => `\n\n## ${stripHtml(t)}\n\n`);
  md = md.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, (_, t) => `\n\n### ${stripHtml(t)}\n\n`);
  md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, t) => `\n\n> ${stripHtml(t)}\n\n`);
  md = md.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_, t) => `- ${stripHtml(t)}\n`);
  md = md.replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_, t) => `**${stripHtml(t)}**`);
  md = md.replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, (_, t) => `*${stripHtml(t)}*`);
  md = md.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_, t) => `\n${t.replace(/<[^>]+>/g, '').trim()}\n`);
  md = md.replace(/<[^>]+>/g, '');
  return md.replace(/\n{3,}/g, '\n\n').trim();
}

function resolvePublicImageUrl(post) {
  const raw = post && post.coverImageUrl ? String(post.coverImageUrl) : '';
  if (!raw) return `${BASE_URL}/og-ana-lima.jpg`;
  if (raw.startsWith('data:')) {
    const slug = encodeURIComponent(post.slug || post.id || 'artigo');
    return `${BASE_URL}/api/cover?slug=${slug}`;
  }
  if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
  if (raw.startsWith('/')) return `${BASE_URL}${raw}`;
  return `${BASE_URL}/${raw}`;
}

function wantsMarkdown(req) {
  const accept = String((req && req.headers && req.headers.accept) || '').toLowerCase();
  return accept.includes('text/markdown');
}

module.exports = {
  BASE_URL,
  CURATED_POSTS,
  fetchPublishedPosts,
  findPostBySlug,
  normalizeSlug,
  escapeHtml,
  stripHtml,
  htmlToMarkdown,
  resolvePublicImageUrl,
  wantsMarkdown
};
