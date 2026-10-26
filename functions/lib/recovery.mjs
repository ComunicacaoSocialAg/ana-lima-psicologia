import {
  randomBytes,
  pbkdf2Sync,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "node:crypto";
export function encryptArchive(payload, passphrase) {
  if (typeof passphrase !== "string" || passphrase.length < 20)
    throw Error("Use ao menos 20 caracteres para o backup do servidor.");
  const salt = randomBytes(16),
    iv = randomBytes(12);
  const key = pbkdf2Sync(passphrase, salt, 600000, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(JSON.stringify(payload))),
    cipher.final(),
  ]);
  return {
    schema: 3,
    algorithm: "AES-256-GCM",
    kdf: "PBKDF2-SHA256",
    iterations: 600000,
    salt: salt.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    ciphertext: encrypted.toString("base64"),
  };
}
export function decryptArchive(envelope, passphrase) {
  if (
    envelope.algorithm !== "AES-256-GCM" ||
    !Number.isSafeInteger(envelope.iterations) ||
    envelope.iterations < 100000 ||
    envelope.iterations > 2000000 ||
    typeof envelope.ciphertext !== "string" ||
    envelope.ciphertext.length > 70000000
  )
    throw Error("Envelope inválido.");
  const salt = Buffer.from(envelope.salt, "base64"),
    iv = Buffer.from(envelope.iv, "base64");
  let cipher = Buffer.from(envelope.ciphertext, "base64");
  if (salt.length !== 16 || iv.length !== 12 || cipher.length < 16)
    throw Error("Envelope incompleto.");
  const tag =
    envelope.schema === 3
      ? Buffer.from(envelope.tag, "base64")
      : cipher.subarray(-16);
  if (envelope.schema !== 3) cipher = cipher.subarray(0, -16);
  if (tag.length !== 16) throw Error("Tag inválida.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    pbkdf2Sync(passphrase, salt, envelope.iterations, 32, "sha256"),
    iv,
  );
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([
    decipher.update(cipher),
    decipher.final(),
  ]).toString("utf8");
  if (
    envelope.sha256Checksum &&
    createHash("sha256").update(plain).digest("hex") !== envelope.sha256Checksum
  )
    throw Error("Checksum divergente.");
  return JSON.parse(plain);
}
export function normalizedArchive(payload) {
  const source = payload?.data;
  if (!source || typeof source !== "object") throw Error("Backup sem dados.");
  let data;
  if (payload.schema === 3) data = source;
  else
    data = {
      patients: source.patients,
      sessions: source.sessions,
      records: source.clinicalRecords,
      assessments: source.assessments,
      payments: source.payments,
      settings: [{ ...source.settings, id: "clinic" }],
      anamnesis: Object.entries(source.anamnesis || {}).map(([id, row]) => ({
        ...row,
        id,
      })),
      ...(source.billingData || {}),
    };
  const allowed = [
    "patients",
    "sessions",
    "records",
    "anamnesis",
    "assessments",
    "payments",
    "settings",
    "audit_logs",
    "billingPolicies",
    "charges",
    "billingClaims",
    "billingPeriods",
    "legacyCoverage",
    "asaasCustomers",
  ];
  const output = {};
  for (const name of allowed) {
    const rows = data[name];
    if (rows === undefined) {
      if (
        [
          "patients",
          "sessions",
          "records",
          "anamnesis",
          "assessments",
          "payments",
          "settings",
        ].includes(name)
      )
        throw Error("Coleção obrigatória ausente: " + name);
      continue;
    }
    if (!Array.isArray(rows) || rows.length > 100000)
      throw Error("Coleção inválida: " + name);
    const ids = new Set();
    for (const row of rows) {
      if (
        !row ||
        typeof row.id !== "string" ||
        row.id.includes("/") ||
        ids.has(row.id)
      )
        throw Error("Identificador inválido/repetido.");
      ids.add(row.id);
    }
    output[name] = rows;
  }
  if (!output.patients.length && !output.records.length)
    throw Error("Backup vazio recusado.");
  return output;
}
