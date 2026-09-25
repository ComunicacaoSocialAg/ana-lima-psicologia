import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const versionFilePath = path.join(rootDir, 'public', 'version.json');
const swFilePath = path.join(rootDir, 'public', 'sw.js');

// Lê versão anterior se existir
let currentMajor = 1;
let currentMinor = 8;
let currentPatch = 0;

if (fs.existsSync(versionFilePath)) {
  try {
    const prev = JSON.parse(fs.readFileSync(versionFilePath, 'utf-8'));
    if (prev.version) {
      const parts = prev.version.replace(/^v/, '').split('.').map(Number);
      if (parts.length === 3 && !parts.some(isNaN)) {
        currentMajor = parts[0];
        currentMinor = parts[1];
        currentPatch = parts[2] + 1;
      }
    }
  } catch {
    // fallback
  }
}

const customNote = process.argv.slice(2).join(' ').trim();
const newVersion = `${currentMajor}.${currentMinor}.${currentPatch}`;
const buildId = `v${newVersion}-${Date.now()}`;
const nowFormatted = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
}).format(new Date());

const versionPayload = {
  version: newVersion,
  buildId,
  releasedAt: nowFormatted,
  notes:
    customNote ||
    'Melhorias de desempenho, sincronização em nuvem e segurança clínica aplicadas automaticamente no seu consultório.'
};

fs.writeFileSync(versionFilePath, JSON.stringify(versionPayload, null, 2) + '\n', 'utf-8');

// Atualiza CACHE_NAME e RELEASE_NOTES no Service Worker (public/sw.js)
if (fs.existsSync(swFilePath)) {
  let swContent = fs.readFileSync(swFilePath, 'utf-8');
  swContent = swContent.replace(
    /const CACHE_NAME = ['"][^'"]+['"];/,
    `const CACHE_NAME = 'ana-lima-psi-${buildId}';`
  );
  swContent = swContent.replace(
    /const APP_VERSION = ['"][^'"]+['"];/,
    `const APP_VERSION = '${newVersion}';`
  );
  swContent = swContent.replace(
    /const RELEASE_NOTES = ['"][^'"]+['"];/,
    `const RELEASE_NOTES = ${JSON.stringify(versionPayload.notes)};`
  );
  fs.writeFileSync(swFilePath, swContent, 'utf-8');
}

console.log(`✅ Versão atualizada para v${newVersion} (${buildId})`);
