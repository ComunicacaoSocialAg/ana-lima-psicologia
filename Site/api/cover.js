const { BASE_URL, findPostBySlug } = require('./_lib/blogData');

module.exports = async (req, res) => {
  const urlObj = new URL(req.url, BASE_URL);
  const slug = (req.query && req.query.slug) || urlObj.searchParams.get('slug') || '';
  const post = await findPostBySlug(slug);

  if (!post || !post.coverImageUrl) {
    res.statusCode = 302;
    res.setHeader('Location', `${BASE_URL}/og-ana-lima.jpg`);
    res.end();
    return;
  }

  const raw = String(post.coverImageUrl);
  const match = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (match) {
    const mimeType = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    res.statusCode = 200;
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.end(buffer);
    return;
  }

  const location = raw.startsWith('http') ? raw : `${BASE_URL}${raw.startsWith('/') ? raw : '/' + raw}`;
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.end();
};
