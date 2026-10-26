// Persistent clinical data is encrypted with a user-held passphrase. No key is stored on disk.
const META = "ana_lima_secure_v2_meta";
const PREFIX = "ana_lima_secure_v2:";
const RECOVERY = "ana_lima_legacy_recovery_v2";
const OLD_KEY = "ana_lima_vault_session_key_v1";
const clinicalKeys = [
  "patients",
  "anamnesis",
  "sessions",
  "records",
  "assessments",
  "payments",
  "settings",
]
  .map((k) => `ana_lima_${k}_v1`)
  .concat([
    "ana_lima_redundant_vault_v1",
    "ana_lima_audit_logs_v1",
    "ana_lima_notifications_v1",
    "ana_lima_last_seen_version",
    "clinica_ana_lima_notifications_v1",
    "clinica_ana_lima_last_seen_version_v1",
    "ana_lima_outbox_v2",
    "ana_lima_financial_ledger_v2",
  ]);
let key: CryptoKey | null = null;
const cache = new Map<string, string>();
let queue: Promise<void> = Promise.resolve();
const b64 = (b: Uint8Array) =>
  btoa(Array.from(b, (n) => String.fromCharCode(n)).join(""));
const bytes = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function derive(pass: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pass),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: 600000,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
async function encrypt(text: string) {
  if (!key) throw new Error("Desbloqueie o cofre antes de gravar.");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(text),
  );
  return JSON.stringify({ v: 2, iv: b64(iv), data: b64(new Uint8Array(data)) });
}
async function decrypt(raw: string, k: CryptoKey) {
  const env = JSON.parse(raw);
  return new TextDecoder().decode(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes(env.iv) },
      k,
      bytes(env.data),
    ),
  );
}
export function getLegacyRecovery(): Record<string, string> {
  return JSON.parse(cache.get(RECOVERY) || "{}");
}
export function hasVault() {
  return !!localStorage.getItem(META);
}
export function hasLegacyData() {
  return clinicalKeys.some((k) => localStorage.getItem(k) !== null);
}
export function vaultReadCached(k: string) {
  return cache.get(k) ?? null;
}
export async function unlockVault(passphrase: string) {
  if (passphrase.length < 12)
    throw new Error("Use uma senha de pelo menos 12 caracteres para o cofre.");
  const raw = localStorage.getItem(META);
  const meta = raw
    ? JSON.parse(raw)
    : { salt: b64(crypto.getRandomValues(new Uint8Array(16))) };
  const candidate = await derive(passphrase, bytes(meta.salt));
  if (raw) {
    try {
      if ((await decrypt(meta.check, candidate)) !== "ana-lima-v2")
        throw Error();
    } catch {
      throw new Error("Senha do cofre incorreta ou arquivo local danificado.");
    }
  }
  key = candidate;
  cache.clear();
  try {
    for (const name of clinicalKeys) {
      const secure = localStorage.getItem(PREFIX + name);
      if (secure && raw) cache.set(name, await decrypt(secure, candidate));
      else if (!raw) {
        const legacy = localStorage.getItem(name);
        if (!legacy) continue;
        const parsed = name.includes("last_seen_version")
          ? legacy
          : JSON.parse(legacy);
        if (parsed?._vault) {
          const old =
            localStorage.getItem(OLD_KEY) || sessionStorage.getItem(OLD_KEY);
          if (!old)
            throw new Error(
              "Cópia antiga sem chave. Preserve este navegador e recupere um backup antes de continuar.",
            );
          const oldKey = await crypto.subtle.importKey(
            "raw",
            bytes(old),
            "AES-GCM",
            false,
            ["decrypt"],
          );
          cache.set(name, await decrypt(legacy, oldKey));
        } else cache.set(name, legacy);
      }
    }
    if (!raw) {
      const original = JSON.stringify(Object.fromEntries(cache));
      // The legacy originals remain untouched until explicit completion.
      localStorage.setItem(PREFIX + RECOVERY, await encrypt(original));
      cache.set(RECOVERY, original);
      for (const [name, value] of cache)
        localStorage.setItem(PREFIX + name, await encrypt(value));
      meta.check = await encrypt("ana-lima-v2");
      localStorage.setItem(META, JSON.stringify(meta));
    }
    const recovery = localStorage.getItem(PREFIX + RECOVERY);
    if (recovery) cache.set(RECOVERY, await decrypt(recovery, candidate));
  } catch (e) {
    clearSessionVaultKey();
    throw e;
  }
}
export function vaultSetItem(name: string, text: string): Promise<void> {
  if (!key)
    return Promise.reject(
      new Error("Cofre bloqueado; os dados não foram gravados."),
    );
  cache.set(name, text);
  const write = queue.then(async () => {
    localStorage.setItem(PREFIX + name, await encrypt(text));
  });
  queue = write;
  write.catch(() => window.dispatchEvent(new Event("clinica-storage-error")));
  return write;
}
export async function vaultGetItem(name: string) {
  if (!key) throw new Error("Cofre bloqueado.");
  return cache.get(name) ?? null;
}
export async function flushVault() {
  await queue;
}
export async function finalizeLegacyMigration() {
  await flushVault();
  for (const name of clinicalKeys) {
    const old = localStorage.getItem(name);
    if (old && !localStorage.getItem(PREFIX + name))
      throw new Error("Cópia protegida incompleta. Originais preservados.");
  }
  for (const name of clinicalKeys) localStorage.removeItem(name);
  localStorage.removeItem(OLD_KEY);
  sessionStorage.removeItem(OLD_KEY);
  localStorage.removeItem("ana_lima_google_access_token");
  localStorage.removeItem("ana_lima_google_token_expires_at");
}
export function clearSessionVaultKey() {
  key = null;
  cache.clear();
  queue = Promise.resolve();
}

export interface PendingOperation {
  token: string;
  kind: string;
  id: string;
  data: any;
  createdAt: string;
}
const OUTBOX = "ana_lima_outbox_v2";
export function listOutbox(): PendingOperation[] {
  return JSON.parse(vaultReadCached(OUTBOX) || "[]");
}
export async function enqueueOutbox(
  kind: string,
  id: string,
  data: unknown,
): Promise<string> {
  const token = crypto.randomUUID();
  const operations = listOutbox().filter((x) => x.kind !== kind || x.id !== id);
  operations.push({
    token,
    kind,
    id,
    data,
    createdAt: new Date().toISOString(),
  });
  await vaultSetItem(OUTBOX, JSON.stringify(operations));
  window.dispatchEvent(new Event("clinica-outbox-changed"));
  return token;
}
export async function acknowledgeOutbox(token: string) {
  await vaultSetItem(
    OUTBOX,
    JSON.stringify(listOutbox().filter((x) => x.token !== token)),
  );
  window.dispatchEvent(new Event("clinica-outbox-changed"));
}
