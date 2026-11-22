#!/usr/bin/env node

/**
 * Script de Notificação Automática do IndexNow para o site da Psicóloga Ana Lima
 * Domínio: analimapsicologia.com.br
 * - Se passar URLs como argumento, envia essas URLs.
 * - Caso contrário, lê dinamicamente todas as URLs publicadas em /sitemap.xml.
 */

const KEY = 'd921f9510cc174539d30ece9bbc5aa9a';
const HOST = 'analimapsicologia.com.br';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const FALLBACK_URLS = [
  `https://${HOST}/`,
  `https://${HOST}/sobre`,
  `https://${HOST}/contato`,
  `https://${HOST}/privacidade`,
  `https://${HOST}/blog`,
  `https://${HOST}/blog/como-funciona-a-psicoterapia-de-abordagem-historico-cultural`,
  `https://${HOST}/blog/ansiedade-compreensao-historico-cultural`,
  `https://${HOST}/blog/por-que-repetimos-dinamicas-relacionais`
];

async function resolveUrls() {
  const customUrls = process.argv.slice(2).filter((u) => u.startsWith('http'));
  if (customUrls.length > 0) return customUrls;

  try {
    const res = await fetch(`https://${HOST}/sitemap.xml`, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const xml = await res.text();
      const matches = [...xml.matchAll(/<loc>(https:\/\/[^<]+)<\/loc>/g)].map((m) => m[1].trim());
      if (matches.length > 0) return [...new Set(matches)];
    }
  } catch {
    // fallback
  }
  return FALLBACK_URLS;
}

async function submitIndexNow() {
  const urlList = await resolveUrls();
  const payload = {
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList
  };

  console.log(`📡 Enviando ${urlList.length} URL(s) para o IndexNow...`);
  urlList.forEach((url) => console.log(` - ${url}`));

  const endpoints = [
    { name: 'IndexNow Global', url: 'https://api.indexnow.org/indexnow' },
    { name: 'Bing IndexNow', url: 'https://www.bing.com/indexnow' }
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      if (res.status === 200 || res.status === 202) {
        console.log(`✅ [${ep.name}] Sucesso! Status HTTP ${res.status}`);
      } else {
        const text = await res.text();
        console.warn(`⚠️ [${ep.name}] Retorno inesperado HTTP ${res.status}: ${text}`);
      }
    } catch (err) {
      console.error(`❌ [${ep.name}] Erro ao submeter:`, err.message);
    }
  }
}

submitIndexNow();
