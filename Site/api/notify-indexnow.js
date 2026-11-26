const { BASE_URL, findPostBySlug } = require('./_lib/blogData');

const KEY = 'd921f9510cc174539d30ece9bbc5aa9a';
const HOST = 'analimapsicologia.com.br';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }

  let slug = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    slug = String(body.slug || '').trim();
  } catch {
    slug = '';
  }

  if (!slug) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Missing slug' }));
    return;
  }

  const post = await findPostBySlug(slug);
  if (!post) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Published post not found' }));
    return;
  }

  const resolvedSlug = encodeURIComponent(post.slug || post.id);
  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: `${BASE_URL}/${KEY}.txt`,
    urlList: [
      `${BASE_URL}/blog`,
      `${BASE_URL}/blog/${resolvedSlug}`,
      `${BASE_URL}/sitemap.xml`
    ]
  };

  const results = await Promise.allSettled([
    fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000)
    }),
    fetch('https://www.bing.com/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000)
    })
  ]);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      ok: true,
      submitted: payload.urlList,
      statuses: results.map((r) => (r.status === 'fulfilled' ? r.value.status : 'error'))
    })
  );
};
