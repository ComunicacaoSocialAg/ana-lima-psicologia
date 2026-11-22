const fs = require('fs');
const path = require('path');
const {
  BASE_URL,
  fetchPublishedPosts,
  escapeHtml,
  resolvePublicImageUrl,
  wantsMarkdown
} = require('./_lib/blogData');

let cachedTemplate = null;
function getTemplate() {
  if (!cachedTemplate) {
    cachedTemplate = fs.readFileSync(path.join(process.cwd(), 'blog', 'index.html'), 'utf8');
  }
  return cachedTemplate;
}

module.exports = async (req, res) => {
  const posts = await fetchPublishedPosts();

  res.setHeader('Vary', 'Accept');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');

  if (wantsMarkdown(req)) {
    const lines = [
      '# Caderno Clínico & Blog • Psicóloga Ana Lima (CRP 04/60205)',
      '',
      '> Artigos, ensaios e reflexões fundamentados na Psicologia Histórico-Cultural e no Desenvolvimento Humano. Atendimento presencial em Poços de Caldas/MG e online.',
      '',
      `URL Canônica: ${BASE_URL}/blog`,
      '',
      '## Artigos Publicados',
      ''
    ];

    for (const p of posts) {
      const slug = p.slug || p.id;
      const dateStr = (p.publishedAt || '').slice(0, 10);
      lines.push(`### [${p.title}](${BASE_URL}/blog/${slug})`);
      lines.push(`- Categoria: ${p.category || 'Reflexão Clínica'} | Leitura: ${p.readTimeMinutes || 4} min | Publicado em: ${dateStr}`);
      lines.push(`- Resumo: ${p.excerpt || ''}`);
      lines.push('');
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.end(lines.join('\n'));
    return;
  }

  let html = getTemplate();

  // Corrigir meta OG/Twitter para URLs absolutas e imagem otimizada
  html = html.replace(
    /content="\/ana%20lima1\.png\?v=2"/g,
    `content="${BASE_URL}/og-ana-lima.jpg"`
  );

  // Construir JSON-LD enriquecido com todos os artigos e BreadcrumbList
  const graphSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Blog',
        '@id': `${BASE_URL}/blog#blog`,
        url: `${BASE_URL}/blog`,
        name: 'Caderno Clínico • Psicóloga Ana Lima',
        description:
          'Artigos e reflexões fundamentados na Psicologia Histórico-Cultural e no Desenvolvimento Humano.',
        inLanguage: 'pt-BR',
        publisher: {
          '@type': ['Psychologist', 'MedicalBusiness'],
          '@id': `${BASE_URL}/#clinic`,
          name: 'Consultório de Psicologia Clínica Ana Lima',
          url: `${BASE_URL}/`,
          telephone: '+55-31-99294-9211'
        },
        blogPost: posts.map((p) => ({
          '@type': 'BlogPosting',
          headline: p.title,
          url: `${BASE_URL}/blog/${p.slug || p.id}`,
          datePublished: p.publishedAt || '2026-10-26T10:00:00Z',
          description: p.excerpt || '',
          image: resolvePublicImageUrl(p),
          author: {
            '@type': 'Person',
            name: p.authorName || 'Ana Lima',
            identifier: 'CRP 04/60205'
          }
        }))
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: `${BASE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'Caderno Clínico & Blog', item: `${BASE_URL}/blog` }
        ]
      }
    ]
  };

  html = html.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/i,
    `<script type="application/ld+json">\n${JSON.stringify(graphSchema)}\n  </script>`
  );

  // Renderizar cards no HTML inicial (SSR para Google, Bing e LLMs)
  const featured = posts[0];
  const regularPosts = posts.slice(1);

  let featuredHtml = '';
  if (featured) {
    const slug = encodeURIComponent(featured.slug || featured.id);
    const dateStr = new Date(featured.publishedAt || Date.now()).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    const imgSrc = featured.coverImageUrl || '/ana-lima-portrait.webp';
    featuredHtml = `
      <a href="/blog/${slug}" class="featured-card">
        <div class="featured-img-wrap">
          <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(featured.title)}" class="featured-img" style="object-position: ${escapeHtml(featured.coverImagePosition || 'top')};" loading="eager" />
        </div>
        <div class="featured-content">
          <div class="card-meta">
            <span class="card-badge">${escapeHtml(featured.category || 'Reflexão')}</span>
            <span>•</span>
            <span>${featured.readTimeMinutes || 4} min de leitura</span>
            <span>•</span>
            <span>${escapeHtml(dateStr)}</span>
          </div>
          <h2 class="featured-title">${escapeHtml(featured.title)}</h2>
          <p class="featured-excerpt">${escapeHtml(featured.excerpt)}</p>
          <div class="card-byline">
            <img src="/ana%20lima%20favcom.png" alt="Ana Lima" class="card-avatar" />
            <div>
              <span class="card-author-name">Ana Lima</span>
              <span class="card-author-role">Psicóloga Clínica • CRP 04/60205</span>
            </div>
          </div>
        </div>
      </a>
    `;
  }

  const gridHtml = regularPosts
    .map((p) => {
      const slug = encodeURIComponent(p.slug || p.id);
      const dateStr = new Date(p.publishedAt || Date.now()).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      const imgSrc = p.coverImageUrl || '/ana-lima-portrait.webp';
      return `
        <a href="/blog/${slug}" class="post-card">
          <div class="post-card-img-wrap">
            <img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(p.title)}" class="post-card-img" style="object-position: ${escapeHtml(p.coverImagePosition || 'top')};" loading="lazy" />
          </div>
          <div class="post-card-body">
            <div class="card-meta">
              <span class="card-badge">${escapeHtml(p.category || 'Reflexão')}</span>
              <span>•</span>
              <span>${p.readTimeMinutes || 3} min</span>
            </div>
            <h3 class="post-card-title">${escapeHtml(p.title)}</h3>
            <p class="post-card-excerpt">${escapeHtml(p.excerpt)}</p>
            <div class="card-byline">
              <div>
                <span class="card-author-name">Ana Lima • CRP 04/60205</span>
                <span class="card-author-role">${escapeHtml(dateStr)}</span>
              </div>
            </div>
          </div>
        </a>
      `;
    })
    .join('');

  html = html.replace(
    '<div id="featuredContainer"></div>',
    `<div id="featuredContainer">${featuredHtml}</div>`
  );
  html = html.replace(
    '<div id="postsGrid" class="posts-grid"></div>',
    `<div id="postsGrid" class="posts-grid">${gridHtml}</div>`
  );

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
};
