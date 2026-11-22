const fs = require('fs');
const path = require('path');
const {
  BASE_URL,
  findPostBySlug,
  escapeHtml,
  stripHtml,
  htmlToMarkdown,
  resolvePublicImageUrl,
  wantsMarkdown
} = require('./_lib/blogData');

let cachedTemplate = null;
let cached404 = null;

function getTemplate() {
  if (!cachedTemplate) {
    cachedTemplate = fs.readFileSync(path.join(process.cwd(), 'blog', 'post.html'), 'utf8');
  }
  return cachedTemplate;
}

function get404Html() {
  if (!cached404) {
    cached404 = fs.readFileSync(path.join(process.cwd(), '404.html'), 'utf8');
  }
  return cached404;
}

function buildTocAndInjectIds(contentHtml) {
  let idx = 0;
  const items = [];
  const processedHtml = String(contentHtml || '').replace(
    /<(h[23])([^>]*)>([\s\S]*?)<\/\1>/gi,
    (full, tag, attrs, inner) => {
      idx += 1;
      const id = `secao-${idx}`;
      const cleanText = stripHtml(inner);
      items.push({ tag: tag.toLowerCase(), id, text: cleanText });
      const cleanAttrs = attrs.replace(/\sid=(["']).*?\1/i, '');
      return `<${tag}${cleanAttrs} id="${id}">${inner}</${tag}>`;
    }
  );
  return { processedHtml, items };
}

module.exports = async (req, res) => {
  const urlObj = new URL(req.url, BASE_URL);
  const querySlug = (req.query && req.query.slug) || urlObj.searchParams.get('slug');
  const pathParts = urlObj.pathname.split('/').filter(Boolean);
  const pathSlug = pathParts.length >= 2 && pathParts[0] === 'blog' ? pathParts[1] : '';
  const slug = querySlug || pathSlug;

  res.setHeader('Vary', 'Accept');

  const post = await findPostBySlug(slug);

  if (!post) {
    res.statusCode = 404;
    res.setHeader('Cache-Control', 'no-store');
    if (wantsMarkdown(req)) {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.end(
        `# 404 — Artigo não encontrado\n\nO artigo solicitado não existe ou foi removido.\n\n- [Caderno Clínico & Blog](${BASE_URL}/blog)\n- [Página Inicial](${BASE_URL}/)\n- [Base de Conhecimento para IAs (llms.txt)](${BASE_URL}/llms.txt)\n- [Sitemap XML](${BASE_URL}/sitemap.xml)\n`
      );
      return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(get404Html());
    return;
  }

  const resolvedSlug = post.slug || post.id;
  const fullUrl = `${BASE_URL}/blog/${encodeURIComponent(resolvedSlug)}`;
  const safeTitle = post.title || 'Reflexão Clínica';
  const seoTitle = post.seoTitle || `${safeTitle} • Psicóloga Ana Lima (CRP 04/60205)`;
  const seoDesc = post.seoDescription || post.excerpt || 'Artigo clínico por Ana Lima (CRP 04/60205).';
  const publicCover = resolvePublicImageUrl(post);

  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');

  if (wantsMarkdown(req)) {
    const mdLines = [
      `# ${safeTitle}`,
      '',
      `> ${post.excerpt || ''}`,
      '',
      `- **Autora**: ${post.authorName || 'Ana Lima'} (CRP ${post.authorCrp || '04/60205'})`,
      `- **Categoria**: ${post.category || 'Psicologia Clínica'}`,
      `- **Leitura**: ${post.readTimeMinutes || 4} minutos`,
      `- **Publicado em**: ${(post.publishedAt || '').slice(0, 10)}`,
      `- **URL Canônica**: ${fullUrl}`,
      '',
      '---',
      '',
      htmlToMarkdown(post.contentHtml || '')
    ];

    if (Array.isArray(post.faqItems) && post.faqItems.length > 0) {
      mdLines.push('', '## Perguntas Frequentes sobre o Tema', '');
      for (const f of post.faqItems) {
        mdLines.push(`### ${f.question}`);
        mdLines.push(f.answer);
        mdLines.push('');
      }
    }

    mdLines.push(
      '---',
      '',
      `**Atendimento Psicológico**: Presencial em Poços de Caldas/MG e Online. Agendamento via WhatsApp: https://wa.me/5531992949211`
    );

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.end(mdLines.join('\n'));
    return;
  }

  let html = getTemplate();
  const { processedHtml, items: tocItems } = buildTocAndInjectIds(post.contentHtml || '');
  const plainText = stripHtml(processedHtml);
  const wordCount = plainText ? plainText.split(/\s+/).length : 0;

  // 1. Metadados SSR
  html = html.replace(
    /<title id="metaTitle">[\s\S]*?<\/title>/i,
    `<title id="metaTitle">${escapeHtml(seoTitle)}</title>`
  );
  html = html.replace(
    /<meta id="metaDesc" name="description" content="[^"]*"\s*\/>/i,
    `<meta id="metaDesc" name="description" content="${escapeHtml(seoDesc)}" />`
  );
  html = html.replace(
    /<link id="canonicalUrl" rel="canonical" href="[^"]*"\s*\/>/i,
    `<link id="canonicalUrl" rel="canonical" href="${fullUrl}" />`
  );
  html = html.replace(
    /<meta id="ogTitle" property="og:title" content="[^"]*"\s*\/>/i,
    `<meta id="ogTitle" property="og:title" content="${escapeHtml(safeTitle)}" />`
  );
  html = html.replace(
    /<meta id="ogDesc" property="og:description" content="[^"]*"\s*\/>/i,
    `<meta id="ogDesc" property="og:description" content="${escapeHtml(seoDesc)}" />`
  );
  html = html.replace(
    /<meta id="ogUrl" property="og:url" content="[^"]*"\s*\/>/i,
    `<meta id="ogUrl" property="og:url" content="${fullUrl}" />`
  );
  html = html.replace(
    /<meta id="ogImage" property="og:image" content="[^"]*"\s*\/>/i,
    `<meta id="ogImage" property="og:image" content="${escapeHtml(publicCover)}" />`
  );
  html = html.replace(
    /<meta id="twTitle" name="twitter:title" content="[^"]*"\s*\/>/i,
    `<meta id="twTitle" name="twitter:title" content="${escapeHtml(safeTitle)}" />`
  );
  html = html.replace(
    /<meta id="twDesc" name="twitter:description" content="[^"]*"\s*\/>/i,
    `<meta id="twDesc" name="twitter:description" content="${escapeHtml(seoDesc)}" />`
  );
  html = html.replace(
    /<meta id="twImage" name="twitter:image" content="[^"]*"\s*\/>/i,
    `<meta id="twImage" name="twitter:image" content="${escapeHtml(publicCover)}" />`
  );

  // 2. JSON-LD completo no HTML inicial
  const graph = [
    {
      '@type': 'BlogPosting',
      '@id': `${fullUrl}#article`,
      mainEntityOfPage: {
        '@type': 'WebPage',
        '@id': fullUrl
      },
      headline: safeTitle,
      description: seoDesc,
      image: publicCover,
      inLanguage: 'pt-BR',
      articleSection: post.category || 'Psicologia Clínica',
      keywords: Array.isArray(post.tags) ? post.tags.join(', ') : undefined,
      wordCount,
      datePublished: post.publishedAt || '2026-10-20T10:00:00Z',
      dateModified: post.updatedAt || post.publishedAt || '2026-10-20T10:00:00Z',
      author: {
        '@type': 'Person',
        '@id': `${BASE_URL}/#psychologist`,
        name: post.authorName || 'Ana Lima',
        jobTitle: 'Psicóloga Clínica',
        identifier: `CRP ${post.authorCrp || '04/60205'}`,
        url: `${BASE_URL}/sobre`
      },
      publisher: {
        '@type': ['Psychologist', 'MedicalBusiness'],
        '@id': `${BASE_URL}/#clinic`,
        name: 'Consultório de Psicologia Clínica Ana Lima',
        telephone: '+55-31-99294-9211',
        url: `${BASE_URL}/`
      }
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Início', item: `${BASE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${BASE_URL}/blog` },
        { '@type': 'ListItem', position: 3, name: safeTitle, item: fullUrl }
      ]
    }
  ];

  if (Array.isArray(post.faqItems) && post.faqItems.length > 0) {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${fullUrl}#faq`,
      mainEntity: post.faqItems.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer
        }
      }))
    });
  }

  html = html.replace(
    /<script id="schemaScript" type="application\/ld\+json"><\/script>/i,
    `<script id="schemaScript" type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>`
  );

  // 3. Conteúdo visível SSR
  const dateStr = new Date(post.publishedAt || Date.now()).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  html = html.replace(
    /<span id="breadcrumbTitle">[^<]*<\/span>/i,
    `<span id="breadcrumbTitle">${escapeHtml(safeTitle)}</span>`
  );
  html = html.replace(
    /<span id="articleBadge" class="article-badge">[^<]*<\/span>/i,
    `<span id="articleBadge" class="article-badge">${escapeHtml(post.category || 'Reflexão Clínica')}</span>`
  );
  html = html.replace(
    /<h1 id="articleTitle" class="article-title">[^<]*<\/h1>/i,
    `<h1 id="articleTitle" class="article-title">${escapeHtml(safeTitle)}</h1>`
  );
  html = html.replace(
    /<p id="articleExcerpt" class="article-excerpt">[^<]*<\/p>/i,
    `<p id="articleExcerpt" class="article-excerpt">${escapeHtml(post.excerpt || '')}</p>`
  );
  html = html.replace(
    /<span id="articleDate">[^<]*<\/span>/i,
    `<span id="articleDate">${escapeHtml(dateStr)}</span>`
  );
  html = html.replace(
    /<span id="articleReadTime">[^<]*<\/span>/i,
    `<span id="articleReadTime">${post.readTimeMinutes || 4} min de leitura</span>`
  );

  // Capa SSR
  const imgUrl = post.coverImageUrl || '/og-ana-lima.jpg';
  html = html.replace(
    /<figure id="articleCoverWrap" class="article-hero-cover" style="display:none;">[\s\S]*?<\/figure>/i,
    `<figure id="articleCoverWrap" class="article-hero-cover" style="display:block;">
      <img id="articleCoverImg" src="${escapeHtml(imgUrl)}" alt="${escapeHtml(safeTitle)}" style="object-position: ${escapeHtml(post.coverImagePosition || 'top')};" />
      <figcaption id="articleCoverCaption" class="cover-caption" style="${post.coverImageCaption ? 'display:block;' : 'display:none;'}">${escapeHtml(post.coverImageCaption || '')}</figcaption>
    </figure>`
  );

  // ToC SSR
  if (tocItems.length >= 2) {
    const tocListHtml = tocItems
      .map(
        (item) =>
          `<li style="${item.tag === 'h3' ? 'padding-left:12px;font-size:0.78rem;' : ''}"><a href="#${item.id}">${escapeHtml(item.text)}</a></li>`
      )
      .join('');
    html = html.replace(
      /<div id="tocCard" class="toc-card" style="display:none;">[\s\S]*?<ul id="tocList" class="toc-list"><\/ul>\s*<\/div>/i,
      `<div id="tocCard" class="toc-card" style="display:block;">
        <div class="toc-title">Neste Artigo</div>
        <ul id="tocList" class="toc-list">${tocListHtml}</ul>
      </div>`
    );
  }

  // Corpo do artigo SSR
  html = html.replace(
    /<div id="articleBody">[\s\S]*?<\/div>/i,
    `<div id="articleBody">${processedHtml}</div>`
  );

  // FAQs SSR
  if (Array.isArray(post.faqItems) && post.faqItems.length > 0) {
    const faqListHtml = post.faqItems
      .map(
        (f) => `<div class="faq-item"><h3 class="faq-q">${escapeHtml(f.question)}</h3><p class="faq-a">${escapeHtml(f.answer)}</p></div>`
      )
      .join('');
    html = html.replace(
      /<section id="articleFaqWrap" class="article-faq-section" style="display:none;">([\s\S]*?)<div id="faqList"><\/div>/i,
      `<section id="articleFaqWrap" class="article-faq-section" style="display:block;">$1<div id="faqList">${faqListHtml}</div>`
    );
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
};
