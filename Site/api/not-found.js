const { BASE_URL } = require('./_lib/blogData');

module.exports = (req, res) => {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Vary', 'Accept');
  res.setHeader('Cache-Control', 'no-store');
  res.end(
    `# 404 — Recurso não encontrado\n\nO endereço solicitado não foi encontrado em ${BASE_URL}.\n\n## Recursos disponíveis\n- [Página Inicial](${BASE_URL}/)\n- [Sobre Ana Lima (CRP 04/60205)](${BASE_URL}/sobre)\n- [Contato e Agendamento](${BASE_URL}/contato)\n- [Privacidade e Sigilo Clínico](${BASE_URL}/privacidade)\n- [Caderno Clínico & Blog](${BASE_URL}/blog)\n- [Base de Conhecimento para Agentes (llms.txt)](${BASE_URL}/llms.txt)\n- [Sitemap XML](${BASE_URL}/sitemap.xml)\n`
  );
};
