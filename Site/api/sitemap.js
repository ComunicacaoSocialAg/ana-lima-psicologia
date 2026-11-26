const {
  BASE_URL,
  fetchPublishedPosts,
  escapeHtml,
  resolvePublicImageUrl
} = require('./_lib/blogData');

module.exports = async (req, res) => {
  const posts = await fetchPublishedPosts();
  const today = new Date().toISOString().slice(0, 10);

  const staticPages = [
    { loc: `${BASE_URL}/`, lastmod: today, changefreq: 'weekly', priority: '1.0' },
    { loc: `${BASE_URL}/psicologa-em-pocos-de-caldas`, lastmod: today, changefreq: 'monthly', priority: '0.9' },
    { loc: `${BASE_URL}/psicoterapia-online`, lastmod: today, changefreq: 'monthly', priority: '0.9' },
    { loc: `${BASE_URL}/sobre`, lastmod: today, changefreq: 'monthly', priority: '0.8' },
    { loc: `${BASE_URL}/contato`, lastmod: today, changefreq: 'monthly', priority: '0.8' },
    { loc: `${BASE_URL}/privacidade`, lastmod: today, changefreq: 'yearly', priority: '0.5' },
    { loc: `${BASE_URL}/blog`, lastmod: today, changefreq: 'daily', priority: '0.9' }
  ];

  const postEntries = posts.map((p) => {
    const slug = encodeURIComponent(p.slug || p.id);
    const lastmod = (p.updatedAt || p.publishedAt || today).slice(0, 10);
    const imgUrl = resolvePublicImageUrl(p);
    return `  <url>
    <loc>${BASE_URL}/blog/${slug}</loc>
    <lastmod>${escapeHtml(lastmod)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>${escapeHtml(imgUrl)}</image:loc>
      <image:title>${escapeHtml(p.title)}</image:title>
    </image:image>
  </url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
    <image:image>
      <image:loc>${BASE_URL}/og-ana-lima.jpg</image:loc>
      <image:title>Ana Lima • Psicóloga Clínica em Poços de Caldas e Online (CRP 04/60205)</image:title>
      <image:caption>Retrato da Psicóloga Clínica Ana Lima (CRP 04/60205) • Abordagem Histórico-Cultural</image:caption>
    </image:image>
    <video:video>
      <video:thumbnail_loc>${BASE_URL}/hero-poster.jpg</video:thumbnail_loc>
      <video:title>Psicóloga Ana Lima em Poços de Caldas • Abordagem Histórico-Cultural</video:title>
      <video:description>A clareza sobre quem você é abre espaço para o que você pode ser. Psicoterapia Clínica Online e Presencial.</video:description>
      <video:content_loc>${BASE_URL}/ana-paula-de-lima-hero-h264.mp4</video:content_loc>
      <video:duration>5</video:duration>
    </video:video>
  </url>
${staticPages
  .slice(1)
  .map(
    (s) => `  <url>
    <loc>${s.loc}</loc>
    <lastmod>${s.lastmod}</lastmod>
    <changefreq>${s.changefreq}</changefreq>
    <priority>${s.priority}</priority>
  </url>`
  )
  .join('\n')}
${postEntries.join('\n')}
</urlset>
`;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
  res.end(xml);
};
