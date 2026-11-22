const fs = require('fs');
const path = require('path');
const { BASE_URL, fetchPublishedPosts } = require('./_lib/blogData');

let cachedLlms = null;
function getLlms() {
  if (!cachedLlms) {
    cachedLlms = fs.readFileSync(path.join(process.cwd(), 'llms.txt'), 'utf8');
  }
  return cachedLlms;
}

module.exports = async (req, res) => {
  const llms = getLlms();
  const posts = await fetchPublishedPosts();

  const articlesList = posts
    .map((p) => `- [${p.title}](${BASE_URL}/blog/${p.slug || p.id}): ${p.excerpt || ''}`)
    .join('\n');

  const body = `${llms.trim()}\n\n## Artigos Publicados Atualizados em Tempo Real\n${articlesList}\n`;

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Vary', 'Accept');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600');
  res.end(body);
};
