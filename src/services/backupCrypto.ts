/**
 * Criptografia de cópias locais (AES-256-GCM + PBKDF2)
 * Compatível nativamente com navegadores modernos e Node.js (Web Crypto API).
 */

import { FullBackupPayload } from "./backupService";

export interface EncryptedBackupContainer {
  version: "2.0.0";
  system: string;
  encrypted: true;
  algorithm: "AES-256-GCM";
  kdf: "PBKDF2-HMAC-SHA256";
  iterations: number;
  salt: string; // Base64
  iv: string; // Base64
  ciphertext: string; // Base64
  sha256Checksum: string;
  exportedAt: string;
  itemCounts: {
    patients: number;
    sessions: number;
    records: number;
    assessments: number;
    payments: number;
  };
}

// Converte ArrayBuffer para string Base64 de forma compatível universalmente
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Converte string Base64 para ArrayBuffer
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

// Calcula o hash criptográfico SHA-256 determinístico de uma string
export async function computeSha256(text: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    enc.encode(text),
  );
  const hashArray = Array.from(new Uint8Array(digest));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const DEFAULT_PBKDF2_ITERATIONS = 600000; // Padrão recomendado pela OWASP para PBKDF2-HMAC-SHA256

// Deriva uma chave AES-GCM de 256 bits a partir de uma senha arbitrária usando PBKDF2 (600.000 iterações - OWASP)
export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array,
  iterations = DEFAULT_PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawKey = await globalThis.crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  return globalThis.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: (salt instanceof Uint8Array ? salt.buffer : salt) as ArrayBuffer,
      iterations,
      hash: "SHA-256",
    },
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * Criptografa o payload clínico com AES-256-GCM.
 * Retorna o container autenticado pronto para download ou arquivamento seguro.
 */
export async function encryptClinicalPayload(
  payload: FullBackupPayload,
  passphrase: string,
  iterations = DEFAULT_PBKDF2_ITERATIONS,
): Promise<EncryptedBackupContainer> {
  if (!passphrase || passphrase.length < 12) {
    throw new Error(
      "A chave de criptografia de backup deve ter pelo menos 12 caracteres.",
    );
  }

  const jsonString = JSON.stringify(payload);
  const sha256Checksum = await computeSha256(jsonString);

  // Gera sal criptográfico (16 bytes) e IV aleatório exclusivo (12 bytes)
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));

  const key = await deriveKeyFromPassphrase(passphrase, salt, iterations);

  const enc = new TextEncoder();
  const encryptedBuffer = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(jsonString),
  );

  return {
    version: "2.0.0",
    system:
      payload.system ||
      "Clinica Ana Lima - Gestão Psicológica (CFP 001/2009 & LGPD)",
    encrypted: true,
    algorithm: "AES-256-GCM",
    kdf: "PBKDF2-HMAC-SHA256",
    iterations,
    salt: bufferToBase64(salt),
    iv: bufferToBase64(iv),
    ciphertext: bufferToBase64(encryptedBuffer),
    sha256Checksum,
    exportedAt: new Date().toISOString(),
    itemCounts: {
      patients: payload.data.patients?.length || 0,
      sessions: payload.data.sessions?.length || 0,
      records: payload.data.clinicalRecords?.length || 0,
      assessments: payload.data.assessments?.length || 0,
      payments: payload.data.payments?.length || 0,
    },
  };
}

/**
 * Decifra e valida a integridade de um arquivo de backup criptografado.
 * Lança erro caso a senha esteja incorreta ou se o arquivo tiver sido corrompido/adulterado.
 */
export async function decryptClinicalPayload(
  container: EncryptedBackupContainer,
  passphrase: string,
): Promise<FullBackupPayload> {
  if (!container.encrypted || container.algorithm !== "AES-256-GCM") {
    throw new Error("Formato ou algoritmo de criptografia incompatível.");
  }

  if (
    !Number.isSafeInteger(container.iterations) ||
    container.iterations < 100000 ||
    container.iterations > 2000000 ||
    container.ciphertext.length > 70000000
  )
    throw new Error("Parâmetros criptográficos inválidos.");
  const salt = new Uint8Array(base64ToBuffer(container.salt));
  const iv = new Uint8Array(base64ToBuffer(container.iv));
  const ciphertext = base64ToBuffer(container.ciphertext);

  if (salt.length !== 16 || iv.byteLength !== 12 || ciphertext.byteLength < 16)
    throw new Error("Envelope inválido.");
  const key = await deriveKeyFromPassphrase(
    passphrase,
    salt,
    container.iterations,
  );

  let decryptedBuffer: ArrayBuffer;
  try {
    decryptedBuffer = await globalThis.crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ciphertext,
    );
  } catch {
    throw new Error(
      "Falha na decifração: Senha incorreta ou arquivo de backup violado.",
    );
  }

  const dec = new TextDecoder();
  const jsonString = dec.decode(decryptedBuffer);

  // Verificação de integridade pós-decifração
  const calculatedSha = await computeSha256(jsonString);
  if (calculatedSha !== container.sha256Checksum) {
    throw new Error(
      "Falha de integridade: O Checksum SHA-256 do arquivo restaurado não confere.",
    );
  }

  return JSON.parse(jsonString) as FullBackupPayload;
}
