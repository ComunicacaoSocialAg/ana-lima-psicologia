#!/usr/bin/env node

/**
 * Script de Notificação Automática do IndexNow para o site da Psicóloga Ana Lima
 * Domínio: analimapsicologia.com.br
 */

const KEY = 'd921f9510cc174539d30ece9bbc5aa9a';
const HOST = 'analimapsicologia.com.br';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

const DEFAULT_URLS = [
  `https://${HOST}/`,
  `https://${HOST}/blog`,
  `https://${HOST}/blog/ansiedade-compreensao-historico-cultural`,
  `https://${HOST}/blog/por-que-repetimos-dinamicas-relacionais`
];

// URLs passadas por argumento CLI (se houver) ou lista padrão
const customUrls = process.argv.slice(2).filter((u) => u.startsWith('http'));
const urlList = customUrls.length > 0 ? customUrls : DEFAULT_URLS;

const payload = {
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList
};

async function submitIndexNow() {
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
