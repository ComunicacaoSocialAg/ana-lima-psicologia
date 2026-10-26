/**
 * Rotina Automatizada de Backup Criptografado & Rotação de Retenção
 * Padrão: AES-256-GCM + PBKDF2 (600.000 iterações) com Checksum SHA-256
 * Retenção: 7 Diários | 4 Semanais | 12 Mensais
 * Conformidade: CFP 001/2009 e LGPD Art. 11/46
 */

import fs from "fs";
import path from "path";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const FIREBASE_CONFIG = {
  apiKey:
    process.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyAqd5ypUjcPWOlzzXCanmrFIVg6B5_4TW0",
  authDomain:
    process.env.VITE_FIREBASE_AUTH_DOMAIN || "ana-lima-psi-app.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "ana-lima-psi-app",
  storageBucket:
    process.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "ana-lima-psi-app.firebasestorage.app",
  messagingSenderId:
    process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "648642882842",
  appId:
    process.env.VITE_FIREBASE_APP_ID ||
    "1:648642882842:web:b7b7680e3fbca1b52050a3",
};

const ANA_UID = "psHLxoIeGfRNqQSwTbPUVxFCU8H2";
const BACKUPS_DIR = path.resolve(process.cwd(), "backups");
const DAILY_DIR = path.join(BACKUPS_DIR, "daily");
const WEEKLY_DIR = path.join(BACKUPS_DIR, "weekly");
const MONTHLY_DIR = path.join(BACKUPS_DIR, "monthly");

// Garante existência dos diretórios de retenção
[BACKUPS_DIR, DAILY_DIR, WEEKLY_DIR, MONTHLY_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Funções criptográficas nativas usando Web Crypto (Node.js 18+)
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

async function encryptPayload(payload, passphrase) {
  const jsonString = JSON.stringify(payload);
  const sha256Checksum = await computeSha256(jsonString);

  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, 600000);

  const enc = new TextEncoder();
  const encryptedBuf = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(jsonString),
  );

  return {
    version: "2.0.0",
    system: "Clinica Ana Lima - Gestão Psicológica (CFP 001/2009 & LGPD)",
    encrypted: true,
    algorithm: "AES-256-GCM",
    kdf: "PBKDF2-HMAC-SHA256",
    iterations: 600000,
    salt: Buffer.from(salt).toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
    ciphertext: Buffer.from(encryptedBuf).toString("base64"),
    sha256Checksum,
    exportedAt: new Date().toISOString(),
    metadata: {
      itemCounts: {
        patients: payload.data.patients?.length || 0,
        sessions: payload.data.sessions?.length || 0,
        records: payload.data.clinicalRecords?.length || 0,
        assessments: payload.data.assessments?.length || 0,
        payments: payload.data.payments?.length || 0,
      },
    },
  };
}

// Aplica a política de rotação de arquivos mantendo no máximo N arquivos mais recentes
function pruneDirectory(dirPath, maxCount) {
  if (!fs.existsSync(dirPath)) return;
  const files = fs
    .readdirSync(dirPath)
    .filter((f) => f.endsWith(".enc.json"))
    .map((f) => ({
      name: f,
      fullPath: path.join(dirPath, f),
      time: fs.statSync(path.join(dirPath, f)).mtimeMs,
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length > maxCount) {
    const toRemove = files.slice(maxCount);
    for (const f of toRemove) {
      fs.unlinkSync(f.fullPath);
      console.log(`[ROTAÇÃO] Arquivo expirado removido: ${f.name}`);
    }
  }
}

async function runBackup() {
  console.log("=====================================================");
  console.log("ROTINA DE BACKUP AUTOMATIZADO CRIPTOGRAFADO (ANA LIMA)");
  console.log("Data/Hora:", new Date().toISOString());
  console.log("=====================================================\n");

  const passphrase = process.env.BACKUP_PASSPHRASE;
  if (
    !passphrase ||
    passphrase.length < 20 ||
    !process.env.BACKUP_AUTH_EMAIL ||
    !process.env.BACKUP_AUTH_PASSWORD
  )
    throw new Error("Credenciais de backup ausentes.");
  const email = process.env.BACKUP_AUTH_EMAIL || "analima.psicopc@gmail.com";
  const password = process.env.BACKUP_AUTH_PASSWORD;

  const app = initializeApp(FIREBASE_CONFIG);
  const auth = getAuth(app);
  const db = getFirestore(app);

  let userId = ANA_UID;

  // Se houver credenciais para autenticar via client SDK
  if (password) {
    console.log(`[AUTH] Autenticando com credencial da titular (${email})...`);
    const cred = await signInWithEmailAndPassword(auth, email, password);
    if (cred.user.uid !== ANA_UID)
      throw new Error("Conta de backup não autorizada.");
    userId = cred.user.uid;
    console.log(`[AUTH] Conectado com sucesso. UID: ${userId}`);
  } else {
    console.log(
      `[INFO] Usando chave administrativa ou modo de leitura autenticada.`,
    );
  }

  // Extração das coleções de Ana Lima
  console.log("[EXTRAÇÃO] Lendo subcoleções da titular no Firestore...");

  const fetchCollection = async (collName) => {
    try {
      const snap = await getDocs(collection(db, "users", userId, collName));
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn(
        `[AVISO] Não foi possível ler subcoleção '${collName}':`,
        e.message,
      );
      throw new Error("Falha ao extrair coleção. Backup abortado.");
    }
  };

  const patients = await fetchCollection("patients");
  const sessions = await fetchCollection("sessions");
  const records = await fetchCollection("records");
  const assessments = await fetchCollection("assessments");
  const payments = await fetchCollection("payments");
  const rawSettings = await fetchCollection("settings");
  const rawAnamnesis = await fetchCollection("anamnesis");

  const settings =
    rawSettings.find((s) => s.id === "clinic") || rawSettings[0] || {};
  const anamnesis = {};
  for (const a of rawAnamnesis) {
    anamnesis[a.id] = a;
  }

  console.log(`[DADOS EXTRAÍDOS]`);
  console.log(` - Pacientes: ${patients.length}`);
  console.log(` - Sessões: ${sessions.length}`);
  console.log(` - Prontuários/Evoluções: ${records.length}`);
  console.log(` - Escalas: ${assessments.length}`);
  console.log(` - Pagamentos: ${payments.length}`);

  if (!patients.length && !records.length)
    throw new Error("Backup inesperadamente vazio.");
  const payload = {
    version: "2.0.0",
    exportedAt: new Date().toISOString(),
    system: "Clinica Ana Lima - Gestão Psicológica (CFP 001/2009 & LGPD)",
    data: {
      patients,
      sessions,
      clinicalRecords: records,
      assessments,
      payments,
      settings,
      anamnesis,
    },
  };

  // Criptografia AES-256-GCM + PBKDF2
  console.log(
    "\n[CRIPTOGRAFIA] Cifrando payload clínico com AES-256-GCM e chave PBKDF2 (600.000 iterações)...",
  );
  const encryptedContainer = await encryptPayload(payload, passphrase);
  console.log(
    `[SUCESSO] Payload cifrado com sucesso. Checksum SHA-256: ${encryptedContainer.sha256Checksum}`,
  );

  // Gravação nos destinos de retenção
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
  const filename = `backup_ana_lima_${dateStr}_${timeStr}.enc.json`;

  // 1. Grava no Diário
  const dailyPath = path.join(DAILY_DIR, filename);
  fs.writeFileSync(
    dailyPath,
    JSON.stringify(encryptedContainer, null, 2),
    "utf-8",
  );
  console.log(`[DISCO] Salvo em diário: ${dailyPath}`);

  // 2. Se for domingo (dia 0), arquiva no semanal
  if (now.getDay() === 0) {
    const weeklyPath = path.join(
      WEEKLY_DIR,
      `backup_semanal_${dateStr}.enc.json`,
    );
    fs.copyFileSync(dailyPath, weeklyPath);
    console.log(`[DISCO] Ponto semanal arquivado: ${weeklyPath}`);
  }

  // 3. Se for dia 1 do mês, arquiva no mensal
  if (now.getDate() === 1) {
    const monthlyPath = path.join(
      MONTHLY_DIR,
      `backup_mensal_${dateStr.slice(0, 7)}.enc.json`,
    );
    fs.copyFileSync(dailyPath, monthlyPath);
    console.log(`[DISCO] Ponto mensal permanente arquivado: ${monthlyPath}`);
  }

  // Rotação: 7 diários, 4 semanais, 12 mensais
  console.log("\n[POLÍTICA DE RETENÇÃO]");
  pruneDirectory(DAILY_DIR, 7);
  pruneDirectory(WEEKLY_DIR, 4);
  pruneDirectory(MONTHLY_DIR, 12);

  console.log("\n[STATUS] Backup diário concluído e protegido com sucesso!");
  return dailyPath;
}

runBackup().catch((err) => {
  console.error("[ERRO FATAL NO BACKUP]:", err);
  process.exit(1);
});
