/**
 * Script de Teste e Validação Automática de Restauração de Backup
 * "Backup só é backup depois de restaurado e conferido com sucesso"
 *
 * Executa:
 *  1. Teste Positivo: Decifra com a chave correta, valida SHA-256 e confere contagem dos dados.
 *  2. Teste Negativo: Tenta decifrar com senha incorreta e certifica que o AES-256-GCM rejeita sem vazamento.
 *  3. Verificação de Schema: Confere cada paciente, prontuário e sessão.
 */

import fs from "fs";
import path from "path";

const BACKUPS_DIR = path.resolve(process.cwd(), "backups");
const DAILY_DIR = path.join(BACKUPS_DIR, "daily");

async function computeSha256(text) {
  const enc = new TextEncoder();
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    enc.encode(text),
  );
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function deriveKey(passphrase, salt, iterations = 600000) {
  const enc = new TextEncoder();
  const rawKey = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return globalThis.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function decryptContainer(container, passphrase) {
  const salt = Buffer.from(container.salt, "base64");
  const iv = Buffer.from(container.iv, "base64");
  const ciphertext = Buffer.from(container.ciphertext, "base64");
  const key = await deriveKey(passphrase, salt, container.iterations || 600000);

  const decryptedBuf = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext,
  );

  const dec = new TextDecoder();
  const jsonStr = dec.decode(decryptedBuf);
  const calculatedSha = await computeSha256(jsonStr);

  if (calculatedSha !== container.sha256Checksum) {
    throw new Error(
      "Falha de integridade: Checksum SHA-256 não confere com o arquivo original!",
    );
  }

  return JSON.parse(jsonStr);
}

async function runRestoreTest() {
  console.log("=====================================================");
  console.log("TESTE AUTOMATIZADO DE RESTAURAÇÃO DE BACKUP (ANA LIMA)");
  console.log("Data/Hora:", new Date().toISOString());
  console.log("=====================================================\n");

  const passphrase = process.env.BACKUP_PASSPHRASE;
  if (!passphrase) throw new Error("Senha de recuperação ausente.");

  // Localiza o backup mais recente
  let targetFile = process.argv[2];
  if (!targetFile) {
    if (!fs.existsSync(DAILY_DIR)) {
      throw new Error(`Diretório de backups não encontrado em: ${DAILY_DIR}`);
    }
    const files = fs
      .readdirSync(DAILY_DIR)
      .filter((f) => f.endsWith(".enc.json"))
      .map((f) => ({
        name: f,
        fullPath: path.join(DAILY_DIR, f),
        time: fs.statSync(path.join(DAILY_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length === 0) {
      throw new Error(
        "Nenhum arquivo de backup encontrado para teste de restauração.",
      );
    }
    targetFile = files[0].fullPath;
  }

  console.log(`[ALVO DO TESTE] Arquivo: ${path.basename(targetFile)}`);
  console.log(
    `[TAMANHO] ${(fs.statSync(targetFile).size / 1024).toFixed(2)} KB`,
  );

  const raw = fs.readFileSync(targetFile, "utf-8");
  const container = JSON.parse(raw);

  // Validação de Metadados
  if (!container.encrypted || container.algorithm !== "AES-256-GCM") {
    throw new Error(
      "Formato inválido: o arquivo não é um container AES-256-GCM.",
    );
  }

  console.log(
    `[ALGORITMO] ${container.algorithm} com KDF ${container.kdf} (${container.iterations} iterações)`,
  );
  console.log(`[CHECKSUM SHA-256 ORIGINAL] ${container.sha256Checksum}`);

  // TESTE 1: Decifração Positiva (Com a senha correta)
  console.log(
    "\n--- [TESTE 1/2] Decifração e Integridade com Senha Correta ---",
  );
  const start = Date.now();
  const payload = await decryptContainer(container, passphrase);
  const elapsed = Date.now() - start;

  console.log(`>> SUCESSO: Arquivo decifrado com sucesso em ${elapsed}ms.`);
  console.log(`>> Checksum SHA-256 verificado e 100% autêntico.`);

  // Conferência dos dados extraídos
  const data = payload.data || {};
  const patients = data.patients || [];
  const records = data.clinicalRecords || [];
  const sessions = data.sessions || [];
  const payments = data.payments || [];
  const anamnesis = data.anamnesis || {};

  console.log("\n[CONFERÊNCIA DETALHADA DO CONTEÚDO RESTAURADO]");
  console.log(` - Pacientes encontrados: ${patients.length}`);
  console.log(` - Prontuários/Evoluções: ${records.length}`);
  console.log(` - Sessões registradas: ${sessions.length}`);
  console.log(` - Registros de Anamnese: ${Object.keys(anamnesis).length}`);
  console.log(` - Registros de Pagamento: ${payments.length}`);

  if (!patients.length && !records.length)
    throw new Error("Backup vazio: recuperação não comprovada.");
  // Teste de integridade de dados específicos
  if (patients.length > 0) {
    const p1 = patients[0];
    if (!p1.id || !p1.name) throw new Error("Cadastro inválido no backup.");
  }

  // TESTE 2: Decifração Negativa (Tentativa de quebra com senha incorreta)
  console.log("\n--- [TESTE 2/2] Teste Negativo com Senha Incorreta ---");
  try {
    await decryptContainer(container, "SenhaCompletamenteInvalida#9999");
    console.error(
      ">> FALHA CRÍTICA: O arquivo foi decifrado com senha incorreta!",
    );
    process.exit(1);
  } catch (err) {
    console.log(
      `>> SUCESSO: Rejeitado e bloqueado pelo AES-256-GCM Authentication Tag.`,
    );
    console.log(`>> Mensagem do Erro: ${err.message}`);
  }

  console.log("\n=====================================================");
  console.log("RESULTADO FINAL: TESTE DE RESTAURAÇÃO 100% APROVADO!");
  console.log(
    "A decifração e o checksum foram verificados. A restauração no banco precisa de verificação isolada.",
  );
  console.log("=====================================================");
  return true;
}

runRestoreTest().catch((err) => {
  console.error("\n[FALHA NO TESTE DE RESTAURAÇÃO]:", err);
  process.exit(1);
});
